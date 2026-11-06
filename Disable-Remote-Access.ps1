$ErrorActionPreference = 'Stop'
$configFile = Join-Path $PSScriptRoot 'data/remote-access.json'
if (Test-Path -LiteralPath $configFile) {
  $config = Get-Content -LiteralPath $configFile -Raw | ConvertFrom-Json
  $config.enabled = $false
  $config | ConvertTo-Json | Set-Content -LiteralPath $configFile -Encoding UTF8
}
$tailscalePath = 'C:\Program Files\Tailscale\tailscale.exe'
if (Test-Path -LiteralPath $tailscalePath) { & $tailscalePath serve --https=8443 off }
Write-Host 'Lumen remote access is disabled. The home world can still be used locally.'
