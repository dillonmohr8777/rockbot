[CmdletBinding()]
param(
  [switch]$Rebuild,
  [int]$Port = 3434
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$runtimeRoot = Join-Path $projectRoot 'runtime'
$logRoot = Join-Path $runtimeRoot 'logs'
$statePath = Join-Path $runtimeRoot 'server-state.json'
$healthUri = "http://127.0.0.1:$Port/api/health"

New-Item -ItemType Directory -Path $logRoot -Force | Out-Null

try {
  $existing = Invoke-WebRequest -Uri $healthUri -UseBasicParsing -TimeoutSec 2
  if ($existing.StatusCode -eq 200) {
    Write-Output "Rockbot is already ready at http://127.0.0.1:$Port"
    return
  }
} catch {
  # No healthy tracked server is listening yet.
}

$listener = Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  throw "Port $Port is already owned by another local process. Rockbot did not start."
}

if ($Rebuild -or -not (Test-Path (Join-Path $projectRoot '.next\BUILD_ID'))) {
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw "Rockbot production build failed with exit code $LASTEXITCODE." }
}

$stdoutPath = Join-Path $logRoot 'server.stdout.log'
$stderrPath = Join-Path $logRoot 'server.stderr.log'
$nextCommand = Join-Path $projectRoot 'node_modules\.bin\next.cmd'
if (-not (Test-Path -LiteralPath $nextCommand)) {
  throw "The local Next.js launcher is missing. Run npm install in $projectRoot first."
}
$server = Start-Process -FilePath $nextCommand -ArgumentList @('start', '--hostname', '127.0.0.1', '--port', "$Port") -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru

$state = [ordered]@{
  schemaVersion = 1
  pid = $server.Id
  projectRoot = $projectRoot
  port = $Port
  startedAt = (Get-Date).ToUniversalTime().ToString('o')
}
$stateJson = $state | ConvertTo-Json
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($statePath, $stateJson, $utf8WithoutBom)

for ($attempt = 0; $attempt -lt 40; $attempt++) {
  if ($server.HasExited) {
    $detail = if (Test-Path $stderrPath) { (Get-Content -LiteralPath $stderrPath -Tail 12) -join [Environment]::NewLine } else { 'No stderr was captured.' }
    throw "Rockbot exited before becoming ready.$([Environment]::NewLine)$detail"
  }
  try {
    $response = Invoke-WebRequest -Uri $healthUri -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      Write-Output "Rockbot is ready at http://127.0.0.1:$Port (PID $($server.Id))."
      return
    }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

throw "Rockbot did not become ready within 20 seconds. Inspect $stderrPath."
