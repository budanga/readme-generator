const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanProject: (folderPath) => ipcRenderer.invoke('scan-project', folderPath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', { filePath, content }),
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  exportPdfDialog: (options) => ipcRenderer.invoke('export-pdf-dialog', options),
  openExternalUrl: (url) => ipcRenderer.send('open-external-url', url)
});
