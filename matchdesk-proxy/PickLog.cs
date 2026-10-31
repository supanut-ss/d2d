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
}

public sealed record PickInput(int FixtureId, string Market, string Side, double Line, double LadderLine, string? Label, double Odds, string? Book,
    double PModel, double PMarket, double PBlend, double Ev, int Conf);

/// <summary>Every ranked pick, kept so the model can be checked against closing prices and real results.</summary>
public sealed class PickLog
{
    private const int MaxNewPerDay = 300;
    private readonly ConcurrentDictionary<string, Pick> _picks = new();
    private readonly string _file;
    private readonly KnownFixtures _known;
    private readonly ILogger<PickLog> _log;
    private readonly object _saveLock = new();

    public PickLog(IWebHostEnvironment env, KnownFixtures known, ILogger<PickLog> log)
    {
        _file = Path.Combine(env.ContentRootPath, "App_Data", "picks.json");
        _known = known;
        _log = log;
        try
        {
            if (File.Exists(_file))
                foreach (var p in JsonSerializer.Deserialize<List<Pick>>(File.ReadAllText(_file)) ?? []) _picks[p.Id] = p;
        }
        catch (Exception ex) { _log.LogWarning(ex, "Could not read {File}", _file); }
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
            if (!(i.Odds > 1.01 && i.Odds < 10) || Math.Abs(i.Line) > 10 || Math.Abs(i.LadderLine) > 10) continue;
            if (new[] { i.PModel, i.PMarket, i.PBlend }.Any(p => !(p > 0 && p < 1))) continue;
            var id = IdOf(i.FixtureId, i.Market, i.Side, i.LadderLine);
            var pick = new Pick
            {
                Id = id, FixtureId = i.FixtureId, KickoffUtc = fx.KickoffUtc, League = fx.League, Home = fx.Home, Away = fx.Away,
                Market = i.Market, Side = i.Side, Line = i.Line, LadderLine = i.LadderLine,
                Label = (i.Label ?? "").Length > 80 ? i.Label![..80] : i.Label ?? "",
                Odds = i.Odds, Book = i.Book is { Length: > 40 } ? i.Book[..40] : i.Book,
                PModel = i.PModel, PMarket = i.PMarket, PBlend = i.PBlend, Ev = i.Ev, Conf = i.Conf, LoggedAt = DateTime.UtcNow,
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
                Directory.CreateDirectory(Path.GetDirectoryName(_file)!);
                File.WriteAllText(_file, JsonSerializer.Serialize(_picks.Values.OrderBy(p => p.KickoffUtc).ToList()));
            }
            catch (Exception ex) { _log.LogWarning(ex, "Could not write {File}", _file); }
        }
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

    // ---------- statistics

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
            recent,
        };
    }
}

/// <summary>
/// Every few minutes: captures the closing market for picks about to kick off (closing line value),
/// and settles finished matches from the full-time score.
/// </summary>
public sealed class PickWorker(PickLog log, KeyPool pool, ILogger<PickWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Every = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        await Task.Delay(TimeSpan.FromSeconds(45), stop);
        while (!stop.IsCancellationRequested)
        {
            try { await CycleAsync(stop); }
            catch (OperationCanceledException) { break; }
            catch (Exception ex) { logger.LogWarning(ex, "Pick worker cycle failed"); }
            await Task.Delay(Every, stop);
        }
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
    }
}

