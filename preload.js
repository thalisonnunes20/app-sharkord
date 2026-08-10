const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveServerUrl: (url) => ipcRenderer.send('save-server-url', url)
});
