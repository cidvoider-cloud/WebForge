/**
 * WebForge AI â€” Main Application Controller (v4 â€” Forge UI)
 * Handles Virtual File System (VFS), AI chat, multi-project management,
 * prompt builder slide-over, and workspace view switching.
 */

let provider, skillManager, promptBuilder, preview;
let conversationHistory = [];
let VFS = {};
let activeFilePath = '';
let isGenerating = false;
let skillsDockOpen = false;

// â”€â”€ Boilerplate React Project â”€â”€
const DEFAULT_VFS = {
  'src/main.jsx': `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);`,

  'src/App.jsx': `import React, { useState } from 'react';
import { Sparkles, ArrowRight, Zap, CheckCircle2, RefreshCw } from 'lucide-react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-teal-500/30">
      <div className="max-w-md w-full bg-slate-900/60 border border-slate-800/80 p-8 rounded-2xl shadow-2xl backdrop-blur-md text-center space-y-6">
        <div className="inline-flex p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
          <Sparkles className="w-6 h-6 text-teal-400 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            WebForge App
          </h1>
          <p className="text-slate-400 text-sm">
            React app compiling live in your browser sandbox.
          </p>
        </div>
        <button 
          onClick={() => setCount(c => c + 1)}
          className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold rounded-lg transition-all transform active:scale-[0.98] shadow-lg shadow-teal-500/10"
        >
          Clicked {count} times
        </button>
      </div>
      <footer className="mt-8 text-center text-xs text-slate-600">
        WebForge AI Â· Pure Client-side Sandbox
      </footer>
    </div>
  );
}`,

  'src/index.css': `/* CSS Rules */
body {
  background-color: #020617;
}`
};

// â”€â”€ Multi-Project Storage â”€â”€

let projectsList = [];
let activeProjectId = null;

function _loadProjects() {
  if (typeof seedDemoProjects === 'function') seedDemoProjects();
  try {
    projectsList = JSON.parse(localStorage.getItem('wf_projects')) || [];
  } catch { projectsList = []; }
  _renderProjectsList();
}

function _saveProjects() {
  localStorage.setItem('wf_projects', JSON.stringify(projectsList));
}

function _generateId() {
  return Math.random().toString(36).substring(2, 9);
}
function safeCreateIcons(root) {
  if (typeof lucide === 'undefined') return;
  try {
    if (root) lucide.createIcons({ root });
    else lucide.createIcons();
  } catch {
    try { lucide.createIcons(); } catch {}
  }
}

// ——— Card Icon Population ———

function _populateCardIcons() {
  const iconMap = {
    'business': 'briefcase', 'restaurant': 'utensils', 'real estate': 'building-2',
    'health': 'heart-pulse', 'law': 'scale', 'gym': 'dumbbell',
    'portfolio': 'user', 'photography': 'camera', 'blog': 'newspaper',
    'music': 'music', 'wedding': 'heart', 'travel': 'plane',
    'saas': 'rocket', 'e-commerce': 'shopping-cart', 'education': 'graduation-cap',
    'event': 'calendar', 'non-profit': 'hand-heart', 'church': 'church',
    'minimalist': 'minus', 'corporate': 'building', 'swiss': 'grid-3x3',
    'flat': 'layers', 'nordic': 'snowflake', 'bento': 'layout-grid',
    'japanese': 'fan', 'neomorphism': 'circle', 'luxury': 'gem',
    'dark modern': 'moon', 'cyberpunk': 'zap', 'brutalist': 'hammer',
    'maximalist': 'sparkles', 'gradient': 'rainbow', 'playful': 'smile',
    'editorial': 'book-open', 'parallax': 'move-vertical', 'terminal': 'terminal',
    'glassmorphism': 'glasses', 'glasspunk': 'eye', 'skeuomorphic': 'box',
    'art deco': 'hexagon', 'bohemian': 'flower-2', 'industrial': 'wrench',
    'vintage rustic': 'pen-tool', 'organic': 'leaf', 'retro': 'disc',
  };
  document.querySelectorAll('#promptBuilderModal .card-icon').forEach(el => {
    if (el.querySelector('i, svg')) return;
    const title = el.closest('.select-card')?.querySelector('.card-title')?.textContent?.trim().toLowerCase() || '';
    const icon = Object.entries(iconMap).find(([k]) => title.includes(k))?.[1] || 'star';
    el.innerHTML = `<i data-lucide="${icon}" style="width:16px;height:16px"></i>`;
  });
}

// ——— Initialization ———

document.addEventListener('DOMContentLoaded', () => {
  provider = new AIProvider();
  skillManager = new SkillManager();
  promptBuilder = new PromptBuilder();
  window.promptBuilder = promptBuilder;
  preview = new PreviewManager();

  // Load Projects
  _loadProjects();

  // Setup UI
  _setupSettingsDrawer();
  _setupModals();
  _setupEditor();
  _setupChatBar();
  _renderSkillsIndicator();
  _renderSkillsSettingsList();
  _updateConnectionStatus();
  _populateModelSelect();

  // Start on Home view — render home project cards
  _renderHomeProjects();

  // Close project dropdown on outside click
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('projectDropdown');
    const btn = document.getElementById('projectNameBtn');
    if (dropdown && !dropdown.contains(e.target) && !btn.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });

  // Home prompt Enter to send
  document.getElementById('homePromptInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendHomePrompt();
    }
  });

  // Populate card icons with Lucide icon names
  _populateCardIcons();

  // Initialize Lucide icons
  safeCreateIcons();
});

// ── Home / Workspace View Toggle ──

function showHomeView() {
  _renderHomeProjects();
  document.getElementById('homeView').style.display = 'flex';
  document.getElementById('workspaceView').style.display = 'none';
  safeCreateIcons();
}

function showWorkspaceView() {
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('workspaceView').style.display = 'flex';
}

function _renderHomeProjects() {
  // Sidebar project list
  const sidebar = document.getElementById('homeSidebarProjects');
  if (sidebar) {
    sidebar.innerHTML = projectsList.map(p => `
      <button class="home-nav-item" onclick="openProject('${p.id}')">
        <i data-lucide="folder" style="width:14px;height:14px"></i>
        ${p.name}
      </button>
    `).join('');
  }

  // Project cards grid
  const grid = document.getElementById('homeProjectsGrid');
  if (grid) {
    if (projectsList.length === 0) {
      grid.innerHTML = `
        <div class="home-empty-state">
          <i data-lucide="folder-plus"></i>
          <p>No projects yet. Type a prompt above to create your first one!</p>
        </div>`;
    } else {
      grid.innerHTML = projectsList.map(p => {
        const ago = _timeAgo(p.updatedAt);
        let fileCount = 0;
        try {
          const vfs = JSON.parse(localStorage.getItem(`wf_vfs_${p.id}`));
          if (vfs) fileCount = Object.keys(vfs).length;
        } catch {}
        const icon = p.icon || (p.demo ? 'flower-2' : 'code-2');
        const accent = p.accent || 'var(--primary)';
        const badge = p.demo
          ? `<span class="home-card-badge">Demo</span>`
          : '';
        return `
          <div class="home-project-card" onclick="openProject('${p.id}')">
            <div class="home-card-preview" style="background: linear-gradient(145deg, ${accent}22, ${accent}08);">
              <div class="card-icon-large" style="color:${accent}"><i data-lucide="${icon}"></i></div>
              ${badge}
            </div>
            <div class="home-card-info">
              <div class="home-card-title">${p.name}</div>
              <div class="home-card-meta">
                <span>${p.tagline || (fileCount + ' file' + (fileCount !== 1 ? 's' : ''))}</span>
                <span>${ago}</span>
              </div>
            </div>
          </div>`;
      }).join('');
    }
  }
  safeCreateIcons();
}

function _timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}

function sendHomePrompt() {
  const input = document.getElementById('homePromptInput');
  const msg = (input?.value || '').trim();
  if (!msg) return;
  input.value = '';

  // Create a new project (this calls openProject → showWorkspaceView)
  createNewProject();

  // Transfer the prompt to the workspace chat input and send
  const chatInput = document.getElementById('chatInput');
  if (chatInput) chatInput.value = msg;

  // Slight delay so workspace DOM is visible before sending
  requestAnimationFrame(() => {
    sendChatMessage();
  });
}

// createNewProject already calls openProject → showWorkspaceView
function createNewProjectFromHome() {
  createNewProject();
}

// ── Virtual File System (VFS) ──

function _loadVFS(projectId) {
  try {
    const saved = JSON.parse(localStorage.getItem(`wf_vfs_${projectId}`));
    if (saved && Object.keys(saved).length) {
      VFS = saved;
    } else {
      VFS = { ...DEFAULT_VFS };
    }
  } catch {
    VFS = { ...DEFAULT_VFS };
  }
  activeFilePath = VFS['src/App.jsx'] ? 'src/App.jsx' : Object.keys(VFS)[0];
}

function _saveVFS() {
  if (activeProjectId) {
    localStorage.setItem(`wf_vfs_${activeProjectId}`, JSON.stringify(VFS));
  }
}

function _renderFileTree() {
  const tree = document.getElementById('fileTree');
  if (!tree) return;
  
  const files = Object.keys(VFS).sort();
  tree.innerHTML = files.map(path => {
    const isActive = path === activeFilePath;
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    const indent = (parts.length - 1) * 12;
    
    let icon = '<i data-lucide="file-text" style="width:12px;height:12px;display:inline-block;vertical-align:middle"></i>';
    if (path.endsWith('.css')) {
      icon = '<i data-lucide="palette" style="width:12px;height:12px;display:inline-block;vertical-align:middle"></i>';
    } else if (path.endsWith('.jsx')) {
      icon = '<i data-lucide="atom" style="width:12px;height:12px;display:inline-block;vertical-align:middle"></i>';
    } else if (path.endsWith('.html')) {
      icon = '<i data-lucide="file-code" style="width:12px;height:12px;display:inline-block;vertical-align:middle"></i>';
    }
    
    return `
      <div class="file-item ${isActive ? 'active' : ''}" style="padding-left: ${14 + indent}px" onclick="_openFile('${path}')">
        <span>${icon}</span> ${name}
      </div>
    `;
  }).join('');
  
  safeCreateIcons();
}

function _escapeHTML(value) {
  return String(value).replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
}

function _highlightCode(code, path = '') {
  const html = _escapeHTML(code || '');
  if (/\.css$/i.test(path)) {
    const cssToken = /(\/\*[\s\S]*?\*\/)|([.#]?[a-zA-Z_-][\w-]*)(\s*\{)|([\w-]+)(\s*:)|(:\s*)([^;{}]+)/g;
    return html.replace(cssToken, (match, comment, selector, brace, prop, colon, valuePrefix, value) => {
      if (comment) return `<span class="tok-comment">${comment}</span>`;
      if (selector) return `<span class="tok-selector">${selector}</span>${brace}`;
      if (prop) return `<span class="tok-attr">${prop}</span>${colon}`;
      return `${valuePrefix}<span class="tok-string">${value}</span>`;
    });
  }

  const jsToken = /(&lt;\/?)([A-Za-z][\w.]*)|\b(className|htmlFor|onClick|onChange|value|type|id|href|src|alt|placeholder|role|aria-[\w-]+)(=)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|\b(import|from|export|default|function|const|let|var|return|if|else|for|while|try|catch|async|await|new|class|extends|useState|useEffect|useMemo)\b|\b(true|false|null|undefined|\d+(?:\.\d+)?)\b/g;
  return html.replace(jsToken, (match, tagPrefix, tag, attr, attrEq, string, comment, keyword, number) => {
    if (tag) return `${tagPrefix}<span class="tok-tag">${tag}</span>`;
    if (attr) return `<span class="tok-attr">${attr}</span>${attrEq}`;
    if (string) return `<span class="tok-string">${string}</span>`;
    if (comment) return `<span class="tok-comment">${comment}</span>`;
    if (keyword) return `<span class="tok-keyword">${keyword}</span>`;
    if (number) return `<span class="tok-number">${number}</span>`;
    return match;
  });
}
function updateCodeHighlight() {
  const textarea = document.getElementById('codeEditor');
  const highlight = document.getElementById('codeHighlight');
  if (!textarea || !highlight) return;
  highlight.innerHTML = _highlightCode(textarea.value, activeFilePath) + '\n';
  highlight.scrollTop = textarea.scrollTop;
  highlight.scrollLeft = textarea.scrollLeft;
}

function _openFile(path, switchTab = true) {
  if (!VFS[path]) return;
  activeFilePath = path;
  
  const textarea = document.getElementById('codeEditor');
  const fileNameHeader = document.getElementById('activeFileName');
  
  if (textarea) textarea.value = VFS[path];
  if (fileNameHeader) fileNameHeader.textContent = path;
  updateCodeHighlight();
  
  _renderFileTree();

  if (switchTab) {
    switchWorkspaceView('files');
  }
}

function _setupEditor() {
  const textarea = document.getElementById('codeEditor');
  if (!textarea) return;

  let manualEditTimer = null;
  textarea.addEventListener('input', () => {
    updateCodeHighlight();
    if (activeFilePath) {
      VFS[activeFilePath] = textarea.value;
      _saveVFS();
      preview.update(VFS);
      
      clearTimeout(manualEditTimer);
      manualEditTimer = setTimeout(() => {
        saveVFSHistory();
      }, 1500);
    }
  });

  textarea.addEventListener('scroll', updateCodeHighlight);

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(textarea.selectionEnd);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      VFS[activeFilePath] = textarea.value;
      _saveVFS();
      updateCodeHighlight();
    }
  });
}

// â”€â”€ Projects Navigation â”€â”€

function _renderProjectsList() {
  const list = document.getElementById('sidebarProjectsList');
  if (!list) return;
  
  list.innerHTML = projectsList.map(p => `
    <button class="project-dropdown-item ${activeProjectId === p.id ? 'active' : ''}" onclick="openProject('${p.id}'); toggleProjectDropdown();">
      <i data-lucide="folder" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px"></i> ${p.name}
    </button>
  `).join('');
  safeCreateIcons(list);
  
  // Update top bar project name
  const nameEl = document.getElementById('activeProjectName');
  if (nameEl) {
    const activeProj = projectsList.find(p => p.id === activeProjectId);
    nameEl.textContent = activeProj ? activeProj.name : 'No Project';
  }
}

function toggleProjectDropdown() {
  document.getElementById('projectDropdown')?.classList.toggle('open');
}

function openProject(projectId) {
  const proj = projectsList.find(p => p.id === projectId);
  if (!proj) return;
  
  activeProjectId = projectId;
  proj.updatedAt = Date.now();
  _saveProjects();
  
  const titleEl = document.getElementById('workspaceProjectTitle');
  if (titleEl) titleEl.textContent = proj.name;
  
  _loadVFS(projectId);
  _renderFileTree();
  _openFile(activeFilePath, false);
  preview.update(VFS);
  _renderProjectsList();
  
  // Load conversation history and UI messages
  try {
    conversationHistory = JSON.parse(localStorage.getItem(`wf_chat_llm_${projectId}`)) || [];
  } catch {
    conversationHistory = [];
  }
  
  const chatMsgs = document.getElementById('chatMessages');
  if (chatMsgs) {
    const savedUI = localStorage.getItem(`wf_chat_ui_${projectId}`);
    if (savedUI) {
      chatMsgs.innerHTML = savedUI;
      _normalizeSavedChatUI(chatMsgs);
      chatMsgs.scrollTo({ top: chatMsgs.scrollHeight });
    } else {
      chatMsgs.innerHTML = `
        <div class="msg ai">
          <div class="avatar"><i data-lucide="cat"></i></div>
          <div class="bubble"><span class="name">WebForge AI</span>
            Workspace <strong>${proj.name}</strong> loaded. What would you like to build?
          </div>
        </div>`;
    }
    safeCreateIcons();
  }
  
  switchWorkspaceView('preview');
  _updateRevertButtonState();
  showWorkspaceView();
}

function _saveChatHistory() {
  if (activeProjectId) {
    localStorage.setItem(`wf_chat_llm_${activeProjectId}`, JSON.stringify(conversationHistory));
    const chatMsgs = document.getElementById('chatMessages');
    if (chatMsgs) {
      localStorage.setItem(`wf_chat_ui_${activeProjectId}`, chatMsgs.innerHTML);
    }
  }
}

function createNewProject() {
  const newProj = {
    id: _generateId(),
    name: 'Project ' + (projectsList.length + 1),
    updatedAt: Date.now()
  };
  
  projectsList.unshift(newProj);
  _saveProjects();
  localStorage.setItem(`wf_vfs_${newProj.id}`, JSON.stringify(DEFAULT_VFS));
  
  openProject(newProj.id);
}

// â”€â”€ Settings Drawer Setup â”€â”€

function _setupSettingsDrawer() {
  document.getElementById('modalProviderType')?.addEventListener('change', (e) => {
    provider.configure({ type: e.target.value });
    _updateProviderUI();
    _updateModalProviderFields();
    _populateModelSelect();
  });

  document.getElementById('modelSelect')?.addEventListener('change', (e) => {
    provider.configure({ model: e.target.value });
    _syncModelComboboxLabel();
  });

  document.getElementById('modalApiKey')?.addEventListener('input', (e) => {
    provider.configure({ apiKey: e.target.value.trim() });
  });
  document.getElementById('modalBaseUrl')?.addEventListener('input', (e) => {
    provider.configure({ baseUrl: e.target.value.trim() });
  });

  document.getElementById('modalTemperature')?.addEventListener('input', (e) => {
    provider.configure({ temperature: parseFloat(e.target.value) || 0.7 });
  });
  document.getElementById('modalMaxTokens')?.addEventListener('input', (e) => {
    provider.configure({ maxTokens: parseInt(e.target.value) || 16384 });
  });

  _wireModelCombobox();

  // Populate values
  const pt = document.getElementById('modalProviderType');
  if (pt) pt.value = provider.type;
  const ak = document.getElementById('modalApiKey');
  if (ak) ak.value = provider.apiKey;
  const bu = document.getElementById('modalBaseUrl');
  if (bu) { bu.value = provider.baseUrl; bu.placeholder = provider.preset.baseUrl; }
  const tp = document.getElementById('modalTemperature');
  if (tp) tp.value = provider.temperature;
  const mt = document.getElementById('modalMaxTokens');
  if (mt) mt.value = provider.maxTokens;
  _updateModalProviderFields();
  _populateModelSelect();
}

let _modelFilter = 'all'; // all | free
let _modelComboboxWired = false;

function _wireModelCombobox() {
  if (_modelComboboxWired) return;
  const trigger = document.getElementById('modelComboboxTrigger');
  const panel = document.getElementById('modelComboboxPanel');
  const search = document.getElementById('modelSearch');
  const combobox = document.getElementById('modelCombobox');
  if (!trigger || !panel || !search || !combobox) return;

  trigger.addEventListener('click', () => {
    const open = panel.hidden;
    _setModelPanelOpen(open);
    if (open) {
      search.value = '';
      _renderModelComboboxList();
      search.focus();
    }
  });

  search.addEventListener('input', () => _renderModelComboboxList());
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      _setModelPanelOpen(false);
      trigger.focus();
    }
  });

  document.getElementById('modelFreeFilterRow')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.model-chip');
    if (!chip) return;
    _modelFilter = chip.dataset.filter || 'all';
    document.querySelectorAll('#modelFreeFilterRow .model-chip').forEach((c) => {
      c.classList.toggle('active', c.dataset.filter === _modelFilter);
    });
    _renderModelComboboxList();
  });

  document.addEventListener('click', (e) => {
    if (!combobox.contains(e.target)) _setModelPanelOpen(false);
  });

  _modelComboboxWired = true;
}

function _setModelPanelOpen(open) {
  const panel = document.getElementById('modelComboboxPanel');
  const trigger = document.getElementById('modelComboboxTrigger');
  if (!panel || !trigger) return;
  panel.hidden = !open;
  trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.getElementById('modelCombobox')?.classList.toggle('open', open);
}

function _filteredModels() {
  const q = (document.getElementById('modelSearch')?.value || '').trim().toLowerCase();
  const wantsFreeInQuery = /\bfree\b/.test(q);
  const query = q.replace(/\bfree\b/g, '').trim();
  return (provider.models || []).filter((m) => {
    if ((_modelFilter === 'free' || wantsFreeInQuery) && !m.free) return false;
    if (!query) return true;
    return m.name.toLowerCase().includes(query) || m.id.toLowerCase().includes(query);
  });
}

function _renderModelComboboxList() {
  const list = document.getElementById('modelComboboxList');
  const hint = document.getElementById('modelCountHint');
  if (!list) return;

  const models = _filteredModels();
  const total = provider.models?.length || 0;
  const freeCount = (provider.models || []).filter((m) => m.free).length;

  if (hint) {
    if (!total) hint.textContent = '';
    else if (provider.type === 'openrouter') {
      hint.textContent = _modelFilter === 'free'
        ? `${models.length} free`
        : `${total} models · ${freeCount} free`;
    } else {
      hint.textContent = `${models.length} / ${total}`;
    }
  }

  if (!total) {
    list.innerHTML = '<div class="model-empty">Load models to browse the catalog</div>';
    return;
  }
  if (!models.length) {
    list.innerHTML = '<div class="model-empty">No matches — try another search</div>';
    return;
  }

  list.innerHTML = models.map((m) => {
    const selected = m.id === provider.model ? ' selected' : '';
    const freeBadge = m.free ? '<span class="model-free-badge">Free</span>' : '';
    return `<button type="button" class="model-option${selected}" role="option" data-id="${escapeHtml(m.id)}" aria-selected="${m.id === provider.model}">
      <span class="model-option-name">${escapeHtml(m.name)}</span>
      <span class="model-option-id">${escapeHtml(m.id)}${freeBadge}</span>
    </button>`;
  }).join('');

  list.querySelectorAll('.model-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      provider.configure({ model: id });
      const select = document.getElementById('modelSelect');
      if (select) select.value = id;
      _syncModelComboboxLabel();
      _setModelPanelOpen(false);
      _renderModelComboboxList();
    });
  });
}

function _syncModelComboboxLabel() {
  const label = document.getElementById('modelComboboxLabel');
  if (!label) return;
  if (!provider.models?.length) {
    label.textContent = 'No models loaded';
    return;
  }
  const current = provider.models.find((m) => m.id === provider.model);
  label.textContent = current
    ? (current.free ? `${current.name} · Free` : current.name)
    : (provider.model || 'Select a model');
}

function _renderSkillsIndicator() {
  const container = document.getElementById('skillsIndicatorRow');
  if (!container) return;

  const enabled = skillManager.skills.filter(s => s.enabled).length;
  container.classList.toggle('open', skillsDockOpen);
  container.innerHTML = `
    <button class="skills-launcher" onclick="toggleSkillsDock()" aria-expanded="${skillsDockOpen}" title="Manage skills">
      <i data-lucide="sparkles"></i>
      <span>Skills</span>
      <strong>${enabled}</strong>
    </button>
    <div class="skills-panel" role="menu" aria-label="Skill toggles">
      <div class="skills-panel-head">
        <div><strong>AI Skills</strong><small>${enabled} of ${skillManager.skills.length} active</small></div>
        <button class="btn-icon" onclick="document.getElementById('settingsModal').showModal()" title="Open full settings"><i data-lucide="settings"></i></button>
      </div>
      <div class="skills-mini-list">
        ${skillManager.skills.map(s => `
          <button class="skill-toggle-row ${s.enabled ? 'active' : ''}" onclick="toggleSkillBadge('${s.id}')" role="menuitemcheckbox" aria-checked="${s.enabled}">
            <span class="skill-toggle-icon">${s.icon}</span>
            <span class="skill-toggle-copy"><b>${s.name}</b><small>${s.description}</small></span>
            <span class="mini-switch"></span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function toggleSkillsDock(force) {
  skillsDockOpen = typeof force === 'boolean' ? force : !skillsDockOpen;
  _renderSkillsIndicator();
}

function toggleSkillBadge(id) {
  skillManager.toggle(id);
  skillsDockOpen = true;
  _renderSkillsIndicator();
  _renderSkillsSettingsList();
}

function _renderSkillsSettingsList() {
  const list = document.getElementById('skillsList');
  if (!list) return;
  list.innerHTML = skillManager.skills.map(s => `
    <div class="skill-card">
      <div class="skill-card-header">
        <span class="skill-icon">${s.icon}</span>
        <span class="skill-name">${s.name}</span>
        <label class="toggle-switch">
          <input type="checkbox" ${s.enabled ? 'checked' : ''} onchange="toggleSkillBadge('${s.id}')">
          <span class="slider"></span>
        </label>
      </div>
      <div class="skill-card-desc">${s.description}</div>
    </div>
  `).join('');
}

// â”€â”€ Chat Controller â”€â”€

function _setupChatBar() {
  const input = document.getElementById('chatInput');
  const btn = document.getElementById('chatSend');

  btn?.addEventListener('click', () => sendChatMessage());
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      sendChatMessage(); 
    }
  });
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const msg = (input?.value || '').trim();
  if (!msg || isGenerating) return;

  // Ensure we have a project
  if (!activeProjectId) {
    createNewProject();
  }

  // Save VFS version history before this generation changes it
  saveVFSHistory();

  const escapedMsg = msg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  _addMessageBubble('user', escapedMsg);
  _saveChatHistory();
  input.value = '';
  input.style.height = 'auto';

  // Declare variables that need to be accessible in catch/finally block
  let aiBubbleId = null;

  try {
    isGenerating = true;
    _updateGeneratingUI(true);
    
    preview.showLoader('AI is building...', 'Streaming files and writing React code...');
    
    const elementCtx = preview.getSelectedElementContext();
    const systemPrompt = skillManager.getSystemPrompt();
    const hasUserAskedBefore = conversationHistory.some(m => m.role === 'user');
    const requestMode = classifyRequestMode(msg, hasUserAskedBefore, preview.activeErrors || []);
    const fileContext = buildFileContext(msg, requestMode);
    const projectSummary = getProjectSummary();
    const modeInstructions = buildModeInstructions(requestMode);
    const userContent = [
      elementCtx,
      projectSummary ? `Current project summary:\n${projectSummary}` : '',
      hasUserAskedBefore ? `Here is the current codebase:\n\n${fileContext}` : `Here is the initial file system boilerplate you MUST build on top of:\n\n${fileContext}`,
      `User instruction:\n${msg}`,
      modeInstructions,
      'Output valid complete file blocks only when code changes are needed. Use valid JavaScript string literals and escape quotes/newlines inside strings so Babel can compile the preview.'
    ].filter(Boolean).join('\n\n');

    const initialHtml = `
      <div class="gen-status-card" id="genStatusCard">
        <div class="gen-status-header">
          <i data-lucide="loader-2" class="lucide-spin"></i>
          <span id="genStatusTitle">Thinking...</span>
        </div>
        <div id="genStepsContainer">
          <div class="gen-step done" id="step-analyze">
            <span class="icon-wrapper"><i data-lucide="check-circle-2"></i></span>
            <span>Analyzing prompt and context</span>
          </div>
        </div>
      </div>
    `;
    aiBubbleId = _addMessageBubble('ai', initialHtml);
    let processedFiles = new Set();
    _saveChatHistory();

    const startTime = Date.now();
    let streamedCode = '';

    streamedCode = await provider.generate(
      systemPrompt,
      userContent,
      (chunk, full) => {
        streamedCode = full;
        
        const updatedVFS = parseStreamedVFS(full, VFS, { includePartial: false });
        Object.assign(VFS, updatedVFS);
        
        _saveVFS();
        _renderFileTree();
        
        const currentFileWrite = _detectActiveWritingFile(full);
        if (currentFileWrite) {
          preview.showLoader('AI is building...', `Writing: ${currentFileWrite}...`);
          
          if (!processedFiles.has(currentFileWrite)) {
            processedFiles.add(currentFileWrite);
            const stepsContainer = document.getElementById('genStepsContainer');
            if (stepsContainer) {
              const stepHtml = `
                <div class="gen-step">
                  <span class="icon-wrapper"><i data-lucide="circle"></i></span>
                  <span>Writing <code>${currentFileWrite}</code>...</span>
                </div>
              `;
              stepsContainer.insertAdjacentHTML('beforeend', stepHtml);
              if (typeof lucide !== 'undefined') safeCreateIcons(stepsContainer);
              
              // Mark previous steps as done
              const steps = stepsContainer.querySelectorAll('.gen-step');
              if (steps.length > 1) {
                const prev = steps[steps.length - 2];
                prev.classList.add('done');
                const iconWrap = prev.querySelector('.icon-wrapper');
                if (iconWrap) iconWrap.innerHTML = '<i data-lucide="check-circle-2"></i>';
                if (typeof lucide !== 'undefined') safeCreateIcons(iconWrap);
              }
            }
          }
        }
        
        if (activeFilePath && updatedVFS[activeFilePath]) {
          const editor = document.getElementById('codeEditor');
          if (editor && document.activeElement !== editor) {
            editor.value = updatedVFS[activeFilePath];
          }
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        _updateStatusBar({ tokens: Math.ceil(full.length / 4), time: elapsed });
      },
      conversationHistory
    );

    preview.flushStream();
    let finalPaths = getParsedFilePaths(streamedCode, { includePartial: false });
    if (!finalPaths.length && requestMode !== 'DISCUSS') {
      preview.showLoader('Repairing AI output...', 'Asking the model to return complete file blocks...');
      streamedCode = await repairMalformedOutput(systemPrompt, userContent, streamedCode);
      finalPaths = getParsedFilePaths(streamedCode, { includePartial: false });
    }
    if (!finalPaths.length) {
      if (requestMode === 'DISCUSS') {
        const bubbleEl = document.getElementById(aiBubbleId);
        if (bubbleEl) {
          bubbleEl.querySelector('.bubble').innerHTML = `<span class="name">WebForge AI</span><div class="message-content">${escapeHtml(streamedCode || 'No code changes needed.')}</div>`;
        }
        conversationHistory.push(
          { role: 'user', content: msg },
          { role: 'assistant', content: streamedCode }
        );
        _saveChatHistory();
        _updateStatusBar({ tokens: Math.ceil(streamedCode.length / 4), time: ((Date.now() - startTime) / 1000).toFixed(1), done: true });
        preview.hideLoader();
        return;
      }
      throw new Error('The AI response did not contain any complete file blocks. Ask again or lower the model temperature.');
    }
    const finalVFS = parseStreamedVFS(streamedCode, VFS, { includePartial: false });
    Object.assign(VFS, finalVFS);
    applyStructuredFileOps(VFS, streamedCode);
    _saveVFS();
    _renderFileTree();
    _openFile(activeFilePath, false);

    conversationHistory.push(
      { role: 'user', content: msg },
      { role: 'assistant', content: streamedCode }
    );
    updateProjectSummary(msg, finalPaths);

    const bubbleEl = document.getElementById(aiBubbleId);
    if (bubbleEl) {
      // Mark all remaining steps as done
      const stepsContainer = bubbleEl.querySelector('#genStepsContainer');
      if (stepsContainer) {
        const steps = stepsContainer.querySelectorAll('.gen-step');
        if (steps.length > 0) {
          const last = steps[steps.length - 1];
          last.classList.add('done');
          const iconWrap = last.querySelector('.icon-wrapper');
          if (iconWrap) iconWrap.innerHTML = '<i data-lucide="check-circle-2"></i>';
        }
      }
      
      const headerTitle = bubbleEl.querySelector('#genStatusTitle');
      if (headerTitle) headerTitle.textContent = 'Generation Complete';
      const headerIcon = bubbleEl.querySelector('.gen-status-header i');
      if (headerIcon) {
        headerIcon.outerHTML = '<i data-lucide="check-circle-2"></i>';
      }
      bubbleEl.querySelector('#genStatusCard')?.classList.add('done');
      bubbleEl.querySelectorAll('.lucide-spin').forEach(el => el.classList.remove('lucide-spin'));
      
      const filesList = finalPaths.map(p => `<code>${escapeHtml(p)}</code>`).join(', ');
      const doneHtml = `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
          <span class="name">WebForge AI</span>
          <div style="margin-top: 4px;">Done. Updated: ${filesList || 'project files'}. Check the preview!</div>
        </div>
      `;
      bubbleEl.querySelector('.bubble').insertAdjacentHTML('beforeend', doneHtml);
      if (typeof lucide !== 'undefined') safeCreateIcons(bubbleEl);
    }
    _saveChatHistory();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    _updateStatusBar({ tokens: Math.ceil(streamedCode.length / 4), time: elapsed, done: true });
    
    preview.update(VFS);
    preview.hideLoader();
    
    switchWorkspaceView('preview');
    showToast('App compiled successfully! ðŸš€');

  } catch (e) {
    preview.hideLoader();
    if (aiBubbleId) {
      const bubbleEl = document.getElementById(aiBubbleId);
      if (bubbleEl) {
        bubbleEl.querySelector('.bubble').innerHTML = `<span class="name">WebForge AI</span>
          <span style="color:var(--danger)"><strong>Error:</strong> ${e.message}</span>`;
      }
    }
    _saveChatHistory();
    if (e.name !== 'AbortError') showToast('Error: ' + e.message, true);
  } finally {
    isGenerating = false;
    _updateGeneratingUI(false);
  }
}

function buildFileContext(message, mode) {
  const entries = Object.entries(VFS);
  if (mode === 'BUILD' || entries.length <= 5) return formatFileContext(entries);
  const terms = new Set(String(message).toLowerCase().match(/[a-z0-9_-]{3,}/g) || []);
  const important = new Set([activeFilePath, 'src/App.jsx', 'src/main.jsx', 'src/index.css']);
  for (const path of Object.keys(VFS)) {
    const haystack = path.toLowerCase();
    for (const term of terms) {
      if (haystack.includes(term)) important.add(path);
    }
  }
  const selected = entries.filter(([path]) => important.has(path));
  return formatFileContext(selected.length ? selected : entries.slice(0, 5));
}

function formatFileContext(entries) {
  return entries.map(([path, code]) => `### FILE: ${path}\n\`\`\`\n${code}\n\`\`\``).join('\n\n');
}
function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function classifyRequestMode(message, hasUserAskedBefore, activeErrors = []) {
  if (activeErrors.length || /\b(error|bug|broken|fix|not working|crash|compile|babel|runtime)\b/i.test(message)) return 'DEBUG';
  if (!hasUserAskedBefore) return 'BUILD';
  if (/\b(add|change|update|remove|delete|fix|make|create|build|implement|replace|edit)\b/i.test(message)) return 'EDIT';
  return 'DISCUSS';
}

function buildModeInstructions(mode) {
  const common = 'Never use placeholders, comments for brevity, or partial snippets. Never rewrite unchanged files. Keep imports valid.';
  if (mode === 'BUILD') {
    return `Mode: BUILD. Create the full initial app from the provided boilerplate. Output all required files. ${common}`;
  }
  if (mode === 'DEBUG') {
    return `Mode: DEBUG. Fix the root cause using the smallest targeted patch. Prefer existing files and output only complete changed/new files. ${common}`;
  }
  if (mode === 'EDIT') {
    return `Mode: EDIT. Act as a careful code editor. Make the smallest targeted patch. Output only complete changed/new files. Do not regenerate the whole app or reset layout. ${common}`;
  }
  return `Mode: DISCUSS. If no code change is clearly needed, answer briefly without file blocks. If a code change is needed, use EDIT rules. ${common}`;
}

function getProjectSummary() {
  if (!activeProjectId) return '';
  return localStorage.getItem(`wf_project_summary_${activeProjectId}`) || '';
}

function updateProjectSummary(userMessage, changedPaths) {
  if (!activeProjectId) return;
  const files = Object.keys(VFS).sort();
  const summary = [
    `Last request: ${userMessage.slice(0, 240)}`,
    `Files: ${files.join(', ')}`,
    `Last changed: ${changedPaths.join(', ')}`
  ].join('\n');
  localStorage.setItem(`wf_project_summary_${activeProjectId}`, summary.slice(0, 1200));
}

async function repairMalformedOutput(systemPrompt, originalUserContent, badOutput) {
  const repairPrompt = [
    'The previous response could not be parsed by WebForge because it did not contain complete file operations.',
    'Rewrite the answer using ONLY complete WebForge file output. Do not explain anything.',
    'Use either ### FILE: fenced blocks or <wf-write path="...">...</wf-write>. Include every changed file completely.',
    '',
    'Original task and code context:',
    originalUserContent,
    '',
    'Malformed response to repair:',
    badOutput || '(empty response)'
  ].join('\n');
  let repaired = '';
  return provider.generate(systemPrompt, repairPrompt, (chunk, full) => { repaired = full; }, []);
}

function parseStructuredFileOps(rawText, opts = {}) {
  const includePartial = opts.includePartial !== false;
  const ops = { writes: {}, deletes: [], renames: [] };
  const writeRe = /<wf-write\s+path=["']([^"']+)["']\s*>([\s\S]*?)<\/wf-write>/gi;
  let match;
  while ((match = writeRe.exec(rawText)) !== null) {
    const path = sanitizeVfsPath(match[1]);
    if (!path) continue;
    ops.writes[path] = normalizeGeneratedFileContent(stripOptionalFence(match[2]));
  }
  if (includePartial) {
    const partialRe = /<wf-write\s+path=["']([^"']+)["']\s*>([\s\S]*)$/i;
    const partial = rawText.match(partialRe);
    if (partial && !rawText.slice(partial.index).includes('</wf-write>')) {
      const path = sanitizeVfsPath(partial[1]);
      if (path) ops.writes[path] = normalizeGeneratedFileContent(stripOptionalFence(partial[2]));
    }
  }
  const deleteRe = /<wf-delete\s+path=["']([^"']+)["']\s*\/?>(?:<\/wf-delete>)?/gi;
  while ((match = deleteRe.exec(rawText)) !== null) {
    const path = sanitizeVfsPath(match[1]);
    if (path) ops.deletes.push(path);
  }
  const renameRe = /<wf-rename\s+from=["']([^"']+)["']\s+to=["']([^"']+)["']\s*\/?>(?:<\/wf-rename>)?/gi;
  while ((match = renameRe.exec(rawText)) !== null) {
    const from = sanitizeVfsPath(match[1]);
    const to = sanitizeVfsPath(match[2]);
    if (from && to) ops.renames.push({ from, to });
  }
  return ops;
}

function applyStructuredFileOps(vfs, rawText) {
  const ops = parseStructuredFileOps(rawText, { includePartial: false });
  for (const [path, content] of Object.entries(ops.writes)) {
    vfs[path] = content;
  }
  for (const { from, to } of ops.renames) {
    if (vfs[from] !== undefined && vfs[to] === undefined) vfs[to] = vfs[from];
    delete vfs[from];
  }
  for (const path of ops.deletes) delete vfs[path];
}

function stripOptionalFence(content) {
  let text = String(content).replace(/^\r?\n/, '').replace(/\r?\n$/, '');
  const match = text.match(/^```[^\n]*\n([\s\S]*?)\n```\s*$/);
  return match ? match[1] : text;
}

function sanitizeVfsPath(path) {
  const clean = String(path || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
  if (!clean || clean.startsWith('/') || clean.includes('..') || /[<>:"|?*]/.test(clean)) return '';
  return clean;
}
function getParsedFilePaths(rawText, opts = {}) {
  const includePartial = opts.includePartial !== false;
  const structured = parseStructuredFileOps(rawText, opts);
  const paths = [...Object.keys(structured.writes), ...structured.deletes, ...structured.renames.map(r => `${r.from} -> ${r.to}`)];
  const fileSections = rawText.split(/### FILE:\s*/);
  for (let i = 1; i < fileSections.length; i++) {
    const section = fileSections[i];
    const path = sanitizeVfsPath(section.split('\n')[0]);
    if (!path || section.indexOf('```') === -1) continue;
    const codeStartRest = section.substring(section.indexOf('```') + 3);
    const firstNewline = codeStartRest.indexOf('\n');
    if (firstNewline === -1) continue;
    const content = codeStartRest.substring(firstNewline + 1);
    if (!includePartial && content.indexOf('```') === -1) continue;
    paths.push(path);
  }
  return [...new Set(paths)];
}
/** Regex VFS parser supporting streaming/unfinished blocks */
function parseStreamedVFS(rawText, currentVfs = {}, opts = {}) {
  const includePartial = opts.includePartial !== false;
  const newVfs = { ...currentVfs };
  const structured = parseStructuredFileOps(rawText, opts);
  Object.assign(newVfs, structured.writes);
  const fileSections = rawText.split(/### FILE:\s*/);
  
  for (let i = 1; i < fileSections.length; i++) {
    const section = fileSections[i];
    const lines = section.split('\n');
    const path = sanitizeVfsPath(lines[0]);
    if (!path) continue;
    
    const codeStartIdx = section.indexOf('```');
    if (codeStartIdx === -1) continue;
    
    const codeStartRest = section.substring(codeStartIdx + 3);
    const firstNewline = codeStartRest.indexOf('\n');
    if (firstNewline === -1) continue;
    
    let content = codeStartRest.substring(firstNewline + 1);
    
    const codeEndIdx = content.indexOf('```');
    if (codeEndIdx !== -1) {
      content = content.substring(0, codeEndIdx);
    } else {
      if (!includePartial) continue;
      const trailIdx = content.indexOf('### FILE:');
      if (trailIdx !== -1) {
        content = content.substring(0, trailIdx);
      }
    }
    
    newVfs[path] = normalizeGeneratedFileContent(content);
  }
  
  return newVfs;
}

function normalizeGeneratedFileContent(content) {
  return content.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
}

function _detectActiveWritingFile(text) {
  const sections = text.split(/### FILE:\s*/);
  if (sections.length > 1) {
    const lastSection = sections[sections.length - 1];
    return lastSection.split('\n')[0].trim();
  }
  return null;
}

function _addMessageBubble(role, contentHtml) {
  const container = document.getElementById('chatMessages');
  if (!container) return null;

  const bubbleId = 'msg-' + Date.now();
  const bodyHtml = typeof contentHtml === 'string' ? contentHtml.trim() : contentHtml;
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.id = bubbleId;
  div.innerHTML = `<div class="avatar">${role === 'user' ? '<i data-lucide="user"></i>' : '<i data-lucide="cat"></i>'}</div><div class="bubble"><span class="name">${role === 'user' ? 'You' : 'WebForge AI'}</span><div class="message-content ${role}-content">${bodyHtml}</div></div>`;
  container.appendChild(div);
  if (typeof lucide !== 'undefined') {
    safeCreateIcons(div);
  }
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  return bubbleId;
}

function _normalizeSavedChatUI(root) {
  root.querySelectorAll('.gen-status-card').forEach(card => {
    const title = card.querySelector('#genStatusTitle');
    if (title?.textContent.trim() === 'Generation Complete') {
      card.classList.add('done');
      const headerIcon = card.querySelector('.gen-status-header svg, .gen-status-header i');
      if (headerIcon) headerIcon.outerHTML = '<i data-lucide="check-circle-2"></i>';
      card.querySelectorAll('.lucide-spin').forEach(el => el.classList.remove('lucide-spin'));
    }
  });
}

function stopGeneration() {
  provider.stop();
  isGenerating = false;
  _updateGeneratingUI(false);
  preview.hideLoader();
  preview.flushStream();
}

function _updateGeneratingUI(generating) {
  const chatInput = document.getElementById('chatInput');
  const chatSend = document.getElementById('chatSend');
  const stopBtn = document.getElementById('btnStop');

  if (chatInput) chatInput.disabled = generating;
  if (chatSend) chatSend.style.display = generating ? 'none' : '';
  if (stopBtn) stopBtn.style.display = generating ? '' : 'none';
}

function _updateStatusBar({ tokens, time, done }) {
  const el = document.getElementById('statusInfo');
  if (el) {
    const icon = done
      ? '<i data-lucide="check-circle-2" style="width:13px;height:13px;color:var(--success);vertical-align:middle;margin-right:4px"></i>'
      : '<i data-lucide="refresh-cw" class="lucide-spin" style="width:13px;height:13px;color:var(--primary);vertical-align:middle;margin-right:4px"></i>';
    el.innerHTML = `${icon}<span>${tokens || 0} t</span> <span style="color:var(--text-dim);margin:0 4px">·</span> <span>${time || 0}s</span> <span style="color:var(--text-dim);margin:0 4px">·</span> <span>${escapeHtml(provider.model || 'no model')}</span>`;
    if (typeof lucide !== 'undefined') safeCreateIcons(el);
  }
}

// ── Modals Logic ──

function _setupModals() {
  document.querySelectorAll('dialog').forEach(d => {
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  });
}

function _updateModalProviderFields() {
  const type = document.getElementById('modalProviderType')?.value;
  if (!type) return;
  const preset = PROVIDER_PRESETS[type];
  const keyGroup = document.getElementById('modalApiKeyGroup');
  const urlGroup = document.getElementById('modalBaseUrlGroup');
  if (keyGroup) keyGroup.style.display = preset.requiresKey || type === 'custom' ? '' : 'none';
  if (urlGroup) urlGroup.style.display = type === 'custom' ? '' : 'none';
  const keyInput = document.getElementById('modalApiKey');
  if (keyInput) keyInput.placeholder = preset.placeholder;

  const freeRow = document.getElementById('modelFreeFilterRow');
  if (freeRow) freeRow.hidden = type !== 'openrouter';
  if (type !== 'openrouter' && _modelFilter === 'free') {
    _modelFilter = 'all';
    document.querySelectorAll('#modelFreeFilterRow .model-chip').forEach((c) => {
      c.classList.toggle('active', c.dataset.filter === 'all');
    });
  }

  const search = document.getElementById('modelSearch');
  if (search) {
    search.placeholder = type === 'openrouter'
      ? 'Search models — try “free”, llama, gemini…'
      : 'Search models…';
  }
}

function _populateModelSelect() {
  const select = document.getElementById('modelSelect');
  if (!select) return;
  select.innerHTML = provider.models.length
    ? provider.models.map(m => `<option value="${escapeHtml(m.id)}" ${m.id === provider.model ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('')
    : '<option value="">No models loaded</option>';
  if (provider.model) select.value = provider.model;
  _syncModelComboboxLabel();
  _renderModelComboboxList();
  safeCreateIcons(document.getElementById('modelCombobox'));
}

async function testConnection() {
  const btn = document.getElementById('btnTestConnection');
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-2" class="lucide-spin" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px"></i> Testing...';
  if (typeof lucide !== 'undefined') safeCreateIcons(btn);

  provider.configure({
    type: document.getElementById('modalProviderType').value,
    apiKey: document.getElementById('modalApiKey').value,
    baseUrl: document.getElementById('modalBaseUrl').value,
  });

  const result = await provider.testConnection();
  btn.disabled = false;

  if (result.ok) {
    btn.innerHTML = `<i data-lucide="check-circle-2" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;color:var(--success)"></i> Connected (${result.models} models)`;
    if (typeof lucide !== 'undefined') safeCreateIcons(btn);
    _populateModelSelect();
    _updateConnectionStatus();
    setTimeout(() => { btn.textContent = 'Test Connect'; }, 3000);
  } else {
    btn.innerHTML = '<i data-lucide="x-circle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;color:var(--danger)"></i> Failed';
    if (typeof lucide !== 'undefined') safeCreateIcons(btn);
    showToast('Connection failed: ' + result.error, true);
    setTimeout(() => { btn.textContent = 'Test Connect'; }, 3000);
  }
}

async function fetchModels() {
  try {
    await provider.fetchModels();
    _populateModelSelect();
    _updateConnectionStatus();
    showToast(`Loaded ${provider.models.length} models`);
  } catch (e) {
    showToast('Failed to fetch models: ' + e.message, true);
  }
}

function _updateConnectionStatus() {
  // Update the dot in the project name indicator
  const dot = document.querySelector('.project-name .dot');
  if (dot) {
    dot.style.background = provider.connected ? 'var(--success)' : 'var(--text-dim)';
  }
}

function _updateProviderUI() {
  _updateConnectionStatus();
  provider.models = [];
  provider.connected = false;
  _populateModelSelect();
}

function viewSkillPrompt(id) {
  const skill = skillManager.skills.find(s => s.id === id);
  if (!skill) return;
  const area = document.getElementById('skillPromptPreview');
  const modal = document.getElementById('skillPromptModal');
  if (area && modal) {
    area.textContent = skill.prompt;
    modal.showModal();
  }
}

// â”€â”€ Toast Notifications â”€â”€

function showToast(msg, isError = false) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.borderColor = isError ? 'var(--danger)' : 'var(--primary)';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// â”€â”€ Composer Autogrow â”€â”€

function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

// â”€â”€ View Switching â”€â”€

function switchWorkspaceView(view) {
  const previewBtn = document.getElementById('btnViewPreview');
  const filesBtn = document.getElementById('btnViewFiles');
  const previewFrame = document.getElementById('previewFrameWrap');
  const codeView = document.getElementById('viewport-files');
  
  if (previewBtn) previewBtn.classList.toggle('active', view === 'preview');
  if (filesBtn) filesBtn.classList.toggle('active', view === 'files');
  
  if (view === 'preview') {
    if (previewFrame) previewFrame.classList.remove('hide');
    if (codeView) codeView.classList.remove('show');
  } else {
    if (previewFrame) previewFrame.classList.add('hide');
    if (codeView) codeView.classList.add('show');
  }
  
  const devBtns = document.getElementById('previewDeviceBtns');
  if (devBtns) devBtns.style.display = view === 'preview' ? 'flex' : 'none';
  
  if (view === 'files' && activeFilePath) {
    _openFile(activeFilePath, false);
  }
}

// â”€â”€ Preview Toolbar Actions â”€â”€

function refreshPreview() { preview.refresh(); }
function openPreviewNewTab() { preview.openInNewTab(); }
function editSelectedElement() {
  const ctx = preview.getSelectedElementContext();
  if (ctx) {
    const input = document.getElementById('chatInput');
    if (input) { 
      input.focus(); 
      input.placeholder = 'Describe changes to the selected element...'; 
      showToast('Context applied to AI Chat!');
    }
  }
}

// â”€â”€ Export Functions â”€â”€

function exportAsHTML() {
  if (!VFS['src/App.jsx']) return showToast('Nothing to export yet', true);
  const blob = new Blob([preview.getStandaloneTemplate(VFS)], { type: 'text/html' });
  _downloadBlob(blob, 'index.html');
  showToast('Downloaded standalone index.html');
}

async function exportAsZip() {
  if (!VFS['src/App.jsx']) return showToast('Nothing to export yet', true);

  const readme = `# Your React WebForge Project\n\nThis project is generated as a modular React app using Tailwind CSS and Lucide React.\n\n## Project structure\n${Object.keys(VFS).map(p => `- \`${p}\``).join('\n')}\n\n## Running Standalone Preview\nOpen \`dist/index.html\` in a browser.\n`;

  const files = Object.entries(VFS).map(([path, content]) => ({ name: path, content }));
  const standaloneHTML = preview.getStandaloneTemplate(VFS);
  files.push({ name: 'dist/index.html', content: standaloneHTML });
  files.push({ name: 'README.md', content: readme });

  const zip = _createZip(files);
  _downloadBlob(zip, 'react-project.zip');
  showToast('Downloaded react-project.zip');
}

async function copyCode() {
  if (!activeFilePath || !VFS[activeFilePath]) return showToast('No file open', true);
  const code = VFS[activeFilePath];
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(code);
  } catch {
    const fallback = document.createElement('textarea');
    fallback.value = code;
    fallback.setAttribute('readonly', '');
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.appendChild(fallback);
    fallback.select();
    document.execCommand('copy');
    fallback.remove();
  }
  showToast(`Copied ${activeFilePath} to clipboard`);
}

function _downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function resetProjectVFS() {
  if (confirm("Reset project to default boilerplate? All changes will be lost.")) {
    saveVFSHistory();
    VFS = { ...DEFAULT_VFS };
    _saveVFS();
    _renderFileTree();
    activeFilePath = 'src/App.jsx';
    _openFile(activeFilePath, false);
    preview.update(VFS);
    showToast("Project reset to default boilerplate.");
  }
}

// â”€â”€ Zero-dependency ZIP builder â”€â”€

function _createZip(files) {
  const encoder = new TextEncoder();
  const entries = [];
  let offset = 0;

  for (const file of files) {
    const data = encoder.encode(file.content);
    const name = encoder.encode(file.name);
    const now = new Date();
    const time = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
    const date = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
    const crc = _crc32(data);

    const header = new Uint8Array(30 + name.length);
    const hv = new DataView(header.buffer);
    hv.setUint32(0, 0x04034b50, true); 
    hv.setUint16(4, 20, true); 
    hv.setUint16(6, 0, true); 
    hv.setUint16(8, 0, true); 
    hv.setUint16(10, time, true);
    hv.setUint16(12, date, true);
    hv.setUint32(14, crc, true);
    hv.setUint32(18, data.length, true); 
    hv.setUint32(22, data.length, true); 
    hv.setUint16(26, name.length, true);
    hv.setUint16(28, 0, true); 
    header.set(name, 30);

    entries.push({ header, data, name, crc, size: data.length, offset, time, date });
    offset += header.length + data.length;
  }

  const cdParts = [];
  let cdSize = 0;
  for (const e of entries) {
    const cd = new Uint8Array(46 + e.name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true); cv.setUint16(10, 0, true);
    cv.setUint16(12, e.time, true); cv.setUint16(14, e.date, true);
    cv.setUint32(16, e.crc, true);
    cv.setUint32(20, e.size, true); cv.setUint32(24, e.size, true);
    cv.setUint16(28, e.name.length, true);
    cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true); cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true); cv.setUint32(42, e.offset, true);
    cd.set(e.name, 46);
    cdParts.push(cd);
    cdSize += cd.length;
  }

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true); ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const parts = [];
  for (const e of entries) { parts.push(e.header); parts.push(e.data); }
  for (const cd of cdParts) parts.push(cd);
  parts.push(eocd);

  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of parts) { result.set(p, pos); pos += p.length; }

  return new Blob([result], { type: 'application/zip' });
}

function _crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// â”€â”€ VFS Version Revert History â”€â”€

let vfsHistory = [];

function saveVFSHistory() {
  if (!activeProjectId) return;
  try {
    vfsHistory = JSON.parse(localStorage.getItem(`wf_vfs_history_${activeProjectId}`)) || [];
  } catch {
    vfsHistory = [];
  }
  
  const lastEntry = vfsHistory[vfsHistory.length - 1];
  if (lastEntry && JSON.stringify(lastEntry) === JSON.stringify(VFS)) {
    return; // No change, don't save duplicate
  }
  
  vfsHistory.push(JSON.parse(JSON.stringify(VFS)));
  if (vfsHistory.length > 20) {
    vfsHistory.shift();
  }
  
  localStorage.setItem(`wf_vfs_history_${activeProjectId}`, JSON.stringify(vfsHistory));
  _updateRevertButtonState();
}

function revertVFS() {
  if (!activeProjectId) return;
  try {
    vfsHistory = JSON.parse(localStorage.getItem(`wf_vfs_history_${activeProjectId}`)) || [];
  } catch {
    vfsHistory = [];
  }
  
  if (vfsHistory.length === 0) {
    showToast('No previous version to revert to', true);
    return;
  }
  
  const previousVFS = vfsHistory.pop();
  localStorage.setItem(`wf_vfs_history_${activeProjectId}`, JSON.stringify(vfsHistory));
  
  VFS = previousVFS;
  _saveVFS();
  _renderFileTree();
  _openFile(activeFilePath, false);
  preview.update(VFS);
  _updateRevertButtonState();
  showToast('Reverted to the previous version!');
}

function _updateRevertButtonState() {
  const btn = document.getElementById('btnRevertVFS');
  if (!btn) return;
  let historyCount = 0;
  try {
    const hist = JSON.parse(localStorage.getItem(`wf_vfs_history_${activeProjectId}`));
    historyCount = hist ? hist.length : 0;
  } catch {}
  btn.disabled = historyCount === 0;
}

// â”€â”€ Auto-Fix System â”€â”€

function triggerAutoFix() {
  if (!preview.activeErrors || preview.activeErrors.length === 0) {
    showToast('No active errors to fix!');
    return;
  }
  
  const debugContext = preview.getDebugContext ? preview.getDebugContext() : preview.activeErrors.map(err => {
    return `[${err.title}]\n${err.message}\n${err.stack || ''}`;
  }).join('\n\n');
  
  const prompt = `DEBUG MODE: The preview has the following diagnostics:\n\n${debugContext}\n\nFix the root cause with the smallest targeted patch. Do not regenerate the whole project. Output only complete changed or newly created files.`;
  
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.value = prompt;
    autoGrow(chatInput);
    sendChatMessage();
  }
}






