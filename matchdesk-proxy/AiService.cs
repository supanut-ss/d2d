using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Matchdesk.Proxy;

public sealed record AiMatch(int Id, string? Verdict, string? Summary, string[]? Risks);
public sealed record AiProviderInfo(string Id, string Name, string Model, string[] Models);
public sealed record AiPick(string Id, string? Model);

/// <summary>One AI platform. Returns the model's raw text for a system + user prompt.</summary>
public abstract class AiProvider(string id, string name, string apiKey, string defaultModel, string[] models, HttpClient http)
{
    // output budget includes the model's reasoning tokens, so keep it generous for 20-match shortlists
    protected const int MaxOutputTokens = 16000;

    public string Id { get; } = id;
    public string Name { get; } = name;
    public string DefaultModel { get; } = defaultModel;
    /// <summary>Models the page may choose from; the default is always one of them.</summary>
    public string[] Models { get; } = models.Append(defaultModel).Distinct().ToArray();
    public bool Configured => !string.IsNullOrWhiteSpace(apiKey) && !apiKey.StartsWith("KEY_", StringComparison.Ordinal);
    protected string ApiKey => apiKey;
    protected HttpClient Http => http;

    public abstract Task<string> CompleteAsync(string system, string user, string model, CancellationToken ct);

    protected static async Task<JsonDocument> PostJsonAsync(HttpClient http, HttpRequestMessage req, string provider, CancellationToken ct)
    {
        using var res = await http.SendAsync(req, ct);
        var body = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode)
        {
            // keep the provider's message (it never contains our key) but cap its size
            var msg = body.Length > 300 ? body[..300] : body;
            throw new AiProviderException($"{provider} ตอบกลับ HTTP {(int)res.StatusCode}: {msg}");
        }
        return JsonDocument.Parse(body);
    }
}

public sealed class AiProviderException(string message) : Exception(message);

public sealed class ClaudeProvider(string key, string model, string[] models, HttpClient http, string? baseUrl = null, string? effort = null)
    : AiProvider("claude", "Claude", key, model, models, http)
{
    public override async Task<string> CompleteAsync(string system, string user, string model, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, (baseUrl ?? "https://api.anthropic.com") + "/v1/messages")
        {
            Content = new StringContent(JsonSerializer.Serialize(new
            {
                model,
                max_tokens = 8000,
                system,
                messages = new[] { new { role = "user", content = user } },
                // effort: low|medium|high|xhigh|max (config); omitted when not set
                output_config = string.IsNullOrWhiteSpace(effort) ? null : new { effort },
            }), Encoding.UTF8, "application/json"),
        };
        req.Headers.Add("x-api-key", ApiKey);
        req.Headers.Add("anthropic-version", "2023-06-01");
        using var doc = await PostJsonAsync(Http, req, Name, ct);
        var sb = new StringBuilder();
        foreach (var block in doc.RootElement.GetProperty("content").EnumerateArray())
            if (block.TryGetProperty("text", out var t)) sb.Append(t.GetString());
        return sb.ToString();
    }
}

public sealed class GeminiProvider(string key, string model, string[] models, HttpClient http, string? baseUrl = null)
    : AiProvider("gemini", "Gemini", key, model, models, http)
{
    public override async Task<string> CompleteAsync(string system, string user, string model, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post,
            $"{baseUrl ?? "https://generativelanguage.googleapis.com"}/v1beta/models/{Uri.EscapeDataString(model)}:generateContent")
        {
            Content = new StringContent(JsonSerializer.Serialize(new
            {
                systemInstruction = new { parts = new[] { new { text = system } } },
                contents = new[] { new { role = "user", parts = new[] { new { text = user } } } },
                generationConfig = new { responseMimeType = "application/json", maxOutputTokens = MaxOutputTokens, temperature = 0.3 },
            }), Encoding.UTF8, "application/json"),
        };
        req.Headers.Add("x-goog-api-key", ApiKey);
        using var doc = await PostJsonAsync(Http, req, Name, ct);
        var sb = new StringBuilder();
        foreach (var cand in doc.RootElement.GetProperty("candidates").EnumerateArray().Take(1))
            foreach (var part in cand.GetProperty("content").GetProperty("parts").EnumerateArray())
                // thinking models also return "thought" parts: skip them, keep the answer
                if (part.TryGetProperty("text", out var t) && !(part.TryGetProperty("thought", out var th) && th.ValueKind == JsonValueKind.True))
                    sb.Append(t.GetString());
        return sb.ToString();
    }
}

/// <summary>OpenAI through the Responses API (the "Codex" platform in the page).</summary>
public sealed class OpenAiProvider(string key, string model, string[] models, HttpClient http, string? baseUrl = null, string? effort = null)
    : AiProvider("codex", "Codex", key, model, models, http)
{
    public override async Task<string> CompleteAsync(string system, string user, string model, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, (baseUrl ?? "https://api.openai.com") + "/v1/responses")
        {
            Content = new StringContent(JsonSerializer.Serialize(new
            {
                model,
                instructions = system,
                input = user,
                max_output_tokens = MaxOutputTokens,
                // reasoning effort: none|low|medium|high|xhigh|max (config); omitted when not set
                reasoning = string.IsNullOrWhiteSpace(effort) ? null : new { effort },
            }), Encoding.UTF8, "application/json"),
        };
        req.Headers.Add("Authorization", "Bearer " + ApiKey);
        using var doc = await PostJsonAsync(Http, req, Name, ct);
        var sb = new StringBuilder();
        foreach (var item in doc.RootElement.GetProperty("output").EnumerateArray())
            if (item.TryGetProperty("content", out var content) && content.ValueKind == JsonValueKind.Array)
                foreach (var c in content.EnumerateArray())
                    if (c.TryGetProperty("text", out var t)) sb.Append(t.GetString());
        return sb.ToString();
    }
}

public sealed class AiAuthException(string message, int status) : Exception(message)
{
    public int Status { get; } = status;
}

/// <summary>Builds the prompt, calls the chosen platform(s), parses the reply and enforces password, size and daily-call limits.</summary>
public sealed class AiService
{
    private const string System = """
        You are a football betting analyst reviewing a shortlist produced by a statistical model.
        Each item has the model's pick, probabilities, expected value (evPct, in percent), confidence (0-100), the Poisson goal expectations, injuries, recent xG and how the market moved.
        Rules:
        - Use ONLY the numbers in the data. Never invent statistics, results, injuries or news. If something is missing, say it is missing.
        - Judge whether the pick is plausible: do the numbers agree with each other, is the edge large only because data is thin (few games, few bookmakers, no xG), did the market move against the pick, are key players out.
        - verdict must be one of: "น่าสนใจ" (numbers consistent), "ระวัง" (usable but with clear caveats), "ข้าม" (do not trust).
        - Write summary and risks in Thai, concise: summary at most 3 sentences, at most 3 risks of at most 15 words each.
        - Return exactly one entry per input item, using the same id.
        - This is analysis, not a guarantee of profit.
        Reply with JSON only, no markdown: {"matches":[{"id":<number>,"verdict":"...","summary":"...","risks":["..."]}]}
        """;

    private const int MaxPayloadBytes = 120_000;
    private const int MaxMatches = 20;
    private const int MaxFailures = 5;
    private static readonly TimeSpan LockWindow = TimeSpan.FromMinutes(15);

    private readonly Dictionary<string, AiProvider> _providers;
    private readonly ResponseCache _cache;
    private readonly byte[]? _passwordHash;
    private readonly int _dailyCalls;
    private readonly ConcurrentDictionary<string, int> _used = new();
    private readonly ConcurrentDictionary<string, (int Count, DateTime Since)> _failures = new();
    private DateTime _usedDay = DateTime.UtcNow.Date;

    public AiService(IConfiguration config, IHttpClientFactory factory, ResponseCache cache)
    {
        _cache = cache;
        var ai = config.GetSection("Matchdesk:Ai");
        _dailyCalls = ai.GetValue("DailyCalls", 100);
        var password = ai["Password"];
        _passwordHash = string.IsNullOrEmpty(password) || password.StartsWith("CHANGE_ME", StringComparison.Ordinal)
            ? null : SHA256.HashData(Encoding.UTF8.GetBytes(password));

        var http = factory.CreateClient("ai");
        string[] List(string name) => ai.GetSection(name + ":Models").Get<string[]>() ?? [];
        // defaults checked against each vendor's model list; the page only offers what is configured here
        var all = new AiProvider[]
        {
            new ClaudeProvider(ai["Claude:ApiKey"] ?? "", ai["Claude:Model"] ?? "claude-sonnet-5-5", List("Claude"), http, ai["Claude:BaseUrl"], ai["Claude:Effort"]),
            new GeminiProvider(ai["Gemini:ApiKey"] ?? "", ai["Gemini:Model"] ?? "gemini-3.8-flash", List("Gemini"), http, ai["Gemini:BaseUrl"]),
            new OpenAiProvider(ai["OpenAi:ApiKey"] ?? "", ai["OpenAi:Model"] ?? "gpt-6-luna", List("OpenAi"), http, ai["OpenAi:BaseUrl"], ai["OpenAi:Effort"]),
        };
        _providers = all.Where(p => p.Configured).ToDictionary(p => p.Id);
    }

    /// <summary>AI is off unless a password is configured, so nothing can spend money without one.</summary>
    public bool Enabled => _passwordHash is not null && _providers.Count > 0;

    public IReadOnlyList<AiProviderInfo> Providers => Enabled
        ? [.. _providers.Values.Select(p => new AiProviderInfo(p.Id, p.Name, p.DefaultModel, p.Models))]
        : [];

    public void CheckPassword(string ip, string? password)
    {
        if (_passwordHash is null) throw new AiAuthException("ยังไม่ได้ตั้งรหัสผ่าน AI บนเซิร์ฟเวอร์", 503);
        var now = DateTime.UtcNow;
        if (_failures.TryGetValue(ip, out var f) && now - f.Since < LockWindow && f.Count >= MaxFailures)
            throw new AiAuthException("ใส่รหัสผ่านผิดหลายครั้ง ลองใหม่ภายหลัง 15 นาที", 429);

        var given = SHA256.HashData(Encoding.UTF8.GetBytes(password ?? ""));
        if (CryptographicOperations.FixedTimeEquals(given, _passwordHash))
        {
            _failures.TryRemove(ip, out _);
            return;
        }
        _failures.AddOrUpdate(ip, (1, now), (_, old) => now - old.Since < LockWindow ? (old.Count + 1, old.Since) : (1, now));
        throw new AiAuthException("รหัสผ่านไม่ถูกต้อง", 401);
    }

    public sealed record Outcome(string Provider, string Model, AiMatch[]? Matches, string? Error);

    public async Task<Outcome[]> AnalyzeAsync(AiPick[] picks, JsonElement matches, CancellationToken ct)
    {
        if (matches.ValueKind != JsonValueKind.Array || matches.GetArrayLength() is 0 or > MaxMatches)
            throw new ArgumentException($"ส่งได้ 1–{MaxMatches} คู่ต่อครั้ง");
        var payload = matches.GetRawText();
        if (Encoding.UTF8.GetByteCount(payload) > MaxPayloadBytes)
            throw new ArgumentException("ข้อมูลที่ส่งใหญ่เกินไป");

        var chosen = picks.GroupBy(p => p.Id).Select(g => g.First()).Take(3);
        return await Task.WhenAll(chosen.Select(p => RunOneAsync(p, payload, ct)));
    }

    private async Task<Outcome> RunOneAsync(AiPick pick, string payload, CancellationToken ct)
    {
        if (!_providers.TryGetValue(pick.Id, out var provider))
            return new Outcome(pick.Id, "", null, "แพลตฟอร์มนี้ยังไม่ได้ตั้งค่าคีย์บนเซิร์ฟเวอร์");
        var model = string.IsNullOrWhiteSpace(pick.Model) ? provider.DefaultModel : pick.Model;
        if (!provider.Models.Contains(model))
            return new Outcome(pick.Id, model, null, "โมเดลนี้ไม่อยู่ในรายการที่ตั้งค่าไว้");
        try
        {
            var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload)))[..24];
            var (res, _) = await _cache.GetOrAddAsync($"ai:{pick.Id}:{model}:{hash}", TimeSpan.FromMinutes(30), async () =>
            {
                if (!TrySpend(pick.Id)) return new UpstreamResult(429, JsonSerializer.Serialize(new { error = "ใช้ครบจำนวนครั้ง AI ต่อวันแล้ว" }));
                var text = await provider.CompleteAsync(System, "Shortlist (JSON):\n" + payload, model, ct);
                return new UpstreamResult(200, JsonSerializer.Serialize(Parse(text)));
            });
            if (res.Status != 200)
            {
                using var err = JsonDocument.Parse(res.Body);
                return new Outcome(pick.Id, model, null, err.RootElement.TryGetProperty("error", out var e) ? e.GetString() : "ผิดพลาด");
            }
            return new Outcome(pick.Id, model, JsonSerializer.Deserialize<AiMatch[]>(res.Body), null);
        }
        catch (AiProviderException ex) { return new Outcome(pick.Id, model, null, ex.Message); }
        catch (JsonException) { return new Outcome(pick.Id, model, null, "AI ตอบกลับในรูปแบบที่อ่านไม่ได้ (อาจถูกตัดเพราะยาวเกิน)"); }
        catch (HttpRequestException) { return new Outcome(pick.Id, model, null, "เชื่อมต่อ " + provider.Name + " ไม่สำเร็จ"); }
        catch (TaskCanceledException) { return new Outcome(pick.Id, model, null, provider.Name + " ใช้เวลานานเกินไป"); }
    }

    private bool TrySpend(string id)
    {
        var today = DateTime.UtcNow.Date;
        if (_usedDay != today) { lock (_used) { if (_usedDay != today) { _used.Clear(); _usedDay = today; } } }
        if (_used.Values.Sum() >= _dailyCalls) return false;
        _used.AddOrUpdate(id, 1, (_, n) => n + 1);
        return true;
    }

    private static AiMatch[] Parse(string text)
    {
        var s = text.Trim();
        if (s.StartsWith("```"))
        {
            s = s[(s.IndexOf('\n') + 1)..];
            var end = s.LastIndexOf("```", StringComparison.Ordinal);
            if (end >= 0) s = s[..end];
        }
        var start = s.IndexOf('{');
        var last = s.LastIndexOf('}');
        if (start < 0 || last <= start) throw new JsonException("no json");
        using var doc = JsonDocument.Parse(s[start..(last + 1)]);
        var list = new List<AiMatch>();
        foreach (var m in doc.RootElement.GetProperty("matches").EnumerateArray())
        {
            if (!m.TryGetProperty("id", out var id) || !id.TryGetInt32(out var idv)) continue;
            string? Str(string name, int max) => m.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String
                ? (v.GetString() is { } x && x.Length > max ? x[..max] : v.GetString()) : null;
            var risks = m.TryGetProperty("risks", out var r) && r.ValueKind == JsonValueKind.Array
                ? r.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.String).Select(x => x.GetString()!).Take(4).Select(x => x.Length > 160 ? x[..160] : x).ToArray()
                : [];
            list.Add(new AiMatch(idv, Str("verdict", 20), Str("summary", 700), risks));
        }
        return [.. list];
    }
}
