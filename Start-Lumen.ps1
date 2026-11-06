$ErrorActionPreference = 'Stop'
$lumenRoot = $PSScriptRoot
Set-Location -LiteralPath $lumenRoot
try { $existing = Invoke-RestMethod 'http://127.0.0.1:4317/api/state' -TimeoutSec 2; if ($existing.settings.device -eq 'Home PC') { return } } catch {}
try { Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2 | Out-Null } catch {
  $ollamaExe = (Get-Command ollama.exe -ErrorAction Stop).Source
  Start-Process -FilePath $ollamaExe -ArgumentList 'serve' -WindowStyle Hidden
}
$nodeExe = (Get-Command node.exe -ErrorAction Stop).Source
$env:LUMEN_DATA_DIR = Join-Path $lumenRoot 'data'
New-Item -ItemType Directory -Path $env:LUMEN_DATA_DIR -Force | Out-Null
Start-Process -FilePath $nodeExe -ArgumentList 'app-server.mjs' -WorkingDirectory $lumenRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $lumenRoot 'data/app.log') -RedirectStandardError (Join-Path $lumenRoot 'data/app-errors.log')
