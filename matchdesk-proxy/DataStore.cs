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

    public bool Put(string date, string payloadJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object
                || !doc.RootElement.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array) return false;
        }
        catch (JsonException) { return false; }

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
        var oldest = DateTime.UtcNow.Date.AddDays(-5).ToString("yyyy-MM-dd");
        foreach (var date in _byDate.Keys.Where(k => string.CompareOrdinal(k, oldest) < 0))
        {
            _byDate.TryRemove(date, out _);
            try { using var c = _db.Open(); Db.Exec(c, "DELETE FROM shared_rank WHERE date = $d", ("$d", date)); }
            catch (Exception ex) { _log.LogWarning(ex, "Could not prune shared ranking for {Date}", date); }
        }
    }
}
