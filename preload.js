const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveServerUrl: (url) => ipcRenderer.send('save-server-url', url)
});

// Injeta um botão flutuante de desconectar na página web do Sharkord
window.addEventListener('DOMContentLoaded', () => {
  if (window.location.protocol.startsWith('http')) {
    const btn = document.createElement('button');
    btn.innerText = 'Sair do Servidor';
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '999999';
    btn.style.padding = '8px 16px';
    btn.style.backgroundColor = '#fa777c';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.style.fontFamily = 'sans-serif';
    btn.style.fontWeight = 'bold';
    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    btn.style.opacity = '0.3';
    btn.style.transition = 'opacity 0.2s';
    
    btn.addEventListener('mouseenter', () => btn.style.opacity = '1');
    btn.addEventListener('mouseleave', () => btn.style.opacity = '0.3');
    
    btn.addEventListener('click', () => {
      if(confirm('Tem certeza que deseja desconectar deste servidor? Você precisará digitar a URL novamente.')) {
        ipcRenderer.send('clear-server-url');
      }
    });
    
    document.body.appendChild(btn);
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
