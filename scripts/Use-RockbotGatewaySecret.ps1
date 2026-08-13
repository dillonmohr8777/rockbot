[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('WranglerOrigin', 'TestOrigin')]
  [string]$Target
)

$ErrorActionPreference = 'Stop'
$credentialTarget = 'Rockbot/GatewaySecret'

if (-not ('RockbotGatewayCredentialReader' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class RockbotGatewayCredentialReader
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
if (-not [RockbotGatewayCredentialReader]::CredRead($credentialTarget, 1, 0, [ref]$credentialPointer)) {
  throw 'The Rockbot gateway secret is missing from Windows Credential Manager.'
}

$secret = $null
try {
  $credential = [Runtime.InteropServices.Marshal]::PtrToStructure(
    $credentialPointer,
    [type][RockbotGatewayCredentialReader+Credential]
  )
  $secret = [Runtime.InteropServices.Marshal]::PtrToStringUni(
    $credential.CredentialBlob,
    [int]($credential.CredentialBlobSize / 2)
  )
} finally {
  [RockbotGatewayCredentialReader]::CredFree($credentialPointer)
}

if ([string]::IsNullOrWhiteSpace($secret)) {
  throw 'The stored Rockbot gateway secret is empty.'
}

switch ($Target) {
  'WranglerOrigin' {
    $secret | npx.cmd --yes wrangler@4.123.0 secret put ROCKBOT_GATEWAY_SECRET `
      --config (Join-Path $PSScriptRoot '..\cloudflare\dillonmohr8777-rockbot\wrangler.jsonc')
    $exitCode = $LASTEXITCODE
    $secret = $null
    exit $exitCode
  }
  'TestOrigin' {
    try {
      $response = Invoke-WebRequest `
        -Uri 'https://rockbot-private-origin.dillonmohr8777.workers.dev/api/health' `
        -Headers @{ 'x-rockbot-gateway' = $secret } `
        -UseBasicParsing

      if ([int]$response.StatusCode -ne 200 -or $response.Content -notmatch 'ready') {
        throw 'The Rockbot private origin returned an unexpected health response.'
      }

      Write-Output 'Rockbot private origin health check passed (HTTP 200).'
    } finally {
      $secret = $null
    }
  }
}
