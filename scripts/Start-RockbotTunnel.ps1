[CmdletBinding()]
param(
  [int]$Port = 3434
)

$ErrorActionPreference = 'Stop'
$credentialTarget = 'Rockbot/CloudflareTunnelToken'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$runtimeRoot = Join-Path $projectRoot 'runtime'
$logRoot = Join-Path $runtimeRoot 'logs'
$statePath = Join-Path $runtimeRoot 'tunnel-state.json'
$stdoutPath = Join-Path $logRoot 'tunnel.stdout.log'
$stderrPath = Join-Path $logRoot 'tunnel.stderr.log'
$healthUri = "http://127.0.0.1:$Port/api/health"

New-Item -ItemType Directory -Path $logRoot -Force | Out-Null

if (Test-Path -LiteralPath $statePath) {
  try {
    $tracked = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    $trackedProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$tracked.pid)" -ErrorAction SilentlyContinue
    if ($trackedProcess -and $trackedProcess.Name -eq 'cloudflared.exe' -and $trackedProcess.CommandLine -match 'tunnel.+run') {
      Write-Output "The Rockbot Cloudflare tunnel is already running (PID $($tracked.pid))."
      return
    }
  } catch {
    # A malformed or stale state file is replaced below.
  }
  Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
}

if (-not ('RockbotCredentialReader' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class RockbotCredentialReader
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct Credential
    {
        public UInt32 Flags;
        public UInt32 Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public UInt32 CredentialBlobSize;
        public IntPtr CredentialBlob;
        public UInt32 Persist;
        public UInt32 AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredRead(string target, UInt32 type, UInt32 reservedFlag, out IntPtr credentialPtr);

    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern void CredFree(IntPtr credentialPtr);
}
'@
}

$credentialPointer = [IntPtr]::Zero
if (-not [RockbotCredentialReader]::CredRead($credentialTarget, 1, 0, [ref]$credentialPointer)) {
  throw 'The Rockbot Cloudflare tunnel credential is missing from Windows Credential Manager.'
}

$token = $null
try {
  $credential = [Runtime.InteropServices.Marshal]::PtrToStructure(
    $credentialPointer,
    [type][RockbotCredentialReader+Credential]
  )
  $token = [Runtime.InteropServices.Marshal]::PtrToStringUni(
    $credential.CredentialBlob,
    [int]($credential.CredentialBlobSize / 2)
  )
} finally {
  [RockbotCredentialReader]::CredFree($credentialPointer)
}

if ([string]::IsNullOrWhiteSpace($token)) {
  throw 'The stored Rockbot Cloudflare tunnel credential is empty.'
}

$cloudflared = Get-Command cloudflared.exe -ErrorAction Stop

$ready = $false
for ($attempt = 0; $attempt -lt 120; $attempt++) {
  try {
    $response = Invoke-WebRequest -Uri $healthUri -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      $ready = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 1
  }
}
if (-not $ready) {
  throw "Rockbot did not become healthy on loopback port $Port before the tunnel startup deadline."
}

$env:TUNNEL_TOKEN = $token
try {
  $tunnel = Start-Process -FilePath $cloudflared.Source `
    -ArgumentList @('--no-autoupdate', 'tunnel', '--loglevel', 'info', 'run') `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath `
    -PassThru
} finally {
  Remove-Item Env:TUNNEL_TOKEN -ErrorAction SilentlyContinue
  $token = $null
}

$state = [ordered]@{
  schemaVersion = 1
  pid = $tunnel.Id
  tunnelName = 'rockbot-home'
  startedAt = (Get-Date).ToUniversalTime().ToString('o')
}
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($statePath, ($state | ConvertTo-Json), $utf8WithoutBom)
Write-Output "Rockbot Cloudflare tunnel started (PID $($tunnel.Id))."

$tunnel.WaitForExit()
$exitCode = $tunnel.ExitCode

if (Test-Path -LiteralPath $statePath) {
  try {
    $current = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    if ([int]$current.pid -eq $tunnel.Id) {
      Remove-Item -LiteralPath $statePath -Force
    }
  } catch {
    # Leave unrecognized state in place for manual inspection.
  }
}

exit $exitCode
