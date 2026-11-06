$ErrorActionPreference = 'Stop'
$lumenMutex = New-Object System.Threading.Mutex($false, 'Local\LumenBackgroundSupervisor')
try { $ownsLumenMutex = $lumenMutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $ownsLumenMutex = $true }
if (-not $ownsLumenMutex) { $lumenMutex.Dispose(); exit 0 }
try {
  while ($true) {
    try {
      try { Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 4 | Out-Null }
      catch { Start-Process -FilePath (Get-Command ollama.exe -ErrorAction Stop).Source -ArgumentList 'serve' -WindowStyle Hidden }
      & (Join-Path $PSScriptRoot 'Start-Lumen.ps1')
      $remoteConfig = Join-Path $PSScriptRoot 'data/remote-access.json'
      if ((Test-Path -LiteralPath $remoteConfig) -and (Get-Content -LiteralPath $remoteConfig -Raw | ConvertFrom-Json).enabled) {
        $gatewayReady = $false
        try { $gatewayReady = (Invoke-RestMethod 'http://127.0.0.1:4319/health' -TimeoutSec 3).service -eq 'lumen-remote-gateway' } catch {}
        if (-not $gatewayReady) {
          Start-Process -FilePath (Get-Command node.exe -ErrorAction Stop).Source -ArgumentList 'remote-gateway.mjs' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'data/remote.log') -RedirectStandardError (Join-Path $PSScriptRoot 'data/remote-errors.log')
        }
      }
    } catch { Add-Content -LiteralPath (Join-Path $PSScriptRoot 'data/supervisor.log') -Value ((Get-Date).ToString('s') + ' ' + $_.Exception.Message) }
    Start-Sleep -Seconds 30
  }
} finally { $lumenMutex.ReleaseMutex(); $lumenMutex.Dispose() }
