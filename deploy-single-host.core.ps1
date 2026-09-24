<#
    Static-site deployment core for the D2D portfolio.
    Uses the shared FTP uploader from the sibling P2S repository.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Server,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Username,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Password,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$RemotePath,

    [string]$DbConnStr = "",
    [string]$JwtSigningKey = "",
    [string]$CorsOrigin = ""
)

$ErrorActionPreference = "Stop"

$targetHost = $RemotePath.Trim('/').ToLowerInvariant()
if ($targetHost -ne "drivetodev.online") {
    throw "D2D deployment is restricted to the drivetodev.online apex domain."
}

$siteFile = Join-Path $PSScriptRoot "index.html"
if (-not (Test-Path -LiteralPath $siteFile -PathType Leaf)) {
    throw "Static site entry file is missing: $siteFile"
}

$gitRoot = Split-Path -Parent $PSScriptRoot
$uploaderPath = Join-Path $gitRoot "P2S\upload-ftp.ps1"
if (-not (Test-Path -LiteralPath $uploaderPath -PathType Leaf)) {
    throw "Shared FTP uploader is missing: $uploaderPath"
}

$manifestPath = Join-Path $PSScriptRoot ".deploy-cache\site-manifest.json"
$stagingParent = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$stagingPath = [System.IO.Path]::GetFullPath(
    (Join-Path $stagingParent ("drivetodev-site-" + [guid]::NewGuid().ToString("N")))
)
if (-not $stagingPath.StartsWith($stagingParent, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to stage deployment outside the system temporary directory."
}

$dryRun = $env:D2D_DEPLOY_DRY_RUN -eq "1"
$healthFile = Join-Path $stagingPath "health-check.html"

try {
    New-Item -ItemType Directory -Path $stagingPath -ErrorAction Stop | Out-Null
    Copy-Item -LiteralPath $siteFile -Destination (Join-Path $stagingPath "index.html") -ErrorAction Stop

    Write-Host "Target: https://$targetHost/"
    Write-Host "FTP directory: $targetHost"
    Write-Host "Files: index.html"
    if ($dryRun) {
        Write-Host "Dry run enabled through D2D_DEPLOY_DRY_RUN=1."
    }

    $uploadParameters = @{
        Server       = $Server
        Username     = $Username
        Password     = $Password
        LocalPath    = $stagingPath
        RemotePath   = $targetHost
        ManifestPath = $manifestPath
    }
    if ($dryRun) {
        $uploadParameters.DryRun = $true
    }

    & $uploaderPath @uploadParameters

    if ($dryRun) {
        Write-Host "Dry run complete. No remote files were changed."
        return
    }

    $curl = Get-Command "curl.exe" -ErrorAction Stop
    $healthUrl = "https://$targetHost/?deploy-check=$([guid]::NewGuid().ToString('N'))"
    $httpStatus = & $curl.Source -sS --max-time 30 -o $healthFile -w "%{http_code}" $healthUrl
    if ($LASTEXITCODE -ne 0) {
        throw "Upload finished, but the public health check could not reach https://$targetHost/."
    }
    if ([string]$httpStatus -ne "200") {
        throw "Upload finished, but the public health check returned HTTP $httpStatus."
    }

    $responseHtml = [System.IO.File]::ReadAllText($healthFile)
    if ($responseHtml -notmatch "<title>\s*drivetodev") {
        throw "Upload finished, but https://$targetHost/ did not return the D2D page title."
    }

    Write-Host "Deployment verified: https://$targetHost/ returned HTTP 200 with the D2D page title."
}
finally {
    if (Test-Path -LiteralPath $healthFile -PathType Leaf) {
        Remove-Item -LiteralPath $healthFile -Force
    }
    $stagedIndex = Join-Path $stagingPath "index.html"
    if (Test-Path -LiteralPath $stagedIndex -PathType Leaf) {
        Remove-Item -LiteralPath $stagedIndex -Force
    }
    if (Test-Path -LiteralPath $stagingPath -PathType Container) {
        Remove-Item -LiteralPath $stagingPath -Force
    }
}
