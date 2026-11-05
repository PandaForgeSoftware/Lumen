@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0Start-Lumen.ps1"
start "Lumen" "http://127.0.0.1:4317"
