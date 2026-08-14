# Daynisc ERP — Start Demo Backend Server
# This script launches the backend in a NEW persistent window.
# Usage: Right-click → "Run with PowerShell"  OR  run in any terminal

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Daynisc ERP — Launching Demo Backend" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$backendPath = Join-Path $PSScriptRoot "backend"

# Kill any existing process on port 8000
$netstatOutput = netstat -ano | Select-String ":8000\s" | Select-String "LISTENING"
if ($netstatOutput) {
    $existingPid = ($netstatOutput -split '\s+')[-1].Trim()
    if ($existingPid -match '^\d+$') {
        Write-Host "  Stopping existing server on port 8000 (PID: $existingPid)..." -ForegroundColor Yellow
        Stop-Process -Id $existingPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

Write-Host "  Opening backend server in a new window..." -ForegroundColor Green
Write-Host ""

# Launch backend in a SEPARATE window so it stays alive when this script exits
$serverScript = @"
Set-Location '$backendPath'
`$host.UI.RawUI.WindowTitle = 'Daynisc Backend :8000'
Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  Daynisc ERP Demo Server' -ForegroundColor Cyan
Write-Host '  API  : http://localhost:8000' -ForegroundColor Green
Write-Host '  Docs : http://localhost:8000/docs' -ForegroundColor Green
Write-Host '  Login: any phone + OTP 989898' -ForegroundColor Yellow
Write-Host '  Keep this window open while using the app!' -ForegroundColor Red
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ''
python demo_server.py
Write-Host ''
Write-Host 'Server stopped. Press any key to close...' -ForegroundColor Red
`$null = `$host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $serverScript

Write-Host "  ✅ Backend started! Keep the new server window open." -ForegroundColor Green
Write-Host "  ✅ API is live at: http://localhost:8000" -ForegroundColor Green
Write-Host "  ✅ Upload bills at: http://localhost:3000/ai-verification" -ForegroundColor Green
Write-Host ""
Write-Host "  (This window can be closed — the server runs in its own window)" -ForegroundColor Gray
Write-Host ""
