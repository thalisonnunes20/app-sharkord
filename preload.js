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
