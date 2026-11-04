using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;

namespace Matchdesk.Proxy;

public sealed class Pick
{
    public string Id { get; set; } = "";
    public int FixtureId { get; set; }
    public DateTime KickoffUtc { get; set; }
    public string League { get; set; } = "";
    public string Home { get; set; } = "";
    public string Away { get; set; } = "";
    /// <summary>"AH" or "OU"</summary>
    public string Market { get; set; } = "";
    /// <summary>home | away | over | under</summary>
    public string Side { get; set; } = "";
    /// <summary>Line of the backed side (AH) or the total line (OU)</summary>
    public double Line { get; set; }
    /// <summary>AH: the home-side line (key of the market ladder); OU: the total line</summary>
    public double LadderLine { get; set; }
    public string Label { get; set; } = "";
    public double Odds { get; set; }
    public string? Book { get; set; }
    public double PModel { get; set; }
    public double PMarket { get; set; }
    public double PBlend { get; set; }
    public double Ev { get; set; }
    public int Conf { get; set; }
    public DateTime LoggedAt { get; set; }
    /// <summary>open | settled | void</summary>
    public string Status { get; set; } = "open";
    public DateTime? ClosedAtUtc { get; set; }
    public double? CloseP { get; set; }
    public double? ClvPct { get; set; }
    public int? HomeGoals { get; set; }
    public int? AwayGoals { get; set; }
    /// <summary>Profit in stakes at the logged odds (flat 1 unit)</summary>
    public double? Units { get; set; }
    /// <summary>Share of the stake that won (0..1), pushes excluded from both shares</summary>
    public double? WinShare { get; set; }
    public double? LossShare { get; set; }
    // conditions at the time of the pick, only recorded (see backtest/features.js)
    /// <summary>Change of the market probability of this pick since tracking began, in points</summary>
    public double? Move { get; set; }
    /// <summary>Pinnacle when the market probability is Pinnacle's, otherwise an average of the books</summary>
    public string? Anchor { get; set; }
    public int? Books { get; set; }
    /// <summary>Games of data behind the team statistics (this season plus the carried-over one)</summary>
    public double? Games { get; set; }
    public int? CurGames { get; set; }
    /// <summary>Best price over the median price of the books</summary>
    public double? PriceRatio { get; set; }
    /// <summary>The other books' probability for this side, to compare with Pinnacle's</summary>
    public double? PCons { get; set; }
    public DateTime? OddsUpdated { get; set; }
    /// <summary>true: lineups were known, false: expected by now but missing, null: too early to ask</summary>
    public bool? Lineups { get; set; }
}

public sealed record KnownFixture(DateTime KickoffUtc, string League, string Home, string Away);

/// <summary>Fixtures the proxy has seen as not started: only these can be logged, with their real kickoff and names.</summary>
public sealed class KnownFixtures
{
    private readonly ConcurrentDictionary<int, KnownFixture> _map = new();

    public void Note(string fixturesJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(fixturesJson);
            foreach (var f in doc.RootElement.GetProperty("response").EnumerateArray())
            {
                var fx = f.GetProperty("fixture");
                var id = fx.GetProperty("id").GetInt32();
                var kickoff = fx.GetProperty("date").GetDateTime().ToUniversalTime();
                var league = f.GetProperty("league").GetProperty("name").GetString() ?? "";
                var teams = f.GetProperty("teams");
                _map[id] = new KnownFixture(kickoff, league,
                    teams.GetProperty("home").GetProperty("name").GetString() ?? "",
                    teams.GetProperty("away").GetProperty("name").GetString() ?? "");
            }
            var cutoff = DateTime.UtcNow.AddDays(-3);
            foreach (var kv in _map.Where(kv => kv.Value.KickoffUtc < cutoff)) _map.TryRemove(kv.Key, out _);
        }
        catch (Exception) { /* a malformed body just adds nothing */ }
    }

    public bool TryGet(int id, out KnownFixture fixture) => _map.TryGetValue(id, out fixture!);

    private readonly ConcurrentDictionary<string, bool> _noted = new();
    /// <summary>True the first time this process sees a cached list: after a restart the list comes from the database, not upstream.</summary>
    public bool ShouldNote(string cacheKey) => _noted.TryAdd(cacheKey, true);
}

public sealed record PickInput(int FixtureId, string Market, string Side, double Line, double LadderLine, string? Label, double Odds, string? Book,
    double PModel, double PMarket, double PBlend, double Ev, int Conf,
    double? Move = null, string? Anchor = null, int? Books = null, double? Games = null, int? CurGames = null, double? PriceRatio = null,
    double? PCons = null, DateTime? OddsUpdated = null, bool? Lineups = null);

/// <summary>Every ranked pick, kept so the model can be checked against closing prices and real results.</summary>
public sealed class PickLog
{
    private const int MaxNewPerDay = 300;
    private readonly ConcurrentDictionary<string, Pick> _picks = new();
    private readonly Db _db;
    private readonly KnownFixtures _known;
    private readonly ILogger<PickLog> _log;
    private readonly object _saveLock = new();

    public PickLog(Db db, DataDir dir, KnownFixtures known, ILogger<PickLog> log)
    {
        _db = db;
        _known = known;
        _log = log;
        try
        {
            using var c = db.Open();
            // picks.json from before the database: imported once, then renamed to picks.json.migrated
            var legacy = dir.File("picks.json");
            if (Db.Count(c, "picks") == 0 && File.Exists(legacy))
            {
                foreach (var p in JsonSerializer.Deserialize<List<Pick>>(File.ReadAllText(legacy)) ?? []) _picks[p.Id] = p;
                Write(c);
                Db.RetireFile(legacy);
                _log.LogInformation("Imported {Count} picks from {File}", _picks.Count, legacy);
            }
            else
            {
                using var cmd = c.CreateCommand();
                cmd.CommandText = "SELECT json FROM picks";
                using var r = cmd.ExecuteReader();
                while (r.Read()) { var p = JsonSerializer.Deserialize<Pick>(r.GetString(0)); if (p is not null) _picks[p.Id] = p; }
            }
        }
        catch (Exception ex) { _log.LogWarning(ex, "Could not load picks"); }
        DropDuplicates();
    }

    /// <summary>
    /// One pick per fixture and market: a later run that lands on another line (or side) of the same match is the same bet again,
    /// and counting it would double the win or loss. Earlier versions logged those; the first recommendation is kept.
    /// </summary>
    private void DropDuplicates()
    {
        var extra = _picks.Values.GroupBy(p => (p.FixtureId, p.Market))
            .SelectMany(g => g.OrderBy(p => p.LoggedAt).Skip(1)).ToList();
        if (extra.Count == 0) return;
        foreach (var p in extra) _picks.TryRemove(p.Id, out _);
        _log.LogInformation("Removed {Count} duplicate picks (same fixture and market)", extra.Count);
        Save();
    }

    public IEnumerable<Pick> All => _picks.Values;

    public static string IdOf(int fixtureId, string market, string side, double line) =>
        $"{fixtureId}|{market}|{side}|{OddsMath.Key(line)}";

    /// <summary>Returns how many picks were new. Names and kickoff always come from the server's own fixture list.</summary>
    public int Log(IEnumerable<PickInput> inputs)
    {
        var added = 0;
        var today = DateTime.UtcNow.Date;
        var todayCount = _picks.Values.Count(p => p.LoggedAt >= today);
        foreach (var i in inputs.Take(60))
        {
            if (todayCount + added >= MaxNewPerDay) break;
            if (!_known.TryGet(i.FixtureId, out var fx) || fx.KickoffUtc <= DateTime.UtcNow) continue;
            var okMarket = i.Market is "AH" or "OU";
            var okSide = i.Market == "AH" ? i.Side is "home" or "away" : i.Side is "over" or "under";
            if (!okMarket || !okSide) continue;
            if (!(i.Odds >= 1.7 && i.Odds <= 2.4) || Math.Abs(i.Line) > 10 || Math.Abs(i.LadderLine) > 10) continue;
            if (new[] { i.PModel, i.PMarket, i.PBlend }.Any(p => !(p > 0 && p < 1))) continue;
            if (_picks.Values.Any(p => p.FixtureId == i.FixtureId && p.Market == i.Market)) continue;   // the first recommendation is the one that counts
            var id = IdOf(i.FixtureId, i.Market, i.Side, i.LadderLine);
            var pick = new Pick
            {
                Id = id, FixtureId = i.FixtureId, KickoffUtc = fx.KickoffUtc, League = fx.League, Home = fx.Home, Away = fx.Away,
                Market = i.Market, Side = i.Side, Line = i.Line, LadderLine = i.LadderLine,
                Label = (i.Label ?? "").Length > 80 ? i.Label![..80] : i.Label ?? "",
                Odds = i.Odds, Book = i.Book is { Length: > 40 } ? i.Book[..40] : i.Book,
                PModel = i.PModel, PMarket = i.PMarket, PBlend = i.PBlend, Ev = i.Ev, Conf = i.Conf, LoggedAt = DateTime.UtcNow,
                Move = i.Move, Anchor = i.Anchor is { Length: > 20 } ? i.Anchor[..20] : i.Anchor, Books = i.Books, Games = i.Games, CurGames = i.CurGames,
                PriceRatio = i.PriceRatio, PCons = i.PCons, OddsUpdated = i.OddsUpdated, Lineups = i.Lineups,
            };
            if (_picks.TryAdd(id, pick)) added++;   // the first recommendation is the one that counts
        }
        if (added > 0) Save();
        return added;
    }

    public void Save()
    {
        lock (_saveLock)
        {
            try
            {
                using var c = _db.Open();
                Write(c);
            }
            catch (Exception ex) { _log.LogWarning(ex, "Could not save picks"); }
        }
    }

    /// <summary>Rewrites the table from memory in one transaction (a few hundred small rows).</summary>
    private void Write(Microsoft.Data.Sqlite.SqliteConnection c)
    {
        using var tx = c.BeginTransaction();
        Db.Exec(c, "DELETE FROM picks");
        foreach (var p in _picks.Values.OrderBy(p => p.KickoffUtc))
            Db.Exec(c, "INSERT INTO picks(id, fixture_id, market, kickoff_utc, status, json) VALUES($id, $f, $m, $k, $s, $j)",
                ("$id", p.Id), ("$f", p.FixtureId), ("$m", p.Market), ("$k", p.KickoffUtc.ToString("O")), ("$s", p.Status), ("$j", JsonSerializer.Serialize(p)));
        tx.Commit();
    }

    // ---------- settlement (flat 1 unit at the logged odds, quarter lines split in two)

    private static double[] Components(double line)
    {
        var twice = line * 2;
        return Math.Abs(twice - Math.Round(twice)) < 1e-8 ? [line] : [Math.Floor(twice) / 2, Math.Ceiling(twice) / 2];
    }

    public static (double Units, double Win, double Loss) Settle(Pick p, int homeGoals, int awayGoals)
    {
        var parts = Components(p.Line);
        double units = 0, win = 0, loss = 0;
        foreach (var c in parts)
        {
            var w = 1.0 / parts.Length;
            var delta = p.Market == "AH"
                ? (p.Side == "home" ? homeGoals - awayGoals : awayGoals - homeGoals) + c
                : p.Side == "over" ? homeGoals + awayGoals - c : c - (homeGoals + awayGoals);
            if (delta > 1e-8) { units += (p.Odds - 1) * w; win += w; }
            else if (delta < -1e-8) { units -= w; loss += w; }
        }
        return (units, win, loss);
    }

    private static double StdDev(List<double> v)
    {
        var mean = v.Average();
        return Math.Sqrt(v.Sum(x => (x - mean) * (x - mean)) / (v.Count - 1));
    }

    /// <summary>Every logged pick, newest kickoff first, in the shape the history table needs.</summary>
    public object History() => _picks.Values.OrderByDescending(p => p.KickoffUtc).Select(p => new
    {
        p.FixtureId, p.KickoffUtc, p.League, p.Home, p.Away, p.Market, p.Label, p.Odds, p.Book, p.Status,
        predictedPct = Math.Round(p.PBlend * 100, 1), marketPct = Math.Round(p.PMarket * 100, 1), evPct = Math.Round(p.Ev, 1), p.Conf,
        p.ClvPct, p.HomeGoals, p.AwayGoals, units = p.Units is null ? (double?)null : Math.Round(p.Units.Value, 3),
        p.WinShare, p.LossShare, p.LoggedAt,
        p.Move, p.Anchor, p.Books, p.Games, p.CurGames, p.PriceRatio, p.PCons, p.OddsUpdated, p.Lineups,
    }).ToList();

    // ---------- statistics

    // A trial, not a rule: picks are still logged and shown exactly as before, but each is also judged against two guards so the
    // two groups can be compared on picks logged after GuardSinceUtc (picks before it were seen when the guards were chosen).
    //   - the EV gap to the market is at most 7%: the biggest gaps did worst, they look like model error
    //   - a pick that receives the handicap (the underdog) must still show EV >= 2% when the market counts for 90% of the blend
    public static readonly DateTime GuardSinceUtc = new(2026, 11, 4, 3, 30, 0, DateTimeKind.Utc);

    public static bool PassesGuard(Pick p)
    {
        if (p.Ev > 7) return false;
        if (p.Market == "AH" && p.Line > 0)
            return (( .9 * p.PMarket + .1 * p.PModel) * p.Odds - 1) * 100 >= 2;
        return true;
    }

    public object Stats()
    {
        var all = _picks.Values.ToList();
        var settled = all.Where(p => p.Status == "settled").ToList();
        var withClv = all.Where(p => p.ClvPct is not null).ToList();

        object Summary(List<Pick> list)
        {
            var staked = list.Count;
            var units = list.Sum(p => p.Units ?? 0);
            var win = list.Sum(p => p.WinShare ?? 0);
            var loss = list.Sum(p => p.LossShare ?? 0);
            var clv = list.Where(p => p.ClvPct is not null).Select(p => p.ClvPct!.Value).ToList();
            return new
            {
                picks = staked,
                units = Math.Round(units, 2),
                roiPct = staked == 0 ? (double?)null : Math.Round(units / staked * 100, 1),
                // standard error of the mean profit per bet: how far the ROI could be off by chance alone
                roiSePct = staked < 2 ? (double?)null : Math.Round(StdDev(list.Select(p => p.Units ?? 0).ToList()) / Math.Sqrt(staked) * 100, 1),
                hitPct = win + loss == 0 ? (double?)null : Math.Round(win / (win + loss) * 100, 1),
                avgPredictedPct = staked == 0 ? (double?)null : Math.Round(list.Average(p => p.PBlend) * 100, 1),
                avgEvPct = staked == 0 ? (double?)null : Math.Round(list.Average(p => p.Ev), 1),
                avgClvPct = clv.Count == 0 ? (double?)null : Math.Round(clv.Average(), 2),
                clvPositivePct = clv.Count == 0 ? (double?)null : Math.Round(100.0 * clv.Count(x => x > 0) / clv.Count, 0),
                clvSamples = clv.Count,
            };
        }

        // does "55% predicted" really win about 55% of the time?
        var bins = new (double Lo, double Hi)[] { (0, .35), (.35, .45), (.45, .55), (.55, .65), (.65, 1.01) };
        var calibration = bins.Select(b =>
        {
            var inBin = settled.Where(p => p.PBlend >= b.Lo && p.PBlend < b.Hi).ToList();
            var win = inBin.Sum(p => p.WinShare ?? 0);
            var loss = inBin.Sum(p => p.LossShare ?? 0);
            return new
            {
                range = $"{Math.Round(b.Lo * 100)}-{Math.Min(100, Math.Round(b.Hi * 100))}%",
                picks = inBin.Count,
                predictedPct = inBin.Count == 0 ? (double?)null : Math.Round(inBin.Average(p => p.PBlend) * 100, 1),
                actualPct = win + loss == 0 ? (double?)null : Math.Round(win / (win + loss) * 100, 1),
            };
        }).Where(b => b.picks > 0).ToList();

        var recent = all.OrderByDescending(p => p.KickoffUtc).Take(30).Select(p => new
        {
            p.FixtureId, p.KickoffUtc, p.League, p.Home, p.Away, p.Market, p.Label, p.Odds, p.Status,
            predictedPct = Math.Round(p.PBlend * 100, 1), evPct = Math.Round(p.Ev, 1), p.ClvPct,
            score = p.HomeGoals is null ? null : $"{p.HomeGoals}-{p.AwayGoals}",
            units = p.Units is null ? (double?)null : Math.Round(p.Units.Value, 2),
        });

        return new
        {
            logged = all.Count,
            open = all.Count(p => p.Status == "open"),
            settled = settled.Count,
            overall = Summary(settled),
            ah = Summary(settled.Where(p => p.Market == "AH").ToList()),
            ou = Summary(settled.Where(p => p.Market == "OU").ToList()),
            clv = Summary(withClv),
            calibration,
            guard = new
            {
                sinceUtc = GuardSinceUtc,
                passed = Summary(settled.Where(PassesGuard).ToList()),
                failed = Summary(settled.Where(p => !PassesGuard(p)).ToList()),
                passedAfter = Summary(settled.Where(p => PassesGuard(p) && p.LoggedAt >= GuardSinceUtc).ToList()),
                failedAfter = Summary(settled.Where(p => !PassesGuard(p) && p.LoggedAt >= GuardSinceUtc).ToList()),
            },
            recent,
        };
    }
}

/// <summary>
/// Every few minutes: captures the closing market for picks about to kick off (closing line value),
/// and settles finished matches from the full-time score.
/// </summary>
public sealed class PickWorker(PickLog log, KeyPool pool, OddsHistory history, MatchHistory matches, ILogger<PickWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Every = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        await Task.Delay(TimeSpan.FromSeconds(45), stop);
        while (!stop.IsCancellationRequested)
        {
            try { await RunGuardedAsync(stop); }
            catch (OperationCanceledException) { break; }
            catch (Exception ex) { logger.LogWarning(ex, "Pick worker cycle failed"); }
            await Task.Delay(Every, stop);
        }
    }

    private readonly SemaphoreSlim _gate = new(1, 1);
    private DateTime _lastRunUtc = DateTime.MinValue;

    /// <summary>
    /// IIS stops an idle app, and the timer stops with it. Any visit calls this so settlement catches up
    /// (at most once every 3 minutes, never two cycles at once).
    /// </summary>
    public void Kick()
    {
        if (DateTime.UtcNow - _lastRunUtc < TimeSpan.FromMinutes(3)) return;
        _ = Task.Run(async () =>
        {
            try { await RunGuardedAsync(CancellationToken.None); }
            catch (Exception ex) { logger.LogWarning(ex, "Catch-up pick cycle failed"); }
        });
    }

    private async Task RunGuardedAsync(CancellationToken ct)
    {
        if (!await _gate.WaitAsync(0, ct)) return;
        try { _lastRunUtc = DateTime.UtcNow; await CycleAsync(ct); }
        finally { _gate.Release(); }
    }

    private async Task CycleAsync(CancellationToken ct)
    {
        if (pool.Alive == 0) return;
        var now = DateTime.UtcNow;
        var changed = false;

        // 1) closing line: picks that kick off within the next 20 minutes
        foreach (var group in log.All.Where(p => p.Status == "open" && p.ClosedAtUtc is null && p.KickoffUtc > now && p.KickoffUtc <= now.AddMinutes(20)).GroupBy(p => p.FixtureId))
        {
            var res = await pool.GetAsync($"/odds?fixture={group.Key}", ct, "picks");
            if (res.Status != 200) continue;
            using var doc = JsonDocument.Parse(res.Body);
            var arr = doc.RootElement.GetProperty("response");
            if (arr.GetArrayLength() == 0) continue;
            var ladders = OddsMath.Parse(arr[0]);
            foreach (var p in group)
            {
                var ladder = p.Market == "AH" ? ladders.Ah : ladders.Ou;
                if (!ladder.TryGetValue(OddsMath.Key(p.LadderLine), out var first)) continue;
                var backed = p.Market == "AH" ? (p.Side == "home" ? first : 1 - first) : (p.Side == "over" ? first : 1 - first);
                p.CloseP = Math.Round(backed, 4);
                p.ClvPct = Math.Round((p.Odds * backed - 1) * 100, 2);
                p.ClosedAtUtc = now;
                changed = true;
            }
        }

        // 1b) closing line missed (app was asleep at kickoff): use the last tracked snapshot from the 2 hours before kickoff
        var missed = log.All.Where(p => p.ClosedAtUtc is null && p.KickoffUtc <= now).ToList();
        if (missed.Count > 0)
        {
            var snaps = history.Get(missed.Select(p => p.FixtureId).Distinct());
            foreach (var p in missed)
            {
                if (!snaps.TryGetValue(p.FixtureId, out var list)) continue;
                var last = list.Where(s => s.T <= p.KickoffUtc && s.T >= p.KickoffUtc.AddHours(-2)).OrderBy(s => s.T).LastOrDefault();
                var ladder = p.Market == "AH" ? last?.Ah : last?.Ou;
                if (ladder is null || !ladder.TryGetValue(OddsMath.Key(p.LadderLine), out var first)) continue;
                var backed = p.Side is "home" or "over" ? first : 1 - first;
                p.CloseP = Math.Round(backed, 4);
                p.ClvPct = Math.Round((p.Odds * backed - 1) * 100, 2);
                p.ClosedAtUtc = last!.T;
                changed = true;
            }
        }

        // 2) settlement: three hours after kickoff, one request per fixture
        foreach (var group in log.All.Where(p => p.Status == "open" && p.KickoffUtc.AddHours(3) < now).GroupBy(p => p.FixtureId).Take(40))
        {
            var res = await pool.GetAsync($"/fixtures?id={group.Key}", ct, "picks");
            if (res.Status != 200) continue;
            using var doc = JsonDocument.Parse(res.Body);
            var arr = doc.RootElement.GetProperty("response");
            if (arr.GetArrayLength() == 0) continue;
            var f = arr[0];
            var status = f.GetProperty("fixture").GetProperty("status").GetProperty("short").GetString() ?? "";
            if (status is "FT" or "AET" or "PEN")
            {
                var ft = f.GetProperty("score").GetProperty("fulltime");
                if (ft.GetProperty("home").ValueKind != JsonValueKind.Number || ft.GetProperty("away").ValueKind != JsonValueKind.Number) continue;
                var hg = ft.GetProperty("home").GetInt32();
                var ag = ft.GetProperty("away").GetInt32();   // 90 minutes: that is what the lines are settled on
                foreach (var p in group)
                {
                    var (units, win, loss) = PickLog.Settle(p, hg, ag);
                    p.HomeGoals = hg; p.AwayGoals = ag; p.Units = units; p.WinShare = win; p.LossShare = loss; p.Status = "settled";
                    changed = true;
                }
            }
            else if (status is "PST" or "CANC" or "ABD" or "AWD" or "WO" || group.Min(p => p.KickoffUtc).AddDays(3) < now)
            {
                foreach (var p in group) { p.Status = "void"; p.Units = 0; changed = true; }
            }
        }

        if (changed) log.Save();

        // 3) scores and closing prices for every analysed fixture, not only the picks (the history behind backtest/market.js):
        //    one request per day of kickoffs, which lists all finished matches of that day
        foreach (var day in matches.Pending(now).GroupBy(p => MatchHistory.BangkokDay(p.Kickoff)).Take(3))
        {
            var res = await pool.GetAsync($"/fixtures?date={day.Key}&timezone=Asia%2FBangkok&status=FT-AET-PEN", ct, "history");
            if (res.Status != 200) continue;
            using var doc = JsonDocument.Parse(res.Body);
            var wanted = day.ToDictionary(p => p.Id, p => p.Kickoff);
            foreach (var f in doc.RootElement.GetProperty("response").EnumerateArray())
            {
                var id = f.GetProperty("fixture").GetProperty("id").GetInt32();
                if (!wanted.TryGetValue(id, out var kickoff)) continue;
                var ft = f.GetProperty("score").GetProperty("fulltime");   // 90 minutes
                if (ft.GetProperty("home").ValueKind != JsonValueKind.Number || ft.GetProperty("away").ValueKind != JsonValueKind.Number) continue;
                // the last tracked price from the two hours before kickoff stands in for the closing price
                var close = history.Get([id]).TryGetValue(id, out var list)
                    ? list.Where(s => s.T <= kickoff && s.T >= kickoff.AddHours(-2)).OrderBy(s => s.T).LastOrDefault() : null;
                matches.SetResult(id, ft.GetProperty("home").GetInt32(), ft.GetProperty("away").GetInt32(), close is null ? null : JsonSerializer.Serialize(close));
            }
        }
    }
}

