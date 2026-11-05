using System.Security.Cryptography;
using System.Text.Json;

namespace Matchdesk.Proxy;

public static class DrinkLedgers
{
    internal static readonly Guid CurrentId = Guid.Parse("344599ce-83f7-4767-9988-9f60af01e36b");
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static void Map(WebApplication app)
    {
        var routes = app.MapGroup("/api/drink-ledgers").RequireRateLimiting("api");
        app.Use(async (http, next) =>
        {
            if (http.Request.Path.StartsWithSegments("/api/drink-ledgers"))
            {
                http.Response.Headers.CacheControl = "no-store";
                var limit = http.Features.Get<Microsoft.AspNetCore.Http.Features.IHttpMaxRequestBodySizeFeature>();
                if (limit is { IsReadOnly: false }) limit.MaxRequestBodySize = 512 * 1024;
            }
            await next();
        });
        routes.MapPost("/", Create).RequireRateLimiting("share");
        routes.MapGet("/current", (Db db) => Read(CurrentId, db));
        routes.MapPut("/current", (Ledger ledger, Db db) => Update(CurrentId, ledger, db));
        routes.MapGet("/{id:guid}", Read);
        routes.MapPut("/{id:guid}", Update);
    }

    private static IResult Create(Ledger ledger, Db db)
    {
        if (!Valid(ledger.Records)) return Results.BadRequest();
        var id = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        using var connection = db.Open();
        Db.Exec(connection, "INSERT INTO drink_ledgers VALUES ($id, 0, $json)",
            ("$id", id), ("$json", JsonSerializer.Serialize(ledger.Records, JsonOptions)));
        return Results.Json(new { id, revision = 0, ledger.Records }, statusCode: 201);
    }

    private static IResult Read(Guid id, Db db)
    {
        using var connection = db.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT revision, json FROM drink_ledgers WHERE id = $id";
        command.Parameters.AddWithValue("$id", id.ToString("N"));
        using var reader = command.ExecuteReader();
        if (!reader.Read()) return Results.NotFound();
        return Results.Json(new Ledger(reader.GetInt64(0),
            JsonSerializer.Deserialize<Record[]>(reader.GetString(1), JsonOptions)));
    }

    private static IResult Update(Guid id, Ledger ledger, Db db)
    {
        if (!Valid(ledger.Records) || ledger.Revision < 0) return Results.BadRequest();
        using var connection = db.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "UPDATE drink_ledgers SET revision = revision + 1, json = $json WHERE id = $id AND revision = $revision";
        command.Parameters.AddWithValue("$id", id.ToString("N"));
        command.Parameters.AddWithValue("$revision", ledger.Revision);
        command.Parameters.AddWithValue("$json", JsonSerializer.Serialize(ledger.Records, JsonOptions));
        return command.ExecuteNonQuery() == 1
            ? Results.Json(ledger with { Revision = ledger.Revision + 1 })
            : Results.Conflict();
    }

    private static bool Valid(Record[]? records) =>
        records is { Length: <= 1000 }
        && records.All(record => record is not null && Text(record.Id, 100) && Text(record.Payer, 60)
            && record.Recipients is { Length: > 0 and <= 100 }
            && record.Recipients.All(person => person is not null && Text(person.Name, 60)
                && person.Name != record.Payer && person.Bottles is >= 1 and <= 9999)
            && record.Recipients.Select(person => person.Name).Distinct().Count() == record.Recipients.Length)
        && records.Select(record => record.Id).Distinct().Count() == records.Length;

    private static bool Text(string? value, int maxLength) =>
        !string.IsNullOrWhiteSpace(value) && value.Length <= maxLength && value == value.Trim();

    public sealed record Ledger(long Revision, Record[]? Records);
    public sealed record Record(string Id, string Payer, Recipient[] Recipients, DateTimeOffset? CreatedAt = null);
    public sealed record Recipient(string Name, int Bottles);
}
