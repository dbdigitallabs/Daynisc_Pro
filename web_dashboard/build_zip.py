import zipfile

with zipfile.ZipFile('web_dashboard/public/downloads/Daynisc-Pro-Windows.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.write('web_dashboard/public/downloads/Daynisc-Pro-Setup.exe', 'Daynisc-Pro-Setup.exe')
    
    bat_content = """@echo off
title Daynisc Pro - Windows Desktop Application
echo Starting Daynisc Pro Desktop Application...

if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app=https://webdashboard-dun.vercel.app/#/ai-verification --window-size=1440,900
    exit
)
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --app=https://webdashboard-dun.vercel.app/#/ai-verification --window-size=1440,900
    exit
)
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --app=https://webdashboard-dun.vercel.app/#/ai-verification --window-size=1440,900
    exit
)
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --app=https://webdashboard-dun.vercel.app/#/ai-verification --window-size=1440,900
    exit
)

start https://webdashboard-dun.vercel.app/#/ai-verification
exit
"""
    z.writestr('Daynisc-Pro.bat', bat_content)
    
    ps_content = """# Daynisc Pro Windows Setup Script
Write-Host "Creating Daynisc Pro Desktop shortcut..." -ForegroundColor Cyan
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\\Daynisc Pro.lnk")
$Shortcut.TargetPath = "$PSScriptRoot\\Daynisc-Pro.bat"
$Shortcut.Description = "Daynisc Pro Accounting Automation"
$Shortcut.Save()
Write-Host "Desktop shortcut created successfully on your desktop!" -ForegroundColor Green
Start-Process "$PSScriptRoot\\Daynisc-Pro.bat"
"""
    z.writestr('Setup-Desktop-Shortcut.ps1', ps_content)
    
    readme = """===================================================
   DAYNISC PRO - WINDOWS DESKTOP APPLICATION
===================================================

HOW TO RUN:
1. Double-click 'Daynisc-Pro.bat' or 'Daynisc-Pro-Setup.exe' to launch Daynisc Pro in a dedicated native desktop window.
2. (Optional) Right-click 'Setup-Desktop-Shortcut.ps1' -> 'Run with PowerShell' to create a desktop shortcut icon.
3. Open TallyPrime (Port 9000) or Odoo ERP (Port 8069) on your PC to auto-connect.

Support: support@daynisc.com
"""
    z.writestr('README.txt', readme)

print('ZIP package built successfully!')
