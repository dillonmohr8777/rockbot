[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$credentialTarget = 'Rockbot/CloudflareTunnelToken'

if (-not ('RockbotCredentialStore' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class RockbotCredentialStore
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

$token = [Console]::In.ReadToEnd().Trim()
if ($token.Length -lt 40 -or $token -notmatch '^eyJ[A-Za-z0-9_-]+$') {
  throw 'The supplied Cloudflare tunnel token did not match the expected format.'
}

$blob = [Runtime.InteropServices.Marshal]::StringToCoTaskMemUni($token)
try {
  $credential = New-Object RockbotCredentialStore+Credential
  $credential.Type = 1
  $credential.TargetName = $credentialTarget
  $credential.CredentialBlobSize = [Text.Encoding]::Unicode.GetByteCount($token)
  $credential.CredentialBlob = $blob
  $credential.Persist = 2
  $credential.UserName = 'rockbot-home'

  if (-not [RockbotCredentialStore]::CredWrite([ref]$credential, 0)) {
    $errorCode = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    throw "Windows Credential Manager rejected the tunnel credential (error $errorCode)."
  }
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeCoTaskMemUnicode($blob)
  $token = $null
}

Write-Output 'Rockbot tunnel credential stored in Windows Credential Manager.'
