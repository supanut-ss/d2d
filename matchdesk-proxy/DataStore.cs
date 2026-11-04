using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Matchdesk.Proxy;

/// <summary>
/// The one folder where everything that must survive a deploy lives (the SQLite database matchdesk.db).
/// Matchdesk:DataDir wins; relative paths are resolved against the app folder. Deploys never touch it.
/// </summary>
public sealed class DataDir
{
    public string Root { get; }

    public DataDir(IWebHostEnvironment env, IConfiguration config, ILogger<DataDir> log)
    {
        var configured = config["Matchdesk:DataDir"];
        Root = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(env.ContentRootPath, "App_Data")
            : Path.GetFullPath(configured, env.ContentRootPath);
        Directory.CreateDirectory(Root);
        log.LogInformation("Data folder: {Root}", Root);
    }

    public string File(string name) => Path.Combine(Root, name);
}

/// <summary>
/// The permanent record behind backtest/market.js: for every fixture the daily job analysed, what the model and the market
/// said before kickoff, the market's last snapshot before kickoff (closing) and the final score. Never deleted: a few KB per fixture.
/// </summary>
public sealed class MatchHistory(Db db, ILogger<MatchHistory> log)
{
    public static readonly TimeZoneInfo Bangkok = TimeZoneInfo.FindSystemTimeZoneById(
        OperatingSystem.IsWindows() ? "SE Asia Standard Time" : "Asia/Bangkok");

    public static string BangkokDay(DateTime utc) => TimeZoneInfo.ConvertTimeFromUtc(utc, Bangkok).ToString("yyyy-MM-dd");

    /// <summary>Records (or refreshes, until kickoff) the model and market view of a fixture; a result already stored is kept.</summary>
    public void SaveModel(int fixtureId, DateTime kickoffUtc, int leagueId, string league, string home, string away, string? modelJson, string? marketJson)
    {
        try
        {
            using var c = db.Open();
            Db.Exec(c, """
                INSERT INTO match_history(fixture_id, kickoff_utc, league_id, league, home, away, model_json, market_json, updated_utc)
                VALUES($id, $k, $lid, $l, $h, $a, $m, $mk, $u)
                ON CONFLICT(fixture_id) DO UPDATE SET kickoff_utc=$k, model_json=$m, market_json=$mk, updated_utc=$u
                """,
                ("$id", fixtureId), ("$k", kickoffUtc.ToString("O")), ("$lid", leagueId), ("$l", league), ("$h", home), ("$a", away),
                ("$m", modelJson), ("$mk", marketJson), ("$u", DateTime.UtcNow.ToString("O")));
        }
        catch (Exception ex) { log.LogWarning(ex, "Could not store the history of fixture {Id}", fixtureId); }
    }

    /// <summary>Fixtures that should be over by now but have no score yet (given up on after three days).</summary>
    public List<(int Id, DateTime Kickoff)> Pending(DateTime now)
    {
        var list = new List<(int, DateTime)>();
        try
        {
            using var c = db.Open();
            using var cmd = c.CreateCommand();
            cmd.CommandText = "SELECT fixture_id, kickoff_utc FROM match_history WHERE home_goals IS NULL AND kickoff_utc < $a AND kickoff_utc > $b";
            cmd.Parameters.AddWithValue("$a", now.AddHours(-3).ToString("O"));
            cmd.Parameters.AddWithValue("$b", now.AddDays(-3).ToString("O"));
            using var r = cmd.ExecuteReader();
            while (r.Read()) list.Add((r.GetInt32(0), DateTime.Parse(r.GetString(1), null, System.Globalization.DateTimeStyles.RoundtripKind)));
        }
        catch (Exception ex) { log.LogWarning(ex, "Could not read pending history"); }
        return list;
    }

    public void SetResult(int fixtureId, int homeGoals, int awayGoals, string? closeJson)
    {
        try
        {
            using var c = db.Open();
            Db.Exec(c, "UPDATE match_history SET home_goals=$h, away_goals=$a, close_json=COALESCE($c, close_json), updated_utc=$u WHERE fixture_id=$id",
                ("$h", homeGoals), ("$a", awayGoals), ("$c", closeJson), ("$u", DateTime.UtcNow.ToString("O")), ("$id", fixtureId));
        }
        catch (Exception ex) { log.LogWarning(ex, "Could not store the result of fixture {Id}", fixtureId); }
    }

    /// <summary>
    /// What the daily job made of every fixture kicking off in [from, to): the model (with its lean and picks) and the priced options that
    /// show a positive EV, which is what the page needs to rebuild the ranking and the picks without analysing anything itself.
    /// </summary>
    public string DayJson(DateTime fromUtc, DateTime toUtc)
    {
        using var c = db.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = """
            SELECT m.fixture_id, m.kickoff_utc, m.home, m.away, m.league, m.model_json, a.json
            FROM match_history m LEFT JOIN analyses a ON a.fixture_id = m.fixture_id AND a.source = 'job'
            WHERE m.kickoff_utc >= $f AND m.kickoff_utc < $t AND m.model_json IS NOT NULL ORDER BY m.kickoff_utc
            """;
        cmd.Parameters.AddWithValue("$f", fromUtc.ToString("O"));
        cmd.Parameters.AddWithValue("$t", toUtc.ToString("O"));
        using var r = cmd.ExecuteReader();
        using var ms = new MemoryStream();
        using (var w = new System.Text.Json.Utf8JsonWriter(ms))
        {
            w.WriteStartArray();
            while (r.Read())
            {
                w.WriteStartObject();
                w.WriteNumber("fixtureId", r.GetInt32(0)); w.WriteString("kickoffUtc", r.GetString(1));
                w.WriteString("home", r.GetString(2)); w.WriteString("away", r.GetString(3)); w.WriteString("league", r.GetString(4));
                w.WritePropertyName("model");
                using (var model = JsonDocument.Parse(r.GetString(5))) model.RootElement.WriteTo(w);
                w.WritePropertyName("entries");
                if (r.IsDBNull(6)) w.WriteNullValue();
                else
                {
                    using var analysis = JsonDocument.Parse(r.GetString(6));
                    w.WriteStartArray();
                    if (analysis.RootElement.TryGetProperty("entries", out var entries) && entries.ValueKind == JsonValueKind.Array)
                        foreach (var e in entries.EnumerateArray())
                            if (e.TryGetProperty("ev", out var ev) && ev.ValueKind == JsonValueKind.Number && ev.GetDouble() > 0) e.WriteTo(w);
                    w.WriteEndArray();
                }
                w.WriteEndObject();
            }
            w.WriteEndArray();
        }
        return System.Text.Encoding.UTF8.GetString(ms.ToArray());
    }

    /// <summary>
    /// How often the model's lean (H/A on the central handicap, O/L on the central total) was right, from the fixtures the daily job
    /// analysed that have finished: win/loss/push shares by the real 90-minute score, with and without a value pick on that market.
    /// </summary>
    public object LeanStats()
    {
        var acc = new Dictionary<string, double[]>();   // key -> n, win, loss, push
        void Add(string key, Pick backed, int hg, int ag)
        {
            var (_, win, loss) = PickLog.Settle(backed, hg, ag);
            var a = acc.TryGetValue(key, out var v) ? v : acc[key] = new double[4];
            a[0]++; a[1] += win; a[2] += loss; a[3] += 1 - win - loss;
        }
        int rows = 0;
        using var c = db.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT home_goals, away_goals, model_json FROM match_history WHERE home_goals IS NOT NULL AND model_json IS NOT NULL";
        using var r = cmd.ExecuteReader();
        while (r.Read())
        {
            int hg = r.GetInt32(0), ag = r.GetInt32(1);
            using var doc = JsonDocument.Parse(r.GetString(2));
            if (!doc.RootElement.TryGetProperty("lean", out var lean) || lean.ValueKind != JsonValueKind.Object) continue;
            var picked = new HashSet<string>();
            if (doc.RootElement.TryGetProperty("picks", out var picks) && picks.ValueKind == JsonValueKind.Array)
                foreach (var p in picks.EnumerateArray())
                    if (p.TryGetProperty("market", out var m) && m.GetString() is { } mk) picked.Add(mk);
            rows++;
            foreach (var (name, market) in new[] { ("ah", "AH"), ("ou", "OU") })
            {
                if (!lean.TryGetProperty(name, out var l) || l.ValueKind != JsonValueKind.Object) continue;
                var side = l.GetProperty("side").GetString() ?? "";
                var line = l.GetProperty("line").GetDouble();
                var backed = new Pick { Market = market, Side = side, Odds = 2, Line = market == "AH" && side == "away" ? -line : line };
                Add(name, backed, hg, ag);
                Add(name + (picked.Contains(market) ? "-with-pick" : "-no-pick"), backed, hg, ag);
                if (market == "AH") Add("ah-" + (backed.Line < 0 ? "gives" : backed.Line > 0 ? "takes" : "level"), backed, hg, ag);
            }
        }
        object Shape(string key) => acc.TryGetValue(key, out var a)
            ? new { n = a[0], win = Math.Round(a[1], 1), loss = Math.Round(a[2], 1), push = Math.Round(a[3], 1), hitPct = a[1] + a[2] > 0 ? Math.Round(a[1] / (a[1] + a[2]) * 100, 1) : (double?)null }
            : new { n = 0.0, win = 0.0, loss = 0.0, push = 0.0, hitPct = (double?)null };
        return new
        {
            fixtures = rows,
            handicap = Shape("ah"), handicapWithPick = Shape("ah-with-pick"), handicapNoPick = Shape("ah-no-pick"),
            handicapGives = Shape("ah-gives"), handicapTakes = Shape("ah-takes"), handicapLevel = Shape("ah-level"),
            total = Shape("ou"), totalWithPick = Shape("ou-with-pick"), totalNoPick = Shape("ou-no-pick"),
        };
    }

    /// <summary>Every row as JSON, for backtest/market.js.</summary>
    public string ExportJson()
    {
        using var c = db.Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT fixture_id, kickoff_utc, league_id, league, home, away, model_json, market_json, close_json, home_goals, away_goals FROM match_history ORDER BY kickoff_utc";
        using var r = cmd.ExecuteReader();
        using var ms = new MemoryStream();
        using (var w = new System.Text.Json.Utf8JsonWriter(ms))
        {
            w.WriteStartArray();
            while (r.Read())
            {
                w.WriteStartObject();
                w.WriteNumber("fixtureId", r.GetInt32(0)); w.WriteString("kickoffUtc", r.GetString(1)); w.WriteNumber("leagueId", r.GetInt32(2));
                w.WriteString("league", r.GetString(3)); w.WriteString("home", r.GetString(4)); w.WriteString("away", r.GetString(5));
                foreach (var (name, i) in new[] { ("model", 6), ("market", 7), ("close", 8) })
                {
                    w.WritePropertyName(name);
                    if (r.IsDBNull(i)) w.WriteNullValue();
                    else { using var raw = JsonDocument.Parse(r.GetString(i)); raw.RootElement.WriteTo(w); }
                }
                if (r.IsDBNull(9)) { w.WriteNull("homeGoals"); w.WriteNull("awayGoals"); }
                else { w.WriteNumber("homeGoals", r.GetInt32(9)); w.WriteNumber("awayGoals", r.GetInt32(10)); }
                w.WriteEndObject();
            }
            w.WriteEndArray();
        }
        return System.Text.Encoding.UTF8.GetString(ms.ToArray());
    }
}

/// <summary>What the model made of each fixture (win probabilities, every priced option, the picks), kept one day per source.</summary>
public sealed class AnalysisStore(Db db, ILogger<AnalysisStore> log)
{
    public void Save(int fixtureId, string source, string json)
    {
        try
        {
            using var c = db.Open();
            Db.Exec(c, "INSERT OR REPLACE INTO analyses(fixture_id, source, created_utc, json) VALUES($f, $s, $t, $j)",
                ("$f", fixtureId), ("$s", source), ("$t", DateTime.UtcNow.ToString("O")), ("$j", json));
            Db.Exec(c, "DELETE FROM analyses WHERE created_utc < $cut", ("$cut", Db.Cutoff()));
        }
        catch (Exception ex) { log.LogWarning(ex, "Could not store the analysis of fixture {Id}", fixtureId); }
    }
}

/// <summary>
/// The latest ranking pulled for each date, kept so the first visitor's pull is shown to everyone without
/// pulling again. Stored as the page's own JSON; the server only checks the shape and size.
/// </summary>
public sealed class SharedRank
{
    public const int MaxBytes = 3_000_000;
    private const string Prefix = "shared-rank-";
    private static readonly Regex DateKey = new(@"^\d{4}-\d{2}-\d{2}$", RegexOptions.Compiled);
    private readonly ConcurrentDictionary<string, string> _byDate = new();
    private readonly Db _db;
    private readonly ILogger<SharedRank> _log;

    public SharedRank(Db db, DataDir dir, ILogger<SharedRank> log)
    {
        _db = db;
        _log = log;
        try
        {
            using var c = db.Open();
            using (var cmd = c.CreateCommand())
            {
                cmd.CommandText = "SELECT date, json FROM shared_rank";
                using var r = cmd.ExecuteReader();
                while (r.Read()) _byDate[r.GetString(0)] = r.GetString(1);
            }
            // shared-rank-DATE.json files from before the database: imported once, then renamed
            foreach (var path in Directory.EnumerateFiles(dir.Root, Prefix + "*.json"))
            {
                var date = Path.GetFileNameWithoutExtension(path)[Prefix.Length..];
                if (!_byDate.ContainsKey(date))
                {
                    _byDate[date] = File.ReadAllText(path);
                    Db.Exec(c, "INSERT OR REPLACE INTO shared_rank(date, json) VALUES($d, $j)", ("$d", date), ("$j", _byDate[date]));
                }
                Db.RetireFile(path);
            }
        }
        catch (Exception ex) { _log.LogWarning(ex, "Could not load shared rankings"); }
    }

    /// <summary>Only a date within three days of today is accepted, so the folder cannot be filled with arbitrary keys.</summary>
    public static bool ValidDate(string? date)
    {
        if (date is null || !DateKey.IsMatch(date) || !DateTime.TryParse(date, out var d)) return false;
        return Math.Abs((d.Date - DateTime.UtcNow.Date).TotalDays) <= 3;
    }

    /// <summary>{"savedAt":...,"payload":...} or null.</summary>
    public string? Get(string date) => _byDate.TryGetValue(date, out var json) ? json : null;

    /// <summary>Only a ranking of fixtures the server itself has listed is accepted, so a made-up one cannot replace what everyone sees.</summary>
    public bool Put(string date, string payloadJson, KnownFixtures known)
    {
        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object
                || !doc.RootElement.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array
                || items.GetArrayLength() is 0 or > 30) return false;
            foreach (var item in items.EnumerateArray())
            {
                if (!item.TryGetProperty("fixture", out var f) || !f.TryGetProperty("fixture", out var fx)
                    || !fx.TryGetProperty("id", out var id) || !id.TryGetInt32(out var fixtureId)
                    || !known.TryGet(fixtureId, out _)) return false;
            }
        }
        catch (Exception ex) when (ex is JsonException or InvalidOperationException) { return false; }

        var json = "{\"savedAt\":\"" + DateTime.UtcNow.ToString("O") + "\",\"payload\":" + payloadJson + "}";
        _byDate[date] = json;
        try
        {
            using var c = _db.Open();
            Db.Exec(c, "INSERT OR REPLACE INTO shared_rank(date, json) VALUES($d, $j)", ("$d", date), ("$j", json));
        }
        catch (Exception ex) { _log.LogWarning(ex, "Could not save shared ranking for {Date}", date); }
        Prune();
        return true;
    }

    private void Prune()
    {
        var oldest = DateTime.UtcNow.Date.AddDays(-1).ToString("yyyy-MM-dd");
        foreach (var date in _byDate.Keys.Where(k => string.CompareOrdinal(k, oldest) < 0))
        {
            _byDate.TryRemove(date, out _);
            try { using var c = _db.Open(); Db.Exec(c, "DELETE FROM shared_rank WHERE date = $d", ("$d", date)); }
            catch (Exception ex) { _log.LogWarning(ex, "Could not prune shared ranking for {Date}", date); }
        }
    }
}
