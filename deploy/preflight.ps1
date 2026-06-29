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
  param(
    [string]$Check,
    [bool]$Passed,
    [string]$Details,
    [bool]$Required = $true
  )

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
  "assets/vendor/pdf-lib.min.js",
  "deploy/nginx/pdftool.work"
)

$missingFiles = @($requiredFiles | Where-Object { -not (Test-Path -LiteralPath $_ -PathType Leaf) })
Add-Result "Local release files" ($missingFiles.Count -eq 0) $(
  if ($missingFiles.Count) { "Missing: $($missingFiles -join ', ')" } else { "$($requiredFiles.Count) required files found" }
)

$domains = @($Domain)
if (-not $SkipWww) {
  $domains += "www.$Domain"
}

foreach ($name in $domains) {
  try {
    $addresses = @(Resolve-DnsName $name -Type A -ErrorAction Stop | Where-Object Type -eq "A" | Select-Object -ExpandProperty IPAddress -Unique)
    $matchesServer = $addresses -contains $Server
    Add-Result "DNS A: $name" $matchesServer $(
      if ($addresses.Count) { $addresses -join ", " } else { "No A record" }
    )
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
$request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Head, "http://$Server/")
$request.Headers.Host = $Domain
try {
  $response = $httpClient.SendAsync($request).GetAwaiter().GetResult()
  $status = "HTTP $([int]$response.StatusCode) $($response.ReasonPhrase)"
  $routeReady = [int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 400
  Add-Result "Nginx host route" $routeReady $status $false
} catch {
  Add-Result "Nginx host route" $false "No HTTP response for Host: $Domain" $false
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
