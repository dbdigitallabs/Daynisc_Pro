const { app, BrowserWindow, net } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

// ── Fix GPU/cache permission errors causing black screen on Windows ──
// Point Electron's user data to a writable temp location to avoid
// "Access is denied" errors on the default AppData cache path.
const userDataPath = path.join(os.tmpdir(), 'daynisc-erp-electron');
app.setPath('userData', userDataPath);

// Disable GPU hardware acceleration & compositing flags — prevents black screen on Windows
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('no-sandbox');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 850,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
    icon: path.join(__dirname, 'build', 'icon.ico'),
  });

  const devUrl = 'http://localhost:3000';
  const indexPath = path.join(__dirname, 'dist', 'index.html');

  // Intelligent loader: Check if Vite Dev Server is running at http://localhost:3000
  const req = net.request(devUrl);
  req.on('response', () => {
    console.log('[Electron] Dev server active, loading http://localhost:3000');
    mainWindow.loadURL(devUrl);
  });
  req.on('error', () => {
    console.log('[Electron] Dev server not detected, loading local dist/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      console.log('[Electron] dist/index.html not found, falling back to http://localhost:3000');
      mainWindow.loadURL(devUrl);
    }
  });
  req.end();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron] FAILED TO LOAD:', validatedURL, errorCode, errorDescription);
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
