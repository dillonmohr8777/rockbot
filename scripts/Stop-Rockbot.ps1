[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$statePath = Join-Path $projectRoot 'runtime\server-state.json'

if (-not (Test-Path -LiteralPath $statePath)) {
  Write-Output 'No tracked Rockbot server state was found.'
  return
}

$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
if ($state.projectRoot -ne $projectRoot -or -not $state.pid) {
  throw 'The tracked Rockbot server state does not match this project. Nothing was stopped.'
}

$trackedPid = [int]$state.pid
$server = Get-CimInstance Win32_Process -Filter "ProcessId = $trackedPid" -ErrorAction SilentlyContinue
if (-not $server) {
  Remove-Item -LiteralPath $statePath -Force
  Write-Output 'The tracked Rockbot server was already stopped. Stale state was removed.'
  return
}

if ($server.Name -notin @('cmd.exe', 'node.exe') -or $server.CommandLine -notmatch 'next(?:\.cmd|\\dist\\bin\\next)?[" ]+start') {
  throw "PID $trackedPid no longer matches the tracked Rockbot launch command. Nothing was stopped."
}

taskkill.exe /PID $trackedPid /T /F | Out-Null
Remove-Item -LiteralPath $statePath -Force
Write-Output "Rockbot stopped (tracked PID $trackedPid)."
