const { app, BrowserWindow, ipcMain, session, desktopCapturer, Menu, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let store;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'icon.png'),
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
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.log('Update check ignored/failed (likely dev mode):', err.message);
    });
  });

  // Handle updates downloaded
  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-ready');
  });

  // Handle install command from UI
  ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall();
  });

  // Handle manual check command from UI
  ipcMain.on('manual-check-update', () => {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.error('Erro na busca manual:', err);
      if (mainWindow) mainWindow.webContents.send('update-status', 'Erro na busca');
    });
  });

  // Força o Electron a ignorar eventos que impedem o descarregamento da página (como streams ativos)
  mainWindow.webContents.on('will-prevent-unload', (event) => {
    event.preventDefault();
  });

  // Abre links externos (target="_blank") no navegador padrão do sistema em vez de em um popup
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Lida com falhas de carregamento (URL inválida, servidor offline, etc)
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) { // Ignora ABORTED (-3)
      store.delete('sharkordServerUrl');
      mainWindow.loadFile('index.html');
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('connection-error', errorDescription);
      });
    }
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
  let screenPickerCallback = null;

  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 200, height: 200 } }).then((sources) => {
      screenPickerCallback = callback;
      
      const sourcesData = sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnailUrl: source.thumbnail.toDataURL()
      }));

      mainWindow.webContents.send('show-screen-picker', sourcesData);

      ipcMain.removeAllListeners('screen-picker-result');
      ipcMain.once('screen-picker-result', (event, sourceId) => {
        if (screenPickerCallback) {
          if (sourceId) {
            screenPickerCallback({ video: { id: sourceId, name: 'Screen' }, audio: 'loopback' });
          } else {
            screenPickerCallback(); // Cancelado
          }
          screenPickerCallback = null;
        }
      });
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

// IPC Handler to clear the URL and go back to setup
// IPC Handler to clear the URL and go back to setup
ipcMain.on('clear-server-url', (event) => {
  store.delete('sharkordServerUrl');
  if (mainWindow) {
    mainWindow.loadFile('index.html');
  }
});

// Fornece a versão do aplicativo para a UI
ipcMain.handle('get-version', () => {
  return app.getVersion();
});

// Setup autoUpdater logging
autoUpdater.on('update-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'Baixando...');
});
autoUpdater.on('update-not-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'Sem atualizações');
});
autoUpdater.on('error', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'Erro na busca');
});
autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'Pronto!');
});
