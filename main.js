const { app, BrowserWindow, ipcMain, session, desktopCapturer, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let store;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    show: false // Don't show until ready-to-show
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Check for updates once the window is shown
    autoUpdater.checkForUpdatesAndNotify();
  });

  // Handle WebRTC Permissions for Sharkord (Camera, Microphone, Screen Sharing)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    return true;
  });

  session.defaultSession.setDevicePermissionHandler((details) => {
    return true;
  });

  // Handle Screen Sharing Picker
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      const template = sources.map(source => ({
        label: source.name,
        click: () => {
          callback({ video: source, audio: 'loopback' });
        }
      }));
      
      template.push({ type: 'separator' });
      template.push({ label: 'Cancelar', click: () => callback() });
      
      const menu = Menu.buildFromTemplate(template);
      menu.popup({ window: mainWindow });
    }).catch(err => {
      console.error('Erro ao obter telas:', err);
      callback();
    });
  });

  const savedUrl = store.get('sharkordServerUrl');

  if (savedUrl) {
    mainWindow.loadURL(savedUrl);
  } else {
    mainWindow.loadFile('index.html');
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  const StoreModule = await import('electron-store');
  const Store = StoreModule.default || StoreModule;
  store = new Store();

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler to save the URL from the setup screen
ipcMain.on('save-server-url', (event, url) => {
  store.set('sharkordServerUrl', url);
  if (mainWindow) {
    mainWindow.loadURL(url);
  }
});

// Setup autoUpdater logging
autoUpdater.on('update-available', () => {
  console.log('Update available.');
});
autoUpdater.on('update-downloaded', () => {
  console.log('Update downloaded. It will be installed on restart.');
});
