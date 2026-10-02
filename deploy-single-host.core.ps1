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

$conceptFile = Join-Path $PSScriptRoot "pimsaduak.html"
if (-not (Test-Path -LiteralPath $conceptFile -PathType Leaf)) {
    throw "PimSaduak concept page is missing: $conceptFile"
}

$gitRoot = Split-Path -Parent $PSScriptRoot
$uploaderPath = Join-Path $gitRoot "P2S\upload-ftp.ps1"
if (-not (Test-Path -LiteralPath $uploaderPath -PathType Leaf)) {
    throw "Shared FTP uploader is missing: $uploaderPath"
}

$npm = Get-Command "npm.cmd" -ErrorAction Stop
Write-Host "Building the React site..."
& $npm.Source run build
if ($LASTEXITCODE -ne 0) {
    throw "React site build failed with exit code $LASTEXITCODE."
}

$distPath = Join-Path $PSScriptRoot "dist"
if (-not (Test-Path -LiteralPath (Join-Path $distPath "index.html") -PathType Leaf)) {
    throw "React build output is missing index.html: $distPath"
}
if (-not (Test-Path -LiteralPath (Join-Path $distPath "pimsaduak.html") -PathType Leaf)) {
    throw "React build output is missing pimsaduak.html: $distPath"
}

$stagingParent = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$stagingPath = [System.IO.Path]::GetFullPath(
    (Join-Path $stagingParent ("drivetodev-site-" + [guid]::NewGuid().ToString("N")))
)
if (-not $stagingPath.StartsWith($stagingParent, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to stage deployment outside the system temporary directory."
}

$dryRun = $env:D2D_DEPLOY_DRY_RUN -eq "1"
$healthFile = Join-Path $stagingPath "health-check.html"
$conceptHealthFile = Join-Path $stagingPath "concept-health-check.html"

try {
    New-Item -ItemType Directory -Path $stagingPath -ErrorAction Stop | Out-Null
    $distRoot = [System.IO.Path]::GetFullPath($distPath).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    )
    $distPrefix = $distRoot + [System.IO.Path]::DirectorySeparatorChar
    $distFiles = @(Get-ChildItem -LiteralPath $distRoot -File -Recurse -ErrorAction Stop)
    if ($distFiles.Count -eq 0) {
        throw "React build output is empty: $distRoot"
    }

    foreach ($file in $distFiles) {
        $relativePath = $file.FullName.Substring($distPrefix.Length)
        $destination = Join-Path $stagingPath $relativePath
        $destinationDirectory = Split-Path -Parent $destination
        if (-not (Test-Path -LiteralPath $destinationDirectory -PathType Container)) {
            New-Item -ItemType Directory -Path $destinationDirectory -Force -ErrorAction Stop | Out-Null
        }
        Copy-Item -LiteralPath $file.FullName -Destination $destination -ErrorAction Stop
    }

    Write-Host "Target: https://$targetHost/"
    Write-Host "FTP directory: $targetHost"
    Write-Host "Files: $($distFiles.Count) built site files including both HTML pages and assets."
    if ($dryRun) {
        Write-Host "Dry run enabled through D2D_DEPLOY_DRY_RUN=1."
    }

    $uploadParameters = @{
        Server       = $Server
        Username     = $Username
        Password     = $Password
        LocalPath    = $stagingPath
        RemotePath   = $targetHost
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

    $conceptHealthUrl = "https://$targetHost/pimsaduak.html?deploy-check=$([guid]::NewGuid().ToString('N'))"
    $conceptHttpStatus = & $curl.Source -sS --max-time 30 -o $conceptHealthFile -w "%{http_code}" $conceptHealthUrl
    if ($LASTEXITCODE -ne 0) {
        throw "Upload finished, but the public concept-page health check could not reach https://$targetHost/pimsaduak.html."
    }
    if ([string]$conceptHttpStatus -ne "200") {
        throw "Upload finished, but the public concept-page health check returned HTTP $conceptHttpStatus."
    }

    $conceptResponseHtml = [System.IO.File]::ReadAllText($conceptHealthFile)
    if ($conceptResponseHtml -notmatch 'src="/assets/concept-[^"]+\.js"') {
        throw "Upload finished, but https://$targetHost/pimsaduak.html did not return the built concept page."
    }

    Write-Host "Deployment verified: https://$targetHost/ and /pimsaduak.html returned HTTP 200."
}
finally {
    if (Test-Path -LiteralPath $stagingPath -PathType Container) {
        Remove-Item -LiteralPath $stagingPath -Recurse -Force
    }
}
