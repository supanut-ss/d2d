using System.Collections.Concurrent;
using System.Text.Json;

namespace Matchdesk.Proxy;

/// <summary>De-margined market average for one fixture at one point in time.</summary>
public sealed record OddsSnapshot(DateTime T, double? H, double? D, double? A, double? O25, double? U25, int Books);

/// <summary>Snapshot history per fixture, kept in memory and mirrored to App_Data so it survives app-pool recycles.</summary>
public sealed class OddsHistory
{
    private static readonly TimeSpan Keep = TimeSpan.FromDays(4);
    private readonly ConcurrentDictionary<int, List<OddsSnapshot>> _byFixture = new();
    private readonly string _file;
    private readonly ILogger<OddsHistory> _log;

    public OddsHistory(IWebHostEnvironment env, ILogger<OddsHistory> log)
    {
        _file = Path.Combine(env.ContentRootPath, "App_Data", "odds-history.json");
        _log = log;
        try
        {
            if (File.Exists(_file))
            {
                var loaded = JsonSerializer.Deserialize<Dictionary<int, List<OddsSnapshot>>>(File.ReadAllText(_file));
                foreach (var kv in loaded ?? []) _byFixture[kv.Key] = kv.Value;
            }
        }
        catch (Exception ex) { _log.LogWarning(ex, "Could not read {File}", _file); }
    }

    public void Add(int fixtureId, OddsSnapshot snap)
    {
        var list = _byFixture.GetOrAdd(fixtureId, _ => []);
        lock (list) list.Add(snap);
    }

    public Dictionary<int, List<OddsSnapshot>> Get(IEnumerable<int> ids)
    {
        var result = new Dictionary<int, List<OddsSnapshot>>();
        foreach (var id in ids)
            if (_byFixture.TryGetValue(id, out var list))
                lock (list) result[id] = [.. list];
        return result;
    }

    public void PruneAndSave()
    {
        var cutoff = DateTime.UtcNow - Keep;
        foreach (var kv in _byFixture)
            lock (kv.Value)
                if (kv.Value.Count == 0 || kv.Value[^1].T < cutoff) _byFixture.TryRemove(kv.Key, out _);
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_file)!);
            File.WriteAllText(_file, JsonSerializer.Serialize(Get(_byFixture.Keys)));
        }
        catch (Exception ex) { _log.LogWarning(ex, "Could not write {File}", _file); }
    }
}

/// <summary>
/// Every IntervalMinutes, snapshots 1X2 and over/under 2.5 prices for today's and tomorrow's not-started fixtures
/// in the tracked leagues, so the page can show how the market moved.
/// </summary>
public sealed class OddsTracker(KeyPool pool, ResponseCache cache, OddsHistory history, IConfiguration config, ILogger<OddsTracker> log)
    : BackgroundService
{
    // not-started only (live and finished matches are not used): the page asks for the same list, so both share one cached response
    private const string FixtureStatuses = "NS-TBD";
    private static readonly TimeZoneInfo Bangkok = TimeZoneInfo.FindSystemTimeZoneById(
        OperatingSystem.IsWindows() ? "SE Asia Standard Time" : "Asia/Bangkok");

    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        var section = config.GetSection("Matchdesk:OddsTracking");
        if (!section.GetValue("Enabled", true)) return;
        var interval = TimeSpan.FromMinutes(Math.Max(10, section.GetValue("IntervalMinutes", 60)));
        var leagues = (section.GetSection("Leagues").Get<int[]>() ?? []).ToHashSet();
        if (leagues.Count == 0) return;

        await Task.Delay(TimeSpan.FromSeconds(20), stop);   // let the app finish starting
        while (!stop.IsCancellationRequested)
        {
            try { await SnapshotAsync(leagues, stop); }
            catch (OperationCanceledException) { break; }
            catch (Exception ex) { log.LogWarning(ex, "Odds snapshot failed"); }
            history.PruneAndSave();
            await Task.Delay(interval, stop);
        }
    }

    private async Task SnapshotAsync(HashSet<int> leagues, CancellationToken ct)
    {
        if (pool.Alive == 0) return;
        var today = TimeZoneInfo.ConvertTime(DateTime.UtcNow, Bangkok).Date;
        var count = 0;
        foreach (var date in new[] { today, today.AddDays(1) })
        {
            var d = date.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);   // th-TH would give a Buddhist-era year
            // same query string as the page so both share the cached fixture list
            var q = $"?date={d}&timezone=Asia%2FBangkok&status={FixtureStatuses}";
            var (fx, _) = await cache.GetOrAddAsync("fixtures" + q, TimeSpan.FromMinutes(10), () => pool.GetAsync("/fixtures" + q, ct, "tracker"));
            if (fx.Status != 200) continue;

            var targets = new HashSet<(int League, int Season)>();
            using (var doc = JsonDocument.Parse(fx.Body))
                foreach (var f in doc.RootElement.GetProperty("response").EnumerateArray())
                {
                    var league = f.GetProperty("league");
                    var id = league.GetProperty("id").GetInt32();
                    if (leagues.Contains(id) && f.GetProperty("fixture").GetProperty("status").GetProperty("short").GetString() == "NS")
                        targets.Add((id, league.GetProperty("season").GetInt32()));
                }

            log.LogInformation("Odds snapshot {Date}: {Leagues} league(s) with not-started fixtures", d, targets.Count);
            foreach (var (league, season) in targets)
                for (int page = 1, pages = 1; page <= pages; page++)
                {
                    var res = await pool.GetAsync($"/odds?league={league}&season={season}&date={d}&page={page}", ct, "tracker");
                    if (res.Status != 200) { log.LogWarning("Odds {League}/{Season} {Date} returned HTTP {Status}", league, season, d, res.Status); break; }
                    using var doc = JsonDocument.Parse(res.Body);
                    if (doc.RootElement.TryGetProperty("paging", out var paging)) pages = paging.GetProperty("total").GetInt32();
                    foreach (var item in doc.RootElement.GetProperty("response").EnumerateArray())
                    {
                        var snap = Parse(item);
                        if (snap is null) continue;
                        history.Add(item.GetProperty("fixture").GetProperty("id").GetInt32(), snap);
                        count++;
                    }
                }
        }
        log.LogInformation("Odds snapshot: {Count} fixture(s)", count);
    }

    private static OddsSnapshot? Parse(JsonElement item)
    {
        var one = new List<(double H, double D, double A)>();
        var ou = new List<(double O, double U)>();
        foreach (var book in item.GetProperty("bookmakers").EnumerateArray())
            foreach (var bet in book.GetProperty("bets").EnumerateArray())
            {
                var name = bet.GetProperty("name").GetString() ?? "";
                var prices = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
                foreach (var v in bet.GetProperty("values").EnumerateArray())
                    if (double.TryParse(v.GetProperty("odd").GetString(), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var odd) && odd > 1)
                        prices[v.GetProperty("value").ToString()] = odd;

                if (name == "Match Winner" && prices.TryGetValue("Home", out var h) && prices.TryGetValue("Draw", out var dr) && prices.TryGetValue("Away", out var a))
                {
                    var s = 1 / h + 1 / dr + 1 / a;
                    one.Add((1 / h / s, 1 / dr / s, 1 / a / s));
                }
                else if (name == "Goals Over/Under" && prices.TryGetValue("Over 2.5", out var o) && prices.TryGetValue("Under 2.5", out var u))
                {
                    var s = 1 / o + 1 / u;
                    ou.Add((1 / o / s, 1 / u / s));
                }
            }
        if (one.Count == 0 && ou.Count == 0) return null;
        double? Avg<T>(List<T> l, Func<T, double> f) => l.Count == 0 ? null : Math.Round(l.Average(f), 4);
        return new OddsSnapshot(DateTime.UtcNow, Avg(one, x => x.H), Avg(one, x => x.D), Avg(one, x => x.A), Avg(ou, x => x.O), Avg(ou, x => x.U), Math.Max(one.Count, ou.Count));
    }
}
