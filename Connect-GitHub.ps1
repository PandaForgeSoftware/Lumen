$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
git config --local credential.https://github.com.username PandaForgeSoftware
if ($LASTEXITCODE -ne 0) { throw 'Could not select the repository account.' }
git credential-manager github login --username PandaForgeSoftware --device
if ($LASTEXITCODE -ne 0) { throw 'GitHub connection was not completed.' }
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'Never'
git push --dry-run origin HEAD:main
if ($LASTEXITCODE -ne 0) { throw 'This login cannot upload to the Lumen repository.' }
Invoke-RestMethod http://127.0.0.1:4317/api/settings -Method Post -ContentType 'application/json' -Body '{"githubSync":true}' | Out-Null
Invoke-RestMethod http://127.0.0.1:4317/api/sync -Method Post | Out-Null
Write-Host 'Lumen is connected. Future uploads use the saved Windows credential without ChatGPT.'
