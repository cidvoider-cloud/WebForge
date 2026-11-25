/**
 * WebForge Studio — Main Application Controller
 * M3 Cobalt Blue Agentic IDE orchestrating Projects, VFS, Multi-Tab Code Editor,
 * Interactive Line Diffs, Checkpoints, DevTools Drawer, System Instructions, and Command Palette.
 */

import {
  STORAGE_KEYS,
  safeStorageGet,
  safeStorageJsonGet,
  safeStorageSet,
  escapeHtml,
  generateId,
  timeAgo,
  formatTimeShort,
} from './storage.mjs';
import { computeLineDiff, computeFileSetDiff } from './diff.mjs';
import {
  splitReasoningContent,
  sanitizeVfsPath,
  parseStreamedVFS,
  applyStructuredFileOps,
  getParsedFilePaths,
  detectActiveWritingFile,
} from './stream-parser.mjs';
import {
  estimateTokens,
  estimateContextBudget,
  isHtmlVfs,
  classifyRequestMode,
  buildModeInstructions,
  buildFileContext,
  buildChatMessageContent,
  collectStaticProjectIssues,
} from './context-budget.mjs';
import { PROVIDER_PRESETS, AIProvider } from './providers.mjs';
import { SkillManager, DEFAULT_BASE_SYSTEM_PROMPT } from './skills.mjs';
import { listCheckpoints, createCheckpoint, getCheckpoint, deleteCheckpoint } from './checkpoints.mjs';
import { seedDemoProjects } from './demos.mjs';
import { PreviewManager } from './preview.mjs';
import { PromptBuilder } from './prompt-builder.mjs';
import { SectionSwapModalController } from './section-swap-modal.mjs';
import { formatAttachedComponentsForPrompt } from './section-swap.mjs';
import {
  buildWatermelonStarterVfs,
  buildWatermelonPromptBlueprint,
  buildPageAssemblerBlueprint,
} from './watermelon-ecosystem.mjs';
import { createZipBlob, buildProjectExportFiles, downloadBlob } from './zip-export.mjs';
import {
  applyPopoverOrigin,
  attachInteractiveCardTilt,
  attachRubberBandScroll,
  closeDialogFast,
  computeStaggerDelayMs,
  openDialogWithOrigin,
  prefersReducedMotion,
  syncSlidingTabIndicator,
  triggerPeakEndBurst,
} from './motion.mjs';
import { hydrateKubaiIcons } from './kubai-icons.mjs';
import {
  extractSearchQuery,
  shouldAutoRunWebSearch,
  performWebSearch,
  formatSearchResultsForPrompt,
} from './web-search.mjs';
import { shouldUseSubAgents, runSubAgents } from './sub-agents.mjs';
import { UILibraryManager } from './ui-library.mjs';
import { UILibraryModalController } from './ui-library-modal.mjs';
import { normalizeComponentRecord } from './ui-normalizer.mjs';
import {
  DEMO_THUMBNAIL_MAP,
  getProjectThumbnail,
  setProjectThumbnail,
  removeProjectThumbnail,
  capturePreviewThumbnail,
} from './thumbnails.mjs';
import {
  buildPlanModeSystemDirective,
  buildOfflineDraftPlan,
  buildApprovedPlanExecutionPrompt,
  formatPlanMarkdownToHtml,
} from './plan-mode.mjs';
import {
  computeTokenRingMetrics,
  createActivityTurnState,
  addOrUpdateActivityStep,
  finalizeActivityTurn,
  buildActivitySummary,
  serializeTurnActivity,
  hydrateTurnActivity,
} from './agent-activity.mjs';
import { SettingsController } from '../../src/components/settings/index.mjs';

const GEN_JOB_MAX_AGE_MS = 45 * 60 * 1000;

export const DEFAULT_VFS = {
  'src/main.jsx': `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);`,

  'src/App.jsx': `import React, { useState } from 'react';
import { Layers, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-6">
        <div className="inline-flex p-3.5 bg-blue-600/15 border border-blue-500/30 rounded-xl text-blue-400">
          <Layers className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            WebForge App
          </h1>
          <p className="text-slate-400 text-sm">
            React workspace compiling live in your browser sandbox.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCount((c) => c + 1)}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span>Clicked {count} times</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      <footer className="mt-8 flex items-center gap-2 text-xs text-slate-500">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        <span>WebForge · Client-Side Sandbox</span>
      </footer>
    </div>
  );
}`,

  'src/index.css': `body {
  margin: 0;
  background-color: #020617;
}`,
};

export class WebForgeStudio {
  constructor() {
    this.provider = new AIProvider();
    this.skillManager = new SkillManager();
    this.uiLibraryManager = new UILibraryManager();
    this.uiLibraryModal = new UILibraryModalController(this);
    this.sectionSwapModal = new SectionSwapModalController(this);
    this.settingsView = new SettingsController(this);
    this.preview = null;
    this.promptBuilder = null;

    this.projectsList = [];
    this.activeProjectId = null;
    this.VFS = {};
    this.draftFiles = {}; // path -> unsaved edited buffer (never auto-overwrites VFS)
    this.sessionBaseline = {};
    this.turnBaselines = {}; // turnId -> deep copy of VFS before generation
    this.conversationHistory = [];
    this.activeFilePath = '';
    this.openTabs = [];
    this.dirtyFiles = new Set();
    this.fileSearchQuery = '';
    this.homeSearchQuery = '';
    this._thumbObserver = null;
    this._thumbCaptureTimer = null;

    this.stageView = 'preview'; // preview | files | diff
    this.diffBaselineId = 'latest';
    this.diffSelectedFile = '';
    this.diffMode = 'unified'; // unified | split

    this.devtoolsOpen = false;
    this.devtoolsTab = 'console'; // console | problems | network
    this.consoleFilter = 'all'; // all | log | warn | error

    this.mobilePane = 'chat'; // chat | stage
    this.homeAttachments = [];
    this.wsAttachments = [];
    this.homeComponentAttachments = [];
    this.wsComponentAttachments = [];

    this.isGenerating = false;
    this.skillsDockOpen = false;
    this._activeGenJob = null;
    this._genCheckpointTimer = null;
    this._userStoppedGeneration = false;
    this._lastFailedJob = null;
    this._postGenVerifyTimer = null;
    this._autoFixInFlight = false;
    this._appPromptResolver = null;
    this._modelFilter = 'all';
    this._paletteItems = [];
    this._paletteIndex = 0;

    this.layoutPrefs = safeStorageJsonGet(STORAGE_KEYS.LAYOUT, {
      chatWidth: 420,
      devtoolsHeight: 220,
      homeSidebarCollapsed: false,
    }) || { chatWidth: 420, devtoolsHeight: 220, homeSidebarCollapsed: false };

    const savedAgentPrefs = safeStorageJsonGet(STORAGE_KEYS.AGENT_PREFS, null);
    this.agentPrefs = {
      webSearch: savedAgentPrefs?.webSearch !== undefined ? !!savedAgentPrefs.webSearch : true,
      subAgents: savedAgentPrefs?.subAgents !== undefined ? !!savedAgentPrefs.subAgents : true,
      planMode: savedAgentPrefs?.planMode !== undefined ? !!savedAgentPrefs.planMode : false,
    };
    this._subAgentAbort = null;
    this._pendingPlans = new Map();
    this._activityTurns = new Map();
    this._openActivityTurnId = null;
  }

  init() {
    this._initTheme();

    this.preview = new PreviewManager({
      onConsole: () => this._renderDevtoolsContent(),
      onError: () => {
        this._updateDevtoolsBadges();
        this._renderDevtoolsContent();
      },
      onSuccess: () => {
        this._updateDevtoolsBadges();
        this._renderDevtoolsContent();
        this._scheduleThumbnailCapture(false);
      },
      onNetwork: () => {
        this._updateDevtoolsBadges();
        this._renderDevtoolsContent();
      },
    });

    this.promptBuilder = new PromptBuilder({
      onContinueToChat: (promptText) => this._handlePromptBuilderContinue(promptText),
      onToast: (msg, isErr) => this.showToast(msg, isErr),
      getSkills: () => this.skillManager.skills,
      toggleSkill: (id) => {
        this.skillManager.toggle(id);
        this._renderSkillsIndicator();
        this._renderSkillsSettingsList();
      },
      getLibraries: () => this.uiLibraryManager.getVisibleLibraries(),
      getUiLibraryManager: () => this.uiLibraryManager,
      getActiveLibraryId: () => this.uiLibraryManager.activeLibraryId,
      setActiveLibrary: (id) => {
        this.uiLibraryManager.setActiveLibrary(id);
        this.syncUiLibraryIndicators();
      },
      openUiLibraryForSlot: (slotMeta, onPick) => {
        const preferredLib = this.uiLibraryManager.getLibrary('watermelon-ui')
          ? 'watermelon-ui'
          : (this.uiLibraryManager.getLibrary('kokonut-ui') ? 'kokonut-ui' : null);
        this.uiLibraryModal.open(preferredLib, null, {
          mode: 'pick-slot',
          slotId: slotMeta?.id || '',
          slotLabel: slotMeta?.label || 'Section',
          blocksFirst: true,
          onPickSlot: onPick,
        });
      },
      onLaunchWatermelonStarter: (item) => this.loadWatermelonStarterProject(item),
    });
    window.promptBuilder = this.promptBuilder;

    this._loadProjects();
    this._setupEventBindings();
    this._setupSettingsModal();
    this._setupEditor();
    this._setupResizers();
    this._setupAttachments();
    this._setupCommandPalette();
    this._renderSkillsIndicator();
    this._renderSkillsSettingsList();
    this._updateConnectionStatus();
    this._populateModelSelect();
    this._populateCardIcons();
    this._applyLayoutPrefs();
    this._syncAgentPrefsUI();
    this.syncUiLibraryIndicators();
    const fallbackNotice = this.uiLibraryManager?.consumeActiveLibraryFallbackNotice?.();
    if (fallbackNotice?.message) {
      setTimeout(() => this.showToast(fallbackNotice.message), 250);
    }
    this.uiLibraryManager?.fetchPreviewKitStatus?.().then(() => {
      this.syncUiLibraryIndicators();
    });
    attachRubberBandScroll(document.getElementById('agentActivityBody'));
    attachRubberBandScroll(document.querySelector('.home-sidebar-nav'));

    window.addEventListener('pagehide', () => this._flushGenCheckpoint());
    window.addEventListener('beforeunload', (e) => this._onBeforeUnloadDuringGen(e));

    this.showHomeView();
    this.settingsView.init();
    requestAnimationFrame(() => this._ensureHomeOnLaunch());
  }

  // ── Theme (Dark / Light Cobalt M3) ──

  _initTheme() {
    const saved = safeStorageGet(STORAGE_KEYS.THEME, 'dark');
    this.setTheme(saved === 'light' ? 'light' : 'dark', false);
  }

  setTheme(theme, persist = true) {
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    if (persist) safeStorageSet(STORAGE_KEYS.THEME, next);

    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      const iconName = next === 'dark' ? 'sun' : 'moon';
      const label = next === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      const iconHost = btn.querySelector('.theme-icon');
      if (iconHost) {
        iconHost.innerHTML = `<i data-lucide="${iconName}"></i>`;
        this._safeCreateIcons(btn);
      }
      const textHost = btn.querySelector('.theme-label');
      if (textHost) textHost.textContent = next === 'dark' ? 'Light mode' : 'Dark mode';
    });
  }

  toggleTheme() {
    const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    this.setTheme(current === 'dark' ? 'light' : 'dark');
  }

  _saveAgentPrefs() {
    safeStorageSet(STORAGE_KEYS.AGENT_PREFS, JSON.stringify(this.agentPrefs));
  }

  _syncAgentPrefsUI() {
    const anyActive = Boolean(this.agentPrefs.webSearch || this.agentPrefs.subAgents || this.uiLibraryManager.getActiveLibrary());
    ['btnHomeToolsMenu', 'btnWsToolsMenu'].forEach((id) => {
      document.getElementById(id)?.classList.toggle('has-active-tools', anyActive);
    });
    ['toggleHomeWebSearch', 'toggleWsWebSearch', 'toggleSettingsWebSearch'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.checked = this.agentPrefs.webSearch;
    });
    ['toggleHomeSubAgents', 'toggleWsSubAgents', 'toggleSettingsSubAgents'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.checked = this.agentPrefs.subAgents;
    });
    this._syncPlanModeUI();
    this._syncPopoverSkillCounts();
    this.syncUiLibraryIndicators();
  }

  togglePlanMode(force) {
    this.agentPrefs.planMode = typeof force === 'boolean' ? force : !this.agentPrefs.planMode;
    this._saveAgentPrefs();
    this._syncPlanModeUI();
    this.showToast(
      this.agentPrefs.planMode
        ? 'Plan Mode ON — AI will draft an editable plan before building'
        : 'Plan Mode OFF — Direct build mode'
    );
  }

  _syncPlanModeUI() {
    const enabled = Boolean(this.agentPrefs.planMode);
    ['btnHomePlanToggle', 'btnWsPlanToggle'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        btn.classList.toggle('active', enabled);
      }
    });
    const homeSendLbl = document.getElementById('homeSendBtnLabel');
    if (homeSendLbl) {
      homeSendLbl.textContent = enabled ? 'Create plan' : 'Build';
    }
    const homeSendBtn = document.getElementById('homeSendBtn');
    if (homeSendBtn) {
      homeSendBtn.setAttribute('aria-label', enabled ? 'Create implementation plan' : 'Build');
    }
    const homeInput = document.getElementById('homePromptInput');
    if (homeInput) {
      homeInput.placeholder = enabled
        ? 'Describe what you want to plan first… (Review & edit before building)'
        : 'What do you want to build?';
    }
    const wsInput = document.getElementById('chatInput');
    if (wsInput) {
      wsInput.placeholder = enabled
        ? 'Plan Mode ON — describe what to architect before coding…'
        : 'Describe changes, paste a screenshot, or debug… (Enter to Send)';
    }
  }

  syncUiLibraryIndicators() {
    const activeLib = this.uiLibraryManager?.getActiveLibrary();
    const label = activeLib ? activeLib.name : 'Off';
    ['homePopoverUiLibraryName', 'wsPopoverUiLibraryName'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = label;
    });
    const topBtn = document.getElementById('btnOpenUiLibraryTopbar');
    if (topBtn) {
      topBtn.title = activeLib ? `UI Component Library · Active: ${activeLib.name}` : 'UI Component Library (Inactive)';
    }
    this._updateContextBudgetMeter();
    this._updateHomeStatusStrip();
  }

  _syncPopoverSkillCounts() {
    const count = String(this.skillManager.getActiveCount());
    ['homePopoverSkillsCount', 'wsPopoverSkillsCount'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    });
  }

  toggleComposerToolsMenu(which, force) {
    const isHome = which === 'home';
    const pop = document.getElementById(isHome ? 'homeToolsPopover' : 'wsToolsPopover');
    const btn = document.getElementById(isHome ? 'btnHomeToolsMenu' : 'btnWsToolsMenu');
    if (!pop || !btn) return;
    const shouldOpen = typeof force === 'boolean' ? force : pop.classList.contains('hidden');
    applyPopoverOrigin(pop, btn);
    pop.classList.toggle('hidden', !shouldOpen);
    btn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    if (shouldOpen) {
      this._syncAgentPrefsUI();
      this._safeCreateIcons(pop);
    }
  }

  toggleToolbarMoreMenu(which, force) {
    const isTopbar = which === 'topbar';
    const menu = document.getElementById(isTopbar ? 'topbarMoreMenu' : 'wsToolbarMoreMenu');
    const btn = document.getElementById(isTopbar ? 'btnTopbarMore' : 'btnWsToolbarMore');
    if (!menu || !btn) return;
    const shouldOpen = typeof force === 'boolean' ? force : menu.classList.contains('hidden');
    applyPopoverOrigin(menu, btn);
    menu.classList.toggle('hidden', !shouldOpen);
    btn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    if (shouldOpen) {
      this._safeCreateIcons(menu);
    }
  }

  toggleWebSearchPref(force) {
    this.agentPrefs.webSearch = typeof force === 'boolean' ? force : !this.agentPrefs.webSearch;
    this._saveAgentPrefs();
    this._syncAgentPrefsUI();
    this.showToast(this.agentPrefs.webSearch ? 'Free Web Search enabled' : 'Web Search paused');
  }

  toggleSubAgentsPref(force) {
    this.agentPrefs.subAgents = typeof force === 'boolean' ? force : !this.agentPrefs.subAgents;
    this._saveAgentPrefs();
    this._syncAgentPrefsUI();
    this.showToast(this.agentPrefs.subAgents ? 'Parallel Sub-Agents enabled (auto sequential fallback)' : 'Single-agent sequential mode');
  }

  // ── Icons & Toast ──

  _safeCreateIcons(root) {
    hydrateKubaiIcons(root);
    if (typeof window.lucide === 'undefined') return;
    try {
      if (root) window.lucide.createIcons({ root });
      else window.lucide.createIcons();
    } catch {
      try { window.lucide.createIcons(); } catch {}
    }
  }

  _triggerViewEnter(el) {
    if (!el || prefersReducedMotion()) return;
    el.classList.remove('wf-view-enter');
    void el.offsetWidth;
    el.classList.add('wf-view-enter');
  }

  showToast(msg, isError = false, options = {}) {
    const el = document.getElementById('toast');
    if (!el) return;
    const text = String(msg || '');
    const isSuccessMilestone =
      !isError &&
      (options.celebrate === true ||
        /\b(imported|saved|applied|activated|downloaded|restored|created|ready|added|connected|copied|enabled|reverted)\b/i.test(text));

    if (isSuccessMilestone) {
      el.innerHTML = `<span class="toast-check-wrap" aria-hidden="true"><svg class="toast-check-svg" viewBox="0 0 18 18" fill="none"><circle class="toast-check-ring" cx="9" cy="9" r="7.5"/><path class="toast-check-path" d="M5.5 9.3 7.9 11.7 12.7 6.7"/></svg></span><span class="toast-text">${escapeHtml(text)}</span>`;
    } else {
      el.textContent = text;
    }

    el.classList.toggle('is-error', !!isError);
    el.classList.toggle('is-success', isSuccessMilestone);
    el.classList.remove('show');
    // Force reflow only when re-triggering draw-in check or error shake
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), isError ? 3400 : 2700);
  }

  // ── Projects & Views ──

  _getActiveProject() {
    return this.projectsList.find((p) => p.id === this.activeProjectId) || null;
  }

  _loadProjects() {
    seedDemoProjects();
    this.projectsList = safeStorageJsonGet(STORAGE_KEYS.PROJECTS, []) || [];
    this._renderProjectsList();
  }

  _saveProjects() {
    safeStorageSet(STORAGE_KEYS.PROJECTS, JSON.stringify(this.projectsList), this.activeProjectId);
  }

  showHomeView() {
    this.activeProjectId = null;
    this.conversationHistory = [];
    this.VFS = {};
    this.draftFiles = {};
    this.activeFilePath = '';
    this.openTabs = [];
    this.dirtyFiles.clear();
    this._updateUnsavedBar();
    this.setHomeDrawerOpen(false);
    this.closeActivityDrawer();

    if (this.settingsView?.isOpen) {
      this.settingsView.isOpen = false;
      const sv = document.getElementById('settingsView');
      if (sv) sv.hidden = true;
      if (typeof history !== 'undefined' && location.pathname.startsWith('/settings')) {
        try { history.pushState({}, '', '/'); } catch {}
      }
    }

    this._renderHomeProjects();
    this._updateHomeStatusStrip();
    const home = document.getElementById('homeView');
    const ws = document.getElementById('workspaceView');
    const wasHidden = home && home.style.display === 'none';
    if (home) home.style.display = 'flex';
    if (ws) ws.style.display = 'none';
    if (wasHidden) this._triggerViewEnter(home);
    this._safeCreateIcons();
  }

  isHomeViewActive() {
    const home = document.getElementById('homeView');
    if (!home) return true;
    return home.style.display !== 'none' && getComputedStyle(home).display !== 'none';
  }

  showWorkspaceView() {
    if (this.settingsView?.isOpen) {
      this.settingsView.isOpen = false;
      const sv = document.getElementById('settingsView');
      if (sv) {
        sv.classList.remove('is-open', 'is-closing');
        sv.hidden = true;
      }
      if (typeof history !== 'undefined' && location.pathname.startsWith('/settings')) {
        try { history.pushState({}, '', '/'); } catch {}
      }
    }
    if (this._thumbObserver) {
      this._thumbObserver.disconnect();
      this._thumbObserver = null;
    }
    const home = document.getElementById('homeView');
    const ws = document.getElementById('workspaceView');
    const wasHidden = ws && (ws.style.display === 'none' || !ws.style.display);
    if (home) home.style.display = 'none';
    if (ws) ws.style.display = 'flex';
    if (wasHidden) this._triggerViewEnter(ws);
    this._updateMobilePaneUI();
  }

  toggleHomeModelPopover(force) {
    const pop = document.getElementById('homeModelPopover');
    const btn = document.getElementById('homeModelBtn');
    if (!pop || !btn) return;
    const nextOpen = typeof force === 'boolean' ? force : pop.hidden;
    if (nextOpen) this._renderHomeModelPopover();
    pop.hidden = !nextOpen;
    btn.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    if (nextOpen) this._safeCreateIcons(pop);
  }

  _renderHomeModelPopover() {
    const list = document.getElementById('homeModelPopoverList');
    if (!list) return;
    const allModels = this.provider.getAllAvailableModels();
    const activeProviderId = this.provider.type;
    const activeModelId = this.provider.model;

    if (!allModels.length) {
      list.innerHTML = `<div class="home-model-pop-empty">No models loaded yet. Open provider settings to fetch or add models.</div>`;
      return;
    }

    list.innerHTML = allModels.map((item) => {
      const isSelected = item.providerId === activeProviderId && item.id === activeModelId;
      const shortName = item.name || item.id;
      return `
        <button type="button" class="home-model-pop-item ${isSelected ? 'active' : ''}" role="menuitemradio" aria-checked="${isSelected ? 'true' : 'false'}" data-pop-provider="${escapeHtml(item.providerId)}" data-pop-model="${escapeHtml(item.id)}">
          <span class="home-model-pop-item-copy">
            <span class="home-model-pop-item-name truncate">${escapeHtml(shortName)}</span>
            <span class="home-model-pop-item-provider truncate">${escapeHtml(item.providerName)}</span>
          </span>
          ${isSelected ? '<i data-lucide="check" class="home-model-pop-check"></i>' : ''}
        </button>`;
    }).join('');

    list.querySelectorAll('[data-pop-model]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const providerId = btn.dataset.popProvider;
        const modelId = btn.dataset.popModel;
        this.provider.setRoleModel('build', modelId, providerId);
        this._updateConnectionStatus();
        this._updateHomeStatusStrip();
        this._updateContextBudgetMeter();
        this.toggleHomeModelPopover(false);
      });
    });
  }

  setHomeDrawerOpen(open) {
    const sidebar = document.getElementById('homeSidebar');
    const backdrop = document.getElementById('homeSidebarBackdrop');
    if (sidebar) sidebar.classList.toggle('open', !!open);
    if (backdrop) backdrop.classList.toggle('open', !!open);
  }

  toggleHomeSidebar(force) {
    const nextCollapsed = typeof force === 'boolean' ? force : !Boolean(this.layoutPrefs.homeSidebarCollapsed);
    this.layoutPrefs.homeSidebarCollapsed = nextCollapsed;
    safeStorageSet(STORAGE_KEYS.LAYOUT, JSON.stringify(this.layoutPrefs));
    this._applyHomeSidebarState();
  }

  _applyHomeSidebarState() {
    const homeView = document.getElementById('homeView');
    const collapsed = Boolean(this.layoutPrefs.homeSidebarCollapsed);
    if (homeView) homeView.classList.toggle('sidebar-collapsed', collapsed);
    const collapseBtn = document.getElementById('btnCollapseHomeSidebar');
    const expandBtn = document.getElementById('btnExpandHomeSidebar');
    if (collapseBtn) collapseBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    if (expandBtn) expandBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  _updateHomeStatusStrip() {
    const modelLabel = document.getElementById('homeModelLabel');
    const shortModelText = this.provider.model
      ? this.provider.model.split('/').pop()
      : 'Select model';
    const fullModelText = this.provider.model
      ? `${this.provider.preset.name} · ${shortModelText}`
      : `${this.provider.preset.name} · Select model`;
    if (modelLabel) {
      modelLabel.textContent = this.provider.model
        ? `${this.provider.preset.name} · ${this.provider.model}`
        : `${this.provider.preset.name} · Select model`;
    }
    ['homePopoverModelName', 'wsPopoverModelName'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = fullModelText;
    });

    const promptVal = document.getElementById('homePromptInput')?.value || '';
    const uiGuide = this.uiLibraryManager?.buildPromptGuide() || '';
    const sysPrompt = uiGuide ? `${this.skillManager.getSystemPrompt()}\n\n${uiGuide}` : this.skillManager.getSystemPrompt();
    const budget = estimateContextBudget({
      systemPrompt: sysPrompt,
      userPrompt: promptVal,
      attachments: this.homeAttachments,
      contextWindow: this.provider.contextWindow,
    });
    const ring = computeTokenRingMetrics(budget.total, budget.limit);
    const ringBtn = document.getElementById('homeTokenRingBtn');
    const ringCircle = document.getElementById('homeTokenRingCircle');
    const tooltip = document.getElementById('homeTokenTooltip');
    if (ringBtn) {
      ringBtn.dataset.level = ring.level;
      ringBtn.setAttribute('aria-label', `Context token usage: ${ring.percent}% (${ring.detailLabel})`);
    }
    if (ringCircle) {
      ringCircle.setAttribute('stroke-dasharray', String(ring.circumference));
      ringCircle.setAttribute('stroke-dashoffset', String(ring.strokeDashoffset));
    }
    if (tooltip) {
      tooltip.innerHTML = `
        <div class="ctx-pop-head">
          <span>Context Usage</span>
          <strong class="tabular-nums">${ring.percent}%</strong>
        </div>
        <div class="ctx-pop-total tabular-nums">${ring.detailLabel}</div>
        <div class="ctx-pop-divider"></div>
        <div class="ctx-pop-row"><span>System &amp; Skills</span><span class="tabular-nums">${budget.breakdown.system.toLocaleString()}</span></div>
        <div class="ctx-pop-row"><span>Current Prompt</span><span class="tabular-nums">${budget.breakdown.prompt.toLocaleString()}</span></div>
        ${budget.breakdown.images ? `<div class="ctx-pop-row"><span>Images (${this.homeAttachments.length})</span><span class="tabular-nums">${budget.breakdown.images.toLocaleString()}</span></div>` : ''}
      `;
    }
  }

  _scheduleThumbnailCapture(force = false) {
    if (!this.activeProjectId || !this.preview?.iframe) return;
    // Preserve crisp curated demo covers until user modifies/saves the demo project
    if (!force && DEMO_THUMBNAIL_MAP[this.activeProjectId] && !safeStorageGet(`wf_thumb_${this.activeProjectId}`, null)) {
      return;
    }
    const targetProjectId = this.activeProjectId;
    clearTimeout(this._thumbCaptureTimer);
    this._thumbCaptureTimer = setTimeout(async () => {
      if (this.activeProjectId !== targetProjectId || !this.preview?.iframe) return;
      const activeProj = this._getActiveProject();
      const dataUrl = await capturePreviewThumbnail(this.preview.iframe, activeProj || {});
      if (dataUrl) {
        setProjectThumbnail(targetProjectId, dataUrl);
      }
    }, force ? 650 : 1200);
  }

  _hydrateLiveCardThumbnails(grid) {
    if (this._thumbObserver) {
      this._thumbObserver.disconnect();
      this._thumbObserver = null;
    }
    const hosts = Array.from(grid.querySelectorAll('[data-live-thumb-project]'));
    if (!hosts.length || !this.preview) return;

    const mountFrame = (host) => {
      if (host.dataset.hydrated === '1') return;
      host.dataset.hydrated = '1';
      const pid = host.dataset.liveThumbProject;
      const vfs = safeStorageJsonGet(`wf_vfs_${pid}`, null);
      if (!vfs || !Object.keys(vfs).length) return;

      const html = this.preview.buildPreviewHtml(vfs);
      const iframe = document.createElement('iframe');
      iframe.className = 'home-card-live-frame';
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      iframe.setAttribute('tabindex', '-1');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.srcdoc = html;

      const applyScale = () => {
        const w = host.clientWidth || 320;
        const scale = Math.max(0.18, w / 1280);
        iframe.style.transform = `scale(${scale})`;
      };
      applyScale();
      iframe.addEventListener('load', () => {
        host.querySelector('.home-card-thumb-placeholder')?.remove();
        setTimeout(async () => {
          const proj = this.projectsList.find((item) => item.id === pid);
          const snap = await capturePreviewThumbnail(iframe, proj || {});
          if (snap) setProjectThumbnail(pid, snap);
        }, 900);
      });
      host.appendChild(iframe);
    };

    if (typeof IntersectionObserver !== 'undefined') {
      this._thumbObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              mountFrame(entry.target);
              this._thumbObserver?.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '120px' }
      );
      hosts.forEach((h) => this._thumbObserver.observe(h));
    } else {
      hosts.forEach(mountFrame);
    }
  }

  _renderHomeProjects() {
    const sidebar = document.getElementById('homeSidebarProjects');
    if (sidebar) {
      sidebar.innerHTML = this.projectsList.map((p) => `
        <button type="button" class="home-nav-item" data-project-id="${escapeHtml(p.id)}">
          <i data-lucide="${escapeHtml(p.icon || 'folder')}"></i>
          <span class="truncate">${escapeHtml(p.name)}</span>
        </button>
      `).join('');
      sidebar.querySelectorAll('[data-project-id]').forEach((btn) => {
        btn.addEventListener('click', () => this.openProject(btn.dataset.projectId));
      });
    }

    const q = this.homeSearchQuery.trim().toLowerCase();
    const filtered = this.projectsList.filter((p) => {
      if (!q) return true;
      return `${p.name} ${p.tagline || ''}`.toLowerCase().includes(q);
    });

    const countEl = document.getElementById('homeProjectsCount');
    if (countEl) {
      countEl.textContent = `${this.projectsList.length} project${this.projectsList.length === 1 ? '' : 's'}`;
    }

    const grid = document.getElementById('homeProjectsGrid');
    if (!grid) return;

    if (!filtered.length) {
      grid.innerHTML = `
        <div class="home-empty-state">
          <i data-lucide="folder-plus"></i>
          <h3>${this.projectsList.length ? 'No matching projects' : 'No projects yet'}</h3>
          <p>${this.projectsList.length ? 'Try another search query or start a fresh build above.' : 'Describe an app above or open Prompt Builder to start your first project.'}</p>
        </div>`;
      this._safeCreateIcons(grid);
      return;
    }

    grid.innerHTML = filtered.map((p, idx) => {
      const ago = timeAgo(p.updatedAt);
      let fileCount = 0;
      const vfs = safeStorageJsonGet(`wf_vfs_${p.id}`, null);
      if (vfs && typeof vfs === 'object') fileCount = Object.keys(vfs).length;
      const safeName = escapeHtml(p.name);
      const safeId = escapeHtml(p.id);
      const icon = escapeHtml(p.icon || 'code-2');
      const thumbSrc = getProjectThumbnail(p.id);
      const staggerMs = computeStaggerDelayMs(idx, { stepMs: 40, maxTotalMs: 280 });

      const thumbMarkup = thumbSrc
        ? `<img src="${escapeHtml(thumbSrc)}" alt="${safeName} preview" loading="lazy" />`
        : `<div class="home-card-thumb-fallback" data-live-thumb-project="${safeId}">
             <div class="home-card-thumb-placeholder">
               <i data-lucide="${icon}"></i>
               <span>Live preview</span>
             </div>
           </div>`;

      return `
        <article class="home-project-card wf-stagger-in" data-project-id="${safeId}" style="--wf-stagger:${staggerMs}ms">
          <button type="button" class="home-card-open" data-action="open-project" aria-label="Open ${safeName}">
            <div class="home-card-thumb">
              ${thumbMarkup}
            </div>
          </button>
          <div class="home-card-footer">
            <button type="button" class="home-card-open home-card-copy" data-action="open-project-title" aria-label="Open ${safeName} workspace">
              <h3 class="home-card-title">${safeName}</h3>
              <p class="home-card-meta">
                <span class="tabular-nums">${fileCount} file${fileCount === 1 ? '' : 's'}</span>
                ${ago ? `<span aria-hidden="true">·</span><span class="tabular-nums">${escapeHtml(ago)}</span>` : ''}
              </p>
            </button>
            <div class="home-card-actions">
              <button type="button" class="icon-action-btn" data-action="rename-project" title="Rename ${safeName}" aria-label="Rename ${safeName}">
                <i data-lucide="pencil"></i>
              </button>
              <button type="button" class="icon-action-btn" data-action="duplicate-project" title="Duplicate ${safeName}" aria-label="Duplicate ${safeName}">
                <i data-lucide="copy"></i>
              </button>
              <button type="button" class="icon-action-btn danger" data-action="delete-project" title="Delete ${safeName}" aria-label="Delete ${safeName}">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
        </article>`;
    }).join('');

    grid.querySelectorAll('.home-project-card').forEach((card) => {
      const id = card.dataset.projectId;
      attachInteractiveCardTilt(card, { maxTilt: 4.5 });
      card.querySelector('[data-action="open-project"]')?.addEventListener('click', () => this.openProject(id));
      card.querySelector('[data-action="open-project-title"]')?.addEventListener('click', () => this.openProject(id));
      card.querySelector('[data-action="rename-project"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.renameProject(id);
      });
      card.querySelector('[data-action="duplicate-project"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.duplicateProject(id);
      });
      card.querySelector('[data-action="delete-project"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteProject(id);
      });
    });

    this._safeCreateIcons(grid);
    this._hydrateLiveCardThumbnails(grid);
  }

  _renderProjectsList() {
    const list = document.getElementById('sidebarProjectsList');
    if (list) {
      list.innerHTML = this.projectsList.map((p) => {
        const safeId = escapeHtml(p.id);
        const safeName = escapeHtml(p.name);
        return `
          <div class="project-dropdown-row" data-project-id="${safeId}">
            <button type="button" class="project-dropdown-item ${this.activeProjectId === p.id ? 'active' : ''}" data-action="switch">
              <i data-lucide="${escapeHtml(p.icon || 'folder')}"></i>
              <span class="truncate">${safeName}</span>
            </button>
            <button type="button" class="icon-action-btn" data-action="rename" title="Rename ${safeName}" aria-label="Rename ${safeName}">
              <i data-lucide="pencil"></i>
            </button>
            <button type="button" class="icon-action-btn danger" data-action="delete" title="Delete ${safeName}" aria-label="Delete ${safeName}">
              <i data-lucide="trash-2"></i>
            </button>
          </div>`;
      }).join('');

      list.querySelectorAll('.project-dropdown-row').forEach((row) => {
        const id = row.dataset.projectId;
        row.querySelector('[data-action="switch"]')?.addEventListener('click', () => {
          this.openProject(id);
          this.toggleProjectDropdown(false);
        });
        row.querySelector('[data-action="rename"]')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.renameProject(id);
        });
        row.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteProject(id);
        });
      });

      this._safeCreateIcons(list);
    }

    const activeProj = this._getActiveProject();
    const nameEl = document.getElementById('activeProjectName');
    if (nameEl) nameEl.textContent = activeProj ? activeProj.name : 'No Project';
    const titleEl = document.getElementById('workspaceProjectTitle');
    if (titleEl) titleEl.textContent = activeProj ? activeProj.name : 'project';
  }

  toggleProjectDropdown(force) {
    const dd = document.getElementById('projectDropdown');
    if (!dd) return;
    const next = typeof force === 'boolean' ? force : !dd.classList.contains('open');
    dd.classList.toggle('open', next);
    document.getElementById('projectNameBtn')?.setAttribute('aria-expanded', next ? 'true' : 'false');
  }

  openProject(projectId) {
    const proj = this.projectsList.find((p) => p.id === projectId);
    if (!proj) return;

    this.activeProjectId = projectId;
    if (!Array.isArray(proj.pinnedFiles)) proj.pinnedFiles = [];
    if (typeof proj.customInstructions !== 'string') proj.customInstructions = '';
    proj.updatedAt = Date.now();
    this._saveProjects();
    safeStorageSet(STORAGE_KEYS.LAST_PROJECT, projectId);

    this.turnBaselines = {};
    this.closeActivityDrawer();
    this.openTabs = [];
    this.draftFiles = {};
    this.dirtyFiles.clear();
    this.fileSearchQuery = '';
    const fsInput = document.getElementById('fileSearchInput');
    if (fsInput) fsInput.value = '';

    this._loadVFS(projectId);
    this.sessionBaseline = JSON.parse(JSON.stringify(this.VFS));
    this.diffBaselineId = 'session';
    if (this.activeFilePath) this.openTabs = [this.activeFilePath];
    this._renderFileTree();
    this._renderEditorTabs();
    this.openFile(this.activeFilePath, false);
    this._updateUnsavedBar();

    this.preview.clearSelectedElement();
    this.preview.clearConsole();
    this.preview.clearNetwork();
    this.preview.update(this.VFS);
    this._renderProjectsList();
    this._renderCheckpointsBadge();
    this._renderPinnedStrip();

    this.conversationHistory = safeStorageJsonGet(`wf_chat_llm_${projectId}`, []) || [];
    const chatMsgs = document.getElementById('chatMessages');
    if (chatMsgs) {
      const savedUI = safeStorageGet(`wf_chat_ui_${projectId}`, '');
      if (savedUI) {
        chatMsgs.innerHTML = savedUI;
        this._normalizeSavedChatUI(chatMsgs);
        this._bindChatMessageActions(chatMsgs);
        chatMsgs.scrollTo({ top: chatMsgs.scrollHeight });
      } else {
        chatMsgs.innerHTML = `
          <div class="msg ai">
            <div class="avatar"><i data-lucide="bot"></i></div>
            <div class="bubble">
              <div class="msg-head"><span class="name">WebForge</span></div>
              <div class="message-content ai-content">
                Workspace <strong>${escapeHtml(proj.name)}</strong> is ready. Describe a feature, attach a screenshot mockup, or click an element in preview to edit.
              </div>
            </div>
          </div>`;
      }
      this._safeCreateIcons(chatMsgs);
    }

    this.switchWorkspaceView('preview');
    this._updateRevertButtonState();
    this._updateContextBudgetMeter();
    this._updateDiffBadges();
    this._updateDevtoolsBadges();
    this._renderDevtoolsContent();
    this.showWorkspaceView();

    const pendingJob = this._loadGenJob();
    const canRetry = pendingJob && pendingJob.projectId === projectId && pendingJob.userMessage && pendingJob.status === 'running';
    this._lastFailedJob = canRetry ? pendingJob : null;
    this._setRetryAvailable(!!canRetry);
  }

  createNewProject() {
    const newProj = {
      id: generateId(),
      name: `Project ${this.projectsList.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinnedFiles: ['src/App.jsx'],
      customInstructions: '',
    };
    this.projectsList.unshift(newProj);
    this._saveProjects();
    safeStorageSet(`wf_vfs_${newProj.id}`, JSON.stringify(DEFAULT_VFS), newProj.id);
    this.openProject(newProj.id);
    return newProj;
  }

  async renameProject(projectId) {
    const proj = this.projectsList.find((p) => p.id === projectId);
    if (!proj) return;
    const nextName = await this.openAppPromptModal({
      title: 'Rename Project',
      message: 'Enter a new name for this project:',
      showInput: true,
      inputValue: proj.name,
      placeholder: 'My WebForge App',
      confirmText: 'Rename',
    });
    if (!nextName || nextName === proj.name) return;
    proj.name = nextName;
    proj.updatedAt = Date.now();
    this._saveProjects();
    this._renderProjectsList();
    this._renderHomeProjects();
    this.showToast(`Renamed to "${nextName}"`);
  }

  duplicateProject(projectId) {
    const orig = this.projectsList.find((p) => p.id === projectId);
    if (!orig) return;
    const vfs = safeStorageJsonGet(`wf_vfs_${projectId}`, DEFAULT_VFS) || DEFAULT_VFS;
    const copy = {
      id: generateId(),
      name: `${orig.name} Copy`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      icon: orig.icon || 'code-2',
      tagline: orig.tagline || 'Duplicated project',
      pinnedFiles: [...(orig.pinnedFiles || [])],
      customInstructions: orig.customInstructions || '',
    };
    this.projectsList.unshift(copy);
    this._saveProjects();
    safeStorageSet(`wf_vfs_${copy.id}`, JSON.stringify(vfs), copy.id);
    this._renderProjectsList();
    this._renderHomeProjects();
    this.showToast(`Duplicated "${orig.name}"`);
  }

  async deleteProject(projectId) {
    const proj = this.projectsList.find((p) => p.id === projectId);
    if (!proj) return;
    const ok = await this.openAppPromptModal({
      title: 'Delete Project',
      message: `Delete "${proj.name}"? All files, checkpoints, and chat history for this project will be removed.`,
      confirmText: 'Delete Project',
      danger: true,
    });
    if (!ok) return;

    this.projectsList = this.projectsList.filter((p) => p.id !== projectId);
    this._saveProjects();
    ['wf_vfs_', 'wf_chat_llm_', 'wf_chat_ui_', 'wf_vfs_history_', 'wf_project_summary_', 'wf_checkpoints_'].forEach((prefix) => {
      try { localStorage.removeItem(prefix + projectId); } catch {}
    });
    removeProjectThumbnail(projectId);
    if (this._activeGenJob?.projectId === projectId || this._loadGenJob()?.projectId === projectId) {
      this._clearGenJob();
    }

    this._renderProjectsList();
    this._renderHomeProjects();
    if (this.activeProjectId === projectId) {
      this.toggleProjectDropdown(false);
      this.showHomeView();
    }
    this.showToast(`Deleted "${proj.name}"`);
  }

  sendHomePrompt() {
    const input = document.getElementById('homePromptInput');
    const msg = (input?.value || '').trim();
    if (!msg && !this.homeAttachments.length && !this.homeComponentAttachments.length) return;
    triggerPeakEndBurst(document.getElementById('homeSendBtn'));
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }

    const attachments = this.homeAttachments.slice();
    const compAttachments = this.homeComponentAttachments.slice();
    this.homeAttachments = [];
    this.homeComponentAttachments = [];
    this._renderAttachments('home');

    this.createNewProject();
    this.wsAttachments = attachments;
    this.wsComponentAttachments = compAttachments;
    this._renderAttachments('ws');

    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.value = msg || (compAttachments.length
        ? `Build a polished web app incorporating the attached ${compAttachments.map((c) => `"${c.name}"`).join(', ')} UI component${compAttachments.length === 1 ? '' : 's'}.`
        : 'Build a web app matching the attached screenshot design.');
    }
    requestAnimationFrame(() => this.sendChatMessage());
  }

  _handlePromptBuilderContinue(promptText) {
    const fromHome = this.isHomeViewActive();
    if (fromHome || !this.activeProjectId) this.createNewProject();
    else this.showWorkspaceView();

    const input = document.getElementById('chatInput');
    if (input) {
      input.value = promptText;
      this.autoGrow(input);
      input.focus();
    }
    requestAnimationFrame(() => this.sendChatMessage());
  }

  // ── VFS, Multi-Tab Editor, File Pinning ──

  _loadVFS(projectId) {
    const saved = safeStorageJsonGet(`wf_vfs_${projectId}`, null);
    this.VFS = saved && Object.keys(saved).length ? saved : { ...DEFAULT_VFS };
    this.activeFilePath = this._pickDefaultActiveFile(this.VFS);
  }

  _pickDefaultActiveFile(vfs = this.VFS) {
    if (vfs['src/App.jsx'] !== undefined) return 'src/App.jsx';
    if (vfs['src/App.tsx'] !== undefined) return 'src/App.tsx';
    if (vfs['index.html'] !== undefined) return 'index.html';
    return Object.keys(vfs).sort()[0] || '';
  }

  _saveVFS() {
    if (this.activeProjectId) {
      safeStorageSet(`wf_vfs_${this.activeProjectId}`, JSON.stringify(this.VFS), this.activeProjectId);
    }
    this._updateDiffBadges();
    this._updateContextBudgetMeter();
    this._updateDevtoolsBadges();
  }

  _ensureValidActiveFile(preferredPath) {
    if (preferredPath && this.VFS[preferredPath] !== undefined) {
      this.activeFilePath = preferredPath;
    } else if (!this.activeFilePath || this.VFS[this.activeFilePath] === undefined) {
      this.activeFilePath = this._pickDefaultActiveFile(this.VFS);
    }
    this.openTabs = this.openTabs.filter((t) => this.VFS[t] !== undefined);
    if (this.activeFilePath && !this.openTabs.includes(this.activeFilePath)) {
      this.openTabs.push(this.activeFilePath);
    }
    this._syncEditorContent();
    this._renderEditorTabs();
  }

  _getEditorFileContent(path) {
    if (!path) return '';
    if (Object.prototype.hasOwnProperty.call(this.draftFiles, path)) {
      return this.draftFiles[path];
    }
    return this.VFS[path] ?? '';
  }

  _isFileDirty(path) {
    if (!path) return false;
    return Object.prototype.hasOwnProperty.call(this.draftFiles, path) && this.draftFiles[path] !== this.VFS[path];
  }

  _getDirtyFilePaths() {
    return Object.keys(this.draftFiles).filter((p) => this.VFS[p] !== undefined && this.draftFiles[p] !== this.VFS[p]);
  }

  _updateUnsavedBar() {
    const bar = document.getElementById('editorUnsavedBar');
    const label = document.getElementById('editorUnsavedLabel');
    if (!bar) return;

    const dirtyPaths = this._getDirtyFilePaths();
    if (!dirtyPaths.length) {
      bar.classList.add('hidden');
      return;
    }

    bar.classList.remove('hidden');
    if (label) {
      if (dirtyPaths.length === 1) {
        label.textContent = `Unsaved changes in ${dirtyPaths[0]}`;
      } else {
        label.textContent = `Unsaved changes in ${dirtyPaths.length} files (${dirtyPaths.map((p) => p.split('/').pop()).join(', ')})`;
      }
    }
  }

  _syncEditorContent() {
    const textarea = document.getElementById('codeEditor');
    const fileNameHeader = document.getElementById('activeFileName');
    const metaEl = document.getElementById('activeFileMeta');

    if (this.activeFilePath && this.VFS[this.activeFilePath] !== undefined) {
      const content = this._getEditorFileContent(this.activeFilePath);
      if (textarea) textarea.value = content;
      if (fileNameHeader) fileNameHeader.textContent = this.activeFilePath;
      if (metaEl) {
        const lineCount = content ? content.split('\n').length : 1;
        metaEl.textContent = `${lineCount} lines · ${content.length.toLocaleString()} chars`;
      }
    } else {
      if (textarea) textarea.value = '';
      if (fileNameHeader) fileNameHeader.textContent = 'No file selected';
      if (metaEl) metaEl.textContent = '';
    }
    this.updateCodeHighlight();
    this._updateUnsavedBar();
  }

  _getPinnedSet() {
    const proj = this._getActiveProject();
    return new Set(proj?.pinnedFiles || []);
  }

  togglePinFile(path) {
    const proj = this._getActiveProject();
    if (!proj || !path) return;
    if (!Array.isArray(proj.pinnedFiles)) proj.pinnedFiles = [];
    const idx = proj.pinnedFiles.indexOf(path);
    if (idx >= 0) {
      proj.pinnedFiles.splice(idx, 1);
      this.showToast(`Unpinned ${path}`);
    } else {
      proj.pinnedFiles.push(path);
      this.showToast(`Pinned ${path} to priority context`);
    }
    this._saveProjects();
    this._renderFileTree();
    this._renderPinnedStrip();
    this._updateContextBudgetMeter();
  }

  _renderPinnedStrip() {
    const strip = document.getElementById('pinnedFilesStrip');
    if (!strip) return;
    const pinned = (this._getActiveProject()?.pinnedFiles || []).filter((p) => this.VFS[p] !== undefined);
    if (!pinned.length) {
      strip.classList.add('hidden');
      strip.innerHTML = '';
      return;
    }
    strip.classList.remove('hidden');
    strip.innerHTML = `<span class="pinned-label"><i data-lucide="pin"></i> Pinned</span>` + pinned.map((p) => `
      <span class="pinned-item">
        <button type="button" class="pinned-open" data-pin-open="${escapeHtml(p)}">${escapeHtml(p.split('/').pop())}</button>
        <button type="button" class="pinned-remove" data-pin-remove="${escapeHtml(p)}" aria-label="Unpin ${escapeHtml(p)}"><i data-lucide="x"></i></button>
      </span>
    `).join('');

    strip.querySelectorAll('[data-pin-open]').forEach((btn) => {
      btn.addEventListener('click', () => this.openFile(btn.dataset.pinOpen, true));
    });
    strip.querySelectorAll('[data-pin-remove]').forEach((btn) => {
      btn.addEventListener('click', () => this.togglePinFile(btn.dataset.pinRemove));
    });
    this._safeCreateIcons(strip);
  }

  _renderFileTree() {
    const tree = document.getElementById('fileTree');
    if (!tree) return;
    const pinnedSet = this._getPinnedSet();
    const q = this.fileSearchQuery.trim().toLowerCase();

    const files = Object.keys(this.VFS)
      .filter((p) => !q || p.toLowerCase().includes(q))
      .sort((a, b) => {
        const pa = pinnedSet.has(a) ? 0 : 1;
        const pb = pinnedSet.has(b) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return a.localeCompare(b);
      });

    if (!files.length) {
      tree.innerHTML = `<div class="file-tree-empty">No matching files</div>`;
      return;
    }

    tree.innerHTML = files.map((path) => {
      const isActive = path === this.activeFilePath;
      const isPinned = pinnedSet.has(path);
      const parts = path.split('/');
      const name = parts[parts.length - 1];
      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
      const safePath = escapeHtml(path);

      let icon = 'file-text';
      if (/\.css$/i.test(path)) icon = 'palette';
      else if (/\.(jsx|tsx)$/i.test(path)) icon = 'atom';
      else if (/\.html$/i.test(path)) icon = 'file-code';
      else if (/\.(ts|js|json)$/i.test(path)) icon = 'braces';

      return `
        <div class="file-item ${isActive ? 'active' : ''}" data-path="${safePath}">
          <button type="button" class="file-item-open" data-action="open" title="${safePath}">
            <i data-lucide="${icon}"></i>
            <span class="file-item-name truncate">${escapeHtml(name)}</span>
            ${folder ? `<span class="file-item-dir truncate">${escapeHtml(folder)}</span>` : ''}
          </button>
          <div class="file-item-actions ${isPinned ? 'has-pin' : ''}">
            <button type="button" class="row-action-btn ${isPinned ? 'pinned' : ''}" data-action="pin" title="${isPinned ? 'Unpin from LLM context' : 'Pin to LLM context'}" aria-label="${isPinned ? 'Unpin' : 'Pin'} ${safePath}">
              <i data-lucide="pin"></i>
            </button>
            <button type="button" class="row-action-btn" data-action="rename" title="Rename ${safePath}" aria-label="Rename ${safePath}">
              <i data-lucide="pencil"></i>
            </button>
            <button type="button" class="row-action-btn danger" data-action="delete" title="Delete ${safePath}" aria-label="Delete ${safePath}">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>`;
    }).join('');

    tree.querySelectorAll('.file-item').forEach((item) => {
      const path = item.dataset.path;
      item.querySelector('[data-action="open"]')?.addEventListener('click', () => this.openFile(path, false));
      item.querySelector('[data-action="pin"]')?.addEventListener('click', () => this.togglePinFile(path));
      item.querySelector('[data-action="rename"]')?.addEventListener('click', () => this.renameVFSFile(path));
      item.querySelector('[data-action="delete"]')?.addEventListener('click', () => this.deleteVFSFile(path));
    });

    this._safeCreateIcons(tree);
  }

  _renderEditorTabs() {
    const bar = document.getElementById('editorTabBar');
    if (!bar) return;
    this.openTabs = this.openTabs.filter((p) => this.VFS[p] !== undefined);
    if (this.activeFilePath && this.VFS[this.activeFilePath] !== undefined && !this.openTabs.includes(this.activeFilePath)) {
      this.openTabs.push(this.activeFilePath);
    }

    bar.innerHTML = this.openTabs.map((path) => {
      const isActive = path === this.activeFilePath;
      const isDirty = this._isFileDirty(path);
      const name = path.split('/').pop();
      const safePath = escapeHtml(path);
      return `
        <div class="editor-tab ${isActive ? 'active' : ''}" data-tab-path="${safePath}">
          <button type="button" class="editor-tab-select" data-action="switch-tab" title="${safePath}">
            <span>${escapeHtml(name)}</span>
            ${isDirty ? '<span class="tab-dirty-dot" aria-label="Unsaved edit"></span>' : ''}
          </button>
          ${this.openTabs.length > 1 ? `
            <button type="button" class="editor-tab-close" data-action="close-tab" aria-label="Close ${safePath}">
              <i data-lucide="x"></i>
            </button>` : ''}
        </div>`;
    }).join('');

    bar.querySelectorAll('[data-tab-path]').forEach((el) => {
      const p = el.dataset.tabPath;
      el.querySelector('[data-action="switch-tab"]')?.addEventListener('click', () => this.openFile(p, false));
      el.querySelector('[data-action="close-tab"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(p);
      });
    });

    this._safeCreateIcons(bar);
  }

  async closeTab(path) {
    if (this._isFileDirty(path)) {
      const ok = await this.openAppPromptModal({
        title: 'Discard Unsaved Changes?',
        message: `"${path}" has unsaved edits. Close this tab and discard those edits?`,
        confirmText: 'Discard & Close',
        danger: true,
      });
      if (!ok) return;
      delete this.draftFiles[path];
    }
    this.openTabs = this.openTabs.filter((p) => p !== path);
    if (this.activeFilePath === path) {
      this.activeFilePath = this.openTabs[this.openTabs.length - 1] || this._pickDefaultActiveFile(this.VFS);
    }
    this._syncEditorContent();
    this._renderEditorTabs();
    this._renderFileTree();
  }

  openFile(path, switchTab = true) {
    if (this.VFS[path] === undefined) return;
    this.activeFilePath = path;
    if (!this.openTabs.includes(path)) this.openTabs.push(path);
    this._syncEditorContent();
    this._renderEditorTabs();
    this._renderFileTree();
    if (switchTab) this.switchWorkspaceView('files');
  }

  _escapeCode(value) {
    return String(value).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
  }

  _highlightCode(code, path = '') {
    const html = this._escapeCode(code || '');
    if (/\.css$/i.test(path)) {
      const cssToken = /(\/\*[\s\S]*?\*\/)|([.#]?[a-zA-Z_-][\w-]*)(\s*\{)|([\w-]+)(\s*:)|(:\s*)([^;{}]+)/g;
      return html.replace(cssToken, (match, comment, selector, brace, prop, colon, valuePrefix, value) => {
        if (comment) return `<span class="tok-comment">${comment}</span>`;
        if (selector) return `<span class="tok-selector">${selector}</span>${brace}`;
        if (prop) return `<span class="tok-attr">${prop}</span>${colon}`;
        return `${valuePrefix}<span class="tok-string">${value}</span>`;
      });
    }

    const jsToken = /(&lt;\/?)([A-Za-z][\w.]*)|\b(className|htmlFor|onClick|onChange|value|type|id|href|src|alt|placeholder|role|aria-[\w-]+)(=)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|\b(import|from|export|default|function|const|let|var|return|if|else|for|while|try|catch|async|await|new|class|extends|useState|useEffect|useMemo|useRef)\b|\b(true|false|null|undefined|\d+(?:\.\d+)?)\b/g;
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

  updateCodeHighlight() {
    const textarea = document.getElementById('codeEditor');
    const highlight = document.getElementById('codeHighlight');
    const gutter = document.getElementById('codeGutter');
    if (!textarea || !highlight) return;

    const val = textarea.value || '';
    highlight.innerHTML = this._highlightCode(val, this.activeFilePath) + '\n';
    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;

    if (gutter) {
      const count = val.split('\n').length;
      const lines = [];
      for (let i = 1; i <= count; i++) lines.push(i);
      gutter.textContent = lines.join('\n');
      gutter.scrollTop = textarea.scrollTop;
    }
  }

  _setupEditor() {
    const textarea = document.getElementById('codeEditor');
    if (!textarea) return;

    const recordDraft = () => {
      this.updateCodeHighlight();
      if (!this.activeFilePath) return;
      const val = textarea.value;
      if (val === this.VFS[this.activeFilePath]) {
        delete this.draftFiles[this.activeFilePath];
      } else {
        this.draftFiles[this.activeFilePath] = val;
      }

      const metaEl = document.getElementById('activeFileMeta');
      if (metaEl) {
        const lineCount = val ? val.split('\n').length : 1;
        metaEl.textContent = `${lineCount} lines · ${val.length.toLocaleString()} chars`;
      }
      this._renderEditorTabs();
      this._updateUnsavedBar();
    };

    textarea.addEventListener('input', recordDraft);
    textarea.addEventListener('scroll', () => this.updateCodeHighlight());
    textarea.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.saveActiveFileEdits();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(textarea.selectionEnd);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        recordDraft();
      }
    });
  }

  discardActiveFileEdits() {
    const dirtyPaths = this._getDirtyFilePaths();
    if (!dirtyPaths.length) return;

    // Discard all current unsaved drafts cleanly
    this.draftFiles = {};
    this._syncEditorContent();
    this._renderEditorTabs();
    this._updateUnsavedBar();
    this.showToast(`Discarded unsaved edit${dirtyPaths.length === 1 ? '' : 's'}`);
  }

  saveActiveFileEdits() {
    const dirtyPaths = this._getDirtyFilePaths();
    if (!dirtyPaths.length || !this.activeProjectId) return;

    const vfsBefore = JSON.parse(JSON.stringify(this.VFS));
    this.saveVFSHistory();

    for (const path of dirtyPaths) {
      this.VFS[path] = this.draftFiles[path];
    }
    this.draftFiles = {};

    const proj = this._getActiveProject();
    if (proj) {
      proj.updatedAt = Date.now();
      this._saveProjects();
    }

    this._saveVFS();
    this._renderEditorTabs();
    this._updateUnsavedBar();
    this.preview.update(this.VFS);
    this._scheduleThumbnailCapture(true);
    if (this.stageView === 'diff') this._renderDiffView();

    const changedNames = dirtyPaths.map((p) => p.split('/').pop()).join(', ');
    const cp = createCheckpoint({
      projectId: this.activeProjectId,
      label: `Manual edit: ${changedNames}`,
      files: this.VFS,
      prevFiles: vfsBefore,
      type: 'manual',
    });
    this._renderCheckpointsBadge();

    const fileDiffs = computeFileSetDiff(vfsBefore, this.VFS);
    this._appendVersionCardInChat({
      title: 'Manual code edit saved',
      meta: `${dirtyPaths.length} file${dirtyPaths.length === 1 ? '' : 's'}`,
      fileDiffs,
      checkpoint: cp,
      revertLabel: 'Revert to Before Edit',
    });

    this.showToast(`Saved ${changedNames}`);
  }

  _appendVersionCardInChat({ title, meta, fileDiffs = [], checkpoint = null, revertLabel = 'Revert to Before Edit' }) {
    const turnId = `turn-action-${generateId()}`;
    const turn = createActivityTurnState({ turnId, mode: 'KIT', prompt: title });
    turn.steps = [
      { key: 'apply', label: title, codeLabel: '', status: 'done' },
      ...fileDiffs.slice(0, 6).map((d, idx) => ({
        key: `file-${idx}`,
        label: 'Updated',
        codeLabel: d.path,
        status: 'done',
      })),
    ];
    finalizeActivityTurn(turn, {
      status: 'done',
      headline: title,
      elapsedSec: '0.1',
      files: fileDiffs,
      checkpointId: checkpoint?.id || '',
      hasBeforeFiles: Boolean(checkpoint?.beforeFiles),
    });
    turn.revertLabel = revertLabel || 'Revert to Before Turn';
    this._activityTurns.set(turnId, turn);

    this._addMessageBubble('ai', this._renderLovableCardHtml(turn));
    this._saveChatHistory();
  }

  async revertToBeforeCheckpoint(checkpointId) {
    if (!this.activeProjectId || !checkpointId) return;
    const cp = getCheckpoint(this.activeProjectId, checkpointId);
    const targetFiles = cp?.beforeFiles || null;
    if (!cp || !targetFiles) {
      return this.showToast('Previous version snapshot unavailable for this checkpoint', true);
    }

    const ok = await this.openAppPromptModal({
      title: 'Revert to Previous Version',
      message: `Roll back all workspace files to the exact version right before "${cp.label}"? Your current state will be saved to History first.`,
      confirmText: 'Revert Back',
    });
    if (!ok) return;

    this.saveVFSHistory();
    this.draftFiles = {};
    this.VFS = JSON.parse(JSON.stringify(targetFiles));
    this._ensureValidActiveFile(this.activeFilePath);
    this._saveVFS();
    this._renderFileTree();
    this._updateUnsavedBar();
    this.preview.update(this.VFS);
    this._scheduleThumbnailCapture(true);
    if (this.stageView === 'diff') this._renderDiffView();
    this.showToast(`Reverted to version before "${cp.label}"`);
  }

  applyActiveUiLibraryToProject(libraryId) {
    if (!this.activeProjectId) {
      return this.showToast('Open a project first to apply a UI kit', true);
    }
    const lib = this.uiLibraryManager.getLibrary(libraryId);
    if (!lib) return;

    const vfsBefore = JSON.parse(JSON.stringify(this.VFS));
    this.saveVFSHistory();
    const { nextVfs, addedPaths } = this.uiLibraryManager.applyLibraryToVfs(this.VFS, lib.id);
    this.VFS = nextVfs;
    this.uiLibraryManager.setActiveLibrary(lib.id);
    this.syncUiLibraryIndicators();

    this._saveVFS();
    this._renderFileTree();
    this._ensureValidActiveFile(this.activeFilePath);
    this.preview.update(this.VFS);
    this._scheduleThumbnailCapture(true);

    const cp = createCheckpoint({
      projectId: this.activeProjectId,
      label: `Applied UI Library: ${lib.name}`,
      files: this.VFS,
      prevFiles: vfsBefore,
      type: 'manual',
    });
    this._renderCheckpointsBadge();

    const fileDiffs = computeFileSetDiff(vfsBefore, this.VFS);
    this._appendVersionCardInChat({
      title: `Bundled ${lib.name} UI Kit`,
      meta: `${addedPaths.length} files`,
      fileDiffs,
      checkpoint: cp,
      revertLabel: 'Revert to Before UI Kit',
    });

    document.getElementById('uiLibraryModal')?.close();
    this.showToast(`Applied "${lib.name}" UI kit (${addedPaths.join(', ')})`);
  }

  insertUiElementIntoProject(lib, element) {
    if (!this.activeProjectId) {
      return this.showToast('Open a project first to insert components', true);
    }
    if (!lib || !element) return;

    const vfsBefore = JSON.parse(JSON.stringify(this.VFS));
    this.saveVFSHistory();

    if (!this.VFS['src/styles/ui-tokens.css'] || !this.VFS['src/components/ui.jsx']) {
      const { nextVfs } = this.uiLibraryManager.applyLibraryToVfs(this.VFS, lib.id);
      this.VFS = nextVfs;
    }

    const pascal = String(element.name || 'CustomElement')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('') || 'CustomElement';
    const targetPath = element.targetPath || `src/components/${pascal}.jsx`;

    if (element.companionFiles && typeof element.companionFiles === 'object') {
      for (const [compPath, compCode] of Object.entries(element.companionFiles)) {
        if (compPath && typeof compCode === 'string' && !this.VFS[compPath]) {
          this.VFS[compPath] = compCode;
        }
      }
    }

    const code = (element.code || '').trim();
    const wrapped = /export\s+/.test(code)
      ? code
      : `import React from 'react';\nimport * as UI from './ui';\n\nexport function ${pascal}() {\n  return (\n    <div className="wf-ui-scope">\n      ${code}\n    </div>\n  );\n}\nexport default ${pascal};\n`;

    this.VFS[targetPath] = wrapped;
    this._saveVFS();
    this._renderFileTree();
    this.openFile(targetPath, true);
    this.preview.update(this.VFS);

    const cp = createCheckpoint({
      projectId: this.activeProjectId,
      label: `Inserted ${element.name}`,
      files: this.VFS,
      prevFiles: vfsBefore,
      type: 'manual',
    });
    this._renderCheckpointsBadge();

    this._appendVersionCardInChat({
      title: `Inserted ${element.name} (${lib.name})`,
      meta: targetPath,
      fileDiffs: computeFileSetDiff(vfsBefore, this.VFS),
      checkpoint: cp,
      revertLabel: 'Revert Insert',
    });

    document.getElementById('uiLibraryModal')?.close();
    this.showToast(`Inserted ${targetPath}`);
  }

  async createVFSFile() {
    if (!this.activeProjectId) return this.showToast('Open a project first', true);
    const raw = await this.openAppPromptModal({
      title: 'New File',
      message: 'Enter a relative file path inside the project (e.g. src/components/Card.jsx):',
      showInput: true,
      inputValue: 'src/components/',
      placeholder: 'src/components/Card.jsx',
      confirmText: 'Create File',
    });
    if (!raw) return;
    const clean = sanitizeVfsPath(raw);
    if (!clean || clean.endsWith('/')) return this.showToast('Enter a valid file path', true);
    if (this.VFS[clean] !== undefined) {
      this.openFile(clean, true);
      return this.showToast(`"${clean}" already exists`);
    }

    this.saveVFSHistory();
    const baseName = clean.split('/').pop().replace(/\.[^.]+$/, '') || 'Component';
    const compName = baseName.replace(/[^a-zA-Z0-9]/g, '') || 'Component';
    if (/\.(jsx|tsx)$/i.test(clean)) {
      this.VFS[clean] = `import React from 'react';\n\nexport default function ${compName}() {\n  return (\n    <div className="p-4">\n      <h2>${compName}</h2>\n    </div>\n  );\n}\n`;
    } else if (/\.css$/i.test(clean)) {
      this.VFS[clean] = `/* ${clean} */\n`;
    } else if (/\.json$/i.test(clean)) {
      this.VFS[clean] = '{\n  \n}\n';
    } else if (/\.html$/i.test(clean)) {
      this.VFS[clean] = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>WebForge App</title>\n</head>\n<body>\n  <main></main>\n</body>\n</html>\n`;
    } else {
      this.VFS[clean] = `// ${clean}\n`;
    }

    this._saveVFS();
    this.openFile(clean, true);
    this.preview.update(this.VFS);
    this.showToast(`Created ${clean}`);
  }

  async renameVFSFile(oldPath) {
    if (!oldPath || this.VFS[oldPath] === undefined) return;
    const raw = await this.openAppPromptModal({
      title: 'Rename File',
      message: `Rename "${oldPath}" to:`,
      showInput: true,
      inputValue: oldPath,
      placeholder: oldPath,
      confirmText: 'Rename',
    });
    if (!raw) return;
    const nextPath = sanitizeVfsPath(raw);
    if (!nextPath || nextPath.endsWith('/')) return this.showToast('Invalid file path', true);
    if (nextPath === oldPath) return;
    if (this.VFS[nextPath] !== undefined) return this.showToast(`"${nextPath}" already exists`, true);

    this.saveVFSHistory();
    this.VFS[nextPath] = this.VFS[oldPath];
    delete this.VFS[oldPath];
    const proj = this._getActiveProject();
    if (proj?.pinnedFiles) {
      proj.pinnedFiles = proj.pinnedFiles.map((p) => (p === oldPath ? nextPath : p));
      this._saveProjects();
    }
    this.openTabs = this.openTabs.map((p) => (p === oldPath ? nextPath : p));
    if (this.activeFilePath === oldPath) this.activeFilePath = nextPath;

    this._saveVFS();
    this._renderPinnedStrip();
    this.openFile(this.activeFilePath, false);
    this.preview.update(this.VFS);
    this.showToast(`Renamed to ${nextPath}`);
  }

  async deleteVFSFile(path) {
    if (!path || this.VFS[path] === undefined) return;
    if (Object.keys(this.VFS).length <= 1) return this.showToast('Cannot delete the last remaining file', true);
    const ok = await this.openAppPromptModal({
      title: 'Delete File',
      message: `Delete "${path}" from this project? You can undo with History Revert or Checkpoints.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;

    this.saveVFSHistory();
    delete this.VFS[path];
    const proj = this._getActiveProject();
    if (proj?.pinnedFiles) {
      proj.pinnedFiles = proj.pinnedFiles.filter((p) => p !== path);
      this._saveProjects();
    }
    this._ensureValidActiveFile();
    this._saveVFS();
    this._renderPinnedStrip();
    this._renderFileTree();
    this.preview.update(this.VFS);
    this.showToast(`Deleted ${path}`);
  }

  async resetProjectVFS() {
    const ok = await this.openAppPromptModal({
      title: 'Reset Project',
      message: 'Reset workspace files to starter React boilerplate? You can restore anytime from History or Checkpoints.',
      confirmText: 'Reset',
      danger: true,
    });
    if (!ok) return;

    this.saveVFSHistory();
    this.VFS = { ...DEFAULT_VFS };
    this._saveVFS();
    this._ensureValidActiveFile('src/App.jsx');
    this._renderFileTree();
    this.preview.update(this.VFS);
    this.showToast('Workspace reset to default boilerplate');
  }

  // ── History & Checkpoints ──

  saveVFSHistory() {
    if (!this.activeProjectId) return;
    const key = `wf_vfs_history_${this.activeProjectId}`;
    const hist = safeStorageJsonGet(key, []) || [];
    const lastEntry = hist[hist.length - 1];
    if (lastEntry && JSON.stringify(lastEntry) === JSON.stringify(this.VFS)) return;
    hist.push(JSON.parse(JSON.stringify(this.VFS)));
    if (hist.length > 20) hist.shift();
    safeStorageSet(key, JSON.stringify(hist), this.activeProjectId);
    this._updateRevertButtonState();
  }

  revertVFS() {
    if (!this.activeProjectId) return;
    const key = `wf_vfs_history_${this.activeProjectId}`;
    const hist = safeStorageJsonGet(key, []) || [];
    if (!hist.length) return this.showToast('No previous version to revert to', true);

    const prev = hist.pop();
    safeStorageSet(key, JSON.stringify(hist), this.activeProjectId);
    this.draftFiles = {};
    this.VFS = prev;
    this._ensureValidActiveFile(this.activeFilePath);
    this._saveVFS();
    this._renderFileTree();
    this._updateUnsavedBar();
    this.preview.update(this.VFS);
    this._scheduleThumbnailCapture(true);
    this._updateRevertButtonState();
    if (this.stageView === 'diff') this._renderDiffView();
    this.showToast('Reverted to previous snapshot');
  }

  _updateRevertButtonState() {
    const btn = document.getElementById('btnRevertVFS');
    if (!btn) return;
    const hist = this.activeProjectId ? safeStorageJsonGet(`wf_vfs_history_${this.activeProjectId}`, []) : [];
    btn.disabled = !hist?.length;
  }

  _renderCheckpointsBadge() {
    const btn = document.getElementById('btnCheckpointsModal');
    if (!btn) return;
    const list = this.activeProjectId ? listCheckpoints(this.activeProjectId) : [];
    const countEl = btn.querySelector('.cp-count');
    if (countEl) {
      countEl.textContent = list.length ? `(${list.length})` : '';
    }
  }

  openCheckpointsModal() {
    if (!this.activeProjectId) return this.showToast('Open a project first', true);
    this._renderCheckpointsList();
    document.getElementById('checkpointsModal')?.showModal();
  }

  _renderCheckpointsList() {
    const listEl = document.getElementById('checkpointsList');
    if (!listEl || !this.activeProjectId) return;
    const cps = listCheckpoints(this.activeProjectId);
    if (!cps.length) {
      listEl.innerHTML = `<div class="cp-empty">No checkpoints saved yet. Create a manual checkpoint above or run an AI generation to create an automatic turn snapshot.</div>`;
      return;
    }

    listEl.innerHTML = cps.map((cp) => {
      const safeId = escapeHtml(cp.id);
      const changedCount = (cp.changedPaths || []).length;
      return `
        <div class="cp-row" data-cp-id="${safeId}">
          <div class="cp-row-main">
            <div class="cp-row-title">${escapeHtml(cp.label)}</div>
            <div class="cp-row-meta tabular-nums">
              <span>${cp.type === 'auto' ? 'Auto turn' : 'Manual'}</span>
              <span aria-hidden="true">·</span>
              <span>${cp.fileCount} file${cp.fileCount === 1 ? '' : 's'}</span>
              ${changedCount ? `<span aria-hidden="true">·</span><span>${changedCount} changed</span>` : ''}
              <span aria-hidden="true">·</span>
              <span>${escapeHtml(timeAgo(cp.timestamp))}</span>
            </div>
          </div>
          <div class="cp-row-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-action="diff-cp">Compare Diff</button>
            <button type="button" class="btn btn-outline btn-sm" data-action="restore-cp">Restore</button>
            <button type="button" class="icon-action-btn danger" data-action="delete-cp" aria-label="Delete checkpoint"><i data-lucide="trash-2"></i></button>
          </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.cp-row').forEach((row) => {
      const id = row.dataset.cpId;
      row.querySelector('[data-action="diff-cp"]')?.addEventListener('click', () => {
        this.diffBaselineId = id;
        document.getElementById('checkpointsModal')?.close();
        this.switchWorkspaceView('diff');
      });
      row.querySelector('[data-action="restore-cp"]')?.addEventListener('click', () => this.restoreCheckpoint(id));
      row.querySelector('[data-action="delete-cp"]')?.addEventListener('click', () => {
        deleteCheckpoint(this.activeProjectId, id);
        this._renderCheckpointsList();
        this._renderCheckpointsBadge();
        if (this.stageView === 'diff') this._renderDiffView();
      });
    });
    this._safeCreateIcons(listEl);
  }

  createManualCheckpoint() {
    if (!this.activeProjectId) return;
    const input = document.getElementById('checkpointNameInput');
    const label = (input?.value || '').trim() || `Manual save ${formatTimeShort(Date.now())}`;
    const prevCp = listCheckpoints(this.activeProjectId)[0];
    createCheckpoint({
      projectId: this.activeProjectId,
      label,
      files: this.VFS,
      prevFiles: prevCp?.files || null,
      type: 'manual',
    });
    if (input) input.value = '';
    this._renderCheckpointsList();
    this._renderCheckpointsBadge();
    this.showToast(`Saved checkpoint "${label}"`);
  }

  async restoreCheckpoint(checkpointId) {
    const cp = getCheckpoint(this.activeProjectId, checkpointId);
    if (!cp) return;
    const ok = await this.openAppPromptModal({
      title: 'Restore Checkpoint',
      message: `Restore all workspace files to "${cp.label}" (${cp.fileCount} files)? Your current state will be saved to History first.`,
      confirmText: 'Restore Snapshot',
    });
    if (!ok) return;

    this.saveVFSHistory();
    this.draftFiles = {};
    this.VFS = JSON.parse(JSON.stringify(cp.files || {}));
    this._ensureValidActiveFile(this.activeFilePath);
    this._saveVFS();
    this._renderFileTree();
    this._updateUnsavedBar();
    this.preview.update(this.VFS);
    this._scheduleThumbnailCapture(true);
    document.getElementById('checkpointsModal')?.close();
    if (this.stageView === 'diff') this._renderDiffView();
    this.showToast(`Restored "${cp.label}"`);
  }

  // ── Interactive Diff Viewer ──

  _getBaselineVfs(baselineId = this.diffBaselineId) {
    if (!this.activeProjectId) return { label: 'Empty', files: {} };
    if (baselineId && this.turnBaselines[baselineId]) {
      return { label: 'Before Last Turn', files: this.turnBaselines[baselineId] };
    }
    if (baselineId === 'session' && this.sessionBaseline && Object.keys(this.sessionBaseline).length) {
      return { label: 'Session Start', files: this.sessionBaseline };
    }
    const cps = listCheckpoints(this.activeProjectId);
    if (baselineId && baselineId !== 'latest' && baselineId !== 'session') {
      const found = cps.find((c) => c.id === baselineId);
      if (found) return { label: found.label, files: found.files || {} };
    }
    if (cps.length) {
      return { label: cps[0].label, files: cps[0].files || {} };
    }
    const hist = safeStorageJsonGet(`wf_vfs_history_${this.activeProjectId}`, []) || [];
    if (hist.length) {
      return { label: 'Previous History Snapshot', files: hist[hist.length - 1] };
    }
    if (this.sessionBaseline && Object.keys(this.sessionBaseline).length) {
      return { label: 'Session Start', files: this.sessionBaseline };
    }
    return { label: 'Starter Boilerplate', files: DEFAULT_VFS };
  }

  _updateDiffBadges() {
    const { files: baseFiles } = this._getBaselineVfs();
    const diffs = computeFileSetDiff(baseFiles, this.VFS);
    const badge = document.getElementById('diffChangedBadge');
    if (badge) {
      badge.textContent = diffs.length ? String(diffs.length) : '';
      badge.classList.toggle('hidden', !diffs.length);
    }
  }

  openFileInDiff(path, baselineId = 'latest') {
    this.diffBaselineId = baselineId;
    this.diffSelectedFile = path;
    this.switchWorkspaceView('diff');
  }

  _renderDiffView() {
    const select = document.getElementById('diffBaselineSelect');
    const summaryEl = document.getElementById('diffSummaryMeta');
    const listEl = document.getElementById('diffFilesList');
    const bodyEl = document.getElementById('diffViewerBody');
    if (!listEl || !bodyEl) return;

    // Populate baseline dropdown
    if (select && this.activeProjectId) {
      const options = [];
      if (this.sessionBaseline && Object.keys(this.sessionBaseline).length) {
        options.push({ value: 'session', label: 'Session Start' });
      }
      const cps = listCheckpoints(this.activeProjectId);
      cps.forEach((c) => options.push({ value: c.id, label: `Checkpoint: ${c.label}` }));
      const hist = safeStorageJsonGet(`wf_vfs_history_${this.activeProjectId}`, []) || [];
      if (hist.length) {
        options.push({ value: 'latest', label: 'Previous History Snapshot' });
      }
      if (!options.length) {
        options.push({ value: 'latest', label: 'Starter Boilerplate' });
      }
      select.innerHTML = options.map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
      if (options.some((o) => o.value === this.diffBaselineId)) select.value = this.diffBaselineId;
      else this.diffBaselineId = options[0].value;
    }

    const { files: baseFiles } = this._getBaselineVfs(this.diffBaselineId);
    const diffs = computeFileSetDiff(baseFiles, this.VFS);
    const totalAdd = diffs.reduce((s, d) => s + d.added, 0);
    const totalDel = diffs.reduce((s, d) => s + d.removed, 0);

    if (summaryEl) {
      summaryEl.innerHTML = diffs.length
        ? `<span>${diffs.length} file${diffs.length === 1 ? '' : 's'} changed</span> <span class="diff-stat-add">+${totalAdd}</span> <span class="diff-stat-del">-${totalDel}</span>`
        : '<span>Working tree matches baseline</span>';
    }

    if (!diffs.length) {
      listEl.innerHTML = '<div class="file-tree-empty">No modified files</div>';
      bodyEl.innerHTML = `
        <div class="diff-empty-state">
          <i data-lucide="git-compare"></i>
          <h3>No differences against baseline</h3>
          <p>Edit a file in Code or run an AI change to inspect line-by-line additions and removals.</p>
        </div>`;
      this._safeCreateIcons(bodyEl);
      return;
    }

    if (!this.diffSelectedFile || !diffs.some((d) => d.path === this.diffSelectedFile)) {
      this.diffSelectedFile = diffs[0].path;
    }

    listEl.innerHTML = diffs.map((d) => `
      <button type="button" class="diff-file-row ${d.path === this.diffSelectedFile ? 'active' : ''}" data-diff-path="${escapeHtml(d.path)}">
        <span class="diff-status-tag status-${d.status}">${d.status[0].toUpperCase()}</span>
        <span class="diff-file-name truncate">${escapeHtml(d.path)}</span>
        <span class="diff-file-counts tabular-nums">
          ${d.added ? `<span class="diff-stat-add">+${d.added}</span>` : ''}
          ${d.removed ? `<span class="diff-stat-del">-${d.removed}</span>` : ''}
        </span>
      </button>
    `).join('');

    listEl.querySelectorAll('[data-diff-path]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.diffSelectedFile = btn.dataset.diffPath;
        this._renderDiffView();
      });
    });

    const activeDiff = diffs.find((d) => d.path === this.diffSelectedFile) || diffs[0];
    const lineDiff = computeLineDiff(activeDiff.oldContent, activeDiff.newContent);

    const headerHtml = `
      <div class="diff-file-header">
        <div class="diff-file-header-title">
          <code>${escapeHtml(activeDiff.path)}</code>
          <span class="diff-file-counts tabular-nums">
            <span class="diff-stat-add">+${lineDiff.stats.added}</span>
            <span class="diff-stat-del">-${lineDiff.stats.removed}</span>
          </span>
        </div>
        <div class="diff-file-header-actions">
          ${this.VFS[activeDiff.path] !== undefined ? `<button type="button" class="btn btn-ghost btn-sm" id="btnDiffOpenFile">Open in Code</button>` : ''}
          <button type="button" class="btn btn-outline btn-sm" id="btnDiffRevertFile">Revert File</button>
        </div>
      </div>`;

    let tableHtml = '';
    if (this.diffMode === 'split') {
      const leftRows = [];
      const rightRows = [];
      let idx = 0;
      while (idx < lineDiff.ops.length) {
        const op = lineDiff.ops[idx];
        if (op.type === 'equal') {
          leftRows.push({ num: op.oldLine, text: op.text, type: 'equal' });
          rightRows.push({ num: op.newLine, text: op.text, type: 'equal' });
          idx++;
        } else {
          const removes = [];
          const adds = [];
          while (idx < lineDiff.ops.length && lineDiff.ops[idx].type !== 'equal') {
            if (lineDiff.ops[idx].type === 'remove') removes.push(lineDiff.ops[idx]);
            else adds.push(lineDiff.ops[idx]);
            idx++;
          }
          const span = Math.max(removes.length, adds.length);
          for (let k = 0; k < span; k++) {
            leftRows.push(removes[k] ? { num: removes[k].oldLine, text: removes[k].text, type: 'remove' } : { num: '', text: '', type: 'empty' });
            rightRows.push(adds[k] ? { num: adds[k].newLine, text: adds[k].text, type: 'add' } : { num: '', text: '', type: 'empty' });
          }
        }
      }
      tableHtml = `
        <div class="diff-table-wrap">
          <table class="diff-table diff-table-split">
            <tbody>
              ${leftRows.map((l, rIdx) => {
                const r = rightRows[rIdx];
                return `
                  <tr>
                    <td class="diff-ln tabular-nums diff-${l.type}">${l.num ?? ''}</td>
                    <td class="diff-code diff-${l.type}"><pre>${escapeHtml(l.text)}</pre></td>
                    <td class="diff-ln tabular-nums diff-${r.type}">${r.num ?? ''}</td>
                    <td class="diff-code diff-${r.type}"><pre>${escapeHtml(r.text)}</pre></td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    } else {
      tableHtml = `
        <div class="diff-table-wrap">
          <table class="diff-table diff-table-unified">
            <tbody>
              ${lineDiff.ops.map((op) => {
                const mark = op.type === 'add' ? '+' : op.type === 'remove' ? '-' : ' ';
                return `
                  <tr class="diff-row-${op.type}">
                    <td class="diff-ln tabular-nums">${op.oldLine ?? ''}</td>
                    <td class="diff-ln tabular-nums">${op.newLine ?? ''}</td>
                    <td class="diff-sign">${mark}</td>
                    <td class="diff-code"><pre>${escapeHtml(op.text)}</pre></td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    }

    bodyEl.innerHTML = headerHtml + tableHtml;
    document.getElementById('btnDiffOpenFile')?.addEventListener('click', () => this.openFile(activeDiff.path, true));
    document.getElementById('btnDiffRevertFile')?.addEventListener('click', () => this.revertSingleFile(activeDiff.path, baseFiles));
  }

  async revertSingleFile(path, baseFiles) {
    const baseline = baseFiles || this._getBaselineVfs().files;
    const hasOld = Object.prototype.hasOwnProperty.call(baseline, path);
    const ok = await this.openAppPromptModal({
      title: 'Revert File',
      message: hasOld ? `Restore "${path}" to its baseline content?` : `Remove newly created "${path}"?`,
      confirmText: 'Revert File',
      danger: true,
    });
    if (!ok) return;

    this.saveVFSHistory();
    if (hasOld) this.VFS[path] = baseline[path];
    else delete this.VFS[path];

    this._ensureValidActiveFile();
    this._saveVFS();
    this._renderFileTree();
    this.preview.update(this.VFS);
    this._renderDiffView();
    this.showToast(`Reverted ${path}`);
  }

  // ── DevTools Drawer (Console / Problems / Network) ──

  toggleDevtools(force, tab = null) {
    const drawer = document.getElementById('devtoolsDrawer');
    const resizer = document.getElementById('devtoolsResizer');
    if (!drawer) return;
    if (tab) this.devtoolsTab = tab;
    this.devtoolsOpen = typeof force === 'boolean' ? force : !this.devtoolsOpen;
    drawer.classList.toggle('hidden', !this.devtoolsOpen);
    resizer?.classList.toggle('hidden', !this.devtoolsOpen);
    document.getElementById('btnToggleDevtools')?.classList.toggle('active', this.devtoolsOpen);
    if (this.devtoolsOpen) this._renderDevtoolsContent();
  }

  setDevtoolsTab(tab) {
    this.devtoolsTab = tab;
    document.querySelectorAll('.devtools-tab').forEach((btn) => {
      const active = btn.dataset.devtoolsTab === tab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (!this.devtoolsOpen) this.toggleDevtools(true, tab);
    else this._renderDevtoolsContent();
  }

  _updateDevtoolsBadges() {
    const previewErrors = this.preview?.activeErrors || [];
    const staticIssues = this.activeProjectId ? collectStaticProjectIssues(this.VFS) : [];
    const problemCount = previewErrors.length + staticIssues.length;

    const btn = document.getElementById('btnToggleDevtools');
    if (btn) {
      const badge = btn.querySelector('.devtools-err-badge');
      if (badge) {
        badge.textContent = problemCount ? String(problemCount) : '';
        badge.classList.toggle('hidden', !problemCount);
      }
      btn.classList.toggle('has-errors', problemCount > 0);
    }

    const probTabBadge = document.getElementById('tabProblemsBadge');
    if (probTabBadge) {
      probTabBadge.textContent = problemCount ? String(problemCount) : '';
      probTabBadge.classList.toggle('hidden', !problemCount);
    }
    const netTabBadge = document.getElementById('tabNetworkBadge');
    if (netTabBadge) {
      const netCount = this.preview?.networkRequests?.length || 0;
      netTabBadge.textContent = netCount ? String(netCount) : '';
      netTabBadge.classList.toggle('hidden', !netCount);
    }
  }

  _renderDevtoolsContent() {
    const body = document.getElementById('devtoolsBody');
    const filterWrap = document.getElementById('devtoolsConsoleFilters');
    const fixBtn = document.getElementById('btnDevtoolsAutoFix');
    if (!body) return;

    if (filterWrap) filterWrap.classList.toggle('hidden', this.devtoolsTab !== 'console');

    const previewErrors = this.preview?.activeErrors || [];
    const staticIssues = this.activeProjectId ? collectStaticProjectIssues(this.VFS) : [];
    const totalProblems = previewErrors.length + staticIssues.length;
    if (fixBtn) fixBtn.classList.toggle('hidden', !(this.devtoolsTab === 'problems' && totalProblems > 0));

    if (this.devtoolsTab === 'console') {
      const msgs = (this.preview?.consoleMessages || []).filter((m) => this.consoleFilter === 'all' || m.level === this.consoleFilter);
      if (!msgs.length) {
        body.innerHTML = `<div class="devtools-empty">No console output${this.consoleFilter !== 'all' ? ` for level "${this.consoleFilter}"` : ''}.</div>`;
        return;
      }
      body.innerHTML = msgs.map((m) => `
        <div class="devtools-log-row level-${escapeHtml(m.level)}">
          <span class="devtools-time tabular-nums">${escapeHtml(formatTimeShort(m.ts))}</span>
          <span class="devtools-level">${escapeHtml(m.level.toUpperCase())}</span>
          <span class="devtools-msg">${escapeHtml(m.message)}</span>
        </div>`).join('');
      body.scrollTop = body.scrollHeight;
      return;
    }

    if (this.devtoolsTab === 'problems') {
      if (!totalProblems) {
        body.innerHTML = `<div class="devtools-empty ok">No compile, runtime, or static import problems detected.</div>`;
        return;
      }
      const errHtml = previewErrors.map((e) => `
        <div class="devtools-problem-row">
          <div class="devtools-problem-head">
            <span class="devtools-problem-type">Runtime / Babel</span>
            <strong>${escapeHtml(e.title)}</strong>
          </div>
          <div class="devtools-problem-msg">${escapeHtml(e.message)}</div>
          ${e.stack ? `<pre class="devtools-problem-stack">${escapeHtml(e.stack)}</pre>` : ''}
        </div>`).join('');
      const staticHtml = staticIssues.map((issue) => `
        <div class="devtools-problem-row">
          <div class="devtools-problem-head">
            <span class="devtools-problem-type">Static Check</span>
            <strong>Import / Entry Diagnostic</strong>
          </div>
          <div class="devtools-problem-msg">${escapeHtml(issue)}</div>
        </div>`).join('');
      body.innerHTML = errHtml + staticHtml;
      return;
    }

    if (this.devtoolsTab === 'network') {
      const reqs = this.preview?.networkRequests || [];
      if (!reqs.length) {
        body.innerHTML = `<div class="devtools-empty">No fetch requests captured from sandbox yet.</div>`;
        return;
      }
      body.innerHTML = `
        <table class="devtools-net-table">
          <thead><tr><th>Method</th><th>Status</th><th>URL</th><th>Time</th></tr></thead>
          <tbody>
            ${reqs.map((r) => `
              <tr>
                <td class="tabular-nums">${escapeHtml(r.method)}</td>
                <td class="tabular-nums ${r.ok ? 'net-ok' : 'net-fail'}">${r.status || 'ERR'}</td>
                <td class="truncate">${escapeHtml(r.url)}</td>
                <td class="tabular-nums">${r.durationMs}ms</td>
              </tr>`).join('')}
          </tbody>
        </table>`;
    }
  }

  // ── System Instructions & Skills Drawer ──

  openSystemDrawer() {
    this.settingsView?.open('system-instructions');
  }

  _renderSystemDrawerSkills() {
    const container = document.getElementById('sysDrawerSkills');
    if (!container) return;
    container.innerHTML = this.skillManager.skills.map((s) => `
      <label class="sys-skill-row">
        <span class="sys-skill-copy">
          <strong>${escapeHtml(s.name)}</strong>
          <small>${escapeHtml(s.description)}</small>
        </span>
        <input type="checkbox" class="m3-switch" data-sys-skill-id="${escapeHtml(s.id)}" ${s.enabled ? 'checked' : ''} aria-label="Toggle ${escapeHtml(s.name)}">
      </label>
    `).join('');

    container.querySelectorAll('[data-sys-skill-id]').forEach((cb) => {
      cb.addEventListener('change', () => {
        this.skillManager.toggle(cb.dataset.sysSkillId);
        this._renderSkillsIndicator();
        this._renderSkillsSettingsList();
        this._updateSystemDrawerPreview();
        this._updateContextBudgetMeter();
      });
    });
  }

  _updateSystemDrawerPreview() {
    const baseText = document.getElementById('sysBaseInstructions')?.value ?? this.skillManager.baseInstructions;
    const projText = document.getElementById('sysProjectInstructions')?.value ?? (this._getActiveProject()?.customInstructions || '');
    const previewEl = document.getElementById('sysCompiledPreview');
    const statsEl = document.getElementById('sysCompiledStats');

    const prevBase = this.skillManager.baseInstructions;
    this.skillManager.baseInstructions = baseText || DEFAULT_BASE_SYSTEM_PROMPT;
    const full = this.skillManager.getSystemPrompt(projText);
    const stats = this.skillManager.getCompiledStats(projText);
    this.skillManager.baseInstructions = prevBase;

    if (previewEl) previewEl.textContent = full;
    if (statsEl) {
      statsEl.textContent = `${stats.totalTokens.toLocaleString()} tok total · Base ${stats.baseTokens} · Project ${stats.projectTokens} · ${stats.activeCount} skill${stats.activeCount === 1 ? '' : 's'}`;
    }
  }

  saveSystemDrawer() {
    const baseText = document.getElementById('sysBaseInstructions')?.value || '';
    this.skillManager.setBaseInstructions(baseText);

    const activeProj = this._getActiveProject();
    const projText = document.getElementById('sysProjectInstructions')?.value || '';
    if (activeProj) {
      activeProj.customInstructions = projText;
      this._saveProjects();
    }
    this._updateContextBudgetMeter();
    this._updateHomeStatusStrip();
    document.getElementById('systemDrawerModal')?.close();
    this.showToast('System instructions saved');
  }

  resetSystemBase() {
    const def = this.skillManager.resetBaseInstructions();
    const baseEl = document.getElementById('sysBaseInstructions');
    if (baseEl) baseEl.value = def;
    this._updateSystemDrawerPreview();
    this._updateContextBudgetMeter();
    this.showToast('Restored default base instructions');
  }

  // ── Multimodal Image Attachments ──

  _setupAttachments() {
    const bindTarget = (target, inputId, boxSelector) => {
      const fileInput = document.getElementById(inputId);
      const box = document.querySelector(boxSelector);
      fileInput?.addEventListener('change', async (e) => {
        await this._ingestFiles(e.target.files, target);
        e.target.value = '';
      });
      if (box) {
        box.addEventListener('dragover', (e) => {
          e.preventDefault();
          box.classList.add('drag-over');
        });
        box.addEventListener('dragleave', () => box.classList.remove('drag-over'));
        box.addEventListener('drop', async (e) => {
          e.preventDefault();
          box.classList.remove('drag-over');
          if (e.dataTransfer?.files?.length) await this._ingestFiles(e.dataTransfer.files, target);
        });
        box.addEventListener('paste', async (e) => {
          const items = Array.from(e.clipboardData?.items || []);
          const imageFiles = items.filter((it) => it.type.startsWith('image/')).map((it) => it.getAsFile()).filter(Boolean);
          if (imageFiles.length) await this._ingestFiles(imageFiles, target);
        });
      }
    };

    bindTarget('home', 'homeAttachInput', '.home-prompt-box');
    bindTarget('ws', 'wsAttachInput', '.composer-box');
  }

  async _ingestFiles(fileList, target) {
    const arr = target === 'home' ? this.homeAttachments : this.wsAttachments;
    const files = Array.from(fileList || []).filter((f) => /^image\/(png|jpeg|webp|gif)$/i.test(f.type));
    if (!files.length) return;

    for (const file of files) {
      if (arr.length >= 4) {
        this.showToast('Maximum 4 image attachments per message', true);
        break;
      }
      if (file.size > 4 * 1024 * 1024) {
        this.showToast(`${file.name} exceeds 4MB limit`, true);
        continue;
      }
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });
      arr.push({ id: generateId(), name: file.name || 'screenshot.png', dataUrl });
    }
    this._renderAttachments(target);
    this._updateContextBudgetMeter();
    this._updateHomeStatusStrip();
  }

  attachUiComponentToChat(target = 'ws', lib = null, element = null) {
    if (!lib || !element) return;
    const resolvedTarget = target === 'home' ? 'home' : 'ws';
    const list = resolvedTarget === 'home' ? this.homeComponentAttachments : this.wsComponentAttachments;
    const key = `${lib.id}::${element.id || element.name}`;

    // Step 6: Never attach a failed component
    const rawStatus = element.verificationStatus || element.status || '';
    if (rawStatus === 'failed') {
      const code = element.reasonCode ? ` (${element.reasonCode})` : '';
      this.showToast(`Cannot attach "${element.name || 'component'}": failed verification${code}`, true);
      return;
    }

    if (list.some((item) => item.key === key)) {
      this.showToast(`"${element.name}" is already attached`);
      return;
    }
    if (list.length >= 4) {
      this.showToast('Maximum 4 UI component attachments per message', true);
      return;
    }

    const normalized = element.manifest
      ? element
      : normalizeComponentRecord(element, { libraryId: lib.id });

    if (normalized.status === 'failed') {
      const code = normalized.reasonCode ? ` (${normalized.reasonCode})` : '';
      this.showToast(`Cannot attach "${element.name || 'component'}": ${normalized.reasonMessage || 'failed verification'}${code}`, true);
      return;
    }

    const swatch = lib.swatches?.[2] || lib.swatches?.[0] || '#F59E0B';
    const attachment = {
      id: generateId(),
      key,
      componentId: String(element.id || element.name || ''),
      libraryId: String(lib.id || ''),
      libraryName: String(lib.name || lib.id || 'UI Library'),
      librarySwatch: swatch,
      name: String(element.name || normalized.title || 'Component'),
      category: String(element.category || normalized.category || 'component'),
      description: String(element.description || normalized.description || '').trim(),
      status: rawStatus || normalized.status || 'verified',
      hash: String(element.hash || normalized.hash || ''),
      code: String(
        normalized.code ||
        element.code ||
        element.jsxCode ||
        element.htmlCode ||
        element.renderedHtml ||
        element.previewHtml ||
        ''
      ).trim(),
      renderedHtml: String(element.renderedHtml || normalized.renderedHtml || '').trim(),
      manifest: normalized.manifest || { dependencies: {}, tailwindVersion: 4, css: '', keyframes: [] },
      usageNotes: String(element.usageNotes || normalized.usageNotes || '').trim(),
    };
    list.push(attachment);

    // Track attached manifest on active project so ZIP export merges pinned deps cleanly
    const activeProj = this._getActiveProject?.();
    if (activeProj && attachment.manifest) {
      if (!Array.isArray(activeProj.attachedManifests)) activeProj.attachedManifests = [];
      activeProj.attachedManifests.push(attachment.manifest);
      this._saveProjects?.();
    }

    this._renderAttachments(resolvedTarget);
    this._updateContextBudgetMeter();
    this._updateHomeStatusStrip();
    this.showToast(`Attached "${attachment.name}" (${lib.name}) to chat`);

    const inputEl = document.getElementById(resolvedTarget === 'home' ? 'homePromptInput' : 'chatInput');
    if (inputEl) {
      inputEl.focus();
    }
  }

  toggleWatermelonResourceSkill(skillDef) {
    if (!skillDef?.id || !this.skillManager?.toggleExternalSkill) return;
    const { enabled } = this.skillManager.toggleExternalSkill(skillDef);
    this._renderSkillsIndicator();
    this._renderSkillsSettingsList();
    this.promptBuilder?.syncStudioState?.();
    this.showToast(
      enabled
        ? `Enabled "${skillDef.name}" as an active AI Skill`
        : `Disabled "${skillDef.name}" AI Skill`
    );
  }

  loadWatermelonStarterProject(item) {
    if (!item) return;
    const vfs = buildWatermelonStarterVfs(item);
    const kindLabel = item.wfCollection === 'templates' ? 'Template' : 'Dashboard';
    const cleanName = String(item.name || 'Watermelon Starter').trim();
    const newProj = {
      id: generateId(),
      name: cleanName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinnedFiles: ['index.html', 'src/App.jsx'],
      customInstructions: `Built from Watermelon UI ${kindLabel} starter: ${cleanName}. Preserve its clean dark architectural layout, 1px borders, tabular numbers, and responsive grid while customizing copy, data, and interactive views as requested.`,
    };
    this.projectsList.unshift(newProj);
    this._saveProjects();
    safeStorageSet(`wf_vfs_${newProj.id}`, JSON.stringify(vfs), newProj.id);

    const uiModal = document.getElementById('uiLibraryModal');
    if (uiModal?.open) uiModal.close();
    const pbModal = document.getElementById('promptBuilderModal');
    if (pbModal?.open) pbModal.close();

    this.openProject(newProj.id);
    this.showToast(`Loaded Watermelon ${kindLabel} starter "${cleanName}" — ready to edit or customize with AI`);

    const chatInput = document.getElementById('chatInput');
    if (chatInput && !chatInput.value.trim()) {
      chatInput.placeholder = `Customize "${cleanName}" (e.g., rename brand, swap KPI metrics, add a new tab)…`;
    }
    return newProj;
  }

  openPromptStudioWithWatermelonStarter(item) {
    if (!item) return;
    const uiModal = document.getElementById('uiLibraryModal');
    if (uiModal?.open) uiModal.close();
    const bp = buildWatermelonPromptBlueprint(item);
    this.openPromptBuilderModal();
    this.promptBuilder?.applyCustomBlueprint?.(bp);
    this.promptBuilder?.goToStep?.(1);
  }

  loadAssembledBlocksIntoPromptStudio(blocks = []) {
    if (!Array.isArray(blocks) || !blocks.length) return;
    const uiModal = document.getElementById('uiLibraryModal');
    if (uiModal?.open) uiModal.close();
    this.openPromptBuilderModal();
    this.promptBuilder?.loadBlocksIntoSlots?.(blocks);
  }

  attachPageAssemblerToChat(blocks = []) {
    if (!Array.isArray(blocks) || !blocks.length) return;
    const blueprint = buildPageAssemblerBlueprint(blocks);
    const wmLib = this.uiLibraryManager.getLibrary('watermelon-ui') || {
      id: 'watermelon-ui',
      name: 'Watermelon UI',
      swatches: ['#09090B', '#18181B', '#10B981', '#FAFAFA'],
    };
    const isWorkspace = Boolean(
      this.activeProjectId && document.getElementById('workspaceView')?.classList.contains('active')
    );
    const target = isWorkspace ? 'ws' : 'home';
    const namesSummary = blocks.map((b) => b.name).slice(0, 3).join(' → ');
    const suffix = blocks.length > 3 ? ` +${blocks.length - 3}` : '';
    this.attachUiComponentToChat(target, wmLib, {
      id: `wm-assembler-${Date.now()}`,
      name: `Page Blueprint (${blocks.length} Blocks)`,
      category: 'blocks',
      description: `Ordered Watermelon UI page assembly: ${namesSummary}${suffix}`,
      code: blueprint,
    });
  }

  _renderAttachments(target) {
    const row = document.getElementById(target === 'home' ? 'homeAttachmentsRow' : 'wsAttachmentsRow');
    const imgArr = target === 'home' ? this.homeAttachments : this.wsAttachments;
    const compArr = target === 'home' ? this.homeComponentAttachments : this.wsComponentAttachments;
    if (!row) return;
    if (!imgArr.length && !compArr.length) {
      row.classList.add('hidden');
      row.innerHTML = '';
      return;
    }
    row.classList.remove('hidden');
    const imgChips = imgArr.map((img) => `
      <div class="attachment-chip" data-att-kind="image" data-att-id="${escapeHtml(img.id)}">
        <img src="${escapeHtml(img.dataUrl)}" alt="${escapeHtml(img.name)}">
        <span class="truncate">${escapeHtml(img.name)}</span>
        <button type="button" class="attachment-remove" aria-label="Remove ${escapeHtml(img.name)}"><i data-lucide="x"></i></button>
      </div>
    `).join('');

    const compChips = compArr.map((comp) => `
      <div class="attachment-chip attachment-chip-ui" data-att-kind="component" data-att-id="${escapeHtml(comp.id)}" title="${escapeHtml(comp.name)} · ${escapeHtml(comp.libraryName)}">
        <span class="att-ui-dot" style="background:${escapeHtml(comp.librarySwatch || '#F59E0B')}" aria-hidden="true"></span>
        <span class="att-ui-copy">
          <strong class="att-ui-name truncate">${escapeHtml(comp.name)}</strong>
          <small class="att-ui-lib truncate">${escapeHtml(comp.libraryName)}</small>
        </span>
        <button type="button" class="attachment-remove" aria-label="Remove ${escapeHtml(comp.name)}"><i data-lucide="x"></i></button>
      </div>
    `).join('');

    row.innerHTML = imgChips + compChips;

    row.querySelectorAll('.attachment-chip').forEach((chip) => {
      chip.querySelector('.attachment-remove')?.addEventListener('click', () => {
        const kind = chip.dataset.attKind;
        const list = kind === 'component'
          ? (target === 'home' ? this.homeComponentAttachments : this.wsComponentAttachments)
          : (target === 'home' ? this.homeAttachments : this.wsAttachments);
        const idx = list.findIndex((x) => x.id === chip.dataset.attId);
        if (idx >= 0) list.splice(idx, 1);
        this._renderAttachments(target);
        this._updateContextBudgetMeter();
        this._updateHomeStatusStrip();
      });
    });
    this._safeCreateIcons(row);
  }

  // ── Context Budget Meter ──

  _updateContextBudgetMeter() {
    const meter = document.getElementById('contextBudgetMeter');
    if (!meter || !this.activeProjectId) return;

    const proj = this._getActiveProject();
    const msg = document.getElementById('chatInput')?.value || '';
    const mode = classifyRequestMode(msg, this.conversationHistory.some((m) => m.role === 'user'), this.preview?.activeErrors || []);
    const { contextText } = buildFileContext({
      vfs: this.VFS,
      message: msg,
      mode,
      activeFilePath: this.activeFilePath,
      pinnedFiles: proj?.pinnedFiles || [],
    });

    const uiGuide = this.uiLibraryManager?.buildPromptGuide() || '';
    const baseSys = this.skillManager.getSystemPrompt(proj?.customInstructions || '');
    const budget = estimateContextBudget({
      systemPrompt: uiGuide ? `${baseSys}\n\n${uiGuide}` : baseSys,
      history: this.conversationHistory.slice(-10),
      vfsContext: contextText,
      userPrompt: msg,
      attachments: this.wsAttachments,
      contextWindow: this.provider.contextWindow,
    });

    const ring = computeTokenRingMetrics(budget.total, budget.limit);
    const ringCircle = document.getElementById('wsTokenRingCircle');
    const popover = document.getElementById('contextBudgetPopover');

    meter.dataset.level = ring.level;
    meter.setAttribute('aria-label', `Context window usage: ${ring.percent}% (${ring.detailLabel})`);
    if (ringCircle) {
      ringCircle.setAttribute('stroke-dasharray', String(ring.circumference));
      ringCircle.setAttribute('stroke-dashoffset', String(ring.strokeDashoffset));
    }
    if (popover) {
      popover.innerHTML = `
        <div class="ctx-pop-head">
          <span>Context Window</span>
          <strong class="tabular-nums">${ring.percent}%</strong>
        </div>
        <div class="ctx-pop-total tabular-nums">${ring.detailLabel}</div>
        <div class="ctx-pop-divider"></div>
        <div class="ctx-pop-row"><span>System &amp; Skills</span><span class="tabular-nums">${budget.breakdown.system.toLocaleString()}</span></div>
        <div class="ctx-pop-row"><span>Codebase (${(proj?.pinnedFiles || []).length} pinned)</span><span class="tabular-nums">${budget.breakdown.files.toLocaleString()}</span></div>
        <div class="ctx-pop-row"><span>Chat History</span><span class="tabular-nums">${budget.breakdown.history.toLocaleString()}</span></div>
        <div class="ctx-pop-row"><span>Current Prompt</span><span class="tabular-nums">${budget.breakdown.prompt.toLocaleString()}</span></div>
        ${budget.breakdown.images ? `<div class="ctx-pop-row"><span>Images (${this.wsAttachments.length})</span><span class="tabular-nums">${budget.breakdown.images.toLocaleString()}</span></div>` : ''}
      `;
    }
  }

  // ── Generation, Agentic Reasoning Trace & File Rollback ──

  _saveGenJob(patch = {}) {
    if (!this._activeGenJob && !patch.projectId && !patch.userMessage) return;
    this._activeGenJob = { ...this._activeGenJob, ...patch, updatedAt: Date.now() };
    safeStorageSet(STORAGE_KEYS.ACTIVE_GEN, JSON.stringify(this._activeGenJob), this.activeProjectId);
  }

  _clearGenJob() {
    this._activeGenJob = null;
    clearTimeout(this._genCheckpointTimer);
    this._genCheckpointTimer = null;
    try { localStorage.removeItem(STORAGE_KEYS.ACTIVE_GEN); } catch {}
  }

  _loadGenJob() {
    return safeStorageJsonGet(STORAGE_KEYS.ACTIVE_GEN, null);
  }

  _scheduleGenCheckpoint(streamedCode) {
    if (this._genCheckpointTimer) return;
    this._genCheckpointTimer = setTimeout(() => {
      this._genCheckpointTimer = null;
      if (!this.isGenerating || !this._activeGenJob) return;
      this._saveGenJob({ streamedCode, status: 'running' });
      this._saveVFS();
      this._saveChatHistory();
    }, 450);
  }

  _flushGenCheckpoint() {
    if (!this.isGenerating || !this._activeGenJob) return;
    clearTimeout(this._genCheckpointTimer);
    this._genCheckpointTimer = null;
    this._saveGenJob({ status: 'running', interruptedAt: Date.now() });
    this._saveVFS();
    this._saveChatHistory();
  }

  _onBeforeUnloadDuringGen(e) {
    if (!this.isGenerating) return;
    this._flushGenCheckpoint();
    e.preventDefault();
    e.returnValue = '';
  }

  _ensureHomeOnLaunch() {
    if (this.settingsView?.isOpen || (typeof location !== 'undefined' && location.pathname.startsWith('/settings'))) {
      return;
    }
    this._setRetryAvailable(false);
    const job = this._loadGenJob();
    const fresh = job && job.status === 'running' && job.projectId && job.userMessage
      && (Date.now() - (job.updatedAt || job.startedAt || 0)) < GEN_JOB_MAX_AGE_MS
      && this.projectsList.some((p) => p.id === job.projectId);
    if (fresh) {
      this.showHomeView();
      if ((job.resumeCount || 0) >= 3) {
        this._clearGenJob();
        return;
      }
      this._lastFailedJob = job;
      const proj = this.projectsList.find((p) => p.id === job.projectId);
      this.showToast(proj ? `Unfinished build in "${proj.name}" — open to Retry` : 'Unfinished build saved — tap Retry');
      return;
    } else if (job?.status === 'running') {
      this._clearGenJob();
    }

    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const requestedProject = params?.get('project');
    if (requestedProject && this.projectsList.some((p) => p.id === requestedProject)) {
      this.openProject(requestedProject);
      return;
    }

    const solaId = 'demo-sola-ceramic';
    const hasAutoOpenedSola = safeStorageGet('wf_sola_showcase_opened', '') === '1';
    if (!hasAutoOpenedSola && this.projectsList.some((p) => p.id === solaId)) {
      safeStorageSet('wf_sola_showcase_opened', '1');
      this.openProject(solaId);
      return;
    }

    this.showHomeView();
  }

  // ── True Plan Mode (Draft → Edit → Approve & Build) ──

  async _runPlanModeTurn(finalMsg) {
    const input = document.getElementById('chatInput');
    const attachments = this.wsAttachments.slice();
    const componentAttachments = this.wsComponentAttachments.slice();
    const attHtml = attachments.length
      ? `<div class="msg-attachments">${attachments.map((a) => `<img src="${escapeHtml(a.dataUrl)}" alt="${escapeHtml(a.name)}">`).join('')}</div>`
      : '';
    const compHtml = componentAttachments.length
      ? `<div class="msg-component-chips">${componentAttachments.map((c) => `<span class="msg-comp-chip"><span class="att-ui-dot" style="background:${escapeHtml(c.librarySwatch || '#F59E0B')}"></span><strong>${escapeHtml(c.name)}</strong><span>${escapeHtml(c.libraryName)}</span></span>`).join('')}</div>`
      : '';
    this._addMessageBubble('user', `${attHtml}${compHtml}<div>${escapeHtml(finalMsg)}</div>`, { rawText: finalMsg });
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }
    this.wsAttachments = [];
    this.wsComponentAttachments = [];
    this._renderAttachments('ws');
    this._saveChatHistory();

    const planId = 'plan-' + generateId();
    const activeProj = this._getActiveProject();
    const activeUiLib = this.uiLibraryManager.getActiveLibrary();
    const planRecord = {
      id: planId,
      originalPrompt: finalMsg,
      attachments,
      componentAttachments,
      planText: '',
      status: 'streaming', // streaming | ready | approved | discarded
      editing: false,
      note: '',
    };
    this._pendingPlans.set(planId, planRecord);

    const aiBubbleId = this._addMessageBubble('ai', `<div class="plan-card" data-plan-id="${planId}"></div>`);
    const bubbleEl = aiBubbleId ? document.getElementById(aiBubbleId) : null;
    this._renderPlanCard(bubbleEl, planRecord);

    const hasModel = Boolean(this.provider?.model);
    const preset = PROVIDER_PRESETS[this.provider?.type] || {};
    const hasKeyOrLocal = !preset.needsKey || Boolean(this.provider?.apiKey);

    if (!hasModel || !hasKeyOrLocal) {
      planRecord.planText = buildOfflineDraftPlan(finalMsg, activeUiLib?.name || '');
      planRecord.status = 'ready';
      planRecord.note = 'Draft plan generated locally (configure a model in Model & Provider to draft with AI). Edit any section below, then click Approve & Build.';
      this._renderPlanCard(bubbleEl, planRecord);
      this._saveChatHistory();
      return;
    }

    try {
      this.isGenerating = true;
      this._userStoppedGeneration = false;
      this._updateGeneratingUI(true);

      const uiLibraryGuide = activeUiLib ? this.uiLibraryManager.buildPromptGuide(activeUiLib.id) : '';
      const baseSystemPrompt = this.skillManager.getSystemPrompt(activeProj?.customInstructions || '');
      const fullBase = uiLibraryGuide ? `${baseSystemPrompt}\n\n${uiLibraryGuide}` : baseSystemPrompt;
      const planSystemPrompt = buildPlanModeSystemDirective(fullBase);
      const userPayload = buildChatMessageContent(
        `Create a concise, editable implementation plan for:\n\n${finalMsg}`,
        attachments
      );

      let lastRenderAt = 0;
      const streamedPlan = await this.provider.generate(
        planSystemPrompt,
        userPayload,
        (_chunk, full) => {
          const split = splitReasoningContent(full);
          planRecord.planText = (split.content || full || '').trim();
          const now = Date.now();
          if (now - lastRenderAt > 90) {
            lastRenderAt = now;
            this._renderPlanCard(bubbleEl, planRecord);
          }
        },
        this.conversationHistory.slice(-6)
      );

      const finalSplit = splitReasoningContent(streamedPlan || '');
      const cleanPlan = (finalSplit.content || streamedPlan || '').trim();
      planRecord.planText = cleanPlan || buildOfflineDraftPlan(finalMsg, activeUiLib?.name || '');
      planRecord.status = 'ready';
      this._renderPlanCard(bubbleEl, planRecord);
      this._saveChatHistory();
    } catch (err) {
      if (err?.name === 'AbortError' || this._userStoppedGeneration) {
        if (!planRecord.planText) {
          planRecord.planText = buildOfflineDraftPlan(finalMsg, activeUiLib?.name || '');
        }
        planRecord.status = 'ready';
        planRecord.note = 'Plan generation stopped early — you can still edit this draft and click Approve & Build.';
      } else {
        planRecord.planText = buildOfflineDraftPlan(finalMsg, activeUiLib?.name || '');
        planRecord.status = 'ready';
        planRecord.note = `Draft plan generated locally (${err?.message?.slice(0, 72) || 'model unavailable'}). You can edit this plan below and click Approve & Build.`;
      }
      this._renderPlanCard(bubbleEl, planRecord);
      this._saveChatHistory();
    } finally {
      this.isGenerating = false;
      this._updateGeneratingUI(false);
    }
  }

  _renderPlanCard(bubbleEl, planRecord) {
    if (!bubbleEl || !planRecord) return;
    const card = bubbleEl.querySelector('.plan-card') || bubbleEl.querySelector('.msg-body');
    if (!card) return;

    const statusLabel = {
      streaming: 'Drafting plan…',
      ready: 'Ready for review',
      approved: 'Approved — Building',
      discarded: 'Discarded',
    }[planRecord.status] || 'Ready for review';

    card.className = `plan-card${planRecord.status === 'approved' ? ' approved' : ''}${planRecord.status === 'discarded' ? ' discarded' : ''}`;
    card.dataset.planId = planRecord.id;

    const bodyHtml = planRecord.editing
      ? `<textarea class="plan-editor-textarea" aria-label="Edit implementation plan">${escapeHtml(planRecord.planText)}</textarea>`
      : `<div class="plan-card-body">${formatPlanMarkdownToHtml(planRecord.planText, escapeHtml)}</div>`;

    const noteHtml = planRecord.note
      ? `<div class="plan-card-note">${escapeHtml(planRecord.note)}</div>`
      : '';

    const showActions = planRecord.status === 'ready';
    const actionsHtml = showActions
      ? `
        <div class="plan-card-actions">
          <button type="button" class="btn-outline sm" data-plan-action="toggle-edit">
            <i data-lucide="${planRecord.editing ? 'check' : 'pencil'}"></i>
            <span>${planRecord.editing ? 'Save Edits' : 'Edit Plan'}</span>
          </button>
          <button type="button" class="btn-outline sm" data-plan-action="discard">
            <i data-lucide="x"></i>
            <span>Discard</span>
          </button>
          <button type="button" class="plan-btn-approve" data-plan-action="approve">
            <i data-lucide="play"></i>
            <span>Approve &amp; Build</span>
          </button>
        </div>`
      : '';

    card.innerHTML = `
      <div class="plan-card-head">
        <span class="plan-card-title-wrap">
          <i data-lucide="clipboard-list"></i>
          <span>Implementation Plan</span>
        </span>
        <span class="plan-card-status">${escapeHtml(statusLabel)}</span>
      </div>
      ${noteHtml}
      ${bodyHtml}
      ${actionsHtml}
    `;

    this._safeCreateIcons(card);

    const textarea = card.querySelector('.plan-editor-textarea');
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }

    card.querySelector('[data-plan-action="toggle-edit"]')?.addEventListener('click', () => {
      if (planRecord.editing) {
        const ta = card.querySelector('.plan-editor-textarea');
        if (ta) planRecord.planText = ta.value.trim() || planRecord.planText;
        planRecord.editing = false;
        this._renderPlanCard(bubbleEl, planRecord);
        this._saveChatHistory();
        this.showToast('Plan edits saved');
      } else {
        planRecord.editing = true;
        this._renderPlanCard(bubbleEl, planRecord);
      }
    });

    card.querySelector('[data-plan-action="discard"]')?.addEventListener('click', () => {
      planRecord.editing = false;
      planRecord.status = 'discarded';
      this._renderPlanCard(bubbleEl, planRecord);
      this._saveChatHistory();
      this.showToast('Plan discarded');
    });

    card.querySelector('[data-plan-action="approve"]')?.addEventListener('click', () => {
      if (planRecord.editing) {
        const ta = card.querySelector('.plan-editor-textarea');
        if (ta) planRecord.planText = ta.value.trim() || planRecord.planText;
        planRecord.editing = false;
      }
      planRecord.status = 'approved';
      this._renderPlanCard(bubbleEl, planRecord);
      this._saveChatHistory();
      const executionPrompt = buildApprovedPlanExecutionPrompt(planRecord.originalPrompt, planRecord.planText);
      this.sendChatMessage({
        approvedPlan: {
          originalPrompt: planRecord.originalPrompt,
          planText: planRecord.planText,
          executionPrompt,
          attachments: planRecord.attachments || [],
        },
      });
    });

    const msgContainer = document.getElementById('chatMessages');
    if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  async sendChatMessage(options = {}) {
    const resumeJob = options.resumeJob || null;
    const approvedPlan = options.approvedPlan || null;
    const input = document.getElementById('chatInput');
    const msg = resumeJob
      ? String(resumeJob.userMessage || '').trim()
      : approvedPlan
        ? String(approvedPlan.executionPrompt || '').trim()
        : (input?.value || '').trim();
    if ((!msg && !this.wsAttachments.length && !this.wsComponentAttachments.length) || this.isGenerating) return;

    const finalMsg = msg || (this.wsComponentAttachments.length
      ? `Apply the attached ${this.wsComponentAttachments.map((c) => `"${c.name}"`).join(', ')} UI component${this.wsComponentAttachments.length === 1 ? '' : 's'} into the current project.`
      : 'Implement the design shown in the attached screenshot.');
    if (!this.activeProjectId) {
      if (resumeJob?.projectId && this.projectsList.some((p) => p.id === resumeJob.projectId)) {
        this.openProject(resumeJob.projectId);
      } else {
        this.createNewProject();
      }
    }

    // Intercept when Plan Mode is toggled ON (unless resuming or executing an already-approved plan)
    if (this.agentPrefs.planMode && !resumeJob && !approvedPlan) {
      await this._runPlanModeTurn(finalMsg);
      return;
    }

    const isResume = !!resumeJob;
    const attachments = isResume
      ? []
      : approvedPlan
        ? (approvedPlan.attachments || [])
        : this.wsAttachments.slice();
    const componentAttachments = isResume
      ? []
      : approvedPlan
        ? (approvedPlan.componentAttachments || [])
        : this.wsComponentAttachments.slice();
    if (!isResume) {
      this.saveVFSHistory();
      const attHtml = attachments.length
        ? `<div class="msg-attachments">${attachments.map((a) => `<img src="${escapeHtml(a.dataUrl)}" alt="${escapeHtml(a.name)}">`).join('')}</div>`
        : '';
      const compHtml = componentAttachments.length
        ? `<div class="msg-component-chips">${componentAttachments.map((c) => `<span class="msg-comp-chip"><span class="att-ui-dot" style="background:${escapeHtml(c.librarySwatch || '#F59E0B')}"></span><strong>${escapeHtml(c.name)}</strong><span>${escapeHtml(c.libraryName)}</span></span>`).join('')}</div>`
        : '';
      const displayBubbleText = approvedPlan
        ? `Approved plan — building "${approvedPlan.originalPrompt.slice(0, 120)}"`
        : finalMsg;
      this._addMessageBubble('user', `${attHtml}${compHtml}<div>${escapeHtml(displayBubbleText)}</div>`, { rawText: displayBubbleText });
      this._saveChatHistory();
      if (!approvedPlan) {
        if (input) {
          input.value = '';
          input.style.height = 'auto';
        }
        this.wsAttachments = [];
        this.wsComponentAttachments = [];
        this._renderAttachments('ws');
      }
      this._setRetryAvailable(false);
    } else if (resumeJob.historyBefore) {
      this.conversationHistory = Array.isArray(resumeJob.historyBefore) ? resumeJob.historyBefore.slice() : this.conversationHistory;
    }

    const turnId = 'turn-' + generateId();
    const vfsBeforeTurn = JSON.parse(JSON.stringify(this.VFS));
    this.turnBaselines[turnId] = vfsBeforeTurn;

    let aiBubbleId = null;

    try {
      this.isGenerating = true;
      this._userStoppedGeneration = false;
      this._updateGeneratingUI(true);
      this.preview.showLoader(isResume ? 'Resuming generation…' : 'AI is building…', 'Analyzing context and streaming code…');

      const activeProj = this._getActiveProject();
      const elementCtx = this.preview.getSelectedElementContext();
      if (!isResume) this.preview.clearSelectedElement();

      const activeUiLib = this.uiLibraryManager.getActiveLibrary();
      let uiLibraryGuide = activeUiLib ? this.uiLibraryManager.buildPromptGuide(activeUiLib.id) : '';
      if (!isResume && activeUiLib?.isRemoteCatalog && finalMsg) {
        const matchedRef = await this.uiLibraryManager.fetchRemoteAiMatches(activeUiLib.id, finalMsg, 2);
        if (matchedRef) uiLibraryGuide = `${uiLibraryGuide}\n\n${matchedRef}`;
      }
      const baseSystemPrompt = this.skillManager.getSystemPrompt(activeProj?.customInstructions || '');
      const systemPrompt = uiLibraryGuide ? `${baseSystemPrompt}\n\n${uiLibraryGuide}` : baseSystemPrompt;
      const hasUserAskedBefore = this.conversationHistory.some((m) => m.role === 'user') || isResume;
      const requestMode = classifyRequestMode(finalMsg, hasUserAskedBefore, this.preview.activeErrors || []);

      // Auto-bundle selected UI library kit into project before generating in BUILD mode
      if (!isResume && activeUiLib && requestMode === 'BUILD' && !isHtmlVfs(this.VFS) && !this.VFS['src/components/ui.jsx']) {
        const { nextVfs } = this.uiLibraryManager.applyLibraryToVfs(this.VFS, activeUiLib.id);
        this.VFS = nextVfs;
        this._saveVFS();
        this._renderFileTree();
      }

      const { contextText: fileContext } = buildFileContext({
        vfs: this.VFS,
        message: finalMsg,
        mode: requestMode,
        activeFilePath: this.activeFilePath,
        pinnedFiles: activeProj?.pinnedFiles || [],
      });
      const projectSummary = safeStorageGet(`wf_project_summary_${this.activeProjectId}`, '');
      const modeInstructions = buildModeInstructions(requestMode);

      const attachedComponentsPrompt = formatAttachedComponentsForPrompt(componentAttachments);
      let userTextPrompt = [
        elementCtx,
        projectSummary ? `Current project summary:\n${projectSummary}` : '',
        hasUserAskedBefore ? `Current codebase:\n\n${fileContext}` : `Initial starter codebase:\n\n${fileContext}`,
        `User instruction:\n${finalMsg}`,
        attachedComponentsPrompt,
        modeInstructions,
        'Output valid complete file blocks only when code changes are needed. Escape quotes/newlines inside JS strings cleanly.',
      ].filter(Boolean).join('\n\n');

      if (isResume && resumeJob.streamedCode) {
        userTextPrompt = [
          resumeJob.userContent || userTextPrompt,
          '',
          'IMPORTANT: Resume from partial output below and finish remaining complete ### FILE: blocks.',
          resumeJob.streamedCode.slice(-50000),
        ].join('\n');
      }

      const activityTurn = createActivityTurnState({
        turnId,
        mode: requestMode,
        prompt: finalMsg,
        isResume,
        startedAt: Date.now(),
      });
      this._activityTurns.set(turnId, activityTurn);

      aiBubbleId = this._addMessageBubble('ai', this._renderLovableCardHtml(activityTurn));
      const processedFiles = new Set();
      this._saveChatHistory();

      const startTime = Date.now();
      let webSearchContext = '';

      // ── Step 1: Free Keyless Web Search Grounding (when enabled or /search) ──
      if (!isResume && shouldAutoRunWebSearch({ enabled: this.agentPrefs.webSearch, userMessage: finalMsg })) {
        const searchQuery = extractSearchQuery(finalMsg);
        if (searchQuery) {
          activityTurn.headline = `Searching web…`;
          activityTurn.activeDetail = searchQuery.slice(0, 44);
          addOrUpdateActivityStep(activityTurn, {
            key: 'web-search',
            label: `Searching web for "${searchQuery.slice(0, 42)}"`,
            status: 'active',
          });
          this._syncLovableTurnBubble(aiBubbleId, activityTurn);
          try {
            const searchRes = await performWebSearch(searchQuery, { limit: 5 });
            if (searchRes?.results?.length) {
              webSearchContext = formatSearchResultsForPrompt(searchRes);
              userTextPrompt = `${webSearchContext}\n\n${userTextPrompt}`;
              activityTurn.webQuery = searchRes.query;
              activityTurn.webEngine = searchRes.engine || 'Web';
              activityTurn.webSources = searchRes.results;
              addOrUpdateActivityStep(activityTurn, {
                key: 'web-search',
                label: `Grounded with ${searchRes.results.length} web results (${searchRes.engine || 'Web'})`,
                status: 'done',
              });
              activityTurn.headline = 'Building from live context…';
              activityTurn.activeDetail = `${searchRes.results.length} web sources ready`;
              this._syncLovableTurnBubble(aiBubbleId, activityTurn);
            } else {
              addOrUpdateActivityStep(activityTurn, {
                key: 'web-search',
                label: 'Web search completed (no extra hits)',
                status: 'done',
              });
              this._syncLovableTurnBubble(aiBubbleId, activityTurn);
            }
          } catch (searchErr) {
            if (searchErr?.name === 'AbortError') throw searchErr;
          }
        }
      }

      this._activeGenJob = {
        id: resumeJob?.id || generateId(),
        projectId: this.activeProjectId,
        userMessage: finalMsg,
        userContent: userTextPrompt,
        streamedCode: resumeJob?.streamedCode || '',
        status: 'running',
        startedAt: resumeJob?.startedAt || Date.now(),
        historyBefore: resumeJob?.historyBefore || this.conversationHistory.slice(),
        resumeCount: (resumeJob?.resumeCount || 0) + (isResume ? 1 : 0),
        aiBubbleId,
      };
      this._saveGenJob(this._activeGenJob);

      let latestReasoning = '';
      let streamedCode = '';
      let finalPaths = [];
      let parsedSplit = { content: '', reasoning: '' };
      let usedSubAgentsSuccess = false;

      // ── Step 2: Parallel Sub-Agents Attempt (auto-falls back sequentially or to single agent) ──
      const trySubAgents = shouldUseSubAgents({
        mode: requestMode,
        userMessage: finalMsg,
        existingFiles: this.VFS,
        enabled: this.agentPrefs.subAgents,
        isResume,
      });

      if (trySubAgents) {
        this._subAgentAbort = new AbortController();
        activityTurn.headline = 'Building with parallel sub-agents…';
        activityTurn.activeDetail = 'Design · Sections · App Shell';
        activityTurn.subAgentMode = 'Running simultaneously';
        addOrUpdateActivityStep(activityTurn, {
          key: 'subagents',
          label: 'Coordinating parallel sub-agents',
          status: 'active',
        });
        this._syncLovableTurnBubble(aiBubbleId, activityTurn);
        this.preview.showLoader('Parallel Sub-Agents building…', 'Design · Sections · App Shell running simultaneously');

        let lastSaSync = 0;
        try {
          const saResult = await runSubAgents({
            provider: this.provider,
            systemPrompt,
            userMessage: finalMsg,
            attachments,
            webContext: webSearchContext,
            isHtml: isHtmlVfs(this.VFS),
            signal: this._subAgentAbort.signal,
            onPlan: (plan) => {
              activityTurn.subAgents = plan.map((t) => ({
                id: t.id,
                role: t.role,
                targetFiles: t.targetFiles.join(', '),
                status: 'running',
                meta: 'running…',
              }));
              this._syncLovableTurnBubble(aiBubbleId, activityTurn);
            },
            onAgentUpdate: (upd) => {
              const target = activityTurn.subAgents.find((a) => a.id === upd.id);
              if (target) {
                target.status = upd.status || 'running';
                if (upd.status === 'done') target.meta = `done · ${upd.elapsedSec}s`;
                else if (upd.status === 'retrying') target.meta = 'sequential retry…';
                else if (upd.status === 'failed') target.meta = 'failed';
                else target.meta = upd.chars ? `${Math.ceil(upd.chars / 4)}t · ${upd.elapsedSec || 0}s` : 'running…';
                if (upd.activeFile) target.targetFiles = upd.activeFile;
              }
              if (upd.activeFile) {
                activityTurn.headline = `Writing ${upd.activeFile}…`;
                activityTurn.activeDetail = `${upd.role || 'Sub-agent'} active`;
              }
              activityTurn.elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
              const now = Date.now();
              if (now - lastSaSync > 120 || upd.status === 'done' || upd.status === 'failed') {
                lastSaSync = now;
                this._syncLovableTurnBubble(aiBubbleId, activityTurn);
              }
            },
            onFallback: ({ reason }) => {
              activityTurn.subAgentMode = 'Sequential fallback';
              activityTurn.subAgentFallback = reason;
              activityTurn.headline = 'Building sequentially…';
              activityTurn.activeDetail = 'Auto-switched from parallel';
              this._syncLovableTurnBubble(aiBubbleId, activityTurn);
              this.preview.showLoader('Sequential fallback active…', 'Running remaining sub-agents one by one');
            },
          });

          if (saResult.ok && Object.keys(saResult.files).length > 0) {
            usedSubAgentsSuccess = true;
            Object.assign(this.VFS, saResult.files);
            finalPaths = Object.keys(saResult.files);
            latestReasoning = saResult.reasoning || '';
            streamedCode = Object.entries(saResult.files)
              .map(([p, c]) => `### FILE: ${p}\n\`\`\`\n${c}\n\`\`\``)
              .join('\n\n');
            parsedSplit = { content: streamedCode, reasoning: latestReasoning };
            activityTurn.reasoning = latestReasoning;
            activityTurn.subAgentMode = saResult.mode === 'parallel'
              ? `${finalPaths.length} files · parallel`
              : `${finalPaths.length} files · sequential`;
            addOrUpdateActivityStep(activityTurn, {
              key: 'subagents',
              label: `Sub-agents generated ${finalPaths.length} files`,
              status: 'done',
            });
            this._syncLovableTurnBubble(aiBubbleId, activityTurn);
          } else {
            activityTurn.subAgentMode = 'Single-agent fallback';
            activityTurn.subAgentFallback = saResult.fallbackReason || 'Parallel sub-agents unavailable — building with single agent.';
            addOrUpdateActivityStep(activityTurn, {
              key: 'subagents',
              label: 'Switched to single-agent build',
              status: 'done',
            });
            this._syncLovableTurnBubble(aiBubbleId, activityTurn);
          }
        } catch (saErr) {
          if (saErr?.name === 'AbortError' || this._userStoppedGeneration) throw saErr;
          activityTurn.subAgentMode = 'Single-agent fallback';
          activityTurn.subAgentFallback = `Parallel sub-agents unavailable (${saErr.message?.slice(0, 80) || 'error'}) — falling back to single-agent build.`;
          this._syncLovableTurnBubble(aiBubbleId, activityTurn);
        } finally {
          this._subAgentAbort = null;
        }
      }

      // ── Step 3: Standard Single-Agent Streaming Build (or fallback when sub-agents skipped/failed) ──
      if (!usedSubAgentsSuccess) {
        const userPayload = buildChatMessageContent(userTextPrompt, attachments);
        let lastUiSync = 0;

        streamedCode = await this.provider.generate(
          systemPrompt,
          userPayload,
          (chunk, full, sseReasoning) => {
            if (this._activeGenJob) this._activeGenJob.streamedCode = full;
            const split = splitReasoningContent(full);
            const combinedReasoning = [sseReasoning, split.reasoning].filter(Boolean).join('\n\n').trim();
            latestReasoning = combinedReasoning;

            if (combinedReasoning) {
              activityTurn.reasoning = combinedReasoning;
              activityTurn.isThinking = Boolean(split.isThinking);
              if (split.isThinking && processedFiles.size === 0) {
                activityTurn.headline = 'Thinking through architecture…';
                activityTurn.activeDetail = `${combinedReasoning.length.toLocaleString()} chars`;
                addOrUpdateActivityStep(activityTurn, {
                  key: 'thinking',
                  label: 'Reasoning through layout & components',
                  status: 'active',
                });
              }
            }

            const updatedVFS = parseStreamedVFS(full, this.VFS, { includePartial: false });
            Object.assign(this.VFS, updatedVFS);
            this._saveVFS();
            this._renderFileTree();
            this._scheduleGenCheckpoint(full);

            const activeWrite = detectActiveWritingFile(full);
            let fileChanged = false;
            if (activeWrite) {
              this.preview.showLoader('AI is writing code…', activeWrite);
              activityTurn.headline = `Writing ${activeWrite}…`;
              activityTurn.activeDetail = `${processedFiles.size + (processedFiles.has(activeWrite) ? 0 : 1)} file${processedFiles.size === 0 ? '' : 's'} touched`;
              if (!processedFiles.has(activeWrite)) {
                processedFiles.add(activeWrite);
                fileChanged = true;
                addOrUpdateActivityStep(activityTurn, {
                  key: `file:${activeWrite}`,
                  label: 'Writing',
                  codeLabel: activeWrite,
                  status: 'active',
                });
              }
            }

            if (this.activeFilePath && updatedVFS[this.activeFilePath]) {
              const editor = document.getElementById('codeEditor');
              if (editor && document.activeElement !== editor) {
                this._syncEditorContent();
              }
            }

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const tokCount = Math.ceil(full.length / 4);
            activityTurn.elapsedSec = elapsed;
            activityTurn.tokens = tokCount;
            this._updateStatusBar({ tokens: tokCount, time: elapsed });

            const now = Date.now();
            if (fileChanged || now - lastUiSync > 140) {
              lastUiSync = now;
              this._syncLovableTurnBubble(aiBubbleId, activityTurn);
            }
          },
          this.conversationHistory.slice(-10)
        );

        this.preview.flushStream();
        parsedSplit = splitReasoningContent(streamedCode);
        finalPaths = getParsedFilePaths(parsedSplit.content, { includePartial: false });

        if (!finalPaths.length && requestMode !== 'DISCUSS') {
          activityTurn.headline = 'Formatting generated files…';
          activityTurn.activeDetail = 'Normalizing file blocks';
          this._syncLovableTurnBubble(aiBubbleId, activityTurn);
          this.preview.showLoader('Formatting output…', 'Requesting structured file blocks…');
          const repaired = await this.provider.generate(
            systemPrompt,
            `Convert the following response strictly into WebForge ### FILE: path/to/file.ext fenced blocks without extra prose.\n\nOriginal request: ${finalMsg}\n\nPrevious output:\n${parsedSplit.content}`,
            () => {},
            []
          );
          streamedCode = repaired;
          parsedSplit = splitReasoningContent(repaired);
          finalPaths = getParsedFilePaths(parsedSplit.content, { includePartial: false });
        }

        if (!finalPaths.length) {
          if (requestMode === 'DISCUSS') {
            const bubbleEl = aiBubbleId ? document.getElementById(aiBubbleId) : null;
            const cleanAnswer = parsedSplit.content || 'No code changes needed.';
            finalizeActivityTurn(activityTurn, {
              status: 'done',
              headline: 'Answered question',
              elapsedSec: ((Date.now() - startTime) / 1000).toFixed(1),
              tokens: estimateTokens(streamedCode),
            });
            if (bubbleEl) {
              const triggerHtml = latestReasoning || activityTurn.webSources.length
                ? this._renderLovableCardHtml(activityTurn)
                : '';
              bubbleEl.querySelector('.message-content').innerHTML = `${triggerHtml}<div class="ai-prose">${escapeHtml(cleanAnswer)}</div>`;
              this._bindChatMessageActions(bubbleEl);
              this._safeCreateIcons(bubbleEl);
            }
            if (this._openActivityTurnId === turnId) this._renderActivityDrawer(activityTurn);
            this.conversationHistory.push(
              { role: 'user', content: finalMsg },
              { role: 'assistant', content: cleanAnswer.slice(0, 1200) }
            );
            if (this.conversationHistory.length > 12) this.conversationHistory = this.conversationHistory.slice(-12);
            this._saveChatHistory();
            this._clearGenJob();
            this.preview.hideLoader();
            this._updateStatusBar({ tokens: estimateTokens(streamedCode), time: ((Date.now() - startTime) / 1000).toFixed(1), done: true });
            return;
          }
          throw new Error('Model response did not contain complete ### FILE: or <wf-write> blocks.');
        }

        const finalVFS = parseStreamedVFS(parsedSplit.content, this.VFS, { includePartial: false });
        Object.assign(this.VFS, finalVFS);
        applyStructuredFileOps(this.VFS, parsedSplit.content);
      }
      this._ensureValidActiveFile(this.activeFilePath);
      this._saveVFS();
      this._renderFileTree();

      // Create automatic turn checkpoint
      const cp = createCheckpoint({
        projectId: this.activeProjectId,
        label: finalMsg.slice(0, 48),
        prompt: finalMsg,
        files: this.VFS,
        prevFiles: vfsBeforeTurn,
        type: 'auto',
      });
      this._renderCheckpointsBadge();

      const fileDiffs = computeFileSetDiff(vfsBeforeTurn, this.VFS);
      const historyUserText = elementCtx ? `${elementCtx}\n${finalMsg}` : finalMsg;
      this.conversationHistory.push(
        { role: 'user', content: historyUserText },
        { role: 'assistant', content: `Updated files:\n${finalPaths.map((p) => `- ${p}`).join('\n')}` }
      );
      if (this.conversationHistory.length > 12) this.conversationHistory = this.conversationHistory.slice(-12);
      safeStorageSet(
        `wf_project_summary_${this.activeProjectId}`,
        `Last request: ${finalMsg.slice(0, 220)}\nFiles: ${Object.keys(this.VFS).sort().join(', ')}\nLast changed: ${finalPaths.join(', ')}`.slice(0, 1200),
        this.activeProjectId
      );

      // Finalize Lovable-style minimal turn card & sync Activity Side Screen
      const elapsedFinal = ((Date.now() - startTime) / 1000).toFixed(1);
      const finalTokenCount = estimateTokens(streamedCode);
      addOrUpdateActivityStep(activityTurn, {
        key: 'checkpoint',
        label: 'Compiled preview & saved checkpoint',
        status: 'done',
      });
      finalizeActivityTurn(activityTurn, {
        status: 'done',
        headline: fileDiffs.length
          ? `Edited ${fileDiffs.length} file${fileDiffs.length === 1 ? '' : 's'}`
          : 'App ready',
        elapsedSec: elapsedFinal,
        tokens: finalTokenCount,
        files: fileDiffs,
        checkpointId: cp?.id || '',
        hasBeforeFiles: Boolean(cp?.beforeFiles),
      });
      this._syncLovableTurnBubble(aiBubbleId, activityTurn);

      this._saveChatHistory();
      this._clearGenJob();
      this._updateStatusBar({ tokens: finalTokenCount, time: elapsedFinal, done: true });

      this.preview.update(this.VFS);
      this._scheduleThumbnailCapture(true);
      this.preview.hideLoader();
      this.switchWorkspaceView('preview');
      this.showToast('Build compiled cleanly');
      this._setRetryAvailable(false);
      this._schedulePostGenVerify();
    } catch (e) {
      this.preview.hideLoader();
      const isConn = this._isConnectionError(e);
      const turnRecord = this._activityTurns.get(turnId);
      if (turnRecord) {
        finalizeActivityTurn(turnRecord, {
          status: this._userStoppedGeneration ? 'stopped' : 'error',
          headline: this._userStoppedGeneration ? 'Generation stopped' : (isConn ? 'Connection issue' : 'Build error'),
          errorMessage: e?.message || 'Generation interrupted',
        });
        if (this._openActivityTurnId === turnId) this._renderActivityDrawer(turnRecord);
      }
      if (aiBubbleId) {
        const bubbleEl = document.getElementById(aiBubbleId);
        if (bubbleEl) {
          const retryBtn = !this._userStoppedGeneration
            ? `<button type="button" class="btn btn-outline btn-sm msg-retry-btn" data-action="retry-gen"><i data-lucide="rotate-cw"></i> ${isConn ? 'Retry connection' : 'Retry'}</button>`
            : '';
          const inspectBtn = turnRecord
            ? `<button type="button" class="btn btn-ghost btn-sm" data-open-activity-turn="${escapeHtml(turnId)}" data-activity-json="${escapeHtml(serializeTurnActivity(turnRecord))}">View Activity</button>`
            : '';
          bubbleEl.querySelector('.message-content').innerHTML = `
            <div class="gen-error-card">
              <strong>${isConn ? 'Connection issue' : 'Generation error'}</strong>
              <p>${escapeHtml(e.message)}</p>
              <div class="gen-error-actions">${retryBtn}${inspectBtn}</div>
            </div>`;
          bubbleEl.querySelector('[data-action="retry-gen"]')?.addEventListener('click', () => this.retryLastGeneration());
          this._bindChatMessageActions(bubbleEl);
          this._safeCreateIcons(bubbleEl);
        }
      }
      this._saveChatHistory();

      if (e.name === 'AbortError') {
        if (this._userStoppedGeneration) {
          this._clearGenJob();
          this._setRetryAvailable(false);
        } else {
          this._flushGenCheckpoint();
        }
      } else {
        this._lastFailedJob = { ...this._activeGenJob, status: 'running', userMessage: finalMsg, projectId: this.activeProjectId };
        this._saveGenJob(this._lastFailedJob);
        this._setRetryAvailable(true);
        this.showToast(e.message || 'Generation failed', true);
      }
    } finally {
      this.isGenerating = false;
      this._updateGeneratingUI(false);
      this._autoFixInFlight = false;
    }
  }

  stopGeneration() {
    this._userStoppedGeneration = true;
    this._subAgentAbort?.abort();
    this._subAgentAbort = null;
    this.provider.stop();
    this.isGenerating = false;
    this._updateGeneratingUI(false);
    this.preview.hideLoader();
    this.preview.flushStream();
    if (this._activeGenJob?.userMessage) {
      this._lastFailedJob = { ...this._activeGenJob, status: 'running' };
      this._saveGenJob(this._lastFailedJob);
      this._setRetryAvailable(true);
    }
    this.showToast('Generation stopped');
  }

  retryLastGeneration() {
    if (this.isGenerating) return;
    const job = this._loadGenJob() || this._lastFailedJob;
    if (!job?.userMessage || !job.projectId) return this.showToast('Nothing to retry', true);
    if (job.projectId !== this.activeProjectId) this.openProject(job.projectId);
    this._setRetryAvailable(false);
    this.sendChatMessage({ resumeJob: job });
  }

  _schedulePostGenVerify() {
    clearTimeout(this._postGenVerifyTimer);
    this._postGenVerifyTimer = setTimeout(() => {
      if (this.isGenerating || this._autoFixInFlight) return;
      const errors = this.preview.activeErrors || [];
      const staticIssues = collectStaticProjectIssues(this.VFS);
      if (errors.length || staticIssues.length) {
        this.triggerAutoFix({ silent: true, staticIssues });
      }
    }, 1500);
  }

  triggerAutoFix(opts = {}) {
    if (this.isGenerating) {
      if (!opts.silent) this.showToast('Wait for current build to finish');
      return;
    }
    const errors = this.preview.activeErrors || [];
    const staticIssues = opts.staticIssues || collectStaticProjectIssues(this.VFS);
    const debugContext = this.preview.getDebugContext();

    if (!errors.length && !staticIssues.length) {
      if (!opts.silent) {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
          chatInput.value = 'VERIFY & FIX MODE: Inspect the project for broken imports, invalid JSX, runtime errors, or layout bugs. Output complete changed files only if fixes are needed; otherwise reply briefly.';
          this._autoFixInFlight = true;
          this.sendChatMessage();
        }
      }
      return;
    }

    const parts = [
      'DEBUG MODE: Fix the root cause with the smallest targeted patch. Output only complete changed or new files.',
      debugContext ? `\nPreview diagnostics:\n${debugContext}` : '',
      staticIssues.length ? `\nStatic checks:\n${staticIssues.map((i) => `- ${i}`).join('\n')}` : '',
    ].filter(Boolean);

    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.value = parts.join('\n');
      this._autoFixInFlight = true;
      this.sendChatMessage();
    }
  }

  // ── Lovable-Style Minimal Activity Pill & Slide-Over Side Screen ──

  _renderLovableCardHtml(turn) {
    const summary = buildActivitySummary(turn);
    const isRunning = turn.status === 'running';
    const isError = turn.status === 'error';
    const encoded = serializeTurnActivity(turn);
    const stepsTotal = Math.max(1, (turn.steps || []).length);
    const stepsDone = (turn.steps || []).filter((st) => st.status === 'done').length;
    const filesWritten = Array.isArray(turn.files) ? turn.files.length : 0;
    const progressPct = isRunning
      ? Math.min(94, Math.max(14, Math.round(((stepsDone + Math.min(filesWritten, 4) * 0.5) / (stepsTotal + 2)) * 100)))
      : 100;
    const ringRadius = 7.5;
    const ringCirc = Number((2 * Math.PI * ringRadius).toFixed(2));
    const ringOffset = Number((ringCirc * (1 - progressPct / 100)).toFixed(2));

    const statusIcon = isRunning
      ? `<span class="lovable-status-ring" aria-hidden="true">
           <svg viewBox="0 0 20 20" width="20" height="20">
             <circle class="lovable-ring-track" cx="10" cy="10" r="${ringRadius}" fill="none" stroke-width="2"></circle>
             <circle class="lovable-ring-arc" cx="10" cy="10" r="${ringRadius}" fill="none" stroke-width="2" stroke-dasharray="${ringCirc}" stroke-dashoffset="${ringOffset}"></circle>
           </svg>
         </span>`
      : isError
        ? `<span class="lovable-status-icon is-error" aria-hidden="true"><i data-lucide="alert-circle"></i></span>`
        : `<span class="lovable-status-icon is-done" aria-hidden="true"><i data-lucide="check"></i></span>`;

    const filesFooter = !isRunning && Array.isArray(turn.files) && turn.files.length
      ? `<div class="lovable-quick-footer">
          <div class="lovable-quick-files">
            ${turn.files.slice(0, 3).map((d) => `
              <button type="button" class="lovable-file-link" data-file-path="${escapeHtml(d.path)}" data-turn-action="open" title="Open ${escapeHtml(d.path)}">
                <i data-lucide="file-code-2"></i>
                <span class="truncate">${escapeHtml(d.path.split('/').pop())}</span>
              </button>`).join('')}
            ${turn.files.length > 3 ? `<button type="button" class="lovable-more-files" data-open-activity-turn="${escapeHtml(turn.turnId)}" data-activity-json="${escapeHtml(encoded)}">+${turn.files.length - 3} more</button>` : ''}
          </div>
          ${turn.hasBeforeFiles && turn.checkpointId
            ? `<button type="button" class="turn-file-btn turn-revert-btn" data-turn-action="revert-before-cp" data-cp-id="${escapeHtml(turn.checkpointId)}" title="${escapeHtml(turn.revertLabel || 'Revert')}">
                 <i data-lucide="rotate-ccw"></i> Revert
               </button>`
            : ''}
        </div>`
      : '';

    return `
      <div class="lovable-activity-card kokonut-island status-${escapeHtml(turn.status || 'running')}" data-turn-id="${escapeHtml(turn.turnId)}">
        <button type="button" class="lovable-activity-trigger" data-open-activity-turn="${escapeHtml(turn.turnId)}" data-activity-json="${escapeHtml(encoded)}" aria-label="${escapeHtml(summary.headline)} — click to open activity side panel">
          ${statusIcon}
          <span class="lovable-activity-copy">
            <span class="lovable-activity-headline ${isRunning ? 'kokonut-shimmer' : ''}">${escapeHtml(summary.headline)}</span>
            <span class="lovable-activity-sub tabular-nums">${escapeHtml(summary.subtitle)}</span>
          </span>
          ${isRunning ? `<span class="lovable-island-pct tabular-nums">${progressPct}%</span>` : ''}
          <span class="lovable-activity-chevron" aria-hidden="true"><i data-lucide="chevron-right"></i></span>
        </button>
        ${filesFooter}
      </div>`;
  }

  _syncLovableTurnBubble(bubbleId, turn) {
    if (bubbleId) {
      const bubbleEl = document.getElementById(bubbleId);
      const content = bubbleEl?.querySelector('.message-content');
      if (content) {
        content.innerHTML = this._renderLovableCardHtml(turn);
        this._bindChatMessageActions(bubbleEl);
        this._safeCreateIcons(bubbleEl);
      }
    }
    if (this._openActivityTurnId === turn.turnId) {
      this._renderActivityDrawer(turn);
    }
  }

  openActivityDrawer(turnId, fallbackEncoded = '') {
    let turn = this._activityTurns.get(turnId);
    if (!turn && fallbackEncoded) {
      turn = hydrateTurnActivity(fallbackEncoded);
      if (turn) this._activityTurns.set(turnId, turn);
    }
    if (!turn) return;

    this._openActivityTurnId = turnId;
    // On mobile workspace view, switch to stage pane so the side screen is immediately visible
    if (window.innerWidth <= 900) {
      this.mobilePane = 'stage';
      this._updateMobilePaneUI();
    }
    const drawer = document.getElementById('agentActivityDrawer');
    if (drawer) {
      drawer.classList.remove('hidden');
      requestAnimationFrame(() => drawer.classList.add('is-open'));
    }
    this._renderActivityDrawer(turn);
  }

  closeActivityDrawer() {
    this._openActivityTurnId = null;
    const drawer = document.getElementById('agentActivityDrawer');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    setTimeout(() => {
      if (!this._openActivityTurnId) drawer.classList.add('hidden');
    }, 200);
  }

  _renderActivityDrawer(turn) {
    const titleEl = document.getElementById('activityDrawerTitle');
    const metaEl = document.getElementById('activityDrawerMeta');
    const iconEl = document.getElementById('activityDrawerStatusIcon');
    const bodyEl = document.getElementById('activityDrawerBody');
    if (!bodyEl || !turn) return;

    const isRunning = turn.status === 'running';
    if (titleEl) {
      titleEl.textContent = turn.headline || 'Agent Activity';
      titleEl.classList.toggle('kokonut-shimmer', isRunning);
    }
    if (metaEl) {
      const metaParts = [turn.mode || 'BUILD'];
      if (turn.elapsedSec && Number(turn.elapsedSec) > 0) metaParts.push(`${turn.elapsedSec}s`);
      if (turn.tokens > 0) metaParts.push(`${turn.tokens.toLocaleString()} tok`);
      metaParts.push(isRunning ? 'Live' : turn.status === 'done' ? 'Completed' : 'Stopped');
      metaEl.textContent = metaParts.join(' · ');
    }
    if (iconEl) {
      iconEl.className = `activity-drawer-spinner status-${turn.status || 'running'}`;
      iconEl.innerHTML = isRunning
        ? ''
        : `<i data-lucide="${turn.status === 'error' ? 'alert-circle' : 'check'}"></i>`;
    }

    const stepsHtml = (turn.steps || []).map((st) => `
      <div class="activity-step-row status-${escapeHtml(st.status || 'done')}">
        <span class="activity-step-marker">
          ${st.status === 'active'
            ? '<span class="gen-step-dot"></span>'
            : st.status === 'error'
              ? '<i data-lucide="alert-circle"></i>'
              : '<i data-lucide="check"></i>'}
        </span>
        <span class="activity-step-text">
          ${escapeHtml(st.label)}${st.codeLabel ? ` <code>${escapeHtml(st.codeLabel)}</code>` : ''}
        </span>
      </div>`).join('');

    const subAgentsHtml = Array.isArray(turn.subAgents) && turn.subAgents.length
      ? `<section class="activity-section">
          <div class="activity-section-head">
            <span>Agent Lanes</span>
            <span class="tabular-nums">${escapeHtml(turn.subAgentMode || 'Active')}</span>
          </div>
          <div class="subagents-grid">
            ${turn.subAgents.map((sa) => `
              <div class="subagent-card status-${escapeHtml(sa.status || 'running')}">
                <div class="subagent-card-left">
                  <span class="gen-step-dot"></span>
                  <span class="subagent-card-role">${escapeHtml(sa.role)}</span>
                  <span class="subagent-card-file truncate">${escapeHtml(sa.targetFiles || '')}</span>
                </div>
                <span class="subagent-card-meta tabular-nums">${escapeHtml(sa.meta || '')}</span>
              </div>`).join('')}
          </div>
          ${turn.subAgentFallback ? `<div class="subagent-fallback-banner">${escapeHtml(turn.subAgentFallback)}</div>` : ''}
        </section>`
      : '';

    const webHtml = Array.isArray(turn.webSources) && turn.webSources.length
      ? `<section class="activity-section">
          <div class="activity-section-head">
            <span>Web Grounding</span>
            <span class="tabular-nums">${turn.webSources.length} sources · ${escapeHtml(turn.webEngine || 'Web')}</span>
          </div>
          <div class="web-search-list">
            ${turn.webSources.map((r) => `
              <div class="web-search-result-item">
                <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.title)}</a>
                ${r.snippet ? `<small>${escapeHtml(r.snippet.slice(0, 160))}</small>` : ''}
              </div>`).join('')}
          </div>
        </section>`
      : '';

    const reasoningHtml = turn.reasoning
      ? `<section class="activity-section">
          <details class="thinking-accordion" open>
            <summary>
              <i data-lucide="brain"></i>
              <span>${turn.isThinking ? 'Thinking live…' : 'Reasoning Trace'}</span>
              <span class="thinking-meta tabular-nums">${turn.reasoning.length.toLocaleString()} chars</span>
            </summary>
            <pre class="thinking-body">${escapeHtml(turn.reasoning)}</pre>
          </details>
        </section>`
      : '';

    const filesHtml = Array.isArray(turn.files) && turn.files.length
      ? `<section class="activity-section">
          <div class="activity-section-head">
            <span>Modified Files</span>
            <span class="tabular-nums">${turn.files.length} file${turn.files.length === 1 ? '' : 's'}</span>
          </div>
          <div class="turn-files-list">
            ${turn.files.map((d) => `
              <div class="turn-file-row" data-file-path="${escapeHtml(d.path)}">
                <span class="turn-file-name truncate">${escapeHtml(d.path)}</span>
                <span class="turn-file-stats tabular-nums">
                  ${d.added ? `<span class="diff-stat-add">+${d.added}</span>` : ''}
                  ${d.removed ? `<span class="diff-stat-del">-${d.removed}</span>` : ''}
                </span>
                <button type="button" class="turn-file-btn" data-turn-action="open">Open</button>
                <button type="button" class="turn-file-btn" data-turn-action="diff" data-cp-id="${escapeHtml(turn.checkpointId || 'latest')}">Diff</button>
              </div>`).join('')}
          </div>
          ${turn.checkpointId
            ? `<div class="turn-cp-bar">
                <span>Checkpoint saved</span>
                <div class="turn-cp-actions">
                  ${turn.hasBeforeFiles ? `<button type="button" class="turn-file-btn turn-revert-btn" data-turn-action="revert-before-cp" data-cp-id="${escapeHtml(turn.checkpointId)}"><i data-lucide="rotate-ccw"></i> ${escapeHtml(turn.revertLabel || 'Revert')}</button>` : ''}
                  <button type="button" class="turn-file-btn" data-turn-action="restore-cp" data-cp-id="${escapeHtml(turn.checkpointId)}">Restore</button>
                </div>
              </div>`
            : ''}
        </section>`
      : '';

    bodyEl.innerHTML = `
      ${turn.prompt ? `<div class="activity-prompt-quote">${escapeHtml(turn.prompt)}</div>` : ''}
      <section class="activity-section">
        <div class="activity-section-head">
          <span>Execution Steps</span>
          <span class="tabular-nums">${(turn.steps || []).length}</span>
        </div>
        <div class="activity-steps-list">${stepsHtml}</div>
      </section>
      ${subAgentsHtml}
      ${webHtml}
      ${reasoningHtml}
      ${filesHtml}
    `;

    this._bindChatMessageActions(bodyEl);
    this._safeCreateIcons(document.getElementById('agentActivityDrawer'));
  }

  _bindChatMessageActions(root) {
    if (!root) return;
    root.querySelectorAll('[data-open-activity-turn]').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        this.openActivityDrawer(btn.dataset.openActivityTurn, btn.dataset.activityJson || '');
      });
    });
    root.querySelectorAll('[data-turn-action]').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const action = btn.dataset.turnAction;
        const filePath = btn.dataset.filePath || btn.closest('[data-file-path]')?.dataset.filePath;
        if (action === 'open' && filePath) {
          this.closeActivityDrawer();
          this.openFile(filePath, true);
        } else if (action === 'diff' && filePath) {
          this.closeActivityDrawer();
          this.openFileInDiff(filePath, btn.dataset.cpId || 'latest');
        } else if (action === 'restore-cp' && btn.dataset.cpId) {
          this.restoreCheckpoint(btn.dataset.cpId);
        } else if (action === 'revert-before-cp' && btn.dataset.cpId) {
          this.revertToBeforeCheckpoint(btn.dataset.cpId);
        }
      });
    });
    root.querySelectorAll('[data-copy-msg-id]').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => this.copyMessagePrompt(btn.dataset.copyMsgId));
    });
  }

  _normalizeSavedChatUI(root) {
    root.querySelectorAll('.agent-turn-card:not(.done), .gen-status-card:not(.done)').forEach((card) => {
      const title = card.querySelector('.gen-status-title');
      if (title && title.textContent !== 'App ready') title.textContent = 'Interrupted session';
      const ind = card.querySelector('.agent-status-indicator');
      if (ind) ind.classList.remove('running');
    });
    root.querySelectorAll('.lovable-activity-card.status-running').forEach((card) => {
      card.classList.remove('status-running');
      card.classList.add('status-stopped');
      const hl = card.querySelector('.lovable-activity-headline');
      if (hl) {
        hl.classList.remove('kokonut-shimmer');
        hl.textContent = 'Interrupted session';
      }
      const sp = card.querySelector('.lovable-spinner');
      if (sp) sp.classList.add('is-stopped');
    });
  }

  _addMessageBubble(role, contentHtml, opts = {}) {
    const container = document.getElementById('chatMessages');
    if (!container) return null;
    const bubbleId = 'msg-' + Date.now() + '-' + generateId();
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.id = bubbleId;

    const copyBtn = role === 'user' && opts.rawText
      ? `<button type="button" class="msg-action-btn" data-copy-msg-id="${bubbleId}" title="Copy prompt"><i data-lucide="copy"></i> Copy</button>`
      : '';

    div.innerHTML = `
      <div class="avatar"><i data-lucide="${role === 'user' ? 'user' : 'bot'}"></i></div>
      <div class="bubble">
        <div class="msg-head">
          <span class="name">${role === 'user' ? 'You' : 'WebForge'}</span>
          ${copyBtn}
        </div>
        <div class="message-content ${role}-content">${contentHtml}</div>
      </div>`;

    if (role === 'user' && opts.rawText) {
      try { div.dataset.prompt = encodeURIComponent(opts.rawText); } catch {}
    }

    container.appendChild(div);
    this._bindChatMessageActions(div);
    this._safeCreateIcons(div);
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    return bubbleId;
  }

  async copyMessagePrompt(bubbleId) {
    const el = document.getElementById(bubbleId);
    if (!el) return;
    let text = '';
    try { text = decodeURIComponent(el.dataset.prompt || ''); } catch {}
    if (!text) text = el.querySelector('.message-content')?.innerText?.trim() || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Prompt copied');
    } catch {
      this.showToast('Copy failed', true);
    }
  }

  _saveChatHistory() {
    if (!this.activeProjectId) return;
    safeStorageSet(`wf_chat_llm_${this.activeProjectId}`, JSON.stringify(this.conversationHistory.slice(-12)), this.activeProjectId);
    const chatMsgs = document.getElementById('chatMessages');
    if (chatMsgs) safeStorageSet(`wf_chat_ui_${this.activeProjectId}`, chatMsgs.innerHTML, this.activeProjectId);
  }

  _updateGeneratingUI(generating) {
    const input = document.getElementById('chatInput');
    const send = document.getElementById('chatSend');
    const stop = document.getElementById('btnStop');
    if (input) input.disabled = generating;
    if (send) send.style.display = generating ? 'none' : '';
    if (stop) stop.style.display = generating ? '' : 'none';
  }

  _setRetryAvailable(show) {
    document.getElementById('btnRetryGen')?.classList.toggle('hidden', !show);
  }

  _updateStatusBar({ tokens, time, done, error }) {
    const el = document.getElementById('statusInfo');
    if (!el) return;
    if (error) {
      el.classList.remove('hidden');
      el.innerHTML = `<i data-lucide="alert-circle"></i><span>${this._esc(String(error))}</span>`;
      this._safeCreateIcons(el);
      return;
    }
    if (done) {
      el.classList.add('hidden');
      el.textContent = '';
      return;
    }
    el.classList.remove('hidden');
    el.innerHTML = `<i data-lucide="loader-2" class="lucide-spin"></i><span class="tabular-nums">${tokens || 0}t · ${time || 0}s</span>`;
    this._safeCreateIcons(el);
  }

  _isConnectionError(err) {
    const msg = String(err?.message || err || '').toLowerCase();
    return err?.name === 'TypeError' || /failed to fetch|network|timed out|timeout|econnrefused|api error (429|500|502|503|504)/i.test(msg);
  }

  // ── Workspace Views & Split Resizers ──

  switchWorkspaceView(view) {
    this.stageView = view;
    const previewBtn = document.getElementById('btnViewPreview');
    const filesBtn = document.getElementById('btnViewFiles');
    const diffBtn = document.getElementById('btnViewDiff');
    const previewFrame = document.getElementById('previewFrameWrap');
    const codeView = document.getElementById('viewport-files');
    const diffView = document.getElementById('viewport-diff');

    previewBtn?.classList.toggle('active', view === 'preview');
    filesBtn?.classList.toggle('active', view === 'files');
    diffBtn?.classList.toggle('active', view === 'diff');

    previewFrame?.classList.toggle('hide', view !== 'preview');
    codeView?.classList.toggle('show', view === 'files');
    diffView?.classList.toggle('show', view === 'diff');

    const devBtns = document.getElementById('previewDeviceBtns');
    if (devBtns) devBtns.style.display = view === 'preview' ? 'flex' : 'none';

    if (view === 'files') {
      this._renderFileTree();
      this._ensureValidActiveFile(this.activeFilePath);
    } else if (view === 'diff') {
      this._renderDiffView();
    }

    const seg = previewBtn?.closest('.seg');
    if (seg) requestAnimationFrame(() => syncSlidingTabIndicator(seg));
  }

  _applyLayoutPrefs() {
    const chatPane = document.getElementById('chatPane');
    const drawer = document.getElementById('devtoolsDrawer');
    if (chatPane && this.layoutPrefs.chatWidth) {
      chatPane.style.width = `${Math.max(300, Math.min(720, this.layoutPrefs.chatWidth))}px`;
    }
    if (drawer && this.layoutPrefs.devtoolsHeight) {
      drawer.style.height = `${Math.max(130, Math.min(460, this.layoutPrefs.devtoolsHeight))}px`;
    }
    this._applyHomeSidebarState();
  }

  _setupResizers() {
    const chatResizer = document.getElementById('chatPaneResizer');
    const chatPane = document.getElementById('chatPane');
    if (chatResizer && chatPane) {
      let dragging = false;
      chatResizer.addEventListener('mousedown', (e) => {
        dragging = true;
        document.body.classList.add('is-resizing');
        e.preventDefault();
      });
      document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const nextW = Math.max(300, Math.min(720, e.clientX));
        chatPane.style.width = `${nextW}px`;
        this.layoutPrefs.chatWidth = nextW;
      });
      document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        document.body.classList.remove('is-resizing');
        safeStorageSet(STORAGE_KEYS.LAYOUT, JSON.stringify(this.layoutPrefs));
      });
    }

    const devResizer = document.getElementById('devtoolsResizer');
    const drawer = document.getElementById('devtoolsDrawer');
    if (devResizer && drawer) {
      let dragging = false;
      let startY = 0;
      let startH = 0;
      devResizer.addEventListener('mousedown', (e) => {
        dragging = true;
        startY = e.clientY;
        startH = drawer.offsetHeight;
        document.body.classList.add('is-resizing');
        e.preventDefault();
      });
      document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const nextH = Math.max(130, Math.min(460, startH + (startY - e.clientY)));
        drawer.style.height = `${nextH}px`;
        this.layoutPrefs.devtoolsHeight = nextH;
      });
      document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        document.body.classList.remove('is-resizing');
        safeStorageSet(STORAGE_KEYS.LAYOUT, JSON.stringify(this.layoutPrefs));
      });
    }
  }

  _updateMobilePaneUI() {
    const main = document.getElementById('workspaceMain');
    if (!main) return;
    main.dataset.mobilePane = this.mobilePane;
    document.querySelectorAll('[data-mobile-pane-btn]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mobilePaneBtn === this.mobilePane);
    });
  }

  // ── Command Palette (Ctrl/Cmd + K & Ctrl/Cmd + P) ──

  _setupCommandPalette() {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openCommandPalette('');
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (this.activeProjectId) this.openCommandPalette('file:');
      }
    });

    const input = document.getElementById('commandPaletteInput');
    input?.addEventListener('input', () => this._renderCommandPaletteResults(input.value));
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this._paletteItems.length) {
          this._paletteIndex = (this._paletteIndex + 1) % this._paletteItems.length;
          this._highlightPaletteRow();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this._paletteItems.length) {
          this._paletteIndex = (this._paletteIndex - 1 + this._paletteItems.length) % this._paletteItems.length;
          this._highlightPaletteRow();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const picked = this._paletteItems[this._paletteIndex];
        if (picked) {
          document.getElementById('commandPaletteModal')?.close();
          picked.run();
        }
      }
    });
  }

  openCommandPalette(prefill = '') {
    const modal = document.getElementById('commandPaletteModal');
    const input = document.getElementById('commandPaletteInput');
    if (!modal || !input) return;
    input.value = prefill;
    this._renderCommandPaletteResults(prefill);
    openDialogWithOrigin(modal, null, { instant: true });
    requestAnimationFrame(() => input.focus());
  }

  _renderCommandPaletteResults(query = '') {
    const listEl = document.getElementById('commandPaletteList');
    if (!listEl) return;
    const rawQ = String(query || '').trim().toLowerCase();
    const fileOnly = rawQ.startsWith('file:');
    const q = fileOnly ? rawQ.slice(5).trim() : rawQ;

    const commands = [];
    if (!fileOnly) {
      commands.push(
        { group: 'Actions', label: 'Toggle Dark / Light Theme', hint: 'Appearance', icon: 'sun-moon', run: () => this.toggleTheme() },
        { group: 'Actions', label: `Web Search: ${this.agentPrefs.webSearch ? 'On' : 'Off'} (Toggle)`, hint: 'Free, no key', icon: 'globe', run: () => this.toggleWebSearchPref() },
        { group: 'Actions', label: `Parallel Sub-Agents: ${this.agentPrefs.subAgents ? 'Auto' : 'Off'} (Toggle)`, hint: 'Multi-agent', icon: 'git-fork', run: () => this.toggleSubAgentsPref() },
        { group: 'Actions', label: 'Open UI Component Library Studio', hint: 'DESIGN.md & GitHub libs', icon: 'blocks', run: () => this.uiLibraryModal.open() },
        { group: 'Actions', label: 'Open System instructions', hint: 'Settings', icon: 'sliders-horizontal', run: () => this.settingsView.open('system-instructions') },
        { group: 'Actions', label: 'Open Model provider settings', hint: 'API / Local LLM', icon: 'cpu', run: () => this.settingsView.open('model-provider') },
        { group: 'Actions', label: 'Open Settings', hint: 'Ctrl+,', icon: 'settings', run: () => this.settingsView.open() },
        { group: 'Actions', label: 'Open Prompt builder', hint: '7-step builder', icon: 'wand-sparkles', run: () => this.openPromptBuilderModal() }
      );
      if (this.activeProjectId) {
        commands.push(
          { group: 'Workspace', label: 'Switch to Live Preview', hint: 'Stage', icon: 'monitor', run: () => this.switchWorkspaceView('preview') },
          { group: 'Workspace', label: 'Switch to Code Editor', hint: 'Stage', icon: 'code-2', run: () => this.switchWorkspaceView('files') },
          { group: 'Workspace', label: 'Switch to Diff Viewer', hint: 'Stage', icon: 'git-compare', run: () => this.switchWorkspaceView('diff') },
          { group: 'Workspace', label: 'Toggle DevTools Drawer (Console / Network)', hint: 'Debug', icon: 'terminal', run: () => this.toggleDevtools() },
          { group: 'Workspace', label: 'Manage Checkpoints', hint: 'Snapshots', icon: 'history', run: () => this.openCheckpointsModal() },
          { group: 'Workspace', label: 'Export Project ZIP', hint: 'Download', icon: 'archive', run: () => this.exportAsZip() },
          { group: 'Workspace', label: 'Back to Dashboard', hint: 'Home', icon: 'layout-dashboard', run: () => this.showHomeView() }
        );
      }
    }

    if (this.activeProjectId) {
      Object.keys(this.VFS).sort().forEach((path) => {
        commands.push({
          group: 'Files',
          label: path,
          hint: 'Open in Code',
          icon: 'file-code',
          run: () => this.openFile(path, true),
        });
      });
    }

    if (!fileOnly) {
      this.projectsList.forEach((p) => {
        commands.push({
          group: 'Projects',
          label: `Open "${p.name}"`,
          hint: p.tagline || 'Project',
          icon: p.icon || 'folder',
          run: () => this.openProject(p.id),
        });
      });
    }

    this._paletteItems = commands.filter((c) => !q || `${c.label} ${c.group} ${c.hint}`.toLowerCase().includes(q)).slice(0, 24);
    this._paletteIndex = 0;

    if (!this._paletteItems.length) {
      listEl.innerHTML = `<div class="cp-empty">No matching commands or files.</div>`;
      return;
    }

    listEl.innerHTML = this._paletteItems.map((item, i) => `
      <button type="button" class="palette-row ${i === 0 ? 'active' : ''}" data-pal-idx="${i}">
        <i data-lucide="${escapeHtml(item.icon)}"></i>
        <span class="palette-label truncate">${escapeHtml(item.label)}</span>
        <span class="palette-hint">${escapeHtml(item.group)} · ${escapeHtml(item.hint)}</span>
      </button>`).join('');

    listEl.querySelectorAll('[data-pal-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const picked = this._paletteItems[Number(btn.dataset.palIdx)];
        document.getElementById('commandPaletteModal')?.close();
        picked?.run();
      });
    });
    this._safeCreateIcons(listEl);
  }

  _highlightPaletteRow() {
    document.querySelectorAll('#commandPaletteList .palette-row').forEach((row, idx) => {
      row.classList.toggle('active', idx === this._paletteIndex);
      if (idx === this._paletteIndex) row.scrollIntoView({ block: 'nearest' });
    });
  }

  // ── Settings Modal & Provider Combobox ──

  _setupSettingsModal() {
    document.getElementById('modalProviderType')?.addEventListener('change', (e) => {
      this.provider.configure({ type: e.target.value, baseUrl: '' });
      const bu = document.getElementById('modalBaseUrl');
      if (bu) bu.value = '';
      this._updateProviderUI();
      this._updateModalProviderFields();
      this._populateModelSelect();
      this._updateHomeStatusStrip();
    });

    document.getElementById('modelSelect')?.addEventListener('change', (e) => {
      this.provider.configure({ model: e.target.value });
      this._syncModelComboboxLabel();
      this._updateHomeStatusStrip();
    });

    document.getElementById('modalApiKey')?.addEventListener('input', (e) => {
      this.provider.configure({ apiKey: e.target.value.trim() });
    });
    document.getElementById('modalBaseUrl')?.addEventListener('input', (e) => {
      this.provider.configure({ baseUrl: e.target.value.trim() });
    });
    document.getElementById('modalTemperature')?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (Number.isFinite(val)) {
        this.provider.configure({ temperature: val });
        this._updateSettingsParamsSummary();
      }
    });
    document.getElementById('modalTopP')?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (Number.isFinite(val)) {
        this.provider.configure({ topP: val });
        this._updateSettingsParamsSummary();
      }
    });
    document.getElementById('modalMaxTokens')?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (Number.isFinite(val) && val > 0) {
        this.provider.configure({ maxTokens: val });
        this._updateSettingsParamsSummary();
      }
    });
    document.getElementById('modalContextWindow')?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (Number.isFinite(val) && val >= 2048) {
        this.provider.configure({ contextWindow: val });
        this._updateContextBudgetMeter();
        this._updateHomeStatusStrip();
        this._updateSettingsParamsSummary();
      }
    });

    this._wireModelCombobox();
    this._wireSettingsTabs();

    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('modalProviderType', this.provider.type);
    setVal('modalApiKey', this.provider.apiKey);
    setVal('modalBaseUrl', this.provider.baseUrl);
    setVal('modalTemperature', this.provider.temperature);
    setVal('modalTopP', this.provider.topP ?? 0.95);
    setVal('modalMaxTokens', this.provider.maxTokens);
    setVal('modalContextWindow', this.provider.contextWindow || 32768);
    this._updateModalProviderFields();
    this._populateModelSelect();
    this._updateSettingsParamsSummary();
  }

  _wireSettingsTabs() {
    document.querySelectorAll('[data-settings-tab]').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        this.switchSettingsTab(tabBtn.dataset.settingsTab);
      });
    });
  }

  switchSettingsTab(tabName = 'model') {
    document.querySelectorAll('[data-settings-tab]').forEach((btn) => {
      const active = btn.dataset.settingsTab === tabName;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-settings-panel]').forEach((panel) => {
      const active = panel.dataset.settingsPanel === tabName;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
    const tabsEl = document.querySelector('.settings-tabs');
    if (tabsEl) requestAnimationFrame(() => syncSlidingTabIndicator(tabsEl));
  }

  _updateSettingsParamsSummary() {
    const el = document.getElementById('settingsParamsSummary');
    if (!el) return;
    const temp = this.provider.temperature ?? 0.7;
    const topP = this.provider.topP ?? 0.95;
    const maxTok = Math.round((this.provider.maxTokens || 16384) / 1024);
    const ctx = Math.round((this.provider.contextWindow || 32768) / 1024);
    el.textContent = `${temp} · ${topP} top-p · ${maxTok}k out · ${ctx}k ctx`;
  }

  _updateModalProviderFields() {
    const type = document.getElementById('modalProviderType')?.value;
    if (!type) return;
    const preset = PROVIDER_PRESETS[type];
    const providerGroup = document.getElementById('modalProviderGroup');
    const keyGroup = document.getElementById('modalApiKeyGroup');
    const urlGroup = document.getElementById('modalBaseUrlGroup');
    const showKey = preset.requiresKey || type === 'custom';
    if (keyGroup) keyGroup.style.display = showKey ? '' : 'none';
    if (providerGroup) providerGroup.classList.toggle('settings-span-2', !showKey);
    if (urlGroup) urlGroup.style.display = ['custom', 'lmstudio', 'ollama'].includes(type) ? '' : 'none';

    const keyInput = document.getElementById('modalApiKey');
    if (keyInput) keyInput.placeholder = preset.placeholder || '';
    const urlInput = document.getElementById('modalBaseUrl');
    if (urlInput) {
      urlInput.placeholder = preset.baseUrl || 'https://api.example.com/v1';
      if (document.activeElement !== urlInput) urlInput.value = this.provider.baseUrl || '';
    }

    const freeRow = document.getElementById('modelFreeFilterRow');
    if (freeRow) freeRow.hidden = type !== 'openrouter';
    if (type !== 'openrouter' && this._modelFilter === 'free') {
      this._modelFilter = 'all';
      document.querySelectorAll('#modelFreeFilterRow .model-chip').forEach((c) => c.classList.toggle('active', c.dataset.filter === 'all'));
    }
  }

  _wireModelCombobox() {
    const trigger = document.getElementById('modelComboboxTrigger');
    const panel = document.getElementById('modelComboboxPanel');
    const search = document.getElementById('modelSearch');
    const combobox = document.getElementById('modelCombobox');
    if (!trigger || !panel || !search || !combobox) return;

    trigger.addEventListener('click', () => {
      const open = panel.hidden;
      this._setModelPanelOpen(open);
      if (open) {
        search.value = '';
        this._renderModelComboboxList();
        search.focus();
      }
    });
    search.addEventListener('input', () => this._renderModelComboboxList());
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this._setModelPanelOpen(false); trigger.focus(); }
    });
    document.getElementById('modelFreeFilterRow')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.model-chip');
      if (!chip) return;
      this._modelFilter = chip.dataset.filter || 'all';
      document.querySelectorAll('#modelFreeFilterRow .model-chip').forEach((c) => c.classList.toggle('active', c.dataset.filter === this._modelFilter));
      this._renderModelComboboxList();
    });
    document.addEventListener('click', (e) => {
      if (!combobox.contains(e.target)) this._setModelPanelOpen(false);
    });
  }

  _setModelPanelOpen(open) {
    const panel = document.getElementById('modelComboboxPanel');
    const trigger = document.getElementById('modelComboboxTrigger');
    if (!panel || !trigger) return;
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.getElementById('modelCombobox')?.classList.toggle('open', open);
  }

  _populateModelSelect() {
    const select = document.getElementById('modelSelect');
    if (!select) return;
    select.innerHTML = this.provider.models.length
      ? this.provider.models.map((m) => `<option value="${escapeHtml(m.id)}" ${m.id === this.provider.model ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('')
      : '<option value="">No models loaded</option>';
    if (this.provider.model) select.value = this.provider.model;
    this._syncModelComboboxLabel();
    this._renderModelComboboxList();
  }

  _renderModelComboboxList() {
    const list = document.getElementById('modelComboboxList');
    const hint = document.getElementById('modelCountHint');
    if (!list) return;
    const q = (document.getElementById('modelSearch')?.value || '').trim().toLowerCase();
    const wantsFree = /\bfree\b/.test(q);
    const query = q.replace(/\bfree\b/g, '').trim();

    const models = (this.provider.models || []).filter((m) => {
      if ((this._modelFilter === 'free' || wantsFree) && !m.free) return false;
      if (!query) return true;
      return m.name.toLowerCase().includes(query) || m.id.toLowerCase().includes(query);
    });

    if (hint) {
      const total = this.provider.models?.length || 0;
      const freeCount = (this.provider.models || []).filter((m) => m.free).length;
      hint.textContent = !total ? '' : this.provider.type === 'openrouter' ? `${total} models · ${freeCount} free` : `${models.length} / ${total}`;
    }

    if (!this.provider.models?.length) {
      list.innerHTML = '<div class="model-empty">Click Load Models to fetch available models</div>';
      return;
    }
    if (!models.length) {
      list.innerHTML = '<div class="model-empty">No matching models</div>';
      return;
    }

    list.innerHTML = models.map((m) => `
      <button type="button" class="model-option ${m.id === this.provider.model ? 'selected' : ''}" role="option" data-id="${escapeHtml(m.id)}">
        <span class="model-option-name">${escapeHtml(m.name)}</span>
        <span class="model-option-id">${escapeHtml(m.id)}${m.free ? ' · Free' : ''}</span>
      </button>`).join('');

    list.querySelectorAll('.model-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        const meta = this.provider.models.find((m) => m.id === btn.dataset.id);
        this.provider.configure({
          model: btn.dataset.id,
          contextWindow: meta?.contextLength || this.provider.contextWindow,
        });
        const cwEl = document.getElementById('modalContextWindow');
        if (cwEl) cwEl.value = this.provider.contextWindow;
        this._updateSettingsParamsSummary();
        this._syncModelComboboxLabel();
        this._setModelPanelOpen(false);
        this._renderModelComboboxList();
        this._updateContextBudgetMeter();
        this._updateHomeStatusStrip();
      });
    });
  }

  _syncModelComboboxLabel() {
    const label = document.getElementById('modelComboboxLabel');
    if (!label) return;
    if (!this.provider.models?.length) {
      label.textContent = this.provider.model || 'No models loaded';
      return;
    }
    const cur = this.provider.models.find((m) => m.id === this.provider.model);
    label.textContent = cur ? cur.name : (this.provider.model || 'Select a model');
  }

  async testConnection() {
    const btn = document.getElementById('btnTestConnection');
    if (!btn) return;
    const labelSpan = btn.querySelector('span');
    const setBtnLabel = (txt) => { if (labelSpan) labelSpan.textContent = txt; else btn.textContent = txt; };
    btn.disabled = true;
    setBtnLabel('Testing…');
    this.provider.configure({
      type: document.getElementById('modalProviderType')?.value,
      apiKey: document.getElementById('modalApiKey')?.value,
      baseUrl: document.getElementById('modalBaseUrl')?.value,
    });
    this._updateAiConnectBridge('connecting', 'Handshaking with provider…');
    const result = await this.provider.testConnection();
    btn.disabled = false;
    if (result.ok) {
      setBtnLabel(`Connected (${result.models})`);
      this._populateModelSelect();
      this._updateConnectionStatus();
      this._updateHomeStatusStrip();
      this._updateAiConnectBridge('connected', `${result.models} models available`);
      setTimeout(() => { setBtnLabel('Test Connect'); }, 2800);
    } else {
      setBtnLabel('Failed');
      this._updateAiConnectBridge('error', result.error || 'Connection failed');
      this.showToast(result.error, true);
      setTimeout(() => { setBtnLabel('Test Connect'); }, 2800);
    }
  }

  async fetchModels() {
    this._updateAiConnectBridge('connecting', 'Fetching model catalog…');
    try {
      await this.provider.fetchModels();
      this._populateModelSelect();
      this._updateConnectionStatus();
      this._updateHomeStatusStrip();
      this._updateAiConnectBridge('connected', `${this.provider.models.length} models ready`);
      this.showToast(`Loaded ${this.provider.models.length} models`);
    } catch (e) {
      this._updateAiConnectBridge('error', e.message || 'Could not load models');
      this.showToast(e.message, true);
    }
  }

  _updateAiConnectBridge(forcedState = null, detailText = '') {
    const bridge = document.getElementById('wfAiConnectBridge');
    if (!bridge) return;
    const state = forcedState || (this.provider.connected ? 'connected' : 'idle');
    bridge.dataset.state = state;

    const providerLabel = PROVIDER_PRESETS[this.provider.type]?.name || 'Provider';
    const targetNameEl = document.getElementById('wfBridgeTargetName');
    const statusTextEl = document.getElementById('wfBridgeStatusText');
    if (targetNameEl) targetNameEl.textContent = providerLabel;

    if (statusTextEl) {
      if (detailText) {
        statusTextEl.textContent = detailText;
      } else if (state === 'connected') {
        const shortModel = (this.provider.model || '').split('/').pop() || providerLabel;
        statusTextEl.textContent = `Connected · ${shortModel}`;
      } else if (state === 'connecting') {
        statusTextEl.textContent = `Connecting to ${providerLabel}…`;
      } else if (state === 'error') {
        statusTextEl.textContent = `Unable to reach ${providerLabel}`;
      } else {
        statusTextEl.textContent = this.provider.model
          ? (this.provider.model || '').split('/').pop()
          : `Click Test Connect or Load Models to link ${providerLabel}`;
      }
    }
  }

  _updateConnectionStatus() {
    const dot = document.querySelector('.project-name .dot');
    if (dot) dot.style.background = this.provider.connected ? 'var(--md-success)' : 'var(--md-text-dim)';
    this._updateAiConnectBridge();
  }

  _updateProviderUI() {
    this._updateConnectionStatus();
    this.provider.models = [];
    this.provider.connected = false;
    this._populateModelSelect();
    this._updateAiConnectBridge('idle');
  }

  // ── Skills UI ──

  _renderSkillsIndicator() {
    this._syncPopoverSkillCounts();
    const enabled = this.skillManager.getActiveCount();
    const tabCount = document.getElementById('settingsSkillsTabCount');
    if (tabCount) tabCount.textContent = String(enabled);
    const container = document.getElementById('skillsIndicatorRow');
    if (!container) return;
    container.classList.toggle('open', this.skillsDockOpen);
    container.innerHTML = `
      <button type="button" class="skills-launcher" id="btnToggleSkillsDock" aria-expanded="${this.skillsDockOpen}">
        <i data-lucide="sparkles"></i>
        <span>Skills</span>
        <strong class="tabular-nums">${enabled}</strong>
      </button>
      <div class="skills-panel" role="menu" aria-label="Skill toggles">
        <div class="skills-panel-head">
          <div><strong>Active Skills</strong><small>${enabled} of ${this.skillManager.skills.length} enabled</small></div>
          <button type="button" class="icon-action-btn" id="btnSkillsOpenSys" title="System Instructions" aria-label="Open System Instructions"><i data-lucide="sliders-horizontal"></i></button>
        </div>
        <div class="skills-mini-list">
          ${this.skillManager.skills.map((s) => `
            <label class="skill-toggle-row ${s.enabled ? 'active' : ''}">
              <span class="skill-toggle-copy"><b>${escapeHtml(s.name)}</b><small>${escapeHtml(s.description)}</small></span>
              <input type="checkbox" class="m3-switch" data-skill-id="${escapeHtml(s.id)}" ${s.enabled ? 'checked' : ''} aria-label="Toggle ${escapeHtml(s.name)}">
            </label>`).join('')}
        </div>
      </div>`;

    document.getElementById('btnToggleSkillsDock')?.addEventListener('click', () => {
      this.skillsDockOpen = !this.skillsDockOpen;
      this._renderSkillsIndicator();
    });
    document.getElementById('btnSkillsOpenSys')?.addEventListener('click', () => {
      this.skillsDockOpen = false;
      this._renderSkillsIndicator();
      this.openSystemDrawer();
    });
    container.querySelectorAll('[data-skill-id]').forEach((cb) => {
      cb.addEventListener('change', () => {
        this.skillManager.toggle(cb.dataset.skillId);
        this.skillsDockOpen = true;
        this._renderSkillsIndicator();
        this._renderSkillsSettingsList();
        this._updateContextBudgetMeter();
      });
    });
    this._safeCreateIcons(container);
  }

  _renderSkillsSettingsList() {
    const list = document.getElementById('skillsList');
    if (!list) return;
    list.innerHTML = this.skillManager.skills.map((s, idx) => {
      const safeId = escapeHtml(s.id);
      const safeName = escapeHtml(s.name);
      const staggerMs = computeStaggerDelayMs(idx, { stepMs: 28, maxTotalMs: 240 });
      const repoLabel = s.source
        ? String(s.source).replace(/^https?:\/\/(?:www\.)?github\.com\//i, '').replace(/\/blob\/.*$/, '')
        : '';
      const repoLink = s.source && /^https?:\/\//i.test(s.source)
        ? `<span class="skill-meta-sep" aria-hidden="true">·</span><a class="skill-source-link" href="${escapeHtml(s.source)}" target="_blank" rel="noopener noreferrer">${escapeHtml(repoLabel || 'GitHub')}</a>`
        : '';
      return `
        <div class="skill-row wf-stagger-in" data-skill-id="${safeId}" style="--wf-stagger:${staggerMs}ms">
          <div class="skill-row-copy">
            <div class="skill-name-line">
              <span class="skill-name">${safeName}</span>${repoLink}
            </div>
            <span class="skill-card-desc">${escapeHtml(s.description)}</span>
          </div>
          <div class="skill-row-controls">
            <button type="button" class="skill-link-btn" data-action="view-skill">Prompt</button>
            ${!s.builtin ? `<button type="button" class="skill-link-btn danger" data-action="delete-skill">Delete</button>` : ''}
            <input type="checkbox" class="m3-switch m3-switch-sm" data-action="toggle-skill" ${s.enabled ? 'checked' : ''} aria-label="Toggle ${safeName}">
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.skill-row').forEach((row) => {
      const id = row.dataset.skillId;
      row.querySelector('[data-action="toggle-skill"]')?.addEventListener('change', () => {
        this.skillManager.toggle(id);
        this._renderSkillsIndicator();
        this._updateContextBudgetMeter();
      });
      row.querySelector('[data-action="view-skill"]')?.addEventListener('click', (e) => {
        const sk = this.skillManager.skills.find((x) => x.id === id);
        if (!sk) return;
        const area = document.getElementById('skillPromptPreview');
        if (area) area.value = sk.prompt;
        openDialogWithOrigin(document.getElementById('skillPromptModal'), e.currentTarget);
      });
      row.querySelector('[data-action="delete-skill"]')?.addEventListener('click', async () => {
        const sk = this.skillManager.skills.find((x) => x.id === id);
        if (!sk) return;
        const ok = await this.openAppPromptModal({
          title: 'Delete Skill',
          message: `Remove custom skill "${sk.name}"?`,
          confirmText: 'Delete',
          danger: true,
        });
        if (ok && this.skillManager.delete(id)) {
          this._renderSkillsSettingsList();
          this._renderSkillsIndicator();
        }
      });
    });
  }

  async testWebSearchInSettings() {
    const btn = document.getElementById('btnTestWebSearch');
    const out = document.getElementById('webSearchTestResult');
    if (btn) { btn.disabled = true; btn.textContent = 'Searching…'; }
    try {
      const res = await performWebSearch('React 19 Tailwind CSS latest features', { limit: 4 });
      if (out) {
        out.classList.remove('hidden');
        if (!res.results?.length) {
          out.innerHTML = `<span>No results returned (check internet connection).</span>`;
        } else {
          out.innerHTML = `
            <div class="gh-discover-head">
              <span>Live Search OK · ${escapeHtml(res.engine)} (${res.elapsedMs}ms)</span>
              <span class="tabular-nums">${res.results.length} results</span>
            </div>
            ${res.results.slice(0, 3).map((r) => `
              <div class="web-search-result-item">
                <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.title)}</a>
                ${r.snippet ? `<small>${escapeHtml(r.snippet.slice(0, 140))}</small>` : ''}
              </div>`).join('')}`;
        }
      }
      this.showToast(`Web search ready (${res.results?.length || 0} live hits)`);
    } catch (err) {
      this.showToast(err?.message || 'Web search test failed', true);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="globe"></i><span>Test Search</span>';
        this._safeCreateIcons(btn);
      }
    }
  }

  async importGitHubSkill(source = 'settings') {
    const isDrawer = source === 'drawer';
    const input = document.getElementById(isDrawer ? 'sysDrawerGithubUrl' : 'githubSkillUrl');
    const btn = document.getElementById(isDrawer ? 'btnSysDrawerImportGithub' : 'btnImportGithubSkill');
    const resultsBox = document.getElementById(isDrawer ? 'sysDrawerGithubResults' : 'githubSkillDiscoverResults');
    const url = (input?.value || '').trim();
    if (!url) return this.showToast('Paste a GitHub repo URL or owner/repo', true);

    if (btn) { btn.disabled = true; btn.textContent = 'Scanning…'; }
    if (resultsBox) { resultsBox.classList.add('hidden'); resultsBox.innerHTML = ''; }

    try {
      const { imported, discovered } = await this.skillManager.importFromGitHub(url);

      if (imported.length === 1) {
        if (input) input.value = '';
        this._renderSkillsSettingsList();
        this._renderSkillsIndicator();
        this._renderSystemDrawerSkills();
        this._updateSystemDrawerPreview();
        this._updateContextBudgetMeter();
        this.showToast(`Imported skill "${imported[0].name}"`);
        return;
      }

      // Multiple skills discovered inside repo — show clean 1-click picker
      if (resultsBox && discovered?.skills?.length) {
        resultsBox.classList.remove('hidden');
        resultsBox.innerHTML = `
          <div class="gh-discover-head">
            <span>Found ${discovered.skills.length} skills in ${escapeHtml(discovered.owner)}/${escapeHtml(discovered.repo)}</span>
            <button type="button" class="btn btn-primary btn-sm" data-action="import-all-gh">Import All</button>
          </div>
          ${discovered.skills.map((sk, idx) => `
            <div class="gh-discover-row">
              <div class="gh-discover-copy">
                <strong>${escapeHtml(sk.name)}</strong>
                <small class="truncate">${escapeHtml(sk.description)} · ${escapeHtml(sk.path)}</small>
              </div>
              <button type="button" class="btn btn-outline btn-sm" data-gh-idx="${idx}">Add</button>
            </div>`).join('')}`;

        const syncAllSkillViews = () => {
          this._renderSkillsSettingsList();
          this._renderSkillsIndicator();
          this._renderSystemDrawerSkills();
          this._updateSystemDrawerPreview();
          this._updateContextBudgetMeter();
        };

        resultsBox.querySelector('[data-action="import-all-gh"]')?.addEventListener('click', () => {
          let count = 0;
          for (const item of discovered.skills) {
            this.skillManager.importDiscoveredSkill(item);
            count++;
          }
          if (input) input.value = '';
          resultsBox.classList.add('hidden');
          resultsBox.innerHTML = '';
          syncAllSkillViews();
          this.showToast(`Imported ${count} skills from ${discovered.owner}/${discovered.repo}`);
        });

        resultsBox.querySelectorAll('[data-gh-idx]').forEach((addBtn) => {
          addBtn.addEventListener('click', () => {
            const item = discovered.skills[Number(addBtn.dataset.ghIdx)];
            if (!item) return;
            const { skill } = this.skillManager.importDiscoveredSkill(item);
            addBtn.disabled = true;
            addBtn.textContent = 'Added';
            syncAllSkillViews();
            this.showToast(`Added skill "${skill.name}"`);
          });
        });
      }
    } catch (e) {
      this.showToast(e.message, true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Scan & Add'; }
    }
  }

  importTextSkill() {
    const name = (document.getElementById('customSkillName')?.value || '').trim();
    const desc = (document.getElementById('customSkillDesc')?.value || '').trim();
    const prompt = (document.getElementById('customSkillPrompt')?.value || '').trim();
    if (!name || !prompt) return this.showToast('Name and prompt are required', true);
    const skill = this.skillManager.importFromText(name, desc || 'Custom skill', prompt);
    ['customSkillName', 'customSkillDesc', 'customSkillPrompt'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('customSkillForm')?.classList.add('hidden');
    this._renderSkillsSettingsList();
    this._renderSkillsIndicator();
    this.showToast(`Saved skill "${skill.name}"`);
  }

  // ── Export, Inspector & Helpers ──

  exportAsHTML() {
    if (!Object.keys(this.VFS).length) return this.showToast('Nothing to export', true);
    downloadBlob(new Blob([this.preview.getStandaloneTemplate(this.VFS)], { type: 'text/html' }), 'index.html');
    this.showToast('Downloaded standalone index.html');
  }

  exportAsZip() {
    if (!Object.keys(this.VFS).length) return this.showToast('Nothing to export', true);
    const proj = this._getActiveProject();
    const attachedManifests = [
      ...(Array.isArray(proj?.attachedManifests) ? proj.attachedManifests : []),
      ...(Array.isArray(this.wsComponentAttachments) ? this.wsComponentAttachments.map((a) => a.manifest).filter(Boolean) : []),
      ...(Array.isArray(this.homeComponentAttachments) ? this.homeComponentAttachments.map((a) => a.manifest).filter(Boolean) : []),
    ];
    const { safeSlug, files } = buildProjectExportFiles(
      proj?.name,
      this.VFS,
      this.preview.getStandaloneTemplate(this.VFS),
      { attachedManifests }
    );
    downloadBlob(createZipBlob(files), `${safeSlug}.zip`);
    this.showToast(`Downloaded ${safeSlug}.zip`);
  }

  async copyCode() {
    if (!this.activeFilePath || this.VFS[this.activeFilePath] === undefined) return;
    try {
      await navigator.clipboard.writeText(this._getEditorFileContent(this.activeFilePath));
      this.showToast(`Copied ${this.activeFilePath}`);
    } catch {
      this.showToast('Copy failed', true);
    }
  }

  editSelectedElement() {
    const ctx = this.preview.getSelectedElementContext();
    if (!ctx) return;
    const chip = document.getElementById('selectedElementChip');
    const chipText = document.getElementById('selectedElementChipText');
    if (chip && chipText && this.preview.selectedElement) {
      chipText.textContent = this.preview.selectedElement.label;
      chip.classList.remove('hidden');
      this._safeCreateIcons(chip);
    }
    this.preview.tooltip?.classList.remove('visible');
    if (this.preview.inspectMode) this.preview.toggleInspectMode(false);
    const input = document.getElementById('chatInput');
    if (input) {
      input.focus();
      input.placeholder = 'Describe changes to the selected element…';
    }
  }

  openPromptBuilderModal(triggerEl = null) {
    const modal = document.getElementById('promptBuilderModal');
    if (!modal) return;
    if (!modal.hasAttribute('tabindex')) modal.setAttribute('tabindex', '-1');
    openDialogWithOrigin(modal, triggerEl);
    try { modal.focus({ preventScroll: true }); } catch {}
    this.promptBuilder.syncStudioState();
    this.promptBuilder.showStep(this.promptBuilder.currentStep || 1);
    this.promptBuilder.renderProgress();
  }

  openSettingsModal(_triggerEl = null, pageId = null) {
    this.settingsView?.open(pageId || null);
  }

  openAppPromptModal({ title = 'Confirm', message = '', showInput = false, inputValue = '', placeholder = '', confirmText = 'Confirm', danger = false } = {}) {
    const modal = document.getElementById('appPromptModal');
    if (!modal) return Promise.resolve(null);
    if (this._appPromptResolver) {
      const prev = this._appPromptResolver;
      this._appPromptResolver = null;
      prev(null);
    }

    document.getElementById('appPromptTitle').textContent = title;
    document.getElementById('appPromptMessage').textContent = message;
    const wrap = document.getElementById('appPromptInputWrap');
    const input = document.getElementById('appPromptInput');
    const confirmBtn = document.getElementById('appPromptConfirmBtn');

    if (wrap) wrap.style.display = showInput ? '' : 'none';
    if (input) { input.value = inputValue; input.placeholder = placeholder; }
    if (confirmBtn) {
      confirmBtn.textContent = confirmText;
      confirmBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
      confirmBtn.onclick = () => this.closeAppPromptModal(showInput ? (input?.value || '').trim() : true);
    }

    return new Promise((resolve) => {
      this._appPromptResolver = resolve;
      modal.showModal();
      requestAnimationFrame(() => (showInput && input ? (input.focus(), input.select()) : confirmBtn?.focus()));
    });
  }

  closeAppPromptModal(result) {
    const modal = document.getElementById('appPromptModal');
    if (modal?.open) modal.close();
    if (this._appPromptResolver) {
      const res = this._appPromptResolver;
      this._appPromptResolver = null;
      res(result);
    }
  }

  autoGrow(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  _populateCardIcons() {
    const iconMap = {
      business: 'briefcase', restaurant: 'utensils', 'real estate': 'building-2', health: 'heart-pulse',
      law: 'scale', gym: 'dumbbell', portfolio: 'user', photography: 'camera', blog: 'newspaper',
      music: 'music', wedding: 'heart', travel: 'plane', saas: 'rocket', 'e-commerce': 'shopping-cart',
      education: 'graduation-cap', event: 'calendar', 'non-profit': 'hand-heart', church: 'church',
      minimalist: 'minus', corporate: 'building', swiss: 'grid-3x3', flat: 'layers', nordic: 'snowflake',
      bento: 'layout-grid', japanese: 'fan', neomorphism: 'circle', luxury: 'gem', 'dark modern': 'moon',
      cyberpunk: 'zap', brutalist: 'hammer', maximalist: 'sparkles', gradient: 'rainbow', playful: 'smile',
      editorial: 'book-open', parallax: 'move-vertical', terminal: 'terminal', glassmorphism: 'glasses',
      glasspunk: 'eye', skeuomorphic: 'box', 'art deco': 'hexagon', bohemian: 'flower-2',
      industrial: 'wrench', 'vintage rustic': 'pen-tool', organic: 'leaf', retro: 'disc',
    };
    document.querySelectorAll('#promptBuilderModal .card-icon').forEach((el) => {
      if (el.querySelector('i, svg')) return;
      const title = el.closest('.select-card')?.querySelector('.card-title')?.textContent?.trim().toLowerCase() || '';
      const icon = Object.entries(iconMap).find(([k]) => title.includes(k))?.[1] || 'star';
      el.innerHTML = `<i data-lucide="${icon}" style="width:16px;height:16px"></i>`;
    });
  }

  // ── Centralized DOM Event Bindings ──

  _setupEventBindings() {
    // Theme toggles
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => this.toggleTheme());
    });

    // Desktop collapsible sidebar & mobile drawer on Home
    document.getElementById('btnHomeNavToggle')?.addEventListener('click', () => this.setHomeDrawerOpen(true));
    document.getElementById('homeSidebarBackdrop')?.addEventListener('click', () => this.setHomeDrawerOpen(false));
    document.getElementById('btnCloseHomeDrawer')?.addEventListener('click', () => this.setHomeDrawerOpen(false));
    document.getElementById('btnCollapseHomeSidebar')?.addEventListener('click', () => this.toggleHomeSidebar(true));
    document.getElementById('btnExpandHomeSidebar')?.addEventListener('click', () => this.toggleHomeSidebar(false));
    document.getElementById('btnCloseActivityDrawer')?.addEventListener('click', () => this.closeActivityDrawer());

    // Home actions
    document.getElementById('homeSendBtn')?.addEventListener('click', () => this.sendHomePrompt());
    const homeInput = document.getElementById('homePromptInput');
    homeInput?.addEventListener('input', () => {
      this.autoGrow(homeInput);
      this._updateHomeStatusStrip();
    });
    homeInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendHomePrompt(); }
    });
    document.getElementById('homeProjectSearch')?.addEventListener('input', (e) => {
      this.homeSearchQuery = e.target.value;
      this._renderHomeProjects();
    });
    document.getElementById('homeModelBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleHomeModelPopover();
    });
    document.getElementById('btnHomeManageProviders')?.addEventListener('click', () => {
      this.toggleHomeModelPopover(false);
      this.settingsView.open('model-provider');
    });
    document.getElementById('btnHeroUiCatalog')?.addEventListener('click', () => this.uiLibraryModal.open('awesome-components'));
    document.getElementById('btnHomeQuickUiLib')?.addEventListener('click', () => this.uiLibraryModal.open());
    document.getElementById('btnHomeQuickGithub')?.addEventListener('click', () => this.uiLibraryModal.open(null, 'github'));
    document.getElementById('btnHomePlanToggle')?.addEventListener('click', () => this.togglePlanMode());
    document.getElementById('btnWsPlanToggle')?.addEventListener('click', () => this.togglePlanMode());
    document.getElementById('btnNewProjectHome')?.addEventListener('click', () => {
      this.setHomeDrawerOpen(false);
      this.createNewProject();
    });
    document.getElementById('btnOpenSettingsHome')?.addEventListener('click', () => {
      this.setHomeDrawerOpen(false);
      this.settingsView.open();
    });
    document.getElementById('btnOpenCommandHome')?.addEventListener('click', () => {
      this.toggleComposerToolsMenu('home', false);
      this.openCommandPalette('');
    });
    document.getElementById('btnOpenPromptBuilderHome')?.addEventListener('click', (e) => this.openPromptBuilderModal(e.currentTarget));
    document.getElementById('btnOpenPromptBuilderHomeSidebar')?.addEventListener('click', (e) => {
      this.setHomeDrawerOpen(false);
      this.openPromptBuilderModal(e.currentTarget);
    });
    document.getElementById('btnOpenUiLibraryHomeSidebar')?.addEventListener('click', () => {
      this.setHomeDrawerOpen(false);
      this.uiLibraryModal.open();
    });

    // Workspace Top Bar & Tier 3 More Menus
    document.getElementById('btnBackHome')?.addEventListener('click', () => {
      this.closeActivityDrawer();
      this.showHomeView();
    });
    document.getElementById('projectNameBtn')?.addEventListener('click', () => this.toggleProjectDropdown());
    document.getElementById('btnNewProjectDropdown')?.addEventListener('click', () => {
      this.createNewProject();
      this.toggleProjectDropdown(false);
    });
    document.getElementById('btnOpenUiLibraryTopbar')?.addEventListener('click', () => this.uiLibraryModal.open());
    document.getElementById('btnCheckpointsModal')?.addEventListener('click', () => this.openCheckpointsModal());
    document.getElementById('btnCommandPalette')?.addEventListener('click', () => {
      this.toggleToolbarMoreMenu('topbar', false);
      this.openCommandPalette('');
    });
    document.getElementById('btnOpenSettings')?.addEventListener('click', () => {
      this.toggleToolbarMoreMenu('topbar', false);
      this.settingsView.open();
    });
    document.getElementById('btnExportZip')?.addEventListener('click', () => this.exportAsZip());
    document.getElementById('btnExportHtml')?.addEventListener('click', () => {
      this.toggleToolbarMoreMenu('ws', false);
      this.exportAsHTML();
    });
    document.getElementById('btnTopbarMore')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleToolbarMoreMenu('ws', false);
      this.toggleToolbarMoreMenu('topbar');
    });
    document.getElementById('btnWsToolbarMore')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleToolbarMoreMenu('topbar', false);
      this.toggleToolbarMoreMenu('ws');
    });
    document.getElementById('topbarMoreMenu')?.addEventListener('click', (e) => {
      if (e.target.closest('[data-theme-toggle]')) {
        this.toggleToolbarMoreMenu('topbar', false);
      }
    });
    document.getElementById('wsToolbarMoreMenu')?.addEventListener('click', (e) => {
      if (e.target.closest('#btnRefreshPreview, #btnNewTabPreview')) {
        this.toggleToolbarMoreMenu('ws', false);
      }
    });

    document.addEventListener('click', (e) => {
      const dd = document.getElementById('projectDropdown');
      const btn = document.getElementById('projectNameBtn');
      if (dd && btn && !dd.contains(e.target) && !btn.contains(e.target)) {
        this.toggleProjectDropdown(false);
      }
      const ctxWrap = document.getElementById('contextBudgetWrap');
      if (ctxWrap && !ctxWrap.contains(e.target)) {
        ctxWrap.classList.remove('is-open');
      }
      const homeRingWrap = document.getElementById('homeTokenRingWrap');
      if (homeRingWrap && !homeRingWrap.contains(e.target)) {
        homeRingWrap.classList.remove('is-open');
      }
      const homeTools = document.getElementById('homeToolsWrap');
      if (homeTools && !homeTools.contains(e.target)) {
        this.toggleComposerToolsMenu('home', false);
      }
      const wsTools = document.getElementById('wsToolsWrap');
      if (wsTools && !wsTools.contains(e.target)) {
        this.toggleComposerToolsMenu('ws', false);
      }
      const topbarMore = document.getElementById('topbarMoreWrap');
      if (topbarMore && !topbarMore.contains(e.target)) {
        this.toggleToolbarMoreMenu('topbar', false);
      }
      const wsMore = document.getElementById('wsToolbarMoreWrap');
      if (wsMore && !wsMore.contains(e.target)) {
        this.toggleToolbarMoreMenu('ws', false);
      }
      const homeModelWrap = document.getElementById('homeModelWrap');
      if (homeModelWrap && !homeModelWrap.contains(e.target)) {
        this.toggleHomeModelPopover(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        this.toggleHomeModelPopover(false);
        this.settingsView.open();
        return;
      }
      if (e.key === 'Escape') {
        const pop = document.getElementById('homeModelPopover');
        if (pop && !pop.hidden) {
          this.toggleHomeModelPopover(false);
          return;
        }
        this.toggleComposerToolsMenu('home', false);
        this.toggleComposerToolsMenu('ws', false);
        this.toggleToolbarMoreMenu('topbar', false);
        this.toggleToolbarMoreMenu('ws', false);
        document.getElementById('homeTokenRingWrap')?.classList.remove('is-open');
        document.getElementById('contextBudgetWrap')?.classList.remove('is-open');
        if (this._openActivityTurnId) this.closeActivityDrawer();
        if (this.settingsView?.isOpen && !document.querySelector('dialog[open]')) {
          this.settingsView.close();
          return;
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !e.shiftKey && !e.altKey) {
        const homeView = document.getElementById('homeView');
        if (homeView && homeView.style.display !== 'none' && window.innerWidth > 900) {
          e.preventDefault();
          this.toggleHomeSidebar();
        }
      }
    });

    // Mobile Workspace Pane Switcher
    document.querySelectorAll('[data-mobile-pane-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.mobilePane = btn.dataset.mobilePaneBtn;
        this._updateMobilePaneUI();
      });
    });

    // Chat Composer
    const chatInput = document.getElementById('chatInput');
    chatInput?.addEventListener('input', () => {
      this.autoGrow(chatInput);
      this._updateContextBudgetMeter();
    });
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendChatMessage(); }
    });
    document.getElementById('chatSend')?.addEventListener('click', () => this.sendChatMessage());
    document.getElementById('btnStop')?.addEventListener('click', () => this.stopGeneration());
    document.getElementById('btnAutoFix')?.addEventListener('click', () => {
      this.toggleComposerToolsMenu('ws', false);
      this.triggerAutoFix();
    });
    document.getElementById('btnRetryGen')?.addEventListener('click', () => this.retryLastGeneration());
    document.getElementById('btnWsPromptBuilder')?.addEventListener('click', (e) => this.openPromptBuilderModal(e.currentTarget));
    document.getElementById('btnClearSelectedEl')?.addEventListener('click', () => this.preview.clearSelectedElement());
    document.getElementById('homeTokenRingBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('homeTokenRingWrap')?.classList.toggle('is-open');
    });
    document.getElementById('contextBudgetMeter')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('contextBudgetWrap')?.classList.toggle('is-open');
    });

    // Stage Toolbar
    document.getElementById('btnViewPreview')?.addEventListener('click', () => this.switchWorkspaceView('preview'));
    document.getElementById('btnViewFiles')?.addEventListener('click', () => this.switchWorkspaceView('files'));
    document.getElementById('btnViewDiff')?.addEventListener('click', () => this.switchWorkspaceView('diff'));
    document.getElementById('btnInspectPreview')?.addEventListener('click', () => {
      const active = this.preview.toggleInspectMode();
      this.showToast(active ? 'Inspect mode active — click an element in preview to edit or swap' : 'Inspect mode off');
    });
    document.getElementById('btnSwapSection')?.addEventListener('click', (e) => {
      this.sectionSwapModal.open({ triggerEl: e.currentTarget });
    });
    document.getElementById('btnRefreshPreview')?.addEventListener('click', () => this.preview.refresh());
    document.getElementById('btnNewTabPreview')?.addEventListener('click', () => this.preview.openInNewTab());
    document.getElementById('btnToggleDevtools')?.addEventListener('click', () => this.toggleDevtools());

    // Element Tooltip
    document.getElementById('btnTooltipSwapLibrary')?.addEventListener('click', (e) => {
      const sel = this.preview.selectedElement ? { ...this.preview.selectedElement } : null;
      this.preview.tooltip?.classList.remove('visible');
      if (this.preview.inspectMode) this.preview.toggleInspectMode(false);
      this.sectionSwapModal.open({ inspectedElement: sel, triggerEl: e.currentTarget });
    });
    document.getElementById('btnEditSelectedEl')?.addEventListener('click', () => this.editSelectedElement());
    document.getElementById('btnDismissSelectedEl')?.addEventListener('click', () => this.preview.clearSelectedElement());

    // Code Explorer & Editor
    document.getElementById('fileSearchInput')?.addEventListener('input', (e) => {
      this.fileSearchQuery = e.target.value;
      this._renderFileTree();
    });
    document.getElementById('btnCreateVfsFile')?.addEventListener('click', () => this.createVFSFile());
    document.getElementById('btnRevertVFS')?.addEventListener('click', () => this.revertVFS());
    document.getElementById('btnResetVFS')?.addEventListener('click', () => this.resetProjectVFS());
    document.getElementById('btnQuickOpenFile')?.addEventListener('click', () => this.openCommandPalette('file:'));
    document.getElementById('btnCompareActiveFile')?.addEventListener('click', () => {
      if (this.activeFilePath) this.openFileInDiff(this.activeFilePath);
    });
    document.getElementById('btnSaveFileToLibrary')?.addEventListener('click', () => {
      if (!this.activeFilePath) return this.showToast('Open a file first', true);
      const code = this._getEditorFileContent(this.activeFilePath);
      this.uiLibraryModal.openSaveActiveFileFlow(this.activeFilePath, code);
    });
    document.getElementById('btnSaveCode')?.addEventListener('click', () => this.saveActiveFileEdits());
    document.getElementById('btnDiscardCode')?.addEventListener('click', () => this.discardActiveFileEdits());
    document.getElementById('btnCopyCode')?.addEventListener('click', () => this.copyCode());

    // Diff View Controls
    document.getElementById('diffBaselineSelect')?.addEventListener('change', (e) => {
      this.diffBaselineId = e.target.value;
      this._renderDiffView();
    });
    document.getElementById('btnDiffUnified')?.addEventListener('click', () => {
      this.diffMode = 'unified';
      document.getElementById('btnDiffUnified')?.classList.add('active');
      document.getElementById('btnDiffSplit')?.classList.remove('active');
      this._renderDiffView();
    });
    document.getElementById('btnDiffSplit')?.addEventListener('click', () => {
      this.diffMode = 'split';
      document.getElementById('btnDiffSplit')?.classList.add('active');
      document.getElementById('btnDiffUnified')?.classList.remove('active');
      this._renderDiffView();
    });

    // DevTools Drawer
    document.querySelectorAll('[data-devtools-tab]').forEach((btn) => {
      btn.addEventListener('click', () => this.setDevtoolsTab(btn.dataset.devtoolsTab));
    });
    document.getElementById('devtoolsConsoleLevel')?.addEventListener('change', (e) => {
      this.consoleFilter = e.target.value;
      this._renderDevtoolsContent();
    });
    document.getElementById('btnDevtoolsClear')?.addEventListener('click', () => {
      if (this.devtoolsTab === 'console') this.preview.clearConsole();
      else if (this.devtoolsTab === 'network') this.preview.clearNetwork();
      this._renderDevtoolsContent();
      this._updateDevtoolsBadges();
    });
    document.getElementById('btnDevtoolsAutoFix')?.addEventListener('click', () => this.triggerAutoFix());
    document.getElementById('btnDevtoolsClose')?.addEventListener('click', () => this.toggleDevtools(false));

    // Checkpoints Modal
    document.getElementById('btnCreateCheckpoint')?.addEventListener('click', () => this.createManualCheckpoint());
    document.getElementById('checkpointNameInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.createManualCheckpoint(); }
    });

    // Composer Controls Popovers (Model, Web Search, Sub-Agents, System)
    document.getElementById('btnHomeToolsMenu')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleComposerToolsMenu('home');
    });
    document.getElementById('btnWsToolsMenu')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleComposerToolsMenu('ws');
    });
    document.getElementById('btnHomePopoverModel')?.addEventListener('click', () => {
      this.toggleComposerToolsMenu('home', false);
      this.settingsView.open('model-provider');
    });
    document.getElementById('btnWsPopoverModel')?.addEventListener('click', () => {
      this.toggleComposerToolsMenu('ws', false);
      this.settingsView.open('model-provider');
    });
    document.getElementById('toggleHomeWebSearch')?.addEventListener('change', (e) => this.toggleWebSearchPref(e.target.checked));
    document.getElementById('toggleWsWebSearch')?.addEventListener('change', (e) => this.toggleWebSearchPref(e.target.checked));
    document.getElementById('toggleHomeSubAgents')?.addEventListener('change', (e) => this.toggleSubAgentsPref(e.target.checked));
    document.getElementById('toggleWsSubAgents')?.addEventListener('change', (e) => this.toggleSubAgentsPref(e.target.checked));
    document.getElementById('btnHomePopoverUiLibrary')?.addEventListener('click', () => {
      this.toggleComposerToolsMenu('home', false);
      this.uiLibraryModal.open(null, null, { mode: 'attach-chat', chatTarget: 'home' });
    });
    document.getElementById('btnWsPopoverUiLibrary')?.addEventListener('click', () => {
      this.toggleComposerToolsMenu('ws', false);
      this.uiLibraryModal.open(null, null, { mode: 'attach-chat', chatTarget: 'ws' });
    });
    document.getElementById('btnHomePopoverSystem')?.addEventListener('click', () => {
      this.toggleComposerToolsMenu('home', false);
      this.openSystemDrawer();
    });
    document.getElementById('btnWsPopoverSystem')?.addEventListener('click', () => {
      this.toggleComposerToolsMenu('ws', false);
      this.openSystemDrawer();
    });
    document.getElementById('toggleSettingsWebSearch')?.addEventListener('change', (e) => this.toggleWebSearchPref(e.target.checked));
    document.getElementById('toggleSettingsSubAgents')?.addEventListener('change', (e) => this.toggleSubAgentsPref(e.target.checked));
    document.getElementById('btnTestWebSearch')?.addEventListener('click', () => this.testWebSearchInSettings());

    // System Instructions Drawer
    document.getElementById('sysBaseInstructions')?.addEventListener('input', () => this._updateSystemDrawerPreview());
    document.getElementById('sysProjectInstructions')?.addEventListener('input', () => this._updateSystemDrawerPreview());
    document.getElementById('btnResetSystemBase')?.addEventListener('click', () => this.resetSystemBase());
    document.getElementById('btnSaveSystemDrawer')?.addEventListener('click', () => this.saveSystemDrawer());
    document.getElementById('btnSysDrawerImportGithub')?.addEventListener('click', () => this.importGitHubSkill('drawer'));
    document.getElementById('sysDrawerGithubUrl')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.importGitHubSkill('drawer'); }
    });

    // Settings & Skills
    document.getElementById('btnTestConnection')?.addEventListener('click', () => this.testConnection());
    document.getElementById('btnFetchModels')?.addEventListener('click', () => this.fetchModels());
    document.getElementById('btnImportGithubSkill')?.addEventListener('click', () => this.importGitHubSkill('settings'));
    document.getElementById('githubSkillUrl')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.importGitHubSkill('settings'); }
    });
    document.getElementById('btnToggleCustomSkillForm')?.addEventListener('click', () => {
      document.getElementById('customSkillForm')?.classList.toggle('hidden');
    });
    document.getElementById('btnCancelCustomSkill')?.addEventListener('click', () => {
      document.getElementById('customSkillForm')?.classList.add('hidden');
    });
    document.getElementById('btnSaveCustomSkill')?.addEventListener('click', () => this.importTextSkill());

    // Backdrop dismiss on all dialogs (Principle 18: fast close faster than open)
    document.querySelectorAll('dialog').forEach((d) => {
      d.addEventListener('click', (e) => {
        if (e.target === d) {
          if (d.id === 'appPromptModal') this.closeAppPromptModal(null);
          else closeDialogFast(d);
        }
      });
    });
    const promptModal = document.getElementById('appPromptModal');
    promptModal?.addEventListener('cancel', (e) => { e.preventDefault(); this.closeAppPromptModal(null); });
    document.getElementById('appPromptInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.closeAppPromptModal(e.target.value.trim()); }
    });
    document.getElementById('btnAppPromptCancel')?.addEventListener('click', () => this.closeAppPromptModal(null));
    document.getElementById('btnAppPromptClose')?.addEventListener('click', () => this.closeAppPromptModal(null));
  }
}
