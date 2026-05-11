$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$desktopDir = Join-Path $root "desktop"

if (-not (Test-Path -LiteralPath $backendDir)) {
  throw "Backend directory not found: $backendDir"
}

if (-not (Test-Path -LiteralPath $desktopDir)) {
  throw "Desktop directory not found: $desktopDir"
}

Write-Host "Starting AI Game Hero Designer dev environment..." -ForegroundColor Yellow
Write-Host "Backend: http://127.0.0.1:8000" -ForegroundColor DarkGray
Write-Host "Desktop: Electron dev mode" -ForegroundColor DarkGray

$backendCommand = @"
Set-Location -LiteralPath "$backendDir"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
"@

$desktopCommand = @"
Set-Location -LiteralPath "$desktopDir"
npm run electron:dev
"@

Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  $backendCommand
) -WindowStyle Normal

Start-Sleep -Seconds 2

Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  $desktopCommand
) -WindowStyle Normal

Write-Host "Opened two windows: backend service and Electron desktop." -ForegroundColor Green
Write-Host "Close those windows to stop the dev environment." -ForegroundColor DarkGray
