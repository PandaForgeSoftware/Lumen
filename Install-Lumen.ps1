param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$installRoot = Join-Path $env:LOCALAPPDATA 'Lumen'
function Refresh-Tools {
  $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User') + ';' + $env:Path
}
function Find-Tool($name) {
  $tool = Get-Command $name -ErrorAction SilentlyContinue
  if ($tool) { return $tool.Source }
  if ($name -eq 'tailscale.exe' -and (Test-Path -LiteralPath 'C:\Program Files\Tailscale\tailscale.exe')) { return 'C:\Program Files\Tailscale\tailscale.exe' }
  return $null
}
function Ensure-Tool($name, $package, $label) {
  Refresh-Tools
  if (Find-Tool $name) { return }
  if (-not (Find-Tool 'winget.exe')) { throw ('Windows App Installer is missing. Install it from Microsoft Store, then run setup again. Missing dependency: ' + $label) }
  Write-Host ('Installing ' + $label + '. Please review any Windows or installer prompts.')
  & winget.exe install --id $package --exact --source winget --interactive
  if ($LASTEXITCODE -ne 0) { throw ($label + ' installation did not complete. Finish its installation and rerun setup.') }
  Refresh-Tools
  if (-not (Find-Tool $name)) { throw ($label + ' is installed but not visible yet. Close this setup window and run it again.') }
}
function Invoke-Checked($program, [string[]]$arguments) {
  & $program @arguments
  if ($LASTEXITCODE -ne 0) { throw ('Setup stopped: ' + $program + ' returned ' + $LASTEXITCODE + '. You can rerun setup after resolving the error.') }
}
function Make-Shortcut($target, $arguments, $workingDirectory) {
  $desktop = [Environment]::GetFolderPath('Desktop')
  $linkPath = Join-Path $desktop 'Lumen.lnk'
  if (Test-Path -LiteralPath $linkPath) { Copy-Item -LiteralPath $linkPath -Destination ($linkPath + '.previous') -Force }
  $link = (New-Object -ComObject WScript.Shell).CreateShortcut($linkPath)
  $link.TargetPath = $target
  $link.Arguments = $arguments
  $link.WorkingDirectory = $workingDirectory
  $link.Description = 'Open Lumen and its virtual world'
  $link.Save()
}
try {
  Write-Host 'LUMEN SETUP' -ForegroundColor Cyan
  Write-Host 'Choose where Lumen lives, or connect to the Lumen you already have.'
  if ($CheckOnly) {
    [pscustomobject]@{ Windows=[Environment]::OSVersion.VersionString; Node=Find-Tool 'node.exe'; Git=Find-Tool 'git.exe'; Ollama=Find-Tool 'ollama.exe'; Winget=Find-Tool 'winget.exe'; InstallFolder=$installRoot } | Format-List
    Write-Host 'Read-only checks complete. Nothing was installed or changed.'
    return
  }
  Write-Host ''
  Write-Host '1. Install a new Lumen on this PC (downloads a local AI model; several GB).'
  Write-Host '2. Connect this computer to the SAME Lumen on your home PC (recommended for additional devices).'
  Write-Host 'Q. Quit'
  $choice = Read-Host 'Choose 1, 2 or Q'
  if ($choice -match '^[qQ]$') { return }
  if ($choice -eq '2') {
    $address = Read-Host 'Paste the private HTTPS address printed by remote setup on your home PC'
    $remoteUri = $null
    if (-not [Uri]::TryCreate($address,[UriKind]::Absolute,[ref]$remoteUri) -or $remoteUri.Scheme -ne 'https' -or
        $remoteUri.DnsSafeHost -notmatch '^[a-zA-Z0-9][a-zA-Z0-9.-]*\.ts\.net$' -or $remoteUri.Port -ne 8443 -or
        $remoteUri.UserInfo -or $remoteUri.AbsolutePath -ne '/' -or $remoteUri.Query -or $remoteUri.Fragment) {
      throw 'Use the HTTPS Tailscale address ending in .ts.net:8443 from your home PC setup.'
    }
    Ensure-Tool 'tailscale.exe' 'Tailscale.Tailscale' 'Tailscale'
    Write-Host 'Sign into Tailscale using the same account as your home PC. Your home PC must be awake.'
    Invoke-Checked (Find-Tool 'tailscale.exe') @('up')
    $urlPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Lumen.url'
    if (Test-Path -LiteralPath $urlPath) { Copy-Item -LiteralPath $urlPath -Destination ($urlPath + '.previous') -Force }
    Set-Content -LiteralPath $urlPath -Value ("[InternetShortcut]`r`nURL=" + $remoteUri.AbsoluteUri) -Encoding ASCII
    Start-Process $remoteUri.AbsoluteUri
    Write-Host 'Connection shortcut created. Check that your existing world opens; no second AI or memory was created.'
    return
  }
  if ($choice -ne '1') { throw 'No installation option selected.' }
  $running = $null
  try { $running = Invoke-RestMethod http://127.0.0.1:4317/api/state -TimeoutSec 3 } catch {}
  if ($running.settings.device) {
    Write-Host 'Lumen is already running on this PC. Opening the existing world; a second copy will not be installed.'
    Start-Process 'http://127.0.0.1:4317/'
    return
  }
  Ensure-Tool 'git.exe' 'Git.Git' 'Git'
  Ensure-Tool 'node.exe' 'OpenJS.NodeJS.LTS' 'Node.js LTS'
  $nodeMajor = [int](((& node.exe --version).TrimStart('v')).Split('.')[0])
  if ($nodeMajor -lt 24) {
    Invoke-Checked 'winget.exe' @('upgrade','--id','OpenJS.NodeJS.LTS','--exact','--source','winget','--interactive')
    Refresh-Tools
    $nodeMajor = [int](((& node.exe --version).TrimStart('v')).Split('.')[0])
    if ($nodeMajor -lt 24) { throw 'Node.js 24 or newer is required. Finish its upgrade and run setup again.' }
  }
  Ensure-Tool 'ollama.exe' 'Ollama.Ollama' 'Ollama'
  if (-not (Test-Path -LiteralPath $installRoot)) {
    Invoke-Checked 'git.exe' @('clone','https://github.com/PandaForgeSoftware/Lumen.git',$installRoot)
  } else {
    if (-not (Test-Path -LiteralPath (Join-Path $installRoot '.git'))) { throw ('The installation folder already exists without a Git checkout. Its files were left unchanged: ' + $installRoot) }
    $remote = & git.exe -C $installRoot remote get-url origin
    if ($LASTEXITCODE -ne 0 -or $remote -ne 'https://github.com/PandaForgeSoftware/Lumen.git') { throw 'The existing installation points to a different repository. It was left unchanged.' }
    Write-Host 'Resuming the existing installation without replacing its code or memories.'
  }
  Set-Location -LiteralPath $installRoot
  if (-not (& git.exe config user.name)) { Invoke-Checked 'git.exe' @('config','--local','user.name','Lumen') }
  if (-not (& git.exe config user.email)) { Invoke-Checked 'git.exe' @('config','--local','user.email','lumen@localhost') }
  Write-Host 'Installing Lumen components...'
  Invoke-Checked 'npm.cmd' @('ci')
  $modelReady = $false
  try { Invoke-RestMethod http://127.0.0.1:11434/api/tags -TimeoutSec 3 | Out-Null; $modelReady=$true } catch {}
  if (-not $modelReady) {
    Start-Process -FilePath (Find-Tool 'ollama.exe') -ArgumentList 'serve' -WindowStyle Hidden
    for ($attempt=0; $attempt -lt 30; $attempt++) {
      try { Invoke-RestMethod http://127.0.0.1:11434/api/tags -TimeoutSec 2 | Out-Null; $modelReady=$true; break } catch { Start-Sleep -Seconds 2 }
    }
  }
  if (-not $modelReady) { throw 'Ollama did not start. Open Ollama and rerun setup.' }
  Write-Host 'Downloading the AI model. This can take a while; progress is shown below.'
  Invoke-Checked 'ollama.exe' @('pull','qwen3:4b-instruct-2507-q4_K_M')
  Invoke-Checked 'ollama.exe' @('create','lumen-local','-f','Modelfile')
  & (Join-Path $installRoot 'Install-Autostart.ps1')
  Make-Shortcut (Join-Path $installRoot 'Open-Lumen.cmd') '' $installRoot
  Start-Process powershell.exe -ArgumentList ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $installRoot 'Watch-Lumen.ps1') + '"') -WindowStyle Hidden
  $worldReady = $false
  for($attempt=0; $attempt -lt 30; $attempt++) {
    try { $world=Invoke-RestMethod http://127.0.0.1:4317/api/state -TimeoutSec 2; if($world.settings.device) { $worldReady=$true; break } } catch {}
    Start-Sleep -Seconds 2
  }
  if (-not $worldReady) { throw ('Lumen was installed, but the world did not start. Logs are in ' + (Join-Path $installRoot 'data')) }
  Start-Process 'http://127.0.0.1:4317/'
  Write-Host 'Lumen is installed. Use the Lumen desktop shortcut next time.' -ForegroundColor Green
  Write-Host 'GitHub uploads still need a one-time connection through Connect-GitHub.ps1.'
} catch {
  Write-Host ''
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
