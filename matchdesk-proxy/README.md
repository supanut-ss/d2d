# Matchdesk proxy

ASP.NET Core app that serves the Matchdesk page and proxies API-Football so the API keys never reach the browser.

- `GET /` serves `wwwroot/index.html`
- `GET /api/football/{fixtures|fixtures/headtohead|predictions|odds|teams/statistics}` forwards to API-Football
- Keys come from `Matchdesk:ApiKeys` (copy `appsettings.Production.example.json` to `appsettings.Production.json`, which is git-ignored)
- Each key is used one request at a time (6.5 s apart); a key that hits its daily quota or is rejected is parked until 00:00 UTC and the next key is used
- Responses are cached in memory (odds 30 min, predictions 6 h, team stats 12 h, head-to-head 24 h, fixtures 10 min) and shared by all visitors
- Per-IP limit: 240 requests/minute (`Matchdesk:RequestsPerMinutePerIp`)

## AI analysis (optional)

`POST /api/ai/analyze` sends the shortlisted matches (numbers only, up to 20) to one or more platforms and returns a Thai verdict, summary and risks per match. Platforms with no key are hidden in the page.

- Password: `Matchdesk:Ai:Password` is required (AI stays off without it). The page asks for it on every send and never stores it; 5 wrong attempts lock that IP for 15 minutes
- Up to 20 matches per send
- Keys and models: `Matchdesk:Ai:Claude|Gemini|OpenAi:ApiKey|Model|Models` (Codex is OpenAI's Responses API). `Model` is the recommended default, `Models` is the list the page offers; model names are config, not code. `BaseUrl` can point at a proxy
- Only Gemini (`gemini-3.6-flash`) is on for now. Switch a platform with `Matchdesk:Ai:<Claude|Gemini|OpenAi>:Enabled` = `true`/`false` (its key can stay in the config). Defaults (checked against the vendors' model lists, July 2026): Claude `claude-sonnet-5-5` fixed at effort `low` (`Matchdesk:Ai:Claude:Effort`), Gemini `gemini-3.6-flash` (`gemini-3.8-flash` was overloaded in testing), OpenAI `gpt-6-luna` fixed at reasoning effort `max` (`Matchdesk:Ai:OpenAi:Effort`)
- Limits: `Matchdesk:Ai:DailyCalls` (default 100, all platforms together) and `RequestsPerHourPerIp` (default 10); identical requests are cached for 30 minutes

## Run locally

    dotnet run --urls http://localhost:5080

## Publish to drivetodev.online/matchdesk

    dotnet publish -c Release -o publish

Upload the contents of `publish/` to an IIS application at `/matchdesk` (ASP.NET Core hosting bundle, .NET 8 runtime). `publish/` includes `appsettings.Production.json` with the real keys, so do not commit or share it.
