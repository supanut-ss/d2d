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
            """);
    }

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
