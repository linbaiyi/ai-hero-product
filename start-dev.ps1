$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$desktopDir = Join-Path $root "desktop"
$backendVenvPython = Join-Path $backendDir ".venv\Scripts\python.exe"
$backendPort = 8001
$devRuntimeDir = Join-Path $root ".dev-runtime"
$backendRunner = Join-Path $devRuntimeDir "start-backend.ps1"
$desktopRunner = Join-Path $devRuntimeDir "start-desktop.ps1"

function Resolve-BackendPython {
  param(
    [string]$VenvPython
  )

  if (Test-Path -LiteralPath $VenvPython) {
    return $VenvPython
  }

  $pythonCommand = Get-Command python.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.Source -and $_.Source -notlike "*\WindowsApps\python.exe" } |
    Select-Object -First 1
  if ($pythonCommand) {
    return $pythonCommand.Source
  }

  $pyCommand = Get-Command py.exe -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($pyCommand) {
    return $pyCommand.Source
  }

  throw "No Python interpreter found. Install Python 3.11+ or create backend virtual environment: $VenvPython"
}

if (-not (Test-Path -LiteralPath $backendDir)) {
  throw "Backend directory not found: $backendDir"
}

if (-not (Test-Path -LiteralPath $desktopDir)) {
  throw "Desktop directory not found: $desktopDir"
}

$backendPython = Resolve-BackendPython -VenvPython $backendVenvPython

Write-Host "Starting AI Game Hero Designer dev environment..." -ForegroundColor Yellow
Write-Host "Backend: http://127.0.0.1:$backendPort" -ForegroundColor DarkGray
Write-Host "Desktop: Electron dev mode" -ForegroundColor DarkGray
if ($backendPython -ne $backendVenvPython) {
  Write-Host "Backend .venv not found; using system Python: $backendPython" -ForegroundColor Yellow
} else {
  Write-Host "Backend Python: $backendPython" -ForegroundColor DarkGray
}

New-Item -ItemType Directory -Force -Path $devRuntimeDir | Out-Null

$backendIsHealthy = $false
$backendListener = Get-NetTCPConnection -LocalPort $backendPort -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($backendListener) {
  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$backendPort/health" -TimeoutSec 2
    $backendIsHealthy = $health.status -eq "ok"
  } catch {
    $backendIsHealthy = $false
  }
}

@"
Set-Location -LiteralPath "$backendDir"
& "$backendPython" -m uvicorn app.main:app --reload --host 127.0.0.1 --port $backendPort
"@ | Set-Content -LiteralPath $backendRunner -Encoding UTF8

@"
Set-Location -LiteralPath "$desktopDir"
[Environment]::SetEnvironmentVariable("VITE_BACKEND_URL", "http://127.0.0.1:$backendPort", "Process")
npm.cmd run electron:dev
"@ | Set-Content -LiteralPath $desktopRunner -Encoding UTF8

if ($backendIsHealthy) {
  Write-Host "Backend already running on $backendPort; reusing it." -ForegroundColor Green
} else {
  if ($backendListener) {
    Write-Host "Port $backendPort is occupied but health check failed. Close that process if backend cannot connect." -ForegroundColor Yellow
  }

  Start-Process powershell.exe -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $backendRunner
  ) -WindowStyle Normal

  Start-Sleep -Seconds 2
}

if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) {
  Write-Host "Vite dev server already appears to be running on 5173; opening another Electron session may reuse it." -ForegroundColor Yellow
}

Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $desktopRunner
) -WindowStyle Normal

Write-Host "Opened the Electron desktop window. Backend is on http://127.0.0.1:$backendPort." -ForegroundColor Green
Write-Host "Close those windows to stop the dev environment." -ForegroundColor DarkGray
