const { app, BrowserWindow, ipcMain, session, desktopCapturer, Menu, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// Configura o feed do GitHub explicitamente no autoUpdater
try {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'thalisonnunes20',
    repo: 'app-sharkord'
  });
} catch (e) {
  console.error('Erro ao configurar feedURL:', e);
}

let store;

let mainWindow;

// Fix para lentidão da câmera no Windows
app.commandLine.appendSwitch('disable-features', 'MediaFoundationVideoCapture');

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
    autoUpdater.checkForUpdates().catch(err => {
      console.log('Update check ignored/failed (likely dev mode):', err.message);
    });
  });

  autoUpdater.on('checking-for-update', () => {
    if (mainWindow) mainWindow.webContents.send('update-status', 'Buscando...');
  });

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('update-status', 'Baixando');
  });

  autoUpdater.on('update-not-available', () => {
    if (mainWindow) mainWindow.webContents.send('update-status', 'Sem atualizações');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let percent = Math.round(progressObj.percent);
    if (mainWindow) mainWindow.webContents.send('update-status', `Baixando: ${percent}%`);
  });

  autoUpdater.on('update-downloaded', () => {
    if (mainWindow) mainWindow.webContents.send('update-ready');
    if (mainWindow) mainWindow.webContents.send('update-status', 'Pronto!');
  });

  autoUpdater.on('error', (err) => {
    if (mainWindow) mainWindow.webContents.send('update-status', 'Erro: ' + (err.message || err));
  });

  // Handle install command from UI
  ipcMain.on('install-update', () => {
    // Instalacao totalmente silenciosa (isSilent = true) e reinicia o app no final (isForceRunAfter = true)
    autoUpdater.quitAndInstall(true, true);
  });

  // Handle manual check command from UI
  ipcMain.on('manual-check-update', () => {
    try {
      autoUpdater.checkForUpdates().then(result => {
        if (result === null) {
          if (mainWindow) mainWindow.webContents.send('update-status', 'Erro: Não foi possível checar (Modo dev?)');
        }
      }).catch(err => {
        console.error('Erro na busca manual:', err);
        if (mainWindow) mainWindow.webContents.send('update-status', 'Erro: ' + (err.message || err));
      });
    } catch (err) {
      if (mainWindow) mainWindow.webContents.send('update-status', 'Erro fatal: ' + err.message);
    }
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

  // Impede navegação para domínios não autorizados (whitelist)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol === 'file:') return; // Permite index.html local
      
      if (!urlObj.hostname.startsWith('sharkord.')) {
        event.preventDefault();
        console.warn(`Navegação bloqueada para: ${url}`);
      }
    } catch (e) {}
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

  // Força o Windows a respeitar a configuração salva
  try {
    if (store.has('autoStart')) {
      const autoStartVal = Boolean(store.get('autoStart'));
      app.setLoginItemSettings({
        openAtLogin: autoStartVal,
        path: process.execPath
      });
    }
  } catch (err) {
    console.error('Erro ao aplicar autoStart no boot:', err);
  }

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
  
  // Atualiza histórico de servidores recentes (max 2)
  let recents = store.get('recentServers') || [];
  recents = recents.filter(item => item !== url); // Remove se já existir para colocar no topo
  recents.unshift(url);
  if (recents.length > 2) recents = recents.slice(0, 2);
  store.set('recentServers', recents);

  if (mainWindow) {
    mainWindow.loadURL(url);
  }
});

ipcMain.handle('get-recent-servers', () => {
  return store.get('recentServers') || [];
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

// Configuração de inicialização com o Windows
ipcMain.handle('get-auto-start', () => {
  if (store) {
    const val = store.get('autoStart') || false;
    require('fs').appendFileSync(path.join(__dirname, 'debug.txt'), 'Get Auto Start called. Returning from store: ' + val + '\\n');
    return val;
  }
  const val2 = app.getLoginItemSettings().openAtLogin;
  require('fs').appendFileSync(path.join(__dirname, 'debug.txt'), 'Get Auto Start called. Store undefined, returning: ' + val2 + '\\n');
  return val2;
});

ipcMain.handle('toggle-auto-start', (event, enable) => {
  require('fs').appendFileSync(path.join(__dirname, 'debug.txt'), 'Toggle Auto Start called: ' + enable + '\\n');
  const isEnabled = enable === true;
  
  if (store) {
    store.set('autoStart', isEnabled);
    require('fs').appendFileSync(path.join(__dirname, 'debug.txt'), 'Store set completed.\\n');
  }
  
  try {
    app.setLoginItemSettings({
      openAtLogin: isEnabled,
      path: process.execPath
    });
  } catch (err) {
    console.error('Erro ao definir auto-start:', err);
  }
  
  return isEnabled;
});

// Setup autoUpdater logging
autoUpdater.on('update-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'Baixando...');
});
autoUpdater.on('update-not-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'Sem atualizações');
});
autoUpdater.on('download-progress', (progressObj) => {
  const percent = Math.round(progressObj.percent);
  if (mainWindow) mainWindow.webContents.send('update-status', `Baixando... ${percent}%`);
});
autoUpdater.on('error', (err) => {
  const msg = err == null ? 'Erro desconhecido' : (err.message || err);
  if (mainWindow) mainWindow.webContents.send('update-status', 'Erro: ' + msg);
});
autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'Pronto!');
});
