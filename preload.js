const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanProject: (folderPath, modelName) => ipcRenderer.invoke('scan-project', folderPath, modelName),
  cancelScan: () => ipcRenderer.invoke('cancel-scan'),
  
  onScanProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('scan-progress', subscription);
    return () => ipcRenderer.removeListener('scan-progress', subscription);
  },
  
  onGenerationProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('generation-progress', subscription);
    return () => ipcRenderer.removeListener('generation-progress', subscription);
  },
  
  generateReadme: (payload) => ipcRenderer.invoke('generate-readme', payload),
  cancelGeneration: () => ipcRenderer.invoke('cancel-generation'),
  regenerateSection: (payload) => ipcRenderer.invoke('regenerate-section', payload),

  saveKey: (name, value) => ipcRenderer.invoke('store-key', { name, value }),
  getKey: (name) => ipcRenderer.invoke('get-key', { name }),

  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', { filePath, content }),
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  exportPdfDialog: (options) => ipcRenderer.invoke('export-pdf-dialog', options),
  openExternalUrl: (url) => ipcRenderer.send('open-external-url', url)
});
