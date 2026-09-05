const { contextBridge, ipcRenderer, webFrame } = require('electron');

let globalAutoStart = false;
let globalTabsEnabled = false;
let globalMinimizeToTray = false;
let globalEnableNotifications = true;

contextBridge.exposeInMainWorld('sharkordDesktopApp', {
  isNotificationsEnabled: () => globalEnableNotifications,
  sendNotificationClick: () => {
    ipcRenderer.send('restore-app');
  },
  sendNotification: (title, options, notifId) => {
    ipcRenderer.send('show-notification', { title, body: options?.body, notifId });
  }
});

ipcRenderer.on('notification-clicked', (e, notifId) => {
  window.dispatchEvent(new CustomEvent('app-notify-click-' + notifId));
});

// Intercepta a Notification nativa e controla se ela pode ou não ser instanciada baseada nas configs do app
webFrame.executeJavaScript(`
  const OriginalNotification = window.Notification;
  window.Notification = function(title, options) {
    if (window.sharkordDesktopApp && window.sharkordDesktopApp.isNotificationsEnabled()) {
      const notifId = Date.now().toString() + Math.random().toString();
      window.sharkordDesktopApp.sendNotification(title, options, notifId);
      
      const fakeNotif = { close: () => {}, onclick: null, addEventListener: () => {}, removeEventListener: () => {} };
      
      window.addEventListener('app-notify-click-' + notifId, () => {
        if (typeof fakeNotif.onclick === 'function') fakeNotif.onclick();
      });
      
      return fakeNotif;
    }
    return { close: () => {}, onclick: null, addEventListener: () => {}, removeEventListener: () => {} };
  };
  window.Notification.permission = 'granted';
  window.Notification.requestPermission = function(cb) {
    if (cb) cb('granted');
    return Promise.resolve('granted');
  };

  // Intercepta Notificações disparadas por Service Workers (Push API)
  const applyRegistrationHook = (reg) => {
    if (!reg) return reg;
    const OriginalShowNotification = reg.showNotification;
    if (OriginalShowNotification && !reg._hookedBySharkord) {
      reg.showNotification = function(title, options) {
        if (window.sharkordDesktopApp && window.sharkordDesktopApp.isNotificationsEnabled()) {
          const notifId = Date.now().toString() + Math.random().toString();
          window.sharkordDesktopApp.sendNotification(title, options, notifId);
        }
        return Promise.resolve();
      };
      reg._hookedBySharkord = true;
    }
    return reg;
  };

  if (navigator && navigator.serviceWorker) {
    const originalReady = Object.getOwnPropertyDescriptor(navigator.serviceWorker.constructor.prototype, 'ready');
    if (originalReady && originalReady.get) {
      Object.defineProperty(navigator.serviceWorker.constructor.prototype, 'ready', {
        get: function() {
          return originalReady.get.call(this).then(reg => applyRegistrationHook(reg));
        }
      });
    }
    
    const originalGetRegistration = navigator.serviceWorker.getRegistration;
    navigator.serviceWorker.getRegistration = function(...args) {
      return originalGetRegistration.apply(this, args).then(reg => applyRegistrationHook(reg));
    };
    
    const originalRegister = navigator.serviceWorker.register;
    navigator.serviceWorker.register = function(...args) {
      return originalRegister.apply(this, args).then(reg => applyRegistrationHook(reg));
    };
  }
`);

contextBridge.exposeInMainWorld('electronAPI', {
  saveServerUrl: (url) => ipcRenderer.send('save-server-url', url),
  getRecentServers: () => ipcRenderer.invoke('get-recent-servers'),
  updateRecentServer: (oldUrl, newUrl) => ipcRenderer.send('update-recent-server', oldUrl, newUrl),
  getVersion: () => ipcRenderer.invoke('get-version'),
  onUpdateReady: (callback) => ipcRenderer.on('update-ready', callback),
  installUpdate: () => ipcRenderer.send('install-update'),
  manualCheckUpdate: () => ipcRenderer.send('manual-check-update'),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', callback),
  onConnectionError: (callback) => ipcRenderer.on('connection-error', callback),
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  toggleAutoStart: (enable) => ipcRenderer.invoke('toggle-auto-start', enable),
  getLanguage: () => ipcRenderer.invoke('get-language'),
  setLanguage: (lang) => ipcRenderer.send('set-language', lang),
  onLanguageChanged: (callback) => ipcRenderer.on('language-changed', (e, lang) => callback(lang)),
  getPreloadPath: () => ipcRenderer.invoke('get-preload-path'),
  getIndexPath: () => ipcRenderer.invoke('get-index-path'),
  getSavedUrl: () => ipcRenderer.invoke('get-saved-url'),
  getEnableTabs: () => ipcRenderer.invoke('get-enable-tabs'),
  onToggleTabBar: (callback) => ipcRenderer.on('toggle-tab-bar', (e, show) => callback(show)),
  getSavedTabs: () => ipcRenderer.invoke('get-saved-tabs'),
  getActiveTabIndex: () => ipcRenderer.invoke('get-active-tab-index'),
  saveTabs: (tabsList, activeIndex) => ipcRenderer.send('save-tabs', tabsList, activeIndex)
});

const translations = {
  'pt-BR': {
    welcomeTitle: 'Boas-vindas de volta!',
    welcomeDesc: 'Estamos muito animados em ver você novamente.',
    serverUrlLabel: 'URL do Servidor Sharkord <span class="text-[#fa777c]">*</span>',
    serverUrlPlaceholder: 'https://seu-servidor.com',
    errorInvalidUrl: 'Por favor, insira uma URL válida.',
    errorDomain: 'O domínio deve iniciar com sharkord.',
    urlHint: 'O endereço deve pertencer a um servidor válido e começar com o subdomínio <span class="text-white font-semibold">sharkord.</span> (ex: https://sharkord.dominio.com).',
    btnEnter: 'Entrar',
    btnConnecting: 'Conectando...',
    recentServers: 'Acessados Recentemente',
    helpPlatform: 'Problemas com a plataforma?',
    helpPlatformLink: 'Acesse o repositório oficial do Sharkord.',
    helpApp: 'Dúvidas sobre este App para Windows?',
    helpAppLink: 'Acesse o nosso repositório.',
    btnLeave: 'Sair do Servidor',
    btnUpdate: 'Verificar Atualizações',
    btnSettings: 'Configurações',
    modalLeaveTitle: 'Desconectar do Servidor',
    modalLeaveDesc: 'Tem certeza que deseja desconectar? Você precisará digitar a URL novamente caso queira voltar.<br><br><span class="sharkord-modal-warning">Nota:</span> Se houver transmissões ativas (Tela/Câmera), elas serão encerradas forçadamente ao sair.',
    modalLeaveConfirm: 'Sair e Desconectar',
    modalUpdateTitle: 'Central de Atualizações',
    modalUpdateReadyDesc: 'Uma nova atualização já foi baixada e está pronta.<br><br>O aplicativo será fechado para instalar a atualização agora.',
    modalUpdateSearchDesc: 'Deseja buscar por novas versões no servidor?',
    btnInstallNow: 'Instalar Agora',
    btnSearchUpdates: 'Buscar Atualizações',
    btnSearching: 'Buscando...',
    modalSettingsTitle: 'Configurações do App',
    modalSettingsDesc: 'Gerencie as configurações do Sharkord no seu sistema.',
    settingAutoStart: 'Iniciar com o Windows',
    settingMinimizeToTray: 'Continuar em segundo plano (Bandeja)',
    settingNotifications: 'Notificações (Desktop)',
    settingLanguage: 'Idioma / Language',
    modalCloseTitle: 'Deseja continuar recebendo notificações?',
    modalCloseDesc: 'Você pode alterar essa preferência a qualquer momento nas configurações do aplicativo.',
    settingCustomUpdateUrl: 'Link de Atualização (Opcional)',
    settingCustomUpdateUrlPlaceholder: 'https://sua-api.com/api/releases/latest',
    btnMinimize: 'Continuar em Segundo Plano',
    btnQuit: 'Fechar Completamente',
    btnCancel: 'Cancelar',
    btnClose: 'Fechar',
    btnSave: 'Salvar',
    btnSaving: 'Salvando...',
    updateStatusReady: 'Atualização Pronta',
    updateStatusSearching: 'Procurando atualizações no servidor. Aguarde...',
    updateStatusWait: 'Aguarde...',
    updateStatusNoUpdatesTitle: 'Você já está na versão mais recente!',
    updateStatusOk: 'OK',
    updateStatusReadyTitle: 'Download concluído! Instalar agora?',
    errorConn: 'Falha ao conectar ao servidor. Verifique a URL e tente novamente.',
    btnConnect: 'Conectar',
    screenPickerTitle: 'Escolha o que compartilhar',
    settingTabs: 'Habilitar Abas (Tabs)',
    modalRestartTitle: 'Reinício Necessário',
    modalRestartDesc: 'O aplicativo será reiniciado para aplicar essa configuração.'
  },
  'en-US': {
    welcomeTitle: 'Welcome back!',
    welcomeDesc: 'We are very excited to see you again.',
    serverUrlLabel: 'Sharkord Server URL <span class="text-[#fa777c]">*</span>',
    serverUrlPlaceholder: 'https://your-server.com',
    errorInvalidUrl: 'Please enter a valid URL.',
    errorDomain: 'The domain must start with sharkord.',
    urlHint: 'The address must belong to a valid server and start with the subdomain <span class="text-white font-semibold">sharkord.</span> (e.g. https://sharkord.domain.com).',
    btnEnter: 'Enter',
    btnConnecting: 'Connecting...',
    recentServers: 'Recently Accessed',
    helpPlatform: 'Problems with the platform?',
    helpPlatformLink: 'Access the official Sharkord repository.',
    helpApp: 'Questions about this Windows App?',
    helpAppLink: 'Access our repository.',
    btnLeave: 'Leave Server',
    btnUpdate: 'Check for Updates',
    btnSettings: 'Settings',
    modalLeaveTitle: 'Disconnect from Server',
    modalLeaveDesc: 'Are you sure you want to disconnect? You will need to enter the URL again if you want to return.<br><br><span class="sharkord-modal-warning">Note:</span> If there are active streams (Screen/Camera), they will be forcibly closed upon leaving.',
    modalLeaveConfirm: 'Leave and Disconnect',
    modalUpdateTitle: 'Update Center',
    modalUpdateReadyDesc: 'A new update has already been downloaded and is ready.<br><br>The application will be closed to install the update now.',
    modalUpdateSearchDesc: 'Do you want to check for new versions on the server?',
    btnInstallNow: 'Install Now',
    btnSearchUpdates: 'Check for Updates',
    btnSearching: 'Searching...',
    modalSettingsTitle: 'App Settings',
    modalSettingsDesc: 'Manage your Sharkord settings on your system.',
    settingAutoStart: 'Start with Windows',
    settingMinimizeToTray: 'Run in background (System Tray)',
    settingNotifications: 'Notifications (Desktop)',
    settingLanguage: 'Language / Idioma',
    modalCloseTitle: 'Do you want to continue receiving notifications?',
    modalCloseDesc: 'You can change this preference at any time in the app settings.',
    btnMinimize: 'Continue in Background',
    btnQuit: 'Close Completely',
    btnCancel: 'Cancel',
    btnClose: 'Close',
    btnSave: 'Save',
    btnSaving: 'Saving...',
    updateStatusReady: 'Update Ready',
    updateStatusSearching: 'Searching for updates on the server. Please wait...',
    updateStatusWait: 'Wait...',
    updateStatusNoUpdatesTitle: 'You are already on the latest version!',
    updateStatusOk: 'OK',
    updateStatusReadyTitle: 'Download complete! Install now?',
    errorConn: 'Failed to connect to the server. Check the URL and try again.',
    btnConnect: 'Connect',
    screenPickerTitle: 'Choose what to share',
    settingTabs: 'Enable Tabs',
    settingCustomUpdateUrl: 'Custom Update Link (Optional)',
    settingCustomUpdateUrlPlaceholder: 'https://your-api.com/api/releases/latest',
    modalRestartTitle: 'Restart Required',
    modalRestartDesc: 'The application will be restarted to apply this setting.'
  }
};

contextBridge.exposeInMainWorld('sharkordI18n', translations);


// Injeta lógica de atualização e botão flutuante na página web do Sharkord
window.addEventListener('DOMContentLoaded', async () => {
  try {
  // Configura a versão da tela inicial se ela existir
  const versionEl = document.getElementById('app-version');
  if (versionEl && window.electronAPI && window.electronAPI.getVersion) {
    window.electronAPI.getVersion().then(v => {
      versionEl.innerText = 'v' + v;
    }).catch(()=>{});
  }

  // Inject custom Tailwind-like CSS for modals and buttons em TODAS as páginas
  const style = document.createElement('style');
  style.innerHTML = `
    .sharkord-disconnect-btn {
        position: fixed; bottom: 80px; right: 0; z-index: 999999;
        padding: 10px 20px 10px 16px; background-color: #ef4444; color: #fff;
        border: none; border-radius: 12px 0 0 12px; cursor: pointer;
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        font-weight: 600; box-shadow: -4px 4px 16px rgba(0,0,0,0.4);
        opacity: 0.6; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
        transform: translateX(calc(100% - 28px));
        display: flex; align-items: center; gap: 12px;
      }
      .sharkord-disconnect-btn::before {
        content: "◀";
        font-size: 12px;
      }
      .sharkord-disconnect-btn:hover { 
        transform: translateX(0); 
        opacity: 1; 
      }
      .sharkord-update-btn {
        position: fixed; bottom: 130px; right: 0; z-index: 999999;
        padding: 10px 20px 10px 16px; background-color: #23a559; color: #fff;
        border: none; border-radius: 12px 0 0 12px; cursor: pointer;
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        font-weight: 600; box-shadow: -4px 4px 16px rgba(0,0,0,0.4);
        opacity: 0.6; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
        transform: translateX(calc(100% - 28px));
        display: flex; align-items: center; gap: 12px;
      }
      .sharkord-update-btn::before {
        content: "⟳";
        font-size: 14px;
        font-weight: bold;
      }
      .sharkord-update-btn:hover { 
        transform: translateX(0); 
        opacity: 1; 
      }
      .sharkord-settings-btn {
        position: fixed; bottom: 180px; right: 0; z-index: 999999;
        padding: 10px 20px 10px 16px; background-color: #5865F2; color: #fff;
        border: none; border-radius: 12px 0 0 12px; cursor: pointer;
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        font-weight: 600; box-shadow: -4px 4px 16px rgba(0,0,0,0.4);
        opacity: 0.6; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
        transform: translateX(calc(100% - 28px));
        display: flex; align-items: center; gap: 12px;
      }
      .sharkord-settings-btn::before {
        content: "⚙";
        font-size: 14px;
        font-weight: bold;
      }
      .sharkord-settings-btn:hover { 
        transform: translateX(0); 
        opacity: 1; 
      }
      .sharkord-toggle-switch {
        position: relative;
        display: inline-block;
        width: 40px;
        height: 24px;
      }
      .sharkord-toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .sharkord-toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: #80848e;
        transition: .3s;
        border-radius: 24px;
      }
      .sharkord-toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .3s;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      .sharkord-toggle-switch input:checked + .sharkord-toggle-slider {
        background-color: #5865F2;
      }
      .sharkord-toggle-switch input:checked + .sharkord-toggle-slider:before {
        transform: translateX(16px);
      }
      .sharkord-modal-overlay {
        position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(4px); z-index: 10000000;
        display: flex; align-items: center; justify-content: center;
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      }
      .sharkord-modal-box {
        background-color: #2b2d31; color: #dbdee1; padding: 24px;
        border-radius: 12px; width: 100%; max-width: 400px;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
      }
      .sharkord-modal-title { font-size: 1.25rem; font-weight: 700; color: #f2f3f5; margin-top: 0; margin-bottom: 8px; }
      .sharkord-modal-text { font-size: 0.875rem; margin-bottom: 24px; color: #b5bac1; line-height: 1.5; }
      .sharkord-modal-warning { color: #facc15; font-weight: 600; }
      .sharkord-modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
      .sharkord-modal-btn {
        padding: 8px 16px; border-radius: 4px; border: none;
        font-weight: 500; cursor: pointer; transition: background-color 0.2s;
      }
      .sharkord-modal-btn-cancel { background-color: transparent; color: #f2f3f5; }
      .sharkord-modal-btn-cancel:hover { text-decoration: underline; }
      .sharkord-modal-btn-confirm { background-color: #da373c; color: white; }
      .sharkord-modal-btn-confirm:hover { background-color: #a12828; }
      .sharkord-lang-btn {
        background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; transition: background-color 0.2s;
        display: flex; align-items: center; justify-content: center; opacity: 0.5;
      }
      .sharkord-lang-btn:hover { background-color: #3f4147; }
      .sharkord-lang-btn.active { opacity: 1; background-color: #3f4147; }
    `;
    document.head.appendChild(style);

  // Não injeta botões visuais na casca de abas (tabs-shell), apenas nos webviews
  if (window.location.pathname.endsWith('tabs-shell.html')) {
    return;
  }

  let currentLang = 'pt-BR';
  try {
    currentLang = await ipcRenderer.invoke('get-language');
  } catch(e) {}
  
  function t(key) {
    return translations[currentLang][key] || translations['pt-BR'][key] || key;
  }


  // Se estivermos dentro do servidor Sharkord, injetamos o botão de Sair
  if (window.location.protocol.startsWith('http')) {
    const btn = document.createElement('button');
    btn.className = 'sharkord-disconnect-btn';
    btn.innerText = t('btnLeave');
    
    btn.addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.className = 'sharkord-modal-overlay';
      
      const modal = document.createElement('div');
      modal.className = 'sharkord-modal-box';
      
      const title = document.createElement('h3');
      title.className = 'sharkord-modal-title';
      title.innerText = t('modalLeaveTitle');
      
      const text = document.createElement('p');
      text.className = 'sharkord-modal-text';
      text.innerHTML = t('modalLeaveDesc');
      
      const actions = document.createElement('div');
      actions.className = 'sharkord-modal-actions';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'sharkord-modal-btn sharkord-modal-btn-cancel';
      cancelBtn.innerText = t('btnCancel');
      cancelBtn.onclick = () => document.body.removeChild(overlay);
      
      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'sharkord-modal-btn sharkord-modal-btn-confirm';
      confirmBtn.innerText = t('modalLeaveConfirm');
      confirmBtn.onclick = () => {
        ipcRenderer.send('clear-server-url');
      };
      
      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      
      modal.appendChild(title);
      modal.appendChild(text);
      modal.appendChild(actions);
      overlay.appendChild(modal);
      
      document.body.appendChild(overlay);
    });
    
    document.body.appendChild(btn);
  }

  // Criação do botão manual de atualização visível (mesmo fora do servidor)
  const updateBtn = document.createElement('button');
  updateBtn.className = 'sharkord-update-btn';
  updateBtn.innerText = t('btnUpdate');
  
  // Status de update pronto
  let isUpdateReady = false;
  let updateModalOverlay = null;
  let updateModalText = null;
  let updateModalActionBtn = null;
  let updateModalCancelBtn = null;

  updateBtn.addEventListener('click', () => {
    // Cria o overlay do pop-up
    updateModalOverlay = document.createElement('div');
    updateModalOverlay.className = 'sharkord-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'sharkord-modal-box';
    
    const title = document.createElement('h3');
    title.className = 'sharkord-modal-title';
    title.innerText = t('modalUpdateTitle');
    
    updateModalText = document.createElement('p');
    updateModalText.className = 'sharkord-modal-text';
    
    if (isUpdateReady) {
      updateModalText.innerHTML = t('modalUpdateReadyDesc');
    } else {
      updateModalText.innerText = t('modalUpdateSearchDesc');
    }

    const actions = document.createElement('div');
    actions.className = 'sharkord-modal-actions';
    
    updateModalCancelBtn = document.createElement('button');
    updateModalCancelBtn.className = 'sharkord-modal-btn sharkord-modal-btn-cancel';
    updateModalCancelBtn.innerText = t('btnClose');
    updateModalCancelBtn.onclick = () => {
      document.body.removeChild(updateModalOverlay);
      updateModalOverlay = null;
    };
    actions.appendChild(updateModalCancelBtn);
    
    updateModalActionBtn = document.createElement('button');
    updateModalActionBtn.className = 'sharkord-modal-btn';
    
    if (isUpdateReady) {
      updateModalActionBtn.style.backgroundColor = '#23a559';
      updateModalActionBtn.style.color = 'white';
      updateModalActionBtn.innerText = t('btnInstallNow');
      updateModalActionBtn.onclick = () => ipcRenderer.send('install-update');
    } else {
      updateModalActionBtn.style.backgroundColor = '#5865F2';
      updateModalActionBtn.style.color = 'white';
      updateModalActionBtn.innerText = t('btnSearchUpdates');
      updateModalActionBtn.onclick = () => {
        updateModalActionBtn.innerText = t('btnSearching');
        updateModalActionBtn.disabled = true;
        updateModalText.innerText = t('updateStatusSearching');
        ipcRenderer.send('manual-check-update');
      };
    }
    actions.appendChild(updateModalActionBtn);
    
    modal.appendChild(title);
    modal.appendChild(updateModalText);
    modal.appendChild(actions);
    updateModalOverlay.appendChild(modal);
    
    document.body.appendChild(updateModalOverlay);
  });
  
  document.body.appendChild(updateBtn);

  // Verifica ao carregar a página se já tem atualização baixada
  ipcRenderer.invoke('is-update-ready').then(ready => {
    if (ready) {
      isUpdateReady = true;
      updateBtn.innerText = t('updateStatusReady');
      updateBtn.style.backgroundColor = '#23a559';
      updateBtn.style.transform = 'translateX(0)';
      updateBtn.style.opacity = '1';
    }
  }).catch(() => {});


  globalAutoStart = localStorage.getItem('sharkord_autostart') === 'true';

  // Pré-carrega no fundo para não travar quando clicar na engrenagem
  try {
    ipcRenderer.invoke('get-auto-start').then(res => { if(res !== undefined && res !== null) globalAutoStart = res; }).catch(()=>{});
    ipcRenderer.invoke('get-enable-tabs').then(res => { globalTabsEnabled = res; }).catch(()=>{});
    ipcRenderer.invoke('get-minimize-to-tray').then(res => { if(res !== undefined && res !== null) globalMinimizeToTray = res; }).catch(()=>{});
    ipcRenderer.invoke('get-enable-notifications').then(res => { if(res !== undefined && res !== null) globalEnableNotifications = res; }).catch(()=>{});
  } catch(err) {}

  // Criação do botão de configurações
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'sharkord-settings-btn';
  settingsBtn.innerText = t('btnSettings');

  settingsBtn.addEventListener('click', async () => {
    try {
      const minTray = await ipcRenderer.invoke('get-minimize-to-tray');
      if(minTray !== undefined && minTray !== null) globalMinimizeToTray = minTray;
    } catch(err) {}
    let isAutoStart = globalAutoStart;
    let isTabsEnabled = globalTabsEnabled;

    const overlay = document.createElement('div');
    overlay.className = 'sharkord-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'sharkord-modal-box';
    
    const title = document.createElement('h3');
    title.className = 'sharkord-modal-title';
    title.innerText = t('modalSettingsTitle');
    
    const text = document.createElement('p');
    text.className = 'sharkord-modal-text';
    text.innerText = t('modalSettingsDesc');

    // Container for toggle
    const toggleContainer = document.createElement('div');
    toggleContainer.style.display = 'flex';
    toggleContainer.style.justifyContent = 'space-between';
    toggleContainer.style.alignItems = 'center';
    toggleContainer.style.marginBottom = '12px';
    toggleContainer.style.padding = '12px';
    toggleContainer.style.backgroundColor = '#1e1f22';
    toggleContainer.style.borderRadius = '8px';

    const toggleLabel = document.createElement('span');
    toggleLabel.innerText = t('settingAutoStart');
    toggleLabel.style.color = '#dbdee1';
    toggleLabel.style.fontWeight = '500';

    const toggleWrapper = document.createElement('label');
    toggleWrapper.className = 'sharkord-toggle-switch';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = isAutoStart;

    const toggleSlider = document.createElement('span');
    toggleSlider.className = 'sharkord-toggle-slider';

    toggleWrapper.appendChild(toggleInput);
    toggleWrapper.appendChild(toggleSlider);

    toggleInput.addEventListener('change', (e) => {
      isAutoStart = e.target.checked;
    });

    toggleContainer.appendChild(toggleLabel);
    toggleContainer.appendChild(toggleWrapper);
    
    // Container for Tabs Enable
    const tabsContainer = document.createElement('div');
    tabsContainer.style.display = 'flex';
    tabsContainer.style.justifyContent = 'space-between';
    tabsContainer.style.alignItems = 'center';
    tabsContainer.style.marginBottom = '12px';
    tabsContainer.style.padding = '12px';
    tabsContainer.style.backgroundColor = '#1e1f22';
    tabsContainer.style.borderRadius = '8px';

    const tabsLabel = document.createElement('span');
    tabsLabel.innerText = t('settingTabs');
    tabsLabel.style.color = '#dbdee1';
    tabsLabel.style.fontWeight = '500';

    const tabsWrapper = document.createElement('label');
    tabsWrapper.className = 'sharkord-toggle-switch';

    const tabsInput = document.createElement('input');
    tabsInput.type = 'checkbox';
    tabsInput.checked = isTabsEnabled;

    const tabsSlider = document.createElement('span');
    tabsSlider.className = 'sharkord-toggle-slider';

    tabsWrapper.appendChild(tabsInput);
    tabsWrapper.appendChild(tabsSlider);

    tabsInput.addEventListener('change', (e) => {
      isTabsEnabled = e.target.checked;
    });

    tabsContainer.appendChild(tabsLabel);
    tabsContainer.appendChild(tabsWrapper);
    
    // Container for Minimize to Tray
    const minimizeContainer = document.createElement('div');
    minimizeContainer.style.display = 'flex';
    minimizeContainer.style.justifyContent = 'space-between';
    minimizeContainer.style.alignItems = 'center';
    minimizeContainer.style.marginBottom = '12px';
    minimizeContainer.style.padding = '12px';
    minimizeContainer.style.backgroundColor = '#1e1f22';
    minimizeContainer.style.borderRadius = '8px';

    const minimizeLabel = document.createElement('span');
    minimizeLabel.innerText = t('settingMinimizeToTray') || 'Continuar em segundo plano';
    minimizeLabel.style.color = '#dbdee1';
    minimizeLabel.style.fontWeight = '500';

    const minimizeWrapper = document.createElement('label');
    minimizeWrapper.className = 'sharkord-toggle-switch';

    const minimizeInput = document.createElement('input');
    minimizeInput.type = 'checkbox';
    minimizeInput.checked = globalMinimizeToTray;

    const minimizeSlider = document.createElement('span');
    minimizeSlider.className = 'sharkord-toggle-slider';

    minimizeWrapper.appendChild(minimizeInput);
    minimizeWrapper.appendChild(minimizeSlider);

    let isMinimizeToTray = globalMinimizeToTray;
    minimizeInput.addEventListener('change', (e) => {
      isMinimizeToTray = e.target.checked;
    });

    minimizeContainer.appendChild(minimizeLabel);
    minimizeContainer.appendChild(minimizeWrapper);

    // Container for Notifications
    const notifContainer = document.createElement('div');
    notifContainer.style.display = 'flex';
    notifContainer.style.justifyContent = 'space-between';
    notifContainer.style.alignItems = 'center';
    notifContainer.style.marginBottom = '12px';
    notifContainer.style.padding = '12px';
    notifContainer.style.backgroundColor = '#1e1f22';
    notifContainer.style.borderRadius = '8px';

    const notifLabel = document.createElement('span');
    notifLabel.innerText = t('settingNotifications') || 'Habilitar Notificações do App';
    notifLabel.style.color = '#dbdee1';
    notifLabel.style.fontWeight = '500';

    const notifWrapper = document.createElement('label');
    notifWrapper.className = 'sharkord-toggle-switch';

    const notifInput = document.createElement('input');
    notifInput.type = 'checkbox';
    notifInput.checked = globalEnableNotifications;

    const notifSlider = document.createElement('span');
    notifSlider.className = 'sharkord-toggle-slider';

    notifWrapper.appendChild(notifInput);
    notifWrapper.appendChild(notifSlider);

    let isEnableNotifications = globalEnableNotifications;
    notifInput.addEventListener('change', (e) => {
      isEnableNotifications = e.target.checked;
    });

    notifContainer.appendChild(notifLabel);
    notifContainer.appendChild(notifWrapper);

    // Container for language
    const langContainer = document.createElement('div');
    langContainer.style.display = 'flex';
    langContainer.style.justifyContent = 'space-between';
    langContainer.style.alignItems = 'center';
    langContainer.style.marginBottom = '24px';
    langContainer.style.padding = '12px';
    langContainer.style.backgroundColor = '#1e1f22';
    langContainer.style.borderRadius = '8px';

    const langLabel = document.createElement('span');
    langLabel.innerText = t('settingLanguage');
    langLabel.style.color = '#dbdee1';
    langLabel.style.fontWeight = '500';

    const langOptions = document.createElement('div');
    langOptions.style.display = 'flex';
    langOptions.style.gap = '8px';
    
    const ptBtn = document.createElement('button');
    ptBtn.className = 'sharkord-lang-btn' + (currentLang === 'pt-BR' ? ' active' : '');
    ptBtn.innerHTML = '<img src="https://flagcdn.com/w40/br.png" width="24" height="18" alt="Português (BR)">';
    ptBtn.title = 'Português (BR)';

    const enBtn = document.createElement('button');
    enBtn.className = 'sharkord-lang-btn' + (currentLang === 'en-US' ? ' active' : '');
    enBtn.innerHTML = '<img src="https://flagcdn.com/w40/us.png" width="24" height="18" alt="English (US)">';
    enBtn.title = 'English (US)';
    
    let selectedLang = currentLang;

    ptBtn.onclick = () => {
      selectedLang = 'pt-BR';
      ptBtn.classList.add('active');
      enBtn.classList.remove('active');
    };

    enBtn.onclick = () => {
      selectedLang = 'en-US';
      enBtn.classList.add('active');
      ptBtn.classList.remove('active');
    };

    langOptions.appendChild(ptBtn);
    langOptions.appendChild(enBtn);
    langContainer.appendChild(langLabel);
    langContainer.appendChild(langOptions);

    // Container for Custom Update URL
    const updateUrlContainer = document.createElement('div');
    updateUrlContainer.style.display = 'flex';
    updateUrlContainer.style.flexDirection = 'column';
    updateUrlContainer.style.gap = '8px';
    updateUrlContainer.style.marginBottom = '24px';
    updateUrlContainer.style.padding = '12px';
    updateUrlContainer.style.backgroundColor = '#1e1f22';
    updateUrlContainer.style.borderRadius = '8px';

    const updateUrlLabel = document.createElement('span');
    updateUrlLabel.innerText = t('settingCustomUpdateUrl') || 'Link de Atualização Personalizado';
    updateUrlLabel.style.color = '#dbdee1';
    updateUrlLabel.style.fontWeight = '500';

    const updateUrlInput = document.createElement('input');
    updateUrlInput.type = 'text';
    updateUrlInput.placeholder = t('settingCustomUpdateUrlPlaceholder') || 'https://sua-api.com/api/releases/latest';
    updateUrlInput.style.backgroundColor = '#2b2d31';
    updateUrlInput.style.color = '#dbdee1';
    updateUrlInput.style.border = '1px solid #1e1f22';
    updateUrlInput.style.padding = '10px';
    updateUrlInput.style.borderRadius = '4px';
    updateUrlInput.style.outline = 'none';
    updateUrlInput.style.width = '100%';
    
    // Fetch current custom URL
    ipcRenderer.invoke('get-custom-update-url').then(val => {
      if (val) updateUrlInput.value = val;
    }).catch(()=>{});

    updateUrlContainer.appendChild(updateUrlLabel);
    updateUrlContainer.appendChild(updateUrlInput);

    const actions = document.createElement('div');
    actions.className = 'sharkord-modal-actions';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'sharkord-modal-btn sharkord-modal-btn-cancel';
    cancelBtn.innerText = t('btnCancel');
    cancelBtn.onclick = () => document.body.removeChild(overlay);
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'sharkord-modal-btn';
    saveBtn.style.backgroundColor = '#5865F2';
    saveBtn.style.color = 'white';
    saveBtn.innerText = t('btnSave');
    saveBtn.onclick = async () => {
      saveBtn.innerText = t('btnSaving');
      saveBtn.disabled = true;
      try {
        await ipcRenderer.invoke('toggle-auto-start', isAutoStart);
        localStorage.setItem('sharkord_autostart', isAutoStart);
        globalAutoStart = isAutoStart;
        
        if (selectedLang !== currentLang) {
          ipcRenderer.send('set-language', selectedLang);
          currentLang = selectedLang;
          
          settingsBtn.innerText = t('btnSettings');
          if (updateBtn) updateBtn.innerText = isUpdateReady ? t('updateStatusReady') : t('btnUpdate');
          
          const disconnectBtn = document.querySelector('.sharkord-disconnect-btn');
          if (disconnectBtn) disconnectBtn.innerText = t('btnLeave');
        }

        const oldTabs = globalTabsEnabled;
        if (isTabsEnabled !== oldTabs) {
          await ipcRenderer.invoke('toggle-enable-tabs', isTabsEnabled);
          globalTabsEnabled = isTabsEnabled;
          if (isTabsEnabled) {
            ipcRenderer.send('switch-to-tabs-mode');
          } else {
            ipcRenderer.send('switch-to-single-mode');
          }
        }
        
        if (isMinimizeToTray !== globalMinimizeToTray) {
          await ipcRenderer.invoke('set-minimize-to-tray', isMinimizeToTray);
          globalMinimizeToTray = isMinimizeToTray;
        }

        if (isEnableNotifications !== globalEnableNotifications) {
          await ipcRenderer.invoke('set-enable-notifications', isEnableNotifications);
          globalEnableNotifications = isEnableNotifications;
        }

        await ipcRenderer.invoke('save-custom-update-url', updateUrlInput.value.trim());
      } catch (err) {
        alert('Erro ao salvar: ' + (err.message || err));
      }
      document.body.removeChild(overlay);
    };
    
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    
    modal.appendChild(title);
    modal.appendChild(text);
    modal.appendChild(toggleContainer);
    modal.appendChild(tabsContainer);
    modal.appendChild(minimizeContainer);
    modal.appendChild(notifContainer);
    modal.appendChild(langContainer);
    modal.appendChild(updateUrlContainer);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    
    document.body.appendChild(overlay);
  });
  document.body.appendChild(settingsBtn);

  // Escuta os status do processo (Baixando, Sem att, etc)
  ipcRenderer.on('update-status', (event, status) => {

    if (updateModalText && updateModalActionBtn) {
      updateModalText.innerText = status;
      if (status.startsWith('Baixando')) {
        updateModalActionBtn.innerText = t('updateStatusWait');
        updateModalActionBtn.disabled = true;
        updateModalActionBtn.style.backgroundColor = '#5865F2';
      } else if (status === 'Sem atualizações') {
        updateModalText.innerText = t('updateStatusNoUpdatesTitle');
        updateModalActionBtn.innerText = t('updateStatusOk');
        updateModalActionBtn.disabled = false;
        updateModalActionBtn.onclick = () => {
          document.body.removeChild(updateModalOverlay);
          updateModalOverlay = null;
        };
        if (updateModalCancelBtn) updateModalCancelBtn.style.display = 'none';
      } else if (status.startsWith('Erro')) {
        updateModalText.innerText = status;
        updateModalActionBtn.innerText = t('updateStatusOk');
        updateModalActionBtn.disabled = false;
        updateModalActionBtn.onclick = () => {
          document.body.removeChild(updateModalOverlay);
          updateModalOverlay = null;
        };
        if (updateModalCancelBtn) updateModalCancelBtn.style.display = 'none';
      } else if (status === 'Pronto!') {
        isUpdateReady = true;
        updateModalText.innerText = t('updateStatusReadyTitle');
        updateModalActionBtn.innerText = t('btnInstallNow');
        updateModalActionBtn.style.backgroundColor = '#23a559';
        updateModalActionBtn.disabled = false;
        updateModalActionBtn.onclick = () => ipcRenderer.send('install-update');
      }
    }
  });

  // Escuta se há atualizações prontas para instalar em segundo plano
  ipcRenderer.on('update-ready', () => {
    isUpdateReady = true;
    updateBtn.innerText = t('updateStatusReady');
    updateBtn.style.backgroundColor = '#23a559';
    updateBtn.style.transform = 'translateX(0)';
  });

  // Corrige problema no Electron onde arrastar elementos da UI tenta navegar
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
  });

  // Força abertura de links _blank no navegador externo com o botão esquerdo
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a && a.target === '_blank' && a.href) {
      e.preventDefault();
      ipcRenderer.send('open-external', a.href);
    }
  });

  } catch (err) {
    require('fs').writeFileSync(require('path').join(require('os').tmpdir(), 'sharkord_preload_error.log'), err.stack || err.toString());
    console.error('PRELOAD ERROR:', err);
  }
});

// UI do Seletor Visual de Telas
ipcRenderer.on('show-screen-picker', async (event, sources) => {
  let currentLang = 'pt-BR';
  try {
    currentLang = await ipcRenderer.invoke('get-language');
  } catch(e) {}
  const langTrans = translations[currentLang] || translations['pt-BR'];
  const pickerTitle = langTrans ? langTrans.screenPickerTitle : 'Escolha o que compartilhar';
  // Cria o overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  overlay.style.zIndex = '10000000';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.backdropFilter = 'blur(4px)';
  
  // Cria a caixa modal
  const modal = document.createElement('div');
  modal.style.backgroundColor = '#313338';
  modal.style.borderRadius = '12px';
  modal.style.width = '80%';
  modal.style.maxWidth = '900px';
  modal.style.maxHeight = '80vh';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
  modal.style.overflow = 'hidden';
  modal.style.fontFamily = 'sans-serif';
  
  // Header
  const header = document.createElement('div');
  header.style.padding = '20px 24px';
  header.style.borderBottom = '1px solid #1e1f22';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  
  const title = document.createElement('h2');
  title.innerText = pickerTitle;
  title.style.color = '#f2f3f5';
  title.style.margin = '0';
  title.style.fontSize = '20px';
  
  const closeBtn = document.createElement('button');
  closeBtn.innerText = '✕';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.color = '#b5bac1';
  closeBtn.style.fontSize = '20px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => {
    ipcRenderer.send('screen-picker-result', null);
    document.body.removeChild(overlay);
  };
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  modal.appendChild(header);
  
  // Tabs Container
  const tabsContainer = document.createElement('div');
  tabsContainer.style.display = 'flex';
  tabsContainer.style.borderBottom = '1px solid #1e1f22';
  tabsContainer.style.padding = '0 24px';
  tabsContainer.style.gap = '24px';
  
  const screensTab = document.createElement('div');
  screensTab.innerText = langTrans ? (langTrans.tabScreens || 'Telas') : 'Telas';
  screensTab.style.padding = '16px 0 12px 0';
  screensTab.style.color = '#f2f3f5';
  screensTab.style.cursor = 'pointer';
  screensTab.style.borderBottom = '2px solid #5865F2';
  screensTab.style.fontWeight = '500';
  
  const windowsTab = document.createElement('div');
  windowsTab.innerText = langTrans ? (langTrans.tabWindows || 'Aplicativos') : 'Aplicativos';
  windowsTab.style.padding = '16px 0 12px 0';
  windowsTab.style.color = '#b5bac1';
  windowsTab.style.cursor = 'pointer';
  windowsTab.style.borderBottom = '2px solid transparent';
  windowsTab.style.fontWeight = '500';
  
  tabsContainer.appendChild(screensTab);
  tabsContainer.appendChild(windowsTab);
  modal.appendChild(tabsContainer);

  // Lista (Grid)
  const gridContainer = document.createElement('div');
  gridContainer.style.padding = '24px';
  gridContainer.style.overflowY = 'auto';
  gridContainer.style.display = 'grid';
  gridContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
  gridContainer.style.gap = '20px';
  
  const renderSources = (filterType) => {
    gridContainer.innerHTML = '';
    const filteredSources = sources.filter(s => s.id.startsWith(filterType));
    
    filteredSources.forEach(source => {
      const card = document.createElement('div');
      card.style.backgroundColor = '#2b2d31';
      card.style.borderRadius = '8px';
      card.style.padding = '12px';
      card.style.cursor = 'pointer';
      card.style.transition = 'transform 0.2s, background-color 0.2s';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.alignItems = 'center';
      
      card.onmouseenter = () => {
        card.style.backgroundColor = '#3f4147';
        card.style.transform = 'scale(1.02)';
      };
      card.onmouseleave = () => {
        card.style.backgroundColor = '#2b2d31';
        card.style.transform = 'scale(1)';
      };
      
      card.onclick = () => {
        ipcRenderer.send('screen-picker-result', source.id);
        document.body.removeChild(overlay);
      };
      
      const img = document.createElement('img');
      img.src = source.thumbnailUrl;
      img.style.width = '100%';
      img.style.height = '120px';
      img.style.objectFit = 'contain';
      img.style.marginBottom = '12px';
      img.style.borderRadius = '4px';
      img.style.backgroundColor = '#000';
      
      const name = document.createElement('span');
      name.innerText = source.name;
      name.style.color = '#dbdee1';
      name.style.fontSize = '14px';
      name.style.textAlign = 'center';
      name.style.whiteSpace = 'nowrap';
      name.style.overflow = 'hidden';
      name.style.textOverflow = 'ellipsis';
      name.style.width = '100%';
      
      card.appendChild(img);
      card.appendChild(name);
      gridContainer.appendChild(card);
    });
  };
  
  screensTab.onclick = () => {
    screensTab.style.color = '#f2f3f5';
    screensTab.style.borderBottom = '2px solid #5865F2';
    windowsTab.style.color = '#b5bac1';
    windowsTab.style.borderBottom = '2px solid transparent';
    renderSources('screen:');
  };
  
  windowsTab.onclick = () => {
    windowsTab.style.color = '#f2f3f5';
    windowsTab.style.borderBottom = '2px solid #5865F2';
    screensTab.style.color = '#b5bac1';
    screensTab.style.borderBottom = '2px solid transparent';
    renderSources('window:');
  };
  
  // Initial render
  renderSources('screen:');
  
  modal.appendChild(gridContainer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
});

ipcRenderer.on('show-close-prompt', async () => {
  let currentLang = 'pt-BR';
  try {
    currentLang = await ipcRenderer.invoke('get-language');
  } catch(e) {}
  const t = (key) => (translations[currentLang] && translations[currentLang][key]) ? translations[currentLang][key] : (translations['pt-BR'][key] || key);

  const overlay = document.createElement('div');
  overlay.className = 'sharkord-modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'sharkord-modal-box';
  
  const title = document.createElement('h3');
  title.className = 'sharkord-modal-title';
  title.innerText = t('modalCloseTitle');
  
  const desc = document.createElement('p');
  desc.className = 'sharkord-modal-text';
  desc.innerText = t('modalCloseDesc');

  const actions = document.createElement('div');
  actions.className = 'sharkord-modal-actions';
  actions.style.flexDirection = 'column';
  actions.style.gap = '10px';

  const minimizeBtn = document.createElement('button');
  minimizeBtn.className = 'sharkord-modal-btn';
  minimizeBtn.style.backgroundColor = '#5865F2';
  minimizeBtn.style.color = 'white';
  minimizeBtn.style.width = '100%';
  minimizeBtn.style.marginBottom = '0';
  minimizeBtn.innerText = t('btnMinimize');
  minimizeBtn.onclick = () => {
    document.body.removeChild(overlay);
    ipcRenderer.send('close-prompt-response', true);
  };
  
  const quitBtn = document.createElement('button');
  quitBtn.className = 'sharkord-modal-btn sharkord-modal-btn-cancel';
  quitBtn.style.width = '100%';
  quitBtn.style.marginBottom = '0';
  quitBtn.style.backgroundColor = '#da373c';
  quitBtn.style.color = 'white';
  quitBtn.innerText = t('btnQuit');
  quitBtn.onclick = () => {
    document.body.removeChild(overlay);
    ipcRenderer.send('close-prompt-response', false);
  };
  
  actions.appendChild(minimizeBtn);
  actions.appendChild(quitBtn);
  
  modal.appendChild(title);
  modal.appendChild(desc);
  modal.appendChild(actions);
  overlay.appendChild(modal);
  
  document.body.appendChild(overlay);
});
