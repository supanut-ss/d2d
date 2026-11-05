using Microsoft.Data.Sqlite;

namespace Matchdesk.Proxy;

/// <summary>
/// The SQLite database (matchdesk.db in the data folder) that holds picks, odds history and shared rankings.
/// Each store keeps its working set in memory and writes through here; files from the JSON era are imported once and renamed.
/// </summary>
public sealed class Db
{
    private readonly string _connectionString;

    public Db(DataDir dir)
    {
        _connectionString = new SqliteConnectionStringBuilder { DataSource = dir.File("matchdesk.db"), DefaultTimeout = 30 }.ToString();
        using var c = Open();
        Exec(c, """
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS picks(id TEXT PRIMARY KEY, fixture_id INTEGER NOT NULL, market TEXT NOT NULL, kickoff_utc TEXT NOT NULL, status TEXT NOT NULL, json TEXT NOT NULL);
            CREATE INDEX IF NOT EXISTS ix_picks_fixture ON picks(fixture_id, market);
            CREATE TABLE IF NOT EXISTS odds_history(fixture_id INTEGER PRIMARY KEY, json TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS shared_rank(date TEXT PRIMARY KEY, json TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS drink_ledgers(id TEXT PRIMARY KEY, revision INTEGER NOT NULL, json TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS api_cache(key TEXT PRIMARY KEY, status INTEGER NOT NULL, body TEXT NOT NULL, fetched_utc TEXT NOT NULL, expires_utc TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS match_history(fixture_id INTEGER PRIMARY KEY, kickoff_utc TEXT NOT NULL, league_id INTEGER NOT NULL, league TEXT NOT NULL, home TEXT NOT NULL, away TEXT NOT NULL, model_json TEXT, market_json TEXT, close_json TEXT, home_goals INTEGER, away_goals INTEGER, updated_utc TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS job_runs(id INTEGER PRIMARY KEY AUTOINCREMENT, task TEXT NOT NULL, started_utc TEXT NOT NULL, json TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS analyses(fixture_id INTEGER NOT NULL, source TEXT NOT NULL, created_utc TEXT NOT NULL, json TEXT NOT NULL, PRIMARY KEY(fixture_id, source));
            """);
        Exec(c, "INSERT OR IGNORE INTO drink_ledgers (id, revision, json) VALUES ($id, 0, '[]')",
            ("$id", DrinkLedgers.CurrentId.ToString("N")));
    }

    /// <summary>Raw API responses and analysis results are kept this long, then deleted.</summary>
    public static readonly TimeSpan Retention = TimeSpan.FromDays(1);

    public static string Cutoff() => (DateTime.UtcNow - Retention).ToString("O");

    public SqliteConnection Open()
    {
        var c = new SqliteConnection(_connectionString);
        c.Open();
        return c;
    }

    public static void Exec(SqliteConnection c, string sql, params (string Name, object? Value)[] args)
    {
        using var cmd = c.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (name, value) in args) cmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
        cmd.ExecuteNonQuery();
    }

    public static long Count(SqliteConnection c, string table)
    {
        using var cmd = c.CreateCommand();
        cmd.CommandText = $"SELECT COUNT(*) FROM {table}";
        return (long)cmd.ExecuteScalar()!;
    }

    /// <summary>Renames a JSON-era file so it is imported only once and stays on disk as a backup.</summary>
    public static void RetireFile(string path)
    {
        try { File.Move(path, path + ".migrated", overwrite: true); } catch (IOException) { }
    }
}
