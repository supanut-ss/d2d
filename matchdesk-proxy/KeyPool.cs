using System.Collections.Concurrent;
using System.Text.Json;

namespace Matchdesk.Proxy;

public sealed record UpstreamResult(int Status, string Body);

/// <summary>Daily quota across live keys as last reported by API-Football, plus what this server spent today (UTC).</summary>
public sealed record QuotaInfo(int KeysAlive, int KeysTotal, int? Limit, int? Remaining, int UsedToday, IReadOnlyDictionary<string, int> UsedBySource, DateTime ResetsAtUtc);

/// <summary>
/// Holds the API-Football keys server side. Each key is used one request at a time with a minimum
/// interval (free plan: 10 requests/minute); a key that hits its daily quota is parked until 00:00 UTC.
/// </summary>
public sealed class KeyPool
{
    private const string UpstreamBase = "https://v3.football.api-sports.io";

    private sealed class Slot
    {
        public required string Key { get; init; }
        public SemaphoreSlim Gate { get; } = new(1, 1);
        public DateTime LastUtc = DateTime.MinValue;
        public DateTime DeadUntilUtc = DateTime.MinValue;
        public int Pending;
        public TimeSpan Interval;
        public int? DailyLimit;
        public int? DailyRemaining;
        public bool IsDead(DateTime now) => DeadUntilUtc > now;
    }

    private readonly List<Slot> _slots;
    private readonly HttpClient _http;
    private readonly TimeSpan _minInterval;
    private readonly ILogger<KeyPool> _log;
    private readonly ConcurrentDictionary<string, int> _used = new();
    private DateTime _usedDay = DateTime.UtcNow.Date;

    public KeyPool(IConfiguration config, IHttpClientFactory factory, ILogger<KeyPool> log)
    {
        var section = config.GetSection("Matchdesk");
        _slots = (section.GetSection("ApiKeys").Get<string[]>() ?? [])
            .Select(k => k?.Trim() ?? "")
            .Where(k => k.Length > 0 && !k.StartsWith("KEY_", StringComparison.Ordinal))
            .Distinct()
            .Select(k => new Slot { Key = k, Interval = TimeSpan.FromMilliseconds(section.GetValue("MinIntervalMs", 6500)) })
            .ToList();
        _minInterval = TimeSpan.FromMilliseconds(section.GetValue("MinIntervalMs", 6500));
        _http = factory.CreateClient("football");
        _log = log;
        _log.LogInformation("Matchdesk key pool: {Count} key(s)", _slots.Count);
    }

    public int Total => _slots.Count;
    public int Alive => _slots.Count(s => !s.IsDead(DateTime.UtcNow));

    public QuotaInfo Quota()
    {
        ResetCountersIfNewDay();
        var now = DateTime.UtcNow;
        var live = _slots.Where(s => !s.IsDead(now) && s.DailyLimit is not null).ToList();
        return new QuotaInfo(Alive, Total,
            live.Count == 0 ? null : live.Sum(s => s.DailyLimit!.Value),
            live.Count == 0 ? null : live.Sum(s => s.DailyRemaining ?? 0),
            _used.Values.Sum(), new Dictionary<string, int>(_used), now.Date.AddDays(1));
    }

    private void ResetCountersIfNewDay()
    {
        var today = DateTime.UtcNow.Date;
        if (_usedDay == today) return;
        lock (_used)
        {
            if (_usedDay == today) return;
            _used.Clear();
            _usedDay = today;
        }
    }

    private Slot? Pick()
    {
        var now = DateTime.UtcNow;
        return _slots.Where(s => !s.IsDead(now))
            .OrderBy(s => Volatile.Read(ref s.Pending))
            .ThenBy(s => s.LastUtc)
            .FirstOrDefault();
    }

    public async Task<UpstreamResult> GetAsync(string pathAndQuery, CancellationToken ct, string source = "page")
    {
        var rateRetried = false;
        while (true)
        {
            var slot = Pick();
            if (slot is null)
                return new UpstreamResult(503, Error("โควตา API ของทุกคีย์หมดแล้ว ลองใหม่พรุ่งนี้"));

            Interlocked.Increment(ref slot.Pending);
            string body;
            int status;
            try
            {
                await slot.Gate.WaitAsync(ct);
                try
                {
                    var wait = slot.LastUtc + slot.Interval - DateTime.UtcNow;
                    if (wait > TimeSpan.Zero) await Task.Delay(wait, ct);
                    slot.LastUtc = DateTime.UtcNow;
                    ResetCountersIfNewDay();
                    _used.AddOrUpdate(source, 1, (_, n) => n + 1);
                    using var req = new HttpRequestMessage(HttpMethod.Get, UpstreamBase + pathAndQuery);
                    req.Headers.Add("x-apisports-key", slot.Key);
                    using var res = await _http.SendAsync(req, ct);
                    status = (int)res.StatusCode;
                    // pace each key by its plan: x-ratelimit-limit is requests per minute (10 on free, more on paid plans)
                    if (res.Headers.TryGetValues("x-ratelimit-limit", out var lim) && int.TryParse(lim.FirstOrDefault(), out var perMinute) && perMinute > 0)
                        slot.Interval = TimeSpan.FromMilliseconds(Math.Min(_minInterval.TotalMilliseconds, 60000.0 / perMinute * 1.1));
                    // daily quota of this key (requests-limit / requests-remaining)
                    if (res.Headers.TryGetValues("x-ratelimit-requests-limit", out var dl) && int.TryParse(dl.FirstOrDefault(), out var dayLimit)) slot.DailyLimit = dayLimit;
                    if (res.Headers.TryGetValues("x-ratelimit-requests-remaining", out var dr) && int.TryParse(dr.FirstOrDefault(), out var dayLeft)) slot.DailyRemaining = dayLeft;
                    body = await res.Content.ReadAsStringAsync(ct);
                }
                finally { slot.Gate.Release(); }
            }
            catch (HttpRequestException)
            {
                return new UpstreamResult(502, Error("เชื่อมต่อ API ไม่สำเร็จ"));
            }
            finally { Interlocked.Decrement(ref slot.Pending); }

            var errs = ParseErrors(body);
            // API-Football reports the daily cap under "rateLimit" too; only a per-minute message is worth waiting out.
            var dailyCap = errs.TryGetValue("rateLimit", out var rl) && rl.Contains("daily", StringComparison.OrdinalIgnoreCase);
            if (dailyCap) errs["requests"] = errs["rateLimit"];
            if (errs.ContainsKey("rateLimit") && !dailyCap && !rateRetried)
            {
                rateRetried = true;
                await Task.Delay(slot.Interval, ct);
                continue;
            }
            if (errs.ContainsKey("requests") || errs.ContainsKey("token") || errs.ContainsKey("access") || (status == 429 && !errs.ContainsKey("rateLimit")))
            {
                slot.DeadUntilUtc = DateTime.UtcNow.Date.AddDays(1);
                slot.DailyRemaining = 0;
                _log.LogWarning("Key ...{Tail} parked until {Until:u} ({Errors})", slot.Key[^4..], slot.DeadUntilUtc, string.Join(",", errs.Keys));
                rateRetried = false;
                continue;
            }
            return new UpstreamResult(status, body);
        }
    }

    private static Dictionary<string, string> ParseErrors(string body)
    {
        var set = new Dictionary<string, string>();
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("errors", out var e) && e.ValueKind == JsonValueKind.Object)
                foreach (var p in e.EnumerateObject()) set[p.Name] = p.Value.ToString();
        }
        catch (JsonException) { }
        return set;
    }

    private static string Error(string message) => JsonSerializer.Serialize(new { error = message });
}
