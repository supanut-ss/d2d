<#
    Deploys the Matchdesk proxy (ASP.NET Core, out-of-process) to the IIS application https://drivetodev.online/matchdesk
    (FTP folder drivetodev.online/matchdesk). Same pattern as BookSabuy: publish, app_offline, upload, online, health checks.
    The remote folder must already exist and be an IIS application (Plesk).

    Secrets: appsettings.Production.json (git-ignored) holds the API-Football keys; it is uploaded inside the app package
    and removed from the local staging folder afterwards.
    Dry run (connects read-only, changes nothing remote): $env:MATCHDESK_DEPLOY_DRY_RUN = "1"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [ValidateNotNullOrEmpty()] [string]$Server,
    [Parameter(Mandatory = $true)] [ValidateNotNullOrEmpty()] [string]$Username,
    [Parameter(Mandatory = $true)] [ValidateNotNullOrEmpty()] [string]$Password,

    # FTP path relative to the FTP login root. Pinned below on purpose.
    [string]$RemotePath = "drivetodev.online/matchdesk",
    [string]$PublicBaseUrl = "https://drivetodev.online/matchdesk",
    [string]$ConfigPath = "",

    [string]$Runtime = "win-x86",     # the shared app pool is 32-bit
    [switch]$FrameworkDependent,
    [switch]$StdoutLog,               # ANCM stdout logs in logs\ on the server (first deploy / debugging)

    [ValidateRange(0, 600)] [int]$OfflineDrainSeconds = 20,
    [ValidateRange(1, 100)] [int]$HealthCheckAttempts = 12,
    [ValidateRange(1, 300)] [int]$HealthCheckDelaySeconds = 5
)

$ErrorActionPreference = "Stop"
$appRoot = $PSScriptRoot
if (-not $ConfigPath) { $ConfigPath = Join-Path $appRoot "appsettings.Production.json" }
$dryRun = $env:MATCHDESK_DEPLOY_DRY_RUN -eq "1"

# ---- 0. Guard rails -----------------------------------------------------------------------------------------
# The FTP login root holds every site of the subscription; refuse any target other than this one.
$target = $RemotePath.Trim('/').ToLowerInvariant()
if ($target -ne "drivetodev.online/matchdesk") {
    throw "Refusing to deploy: RemotePath must be 'drivetodev.online/matchdesk' (got '$RemotePath')."
}
$PublicBaseUrl = $PublicBaseUrl.TrimEnd('/')
if ($PublicBaseUrl -ne "https://drivetodev.online/matchdesk") {
    throw "Refusing to deploy: PublicBaseUrl must be 'https://drivetodev.online/matchdesk' (got '$PublicBaseUrl')."
}

$pwsh = if (Get-Command powershell -ErrorAction SilentlyContinue) { "powershell" } else { "pwsh" }
$uploader = Join-Path (Split-Path -Parent (Split-Path -Parent $appRoot)) "P2S\upload-ftp.ps1"
if (-not (Test-Path -LiteralPath $uploader -PathType Leaf)) { throw "Shared FTP uploader is missing: $uploader" }
$dryArgs = @(); if ($dryRun) { $dryArgs = @("-DryRun") }

# The remote folder must exist (and be an IIS application) before anything is built or taken offline.
function Assert-RemoteFolder([string]$Path) {
    $parts = $Path.Trim('/').Split('/')
    $leaf = $parts[$parts.Count - 1]
    $parent = if ($parts.Count -gt 1) { ($parts[0..($parts.Count - 2)] -join '/') } else { "" }
    $uri = if ($parent) { "ftp://$Server/$parent/" } else { "ftp://$Server/" }
    try {
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
        $req.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
        $req.UsePassive = $true
        $resp = $req.GetResponse()
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $names = $reader.ReadToEnd() -split "`r?`n" | ForEach-Object { ($_.Trim().Replace('\', '/').TrimEnd('/') -split '/')[-1] }
        $reader.Close(); $resp.Close()
    }
    catch { throw "Cannot list $uri : $($_.Exception.Message)" }
    if ($names -notcontains $leaf) {
        throw "Remote folder '$Path' does not exist. Create it first in Plesk and make it an IIS application."
    }
}

function Test-Url([string]$Url) {
    try { return [int](Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 30).StatusCode }
    catch { if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode } else { return 0 } }
}

# ---- production config ----------------------------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
    throw "Production config not found: $ConfigPath (copy appsettings.Production.example.json and fill in the API keys)."
}
$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$keys = @()
if ($config.PSObject.Properties.Name -contains "Matchdesk" -and $config.Matchdesk.PSObject.Properties.Name -contains "ApiKeys") {
    $keys = @($config.Matchdesk.ApiKeys | Where-Object { -not [string]::IsNullOrWhiteSpace($_) -and $_ -notmatch "^KEY_\d$|CHANGE_ME|PASTE_" })
}
if ($keys.Count -eq 0) { throw "No real API key found in $ConfigPath (Matchdesk.ApiKeys)." }
Write-Host "Config OK: $($keys.Count) API key(s)."

Assert-RemoteFolder $target

# ---- 1. Publish -------------------------------------------------------------------------------------------------
$stage = Join-Path $appRoot "deploy"
$appDir = Join-Path $stage "app"
$offlineDir = Join-Path $stage "offline"
foreach ($d in @($appDir, $offlineDir)) {
    if (Test-Path -LiteralPath $d) { Remove-Item -LiteralPath $d -Recurse -Force }
    New-Item -ItemType Directory -Path $d | Out-Null
}

$mode = if ($FrameworkDependent) { "framework-dependent" } else { "$Runtime self-contained" }
Write-Host "1. Publishing ($mode)..." -ForegroundColor Yellow
$publishArgs = @("publish", "$appRoot\Matchdesk.Proxy.csproj", "-c", "Release", "-o", $appDir, "--nologo", "-v", "q")
if (-not $FrameworkDependent) { $publishArgs += @("-r", $Runtime, "--self-contained", "true") }
& dotnet @publishArgs
if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed." }

$webConfigPath = Join-Path $appDir "web.config"
if (-not (Test-Path -LiteralPath $webConfigPath)) { throw "web.config missing from the publish output." }
[xml]$webConfig = Get-Content -LiteralPath $webConfigPath
$aspNetCore = $webConfig.SelectSingleNode("//aspNetCore")
if (-not $aspNetCore) { throw "aspNetCore element not found in web.config." }
$aspNetCore.SetAttribute("hostingModel", "outofprocess")
$aspNetCore.SetAttribute("stdoutLogEnabled", $(if ($StdoutLog) { "true" } else { "false" }))
# Plesk replaces 4xx/5xx responses with its own HTML pages; the page reads the JSON error bodies, so let them through.
$webServer = $webConfig.SelectSingleNode("//system.webServer")
$httpErrors = $webServer.SelectSingleNode("httpErrors")
if (-not $httpErrors) { $httpErrors = $webConfig.CreateElement("httpErrors"); [void]$webServer.AppendChild($httpErrors) }
$httpErrors.SetAttribute("existingResponse", "PassThrough")
$webConfig.Save($webConfigPath)

New-Item -ItemType Directory -Path (Join-Path $appDir "logs") -Force | Out-Null
Set-Content -LiteralPath (Join-Path $appDir "logs\README.txt") -Value "ANCM stdout logs are written here when stdoutLogEnabled=true."

# ---- 2. Stage production config (removed again in 'finally') ---------------------------------------------------
Copy-Item -LiteralPath $ConfigPath -Destination (Join-Path $appDir "appsettings.Production.json") -Force

# ---- 3. Maintenance page --------------------------------------------------------------------------------------------
$offlinePath = Join-Path $offlineDir "app_offline.htm"
Set-Content -LiteralPath $offlinePath -Encoding UTF8 -Value "<!doctype html><html><head><meta charset=`"utf-8`"><title>Matchdesk</title></head><body style=`"font-family:sans-serif;text-align:center;padding:60px`"><h1>Matchdesk is being updated</h1><p>Back in a minute.</p></body></html>"

$manifestPath = Join-Path $appRoot ".deploy-cache\matchdesk-manifest.json"
function Send-Offline {
    & $pwsh -NoProfile -ExecutionPolicy Bypass -File $uploader -Server $Server -Username $Username -Password $Password `
        -LocalPath $offlineDir -RemotePath $target @dryArgs
}

$deployed = $false
try {
    Write-Host "3. Taking the app offline..." -ForegroundColor Yellow
    Send-Offline
    if ($LASTEXITCODE -ne 0) { throw "Taking the application offline failed (exit code $LASTEXITCODE)." }
    if (-not $dryRun) { Write-Host "Waiting $OfflineDrainSeconds s for IIS to release files..."; Start-Sleep -Seconds $OfflineDrainSeconds }

    Write-Host "4. Uploading application files to ftp://$Server/$target ..." -ForegroundColor Yellow
    & $pwsh -NoProfile -ExecutionPolicy Bypass -File $uploader -Server $Server -Username $Username -Password $Password `
        -LocalPath $appDir -RemotePath $target -ManifestPath $manifestPath -PruneRemoteRootFiles @dryArgs
    if ($LASTEXITCODE -ne 0) { throw "Uploading application files failed (exit code $LASTEXITCODE). The app stays in maintenance mode; fix and rerun." }

    if ($dryRun) { Write-Host "Dry run complete. No remote files were changed." -ForegroundColor Cyan; return }

    Write-Host "5. Bringing the app back online..." -ForegroundColor Yellow
    $del = [System.Net.FtpWebRequest]::Create("ftp://$Server/$target/app_offline.htm")
    $del.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
    $del.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
    $del.UsePassive = $true
    $del.GetResponse().Close()

    # ---- 6. Health checks ---------------------------------------------------------------------------------------------
    $ok = $false; $last = "no response"
    for ($i = 1; $i -le $HealthCheckAttempts; $i++) {
        try {
            $r = Invoke-WebRequest -Uri "$PublicBaseUrl/api/status" -UseBasicParsing -TimeoutSec 30
            $last = "HTTP $([int]$r.StatusCode)"
            if ([int]$r.StatusCode -eq 200 -and $r.Content -match '"keysTotal"') { $ok = $true; break }
        }
        catch { $last = if ($_.Exception.Response) { "HTTP $([int]$_.Exception.Response.StatusCode)" } else { $_.Exception.Message } }
        if ($i -lt $HealthCheckAttempts) { Write-Host "Health check not ready ($last), attempt $i/$HealthCheckAttempts..." -ForegroundColor Gray; Start-Sleep -Seconds $HealthCheckDelaySeconds }
    }
    if (-not $ok) {
        Write-Warning "Health check failed ($last). Restoring maintenance mode."
        Send-Offline
        throw "$PublicBaseUrl/api/status did not report the key pool after $HealthCheckAttempts attempts (last: $last). With -StdoutLog the reason is in $target/logs/ on the server."
    }

    $problems = @()
    $status = (Invoke-WebRequest -Uri "$PublicBaseUrl/api/status" -UseBasicParsing -TimeoutSec 30).Content | ConvertFrom-Json
    if ([int]$status.keysTotal -lt 1) { $problems += "the server loaded no API keys (check appsettings.Production.json)" }
    $page = Invoke-WebRequest -Uri "$PublicBaseUrl/" -UseBasicParsing -TimeoutSec 30
    if ([int]$page.StatusCode -ne 200 -or $page.Content -notmatch "Matchdesk") { $problems += "the page at $PublicBaseUrl/ did not return the Matchdesk app" }
    $code = Test-Url "$PublicBaseUrl/api/football/leagues"
    if ($code -ne 404) { $problems += "a non-allowed upstream endpoint returned HTTP $code instead of 404" }
    if ($problems.Count -gt 0) {
        Write-Warning ("Post-deploy checks reported problems:`n - " + ($problems -join "`n - "))
        throw "Deployment is up but not healthy. Fix the items above."
    }

    $deployed = $true
    Write-Host "Deployment verified: $PublicBaseUrl ($($status.keysTotal) key(s) loaded, page served, endpoint allow-list enforced)." -ForegroundColor Green
}
catch {
    Write-Host "Deployment stopped: $($_.Exception.Message)" -ForegroundColor Red
    throw
}
finally {
    # never leave secrets or the offline page lying around in the local staging folder
    Remove-Item -LiteralPath (Join-Path $appDir "appsettings.Production.json") -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $offlinePath -Force -ErrorAction SilentlyContinue
    Set-Location $appRoot
}
if ($deployed) { Write-Host "--- Deployment complete: $PublicBaseUrl/ ---" -ForegroundColor Cyan }
