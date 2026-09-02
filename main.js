const { app, BrowserWindow, ipcMain, session, desktopCapturer, Menu, shell, webContents } = require('electron');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function broadcast(channel, ...args) {
  webContents.getAllWebContents().forEach(wc => {
    if (!wc.isDestroyed()) wc.send(channel, ...args);
  });
}
const { https } = require('follow-redirects');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

let store;
let mainWindow;
let downloadedExePath = null;

// Fix para lentidão da câmera no Windows
app.commandLine.appendSwitch('disable-features', 'MediaFoundationVideoCapture');

function compareVersions(v1, v2) {
  const cleanV1 = (v1 || '').replace(/^v/, '').trim();
  const cleanV2 = (v2 || '').replace(/^v/, '').trim();
  const parts1 = cleanV1.split('.').map(Number);
  const parts2 = cleanV2.split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const val1 = parts1[i] || 0;
    const val2 = parts2[i] || 0;
    if (val1 > val2) return 1;
    if (val1 < val2) return -1;
  }
  return 0;
}

function checkCustomGitHubUpdate() {
  broadcast('update-status', 'Buscando...');
  
  const options = {
    hostname: 'api.github.com',
    path: '/repos/thalisonnunes20/app-sharkord/releases/latest',
    headers: { 'User-Agent': 'Sharkord-App-Updater' }
  };

  const req = https.get(options, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      https.get(res.headers.location, { headers: { 'User-Agent': 'Sharkord-App-Updater' } }, parseReleaseResponse);
      return;
    }
    parseReleaseResponse(res);
  });

  req.on('error', (err) => {
    broadcast('update-status', 'Erro: ' + (err.message || err));
  });
}

function parseReleaseResponse(res) {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      if (res.statusCode !== 200) {
        broadcast('update-status', 'Erro no GitHub: HTTP ' + res.statusCode);
        return;
      }
      const release = JSON.parse(data);
      const latestVersion = release.tag_name || release.name || '';
      const currentVersion = app.getVersion();

      if (compareVersions(latestVersion, currentVersion) > 0) {
        const exeAsset = (release.assets || []).find(a => a.name && a.name.endsWith('.exe') && !a.name.endsWith('.blockmap'));
        if (!exeAsset) {
          broadcast('update-status', 'Erro: Executável não encontrado na release');
          return;
        }
        downloadUpdateFile(exeAsset.browser_download_url, exeAsset.name);
      } else {
        broadcast('update-status', 'Sem atualizações');
      }
    } catch (err) {
      broadcast('update-status', 'Erro ao ler dados: ' + err.message);
    }
  });
}

function downloadUpdateFile(fileUrl, fileName) {
  broadcast('update-status', 'Baixando');
  
  const tempPath = path.join(app.getPath('temp'), fileName);
  downloadedExePath = tempPath;

  const downloadRequest = (url) => {
    https.get(url, { headers: { 'User-Agent': 'Sharkord-App-Updater' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadRequest(res.headers.location);
        return;
      }

      if (res.statusCode !== 200) {
        broadcast('update-status', 'Erro no download: HTTP ' + res.statusCode);
        return;
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;
      const fileStream = fs.createWriteStream(tempPath);

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        fileStream.write(chunk);
        if (totalBytes > 0) {
          const percent = Math.round((downloadedBytes / totalBytes) * 100);
          broadcast('update-status', `Baixando: ${percent}%`);
        }
      });

      res.on('end', () => {
        fileStream.end();
        broadcast('update-ready');
        broadcast('update-status', 'Pronto!');
      });
    }).on('error', (err) => {
      broadcast('update-status', 'Erro no download: ' + err.message);
    });
  };

  downloadRequest(fileUrl);
}

// IPC Handlers para atualização
ipcMain.on('install-update', () => {
  if (downloadedExePath && fs.existsSync(downloadedExePath)) {
    spawn(downloadedExePath, ['/S', '--force-run'], { detached: true, stdio: 'ignore' }).unref();
    app.quit();
  }
});

ipcMain.on('manual-check-update', () => {
  checkCustomGitHubUpdate();
});

ipcMain.handle('is-update-ready', () => {
  return downloadedExePath && fs.existsSync(downloadedExePath);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true
    },
    autoHideMenuBar: true,
    show: false // Don't show until ready-to-show
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    checkCustomGitHubUpdate();
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
      
      if (!urlObj.hostname.startsWith('sharkord.') && urlObj.hostname !== 'demo.sharkord.com') {
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

      if (mainWindow) mainWindow.webContents.send('show-screen-picker', sourcesData);

      ipcMain.removeAllListeners('screen-picker-result');
      ipcMain.once('screen-picker-result', (event, sourceId) => {
        if (screenPickerCallback) {
          if (sourceId) {
            const selectedSource = sources.find(s => s.id === sourceId);
            screenPickerCallback({ video: selectedSource || { id: sourceId, name: 'Screen' }, audio: 'loopback' });
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

  mainWindow.loadFile('tabs-shell.html');

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
        path: process.execPath,
        args: app.isPackaged ? [] : [app.getAppPath()]
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
  
  // Atualiza histórico de servidores recentes (max 3)
  let recents = store.get('recentServers') || [];
  recents = recents.filter(item => item !== url); // Remove se já existir para colocar no topo
  recents.unshift(url);
  if (recents.length > 3) recents = recents.slice(0, 3);
  store.set('recentServers', recents);

  event.sender.loadURL(url);
});

ipcMain.handle('get-recent-servers', () => {
  return store.get('recentServers') || [];
});

ipcMain.on('update-recent-server', (event, oldUrl, newUrl) => {
  let recents = store.get('recentServers') || [];
  const index = recents.indexOf(oldUrl);
  if (index !== -1) {
    recents[index] = newUrl;
    store.set('recentServers', recents);
  }
});

// IPC Handler to clear the URL and go back to setup
ipcMain.on('clear-server-url', (event) => {
  store.delete('sharkordServerUrl');
  event.sender.loadFile(path.join(__dirname, 'index.html'));
});

ipcMain.handle('get-preload-path', () => path.join(__dirname, 'preload.js'));
ipcMain.handle('get-index-path', () => path.join(__dirname, 'index.html'));
ipcMain.handle('get-saved-url', () => store.get('sharkordServerUrl'));
ipcMain.handle('get-enable-tabs', () => store.get('enableTabs') || false);
ipcMain.handle('toggle-enable-tabs', (e, enable) => { store.set('enableTabs', enable); return enable; });
ipcMain.on('switch-to-tabs-mode', () => {
  if (mainWindow) mainWindow.webContents.send('toggle-tab-bar', true);
});
ipcMain.on('switch-to-single-mode', () => {
  if (mainWindow) mainWindow.webContents.send('toggle-tab-bar', false);
});
ipcMain.on('open-external', (e, url) => {
  shell.openExternal(url);
});
ipcMain.on('relaunch-app', () => {
  app.relaunch();
  app.quit();
});

// Fornece a versão do aplicativo para a UI
ipcMain.handle('get-version', () => {
  return app.getVersion();
});

// Configuração de inicialização com o Windows
ipcMain.handle('get-auto-start', () => {
  if (store) {
    return store.get('autoStart') || false;
  }
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('toggle-auto-start', (event, enable) => {
  const isEnabled = enable === true;
  
  if (store) {
    store.set('autoStart', isEnabled);
  }
  
  try {
    app.setLoginItemSettings({
      openAtLogin: isEnabled,
      path: process.execPath,
      args: app.isPackaged ? [] : [app.getAppPath()]
    });
  } catch (err) {
    console.error('Erro ao definir auto-start:', err);
  }
  
  return isEnabled;
});

// Language support
ipcMain.handle('get-language', () => {
  if (store) {
    return store.get('language') || 'pt-BR';
  }
  return 'pt-BR';
});

ipcMain.on('set-language', (event, lang) => {
  if (store) {
    store.set('language', lang);
  }
  broadcast('language-changed', lang);
});

app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    contents.on('will-prevent-unload', (e) => e.preventDefault());
    contents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
    contents.on('will-navigate', (e, url) => {
      try {
        const urlObj = new URL(url);
        if (urlObj.protocol === 'file:') return;
        if (!urlObj.hostname.startsWith('sharkord.') && urlObj.hostname !== 'demo.sharkord.com') {
          e.preventDefault();
          console.warn(`Navegação bloqueada na aba para: ${url}`);
        }
      } catch (err) {}
    });
    contents.on('did-fail-load', (e, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (isMainFrame && errorCode !== -3) {
        contents.loadFile(path.join(__dirname, 'index.html'));
        contents.once('did-finish-load', () => {
          contents.send('connection-error', errorDescription);
        });
      }
    });
  }
});

ipcMain.handle('get-saved-tabs', () => {
  if (store) {
    return store.get('savedTabs') || [];
  }
  return [];
});

ipcMain.handle('get-active-tab-index', () => {
  if (store) {
    return store.get('activeTabIndex') || 0;
  }
  return 0;
});

ipcMain.on('save-tabs', (event, tabsList, activeIndex) => {
  if (store) {
    store.set('savedTabs', tabsList);
    if (activeIndex !== undefined) {
      store.set('activeTabIndex', activeIndex);
    }
  }
});

