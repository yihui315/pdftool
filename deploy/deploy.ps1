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
$manifestPath = "dist/release-manifest.json"

Set-Location $projectRoot

foreach ($command in @("ssh", "scp", "npm", "node", "git", "tar")) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $command"
  }
}

$workingTree = (& git status --porcelain --untracked-files=normal) -join "`n"
if ($LASTEXITCODE -ne 0) { throw "Unable to inspect the Git working tree." }
if ($workingTree) { throw "Working tree must be clean before deployment." }

if (-not $SkipBuild) {
  npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Production build failed." }
}

npm run verify:release
if ($LASTEXITCODE -ne 0) { throw "Release artifact verification failed." }

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

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw "Missing $manifestPath"
}
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$expectedCommit = [string]$manifest.gitCommit
$headCommit = ((& git rev-parse HEAD) -join "").Trim()
if ($LASTEXITCODE -ne 0) { throw "Unable to read HEAD commit." }
if (-not $expectedCommit -or $expectedCommit -ne $headCommit) {
  throw "Manifest commit $expectedCommit does not match HEAD $headCommit."
}
if (-not $manifest.files -or -not $manifest.fileDetails) {
  throw "$manifestPath is missing files or fileDetails."
}

$expectedFileCount = @($manifest.files).Count + 1
$tempRoot = [IO.Path]::GetTempPath()
$archivePath = Join-Path $tempRoot "pdftool-$releaseName.tar"
$checksumPath = Join-Path $tempRoot "pdftool-$releaseName.sha256"
$checksumLines = @($manifest.fileDetails | ForEach-Object { "$($_.sha256)  $($_.path)" })
[IO.File]::WriteAllLines($checksumPath, $checksumLines, [Text.UTF8Encoding]::new($false))

tar -C "dist" -cf $archivePath "."
if ($LASTEXITCODE -ne 0) { throw "Unable to archive the verified dist artifact." }

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

function Restore-PreviousRelease {
  if (-not $previousRelease) { return }
  & ssh @sshArgs $target "set -eu; ln -sfn '$previousRelease' '$RemoteRoot/current.next'; mv -Tf '$RemoteRoot/current.next' '$RemoteRoot/current'; nginx -t; systemctl reload nginx"
  if ($LASTEXITCODE -ne 0) { throw "Automatic rollback failed." }
  Write-Warning "Restored $previousRelease."
}

try {
  & ssh @sshArgs $target "mkdir -p '$remoteRelease' && chmod 755 '$remoteRelease'"
  if ($LASTEXITCODE -ne 0) { throw "Unable to create the remote release directory." }

  & scp @scpArgs $archivePath "$($target):$remoteRelease/release.tar"
  if ($LASTEXITCODE -ne 0) { throw "Release archive upload failed." }
  & scp @scpArgs $checksumPath "$($target):$remoteRelease/release.sha256"
  if ($LASTEXITCODE -ne 0) { throw "Release checksum upload failed." }

  & ssh @sshArgs $target "set -eu; cd '$remoteRelease'; tar xf release.tar; rm release.tar"
  if ($LASTEXITCODE -ne 0) { throw "Remote release extraction failed." }

  $remoteCountOutput = & ssh @sshArgs $target "find '$remoteRelease' -type f ! -name 'release.sha256' | wc -l"
  if ($LASTEXITCODE -ne 0) { throw "Unable to count remote release files." }
  $remoteFileCount = [int](($remoteCountOutput -join "").Trim())
  if ($remoteFileCount -ne $expectedFileCount) {
    throw "Remote artifact count mismatch: expected $expectedFileCount, found $remoteFileCount."
  }

  & ssh @sshArgs $target "set -eu; cd '$remoteRelease'; sha256sum -c release.sha256; rm release.sha256; printf '%s\n' '$expectedCommit' > .release-commit"
  if ($LASTEXITCODE -ne 0) { throw "Remote manifest hash verification failed." }

  $remoteCommit = ((& ssh @sshArgs $target "cat '$remoteRelease/.release-commit'") -join "").Trim()
  if ($LASTEXITCODE -ne 0 -or $remoteCommit -ne $expectedCommit) {
    throw "Remote release commit marker mismatch."
  }

  $activateCommand = @"
set -eu
find '$remoteRelease' -type d -exec chmod 755 {} \;
find '$remoteRelease' -type f -exec chmod 644 {} \;
nginx -t
ln -sfn '$remoteRelease' '$RemoteRoot/current.next'
mv -Tf '$RemoteRoot/current.next' '$RemoteRoot/current'
systemctl reload nginx
"@

  & ssh @sshArgs $target $activateCommand
  if ($LASTEXITCODE -ne 0) {
    Restore-PreviousRelease
    throw "Remote activation failed; rollback attempted."
  }
} finally {
  Remove-Item -LiteralPath $archivePath, $checksumPath -Force -ErrorAction SilentlyContinue
}

Write-Host "Activated release: $releaseName" -ForegroundColor Green
Write-Host "Remote directory: $remoteRelease"
Write-Host "Commit: $expectedCommit"

if ($SkipHealthCheck) {
  Write-Warning "EMERGENCY OVERRIDE: post-deploy smoke checks were skipped."
  exit 0
}

Start-Sleep -Seconds 2
$healthUri = [Uri]$HealthUrl
$origin = "$($healthUri.Scheme)://$($healthUri.Authority)"
$smokeChecks = @(
  @{ Path = "/"; Type = "text/html" },
  @{ Path = "/en/"; Type = "text/html" },
  @{ Path = "/es/"; Type = "text/html" },
  @{ Path = "/pt-br/"; Type = "text/html" },
  @{ Path = "/ja/"; Type = "text/html" },
  @{ Path = "/id/"; Type = "text/html" },
  @{ Path = "/upload-ready.html"; Type = "text/html" },
  @{ Path = "/en/compress-pdf.html"; Type = "text/html" },
  @{ Path = "/es/compress-pdf.html"; Type = "text/html" },
  @{ Path = "/pt-br/compress-pdf.html"; Type = "text/html" },
  @{ Path = "/ja/compress-pdf.html"; Type = "text/html" },
  @{ Path = "/id/compress-pdf.html"; Type = "text/html" },
  @{ Path = "/sitemap.xml"; Type = "xml" },
  @{ Path = "/robots.txt"; Type = "text/plain" },
  @{ Path = "/ads.txt"; Type = "text/plain" },
  @{ Path = "/assets/js/i18n.js"; Type = "javascript" },
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

$activeCommit = ((& ssh @sshArgs $target "cat '$RemoteRoot/current/.release-commit' 2>/dev/null || true") -join "").Trim()
if ($LASTEXITCODE -ne 0 -or $activeCommit -ne $expectedCommit) {
  $smokeFailures.Add("Active release commit marker does not match $expectedCommit")
}

if ($smokeFailures.Count -gt 0) {
  Write-Warning ($smokeFailures -join [Environment]::NewLine)
  Restore-PreviousRelease
  throw "Post-deploy smoke checks failed."
}

Write-Host "Release smoke checks passed." -ForegroundColor Green
