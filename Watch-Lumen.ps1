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
    } catch { Add-Content -LiteralPath (Join-Path $PSScriptRoot 'data/supervisor.log') -Value ((Get-Date).ToString('s') + ' ' + $_.Exception.Message) }
    Start-Sleep -Seconds 30
  }
} finally { $lumenMutex.ReleaseMutex(); $lumenMutex.Dispose() }
