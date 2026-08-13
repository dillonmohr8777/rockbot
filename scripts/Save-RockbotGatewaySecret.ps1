[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$credentialTarget = 'Rockbot/GatewaySecret'

if (-not ('RockbotGatewayCredentialStore' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class RockbotGatewayCredentialStore
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

    [DllImport("advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredWrite(ref Credential credential, UInt32 flags);
}
'@
}

$secret = [Console]::In.ReadToEnd().Trim()
if ($secret.Length -lt 32 -or $secret -notmatch '^[A-Za-z0-9_-]+$') {
  throw 'The supplied Rockbot gateway secret did not match the expected format.'
}

$blob = [Runtime.InteropServices.Marshal]::StringToCoTaskMemUni($secret)
try {
  $credential = New-Object RockbotGatewayCredentialStore+Credential
  $credential.Type = 1
  $credential.TargetName = $credentialTarget
  $credential.CredentialBlobSize = [Text.Encoding]::Unicode.GetByteCount($secret)
  $credential.CredentialBlob = $blob
  $credential.Persist = 2
  $credential.UserName = 'rockbot-gateway'

  if (-not [RockbotGatewayCredentialStore]::CredWrite([ref]$credential, 0)) {
    $errorCode = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    throw "Windows Credential Manager rejected the Rockbot gateway secret (error $errorCode)."
  }
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeCoTaskMemUnicode($blob)
  $secret = $null
}

Write-Output 'Rockbot gateway secret stored in Windows Credential Manager.'
