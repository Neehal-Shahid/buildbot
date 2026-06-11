$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $repoRoot "server")
npm run build:plugin
