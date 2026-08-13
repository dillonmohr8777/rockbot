[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourcePath = Join-Path $projectRoot 'remote\worker.mjs'
$serverRoot = Join-Path $projectRoot 'dist\server'
$outputPath = Join-Path $serverRoot 'index.js'

if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "Remote worker source is missing: $sourcePath"
}

New-Item -ItemType Directory -Path $serverRoot -Force | Out-Null
Copy-Item -LiteralPath $sourcePath -Destination $outputPath -Force

Write-Output "Rockbot remote gateway built at $outputPath"
