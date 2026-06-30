#Requires -Version 5.1
# IdeoTrack Local Dev Launcher

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  IdeoTrack - Starting Dev Servers" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] npm not found. Please install Node.js." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] npm: $(npm --version 2>&1)" -ForegroundColor Green

# Check directories
if (-not (Test-Path "$Root\api\package.json")) {
    Write-Host "[ERROR] api\package.json not found" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] API directory found" -ForegroundColor Green

if (-not (Test-Path "$Root\web\package.json")) {
    Write-Host "[ERROR] web\package.json not found" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Web directory found" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting services..." -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start API
Write-Host "[1/2] Starting API (port 3000)..." -ForegroundColor Yellow
$apiCmd = "Set-Location '$Root\api'; if (-not (Test-Path 'node_modules')) { npm install }; npm run dev; Read-Host 'Press Enter to close'"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $apiCmd -WindowStyle Normal

Start-Sleep -Seconds 3

# Start Web
Write-Host "[2/2] Starting Web (port 3001)..." -ForegroundColor Yellow
$webCmd = "Set-Location '$Root\web'; if (-not (Test-Path 'node_modules')) { npm install }; npm run dev; Read-Host 'Press Enter to close'"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $webCmd -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Services Started!" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  API: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Web: http://localhost:3001/admin/login" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Close the API/Web PowerShell windows to stop services" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to close this launcher"