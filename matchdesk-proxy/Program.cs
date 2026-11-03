using System.Collections.Concurrent;
using System.Threading.RateLimiting;
using Matchdesk.Proxy;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpClient("football", c => c.Timeout = TimeSpan.FromSeconds(30));
builder.Services.AddSingleton<KeyPool>();
builder.Services.AddHttpClient("ai", c => c.Timeout = TimeSpan.FromMinutes(4));
builder.Services.AddSingleton<ResponseCache>();
builder.Services.AddSingleton<AiService>();
builder.Services.AddSingleton<DataDir>();
builder.Services.AddSingleton<Db>();
builder.Services.AddSingleton<SharedRank>();
builder.Services.AddSingleton<AnalysisStore>();
builder.Services.AddSingleton<OddsHistory>();
builder.Services.AddSingleton<KnownFixtures>();
builder.Services.AddSingleton<PickLog>();
builder.Services.AddSingleton<PickWorker>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<PickWorker>());
builder.Services.AddSingleton<DailyJob>();
builder.Services.AddHostedService<OddsTracker>();
builder.Services.AddResponseCompression(o => o.EnableForHttps = true);
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownNetworks.Clear();
    o.KnownProxies.Clear();
});
var perMinute = builder.Configuration.GetValue("Matchdesk:RequestsPerMinutePerIp", 240);
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    // AI calls cost money: far tighter than the data API
    o.AddPolicy("ai", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = builder.Configuration.GetValue("Matchdesk:Ai:RequestsPerHourPerIp", 10), Window = TimeSpan.FromHours(1) }));
    o.AddPolicy("api", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = perMinute, Window = TimeSpan.FromMinutes(1) }));
});

var app = builder.Build();

app.UseForwardedHeaders();
app.UseResponseCompression();
app.UseRateLimiter();

// /matchdesk -> /matchdesk/ so the page's relative api/ URLs resolve under the app path.
app.Use(async (ctx, next) =>
{
    if (!ctx.Request.Path.HasValue && HttpMethods.IsGet(ctx.Request.Method))
    {
        ctx.Response.Redirect(ctx.Request.PathBase + "/" + ctx.Request.QueryString);
        return;
    }
    await next();
});

app.UseDefaultFiles();
// always revalidate: without this a browser can keep showing an old page after a deploy
app.UseStaticFiles(new StaticFileOptions { OnPrepareResponse = ctx => ctx.Context.Response.Headers.CacheControl = "no-cache" });

// Only the endpoints the page uses; everything else is refused.
var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
{
    "fixtures", "fixtures/headtohead", "standings", "fixtures/statistics", "fixtures/lineups", "injuries", "predictions", "odds", "teams/statistics"
};

TimeSpan Ttl(string path) => CachePolicy.Ttl(path);

app.MapGet("/api/football/{**path}", async (string path, HttpContext ctx, KeyPool pool, ResponseCache cache, KnownFixtures known) =>
{
    path = path.Trim('/');
    if (!allowed.Contains(path)) return Results.NotFound(new { error = "endpoint ไม่ได้รับอนุญาต" });

    var query = ctx.Request.QueryString.Value ?? "";
    // ?fresh=1 on /odds: re-read the price now (used to check a pick just before betting). Dropped from the upstream
    // query, and refused for 20 s per fixture so it cannot be used to hammer the API.
    var wantFresh = path.Equals("odds", StringComparison.OrdinalIgnoreCase) && ctx.Request.Query["fresh"] == "1";
    if (wantFresh)
        query = "?" + string.Join("&", ctx.Request.Query.Where(kv => kv.Key != "fresh")
            .SelectMany(kv => kv.Value.Select(v => $"{kv.Key}={Uri.EscapeDataString(v ?? "")}")));
    if (wantFresh && !cache.TryReserveFresh(path + query)) wantFresh = false;
    UpstreamResult result;
    bool fromCache;
    if (wantFresh)
    {
        result = await pool.GetAsync("/" + path + query, ctx.RequestAborted);
        cache.Put(path + query, Ttl(path), result);
        fromCache = false;
    }
    else
    {
        (result, fromCache) = await cache.GetOrAddAsync(path + query, Ttl(path), () => pool.GetAsync("/" + path + query, ctx.RequestAborted));
    }

    // remember not-started fixtures so picks can be logged against their real kickoff and names
    if (!fromCache && path == "fixtures" && result.Status == 200 && query.Contains("date=")) known.Note(result.Body);
    ctx.Response.Headers["X-Cache"] = fromCache ? "HIT" : "MISS";
    ctx.Response.Headers["X-Keys-Alive"] = $"{pool.Alive}/{pool.Total}";
    var quota = pool.Quota();
    if (quota.Limit is not null) ctx.Response.Headers["X-Quota"] = $"{quota.Remaining}/{quota.Limit}";
    ctx.Response.Headers["Cache-Control"] = "no-store";
    return Results.Content(result.Body, "application/json", statusCode: result.Status);
}).RequireRateLimiting("api");

app.MapGet("/api/odds-history", (string? fixtures, OddsHistory history) =>
{
    var ids = (fixtures ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries)
        .Select(x => int.TryParse(x, out var id) ? id : 0).Where(id => id > 0).Distinct().Take(60);
    return Results.Json(history.Get(ids));
}).RequireRateLimiting("api");

// the latest ranking (with AI notes) pulled for a date, shown to every visitor
app.MapGet("/api/shared/rank", (string? date, SharedRank shared) =>
{
    if (!SharedRank.ValidDate(date)) return Results.BadRequest(new { error = "invalid date" });
    var json = shared.Get(date!);
    return json is null ? Results.NoContent() : Results.Content(json, "application/json");
}).RequireRateLimiting("api");

app.MapPut("/api/shared/rank", async (string? date, HttpContext ctx, SharedRank shared) =>
{
    if (!SharedRank.ValidDate(date)) return Results.BadRequest(new { error = "invalid date" });
    var limit = ctx.Features.Get<Microsoft.AspNetCore.Http.Features.IHttpMaxRequestBodySizeFeature>();
    if (limit is { IsReadOnly: false }) limit.MaxRequestBodySize = SharedRank.MaxBytes;
    try
    {
        using var reader = new StreamReader(ctx.Request.Body);
        return shared.Put(date!, await reader.ReadToEndAsync(ctx.RequestAborted)) ? Results.NoContent() : Results.BadRequest(new { error = "invalid ranking" });
    }
    catch (BadHttpRequestException) { return Results.StatusCode(StatusCodes.Status413PayloadTooLarge); }
}).RequireRateLimiting("api");

app.MapGet("/api/ai/providers", (AiService ai) => Results.Json(ai.Providers));

app.MapPost("/api/ai/analyze", async (AiRequest req, AiService ai, HttpContext ctx) =>
{
    try
    {
        // the password is checked on every request, before any provider is called
        ai.CheckPassword(ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown", req.Password);
        if (req.Providers is not { Length: > 0 }) return Results.BadRequest(new { error = "เลือกแพลตฟอร์ม AI อย่างน้อย 1 ตัว" });
        var outcomes = await ai.AnalyzeAsync(req.Providers, req.Matches, ctx.RequestAborted);
        return Results.Json(outcomes);
    }
    catch (AiAuthException ex) { return Results.Json(new { error = ex.Message }, statusCode: ex.Status); }
    catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
}).RequireRateLimiting("ai");

app.MapPost("/api/picks/log", (PickBatch batch, PickLog picks) =>
    Results.Json(new { added = picks.Log(batch.Picks ?? []) })).RequireRateLimiting("api");

app.MapGet("/api/picks/all", (PickLog picks) => Results.Json(picks.History())).RequireRateLimiting("api");

app.MapGet("/api/picks/stats", (PickLog picks, PickWorker worker) => { worker.Kick(); return Results.Json(picks.Stats()); }).RequireRateLimiting("api");

// cron entry point (GitHub Actions / Plesk scheduled task): ?task=rank|settle|all, token in X-Job-Token or ?token=
IResult RunJob(HttpContext ctx, DailyJob job)
{
    if (!job.Enabled) return Results.Json(new { error = "jobs are not configured (Matchdesk:Jobs:Token)" }, statusCode: 503);
    var token = ctx.Request.Headers["X-Job-Token"].FirstOrDefault() ?? ctx.Request.Query["token"].FirstOrDefault();
    if (!job.TokenMatches(token)) return Results.Json(new { error = "invalid token" }, statusCode: 401);
    var task = (ctx.Request.Query["task"].FirstOrDefault() ?? "all").ToLowerInvariant();
    if (task is not ("rank" or "settle" or "all")) return Results.BadRequest(new { error = "task must be rank, settle or all" });
    var started = job.TryStart(task);
    return Results.Json(new { task, started, running = job.Running, last = job.Last }, statusCode: started ? 202 : 200);
}
app.MapGet("/api/jobs/run", RunJob).RequireRateLimiting("api");
app.MapPost("/api/jobs/run", RunJob).RequireRateLimiting("api");
app.MapGet("/api/jobs/last", (DailyJob job) => Results.Json(new { running = job.Running, last = job.Last }));

app.MapGet("/api/status", (KeyPool pool, PickWorker worker) => { worker.Kick(); return Results.Json(pool.Quota()); });

app.Run();

/// <summary>In-memory cache with single-flight so concurrent identical requests cost one upstream call.</summary>
public sealed record PickBatch(PickInput[]? Picks);

public sealed record AiRequest(AiPick[] Providers, System.Text.Json.JsonElement Matches, string? Password);

public sealed class ResponseCache
{
    private sealed record Entry(UpstreamResult Result, DateTime ExpiresUtc);
    private readonly ConcurrentDictionary<string, Entry> _done = new();
    private readonly Db _db;
    private readonly ILogger<ResponseCache> _log;

    /// <summary>Every upstream response is also written to the database (kept one day), so a restart keeps what is still fresh.</summary>
    public ResponseCache(Db db, ILogger<ResponseCache> log)
    {
        _db = db;
        _log = log;
        try
        {
            using var c = db.Open();
            Db.Exec(c, "DELETE FROM api_cache WHERE fetched_utc < $cut", ("$cut", Db.Cutoff()));
            using var cmd = c.CreateCommand();
            cmd.CommandText = "SELECT key, status, body, expires_utc FROM api_cache WHERE expires_utc > $now";
            cmd.Parameters.AddWithValue("$now", DateTime.UtcNow.ToString("O"));
            using var r = cmd.ExecuteReader();
            while (r.Read())
                _done[r.GetString(0)] = new Entry(new UpstreamResult(r.GetInt32(1), r.GetString(2)), DateTime.Parse(r.GetString(3), null, System.Globalization.DateTimeStyles.RoundtripKind));
        }
        catch (Exception ex) { _log.LogWarning(ex, "Could not load the response cache"); }
    }

    private void Store(string key, TimeSpan ttl, UpstreamResult result)
    {
        var now = DateTime.UtcNow;
        _done[key] = new Entry(result, now + ttl);
        try
        {
            using var c = _db.Open();
            Db.Exec(c, "INSERT OR REPLACE INTO api_cache(key, status, body, fetched_utc, expires_utc) VALUES($k, $s, $b, $f, $e)",
                ("$k", key), ("$s", result.Status), ("$b", result.Body), ("$f", now.ToString("O")), ("$e", (now + ttl).ToString("O")));
        }
        catch (Exception ex) { _log.LogWarning(ex, "Could not store {Key}", key); }
    }
    private readonly ConcurrentDictionary<string, Lazy<Task<UpstreamResult>>> _inflight = new();
    private DateTime _nextSweepUtc = DateTime.UtcNow.AddMinutes(10);
    private readonly ConcurrentDictionary<string, DateTime> _lastFresh = new();

    public void Put(string key, TimeSpan ttl, UpstreamResult result)
    {
        if (result.Status == 200 && !result.Body.Contains("\"errors\":{\""))
            Store(key, ttl, result);
    }

    /// <summary>True when a fresh read of this key is allowed now (at most one per 20 seconds).</summary>
    public bool TryReserveFresh(string key)
    {
        var now = DateTime.UtcNow;
        var last = _lastFresh.GetOrAdd(key, DateTime.MinValue);
        if (now - last < TimeSpan.FromSeconds(20)) return false;
        _lastFresh[key] = now;
        return true;
    }

    /// <summary>Returns the response and whether it was served without a new upstream call by this request.</summary>
    public async Task<(UpstreamResult Result, bool FromCache)> GetOrAddAsync(string key, TimeSpan ttl, Func<Task<UpstreamResult>> factory)
    {
        SweepExpired();
        if (_done.TryGetValue(key, out var hit) && hit.ExpiresUtc > DateTime.UtcNow) return (hit.Result, true);

        var mine = new Lazy<Task<UpstreamResult>>(factory);
        var lazy = _inflight.GetOrAdd(key, mine);
        try
        {
            var result = await lazy.Value;
            // Keep clean successes only: a body carrying API errors must not be served for hours.
            if (result.Status == 200 && !result.Body.Contains("\"errors\":{\""))
                Store(key, ttl, result);
            // a request that joined someone else's in-flight call did not spend quota itself
            return (result, !ReferenceEquals(lazy, mine));
        }
        finally { _inflight.TryRemove(new KeyValuePair<string, Lazy<Task<UpstreamResult>>>(key, lazy)); }
    }

    // expired entries are otherwise kept until the app pool recycles (fixture lists alone are several MB per day)
    private void SweepExpired()
    {
        var now = DateTime.UtcNow;
        if (now < _nextSweepUtc) return;
        _nextSweepUtc = now.AddMinutes(10);
        foreach (var kv in _done)
            if (kv.Value.ExpiresUtc <= now) _done.TryRemove(kv.Key, out _);
        try { using var c = _db.Open(); Db.Exec(c, "DELETE FROM api_cache WHERE fetched_utc < $cut", ("$cut", Db.Cutoff())); }
        catch (Exception ex) { _log.LogWarning(ex, "Could not prune the response cache"); }
    }
}
