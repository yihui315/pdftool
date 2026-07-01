[CmdletBinding()]
param(
  [string]$Domain = "pdftool.work",
  [string]$Server = "154.217.241.238",
  [switch]$SkipWww
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$results = [System.Collections.Generic.List[object]]::new()

function Add-Result {
  param([string]$Check, [bool]$Passed, [string]$Details, [bool]$Required = $true)
  $script:results.Add([pscustomobject]@{
    Check = $Check
    Passed = $Passed
    Required = $Required
    Details = $Details
  })
}

function Test-TcpPort {
  param([string]$HostName, [int]$Port, [int]$TimeoutMs = 3000)
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $task = $client.ConnectAsync($HostName, $Port)
    return $task.Wait($TimeoutMs) -and $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

Set-Location $projectRoot

$requiredFiles = @(
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
  "ads.txt",
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
  "assets/vendor/pdfjs/iccs/CGATS001Compat-v2-micro.icc",
  "deploy/nginx/pdftool.work"
)
$missingFiles = @($requiredFiles | Where-Object { -not (Test-Path -LiteralPath $_ -PathType Leaf) })
Add-Result "Local release files" ($missingFiles.Count -eq 0) $(if ($missingFiles.Count) { "Missing: $($missingFiles -join ', ')" } else { "$($requiredFiles.Count) required files found" })

$requiredDirectories = @(
  "assets/vendor/pdfjs/cmaps",
  "assets/vendor/pdfjs/standard_fonts",
  "assets/vendor/pdfjs/wasm",
  "assets/vendor/pdfjs/iccs"
)
$emptyDirectories = @($requiredDirectories | Where-Object {
  -not (Test-Path -LiteralPath $_ -PathType Container) -or @(Get-ChildItem -LiteralPath $_ -File).Count -eq 0
})
Add-Result "PDF.js support assets" ($emptyDirectories.Count -eq 0) $(if ($emptyDirectories.Count) { "Missing or empty: $($emptyDirectories -join ', ')" } else { "CMaps, fonts, WASM and ICC assets found" })

$nginxText = Get-Content -LiteralPath "deploy/nginx/pdftool.work" -Raw
foreach ($extension in @("mjs", "wasm", "bcmap", "ttf", "icc")) {
  Add-Result "Nginx MIME: .$extension" ($nginxText -match "\.$extension") "Explicit production MIME/cache location"
}

$sitemapText = Get-Content -LiteralPath "sitemap.xml" -Raw
Add-Result "Sitemap assistant route" ($sitemapText -match "upload-ready\.html") "upload-ready.html is discoverable"

$domains = @($Domain)
if (-not $SkipWww) { $domains += "www.$Domain" }
foreach ($name in $domains) {
  try {
    $addresses = @(Resolve-DnsName $name -Type A -ErrorAction Stop | Where-Object Type -eq "A" | Select-Object -ExpandProperty IPAddress -Unique)
    Add-Result "DNS A: $name" ($addresses -contains $Server) $(if ($addresses.Count) { $addresses -join ", " } else { "No A record" })
  } catch {
    Add-Result "DNS A: $name" $false "No resolvable A record"
  }
}

foreach ($port in 22, 80, 443) {
  $isOpen = Test-TcpPort -HostName $Server -Port $port
  Add-Result "TCP $port" $isOpen $(if ($isOpen) { "Open" } else { "Closed or filtered" })
}

$httpClient = [System.Net.Http.HttpClient]::new()
$httpClient.Timeout = [TimeSpan]::FromSeconds(8)
$request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Head, "http://$Server/upload-ready.html")
$request.Headers.Host = $Domain
try {
  $response = $httpClient.SendAsync($request).GetAwaiter().GetResult()
  $status = "HTTP $([int]$response.StatusCode) $($response.ReasonPhrase)"
  $routeReady = [int]$response.StatusCode -eq 200
  Add-Result "Nginx assistant host route" $routeReady $status $false
} catch {
  Add-Result "Nginx assistant host route" $false "No HTTP response for Host: $Domain" $false
} finally {
  $request.Dispose()
  $httpClient.Dispose()
}

$results | Format-Table Check, Passed, Required, Details -AutoSize
$requiredFailures = @($results | Where-Object { $_.Required -and -not $_.Passed })
if ($requiredFailures.Count) {
  Write-Host "PREFLIGHT_BLOCKED: $($requiredFailures.Count) required check(s) failed." -ForegroundColor Red
  exit 1
}
Write-Host "PREFLIGHT_OK: required checks passed." -ForegroundColor Green
