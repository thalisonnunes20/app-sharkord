const { app, BrowserWindow, ipcMain, session, desktopCapturer, Menu, Tray, shell, webContents, dialog, Notification, screen } = require('electron');

if (process.platform === 'win32') {
  app.setAppUserModelId(app.isPackaged ? 'com.sharkord.app' : process.execPath);
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setAlwaysOnTop(false);
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
let tray = null;
let forceQuit = false;
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
      webviewTag: true,
      backgroundThrottling: false
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

  mainWindow.on('close', function (event) {
    if (forceQuit || !store) return;

    if (!store.has('minimizeToTray')) {
      event.preventDefault();
      mainWindow.webContents.send('show-close-prompt');
    } else if (store.get('minimizeToTray')) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Configura um User-Agent de navegador padrão para evitar bloqueio de CDNs (ex: avatares e banners)
  app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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

  // Criação da Bandeja de Sistema
  let trayMenuWindow = null;
  const iconPath = path.join(__dirname, 'icon.png');
  if (fs.existsSync(iconPath)) {
    tray = new Tray(iconPath);
    tray.setToolTip('Sharkord');

    const menuWidth = 180;
    const menuHeight = 90;
    
    trayMenuWindow = new BrowserWindow({
      width: menuWidth,
      height: menuHeight,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const trayHtml = `
      <html style="background: transparent;">
        <body style="margin: 0; padding: 5px; background: transparent; height: 100%; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; user-select: none;">
          <div style="background-color: #2b2d31; color: #dbdee1; font-family: 'Segoe UI', sans-serif; font-weight: 400; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 4px 12px rgba(0,0,0,0.5); width: 100%; height: 100%; display: flex; flex-direction: column; padding: 4px; box-sizing: border-box;">
            <div onclick="require('electron').ipcRenderer.send('tray-action-open')" style="padding: 8px 12px; font-size: 13px; border-radius: 4px; cursor: pointer; transition: background-color 0.1s, color 0.1s;" onmouseover="this.style.backgroundColor='#5865F2'; this.style.color='#fff'" onmouseout="this.style.backgroundColor='transparent'; this.style.color='#dbdee1'">
              Abrir Sharkord
            </div>
            <div style="height: 1px; background-color: rgba(255,255,255,0.06); margin: 2px 8px;"></div>
            <div onclick="require('electron').ipcRenderer.send('tray-action-quit')" style="padding: 8px 12px; font-size: 13px; border-radius: 4px; cursor: pointer; color: #fa777c; transition: background-color 0.1s, color 0.1s;" onmouseover="this.style.backgroundColor='#fa777c'; this.style.color='#fff'" onmouseout="this.style.backgroundColor='transparent'; this.style.color='#fa777c'">
              Sair
            </div>
          </div>
        </body>
      </html>
    `;
    trayMenuWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(trayHtml));

    trayMenuWindow.on('blur', () => {
      trayMenuWindow.hide();
    });

    const showCustomMenu = () => {
      const { x, y } = screen.getCursorScreenPoint();
      trayMenuWindow.setPosition(x - menuWidth + 10, y - menuHeight);
      trayMenuWindow.show();
      trayMenuWindow.focus();
    };

    tray.on('right-click', showCustomMenu);
    tray.on('click', () => {
      if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
    });
    
    ipcMain.on('tray-action-open', () => {
      trayMenuWindow.hide();
      if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
    });
    
    ipcMain.on('tray-action-quit', () => {
      forceQuit = true;
      app.quit();
    });
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  forceQuit = true;
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
ipcMain.handle('get-minimize-to-tray', () => store.get('minimizeToTray', false));
ipcMain.handle('set-minimize-to-tray', (e, val) => { store.set('minimizeToTray', val); return val; });
ipcMain.handle('get-enable-notifications', () => store.get('enableNotifications', true));
ipcMain.handle('set-enable-notifications', (e, val) => { store.set('enableNotifications', val); return val; });

ipcMain.on('restore-app', () => {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.focus();
  }
});

let notificationWindow = null;
let currentNotifId = null;
let hideTimeout = null;

ipcMain.on('custom-notification-clicked', () => {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.focus();
    
    if (currentNotifId) {
      mainWindow.webContents.send('notification-clicked', currentNotifId);
    }
  }
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.hide();
  }
});

ipcMain.on('dismiss-notification', () => {
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.hide();
  }
});

ipcMain.on('show-notification', (event, { title, body, notifId }) => {
  currentNotifId = notifId;
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const notifWidth = 320;
  const notifHeight = 85;

  if (!notificationWindow || notificationWindow.isDestroyed()) {
    notificationWindow = new BrowserWindow({
      width: notifWidth,
      height: notifHeight,
      x: width - notifWidth - 20,
      y: height - notifHeight - 20,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      resizable: false,
      icon: path.join(__dirname, 'icon.png'),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const htmlContent = `
      <html style="background: transparent;">
        <body style="margin:0; padding:10px; background: transparent; height: 100%; box-sizing: border-box; overflow: hidden; display: flex; justify-content: center; align-items: center; user-select: none;">
          <div id="wrapper" style="position: relative; left: 0px; background-color: #2b2d31; color: #f2f3f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 8px 16px rgba(0,0,0,0.6); width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 0 15px; box-sizing: border-box; transition: background-color 0.2s, left 0.1s; cursor: grab;" onmouseover="this.style.backgroundColor='#313338'" onmouseout="this.style.backgroundColor='#2b2d31'">
            <strong id="n-title" style="font-size: 14px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; margin-bottom: 4px; pointer-events: none;">Sharkord</strong>
            <div id="n-body" style="font-size: 13px; color: #b5bac1; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; pointer-events: none;">Nova mensagem</div>
          </div>
          <script>
            const { ipcRenderer } = require('electron');
            const wrapper = document.getElementById('wrapper');
            let isDragging = false;
            let startX = 0;
            let currentLeft = 0;

            window.playNotifSound = () => {
              try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const playOsc = (freq, startTime) => {
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.type = 'sine';
                  osc.frequency.setValueAtTime(freq, startTime);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start(startTime);
                  gain.gain.setValueAtTime(0, startTime);
                  gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
                  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
                  osc.stop(startTime + 0.4);
                };
                playOsc(659.25, ctx.currentTime);
                playOsc(880.00, ctx.currentTime + 0.12);
              } catch(e) {}
            };

            window.updateContent = (t, b) => {
              document.getElementById('n-title').innerText = t;
              document.getElementById('n-body').innerText = b;
              wrapper.style.transition = 'background-color 0.2s, left 0.2s';
              wrapper.style.left = '0px';
              wrapper.style.opacity = '1';
              window.playNotifSound();
            };

            document.body.addEventListener('mousedown', (e) => {
              isDragging = true;
              startX = e.clientX;
              wrapper.style.transition = 'none';
              wrapper.style.cursor = 'grabbing';
            });

            document.body.addEventListener('mousemove', (e) => {
              if (!isDragging) return;
              currentLeft = e.clientX - startX;
              if (currentLeft > 0) {
                wrapper.style.left = currentLeft + 'px';
                wrapper.style.opacity = Math.max(0, 1 - (currentLeft / 200));
              }
            });

            document.body.addEventListener('mouseup', (e) => {
              if (!isDragging) return;
              isDragging = false;
              wrapper.style.cursor = 'grab';
              if (currentLeft > 100) {
                wrapper.style.transition = 'left 0.2s, opacity 0.2s';
                wrapper.style.left = '320px';
                wrapper.style.opacity = '0';
                setTimeout(() => ipcRenderer.send('dismiss-notification'), 200);
              } else if (currentLeft < 5) {
                ipcRenderer.send('custom-notification-clicked');
                wrapper.style.transition = 'left 0.2s';
                wrapper.style.left = '0px';
              } else {
                wrapper.style.transition = 'left 0.2s, opacity 0.2s';
                wrapper.style.left = '0px';
                wrapper.style.opacity = '1';
              }
              currentLeft = 0;
            });
            
            document.body.addEventListener('mouseleave', () => {
               if (isDragging) {
                  isDragging = false;
                  wrapper.style.transition = 'left 0.2s, opacity 0.2s';
                  wrapper.style.left = '0px';
                  wrapper.style.opacity = '1';
                  wrapper.style.cursor = 'grab';
                  currentLeft = 0;
               }
            });
          </script>
        </body>
      </html>
    `;
    notificationWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    
    notificationWindow.webContents.once('did-finish-load', () => {
      const safeTitle = (title || 'Sharkord').replace(/"/g, '\\"');
      const safeBody = (body || 'Nova mensagem').replace(/"/g, '\\"');
      notificationWindow.webContents.executeJavaScript(`window.updateContent("${safeTitle}", "${safeBody}");`);
      notificationWindow.showInactive();
    });
  } else {
    const safeTitle = (title || 'Sharkord').replace(/"/g, '\\"');
    const safeBody = (body || 'Nova mensagem').replace(/"/g, '\\"');
    notificationWindow.webContents.executeJavaScript(`window.updateContent("${safeTitle}", "${safeBody}");`);
    if (!notificationWindow.isVisible()) {
      notificationWindow.showInactive();
    }
  }

  if (hideTimeout) clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    if (notificationWindow && !notificationWindow.isDestroyed()) {
      notificationWindow.hide();
    }
  }, 6000);
});

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

ipcMain.on('close-prompt-response', (event, minimize) => {
  if (store) store.set('minimizeToTray', minimize);
  if (minimize) {
    if (mainWindow) mainWindow.hide();
  } else {
    forceQuit = true;
    app.quit();
  }
});
