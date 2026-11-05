$ErrorActionPreference = 'Stop'
$lumenRoot = $PSScriptRoot
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'Lumen.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $lumenRoot 'Start-Lumen.ps1') + '"'
$shortcut.WorkingDirectory = $lumenRoot
$shortcut.WindowStyle = 7
$shortcut.Description = 'Start the local Lumen AI and virtual world at Windows sign-in.'
$shortcut.Save()
Write-Output ('Lumen autostart installed: ' + $shortcutPath)
