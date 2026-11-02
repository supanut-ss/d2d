using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Jint;

namespace Matchdesk.Proxy;

/// <summary>How long each upstream path stays in the shared cache (the page, the tracker and the job all use it).</summary>
public static class CachePolicy
{
    public static TimeSpan Ttl(string path) => path.ToLowerInvariant() switch
    {
        "odds" => TimeSpan.FromMinutes(30),
        "predictions" => TimeSpan.FromHours(6),
        "teams/statistics" => TimeSpan.FromHours(12),
        "standings" => TimeSpan.FromHours(12),
        "fixtures/headtohead" => TimeSpan.FromHours(24),
        "fixtures/statistics" => TimeSpan.FromHours(24),   // finished matches do not change
        "injuries" => TimeSpan.FromHours(1),
        "fixtures/lineups" => TimeSpan.FromMinutes(10),
        _ => TimeSpan.FromMinutes(10),
    };
}

public sealed record JobRun(string Task, DateTime StartedUtc, DateTime? FinishedUtc, int Fixtures, int Analysed, int Picks, int Logged, string? Error);

/// <summary>
/// Runs the ranking on the server, without anyone opening the page: fetches the coming fixtures in the tracked
/// leagues, runs wwwroot/model.js (the same code the page runs) in Jint, and logs the picks that pass the rules.
/// Started by an external cron (GitHub Actions / Plesk scheduled task) through /api/jobs/run.
/// </summary>
public sealed class DailyJob(KeyPool pool, ResponseCache cache, KnownFixtures known, PickLog log, OddsHistory history,
    PickWorker worker, IWebHostEnvironment env, IConfiguration config, ILogger<DailyJob> logger)
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);
    private static readonly TimeZoneInfo Bangkok = TimeZoneInfo.FindSystemTimeZoneById(
        OperatingSystem.IsWindows() ? "SE Asia Standard Time" : "Asia/Bangkok");
    private const string FixtureStatuses = "NS-TBD";

    private readonly SemaphoreSlim _gate = new(1, 1);
    public JobRun? Last { get; private set; }
    public bool Running => _gate.CurrentCount == 0;

    public bool TokenMatches(string? given)
    {
        var expected = config["Matchdesk:Jobs:Token"];
        if (string.IsNullOrWhiteSpace(expected) || expected.StartsWith("CHANGE_ME", StringComparison.Ordinal)) return false;
        return CryptographicOperations.FixedTimeEquals(
            SHA256.HashData(Encoding.UTF8.GetBytes(given ?? "")), SHA256.HashData(Encoding.UTF8.GetBytes(expected)));
    }

    public bool Enabled => !string.IsNullOrWhiteSpace(config["Matchdesk:Jobs:Token"]);

    /// <summary>Starts the task in the background; false if a run is already going.</summary>
    public bool TryStart(string task)
    {
        if (!_gate.Wait(0)) return false;
        _ = Task.Run(async () =>
        {
            var run = new JobRun(task, DateTime.UtcNow, null, 0, 0, 0, 0, null);
            Last = run;
            try
            {
                if (task is "rank" or "all") run = await RankAsync(run, CancellationToken.None);
                if (task is "settle" or "all" or "rank") worker.Kick();
                Last = run with { FinishedUtc = DateTime.UtcNow };
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Job {Task} failed", task);
                Last = run with { FinishedUtc = DateTime.UtcNow, Error = ex.Message };
            }
            finally { _gate.Release(); }
        });
        return true;
    }

    private async Task<string?> GetAsync(string path, string query, CancellationToken ct)
    {
        var (res, _) = await cache.GetOrAddAsync(path + query, CachePolicy.Ttl(path), () => pool.GetAsync("/" + path + query, ct, "job"));
        return res.Status == 200 ? res.Body : null;
    }

    private async Task<JobRun> RankAsync(JobRun run, CancellationToken ct)
    {
        var section = config.GetSection("Matchdesk:Jobs");
        var leagues = (section.GetSection("Leagues").Get<int[]>() is { Length: > 0 } l ? l : config.GetSection("Matchdesk:OddsTracking:Leagues").Get<int[]>() ?? []).ToHashSet();
        var window = TimeSpan.FromHours(section.GetValue("WindowHours", 24));
        var maxFixtures = section.GetValue("MaxFixtures", 60);
        var now = DateTime.UtcNow;

        // 1) fixtures that kick off between 30 minutes and WindowHours from now, in the tracked leagues
        var targets = new List<JsonElement>();
        var docs = new List<JsonDocument>();
        var today = TimeZoneInfo.ConvertTime(now, Bangkok).Date;
        foreach (var date in new[] { today, today.AddDays(1) })
        {
            var q = $"?date={date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}&timezone=Asia%2FBangkok&status={FixtureStatuses}";
            var body = await GetAsync("fixtures", q, ct);
            if (body is null) continue;
            known.Note(body);
            var doc = JsonDocument.Parse(body);
            docs.Add(doc);
            foreach (var f in doc.RootElement.GetProperty("response").EnumerateArray())
            {
                var kickoff = f.GetProperty("fixture").GetProperty("date").GetDateTime().ToUniversalTime();
                if (leagues.Contains(f.GetProperty("league").GetProperty("id").GetInt32())
                    && kickoff > now.AddMinutes(30) && kickoff <= now + window)
                    targets.Add(f);
            }
        }
        targets = [.. targets.OrderBy(f => f.GetProperty("fixture").GetProperty("date").GetDateTime()).Take(maxFixtures)];
        run = run with { Fixtures = targets.Count };

        // 2) the model, exactly as the page runs it
        var engine = new Engine(o => o.TimeoutInterval(TimeSpan.FromSeconds(20)).LimitMemory(300_000_000));
        engine.Execute(await File.ReadAllTextAsync(Path.Combine(env.WebRootPath, "model.js"), ct));
        var all = new List<PickInput>();

        foreach (var f in targets)
        {
            try
            {
                var fx = f.GetProperty("fixture");
                var id = fx.GetProperty("id").GetInt32();
                var kickoff = fx.GetProperty("date").GetDateTime().ToUniversalTime();
                var league = f.GetProperty("league");
                var leagueId = league.GetProperty("id").GetInt32();
                var season = league.GetProperty("season").GetInt32();
                var homeId = f.GetProperty("teams").GetProperty("home").GetProperty("id").GetInt32();
                var awayId = f.GetProperty("teams").GetProperty("away").GetProperty("id").GetInt32();

                // same queries (and so the same cache entries) as the page
                var odds = await GetAsync("odds", $"?fixture={id}", ct);
                if (odds is null) continue;
                var homeStats = await GetAsync("teams/statistics", $"?league={leagueId}&season={season}&team={homeId}", ct);
                var awayStats = await GetAsync("teams/statistics", $"?league={leagueId}&season={season}&team={awayId}", ct);
                var injuries = await GetAsync("injuries", $"?fixture={id}", ct);
                var homeLast = await GetAsync("fixtures", $"?team={homeId}&last=10", ct);
                var awayLast = await GetAsync("fixtures", $"?team={awayId}&last=10", ct);
                var standings = await GetAsync("standings", $"?league={leagueId}&season={season}", ct);
                var nearKickoff = kickoff - DateTime.UtcNow < TimeSpan.FromHours(3);
                var lineups = nearKickoff ? await GetAsync("fixtures/lineups", $"?fixture={id}", ct) : null;
                var snaps = history.Get([id]).TryGetValue(id, out var list) ? JsonSerializer.Serialize(list, Web) : "null";

                var input = "{\"fixture\":" + f.GetRawText()
                    + ",\"odds\":" + (odds ?? "null") + ",\"homeStats\":" + (homeStats ?? "null") + ",\"awayStats\":" + (awayStats ?? "null")
                    + ",\"injuries\":" + (injuries ?? "null") + ",\"homeLast\":" + (homeLast ?? "null") + ",\"awayLast\":" + (awayLast ?? "null")
                    + ",\"standings\":" + (standings ?? "null") + ",\"lineups\":" + (lineups ?? "null")
                    + ",\"lineupsChecked\":" + (nearKickoff ? "true" : "false") + ",\"snaps\":" + snaps + "}";
                engine.SetValue("__in", input);
                var output = engine.Evaluate("""
                    (function(){
                      var i=JSON.parse(__in),f=i.fixture,lid=f.league.id;
                      if(!leagueTable.has(lid))noteLeagueTable(lid,i.standings);
                      var a=analyseFixture({fixture:f,odds:i.odds,homeStats:i.homeStats,awayStats:i.awayStats,injuries:i.injuries,
                        homeInfo:teamInfoFrom(i.homeLast,f.teams.home.id),awayInfo:teamInfoFrom(i.awayLast,f.teams.away.id),
                        lineups:i.lineupsChecked?lineupsKnown(i.lineups,f.fixture.date):null,snaps:i.snaps});
                      var picks=[];
                      if(a.bestHandicap)picks.push(pickRecord(f.fixture.id,a.bestHandicap));
                      if(a.bestOverUnder)picks.push(pickRecord(f.fixture.id,a.bestOverUnder));
                      return JSON.stringify({ok:!!a.model,picks:picks});
                    })()
                    """).AsString();
                using var res = JsonDocument.Parse(output);
                if (res.RootElement.GetProperty("ok").GetBoolean()) run = run with { Analysed = run.Analysed + 1 };
                var picks = JsonSerializer.Deserialize<PickInput[]>(res.RootElement.GetProperty("picks").GetRawText(), Web) ?? [];
                all.AddRange(picks);
            }
            catch (Exception ex) { logger.LogWarning(ex, "Job: fixture skipped"); }
        }
        foreach (var d in docs) d.Dispose();

        var logged = log.Log(all);
        logger.LogInformation("Job rank: {Fixtures} fixtures, {Analysed} analysed, {Picks} picks, {Logged} new", run.Fixtures, run.Analysed, all.Count, logged);
        return run with { Picks = all.Count, Logged = logged };
    }
}
