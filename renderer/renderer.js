// Frontend Controller for README Generator

// Application State
const state = {
  projectPath: '',
  projectName: '',
  stats: null,
  sections: [], // { id, title, content }
  activeTab: 'dashboard',
  regenSectionId: null,
  scrollSource: null,
  customInstructions: '',
  customInstructionsEnabled: true
};

// DOM Elements
const elements = {
  // Navigation
  navDashboard: document.getElementById('nav-dashboard'),
  navEditor: document.getElementById('nav-editor'),
  navHistory: document.getElementById('nav-history'),
  navSettings: document.getElementById('nav-settings'),
  
  // Sidebars
  sidebarDashboard: document.getElementById('sidebar-dashboard'),
  sidebarEditor: document.getElementById('sidebar-editor'),
  sidebarHistory: document.getElementById('sidebar-history'),
  sidebarSettings: document.getElementById('sidebar-settings'),
  
  // Views
  viewDashboard: document.getElementById('view-dashboard'),
  viewEditor: document.getElementById('view-editor'),
  viewHistory: document.getElementById('view-history'),
  viewSettings: document.getElementById('view-settings'),
  
  // Buttons
  btnSelectProject: document.getElementById('btn-select-project'),
  btnWelcomeSelect: document.getElementById('btn-welcome-select'),
  btnTriggerScan: document.getElementById('btn-trigger-scan'),
  btnGenerateAi: document.getElementById('btn-generate-ai'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  btnResetSettings: document.getElementById('btn-reset-settings'),
  btnAddSection: document.getElementById('btn-add-section'),
  btnCopyClipboard: document.getElementById('btn-copy-clipboard'),
  btnExportDropdown: document.getElementById('btn-export-dropdown'),
  
  // Export Menu Items
  exportDropdownMenu: document.getElementById('export-dropdown-menu'),
  exportFileReadme: document.getElementById('export-file-readme'),
  exportFileMarkdown: document.getElementById('export-file-markdown'),
  exportFileHtml: document.getElementById('export-file-html'),
  exportFilePdf: document.getElementById('export-file-pdf'),
  
  // Modals
  modalRegenInstruction: document.getElementById('modal-regen-instruction'),
  modalRegenSectionTitle: document.getElementById('modal-regen-section-title'),
  modalRegenPromptInput: document.getElementById('modal-regen-prompt-input'),
  modalRegenClose: document.getElementById('modal-regen-close'),
  modalRegenCancel: document.getElementById('modal-regen-cancel'),
  modalRegenSubmit: document.getElementById('modal-regen-submit'),
  
  modalAddSection: document.getElementById('modal-add-section'),
  modalAddTitleInput: document.getElementById('modal-add-title-input'),
  modalAddContentInput: document.getElementById('modal-add-content-input'),
  modalAddClose: document.getElementById('modal-add-close'),
  modalAddCancel: document.getElementById('modal-add-cancel'),
  modalAddSubmit: document.getElementById('modal-add-submit'),
  
  // Custom Instructions Modal
  btnCustomInstructions: document.getElementById('btn-custom-instructions'),
  instructionsIndicator: document.getElementById('instructions-indicator'),
  modalCustomInstructions: document.getElementById('modal-custom-instructions'),
  modalCustomInstructionsInput: document.getElementById('modal-custom-instructions-input'),
  modalCustomInstructionsEnable: document.getElementById('modal-custom-instructions-enable'),
  modalCustomInstructionsClose: document.getElementById('modal-custom-instructions-close'),
  modalCustomInstructionsCancel: document.getElementById('modal-custom-instructions-cancel'),
  modalCustomInstructionsSave: document.getElementById('modal-custom-instructions-save'),
  
  // Error Modal
  modalError: document.getElementById('modal-error'),
  modalErrorTitle: document.getElementById('modal-error-title'),
  modalErrorMessage: document.getElementById('modal-error-message'),
  modalErrorDetails: document.getElementById('modal-error-details'),
  modalErrorClose: document.getElementById('modal-error-close'),
  modalErrorCloseBtn: document.getElementById('modal-error-close-btn'),
  modalErrorCopy: document.getElementById('modal-error-copy'),
  modalErrorCopyText: document.getElementById('modal-error-copy-text'),
  
  // Consent Modal
  modalConsent: document.getElementById('modal-consent'),
  modalConsentClose: document.getElementById('modal-consent-close'),
  modalConsentCancel: document.getElementById('modal-consent-cancel'),
  modalConsentConfirm: document.getElementById('modal-consent-confirm'),
  consentProvider: document.getElementById('consent-provider'),
  consentModel: document.getElementById('consent-model'),
  consentChars: document.getElementById('consent-chars'),
  consentFilesList: document.getElementById('consent-files-list'),
  
  // Cancel Scan Button
  btnCancelScan: document.getElementById('btn-cancel-scan'),
  scanProgressStatus: document.getElementById('scan-progress-status'),
  
  // Global Info / Stats
  currentProjectName: document.getElementById('current-project-name'),
  currentProjectPath: document.getElementById('current-project-path'),
  dashboardWelcome: document.getElementById('dashboard-welcome'),
  dashboardLoading: document.getElementById('dashboard-loading'),
  dashboardStats: document.getElementById('dashboard-stats'),
  themeToggle: document.getElementById('theme-toggle'),
  themeCardDark: document.getElementById('theme-card-dark'),
  themeCardLight: document.getElementById('theme-card-light'),
  
  // Dashboard Specific elements
  statLoc: document.getElementById('stat-loc'),
  statFiles: document.getElementById('stat-files'),
  statLang: document.getElementById('stat-lang'),
  languagesChart: document.getElementById('languages-chart'),
  statFramework: document.getElementById('stat-framework'),
  statPackageManager: document.getElementById('stat-package-manager'),
  statEntryPoint: document.getElementById('stat-entry-point'),
  statComplexity: document.getElementById('stat-complexity'),
  statDependenciesList: document.getElementById('stat-dependencies-list'),
  statLargestFiles: document.getElementById('stat-largest-files'),
  architectureMermaid: document.getElementById('architecture-mermaid'),
  alertsContainer: document.getElementById('alerts-container'),
  treeContainer: document.getElementById('tree-container'),
  
  // Editor Specific elements
  editorSectionsContainer: document.getElementById('editor-sections-container'),
  previewMarkdownContainer: document.getElementById('preview-markdown-container'),
  sectionsList: document.getElementById('sections-list'),
  
  // Settings Inputs
  settingsAiProvider: document.getElementById('settings-ai-provider'),
  settingsGroupGemini: document.getElementById('settings-group-gemini'),
  settingsGroupClaude: document.getElementById('settings-group-claude'),
  settingsGroupOpenai: document.getElementById('settings-group-openai'),
  settingsGroupOllama: document.getElementById('settings-group-ollama'),
  settingsApiKey: document.getElementById('settings-api-key'),
  settingsApiModel: document.getElementById('settings-api-model'),
  settingsClaudeKey: document.getElementById('settings-claude-key'),
  settingsClaudeModel: document.getElementById('settings-claude-model'),
  settingsOpenaiKey: document.getElementById('settings-openai-key'),
  settingsOpenaiModel: document.getElementById('settings-openai-model'),
  settingsAiStyle: document.getElementById('settings-ai-style'),
  settingsOllamaUrl: document.getElementById('settings-ollama-url'),
  settingsOllamaModel: document.getElementById('settings-ollama-model'),
  btnRefreshOllama: document.getElementById('btn-refresh-ollama'),
  ollamaStatusText: document.getElementById('ollama-status-text'),
  
  // History Inputs
  compareOldSelect: document.getElementById('compare-old-select'),
  compareNewSelect: document.getElementById('compare-new-select'),
  btnRunCompare: document.getElementById('btn-run-compare'),
  diffOutputContainer: document.getElementById('diff-output-container'),
  historyList: document.getElementById('history-list')
};

// Initialize Libraries
if (window.mermaid) {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    securityLevel: 'loose',
    logLevel: 5
  });
}

// Custom Marked Renderer for Mermaid diagram integration
if (window.marked) {
  marked.use({
    renderer: {
      code(codeObj) {
        // In marked v12, codeObj can be an object or a string depending on the invocation.
        let lang = '';
        let text = '';
        if (typeof codeObj === 'object' && codeObj !== null) {
          lang = codeObj.lang || '';
          text = codeObj.text || '';
        } else {
          // Fallback if marked version passes arguments positionally
          text = arguments[0] || '';
          lang = arguments[1] || '';
        }
        
        if (lang === 'mermaid') {
          return `<pre class="mermaid-diagram-code" style="display:none;">${text}</pre><div class="mermaid-preview-container"></div>`;
        }
        return false; // use default code renderer
      }
    }
  });
}

// ----------------- INITS & APP ROUTING -----------------
async function initApp() {
  await loadSettings();
  setupEventListeners();
  updateHistoryViews();
}

async function loadSettings() {
  const provider = localStorage.getItem('ai_provider') || 'gemini';
  
  // Retrieve keys from main process secure config, fall back to / migrate from localStorage
  let apiKey = await window.api.getKey('gemini_api_key');
  if (!apiKey && localStorage.getItem('gemini_api_key')) {
    apiKey = localStorage.getItem('gemini_api_key');
    await window.api.saveKey('gemini_api_key', apiKey);
    localStorage.removeItem('gemini_api_key');
  }

  let claudeKey = await window.api.getKey('claude_api_key');
  if (!claudeKey && localStorage.getItem('claude_api_key')) {
    claudeKey = localStorage.getItem('claude_api_key');
    await window.api.saveKey('claude_api_key', claudeKey);
    localStorage.removeItem('claude_api_key');
  }

  let openaiKey = await window.api.getKey('openai_api_key');
  if (!openaiKey && localStorage.getItem('openai_api_key')) {
    openaiKey = localStorage.getItem('openai_api_key');
    await window.api.saveKey('openai_api_key', openaiKey);
    localStorage.removeItem('openai_api_key');
  }

  const model = localStorage.getItem('gemini_model') || 'gemini-3.5-flash';
  const style = localStorage.getItem('gemini_ai_style') || 'balanced';
  const ollamaUrl = localStorage.getItem('ollama_url') || 'http://localhost:11434';
  const ollamaModel = localStorage.getItem('ollama_model') || '';
  const claudeModel = localStorage.getItem('claude_model') || 'claude-sonnet-4-5';
  const openaiModel = localStorage.getItem('openai_model') || 'gpt-4o';
  const theme = localStorage.getItem('app_theme') || 'dark-theme';
  const customInstructions = localStorage.getItem('gemini_custom_instructions') || '';
  const customInstructionsEnabled = localStorage.getItem('gemini_custom_instructions_enabled') !== 'false';

  elements.settingsAiProvider.value = provider;
  elements.settingsApiKey.value = apiKey;
  elements.settingsApiModel.value = model;
  elements.settingsAiStyle.value = style;
  elements.settingsOllamaUrl.value = ollamaUrl;
  elements.settingsClaudeKey.value = claudeKey;
  elements.settingsClaudeModel.value = claudeModel;
  elements.settingsOpenaiKey.value = openaiKey;
  elements.settingsOpenaiModel.value = openaiModel;
  
  state.customInstructions = customInstructions;
  state.customInstructionsEnabled = customInstructionsEnabled;
  elements.modalCustomInstructionsInput.value = customInstructions;
  elements.modalCustomInstructionsEnable.checked = customInstructionsEnabled;
  updateInstructionsIndicator();
  
  if (ollamaModel) {
    elements.settingsOllamaModel.innerHTML = '';
    const opt = new Option(ollamaModel, ollamaModel);
    elements.settingsOllamaModel.add(opt);
    elements.settingsOllamaModel.value = ollamaModel;
  }
  
  toggleProviderGroups(provider);

  // Apply theme
  document.body.className = theme;
  updateThemeUI(theme);
}

function updateInstructionsIndicator() {
  if (state.customInstructions && state.customInstructions.trim()) {
    elements.instructionsIndicator.classList.remove('hidden');
    if (state.customInstructionsEnabled) {
      elements.instructionsIndicator.style.backgroundColor = 'var(--success-color)';
    } else {
      elements.instructionsIndicator.style.backgroundColor = 'var(--text-muted)';
    }
  } else {
    elements.instructionsIndicator.classList.add('hidden');
  }
}

function toggleProviderGroups(provider) {
  const allGroups = [elements.settingsGroupGemini, elements.settingsGroupClaude, elements.settingsGroupOpenai, elements.settingsGroupOllama];
  allGroups.forEach(g => g.classList.add('hidden'));
  if (provider === 'gemini') elements.settingsGroupGemini.classList.remove('hidden');
  else if (provider === 'claude') elements.settingsGroupClaude.classList.remove('hidden');
  else if (provider === 'openai') elements.settingsGroupOpenai.classList.remove('hidden');
  else if (provider === 'ollama') elements.settingsGroupOllama.classList.remove('hidden');
}

function updateThemeUI(theme) {
  if (theme === 'dark-theme') {
    elements.themeCardDark.classList.add('active');
    elements.themeCardLight.classList.remove('active');
  } else {
    elements.themeCardDark.classList.remove('active');
    elements.themeCardLight.classList.add('active');
  }
}

function setupEventListeners() {
  // Navigation Tabs
  elements.navDashboard.addEventListener('click', () => switchTab('dashboard'));
  elements.navEditor.addEventListener('click', () => switchTab('editor'));
  elements.navHistory.addEventListener('click', () => switchTab('history'));
  elements.navSettings.addEventListener('click', () => switchTab('settings'));

  // Theme Toggles
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.themeCardDark.addEventListener('click', () => applyTheme('dark-theme'));
  elements.themeCardLight.addEventListener('click', () => applyTheme('light-theme'));

  // Folder Select Actions
  elements.btnSelectProject.addEventListener('click', selectFolder);
  elements.btnWelcomeSelect.addEventListener('click', selectFolder);
  elements.btnTriggerScan.addEventListener('click', scanCurrentFolder);
  elements.btnCancelScan.addEventListener('click', async () => {
    elements.scanProgressStatus.textContent = 'Cancelling scan...';
    await window.api.cancelScan();
  });
  
  // AI README Generation
  elements.btnGenerateAi.addEventListener('click', generateReadmeContent);

  const toggleBtn = document.getElementById('btn-toggle-thinking');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const thinkingContainer = document.getElementById('editor-thinking-container');
      const sectionsContainer = elements.editorSectionsContainer;
      const btnSpan = toggleBtn.querySelector('span');
      if (thinkingContainer && sectionsContainer && btnSpan) {
        if (thinkingContainer.style.display === 'none') {
          // Switch to thinking logs view
          sectionsContainer.style.display = 'none';
          thinkingContainer.style.display = 'block';
          btnSpan.textContent = 'Show Sections';
        } else {
          // Switch to sections cards view
          thinkingContainer.style.display = 'none';
          sectionsContainer.style.display = 'flex';
          btnSpan.textContent = 'Show AI Thoughts';
        }
      }
    });
  }

  // Consent Modal Actions
  elements.modalConsentClose.addEventListener('click', () => hideModal(elements.modalConsent));
  elements.modalConsentCancel.addEventListener('click', () => hideModal(elements.modalConsent));
  elements.modalConsentConfirm.addEventListener('click', () => {
    hideModal(elements.modalConsent);
    executeReadmeGeneration();
  });

  // Settings Panel Actions
  elements.settingsAiProvider.addEventListener('change', (e) => toggleProviderGroups(e.target.value));
  elements.btnRefreshOllama.addEventListener('click', fetchOllamaModels);
  elements.btnSaveSettings.addEventListener('click', saveSettings);
  elements.btnResetSettings.addEventListener('click', resetSettings);

  // Copy & Export Dropdowns
  elements.btnCopyClipboard.addEventListener('click', copyMarkdownToClipboard);
  elements.btnExportDropdown.addEventListener('click', toggleExportDropdown);
  document.addEventListener('click', closeDropdownOutside);

  // Export File Formats
  elements.exportFileReadme.addEventListener('click', exportToProjectReadme);
  elements.exportFileMarkdown.addEventListener('click', exportAsMarkdownFile);
  elements.exportFileHtml.addEventListener('click', exportAsHtmlFile);
  elements.exportFilePdf.addEventListener('click', exportAsPdfFile);

  // Modals Actions
  elements.modalRegenClose.addEventListener('click', () => hideModal(elements.modalRegenInstruction));
  elements.modalRegenCancel.addEventListener('click', () => hideModal(elements.modalRegenInstruction));
  elements.modalRegenSubmit.addEventListener('click', submitRegenSection);
  
  // Synchronized Scrolling
  elements.editorSectionsContainer.addEventListener('mouseenter', () => { state.scrollSource = 'editor'; });
  elements.previewMarkdownContainer.addEventListener('mouseenter', () => { state.scrollSource = 'preview'; });
  
  elements.editorSectionsContainer.addEventListener('scroll', () => {
    if (state.scrollSource !== 'editor') return;
    syncScrollFromEditorToPreview();
  });
  
  elements.previewMarkdownContainer.addEventListener('scroll', () => {
    if (state.scrollSource !== 'preview') return;
    syncScrollFromPreviewToEditor();
  });
  
  elements.btnAddSection.addEventListener('click', () => showModal(elements.modalAddSection));
  elements.modalAddClose.addEventListener('click', () => hideModal(elements.modalAddSection));
  elements.modalAddCancel.addEventListener('click', () => hideModal(elements.modalAddSection));
  elements.modalAddSubmit.addEventListener('click', submitAddSection);

  // Custom Instructions Modal Events
  elements.btnCustomInstructions.addEventListener('click', () => {
    elements.modalCustomInstructionsInput.value = state.customInstructions;
    elements.modalCustomInstructionsEnable.checked = state.customInstructionsEnabled;
    showModal(elements.modalCustomInstructions);
  });
  elements.modalCustomInstructionsClose.addEventListener('click', () => hideModal(elements.modalCustomInstructions));
  elements.modalCustomInstructionsCancel.addEventListener('click', () => hideModal(elements.modalCustomInstructions));
  elements.modalCustomInstructionsSave.addEventListener('click', () => {
    state.customInstructions = elements.modalCustomInstructionsInput.value;
    state.customInstructionsEnabled = elements.modalCustomInstructionsEnable.checked;
    localStorage.setItem('gemini_custom_instructions', state.customInstructions);
    localStorage.setItem('gemini_custom_instructions_enabled', state.customInstructionsEnabled);
    updateInstructionsIndicator();
    hideModal(elements.modalCustomInstructions);
  });

  // Error Modal Events
  if (elements.modalErrorClose) {
    elements.modalErrorClose.addEventListener('click', () => hideModal(elements.modalError));
  }
  if (elements.modalErrorCloseBtn) {
    elements.modalErrorCloseBtn.addEventListener('click', () => hideModal(elements.modalError));
  }
  if (elements.modalErrorCopy && elements.modalErrorDetails) {
    elements.modalErrorCopy.addEventListener('click', async () => {
      try {
        const textToCopy = `Error: ${elements.modalErrorMessage.textContent}\n\nDetails:\n${elements.modalErrorDetails.value}`;
        await navigator.clipboard.writeText(textToCopy);
        if (elements.modalErrorCopyText) {
          elements.modalErrorCopyText.textContent = 'Copied!';
          setTimeout(() => {
            elements.modalErrorCopyText.textContent = 'Copy Error';
          }, 2000);
        }
      } catch (err) {
        console.error('Failed to copy error details to clipboard:', err);
      }
    });
  }

  // History Diff
  elements.btnRunCompare.addEventListener('click', compareVersions);
}

function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Update Navigation Active styles
  elements.navDashboard.classList.remove('active');
  elements.navEditor.classList.remove('active');
  elements.navHistory.classList.remove('active');
  elements.navSettings.classList.remove('active');
  
  // Update Sidebar Panes
  elements.sidebarDashboard.classList.add('hidden');
  elements.sidebarEditor.classList.add('hidden');
  elements.sidebarHistory.classList.add('hidden');
  elements.sidebarSettings.classList.add('hidden');
  
  // Update Main View Panes
  elements.viewDashboard.classList.remove('active');
  elements.viewEditor.classList.remove('active');
  elements.viewHistory.classList.remove('active');
  elements.viewSettings.classList.remove('active');
  
  if (tabId === 'dashboard') {
    elements.navDashboard.classList.add('active');
    elements.sidebarDashboard.classList.remove('hidden');
    elements.viewDashboard.classList.add('active');
  } else if (tabId === 'editor') {
    elements.navEditor.classList.add('active');
    elements.sidebarEditor.classList.remove('hidden');
    elements.viewEditor.classList.add('active');
    renderPreview(); // refresh markdown preview
  } else if (tabId === 'history') {
    elements.navHistory.classList.add('active');
    elements.sidebarHistory.classList.remove('hidden');
    elements.viewHistory.classList.add('active');
    updateHistoryViews();
  } else if (tabId === 'settings') {
    elements.navSettings.classList.add('active');
    elements.sidebarSettings.classList.remove('hidden');
    elements.viewSettings.classList.add('active');
  }
}

// Theme handling
function toggleTheme() {
  const currentTheme = document.body.className;
  const newTheme = currentTheme === 'light-theme' ? 'dark-theme' : 'light-theme';
  applyTheme(newTheme);
}

function applyTheme(theme) {
  document.body.className = theme;
  localStorage.setItem('app_theme', theme);
  updateThemeUI(theme);
}

// ----------------- FOLDER SELECT & SCANNER -----------------
async function selectFolder() {
  const folderPath = await window.api.selectFolder();
  if (folderPath) {
    state.projectPath = folderPath;
    state.projectName = folderPath.split(/[\\/]/).pop() || folderPath;
    
    // Update Header Text
    elements.currentProjectName.textContent = state.projectName;
    elements.currentProjectPath.textContent = ` (${folderPath})`;
    
    // Enable Buttons
    elements.btnTriggerScan.disabled = false;
    elements.btnGenerateAi.disabled = false;
    
    // Trigger Scan Automatically
    await scanCurrentFolder();
  }
}

async function scanCurrentFolder() {
  if (!state.projectPath) return;
  
  // Show spinner
  elements.dashboardWelcome.classList.add('hidden');
  elements.dashboardStats.classList.add('hidden');
  elements.dashboardLoading.classList.remove('hidden');
  elements.scanProgressStatus.textContent = 'Starting project file analysis...';
  
  // Set up scan progress listener from main process
  const removeScanListener = window.api.onScanProgress((data) => {
    if (data.file === 'Done') {
      elements.scanProgressStatus.textContent = `Completed scan. Preparing dashboard...`;
    } else {
      elements.scanProgressStatus.textContent = `Scanned ${data.count} files. Scanning: ${data.file}`;
    }
  });

  // Determine current model name to calculate token budgets
  const provider = elements.settingsAiProvider.value;
  let modelName = '';
  if (provider === 'gemini') modelName = elements.settingsApiModel.value;
  else if (provider === 'claude') modelName = elements.settingsClaudeModel.value;
  else if (provider === 'openai') modelName = elements.settingsOpenaiModel.value;
  else if (provider === 'ollama') modelName = elements.settingsOllamaModel.value;

  const result = await window.api.scanProject(state.projectPath, modelName);
  
  removeScanListener();
  elements.dashboardLoading.classList.add('hidden');
  
  if (result.success) {
    state.stats = result.data;
    displayDashboardStats(result.data);
    elements.dashboardStats.classList.remove('hidden');
  } else {
    if (result.aborted) {
      console.log('Project scan was cancelled by the user.');
    } else {
      alert(`Scanning failed: ${result.error}`);
    }
    elements.dashboardWelcome.classList.remove('hidden');
  }
}

function displayDashboardStats(stats) {
  // Update stats counters
  elements.statLoc.textContent = stats.totalLinesOfCode.toLocaleString();
  elements.statFiles.textContent = stats.totalFiles;
  elements.statLang.textContent = stats.primaryLanguage;
  elements.statFramework.textContent = stats.frameworks.length > 0 ? stats.frameworks[0] : 'None';
  elements.statPackageManager.textContent = stats.packageManager;
  elements.statEntryPoint.textContent = stats.entryPoint;
  
  // Complexity Gauge
  elements.statComplexity.textContent = stats.complexity;
  elements.statComplexity.className = 'complexity-score ' + stats.complexity.toLowerCase();
  
  // Languages Chart
  elements.languagesChart.innerHTML = '';
  const totalLoc = stats.totalLinesOfCode || 1;
  const sortedLangs = stats.sortedLanguages || [];
  
  if (sortedLangs.length === 0) {
    elements.languagesChart.innerHTML = '<p class="empty-placeholder">No files counted.</p>';
  }
  
  for (const lang of sortedLangs) {
    const percentage = ((lang.loc / totalLoc) * 100).toFixed(1);
    const row = document.createElement('div');
    row.className = 'lang-bar-row';
    row.innerHTML = `
      <div class="lang-bar-label">
        <span>${lang.name}</span>
        <span class="text-muted">${percentage}% (${lang.loc.toLocaleString()} LOC)</span>
      </div>
      <div class="lang-bar-bg">
        <div class="lang-bar-fill" style="width: ${percentage}%;"></div>
      </div>
    `;
    elements.languagesChart.appendChild(row);
  }
  
  // Dependencies list
  elements.statDependenciesList.innerHTML = '';
  const deps = stats.dependencies || [];
  if (deps.length === 0) {
    elements.statDependenciesList.innerHTML = '<span class="text-muted">No external dependencies detected.</span>';
  } else {
    for (const dep of deps) {
      const tag = document.createElement('span');
      tag.className = 'dep-tag';
      tag.textContent = dep;
      elements.statDependenciesList.appendChild(tag);
    }
  }
  
  // Largest Files
  elements.statLargestFiles.innerHTML = '';
  const largeFiles = stats.largestFiles || [];
  for (const file of largeFiles) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${file.path}</span>
      <span class="size-badge">${(file.size / 1024).toFixed(1)} KB (${file.loc.toLocaleString()} lines)</span>
    `;
    elements.statLargestFiles.appendChild(li);
  }
  
  // Dynamic Architecture Diagram (Mermaid)
  renderMermaidDiagram(stats.architectureDiagram);
  
  // Warnings list
  elements.alertsContainer.innerHTML = '';
  let warningsCount = 0;
  
  if (stats.missingReadme) {
    createAlert('warning', 'Missing README.md', 'No README.md file was found in the project root.', null);
    warningsCount++;
  }
  if (stats.missingGitignore) {
    createAlert('warning', 'Missing .gitignore', 'We couldn\'t find a .gitignore file in the project.', createGitignoreFile);
    warningsCount++;
  }
  if (stats.missingLicense) {
    createAlert('warning', 'Missing License', 'No LICENSE file was detected in the root directory.', null);
    warningsCount++;
  }
  if (stats.missingTests) {
    createAlert('warning', 'No Tests Detected', 'No test folders or spec/test files were identified.', null);
    warningsCount++;
  }
  
  if (warningsCount === 0) {
    elements.alertsContainer.innerHTML = `
      <div class="alert-item success">
        <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <div>
          <strong>Project looks healthy!</strong> No critical missing files or configs.
        </div>
      </div>
    `;
  }
  
  // Project Tree View (Up to 3 levels)
  elements.treeContainer.innerHTML = '';
  if (stats.projectTree) {
    const rootNode = renderTreeNode(stats.projectTree);
    elements.treeContainer.appendChild(rootNode);
  } else {
    elements.treeContainer.innerHTML = '<p class="empty-placeholder">Tree scanning not available.</p>';
  }
}

async function renderMermaidDiagram(diagramCode) {
  elements.architectureMermaid.innerHTML = '';
  if (!diagramCode) return;
  
  try {
    const pre = document.createElement('pre');
    pre.className = 'mermaid';
    pre.textContent = diagramCode;
    elements.architectureMermaid.appendChild(pre);
    
    if (window.mermaid) {
      await mermaid.run({ nodes: [pre] });
    }
  } catch (e) {
    console.error('Mermaid render error:', e);
    elements.architectureMermaid.innerHTML = `
      <div style="font-size:12px;color:red;padding:10px;">Failed to render Mermaid diagram.</div>
      <pre style="text-align:left;font-size:11px;">${diagramCode}</pre>
    `;
  }
}

function createAlert(type, title, message, actionCallback) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert-item ${type}`;
  
  let actionBtn = '';
  if (actionCallback) {
    actionBtn = `<button class="alert-action-btn">Generate File</button>`;
  }
  
  alertDiv.innerHTML = `
    <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <div>
      <strong>${title}</strong>
      <div>${message}</div>
      ${actionBtn}
    </div>
  `;
  
  if (actionCallback) {
    alertDiv.querySelector('.alert-action-btn').addEventListener('click', actionCallback);
  }
  
  elements.alertsContainer.appendChild(alertDiv);
}

// Tree view renderer (nested folders)
function renderTreeNode(node) {
  const item = document.createElement('div');
  item.className = 'tree-node';
  
  const row = document.createElement('div');
  row.className = `tree-row ${node.type}`;
  
  // Folder icon or File icon
  const iconSvg = node.type === 'directory' 
    ? `<svg class="tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
    : `<svg class="tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
  
  row.innerHTML = `${iconSvg} <span>${node.name}</span>`;
  item.appendChild(row);
  
  if (node.type === 'directory' && node.children) {
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';
    
    // Toggle Collapse
    row.addEventListener('click', () => {
      childrenContainer.classList.toggle('hidden');
    });
    
    for (const child of node.children) {
      childrenContainer.appendChild(renderTreeNode(child));
    }
    item.appendChild(childrenContainer);
  }
  
  return item;
}

// Suggest a .gitignore action
async function createGitignoreFile() {
  if (!state.projectPath) return;
  
  let gitignoreContent = '# Default .gitignore for ' + state.stats.primaryLanguage + '\n';
  
  if (state.stats.primaryLanguage === 'JavaScript' || state.stats.primaryLanguage === 'TypeScript') {
    gitignoreContent += 'node_modules/\ndist/\nbuild/\n.next/\n.nuxt/\n.env\n.env.local\nnpm-debug.log*\n';
  } else if (state.stats.primaryLanguage === 'Python') {
    gitignoreContent += '__pycache__/\n*.py[cod]\n*$py.class\nvenv/\n.venv/\n.env\n.pytest_cache/\nhtmlcov/\n';
  } else if (state.stats.primaryLanguage === 'Rust') {
    gitignoreContent += 'target/\nCargo.lock\n**/*.rs.bk\n.env\n';
  } else {
    gitignoreContent += 'node_modules/\nvenv/\n.env\nbin/\nobj/\ntarget/\n';
  }
  
  const result = await window.api.writeFile(state.projectPath + '/.gitignore', gitignoreContent);
  if (result.success) {
    alert('.gitignore file successfully created in project directory.');
    await scanCurrentFolder(); // Rescan
  } else {
    alert(`Failed to write .gitignore: ${result.error}`);
  }
}

// ----------------- AI README GENERATOR -----------------
// Show consent modal before transmission
function generateReadmeContent() {
  if (!state.stats) {
    alert('Please select and scan a project folder first.');
    return;
  }

  const provider = elements.settingsAiProvider.value;
  let modelName = '';
  if (provider === 'gemini') modelName = elements.settingsApiModel.value;
  else if (provider === 'claude') modelName = elements.settingsClaudeModel.value;
  else if (provider === 'openai') modelName = elements.settingsOpenaiModel.value;
  else if (provider === 'ollama') modelName = elements.settingsOllamaModel.value;

  elements.consentProvider.textContent = provider.toUpperCase();
  elements.consentModel.textContent = modelName || 'Default';

  // Populate file list and calculate total characters
  elements.consentFilesList.innerHTML = '';
  let totalChars = 0;
  if (state.stats.keyFiles && state.stats.keyFiles.length > 0) {
    state.stats.keyFiles.forEach(file => {
      totalChars += file.content.length;
      const fileRow = document.createElement('div');
      fileRow.style.display = 'flex';
      fileRow.style.justifyContent = 'space-between';
      fileRow.style.width = '100%';
      fileRow.innerHTML = `<span>${file.path}</span> <span style="color: var(--text-muted); font-size: 11px;">(${file.content.length.toLocaleString()} chars)</span>`;
      elements.consentFilesList.appendChild(fileRow);
    });
  } else {
    elements.consentFilesList.innerHTML = '<div style="color: var(--text-muted); font-style: italic;">No key files will be transmitted.</div>';
  }
  
  elements.consentChars.textContent = `${totalChars.toLocaleString()} chars (~${Math.round(totalChars / 4).toLocaleString()} tokens)`;

  // Show the modal
  showModal(elements.modalConsent);
}

async function executeReadmeGeneration() {
  if (!state.stats) {
    alert('Please select and scan a project folder first.');
    return;
  }
  
  const originalSpan = elements.btnGenerateAi.querySelector('span');
  const originalText = originalSpan ? originalSpan.textContent : 'Generate README';
  
  elements.btnGenerateAi.disabled = true;
  if (originalSpan) {
    originalSpan.textContent = 'Generating...';
  }
  
  try {
    window._lastThinkingLogs = null;
    // Hide the thinking containers and reset toggle button when starting generation
    const toggleContainer = document.getElementById('thinking-toggle-container');
    const thinkingContainer = document.getElementById('editor-thinking-container');
    const toggleBtn = document.getElementById('btn-toggle-thinking');
    if (toggleContainer) toggleContainer.style.display = 'none';
    if (thinkingContainer) {
      thinkingContainer.style.display = 'none';
      thinkingContainer.textContent = '';
    }
    if (toggleBtn) {
      const btnSpan = toggleBtn.querySelector('span');
      if (btnSpan) btnSpan.textContent = 'Show AI Thoughts';
    }

    // Switch to Editor Tab and show loading preview with Cancel button
    switchTab('editor');
    elements.editorSectionsContainer.innerHTML = `
      <div class="loading-overlay">
        <div class="spinner"></div>
        <h3 id="generation-status-title">Generating README Sections using AI...</h3>
        <p id="generation-status-desc">This may take up to a minute depending on the model and project size.</p>
        <button id="btn-cancel-generation" class="btn btn-secondary" style="margin-top: 16px;">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>Cancel</span>
        </button>
      </div>
    `;
    elements.previewMarkdownContainer.innerHTML = '<p class="empty-placeholder">Analyzing and generating...</p>';

    const cancelBtn = document.getElementById('btn-cancel-generation');
    cancelBtn.addEventListener('click', async () => {
      cancelBtn.disabled = true;
      cancelBtn.querySelector('span').textContent = 'Cancelling...';
      await window.api.cancelGeneration();
    });
    
    const options = {
      provider: elements.settingsAiProvider.value,
      apiKey: elements.settingsApiKey.value.trim(),
      modelName: elements.settingsApiModel.value,
      style: elements.settingsAiStyle.value,
      ollamaUrl: elements.settingsOllamaUrl.value.trim(),
      ollamaModel: elements.settingsOllamaModel.value,
      claudeKey: elements.settingsClaudeKey.value.trim(),
      claudeModel: elements.settingsClaudeModel.value,
      openaiKey: elements.settingsOpenaiKey.value.trim(),
      openaiModel: elements.settingsOpenaiModel.value,
      customInstructions: state.customInstructionsEnabled ? (state.customInstructions || '') : ''
    };
    
    // Call AI (or mock engine)
    const sections = await generateAIExtractedReadme(state.stats, options);
    
    if (sections && sections.length > 0) {
      state.sections = sections;
      
      // Save to history
      const fullMarkdown = compileMarkdown();
      saveToHistory(state.projectName, state.projectPath, state.sections, fullMarkdown);
      
      renderEditorCards();
      renderSidebarSectionsList();
      renderPreview();
      updateHistoryViews();

      // Show/Hide thinking toggle and text based on window._lastThinkingLogs
      const toggleContainer = document.getElementById('thinking-toggle-container');
      const thinkingContainer = document.getElementById('editor-thinking-container');
      const toggleBtn = document.getElementById('btn-toggle-thinking');

      if (window._lastThinkingLogs && window._lastThinkingLogs.trim()) {
        if (toggleContainer) toggleContainer.style.display = 'block';
        if (thinkingContainer) {
          thinkingContainer.textContent = window._lastThinkingLogs;
          thinkingContainer.style.display = 'none';
        }
        if (elements.editorSectionsContainer) {
          elements.editorSectionsContainer.style.display = 'flex';
        }
        if (toggleBtn) {
          const btnSpan = toggleBtn.querySelector('span');
          if (btnSpan) btnSpan.textContent = 'Show AI Thoughts';
        }
      } else {
        if (toggleContainer) toggleContainer.style.display = 'none';
        if (thinkingContainer) {
          thinkingContainer.style.display = 'none';
          thinkingContainer.textContent = '';
        }
        if (elements.editorSectionsContainer) {
          elements.editorSectionsContainer.style.display = 'flex';
        }
      }
    } else if (sections !== null) {
      // null means cancelled — sections === undefined/[] means real failure
      window.showCustomErrorModal(
        'README Generation Failed',
        'Failed to generate README. The AI provider did not return any sections.',
        'Please verify your API key, local model status, connection settings, and project scan stats.'
      );
      elements.editorSectionsContainer.innerHTML = '<p class="empty-placeholder">Failed to load editor sections.</p>';
      switchTab('dashboard');
    } else {
      // Cancelled by user — restore dashboard quietly
      elements.editorSectionsContainer.innerHTML = '<p class="empty-placeholder">Generation was cancelled.</p>';
      switchTab('dashboard');
    }
  } catch (error) {
    console.error('Error generating README:', error);
    window.showCustomErrorModal(
      'README Generation Error',
      'An unexpected error occurred while generating the README.',
      error
    );
    switchTab('dashboard');
  } finally {
    elements.btnGenerateAi.disabled = false;
    if (originalSpan) {
      originalSpan.textContent = originalText;
    }
  }
}


// ----------------- EDITOR LOGIC -----------------
function renderEditorCards() {
  elements.editorSectionsContainer.innerHTML = '';
  
  if (state.sections.length === 0) {
    elements.editorSectionsContainer.innerHTML = '<p class="empty-placeholder">No sections available. Generate README to start.</p>';
    return;
  }
  
  state.sections.forEach((section, index) => {
    const card = document.createElement('div');
    card.className = 'section-card';
    card.dataset.index = index;
    card.id = `editor-card-${section.id}`;
    
    card.innerHTML = `
      <div class="section-card-header">
        <div class="section-title-wrap">
          <svg class="icon text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="9" x2="20" y2="9"></line>
            <line x1="4" y1="15" x2="20" y2="15"></line>
            <line x1="10" y1="3" x2="8" y2="21"></line>
            <line x1="16" y1="3" x2="14" y2="21"></line>
          </svg>
          <input type="text" class="section-title-input" value="${section.title}" data-index="${index}">
        </div>
        <div class="card-actions">
          <button class="btn btn-sm btn-icon nav-arrow-btn" onclick="moveSection(${index}, -1)" title="Move Up">
            ▲
          </button>
          <button class="btn btn-sm btn-icon nav-arrow-btn" onclick="moveSection(${index}, 1)" title="Move Down">
            ▼
          </button>
          <button class="btn btn-sm btn-icon" onclick="copySectionContent(${index})" title="Copy Section Content">
            <svg class="icon text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="btn btn-sm btn-primary btn-icon-text" onclick="triggerRegenAIModal('${section.id}', '${section.title}')" title="Regenerate with AI">
            AI Regen
          </button>
          <button class="btn btn-sm btn-danger btn-icon" style="line-height: 0; padding-bottom: 2px; display: inline-flex; align-items: center; justify-content: center; font-size: 18px;" onclick="deleteSection(${index})" title="Delete Section">
            &times;
          </button>
        </div>
      </div>
      <div class="section-card-body">
        <textarea class="section-textarea" rows="6" data-index="${index}">${section.content}</textarea>
      </div>
    `;
    
    // Auto-update content in state when textarea changes
    const textarea = card.querySelector('.section-textarea');
    
    const expand = () => {
      // Read scrollHeight directly — accurate at 130px, no 1px trick needed
      // This preserves the current visible content so animation grows downward from it
      textarea.style.transition = '';
      textarea.style.height = textarea.scrollHeight + 'px';
    };

    const collapse = () => {
      if (document.activeElement !== textarea && !card.matches(':hover')) {
        textarea.style.height = '130px';
      }
    };

    textarea.addEventListener('input', (e) => {
      state.sections[index].content = e.target.value;
      
      // Disable transition and perform instant height update to avoid jitter
      textarea.style.transition = 'none';
      textarea.style.height = '1px';
      const fullHeight = textarea.scrollHeight;
      textarea.style.height = fullHeight + 'px';
      
      // Force layout reflow to apply the height update instantly without transition
      textarea.offsetHeight;
      
      // Restore transition on the next animation frame
      requestAnimationFrame(() => {
        textarea.style.transition = '';
      });
      
      debouncedRenderPreview();
    });

    const titleInput = card.querySelector('.section-title-input');
    titleInput.addEventListener('input', (e) => {
      state.sections[index].title = e.target.value;
      debouncedRenderPreview();
      renderSidebarSectionsList();
    });

    textarea.addEventListener('focus', expand);
    textarea.addEventListener('blur', () => setTimeout(collapse, 150));
    card.addEventListener('mouseenter', expand);
    card.addEventListener('mouseleave', (e) => {
      // Guard: during the height CSS transition the card's rendered bottom moves gradually,
      // which fires a false mouseleave while the mouse is still visually inside the card.
      // Verify actual pointer position against the card's bounding rect before collapsing.
      const rect = card.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top  && e.clientY <= rect.bottom) {
        return; // Still inside — ignore spurious event
      }
      setTimeout(collapse, 150);
    });
    
    elements.editorSectionsContainer.appendChild(card);
  });
}

function renderSidebarSectionsList() {
  elements.sectionsList.innerHTML = '';
  
  if (state.sections.length === 0) {
    elements.sectionsList.innerHTML = '<p class="empty-placeholder">No sections available.</p>';
    return;
  }
  
  state.sections.forEach((section, index) => {
    const item = document.createElement('div');
    item.className = 'section-nav-item';
    item.innerHTML = `
      <span>${section.title}</span>
      <div class="section-nav-controls">
        <button class="nav-arrow-btn" onclick="moveSection(${index}, -1)">▲</button>
        <button class="nav-arrow-btn" onclick="moveSection(${index}, 1)">▼</button>
      </div>
    `;
    
    // Click to scroll to card
    item.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        const card = document.getElementById(`editor-card-${section.id}`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
    
    elements.sectionsList.appendChild(item);
  });
}

// Reordering / Deleting actions exposed globally so onclick attribute works
window.moveSection = function(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= state.sections.length) return;
  
  // Swap sections
  const temp = state.sections[index];
  state.sections[index] = state.sections[newIndex];
  state.sections[newIndex] = temp;
  
  renderEditorCards();
  renderSidebarSectionsList();
  renderPreview();
};

window.deleteSection = function(index) {
  if (confirm(`Are you sure you want to delete the section: ${state.sections[index].title}?`)) {
    state.sections.splice(index, 1);
    renderEditorCards();
    renderSidebarSectionsList();
    renderPreview();
  }
};

window.copySectionContent = async function(index) {
  try {
    await navigator.clipboard.writeText(state.sections[index].content);
    
    // Provide visual feedback
    const card = document.getElementById(`editor-card-${state.sections[index].id}`);
    if (card) {
      const copyBtn = card.querySelector('button[title="Copy Section Content"]');
      if (copyBtn) {
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<svg class="icon text-success" style="stroke: #10b981;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        setTimeout(() => { copyBtn.innerHTML = originalHTML; }, 1500);
      }
    }
  } catch (err) {
    console.error('Failed to copy text: ', err);
    alert('Failed to copy section content.');
  }
};

window.triggerRegenAIModal = function(sectionId, sectionTitle) {
  state.regenSectionId = sectionId;
  elements.modalRegenSectionTitle.textContent = sectionTitle;
  elements.modalRegenPromptInput.value = '';
  showModal(elements.modalRegenInstruction);
};

// ----------------- MODALS INTERACTION -----------------
function showModal(modal) {
  modal.classList.remove('hidden');
}

function hideModal(modal) {
  modal.classList.add('hidden');
}

window.showCustomErrorModal = function(title, message, details) {
  let detailsText = '';
  if (details) {
    if (details instanceof Error) {
      detailsText = details.stack || details.toString();
    } else if (typeof details === 'object') {
      try {
        detailsText = JSON.stringify(details, null, 2);
      } catch (_) {
        detailsText = String(details);
      }
    } else {
      detailsText = String(details);
    }
  }

  if (elements.modalError && elements.modalErrorTitle && elements.modalErrorMessage && elements.modalErrorDetails) {
    elements.modalErrorTitle.textContent = title || 'Error Details';
    elements.modalErrorMessage.textContent = message || 'An error occurred during execution.';
    elements.modalErrorDetails.value = detailsText || 'No technical details available.';
    if (elements.modalErrorCopyText) {
      elements.modalErrorCopyText.textContent = 'Copy Error';
    }
    showModal(elements.modalError);
  } else {
    alert(`${title || 'Error'}\n\n${message || ''}\n\n${detailsText}`);
  }
};

async function submitRegenSection() {
  const sectionId = state.regenSectionId;
  const section = state.sections.find(s => s.id === sectionId);
  if (!section) return;
  
  const instruction = elements.modalRegenPromptInput.value.trim();
  if (!instruction) {
    alert('Please enter instructions for the AI.');
    return;
  }
  
  hideModal(elements.modalRegenInstruction);
  
  // Put section card in loading state
  const card = document.getElementById(`editor-card-${sectionId}`);
  const textarea = card.querySelector('.section-textarea');
  textarea.disabled = true;
  textarea.value = 'Regenerating section content via AI... Please wait...';
  
  const options = {
    provider: elements.settingsAiProvider.value,
    apiKey: elements.settingsApiKey.value.trim(),
    modelName: elements.settingsApiModel.value,
    ollamaUrl: elements.settingsOllamaUrl.value.trim(),
    ollamaModel: elements.settingsOllamaModel.value,
    claudeKey: elements.settingsClaudeKey.value.trim(),
    claudeModel: elements.settingsClaudeModel.value,
    openaiKey: elements.settingsOpenaiKey.value.trim(),
    openaiModel: elements.settingsOpenaiModel.value
  };
  
  const newContent = await regenerateAISection(
    sectionId,
    section.title,
    section.content,
    state.stats,
    instruction,
    options
  );
  
  textarea.disabled = false;
  section.content = newContent;
  textarea.value = newContent;
  renderPreview();
}

function submitAddSection() {
  const title = elements.modalAddTitleInput.value.trim();
  const content = elements.modalAddContentInput.value.trim();
  
  if (!title) {
    alert('Please enter a section title.');
    return;
  }
  
  const id = 'custom_' + Date.now();
  state.sections.push({ id, title, content });
  
  hideModal(elements.modalAddSection);
  elements.modalAddTitleInput.value = '';
  elements.modalAddContentInput.value = '';
  
  renderEditorCards();
  renderSidebarSectionsList();
  renderPreview();
  
  // Scroll to bottom
  setTimeout(() => {
    const card = document.getElementById(`editor-card-${id}`);
    if (card) card.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

// ----------------- MARKDOWN PREVIEW RENDERING -----------------
function compileMarkdown() {
  let md = '';
  state.sections.forEach((section) => {
    // Top headers render at standard sizes
    if (section.id === 'title') {
      md += section.content + '\n\n';
    } else {
      md += `## ${section.title}\n\n${section.content}\n\n`;
    }
  });
  return md;
}

function renderPreview() {
  if (state.sections.length === 0) {
    elements.previewMarkdownContainer.innerHTML = '<p class="empty-placeholder">Select project and generate README to view preview.</p>';
    return;
  }
  
  const markdown = compileMarkdown();
  
  if (window.marked) {
    const html = marked.parse(markdown);
    elements.previewMarkdownContainer.innerHTML = html;
    
    // Initialize Mermaid diagrams inside markdown
    renderPreviewMermaidDiagrams();
  }
}

// Debounce helper to prevent rapid-fire rendering crashes
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

const debouncedRenderPreview = debounce(renderPreview, 300);

function renderPreviewMermaidDiagrams() {
  const mermaidCodes = elements.previewMarkdownContainer.querySelectorAll('.mermaid-diagram-code');
  const mermaidPreviews = elements.previewMarkdownContainer.querySelectorAll('.mermaid-preview-container');
  
  mermaidCodes.forEach((codeEl, index) => {
    const diagramCode = codeEl.textContent.trim();
    const previewEl = mermaidPreviews[index];
    
    if (window.mermaid && previewEl) {
      const id = 'mermaid-preview-' + index + '-' + Date.now();
      previewEl.innerHTML = `<pre class="mermaid" id="${id}">${diagramCode}</pre>`;
      
      mermaid.run({ nodes: [previewEl.querySelector('.mermaid')] })
        .catch(err => {
          console.error('Failed to parse inner markdown mermaid:', err);
          previewEl.innerHTML = `<div class="alert-item warning" style="margin:5px 0;font-size:11px;user-select:none;">Failed to render Mermaid diagram (syntax error).</div><pre style="font-size:10px;text-align:left;background:#1a1a20;color:var(--text-main);padding:8px;border-radius:4px;overflow-x:auto;user-select:text;">${diagramCode}</pre>`;
        });
    }
  });
}

// ----------------- COPY & EXPORT ACTIONS -----------------
function toggleExportDropdown(e) {
  e.stopPropagation();
  elements.exportDropdownMenu.classList.toggle('hidden');
}

function closeDropdownOutside() {
  elements.exportDropdownMenu.classList.add('hidden');
}

function copyMarkdownToClipboard() {
  const md = compileMarkdown();
  navigator.clipboard.writeText(md);
  
  const originalText = elements.btnCopyClipboard.textContent;
  elements.btnCopyClipboard.textContent = 'Copied!';
  setTimeout(() => {
    elements.btnCopyClipboard.textContent = originalText;
  }, 2000);
}

// Save README.md directly to project root
async function exportToProjectReadme() {
  if (!state.projectPath) return;
  const content = compileMarkdown();
  const filePath = `${state.projectPath}/README.md`;
  
  const result = await window.api.writeFile(filePath, content);
  if (result.success) {
    alert(`README.md successfully exported to project directory:\n${filePath}`);
  } else {
    alert(`Failed to write file: ${result.error}`);
  }
}

// Save As Markdown (.md)
async function exportAsMarkdownFile() {
  const content = compileMarkdown();
  const result = await window.api.saveFileDialog({
    defaultName: 'README.md',
    content: content,
    title: 'Save Markdown File',
    filters: [{ name: 'Markdown File', extensions: ['md'] }]
  });
  
  if (result && result.success) {
    alert(`Markdown file exported to: ${result.filePath}`);
  } else if (result && result.error) {
    alert(`Export failed: ${result.error}`);
  }
}

// Export as HTML
async function exportAsHtmlFile() {
  const content = compileMarkdown();
  const htmlContent = window.marked ? marked.parse(content) : content;
  
  // Wrap in boilerplate html
  const boilerplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${state.projectName || 'README'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      color: #24292e;
      line-height: 1.5;
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
</html>`;

  const result = await window.api.saveFileDialog({
    defaultName: 'README.html',
    content: boilerplate,
    title: 'Export HTML File',
    filters: [{ name: 'HTML Document', extensions: ['html'] }]
  });
  
  if (result && result.success) {
    alert(`HTML exported to: ${result.filePath}`);
  } else if (result && result.error) {
    alert(`Export failed: ${result.error}`);
  }
}

// Export as PDF
async function exportAsPdfFile() {
  const content = compileMarkdown();
  const htmlContent = window.marked ? marked.parse(content) : content;
  
  elements.btnExportDropdown.textContent = 'Generating PDF...';
  
  const result = await window.api.exportPdfDialog({
    htmlContent,
    defaultName: `${state.projectName || 'README'}.pdf`
  });
  
  elements.btnExportDropdown.textContent = 'Export...';
  
  if (result && result.success) {
    alert(`PDF successfully printed to: ${result.filePath}`);
  } else if (result && result.error) {
    alert(`PDF generation failed: ${result.error}`);
  }
}

// ----------------- SETTINGS & RESET -----------------
async function fetchOllamaModels() {
  const url = elements.settingsOllamaUrl.value.trim().replace(/\/$/, '');
  elements.ollamaStatusText.textContent = 'Fetching models...';
  elements.settingsOllamaModel.innerHTML = '';
  
  try {
    const response = await fetch(`${url}/api/tags`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    if (data.models && data.models.length > 0) {
      data.models.forEach(m => {
        elements.settingsOllamaModel.add(new Option(m.name, m.name));
      });
      elements.ollamaStatusText.textContent = `Found ${data.models.length} models.`;
    } else {
      elements.settingsOllamaModel.add(new Option('No models installed', ''));
      elements.ollamaStatusText.textContent = 'No models found in Ollama.';
    }
  } catch (error) {
    elements.settingsOllamaModel.add(new Option('Error connecting', ''));
    elements.ollamaStatusText.textContent = `Error: Could not connect to Ollama.`;
    console.error('Ollama fetch error:', error);
  }
}

async function saveSettings() {
  const provider = elements.settingsAiProvider.value;
  const key = elements.settingsApiKey.value.trim();
  const model = elements.settingsApiModel.value;
  const style = elements.settingsAiStyle.value;
  const ollamaUrl = elements.settingsOllamaUrl.value.trim();
  const ollamaModel = elements.settingsOllamaModel.value;
  const claudeKey = elements.settingsClaudeKey.value.trim();
  const claudeModel = elements.settingsClaudeModel.value;
  const openaiKey = elements.settingsOpenaiKey.value.trim();
  const openaiModel = elements.settingsOpenaiModel.value;
  
  localStorage.setItem('ai_provider', provider);
  localStorage.setItem('gemini_model', model);
  localStorage.setItem('gemini_ai_style', style);
  localStorage.setItem('ollama_url', ollamaUrl);
  localStorage.setItem('ollama_model', ollamaModel);
  localStorage.setItem('claude_model', claudeModel);
  localStorage.setItem('openai_model', openaiModel);
  
  // Save credentials securely in main process
  await window.api.saveKey('gemini_api_key', key);
  await window.api.saveKey('claude_api_key', claudeKey);
  await window.api.saveKey('openai_api_key', openaiKey);
  
  // Ensure unencrypted versions are removed from localStorage
  localStorage.removeItem('gemini_api_key');
  localStorage.removeItem('claude_api_key');
  localStorage.removeItem('openai_api_key');
  
  alert('Settings saved securely.');
}

async function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    localStorage.removeItem('ai_provider');
    localStorage.removeItem('gemini_model');
    localStorage.removeItem('gemini_ai_style');
    localStorage.removeItem('ollama_url');
    localStorage.removeItem('ollama_model');
    localStorage.removeItem('claude_model');
    localStorage.removeItem('openai_model');
    localStorage.removeItem('app_theme');
    localStorage.removeItem('gemini_custom_instructions');
    localStorage.removeItem('gemini_custom_instructions_enabled');
    
    // Clear unencrypted storage keys just in case
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('claude_api_key');
    localStorage.removeItem('openai_api_key');

    // Reset secure keys
    await window.api.saveKey('gemini_api_key', '');
    await window.api.saveKey('claude_api_key', '');
    await window.api.saveKey('openai_api_key', '');
    
    await loadSettings();
    alert('Settings reset to defaults successfully.');
  }
}

// ----------------- HISTORY & DIFF LOGS -----------------
function updateHistoryViews() {
  const history = getHistory();
  
  // Render History Sidebar List
  elements.historyList.innerHTML = '';
  elements.compareOldSelect.innerHTML = '<option value="">-- Choose Base Version --</option>';
  elements.compareNewSelect.innerHTML = '<option value="">-- Choose Current Version --</option>';
  
  if (history.length === 0) {
    elements.historyList.innerHTML = '<p class="empty-placeholder">No history found.</p>';
    return;
  }
  
  history.forEach(item => {
    // Add selector options
    const optionText = `${item.projectName} (${item.timestamp})`;
    const optOld = new Option(optionText, item.id);
    const optNew = new Option(optionText, item.id);
    elements.compareOldSelect.add(optOld);
    elements.compareNewSelect.add(optNew);
    
    // Sidebar list rendering
    const div = document.createElement('div');
    div.className = 'history-nav-item';
    div.innerHTML = `
      <div class="title">${item.projectName}</div>
      <div class="meta">${item.timestamp}</div>
      <div class="meta" style="font-family:var(--font-mono);word-break:break-all;">${item.projectPath}</div>
      <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:5px;">
        <button class="btn btn-sm" onclick="loadHistoryItem('${item.id}')">Load</button>
        <button class="btn btn-sm btn-danger" onclick="deleteHistory('${item.id}')">&times;</button>
      </div>
    `;
    elements.historyList.appendChild(div);
  });
}

window.loadHistoryItem = function(id) {
  const history = getHistory();
  const item = history.find(h => h.id === id);
  if (!item) return;
  
  state.projectName = item.projectName;
  state.projectPath = item.projectPath;
  state.sections = item.sections;
  
  elements.currentProjectName.textContent = state.projectName;
  elements.currentProjectPath.textContent = ` (${item.projectPath})`;
  
  renderEditorCards();
  renderSidebarSectionsList();
  renderPreview();
  
  switchTab('editor');
  alert(`Generation state loaded successfully in editor from ${item.timestamp}`);
};

window.deleteHistory = function(id) {
  if (confirm('Delete this history entry?')) {
    deleteHistoryItem(id);
    updateHistoryViews();
  }
};

function compareVersions() {
  const oldId = elements.compareOldSelect.value;
  const newId = elements.compareNewSelect.value;
  
  if (!oldId || !newId) {
    alert('Please select two history versions to compare.');
    return;
  }
  
  const history = getHistory();
  const oldVersion = history.find(h => h.id === oldId);
  const newVersion = history.find(h => h.id === newId);
  
  if (!oldVersion || !newVersion) return;
  
  // Compute Diff
  const diffs = diffStrings(oldVersion.markdown, newVersion.markdown);
  
  // Display Diffs
  elements.diffOutputContainer.innerHTML = '';
  
  if (diffs.length === 0) {
    elements.diffOutputContainer.innerHTML = '<div class="diff-line normal">Files are identical.</div>';
    return;
  }
  
  diffs.forEach(line => {
    const lineDiv = document.createElement('div');
    lineDiv.className = `diff-line ${line.type}`;
    
    let prefix = '  ';
    if (line.type === 'added') prefix = '+ ';
    if (line.type === 'removed') prefix = '- ';
    
    lineDiv.textContent = prefix + line.text;
    elements.diffOutputContainer.appendChild(lineDiv);
  });
}

function syncScrollFromEditorToPreview() {
  const cards = Array.from(elements.editorSectionsContainer.querySelectorAll('.section-card'));
  const headings = Array.from(elements.previewMarkdownContainer.querySelectorAll('h2'));
  if (cards.length === 0 || headings.length === 0) return;
  
  const containerTop = elements.editorSectionsContainer.getBoundingClientRect().top;
  const previewTop = elements.previewMarkdownContainer.getBoundingClientRect().top;
  
  let topCardIndex = 0;
  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect();
    if (rect.top - containerTop <= 10) {
      topCardIndex = i;
    } else {
      break;
    }
  }
  
  const currentCard = cards[topCardIndex];
  const nextCard = cards[topCardIndex + 1];
  const currentHeading = headings[topCardIndex];
  const nextHeading = headings[topCardIndex + 1];
  
  if (currentHeading) {
    const cardRect = currentCard.getBoundingClientRect();
    const cardTop = cardRect.top - containerTop;
    const cardHeight = cardRect.height;
    
    const progress = cardHeight > 0 ? Math.max(0, Math.min(1, -cardTop / cardHeight)) : 0;
    
    const headingTop = currentHeading.getBoundingClientRect().top - previewTop;
    
    if (nextHeading && nextCard) {
      const nextHeadingTop = nextHeading.getBoundingClientRect().top - previewTop;
      elements.previewMarkdownContainer.scrollTop += (headingTop + progress * (nextHeadingTop - headingTop));
    } else {
      elements.previewMarkdownContainer.scrollTop += headingTop;
    }
  }
}

function syncScrollFromPreviewToEditor() {
  const cards = Array.from(elements.editorSectionsContainer.querySelectorAll('.section-card'));
  const headings = Array.from(elements.previewMarkdownContainer.querySelectorAll('h2'));
  if (cards.length === 0 || headings.length === 0) return;
  
  const containerTop = elements.editorSectionsContainer.getBoundingClientRect().top;
  const previewTop = elements.previewMarkdownContainer.getBoundingClientRect().top;
  
  let topHeadingIndex = 0;
  for (let i = 0; i < headings.length; i++) {
    const rect = headings[i].getBoundingClientRect();
    if (rect.top - previewTop <= 10) {
      topHeadingIndex = i;
    } else {
      break;
    }
  }
  
  const currentHeading = headings[topHeadingIndex];
  const nextHeading = headings[topHeadingIndex + 1];
  const currentCard = cards[topHeadingIndex];
  const nextCard = cards[topHeadingIndex + 1];
  
  if (currentCard) {
    const headingRect = currentHeading.getBoundingClientRect();
    const headingTop = headingRect.top - previewTop;
    
    let sectionHeight = headingRect.height;
    if (nextHeading) {
      const nextHeadingRect = nextHeading.getBoundingClientRect();
      sectionHeight = nextHeadingRect.top - headingRect.top;
    }
    
    const progress = sectionHeight > 0 ? Math.max(0, Math.min(1, -headingTop / sectionHeight)) : 0;
    
    const cardTop = currentCard.getBoundingClientRect().top - containerTop;
    
    if (nextCard && nextHeading) {
      const nextCardTop = nextCard.getBoundingClientRect().top - containerTop;
      elements.editorSectionsContainer.scrollTop += (cardTop + progress * (nextCardTop - cardTop));
    } else {
      elements.editorSectionsContainer.scrollTop += cardTop;
    }
  }
}

// Boot application
document.addEventListener('DOMContentLoaded', initApp);
