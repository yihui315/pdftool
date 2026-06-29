[CmdletBinding()]
param(
  [string]$Server = "154.217.241.238",
  [string]$User = "root",
  [string]$IdentityFile = "",
  [string]$RemoteRoot = "/var/www/pdftool.work",
  [string]$HealthUrl = "https://pdftool.work/",
  [switch]$SkipBuild,
  [switch]$SkipHealthCheck
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseName = Get-Date -Format "yyyyMMddHHmmss"
$remoteRelease = "$RemoteRoot/releases/$releaseName"
$target = "$User@$Server"

Set-Location $projectRoot

foreach ($command in @("ssh", "scp")) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "未找到 $command，请先安装 Windows OpenSSH Client。"
  }
}

if (-not $SkipBuild) {
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "未找到 npm，无法生成生产资源。"
  }

  npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm ci 失败。" }

  npm run build
  if ($LASTEXITCODE -ne 0) { throw "生产构建失败。" }
}

$deployFiles = @(
  "index.html",
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
  "assets/vendor/pdf-lib.min.js"
)

foreach ($file in $requiredFiles) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
    throw "缺少部署文件：$file"
  }
}

if (Select-String -Path @("*.html", "ads.txt") -Pattern "XXXXXXXXXXXXXXXX" -Quiet) {
  Write-Warning "仍在使用 AdSense 占位 ID。网站可以部署，但真实广告不会显示。"
}

$sshArgs = @()
$scpArgs = @()
if ($IdentityFile) {
  $resolvedKey = (Resolve-Path -LiteralPath $IdentityFile).Path
  $sshArgs += @("-i", $resolvedKey)
  $scpArgs += @("-i", $resolvedKey)
}

& ssh @sshArgs $target "mkdir -p '$remoteRelease'"
if ($LASTEXITCODE -ne 0) { throw "无法创建远程发布目录。" }

& scp @scpArgs @deployFiles "$($target):$remoteRelease/"
if ($LASTEXITCODE -ne 0) { throw "页面和站点文件上传失败。" }

& scp @scpArgs -r "assets" "$($target):$remoteRelease/"
if ($LASTEXITCODE -ne 0) { throw "assets 目录上传失败。" }

$activateCommand = @"
set -eu
find '$remoteRelease' -type d -exec chmod 755 {} \;
find '$remoteRelease' -type f -exec chmod 644 {} \;
ln -sfn '$remoteRelease' '$RemoteRoot/current.next'
mv -Tf '$RemoteRoot/current.next' '$RemoteRoot/current'
nginx -t
systemctl reload nginx
"@

& ssh @sshArgs $target $activateCommand
if ($LASTEXITCODE -ne 0) { throw "远程发布激活或 Nginx 重载失败。" }

Write-Host "已发布版本：$releaseName" -ForegroundColor Green
Write-Host "远程目录：$remoteRelease"

if (-not $SkipHealthCheck) {
  Start-Sleep -Seconds 2
  try {
    $response = Invoke-WebRequest -Uri $HealthUrl -Method Head -TimeoutSec 20 -UseBasicParsing
    Write-Host "健康检查：HTTP $($response.StatusCode) $HealthUrl" -ForegroundColor Green
  } catch {
    Write-Warning "发布已完成，但健康检查失败：$($_.Exception.Message)"
  }
}