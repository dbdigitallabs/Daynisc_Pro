import zipfile

with zipfile.ZipFile('web_dashboard/public/downloads/Daynisc-Pro-Windows.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.write('web_dashboard/public/downloads/Daynisc-Pro-Setup.exe', 'Daynisc-Pro-Setup.exe')
    z.writestr('Daynisc-Pro.bat', '@echo off\r\ntitle Daynisc Pro - Windows Desktop Application\r\nstart Daynisc-Pro-Setup.exe\r\n')
    z.writestr('Setup-Desktop-Shortcut.ps1', '# Daynisc Pro Windows Setup Script\r\nWrite-Host "Creating Daynisc Pro Desktop shortcut..." -ForegroundColor Cyan\r\n$WshShell = New-Object -ComObject WScript.Shell\r\n$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)\r\n$Shortcut = $WshShell.CreateShortcut("$DesktopPath\\Daynisc Pro.lnk")\r\n$Shortcut.TargetPath = "$PSScriptRoot\\Daynisc-Pro-Setup.exe"\r\n$Shortcut.Description = "Daynisc Pro Accounting Automation"\r\n$Shortcut.Save()\r\nWrite-Host "Desktop shortcut created! Starting Daynisc Pro..." -ForegroundColor Green\r\nStart-Process "$PSScriptRoot\\Daynisc-Pro-Setup.exe"\r\n')
    z.writestr('README.txt', '===================================================\r\n   DAYNISC PRO - WINDOWS DESKTOP APPLICATION\r\n===================================================\r\n\r\n1. Double-click Daynisc-Pro-Setup.exe to start the desktop app.\r\n2. (Optional) Run Setup-Desktop-Shortcut.ps1 to create a desktop icon.\r\n3. Connect directly with TallyPrime (Port 9000) or Odoo ERP (Port 8069).\r\n')

print('ZIP created successfully!')
