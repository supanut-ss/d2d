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
