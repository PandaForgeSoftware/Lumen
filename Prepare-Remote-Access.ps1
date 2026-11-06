$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$tailscalePath = 'C:\Program Files\Tailscale\tailscale.exe'
if (-not (Test-Path -LiteralPath $tailscalePath)) { throw 'Install Tailscale from https://tailscale.com/download/windows and sign in, then run this script again.' }
$statusText = & $tailscalePath status --json
if ($LASTEXITCODE -ne 0) { throw 'Tailscale could not report its connection.' }
$status = $statusText | ConvertFrom-Json
if ($status.BackendState -ne 'Running') { throw 'Open Tailscale and finish signing in first.' }
$hostName = ([string]$status.Self.DNSName).TrimEnd('.')
$owner = $status.User.PSObject.Properties | Where-Object { $_.Name -eq [string]$status.Self.UserID } | Select-Object -First 1
$login = [string]$owner.Value.LoginName
if (-not $login -or $hostName -notmatch '^[a-zA-Z0-9][a-zA-Z0-9.-]*\.ts\.net$') { throw 'Could not identify an untagged personal Tailscale device and its owner.' }
$origin = 'https://' + $hostName.ToLowerInvariant() + ':8443'
$existingText = & $tailscalePath serve status --json
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect existing Tailscale services.' }
$existing = $existingText | ConvertFrom-Json
if ($existing.Web.PSObject.Properties.Name -contains ($hostName + ':8443')) { throw 'Port 8443 already has a Tailscale service. Review it before replacing anything.' }
New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot 'data') -Force | Out-Null
$configFile = Join-Path $PSScriptRoot 'data/remote-access.json'
@{enabled=$true;login=$login;origin=$origin} | ConvertTo-Json | Set-Content -LiteralPath $configFile -Encoding UTF8
$ready = $false
try { $ready = (Invoke-RestMethod http://127.0.0.1:4319/health -TimeoutSec 3).service -eq 'lumen-remote-gateway' } catch {}
if (-not $ready) {
  Start-Process -FilePath (Get-Command node.exe -ErrorAction Stop).Source -ArgumentList 'remote-gateway.mjs' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'data/remote.log') -RedirectStandardError (Join-Path $PSScriptRoot 'data/remote-errors.log')
}
& $tailscalePath serve --bg --https=8443 http://127.0.0.1:4319
if ($LASTEXITCODE -ne 0) {
  @{enabled=$false;login=$login;origin=$origin} | ConvertTo-Json | Set-Content -LiteralPath $configFile -Encoding UTF8
  throw 'Tailscale Serve was not enabled. Remote access has been disabled; finish HTTPS setup and retry.'
}
Write-Host ('Open ' + $origin + ' on another device signed into the same Tailscale account.')
Write-Host 'The home PC must stay awake. No model installation is needed on your other devices.'
