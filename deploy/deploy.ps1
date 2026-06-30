[CmdletBinding()]
param(
  [string]$Server = "154.217.241.238",
  [string]$User = "root",
  [string]$IdentityFile = "",
  [string]$RemoteRoot = "/var/www/pdftool.work",
  [string]$HealthUrl = "https://pdftool.work/",
  [switch]$SkipBuild,
  [switch]$SkipHealthCheck,
  [switch]$EmergencySkipTests
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseName = Get-Date -Format "yyyyMMddHHmmss"
$remoteRelease = "$RemoteRoot/releases/$releaseName"
$target = "$User@$Server"

Set-Location $projectRoot

foreach ($command in @("ssh", "scp", "npm")) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $command"
  }
}

if (-not $SkipBuild) {
  npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Production build failed." }
}

if ($EmergencySkipTests) {
  Write-Warning "EMERGENCY OVERRIDE: unit and browser release gates were skipped."
} else {
  npm run test:unit
  if ($LASTEXITCODE -ne 0) { throw "Unit tests failed; deployment blocked." }

  $oldSystemChrome = $env:PLAYWRIGHT_USE_SYSTEM_CHROME
  $env:PLAYWRIGHT_USE_SYSTEM_CHROME = "1"
  try {
    npm run test:browser
    if ($LASTEXITCODE -ne 0) { throw "Browser tests failed; deployment blocked." }
  } finally {
    if ($null -eq $oldSystemChrome) {
      Remove-Item Env:PLAYWRIGHT_USE_SYSTEM_CHROME -ErrorAction SilentlyContinue
    } else {
      $env:PLAYWRIGHT_USE_SYSTEM_CHROME = $oldSystemChrome
    }
  }
}

$deployFiles = @(
  "index.html",
  "upload-ready.html",
  "merge.html",
  "split.html",
  "manage.html",
  "compress.html",
  "about.html",
  "privacy.html",
  "sitemap.xml",
  "robots.txt",
  "ads.txt"
)

$requiredFiles = $deployFiles + @(
  "assets/css/tailwind.min.css",
  "assets/css/styles.css",
  "assets/js/upload-ready.js",
  "assets/js/upload-ready-worker.mjs",
  "assets/js/upload-ready-processing.mjs",
  "assets/js/pdf-preview.js",
  "assets/js/pdf-worker-entry.mjs",
  "assets/vendor/pdf-lib.min.js",
  "assets/vendor/pdf-lib.esm.min.js",
  "assets/vendor/pdfjs/pdf.mjs",
  "assets/vendor/pdfjs/pdf.worker.mjs",
  "assets/vendor/pdfjs/cmaps/Adobe-GB1-UCS2.bcmap",
  "assets/vendor/pdfjs/standard_fonts/LiberationSans-Regular.ttf",
  "assets/vendor/pdfjs/wasm/openjpeg.wasm",
  "assets/vendor/pdfjs/iccs/CGATS001Compat-v2-micro.icc"
)

foreach ($file in $requiredFiles) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
    throw "Missing release file: $file"
  }
}

foreach ($directory in @(
  "assets/vendor/pdfjs/cmaps",
  "assets/vendor/pdfjs/standard_fonts",
  "assets/vendor/pdfjs/wasm",
  "assets/vendor/pdfjs/iccs"
)) {
  if (-not (Test-Path -LiteralPath $directory -PathType Container) -or
      @(Get-ChildItem -LiteralPath $directory -File).Count -eq 0) {
    throw "Missing or empty release directory: $directory"
  }
}

if (Select-String -Path @("*.html", "ads.txt") -Pattern "XXXXXXXXXXXXXXXX" -Quiet) {
  Write-Warning "AdSense placeholder IDs are still active; ad containers remain hidden."
}

$sshArgs = @()
$scpArgs = @()
if ($IdentityFile) {
  $resolvedKey = (Resolve-Path -LiteralPath $IdentityFile).Path
  $sshArgs += @("-i", $resolvedKey)
  $scpArgs += @("-i", $resolvedKey)
}

$previousOutput = & ssh @sshArgs $target "readlink -f '$RemoteRoot/current' 2>/dev/null || true"
if ($LASTEXITCODE -ne 0) { throw "Unable to inspect the current remote release." }
$previousRelease = ($previousOutput -join "").Trim()

& ssh @sshArgs $target "mkdir -p '$remoteRelease'"
if ($LASTEXITCODE -ne 0) { throw "Unable to create the remote release directory." }

& scp @scpArgs @deployFiles "$($target):$remoteRelease/"
if ($LASTEXITCODE -ne 0) { throw "Page upload failed." }
& scp @scpArgs -r "assets" "$($target):$remoteRelease/"
if ($LASTEXITCODE -ne 0) { throw "Asset upload failed." }

$activateCommand = @"
set -eu
find '$remoteRelease' -type d -exec chmod 755 {} ;
find '$remoteRelease' -type f -exec chmod 644 {} ;
ln -sfn '$remoteRelease' '$RemoteRoot/current.next'
mv -Tf '$RemoteRoot/current.next' '$RemoteRoot/current'
nginx -t
systemctl reload nginx
"@

& ssh @sshArgs $target $activateCommand
if ($LASTEXITCODE -ne 0) {
  if ($previousRelease) {
    & ssh @sshArgs $target "ln -sfn '$previousRelease' '$RemoteRoot/current.next' && mv -Tf '$RemoteRoot/current.next' '$RemoteRoot/current' && nginx -t && systemctl reload nginx"
  }
  throw "Remote activation failed; rollback attempted."
}

Write-Host "Activated release: $releaseName" -ForegroundColor Green
Write-Host "Remote directory: $remoteRelease"

if ($SkipHealthCheck) {
  Write-Warning "EMERGENCY OVERRIDE: post-deploy smoke checks were skipped."
  exit 0
}

Start-Sleep -Seconds 2
$healthUri = [Uri]$HealthUrl
$origin = "$($healthUri.Scheme)://$($healthUri.Authority)"
$smokeChecks = @(
  @{ Path = "/"; Type = "text/html" },
  @{ Path = "/upload-ready.html"; Type = "text/html" },
  @{ Path = "/assets/js/upload-ready-worker.mjs"; Type = "javascript" },
  @{ Path = "/assets/js/pdf-preview.js"; Type = "javascript" },
  @{ Path = "/assets/vendor/pdfjs/pdf.mjs"; Type = "javascript" },
  @{ Path = "/assets/vendor/pdfjs/pdf.worker.mjs"; Type = "javascript" },
  @{ Path = "/assets/vendor/pdfjs/cmaps/Adobe-GB1-UCS2.bcmap"; Type = "octet-stream" },
  @{ Path = "/assets/vendor/pdfjs/standard_fonts/LiberationSans-Regular.ttf"; Type = "font" },
  @{ Path = "/assets/vendor/pdfjs/wasm/openjpeg.wasm"; Type = "application/wasm" }
)
$smokeFailures = [System.Collections.Generic.List[string]]::new()

foreach ($check in $smokeChecks) {
  $url = "$origin$($check.Path)"
  try {
    $response = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 25 -UseBasicParsing
    $contentType = [string]$response.Headers["Content-Type"]
    if ($response.StatusCode -ne 200 -or $contentType -notmatch $check.Type) {
      $smokeFailures.Add("$url -> HTTP $($response.StatusCode), $contentType")
    } else {
      Write-Host "Smoke OK: $url [$contentType]" -ForegroundColor Green
    }
  } catch {
    $smokeFailures.Add("$url -> $($_.Exception.Message)")
  }
}

if ($smokeFailures.Count -gt 0) {
  Write-Warning ($smokeFailures -join [Environment]::NewLine)
  if ($previousRelease) {
    $rollbackCommand = "set -eu; ln -sfn '$previousRelease' '$RemoteRoot/current.next'; mv -Tf '$RemoteRoot/current.next' '$RemoteRoot/current'; nginx -t; systemctl reload nginx"
    & ssh @sshArgs $target $rollbackCommand
    if ($LASTEXITCODE -ne 0) { throw "Smoke failed and automatic rollback also failed." }
    Write-Warning "Smoke failed; restored $previousRelease."
  }
  throw "Post-deploy smoke checks failed."
}

Write-Host "Release smoke checks passed." -ForegroundColor Green