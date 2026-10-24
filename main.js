const { app, BrowserWindow, ipcMain, dialog, shell, Menu, globalShortcut, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { scanProject } = require('./scanner');
const { generateReadmeContentMain, regenerateAISectionMain } = require('./ai-service');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'README Generator',
    icon: path.join(__dirname, 'renderer', 'assets', 'icon.png'), // placeholder icon
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow) mainWindow.webContents.toggleDevTools();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- Secure Config Storage Helper ---
const configPath = path.join(app.getPath('userData'), 'secure_config.json');

function readConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading secure config:', e);
  }
  return {};
}

function writeConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing secure config:', e);
  }
}

// --- IPC Handlers ---

// Secure key storage handlers
ipcMain.handle('store-key', async (event, { name, value }) => {
  const config = readConfig();
  if (value && safeStorage.isEncryptionAvailable()) {
    try {
      const encrypted = safeStorage.encryptString(value);
      config[name] = encrypted.toString('base64');
    } catch (e) {
      console.error('Encryption failed, fallback to plain text:', e);
      config[name] = value;
    }
  } else {
    config[name] = value;
  }
  writeConfig(config);
  return { success: true };
});

ipcMain.handle('get-key', async (event, { name }) => {
  const config = readConfig();
  const val = config[name];
  if (!val) return '';
  if (safeStorage.isEncryptionAvailable()) {
    try {
      const buf = Buffer.from(val, 'base64');
      return safeStorage.decryptString(buf);
    } catch (e) {
      return val;
    }
  }
  return val;
});

// Folder the user last picked via the dialog; the only place write-file may write to
let selectedProjectFolder = null;

// IPC Handler: Folder Selection
ipcMain.handle('select-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Project Folder to Analyze'
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  selectedProjectFolder = path.resolve(result.filePaths[0]);
  return result.filePaths[0];
});

let activeScanAbortController = null;

// IPC Handler: Scan Folder with progress & cancellation
ipcMain.handle('scan-project', async (event, folderPath, modelName) => {
  if (activeScanAbortController) {
    activeScanAbortController.abort();
  }
  const controller = new AbortController();
  activeScanAbortController = controller;
  const signal = controller.signal;

  try {
    const stats = await scanProject(
      folderPath, 
      (progressData) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('scan-progress', progressData);
        }
      }, 
      signal,
      modelName
    );
    selectedProjectFolder = path.resolve(folderPath);
    return { success: true, data: stats };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Scan cancelled by user', aborted: true };
    }
    return { success: false, error: error.message };
  } finally {
    if (activeScanAbortController === controller) activeScanAbortController = null;
  }
});

// IPC Handler: Cancel Scan
ipcMain.handle('cancel-scan', () => {
  if (activeScanAbortController) {
    activeScanAbortController.abort();
    activeScanAbortController = null;
    return true;
  }
  return false;
});

let activeGenerationAbortController = null;
const activeSectionAbortControllers = new Set();

function getStoredApiKeys() {
  const config = readConfig();
  const getDecryptedKey = (name) => {
    const val = config[name];
    if (!val) return '';
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buf = Buffer.from(val, 'base64');
        return safeStorage.decryptString(buf);
      } catch (e) {
        return val;
      }
    }
    return val;
  };

  return {
    apiKey: getDecryptedKey('gemini_api_key'),
    claudeKey: getDecryptedKey('claude_api_key'),
    openaiKey: getDecryptedKey('openai_api_key')
  };
}

// IPC Handler: Generate README using AI
ipcMain.handle('generate-readme', async (event, { stats, options }) => {
  if (activeGenerationAbortController) {
    activeGenerationAbortController.abort();
  }
  const controller = new AbortController();
  activeGenerationAbortController = controller;

  try {
    const result = await generateReadmeContentMain(
      { stats, options, ...getStoredApiKeys() },
      (progressTitle, progressDesc) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('generation-progress', { title: progressTitle, desc: progressDesc });
        }
      },
      controller.signal
    );
    return {
      success: result.success,
      resultText: result.resultText,
      thinkingText: result.thinkingText,
      truncated: result.truncated,
      aborted: result.aborted,
      error: result.error
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Generation cancelled by user.', aborted: true };
    }
    return { success: false, error: error.message };
  } finally {
    if (activeGenerationAbortController === controller) activeGenerationAbortController = null;
  }
});

// IPC Handler: Cancel Generation (also stops any section regeneration in flight)
ipcMain.handle('cancel-generation', () => {
  let cancelled = false;
  if (activeGenerationAbortController) {
    activeGenerationAbortController.abort();
    activeGenerationAbortController = null;
    cancelled = true;
  }
  for (const controller of activeSectionAbortControllers) {
    controller.abort();
    cancelled = true;
  }
  return cancelled;
});

// IPC Handler: Regenerate Single Section
ipcMain.handle('regenerate-section', async (event, { sectionId, sectionTitle, currentContent, stats, instructions, options }) => {
  const controller = new AbortController();
  activeSectionAbortControllers.add(controller);

  try {
    return await regenerateAISectionMain({
      sectionId,
      sectionTitle,
      currentContent,
      stats,
      instructions,
      options,
      ...getStoredApiKeys()
    }, undefined, controller.signal);
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    activeSectionAbortControllers.delete(controller);
  }
});

// IPC Handler: Write file
const WRITABLE_PROJECT_FILES = ['readme.md', '.gitignore'];
ipcMain.handle('write-file', async (event, { filePath, content }) => {
  try {
    if (!selectedProjectFolder || typeof filePath !== 'string' || typeof content !== 'string') {
      return { success: false, error: 'Write not allowed: no project folder selected.' };
    }
    const target = path.resolve(filePath);
    const sameDir = path.dirname(target).toLowerCase() === selectedProjectFolder.toLowerCase();
    if (!sameDir || !WRITABLE_PROJECT_FILES.includes(path.basename(target).toLowerCase())) {
      return { success: false, error: 'Write not allowed: only README.md and .gitignore in the selected project folder can be written.' };
    }
    if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) {
      return { success: false, error: 'Write not allowed: target is a symbolic link.' };
    }
    fs.writeFileSync(target, content, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC Handler: Save file dialog
ipcMain.handle('save-file-dialog', async (event, { defaultName, content, title, filters }) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: title || 'Save File',
    defaultPath: defaultName,
    filters: filters || [{ name: 'All Files', extensions: ['*'] }]
  });

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }

  try {
    fs.writeFileSync(result.filePath, content, 'utf8');
    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC Handler: Export PDF (uses temp file to avoid long URL issues)
ipcMain.handle('export-pdf-dialog', async (event, { htmlContent, defaultName }) => {
  if (!mainWindow) return { success: false, error: 'No window' };
  
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export to PDF',
    defaultPath: defaultName || 'README.pdf',
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
  });

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }

  let printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const formattedHtml = `
    <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            padding: 40px;
            color: #24292e;
            line-height: 1.5;
            font-size: 14px;
          }
          h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
            border-bottom: 1px solid #eaecef;
            padding-bottom: 0.3em;
          }
          code {
            padding: 0.2em 0.4em;
            margin: 0;
            font-size: 85%;
            background-color: rgba(27,31,35,0.05);
            border-radius: 3px;
            font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
          }
          pre {
            padding: 16px;
            overflow: auto;
            font-size: 85%;
            line-height: 1.45;
            background-color: #f6f8fa;
            border-radius: 3px;
          }
          pre code {
            background-color: transparent;
            padding: 0;
            font-size: 100%;
          }
          blockquote {
            padding: 0 1em;
            color: #6a737d;
            border-left: 0.25em solid #dfe2e5;
            margin: 0 0 16px 0;
          }
          table {
            border-spacing: 0;
            border-collapse: collapse;
            margin-bottom: 16px;
            width: 100%;
          }
          table th, table td {
            padding: 6px 13px;
            border: 1px solid #dfe2e5;
          }
          table tr:nth-child(even) {
            background-color: #f6f8fa;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `;

  const tempFilePath = path.join(os.tmpdir(), `readme-export-${Date.now()}.html`);

  try {
    fs.writeFileSync(tempFilePath, formattedHtml, 'utf8');
    await printWindow.loadFile(tempFilePath);
    
    const pdfData = await printWindow.webContents.printToPDF({
      margins: { top: 36, bottom: 36, left: 36, right: 36 },
      pageSize: 'A4',
      printBackground: true
    });
    
    fs.writeFileSync(result.filePath, pdfData);
    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}
    }
    if (printWindow) {
      printWindow.close();
      printWindow = null;
    }
  }
});

// IPC Handler: Open External URL in user browser
ipcMain.on('open-external-url', (event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
  }
});
