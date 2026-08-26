const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveServerUrl: (url) => ipcRenderer.send('save-server-url', url),
  getRecentServers: () => ipcRenderer.invoke('get-recent-servers'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  onUpdateReady: (callback) => ipcRenderer.on('update-ready', callback),
  installUpdate: () => ipcRenderer.send('install-update'),
  manualCheckUpdate: () => ipcRenderer.send('manual-check-update'),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', callback),
  onConnectionError: (callback) => ipcRenderer.on('connection-error', callback),
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  toggleAutoStart: (enable) => ipcRenderer.invoke('toggle-auto-start', enable)
});

// Injeta lógica de atualização e botão flutuante na página web do Sharkord
window.addEventListener('DOMContentLoaded', async () => {
  // Configura a versão da tela inicial se ela existir
  const versionEl = document.getElementById('app-version');
  if (versionEl && window.electronAPI && window.electronAPI.getVersion) {
    const v = await window.electronAPI.getVersion();
    versionEl.innerText = 'v' + v;
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
    `;
    document.head.appendChild(style);

  // Se estivermos dentro do servidor Sharkord, injetamos o botão de Sair
  if (window.location.protocol.startsWith('http')) {
    const btn = document.createElement('button');
    btn.className = 'sharkord-disconnect-btn';
    btn.innerText = 'Sair do Servidor';
    
    btn.addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.className = 'sharkord-modal-overlay';
      
      const modal = document.createElement('div');
      modal.className = 'sharkord-modal-box';
      
      const title = document.createElement('h3');
      title.className = 'sharkord-modal-title';
      title.innerText = 'Desconectar do Servidor';
      
      const text = document.createElement('p');
      text.className = 'sharkord-modal-text';
      text.innerHTML = 'Tem certeza que deseja desconectar? Você precisará digitar a URL novamente caso queira voltar.<br><br><span class="sharkord-modal-warning">Nota:</span> Se houver transmissões ativas (Tela/Câmera), elas serão encerradas forçadamente ao sair.';
      
      const actions = document.createElement('div');
      actions.className = 'sharkord-modal-actions';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'sharkord-modal-btn sharkord-modal-btn-cancel';
      cancelBtn.innerText = 'Cancelar';
      cancelBtn.onclick = () => document.body.removeChild(overlay);
      
      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'sharkord-modal-btn sharkord-modal-btn-confirm';
      confirmBtn.innerText = 'Sair e Desconectar';
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
  updateBtn.innerText = 'Verificar Atualizações';
  
  // Status de update pronto
  let isUpdateReady = false;
  let updateModalOverlay = null;
  let updateModalText = null;
  let updateModalActionBtn = null;

  updateBtn.addEventListener('click', () => {
    // Cria o overlay do pop-up
    updateModalOverlay = document.createElement('div');
    updateModalOverlay.className = 'sharkord-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'sharkord-modal-box';
    
    const title = document.createElement('h3');
    title.className = 'sharkord-modal-title';
    title.innerText = 'Central de Atualizações';
    
    updateModalText = document.createElement('p');
    updateModalText.className = 'sharkord-modal-text';
    
    if (isUpdateReady) {
      updateModalText.innerHTML = 'Uma nova atualização já foi baixada e está pronta.<br><br>O aplicativo será fechado para instalar a atualização agora.';
    } else {
      updateModalText.innerText = 'Deseja buscar por novas versões no servidor?';
    }

    const actions = document.createElement('div');
    actions.className = 'sharkord-modal-actions';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'sharkord-modal-btn sharkord-modal-btn-cancel';
    cancelBtn.innerText = 'Fechar';
    cancelBtn.onclick = () => {
      document.body.removeChild(updateModalOverlay);
      updateModalOverlay = null;
    };
    actions.appendChild(cancelBtn);
    
    updateModalActionBtn = document.createElement('button');
    updateModalActionBtn.className = 'sharkord-modal-btn';
    
    if (isUpdateReady) {
      updateModalActionBtn.style.backgroundColor = '#23a559';
      updateModalActionBtn.style.color = 'white';
      updateModalActionBtn.innerText = 'Instalar Agora';
      updateModalActionBtn.onclick = () => window.electronAPI.installUpdate();
    } else {
      updateModalActionBtn.style.backgroundColor = '#5865F2';
      updateModalActionBtn.style.color = 'white';
      updateModalActionBtn.innerText = 'Buscar Atualizações';
      updateModalActionBtn.onclick = () => {
        updateModalActionBtn.innerText = 'Buscando...';
        updateModalActionBtn.disabled = true;
        updateModalText.innerText = 'Procurando atualizações no servidor. Aguarde...';
        window.electronAPI.manualCheckUpdate();
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

  // Criação do botão de configurações
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'sharkord-settings-btn';
  settingsBtn.innerText = 'Configurações';

  settingsBtn.addEventListener('click', async () => {
    // Busca o status atual salvo no localStorage (para funcionar visualmente no modo dev)
    let isAutoStart = localStorage.getItem('sharkord_autostart') === 'true';
    
    // Tenta sincronizar com o backend
    if (window.electronAPI && window.electronAPI.getAutoStart) {
      try {
        const backendState = await window.electronAPI.getAutoStart();
        if (backendState !== undefined && backendState !== null) {
          isAutoStart = backendState;
        }
      } catch(err) {}
    }

    const overlay = document.createElement('div');
    overlay.className = 'sharkord-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'sharkord-modal-box';
    
    const title = document.createElement('h3');
    title.className = 'sharkord-modal-title';
    title.innerText = 'Configurações do App';
    
    const text = document.createElement('p');
    text.className = 'sharkord-modal-text';
    text.innerText = 'Gerencie as configurações do Sharkord no seu sistema.';

    // Container for toggle
    const toggleContainer = document.createElement('div');
    toggleContainer.style.display = 'flex';
    toggleContainer.style.justifyContent = 'space-between';
    toggleContainer.style.alignItems = 'center';
    toggleContainer.style.marginBottom = '24px';
    toggleContainer.style.padding = '12px';
    toggleContainer.style.backgroundColor = '#1e1f22';
    toggleContainer.style.borderRadius = '8px';

    const toggleLabel = document.createElement('span');
    toggleLabel.innerText = 'Iniciar com o Windows';
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

    // Controle explícito do clique para evitar bugs do navegador com labels
    toggleWrapper.addEventListener('click', (e) => {
      e.preventDefault(); // Evita que o clique dispare o checkbox nativamente 2 vezes
      isAutoStart = !isAutoStart;
      toggleInput.checked = isAutoStart;
    });

    toggleContainer.appendChild(toggleLabel);
    toggleContainer.appendChild(toggleWrapper);

    const actions = document.createElement('div');
    actions.className = 'sharkord-modal-actions';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'sharkord-modal-btn sharkord-modal-btn-cancel';
    cancelBtn.innerText = 'Cancelar';
    cancelBtn.onclick = () => document.body.removeChild(overlay);
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'sharkord-modal-btn';
    saveBtn.style.backgroundColor = '#5865F2';
    saveBtn.style.color = 'white';
    saveBtn.innerText = 'Salvar';
    saveBtn.onclick = async () => {
      saveBtn.innerText = 'Salvando...';
      saveBtn.disabled = true;
      try {
        if (window.electronAPI && window.electronAPI.toggleAutoStart) {
          await window.electronAPI.toggleAutoStart(isAutoStart);
        }
        // Salva localmente para a interface lembrar (já que o Windows não retorna status em modo Dev)
        localStorage.setItem('sharkord_autostart', isAutoStart);
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
    modal.appendChild(actions);
    overlay.appendChild(modal);
    
    document.body.appendChild(overlay);
  });
  document.body.appendChild(settingsBtn);

  // Escuta os status do processo (Baixando, Sem att, etc)
  if (window.electronAPI && window.electronAPI.onUpdateStatus) {
    window.electronAPI.onUpdateStatus((event, status) => {
      // Abre a janela sozinho se estiver baixando ou pronto
      if (!updateModalOverlay && status !== 'Sem atualizações' && !status.startsWith('Erro')) {
        updateBtn.click();
      }

      if (updateModalText && updateModalActionBtn) {
        updateModalText.innerText = status;
        if (status.startsWith('Baixando...')) {
          updateModalActionBtn.innerText = 'Aguarde...';
          updateModalActionBtn.disabled = true;
          updateModalActionBtn.style.backgroundColor = '#5865F2';
        } else if (status === 'Sem atualizações') {
          updateModalText.innerText = 'Você já está na versão mais recente!';
          updateModalActionBtn.innerText = 'OK';
          updateModalActionBtn.disabled = false;
          updateModalActionBtn.onclick = () => {
            document.body.removeChild(updateModalOverlay);
            updateModalOverlay = null;
          };
        } else if (status.startsWith('Erro')) {
          updateModalText.innerText = status;
          updateModalActionBtn.innerText = 'OK';
          updateModalActionBtn.disabled = false;
          updateModalActionBtn.onclick = () => {
            document.body.removeChild(updateModalOverlay);
            updateModalOverlay = null;
          };
        } else if (status === 'Pronto!') {
          isUpdateReady = true;
          updateModalText.innerText = 'Download concluído! Instalar agora?';
          updateModalActionBtn.innerText = 'Instalar Agora';
          updateModalActionBtn.style.backgroundColor = '#23a559';
          updateModalActionBtn.disabled = false;
          updateModalActionBtn.onclick = () => window.electronAPI.installUpdate();
        }
      }
    });
  }

  // Escuta se há atualizações prontas para instalar em segundo plano
  if (window.electronAPI && window.electronAPI.onUpdateReady) {
    window.electronAPI.onUpdateReady(() => {
      isUpdateReady = true;
      updateBtn.innerText = 'Atualização Pronta';
      updateBtn.style.backgroundColor = '#f59e0b';
      updateBtn.style.transform = 'translateX(0)';
    });
  }
});

// UI do Seletor Visual de Telas
ipcRenderer.on('show-screen-picker', (event, sources) => {
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
  title.innerText = 'Escolha o que compartilhar';
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
  
  // Lista (Grid)
  const gridContainer = document.createElement('div');
  gridContainer.style.padding = '24px';
  gridContainer.style.overflowY = 'auto';
  gridContainer.style.display = 'grid';
  gridContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
  gridContainer.style.gap = '20px';
  
  sources.forEach(source => {
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
  
  modal.appendChild(gridContainer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
});
