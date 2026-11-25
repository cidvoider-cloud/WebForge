/**
 * WebForge Settings — Full-Page Cherry Studio–Structured Controller
 * Reuses shared primitives from ./primitives.mjs across all 11 settings pages.
 * Autosaves all edits; toasts only on errors. Zero modals for settings.
 */

import { escapeHtml, safeStorageGet, safeStorageSet, STORAGE_KEYS } from '../../../js/modules/storage.mjs';
import { estimateTokens } from '../../../js/modules/context-budget.mjs';
import { performWebSearch } from '../../../js/modules/web-search.mjs';
import { PROVIDER_GROUPS, PROVIDER_PROTOCOLS, resolveProviderEndpoint } from '../../../js/modules/providers.mjs';
import { renderProviderMark } from '../../../js/modules/kubai-icons.mjs';
import { prefersReducedMotion } from '../../../js/modules/motion.mjs';
import {
  SETTINGS_NAV_GROUPS,
  SETTINGS_ROUTES,
  DEFAULT_SETTINGS_PAGE,
  resolveSettingsRoute,
  getSettingsPageMeta,
  filterNavGroups,
  groupModelsByFamily,
  KEYBOARD_SHORTCUTS_LIST,
} from './settings-data.mjs';
import {
  SettingsLayout,
  SettingsNav,
  SettingsPage,
  SettingsCard,
  SettingsRow,
  ListPane,
  ListItem,
  Switch,
  ModelSelect,
  SecretInput,
  EmptyState,
} from './primitives.mjs';

export {
  SETTINGS_NAV_GROUPS,
  SETTINGS_ROUTES,
  resolveSettingsRoute,
  SettingsLayout,
  SettingsNav,
  SettingsPage,
  SettingsCard,
  SettingsRow,
  ListPane,
  ListItem,
  Switch,
  ModelSelect,
  SecretInput,
  EmptyState,
};

export class SettingsController {
  constructor(studio) {
    this.studio = studio;
    this.container = null;
    this.isOpen = false;
    this.previousView = 'home';
    this.activePage = this._loadLastPage();
    this.navSearch = '';
    this.mobileNavOpen = false;

    // Model provider page state
    this.selectedProviderId = studio.provider?.type || 'strata';
    this.providerListSearch = '';
    this.providerListFilter = 'all'; // all | enabled | local | cloud
    this.showAddProviderForm = false;
    this.showProviderGearPanel = false;
    this.modelSearchOpen = false;
    this.modelSearch = '';
    this.modelFilter = 'all'; // all | free | vision | reasoning
    this.showAddModelForm = false;
    this.editingModelId = null;
    this.collapsedFamilies = new Set();
    this.checkingProviderId = null;
    this.syncingProviderId = null;

    // Animation & partial-render state
    this._closeTimer = null;
    this._shellMounted = false;
    this._lastPageId = null;
    this._lastHasListPane = false;

    // Skills page state
    this.selectedSkillId = null;
    this.skillListSearch = '';
    this.skillAddMode = null; // null | 'github' | 'custom'
    this.skillAddMenuOpen = false;
    this.skillGithubUrl = '';
    this.skillGithubDiscover = null;
    this.skillGithubScanning = false;

    // Agent page state
    this.webSearchTesting = false;
    this.webSearchResult = null;
  }

  _loadLastPage() {
    const saved = this.studio.layoutPrefs?.lastSettingsPage;
    return resolveSettingsRoute(saved || DEFAULT_SETTINGS_PAGE);
  }

  _saveLastPage(pageId) {
    if (!this.studio.layoutPrefs) this.studio.layoutPrefs = {};
    this.studio.layoutPrefs.lastSettingsPage = pageId;
    safeStorageSet(STORAGE_KEYS.LAYOUT, JSON.stringify(this.studio.layoutPrefs));
  }

  init() {
    this.container = document.getElementById('settingsView');
    if (!this.container) return;

    // Handle direct /settings/* URL load
    if (typeof location !== 'undefined' && location.pathname.startsWith('/settings')) {
      const pageId = resolveSettingsRoute(location.pathname);
      this.open(pageId, { pushHistory: false });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        if (location.pathname.startsWith('/settings')) {
          const pageId = resolveSettingsRoute(location.pathname);
          this.open(pageId, { pushHistory: false });
        } else if (this.isOpen) {
          this.close({ pushHistory: false });
        }
      });
    }
  }

  open(pageId = null, { pushHistory = true, providerId = null } = {}) {
    if (!this.container) this.container = document.getElementById('settingsView');
    if (!this.container) return;

    // Cancel any in-flight close animation (interruptible motion)
    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }

    const wasOpen = this.isOpen;
    if (!wasOpen) {
      this.previousView = this.studio.isHomeViewActive() ? 'home' : 'workspace';
    }

    const nextPage = pageId ? resolveSettingsRoute(pageId) : this.activePage || DEFAULT_SETTINGS_PAGE;
    const pageChanged = this.activePage !== nextPage;
    this.activePage = nextPage;
    this._saveLastPage(nextPage);

    if (providerId && this.studio.provider.getProviderConfig(providerId)) {
      this.selectedProviderId = providerId;
    } else if (!this.studio.provider.getProviderConfig(this.selectedProviderId)) {
      this.selectedProviderId = this.studio.provider.type || 'strata';
    }

    if (!this.selectedSkillId && this.studio.skillManager.skills.length) {
      const activeFirst = this.studio.skillManager.skills.find((s) => s.enabled) || this.studio.skillManager.skills[0];
      this.selectedSkillId = activeFirst?.id || null;
    }

    this.mobileNavOpen = false;
    this.isOpen = true;

    this.container.classList.remove('is-closing');
    this.container.hidden = false;

    if (pushHistory && typeof history !== 'undefined') {
      const route = SETTINGS_ROUTES[nextPage] || '/settings/model-provider';
      if (location.pathname !== route) {
        try { history.pushState({ settingsPage: nextPage }, '', route); } catch {}
      }
    }

    this.render({ animatePage: !wasOpen || pageChanged, forceFullShell: !this._shellMounted });

    if (!wasOpen) {
      if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
        this.container.classList.add('is-open');
      } else {
        this.container.classList.remove('is-open');
        requestAnimationFrame(() => {
          if (this.isOpen && this.container) {
            this.container.classList.add('is-open');
          }
        });
      }
    }
  }

  navigate(pageId, { pushHistory = true } = {}) {
    const resolved = resolveSettingsRoute(pageId);
    const changed = resolved !== this.activePage;
    this.activePage = resolved;
    this.mobileNavOpen = false;
    this.skillAddMenuOpen = false;
    this._saveLastPage(resolved);
    if (pushHistory && typeof history !== 'undefined') {
      const route = SETTINGS_ROUTES[resolved] || '/settings/model-provider';
      if (location.pathname !== route) {
        try { history.pushState({ settingsPage: resolved }, '', route); } catch {}
      }
    }
    this.render({ animatePage: changed });
  }

  close({ pushHistory = true } = {}) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.skillAddMenuOpen = false;

    if (pushHistory && typeof history !== 'undefined' && location.pathname.startsWith('/settings')) {
      try { history.pushState({}, '', '/'); } catch {}
    }

    const revealUnderlying = () => {
      const home = document.getElementById('homeView');
      const ws = document.getElementById('workspaceView');
      if (this.previousView === 'workspace' && this.studio.activeProjectId) {
        if (home) home.style.display = 'none';
        if (ws) {
          ws.style.display = 'flex';
          this.studio._triggerViewEnter?.(ws);
        }
      } else {
        if (ws) ws.style.display = 'none';
        if (home) {
          home.style.display = 'flex';
          this.studio._triggerViewEnter?.(home);
        }
      }
      this.studio._updateHomeStatusStrip();
      this.studio._renderSkillsIndicator();
      this.studio._updateContextBudgetMeter();
      this.studio._safeCreateIcons();
    };

    revealUnderlying();

    if (!this.container) return;
    if (prefersReducedMotion() || typeof setTimeout !== 'function') {
      this.container.classList.remove('is-open', 'is-closing');
      this.container.hidden = true;
      return;
    }

    this.container.classList.remove('is-open');
    this.container.classList.add('is-closing');
    if (this._closeTimer) clearTimeout(this._closeTimer);
    this._closeTimer = setTimeout(() => {
      this._closeTimer = null;
      if (!this.isOpen && this.container) {
        this.container.classList.remove('is-closing');
        this.container.hidden = true;
      }
    }, 135);
  }

  _replayAnimationClass(el, className) {
    if (!el || prefersReducedMotion()) return;
    el.classList.remove('st-page-enter', 'st-detail-enter', 'st-list-enter');
    void el.offsetWidth;
    el.classList.add(className);
  }

  render({
    animatePage = false,
    animateDetail = false,
    updateNav = false,
    forceFullShell = false,
  } = {}) {
    if (!this.container || !this.isOpen) return;

    const focusId = document.activeElement?.id || '';
    const selStart = typeof document.activeElement?.selectionStart === 'number' ? document.activeElement.selectionStart : null;
    const selEnd = typeof document.activeElement?.selectionEnd === 'number' ? document.activeElement.selectionEnd : null;

    // Preserve scrollable list position across partial updates
    const prevListScroll = this.container.querySelector('.st-list-scroll')?.scrollTop || 0;

    const meta = getSettingsPageMeta(this.activePage);
    const { listPaneHtml, contentHtml } = this._renderPage(this.activePage);
    const hasListPane = Boolean(listPaneHtml);
    const listPaneChanged = hasListPane !== this._lastHasListPane || this.activePage !== this._lastPageId;

    const existingShell = !forceFullShell ? this.container.querySelector('[data-st-shell]') : null;

    if (!existingShell) {
      const filteredGroups = filterNavGroups(SETTINGS_NAV_GROUPS, this.navSearch);
      const navHtml = SettingsNav({
        groups: filteredGroups,
        activePageId: this.activePage,
        searchQuery: this.navSearch,
      });

      this.container.innerHTML = SettingsLayout({
        navHtml,
        listPaneHtml,
        contentHtml,
        hasListPane,
        activePageLabel: meta.label,
        mobileNavOpen: this.mobileNavOpen,
        animatePage,
        animateListPane: hasListPane && animatePage,
      });
      this._shellMounted = true;
      this._bindNavEvents();
      this._bindBodyEvents();
      this.studio._safeCreateIcons(this.container);
    } else {
      // Partial smooth update — keeps left nav & scroll calm without full-screen flicker
      existingShell.classList.toggle('has-list-pane', hasListPane);
      existingShell.classList.toggle('st-mobile-nav-open', Boolean(this.mobileNavOpen));

      if (updateNav) {
        const navPane = existingShell.querySelector('#stNavPane');
        if (navPane) {
          const filteredGroups = filterNavGroups(SETTINGS_NAV_GROUPS, this.navSearch);
          navPane.innerHTML = SettingsNav({
            groups: filteredGroups,
            activePageId: this.activePage,
            searchQuery: this.navSearch,
          });
          this._bindNavEvents();
          this.studio._safeCreateIcons(navPane);
        }
      } else {
        existingShell.querySelectorAll('[data-st-nav]').forEach((btn) => {
          const isAct = btn.dataset.stNav === this.activePage;
          btn.classList.toggle('active', isAct);
          btn.setAttribute('aria-current', isAct ? 'page' : 'false');
        });
      }

      const drillTitle = existingShell.querySelector('#stMobileDrillTitle');
      if (drillTitle) drillTitle.textContent = meta.label;

      const listHost = existingShell.querySelector('#stListPaneHost');
      if (listHost) {
        if (hasListPane) {
          listHost.hidden = false;
          listHost.innerHTML = listPaneHtml;
          if (listPaneChanged) {
            this._replayAnimationClass(listHost, 'st-list-enter');
          }
          this.studio._safeCreateIcons(listHost);
        } else {
          listHost.hidden = true;
          listHost.innerHTML = '';
        }
      }

      const contentInner = existingShell.querySelector('#stContentInner');
      if (contentInner) {
        contentInner.innerHTML = contentHtml;
        if (animatePage) {
          const scroller = existingShell.querySelector('#stContentScroll');
          if (scroller) scroller.scrollTop = 0;
          this._replayAnimationClass(contentInner, 'st-page-enter');
        } else if (animateDetail) {
          const scroller = existingShell.querySelector('#stContentScroll');
          if (scroller) scroller.scrollTop = 0;
          this._replayAnimationClass(contentInner, 'st-detail-enter');
        }
        this.studio._safeCreateIcons(contentInner);
      }

      this._bindBodyEvents();
    }

    this._lastPageId = this.activePage;
    this._lastHasListPane = hasListPane;

    // Restore list scroll position if staying on the same master-detail page
    if (!listPaneChanged && prevListScroll > 0) {
      const nextListScroll = this.container.querySelector('.st-list-scroll');
      if (nextListScroll) nextListScroll.scrollTop = prevListScroll;
    }

    if (focusId) {
      const target = document.getElementById(focusId);
      if (target && typeof target.focus === 'function') {
        target.focus({ preventScroll: true });
        if (selStart !== null && typeof target.setSelectionRange === 'function') {
          try { target.setSelectionRange(selStart, selEnd ?? selStart); } catch {}
        }
      }
    }
  }

  _renderPage(pageId) {
    switch (pageId) {
      case 'model-provider': return this._renderModelProviderPage();
      case 'default-models': return { listPaneHtml: '', contentHtml: this._renderDefaultModelsPage() };
      case 'local-models': return { listPaneHtml: '', contentHtml: this._renderLocalModelsPage() };
      case 'agent': return { listPaneHtml: '', contentHtml: this._renderAgentPage() };
      case 'skills': return this._renderSkillsPage();
      case 'system-instructions': return { listPaneHtml: '', contentHtml: this._renderSystemInstructionsPage() };
      case 'general': return { listPaneHtml: '', contentHtml: this._renderGeneralPage() };
      case 'appearance': return { listPaneHtml: '', contentHtml: this._renderAppearancePage() };
      case 'keyboard-shortcuts': return { listPaneHtml: '', contentHtml: this._renderKeyboardShortcutsPage() };
      case 'data': return { listPaneHtml: '', contentHtml: this._renderDataPage() };
      case 'about': return { listPaneHtml: '', contentHtml: this._renderAboutPage() };
      default: return this._renderModelProviderPage();
    }
  }

  // ── PAGE 1: MODEL PROVIDER (MASTER-DETAIL) ──

  _renderModelProviderPage() {
    const allProviders = this.studio.provider.getAllProviders();
    const q = this.providerListSearch.trim().toLowerCase();
    const visibleProviders = allProviders.filter((p) => {
      if (this.providerListFilter === 'enabled' && !p.enabled) return false;
      if (this.providerListFilter === 'local' && !p.isLocal) return false;
      if (this.providerListFilter === 'cloud' && p.isLocal) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        String(p.effectiveBaseUrl || '').toLowerCase().includes(q)
      );
    });

    let active = allProviders.find((p) => p.id === this.selectedProviderId) || allProviders[0];
    if (active) this.selectedProviderId = active.id;

    // Group providers: Local Runtimes (Strata first) -> Global Cloud & Coding -> Gateways & Regional
    const groupedBlocks = PROVIDER_GROUPS.map((grp) => {
      const items = visibleProviders.filter((p) => (p.group || (p.isLocal ? 'local' : 'gateway')) === grp.id);
      if (!items.length) return '';
      return `
        <div class="st-list-group">
          <div class="st-list-group-label">${escapeHtml(grp.label)} <span class="st-list-group-count">${items.length}</span></div>
          ${items
            .map((p) =>
              ListItem({
                logoHtml: renderProviderMark(p, { size: 22 }),
                label: p.name,
                active: p.id === active?.id,
                statusDot: Boolean(p.enabled),
                dataAttrs: { 'data-st-provider': p.id },
              })
            )
            .join('')}
        </div>
      `;
    }).filter(Boolean);

    const listItemsHtml = groupedBlocks.length
      ? groupedBlocks.join('')
      : `<div class="st-nav-empty">No matching providers</div>`;

    const mobileSelectHtml = `
      <select class="st-select" id="stProviderMobileSelect" aria-label="Select model provider">
        ${PROVIDER_GROUPS.map((grp) => {
          const items = allProviders.filter((p) => (p.group || (p.isLocal ? 'local' : 'gateway')) === grp.id);
          if (!items.length) return '';
          return `<optgroup label="${escapeHtml(grp.label)}">${items
            .map(
              (p) =>
                `<option value="${escapeHtml(p.id)}" ${p.id === active?.id ? 'selected' : ''}>${escapeHtml(p.name)}${p.enabled ? ' (Enabled)' : ''}</option>`
            )
            .join('')}</optgroup>`;
        }).join('')}
      </select>
      <button type="button" class="st-btn st-btn-secondary" data-st-toggle-add-provider aria-label="Add provider">
        <i data-lucide="plus"></i>
        <span>Add</span>
      </button>
    `;

    const filterLabelMap = { all: 'All providers', enabled: 'Enabled only', local: 'Local runtimes', cloud: 'Cloud & gateways' };
    const filterTitle = `Filter: ${filterLabelMap[this.providerListFilter] || 'All providers'} (click to cycle)`;

    const listPaneHtml = ListPane({
      id: 'stProviderListPane',
      searchId: 'stProviderSearch',
      searchPlaceholder: 'Search providers…',
      searchValue: this.providerListSearch,
      filterBtnHtml: `
        <button
          type="button"
          class="st-icon-btn ${this.providerListFilter !== 'all' ? 'active' : ''}"
          id="btnStProviderFilter"
          title="${escapeHtml(filterTitle)}"
          aria-label="${escapeHtml(filterTitle)}"
          aria-pressed="${this.providerListFilter !== 'all' ? 'true' : 'false'}"
        >
          <i data-lucide="list-filter"></i>
        </button>
      `,
      itemsHtml: listItemsHtml,
      footerHtml: `
        <button type="button" class="st-btn st-btn-secondary st-btn-full" data-st-toggle-add-provider>
          <i data-lucide="plus"></i>
          <span>Add provider</span>
        </button>
      `,
      mobileDropdownHtml: mobileSelectHtml,
    });

    const addProviderPanel = this.showAddProviderForm
      ? `
        <div class="st-inline-panel st-panel-reveal" id="stAddProviderPanel">
          <div class="st-inline-panel-head">
            <span class="st-inline-panel-title">Add custom provider</span>
            <button type="button" class="st-icon-btn" data-st-close-add-provider aria-label="Close add provider form" title="Close">
              <i data-lucide="x"></i>
            </button>
          </div>
          <div class="st-inline-form-grid">
            <div class="st-field">
              <label for="stNewProviderName">Provider name</label>
              <input type="text" id="stNewProviderName" class="st-input" placeholder="e.g. Strata LAN, vLLM, Groq">
            </div>
            <div class="st-field">
              <label for="stNewProviderProtocol">API protocol</label>
              <select id="stNewProviderProtocol" class="st-select">
                <option value="openai-chat">OpenAI Chat (/v1/chat/completions)</option>
                <option value="anthropic-messages">Anthropic Messages (/v1/messages)</option>
                <option value="openai-responses">OpenAI Responses (/v1/responses)</option>
              </select>
            </div>
            <div class="st-field st-field-full">
              <label for="stNewProviderUrl">API host</label>
              <input type="url" id="stNewProviderUrl" class="st-input" placeholder="http://127.0.0.1:8080/v1 or https://api.example.com/v1">
            </div>
            <div class="st-field st-field-full">
              <label for="stNewProviderKey">API key (optional for local)</label>
              <input type="password" id="stNewProviderKey" class="st-input" placeholder="sk-...">
            </div>
          </div>
          <div class="st-inline-panel-actions">
            <button type="button" class="st-btn st-btn-ghost" data-st-close-add-provider>Cancel</button>
            <button type="button" class="st-btn st-btn-primary" id="btnStCreateProvider">Add provider</button>
          </div>
        </div>
      `
      : '';

    const activeProtocol = active?.protocol || 'openai-chat';
    const resolvedChatUrl = active
      ? resolveProviderEndpoint(active.effectiveBaseUrl || active.defaultBaseUrl, activeProtocol, 'chat', active.chatEndpoint)
      : '';
    const resolvedModelsUrl = active
      ? resolveProviderEndpoint(active.effectiveBaseUrl || active.defaultBaseUrl, activeProtocol, 'models', active.modelsEndpoint)
      : '';

    const gearPanel = this.showProviderGearPanel && active
      ? `
        <div class="st-inline-panel st-panel-reveal" id="stProviderGearPanel">
          <div class="st-inline-panel-head">
            <span class="st-inline-panel-title">${escapeHtml(active.name)} settings</span>
            <button type="button" class="st-icon-btn" data-st-toggle-provider-gear aria-label="Close provider settings" title="Close">
              <i data-lucide="x"></i>
            </button>
          </div>
          <div class="st-inline-form-grid">
            ${
              active.custom
                ? `<div class="st-field st-field-full">
                    <label for="stEditProviderName">Display name</label>
                    <input type="text" id="stEditProviderName" class="st-input" value="${escapeHtml(active.name)}">
                  </div>`
                : ''
            }
            <div class="st-field st-field-full">
              <label for="stProviderProxyMode">Browser CORS relay</label>
              <select id="stProviderProxyMode" class="st-select">
                <option value="auto" ${(active.useProxy || 'auto') === 'auto' ? 'selected' : ''}>Auto fallback via local server (Recommended)</option>
                <option value="always" ${active.useProxy === 'always' ? 'selected' : ''}>Always relay via local server (/api/provider-proxy)</option>
                <option value="direct" ${active.useProxy === 'direct' ? 'selected' : ''}>Direct browser fetch only</option>
              </select>
            </div>
            <div class="st-field st-field-full">
              <label>Resolved endpoints</label>
              <div class="st-skill-source">GET ${escapeHtml(resolvedModelsUrl || '—')} · POST ${escapeHtml(resolvedChatUrl || '—')}</div>
            </div>
          </div>
          ${
            active.custom
              ? `<div class="st-inline-panel-actions">
                  <button type="button" class="st-btn st-btn-danger-ghost" id="btnStDeleteProvider">Delete provider</button>
                </div>`
              : ''
          }
        </div>
      `
      : '';

    // Check status ONLY shown after a check has been run
    let checkStatusHtml = '';
    if (active?.lastCheck) {
      if (active.lastCheck.ok) {
        const msPart = active.lastCheck.latencyMs ? ` · ${active.lastCheck.latencyMs} ms` : '';
        checkStatusHtml = `<span class="st-check-status ok">Connected${escapeHtml(msPart)}</span>`;
      } else {
        checkStatusHtml = `<span class="st-check-status err">Failed: ${escapeHtml(active.lastCheck.error || 'Unable to reach host')}</span>`;
      }
    }

    const isChecking = this.checkingProviderId === active?.id;
    const isSyncing = this.syncingProviderId === active?.id;

    const apiKeyDesc = active?.apiKeyUrl
      ? `Stored locally in your browser.`
      : active?.isLocal
        ? 'Optional for local servers unless authentication is enabled.'
        : 'Bearer token sent with requests to this host.';

    const supportedProtos = active?.supportedProtocols || [activeProtocol];
    const protocolRowHtml = active && supportedProtos.length > 1
      ? SettingsRow({
          icon: 'git-branch',
          label: 'API protocol',
          description: PROVIDER_PROTOCOLS[activeProtocol]?.description || 'Select wire protocol for this endpoint.',
          controlHtml: `
            <div class="st-segmented" role="group" aria-label="API protocol">
              ${supportedProtos
                .map((pid) => {
                  const pmeta = PROVIDER_PROTOCOLS[pid];
                  if (!pmeta) return '';
                  const isAct = pid === activeProtocol;
                  return `<button type="button" class="st-seg-btn ${isAct ? 'active' : ''}" data-st-protocol="${escapeHtml(pid)}" aria-pressed="${isAct ? 'true' : 'false'}">${escapeHtml(pmeta.label)}</button>`;
                })
                .join('')}
            </div>
          `,
        })
      : '';

    const endpointPresetsHtml = active?.endpointPresets?.length
      ? `<div class="st-endpoint-presets">
          ${active.endpointPresets
            .map(
              (ep) => `<button type="button" class="st-preset-link" data-st-endpoint-preset="${escapeHtml(ep.url)}">${escapeHtml(ep.label)}</button>`
            )
            .join('<span class="st-preset-sep" aria-hidden="true">·</span>')}
        </div>`
      : '';

    const connectionRows = active
      ? [
          protocolRowHtml,
          SettingsRow({
            icon: 'key-round',
            label: 'API key',
            description: apiKeyDesc,
            labelFor: 'stProviderApiKey',
            controlHtml: `
              <div class="st-inline-stack">
                <div class="st-inline-controls">
                  ${SecretInput({
                    id: 'stProviderApiKey',
                    value: active.apiKey || '',
                    placeholder: active.placeholder || 'sk-...',
                    ariaLabel: `${active.name} API key`,
                  })}
                  <button type="button" class="st-btn st-btn-secondary" id="btnStCheckProvider" ${isChecking ? 'disabled' : ''}>
                    ${isChecking ? 'Checking…' : 'Check'}
                  </button>
                </div>
                ${
                  active.apiKeyUrl || active.docsUrl || checkStatusHtml
                    ? `<div class="st-control-subrow">
                        ${
                          active.apiKeyUrl
                            ? `<a class="st-text-link" href="${escapeHtml(active.apiKeyUrl)}" target="_blank" rel="noopener noreferrer">Get API key</a>`
                            : active.docsUrl
                              ? `<a class="st-text-link" href="${escapeHtml(active.docsUrl)}" target="_blank" rel="noopener noreferrer">Provider docs</a>`
                              : '<span></span>'
                        }
                        ${checkStatusHtml}
                      </div>`
                    : ''
                }
              </div>
            `,
          }),
          SettingsRow({
            icon: 'globe',
            label: 'API host',
            description: resolvedChatUrl ? `POST ${resolvedChatUrl}` : (active.defaultBaseUrl ? `Default: ${active.defaultBaseUrl}` : 'OpenAI-compatible base URL'),
            labelFor: 'stProviderBaseUrl',
            controlHtml: `
              <div class="st-inline-stack">
                <input
                  type="url"
                  id="stProviderBaseUrl"
                  class="st-input st-control-wide"
                  value="${escapeHtml(active.baseUrl || '')}"
                  placeholder="${escapeHtml(active.defaultBaseUrl || 'https://api.example.com/v1')}"
                  aria-label="${escapeHtml(active.name)} API host"
                >
                ${endpointPresetsHtml}
              </div>
            `,
            extraIconBtnHtml: `
              <button
                type="button"
                class="st-icon-btn"
                id="btnStResetHost"
                title="Reset API host to default"
                aria-label="Reset API host to default"
              >
                <i data-lucide="rotate-ccw"></i>
              </button>
            `,
          }),
        ].filter(Boolean).join('')
      : '';

    const connectionCard = SettingsCard({
      title: active ? active.name : 'Provider',
      description: active?.hint || '',
      headerRightHtml: active
        ? `
          <div class="st-provider-head-left">
            <button
              type="button"
              class="st-icon-btn ${this.showProviderGearPanel ? 'active' : ''}"
              data-st-toggle-provider-gear
              title="Provider settings & proxy"
              aria-label="Provider settings"
            >
              <i data-lucide="settings"></i>
            </button>
            ${Switch({
              id: 'stProviderEnableSwitch',
              checked: Boolean(active.enabled),
              ariaLabel: `Enable ${active.name}`,
            })}
          </div>
        `
        : '',
      rowsHtml: connectionRows,
      bodyHtml: gearPanel,
    });

    // Models Card
    const models = active?.models || [];
    const grouped = groupModelsByFamily(models, { query: this.modelSearch, filter: this.modelFilter });
    const filterCycleLabel = { all: 'All', free: 'Free', vision: 'Vision', reasoning: 'Reasoning' }[this.modelFilter] || 'All';

    const addModelPanel = this.showAddModelForm
      ? `
        <div class="st-inline-panel st-panel-reveal" id="stAddModelPanel">
          <div class="st-inline-panel-head">
            <span class="st-inline-panel-title">Add model manually</span>
            <button type="button" class="st-icon-btn" data-st-close-add-model aria-label="Close add model form" title="Close">
              <i data-lucide="x"></i>
            </button>
          </div>
          <div class="st-inline-form-grid">
            <div class="st-field">
              <label for="stManualModelId">Model ID</label>
              <input type="text" id="stManualModelId" class="st-input" placeholder="e.g. qwen3-coder-30b or claude-sonnet-4-5">
            </div>
            <div class="st-field">
              <label for="stManualModelName">Display name</label>
              <input type="text" id="stManualModelName" class="st-input" placeholder="Qwen3 Coder 30B">
            </div>
            <div class="st-field">
              <label for="stManualModelCtx">Context window</label>
              <input type="number" id="stManualModelCtx" class="st-input st-number-input" value="32768" min="2048" step="1024">
            </div>
          </div>
          <div class="st-inline-panel-actions">
            <button type="button" class="st-btn st-btn-ghost" data-st-close-add-model>Cancel</button>
            <button type="button" class="st-btn st-btn-primary" id="btnStSaveManualModel">Add model</button>
          </div>
        </div>
      `
      : '';

    let modelsBodyHtml = '';
    if (!models.length) {
      modelsBodyHtml = EmptyState({
        kubaiIcon: 'empty-models',
        title: 'No models yet',
        description: `Sync models from ${active?.name || 'this provider'} or add a model ID manually.`,
        actionHtml: `
          <button type="button" class="st-btn st-btn-primary" data-st-sync-models ${isSyncing ? 'disabled' : ''}>
            <i data-lucide="refresh-cw"></i>
            <span>${isSyncing ? 'Syncing…' : 'Sync models'}</span>
          </button>
        `,
      });
    } else if (!grouped.length) {
      modelsBodyHtml = EmptyState({
        kubaiIcon: 'empty-search',
        title: 'No matching models',
        description: 'Try clearing the search query or capability filter.',
      });
    } else {
      modelsBodyHtml = grouped
        .map((fam) => {
          const collapsed = this.collapsedFamilies.has(fam.key);
          const rows = fam.models
            .map((m) => {
              const caps = m.capabilities || {};
              const isEditing = this.editingModelId === m.id;
              return `
                <div class="st-model-row" data-st-model-id="${escapeHtml(m.id)}">
                  <div class="st-model-row-left">
                    <span class="st-list-logo" aria-hidden="true">${escapeHtml(fam.label.slice(0, 2).toUpperCase())}</span>
                    <div class="st-list-item-copy">
                      <span class="st-model-row-name truncate">${escapeHtml(m.name)}</span>
                      <span class="st-model-row-id truncate">${escapeHtml(m.id)}</span>
                    </div>
                  </div>
                  <div class="st-model-row-meta">
                    <span class="st-cap-icons">
                      ${caps.vision ? `<span class="st-cap-icon" title="Vision (image inputs)" aria-label="Vision"><i data-lucide="eye"></i></span>` : ''}
                      ${caps.reasoning ? `<span class="st-cap-icon" title="Reasoning / thinking" aria-label="Reasoning"><i data-lucide="brain"></i></span>` : ''}
                      ${caps.tools ? `<span class="st-cap-icon" title="Tool calling" aria-label="Tools"><i data-lucide="wrench"></i></span>` : ''}
                    </span>
                    <button type="button" class="st-icon-btn ${isEditing ? 'active' : ''}" data-st-edit-model="${escapeHtml(m.id)}" title="Model settings" aria-label="Edit ${escapeHtml(m.name)} settings">
                      <i data-lucide="settings"></i>
                    </button>
                    <button type="button" class="st-icon-btn st-icon-btn-danger" data-st-remove-model="${escapeHtml(m.id)}" title="Remove model" aria-label="Remove ${escapeHtml(m.name)}">
                      <i data-lucide="trash-2"></i>
                    </button>
                  </div>
                </div>
                ${
                  isEditing
                    ? `<div class="st-inline-panel">
                        <div class="st-inline-form-grid">
                          <div class="st-field">
                            <label for="stEditModelName">Display name</label>
                            <input type="text" id="stEditModelName" class="st-input" value="${escapeHtml(m.name)}">
                          </div>
                          <div class="st-field">
                            <label for="stEditModelCtx">Context window</label>
                            <input type="number" id="stEditModelCtx" class="st-input st-number-input" value="${escapeHtml(m.contextLength || 32768)}" min="2048" step="1024">
                          </div>
                        </div>
                      </div>`
                    : ''
                }
              `;
            })
            .join('');

          return `
            <div class="st-model-family" data-st-family="${escapeHtml(fam.key)}" data-collapsed="${collapsed ? 'true' : 'false'}">
              <button type="button" class="st-family-toggle" data-st-toggle-family="${escapeHtml(fam.key)}" aria-expanded="${collapsed ? 'false' : 'true'}">
                <i data-lucide="chevron-down"></i>
                <span>${escapeHtml(fam.label)}</span>
                <span class="st-family-count">${fam.models.length}</span>
              </button>
              <div class="st-family-rows">${rows}</div>
            </div>
          `;
        })
        .join('');
    }

    const modelsCard = SettingsCard({
      title: 'Models',
      description: models.length ? `${models.length} synced` : '',
      headerRightHtml: `
        <div class="st-models-toolbar">
          <button type="button" class="st-icon-btn ${this.modelSearchOpen ? 'active' : ''}" id="btnStModelSearchToggle" title="Search models" aria-label="Search models">
            <i data-lucide="search"></i>
          </button>
          <button type="button" class="st-icon-btn ${this.modelFilter !== 'all' ? 'active' : ''}" id="btnStModelFilterCycle" title="Filter models (${filterCycleLabel})" aria-label="Filter models: ${filterCycleLabel}">
            <i data-lucide="list-filter"></i>
          </button>
          ${
            models.length
              ? `<button type="button" class="st-btn st-btn-secondary" data-st-sync-models ${isSyncing ? 'disabled' : ''}>
                  <i data-lucide="refresh-cw"></i>
                  <span>${isSyncing ? 'Syncing…' : 'Sync models'}</span>
                </button>`
              : ''
          }
          <button type="button" class="st-icon-btn ${this.showAddModelForm ? 'active' : ''}" id="btnStToggleAddModel" title="Add model manually" aria-label="Add model manually">
            <i data-lucide="plus"></i>
          </button>
        </div>
      `,
      bodyHtml: `
        <div class="st-models-search-bar" ${this.modelSearchOpen || this.modelFilter !== 'all' ? '' : 'hidden'}>
          <div class="st-search-wrap st-list-search-wrap">
            <i data-lucide="search" aria-hidden="true"></i>
            <input type="search" id="stModelSearchInput" class="st-input st-search-input" placeholder="Filter models by name or ID…" value="${escapeHtml(this.modelSearch)}" autocomplete="off" aria-label="Filter models">
          </div>
          <select id="stModelFilterSelect" class="st-select" aria-label="Filter by capability">
            <option value="all" ${this.modelFilter === 'all' ? 'selected' : ''}>All</option>
            <option value="free" ${this.modelFilter === 'free' ? 'selected' : ''}>Free</option>
            <option value="vision" ${this.modelFilter === 'vision' ? 'selected' : ''}>Vision</option>
            <option value="reasoning" ${this.modelFilter === 'reasoning' ? 'selected' : ''}>Reasoning</option>
          </select>
        </div>
        ${addModelPanel}
        ${modelsBodyHtml}
      `,
    });

    const contentHtml = SettingsPage({
      title: 'Model provider',
      subtitle: 'Connect cloud or local OpenAI-compatible providers and manage synced models.',
      bodyHtml: `${addProviderPanel}${connectionCard}${modelsCard}`,
    });

    return { listPaneHtml, contentHtml };
  }

  // ── PAGE 2: DEFAULT MODELS ──

  _renderDefaultModelsPage() {
    const models = this.studio.provider.getAllAvailableModels();
    const roles = this.studio.provider.roleModels || {};
    const buildVal = roles.build || this.studio.provider.model || '';
    const visionModels = models.filter((m) => m.capabilities?.vision);

    const modelsCard = SettingsCard({
      title: 'Models',
      rowsHtml: [
        SettingsRow({
          icon: 'code-2',
          label: 'Build model',
          description: 'Primary model used for code generation and edits.',
          labelFor: 'stRoleBuild',
          controlHtml: ModelSelect({
            id: 'stRoleBuild',
            value: buildVal,
            models,
            placeholder: models.length ? 'Select build model…' : 'Sync a provider first',
            ariaLabel: 'Build model',
            dataAttrs: { 'data-st-role-model': 'build' },
          }),
        }),
        SettingsRow({
          icon: 'zap',
          label: 'Quick model',
          description: 'Fast model for project naming, summaries, and prompt enhancements.',
          labelFor: 'stRoleQuick',
          controlHtml: ModelSelect({
            id: 'stRoleQuick',
            value: roles.quick || '',
            models,
            placeholder: 'Follow Build model',
            ariaLabel: 'Quick model',
            dataAttrs: { 'data-st-role-model': 'quick' },
          }),
        }),
        SettingsRow({
          icon: 'clipboard-list',
          label: 'Planning model',
          description: 'Model used to architect editable plans in Plan mode.',
          labelFor: 'stRolePlanning',
          controlHtml: ModelSelect({
            id: 'stRolePlanning',
            value: roles.planning || '',
            models,
            placeholder: 'Follow Build model',
            ariaLabel: 'Planning model',
            dataAttrs: { 'data-st-role-model': 'planning' },
          }),
        }),
        SettingsRow({
          icon: 'eye',
          label: 'Vision model',
          description: 'Multimodal model for analyzing attached screenshots and mockups.',
          labelFor: 'stRoleVision',
          controlHtml: ModelSelect({
            id: 'stRoleVision',
            value: roles.vision || '',
            models: visionModels.length ? visionModels : models,
            placeholder: 'Follow Build model',
            ariaLabel: 'Vision model',
            dataAttrs: { 'data-st-role-model': 'vision' },
          }),
        }),
      ].join(''),
    });

    const p = this.studio.provider;
    const generationCard = SettingsCard({
      title: 'Generation',
      rowsHtml: [
        SettingsRow({
          icon: 'thermometer',
          label: 'Temperature',
          tooltip: 'Lower values produce more deterministic code; higher values increase variation.',
          description: 'Sampling randomness between 0.0 and 2.0.',
          labelFor: 'stGenTemp',
          controlHtml: `<input type="number" id="stGenTemp" class="st-input st-number-input" min="0" max="2" step="0.1" value="${escapeHtml(p.temperature ?? 0.7)}">`,
        }),
        SettingsRow({
          icon: 'sliders-horizontal',
          label: 'Top-P',
          description: 'Nucleus sampling probability cutoff between 0.0 and 1.0.',
          labelFor: 'stGenTopP',
          controlHtml: `<input type="number" id="stGenTopP" class="st-input st-number-input" min="0" max="1" step="0.05" value="${escapeHtml(p.topP ?? 0.95)}">`,
        }),
        SettingsRow({
          icon: 'arrow-up-right',
          label: 'Max output tokens',
          description: 'Upper token budget per generated response.',
          labelFor: 'stGenMaxTokens',
          controlHtml: `<input type="number" id="stGenMaxTokens" class="st-input st-number-input" min="1024" max="128000" step="1024" value="${escapeHtml(p.maxTokens || 16384)}">`,
        }),
        SettingsRow({
          icon: 'maximize-2',
          label: 'Context window',
          description: 'Total context limit used by the token usage ring.',
          labelFor: 'stGenContextWindow',
          controlHtml: `<input type="number" id="stGenContextWindow" class="st-input st-number-input" min="2048" max="1048576" step="1024" value="${escapeHtml(p.contextWindow || 32768)}">`,
        }),
      ].join(''),
    });

    return SettingsPage({
      title: 'Default models',
      subtitle: 'Assign models by task and tune generation parameters.',
      bodyHtml: `${modelsCard}${generationCard}`,
    });
  }

  // ── PAGE 3: LOCAL MODELS (STRATA, LM STUDIO, OLLAMA, UNSLOTH STUDIO & MORE) ──

  _renderLocalModelsPage() {
    const all = this.studio.provider.getAllProviders();
    const localProviders = all.filter((p) => p.isLocal);

    const rowsHtml = localProviders
      .map((p) => {
        const protoLabel = PROVIDER_PROTOCOLS[p.protocol || 'openai-chat']?.shortLabel || 'OpenAI';
        return SettingsRow({
          icon: 'hard-drive',
          label: p.name,
          description: `${p.effectiveBaseUrl} · ${protoLabel} · ${p.models?.length || 0} synced model${(p.models?.length || 0) === 1 ? '' : 's'}`,
          controlHtml: `<button type="button" class="st-btn st-btn-secondary" data-st-open-provider="${escapeHtml(p.id)}">Configure</button>`,
        });
      })
      .join('');

    const runtimesCard = SettingsCard({
      title: 'Local runtimes',
      rowsHtml,
    });

    const corsCard = SettingsCard({
      title: 'Local endpoints & browser relay',
      rowsHtml: [
        SettingsRow({
          icon: 'layers',
          label: 'Strata MoE engine',
          description: 'Exposes OpenAI (/v1), Anthropic (/v1/messages), and Responses (/v1/responses) on port 8080.',
          controlHtml: `<span class="st-kbd">127.0.0.1:8080/v1</span>`,
        }),
        SettingsRow({
          icon: 'server',
          label: 'LM Studio server',
          description: 'Start the Local Server tab on port 1234.',
          controlHtml: `<span class="st-kbd">localhost:1234/v1</span>`,
        }),
        SettingsRow({
          icon: 'terminal',
          label: 'Ollama daemon',
          description: 'Auto-relays through WebForge local server if OLLAMA_ORIGINS is unset.',
          controlHtml: `<span class="st-kbd">localhost:11434</span>`,
        }),
        SettingsRow({
          icon: 'shield-check',
          label: 'Built-in CORS relay',
          description: 'When launched via start.bat, WebForge relays CORS-blocked local or cloud requests automatically.',
          controlHtml: `<span class="st-kbd">/api/provider-proxy</span>`,
        }),
      ].join(''),
    });

    return SettingsPage({
      title: 'Local models',
      subtitle: 'Run WebForge locally with Strata, LM Studio, Ollama, Unsloth Studio, LiteLLM, or MLX.',
      bodyHtml: `${runtimesCard}${corsCard}`,
    });
  }

  // ── PAGE 4: AGENT ──

  _renderAgentPage() {
    const prefs = this.studio.agentPrefs || {};
    const searchResultHtml = this.webSearchResult
      ? `<div class="st-search-result-box" id="stWebSearchResult">
          <div class="st-row-title-line">
            <span class="st-row-label">${escapeHtml(this.webSearchResult.summary)}</span>
          </div>
          ${(this.webSearchResult.items || [])
            .map(
              (r) =>
                `<div><a class="st-text-link" href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.title)}</a></div>`
            )
            .join('')}
        </div>`
      : '';

    const card = SettingsCard({
      title: 'Capabilities',
      rowsHtml: [
        SettingsRow({
          icon: 'git-fork',
          label: 'Parallel sub-agents',
          description: 'Run design, section, and app agents in parallel with automatic sequential fallback.',
          controlHtml: Switch({
            id: 'stToggleSubAgents',
            checked: Boolean(prefs.subAgents),
            ariaLabel: 'Parallel sub-agents',
          }),
        }),
        SettingsRow({
          icon: 'globe',
          label: 'Web search without API key',
          description: 'Ground builds with live DuckDuckGo and Wikipedia results without configuring keys.',
          controlHtml: `
            <div class="st-inline-controls">
              <button type="button" class="st-btn st-btn-ghost" id="btnStTestWebSearch" ${this.webSearchTesting ? 'disabled' : ''}>
                ${this.webSearchTesting ? 'Testing…' : 'Test search'}
              </button>
              ${Switch({
                id: 'stToggleWebSearch',
                checked: Boolean(prefs.webSearch),
                ariaLabel: 'Web search without API key',
              })}
            </div>
          `,
        }),
      ].join(''),
      bodyHtml: searchResultHtml,
    });

    return SettingsPage({
      title: 'Agent',
      subtitle: 'Control multi-agent orchestration and live web grounding.',
      bodyHtml: card,
    });
  }

  // ── PAGE 5: SKILLS (MASTER-DETAIL + ACTIVE/AVAILABLE GROUPS) ──

  _renderSkillsPage() {
    const allSkills = this.studio.skillManager.skills || [];
    const activeCount = allSkills.filter((s) => s.enabled).length;
    const q = this.skillListSearch.trim().toLowerCase();
    const filtered = allSkills.filter((s) => {
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        String(s.description || '').toLowerCase().includes(q) ||
        String(s.source || '').toLowerCase().includes(q)
      );
    });

    const activeSkills = filtered.filter((s) => s.enabled);
    const availableSkills = filtered.filter((s) => !s.enabled);

    let selected = allSkills.find((s) => s.id === this.selectedSkillId) || activeSkills[0] || availableSkills[0] || allSkills[0];
    if (selected) this.selectedSkillId = selected.id;

    const renderGroupList = (label, list) =>
      list.length
        ? `<div class="st-list-group-label">${escapeHtml(label)}</div>` +
          list
            .map((s) =>
              ListItem({
                logoHtml: escapeHtml((s.icon || s.name.slice(0, 2)).slice(0, 3).toUpperCase()),
                label: s.name,
                active: s.id === selected?.id,
                statusDot: Boolean(s.enabled),
                dataAttrs: { 'data-st-skill-select': s.id },
              })
            )
            .join('')
        : '';

    const listItemsHtml =
      renderGroupList('Active', activeSkills) + renderGroupList('Available', availableSkills) ||
      `<div class="st-nav-empty">No matching skills</div>`;

    const mobileDropdownHtml = `
      <select class="st-select" id="stSkillMobileSelect" aria-label="Select skill">
        ${allSkills
          .map(
            (s) =>
              `<option value="${escapeHtml(s.id)}" ${s.id === selected?.id ? 'selected' : ''}>${escapeHtml(s.name)}${s.enabled ? ' (Active)' : ''}</option>`
          )
          .join('')}
      </select>
    `;

    const listPaneHtml = ListPane({
      id: 'stSkillsListPane',
      searchId: 'stSkillsSearch',
      searchPlaceholder: 'Search skills…',
      searchValue: this.skillListSearch,
      itemsHtml: listItemsHtml,
      mobileDropdownHtml,
    });

    // Header "Add skill" menu (From GitHub / Custom)
    const addSkillMenuHtml = `
      <div class="st-menu-wrap" id="stAddSkillMenuWrap">
        <button type="button" class="st-btn st-btn-primary" id="btnStAddSkillMenu" aria-haspopup="true" aria-expanded="${this.skillAddMenuOpen ? 'true' : 'false'}">
          <i data-lucide="plus"></i>
          <span>Add skill</span>
          <i data-lucide="chevron-down"></i>
        </button>
        <div class="st-dropdown-menu" id="stAddSkillDropdown" role="menu" ${this.skillAddMenuOpen ? '' : 'hidden'}>
          <button type="button" class="st-dropdown-item" data-st-add-skill-mode="github" role="menuitem">
            <i data-lucide="github"></i>
            <span>From GitHub</span>
          </button>
          <button type="button" class="st-dropdown-item" data-st-add-skill-mode="custom" role="menuitem">
            <i data-lucide="file-plus"></i>
            <span>Custom</span>
          </button>
        </div>
      </div>
    `;

    // Conditional GitHub or Custom panel (GitHub URL only shown after choosing "From GitHub")
    let addPanelHtml = '';
    if (this.skillAddMode === 'github') {
      const discoverHtml = this.skillGithubDiscover?.skills?.length
        ? `<div class="st-card-rows">
            ${this.skillGithubDiscover.skills
              .map(
                (sk, idx) =>
                  SettingsRow({
                    label: sk.name,
                    description: `${sk.description || ''} (${sk.path})`,
                    controlHtml: `<button type="button" class="st-btn st-btn-secondary" data-st-gh-import-idx="${idx}">Add</button>`,
                  })
              )
              .join('')}
          </div>`
        : '';

      addPanelHtml = `
        <div class="st-inline-panel" id="stGithubSkillPanel">
          <div class="st-inline-panel-head">
            <span class="st-inline-panel-title">Import from GitHub</span>
            <button type="button" class="st-icon-btn" data-st-close-skill-add aria-label="Close GitHub import" title="Close">
              <i data-lucide="x"></i>
            </button>
          </div>
          <div class="st-inline-controls">
            <input
              type="text"
              id="stGithubSkillUrl"
              class="st-input st-list-search-wrap"
              placeholder="GitHub URL or owner/repo (e.g. dietrichgebert/ponytail)"
              value="${escapeHtml(this.skillGithubUrl)}"
              autocomplete="off"
              aria-label="GitHub repository URL"
            >
            <button type="button" class="st-btn st-btn-primary" id="btnStScanGithubSkill" ${this.skillGithubScanning ? 'disabled' : ''}>
              ${this.skillGithubScanning ? 'Scanning…' : 'Scan'}
            </button>
          </div>
          ${discoverHtml}
        </div>
      `;
    } else if (this.skillAddMode === 'custom') {
      addPanelHtml = `
        <div class="st-inline-panel" id="stCustomSkillPanel">
          <div class="st-inline-panel-head">
            <span class="st-inline-panel-title">New custom skill</span>
            <button type="button" class="st-icon-btn" data-st-close-skill-add aria-label="Close custom skill form" title="Close">
              <i data-lucide="x"></i>
            </button>
          </div>
          <div class="st-inline-form-grid">
            <div class="st-field">
              <label for="stCustomSkillName">Name</label>
              <input type="text" id="stCustomSkillName" class="st-input" placeholder="e.g. Strict TypeScript">
            </div>
            <div class="st-field">
              <label for="stCustomSkillDesc">Description</label>
              <input type="text" id="stCustomSkillDesc" class="st-input" placeholder="Short summary">
            </div>
            <div class="st-field st-field-full">
              <label for="stCustomSkillPrompt">Instructions</label>
              <textarea id="stCustomSkillPrompt" class="st-textarea" rows="4" placeholder="Prompt instructions appended when enabled…"></textarea>
            </div>
          </div>
          <div class="st-inline-panel-actions">
            <button type="button" class="st-btn st-btn-ghost" data-st-close-skill-add>Cancel</button>
            <button type="button" class="st-btn st-btn-primary" id="btnStCreateCustomSkill">Add skill</button>
          </div>
        </div>
      `;
    }

    const formatSource = (s) => {
      if (!s.source) return '';
      return String(s.source).replace(/^https?:\/\/(?:www\.)?github\.com\//i, '').replace(/\/blob\/.*$/, '');
    };

    const renderSkillRow = (s) => {
      const sourceText = formatSource(s);
      // Show a badge ONLY if a skill's type differs from the default built-in prompt skill
      const typeBadge = !s.builtin
        ? `<span class="st-skill-badge">${s.source ? 'GitHub' : 'Custom'}</span>`
        : '';
      return `
        <div class="st-row st-skill-row" data-st-skill-row="${escapeHtml(s.id)}">
          <div class="st-row-left">
            <div class="st-row-title-line">
              <span class="st-row-label">${escapeHtml(s.name)}</span>
              ${typeBadge}
              ${sourceText ? `<span class="st-skill-source truncate">${escapeHtml(sourceText)}</span>` : ''}
            </div>
            <p class="st-row-desc">${escapeHtml(s.description || '')}</p>
          </div>
          <div class="st-row-right">
            ${Switch({
              checked: Boolean(s.enabled),
              ariaLabel: `Toggle ${s.name}`,
              dataAttrs: { 'data-st-skill-toggle': s.id },
            })}
          </div>
        </div>
      `;
    };

    // Selected skill detail / inline editor card
    const selectedCard = selected
      ? SettingsCard({
          title: selected.name,
          description: formatSource(selected) || (selected.builtin ? 'Built-in skill' : 'Custom skill'),
          headerRightHtml: `
            <div class="st-inline-controls">
              ${
                !selected.builtin
                  ? `<button type="button" class="st-btn st-btn-danger-ghost" data-st-delete-skill="${escapeHtml(selected.id)}">Delete</button>`
                  : ''
              }
              ${Switch({
                checked: Boolean(selected.enabled),
                ariaLabel: `Toggle ${selected.name}`,
                dataAttrs: { 'data-st-skill-toggle': selected.id },
              })}
            </div>
          `,
          bodyHtml: `
            <div class="st-field">
              <label for="stSkillPromptEditor">Skill instructions (autosaves)</label>
              <textarea id="stSkillPromptEditor" class="st-textarea" rows="8" data-st-skill-editor="${escapeHtml(selected.id)}">${escapeHtml(selected.prompt || '')}</textarea>
              <div class="st-editor-meta">
                <span>${(selected.prompt || '').length.toLocaleString()} characters</span>
                <span>~${estimateTokens(selected.prompt || '').toLocaleString()} tok</span>
              </div>
            </div>
          `,
        })
      : '';

    const activeCard = activeSkills.length
      ? SettingsCard({
          title: 'Active',
          rowsHtml: activeSkills.slice(0, 8).map(renderSkillRow).join(''),
        })
      : '';

    const activeOverflowCard = activeSkills.length > 8
      ? SettingsCard({
          title: 'More active',
          rowsHtml: activeSkills.slice(8).map(renderSkillRow).join(''),
        })
      : '';

    const availableCard = availableSkills.length
      ? SettingsCard({
          title: 'Available',
          rowsHtml: availableSkills.slice(0, 8).map(renderSkillRow).join(''),
        })
      : '';

    const availableOverflowCard = availableSkills.length > 8
      ? SettingsCard({
          title: 'More available',
          rowsHtml: availableSkills.slice(8).map(renderSkillRow).join(''),
        })
      : '';

    const contentHtml = SettingsPage({
      title: 'Skills',
      subtitle: `${activeCount} active`,
      headerActionHtml: addSkillMenuHtml,
      bodyHtml: `${addPanelHtml}${selectedCard}${activeCard}${activeOverflowCard}${availableCard}${availableOverflowCard}`,
    });

    return { listPaneHtml, contentHtml };
  }

  // ── PAGE 6: SYSTEM INSTRUCTIONS ──

  _renderSystemInstructionsPage() {
    const baseText = this.studio.skillManager.baseInstructions || '';
    const activeProj = this.studio._getActiveProject();
    const projText = activeProj?.customInstructions || '';

    const baseCard = SettingsCard({
      title: 'Global base instructions',
      description: 'Sent on every build turn alongside active skills. Changes autosave.',
      headerRightHtml: `
        <button type="button" class="st-btn st-btn-ghost" id="btnStResetSystemBase">Reset to default</button>
      `,
      bodyHtml: `
        <textarea
          id="stSystemBaseTextarea"
          class="st-textarea"
          rows="14"
          aria-label="Global base system instructions"
        >${escapeHtml(baseText)}</textarea>
        <div class="st-editor-meta">
          <span id="stSystemBaseChars">${baseText.length.toLocaleString()} characters</span>
          <span id="stSystemBaseTok">~${estimateTokens(baseText).toLocaleString()} tok</span>
        </div>
      `,
    });

    const projectCard = activeProj
      ? SettingsCard({
          title: `Project instructions · ${activeProj.name}`,
          description: 'Applies only to the currently open project.',
          bodyHtml: `
            <textarea
              id="stProjectInstructionsTextarea"
              class="st-textarea"
              rows="5"
              placeholder="e.g. Use Playfair Display headings, dark slate surfaces, and Tailwind grids…"
              aria-label="Project custom instructions"
            >${escapeHtml(projText)}</textarea>
            <div class="st-editor-meta">
              <span id="stProjectChars">${projText.length.toLocaleString()} characters</span>
              <span id="stProjectTok">~${estimateTokens(projText).toLocaleString()} tok</span>
            </div>
          `,
        })
      : '';

    return SettingsPage({
      title: 'System instructions',
      subtitle: 'Base prompt guidelines sent to your configured model.',
      bodyHtml: `${baseCard}${projectCard}`,
    });
  }

  // ── PAGE 7: GENERAL ──

  _renderGeneralPage() {
    const card = SettingsCard({
      title: 'Studio behavior',
      rowsHtml: [
        SettingsRow({
          icon: 'clipboard-list',
          label: 'Plan mode by default',
          description: 'Generate an editable implementation plan before writing code.',
          controlHtml: Switch({
            id: 'stTogglePlanMode',
            checked: Boolean(this.studio.agentPrefs?.planMode),
            ariaLabel: 'Plan mode by default',
          }),
        }),
        SettingsRow({
          icon: 'panel-left',
          label: 'Collapsed dashboard sidebar',
          description: 'Keep the left navigation sidebar tucked away on wide screens.',
          controlHtml: Switch({
            id: 'stToggleSidebarCollapsed',
            checked: Boolean(this.studio.layoutPrefs?.homeSidebarCollapsed),
            ariaLabel: 'Collapsed dashboard sidebar',
          }),
        }),
      ].join(''),
    });

    return SettingsPage({
      title: 'General',
      subtitle: 'Default workspace preferences.',
      bodyHtml: card,
    });
  }

  // ── PAGE 8: APPEARANCE ──

  _renderAppearancePage() {
    const theme = document.documentElement.getAttribute('data-theme') || safeStorageGet(STORAGE_KEYS.THEME, 'dark');
    const card = SettingsCard({
      title: 'Theme',
      rowsHtml: [
        SettingsRow({
          icon: 'sun-moon',
          label: 'Color theme',
          description: 'Switch WebForge between dark and light surfaces.',
          labelFor: 'stThemeSelect',
          controlHtml: `
            <select id="stThemeSelect" class="st-select st-control-wide" aria-label="Color theme">
              <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark</option>
              <option value="light" ${theme === 'light' ? 'selected' : ''}>Light</option>
            </select>
          `,
        }),
      ].join(''),
    });

    return SettingsPage({
      title: 'Appearance',
      subtitle: 'Customize WebForge interface appearance.',
      bodyHtml: card,
    });
  }

  // ── PAGE 9: KEYBOARD SHORTCUTS ──

  _renderKeyboardShortcutsPage() {
    const rowsHtml = KEYBOARD_SHORTCUTS_LIST.map((sc) =>
      SettingsRow({
        icon: sc.id === 'command-palette' ? 'command' : 'keyboard',
        label: sc.label,
        description: sc.description,
        controlHtml:
          sc.id === 'command-palette'
            ? `<div class="st-inline-controls">
                <button type="button" class="st-btn st-btn-ghost" id="btnStLaunchCommandPalette">Open</button>
                <span class="st-kbd">${escapeHtml(sc.keys)}</span>
              </div>`
            : `<span class="st-kbd">${escapeHtml(sc.keys)}</span>`,
      })
    ).join('');

    const card = SettingsCard({
      title: 'Shortcuts',
      rowsHtml,
    });

    return SettingsPage({
      title: 'Keyboard shortcuts',
      subtitle: 'Navigate WebForge and launch actions without leaving the keyboard.',
      bodyHtml: card,
    });
  }

  // ── PAGE 10: DATA ──

  _renderDataPage() {
    let approxKb = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('wf_')) {
          approxKb += ((localStorage.getItem(k) || '').length * 2) / 1024;
        }
      }
    } catch {}

    const projectCount = this.studio.projectsList?.length || 0;

    const card = SettingsCard({
      title: 'Local storage',
      rowsHtml: [
        SettingsRow({
          icon: 'hard-drive',
          label: 'Browser storage used',
          description: `${projectCount} project${projectCount === 1 ? '' : 's'} stored locally in this browser.`,
          controlHtml: `<span class="st-kbd">${approxKb.toFixed(1)} KB</span>`,
        }),
        SettingsRow({
          icon: 'download',
          label: 'Export backup',
          description: 'Download all projects, skills, and non-secret settings as JSON.',
          controlHtml: `<button type="button" class="st-btn st-btn-secondary" id="btnStExportData">Export JSON</button>`,
        }),
        SettingsRow({
          icon: 'trash-2',
          label: 'Clear cached thumbnails',
          description: 'Reclaim local storage space without deleting projects.',
          controlHtml: `<button type="button" class="st-btn st-btn-ghost" id="btnStClearThumbs">Clear cache</button>`,
        }),
        SettingsRow({
          icon: 'rotate-ccw',
          label: 'Reset system instructions',
          description: 'Restore default global prompt instructions.',
          controlHtml: `<button type="button" class="st-btn st-btn-danger-ghost" id="btnStDataResetBase">Reset</button>`,
        }),
      ].join(''),
    });

    return SettingsPage({
      title: 'Data',
      subtitle: 'Manage local browser data and backups.',
      bodyHtml: card,
    });
  }

  // ── PAGE 11: ABOUT & FEEDBACK ──

  _renderAboutPage() {
    const card = SettingsCard({
      title: 'WebForge',
      rowsHtml: [
        SettingsRow({
          icon: 'layers',
          label: 'Version',
          description: 'Browser-first AI website builder and component studio.',
          controlHtml: `<span class="st-kbd">v1.0.0</span>`,
        }),
        SettingsRow({
          icon: 'shield-check',
          label: 'Local-first privacy',
          description: 'API keys, projects, and skills remain in your browser storage.',
          controlHtml: `<span class="st-kbd">Client-side</span>`,
        }),
        SettingsRow({
          icon: 'cpu',
          label: 'Active provider',
          description: 'Current default build provider and model.',
          controlHtml: `<span class="st-kbd">${escapeHtml(this.studio.provider.preset.name)}</span>`,
        }),
      ].join(''),
    });

    return SettingsPage({
      title: 'About & feedback',
      subtitle: 'Application details and environment info.',
      bodyHtml: card,
    });
  }

  // ── EVENT BINDING (SPLIT INTO PERSISTENT NAV + PARTIAL BODY FOR ZERO FLICKER) ──

  _bindNavEvents() {
    const root = this.container;
    if (!root) return;

    root.querySelector('#btnSettingsBack')?.addEventListener('click', () => this.close());
    root.querySelector('[data-st-mobile-back]')?.addEventListener('click', () => {
      this.mobileNavOpen = true;
      this.render({ updateNav: false });
    });

    root.querySelector('#stNavSearch')?.addEventListener('input', (e) => {
      this.navSearch = e.target.value;
      this.render({ updateNav: true });
    });
    root.querySelectorAll('[data-st-nav]').forEach((btn) => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.stNav));
    });
  }

  _bindBodyEvents() {
    const root = this.container;
    if (!root) return;

    // SecretInput show/hide toggle
    root.querySelectorAll('[data-st-secret-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wrap = btn.closest('[data-st-secret-wrap]');
        const input = wrap?.querySelector('input');
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-label', show ? 'Hide API key' : 'Show API key');
        btn.setAttribute('title', show ? 'Hide API key' : 'Show API key');
        btn.innerHTML = `<i data-lucide="${show ? 'eye-off' : 'eye'}"></i>`;
        this.studio._safeCreateIcons(btn);
      });
    });

    // ── Model Provider page bindings ──
    root.querySelector('#stProviderSearch')?.addEventListener('input', (e) => {
      this.providerListSearch = e.target.value;
      this.render();
    });
    root.querySelector('#btnStProviderFilter')?.addEventListener('click', () => {
      const order = ['all', 'enabled', 'local', 'cloud'];
      this.providerListFilter = order[(order.indexOf(this.providerListFilter) + 1) % order.length];
      this.render();
    });
    root.querySelectorAll('[data-st-provider]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextId = btn.dataset.stProvider;
        const changed = nextId !== this.selectedProviderId;
        this.selectedProviderId = nextId;
        this.showProviderGearPanel = false;
        this.showAddModelForm = false;
        this.editingModelId = null;
        this.render({ animateDetail: changed });
      });
    });
    root.querySelector('#stProviderMobileSelect')?.addEventListener('change', (e) => {
      this.selectedProviderId = e.target.value;
      this.showProviderGearPanel = false;
      this.showAddModelForm = false;
      this.editingModelId = null;
      this.render({ animateDetail: true });
    });
    root.querySelectorAll('[data-st-toggle-add-provider]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.showAddProviderForm = !this.showAddProviderForm;
        this.render();
      });
    });
    root.querySelectorAll('[data-st-close-add-provider]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.showAddProviderForm = false;
        this.render();
      });
    });
    root.querySelector('#btnStCreateProvider')?.addEventListener('click', () => {
      const name = root.querySelector('#stNewProviderName')?.value?.trim();
      const baseUrl = root.querySelector('#stNewProviderUrl')?.value?.trim();
      const apiKey = root.querySelector('#stNewProviderKey')?.value?.trim() || '';
      const protocol = root.querySelector('#stNewProviderProtocol')?.value || 'openai-chat';
      if (!name || !baseUrl) {
        this.studio.showToast('Provider name and API host are required', true);
        return;
      }
      const created = this.studio.provider.addCustomProvider({ name, baseUrl, apiKey, protocol });
      this.selectedProviderId = created.id;
      this.showAddProviderForm = false;
      this.studio._updateHomeStatusStrip();
      this.render({ animateDetail: true });
    });

    root.querySelectorAll('[data-st-protocol]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const proto = btn.dataset.stProtocol;
        this.studio.provider.updateProvider(this.selectedProviderId, { protocol: proto });
        this.render();
      });
    });
    root.querySelectorAll('[data-st-endpoint-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.stEndpointPreset || '';
        this.studio.provider.updateProvider(this.selectedProviderId, { baseUrl: url });
        this.render();
      });
    });
    root.querySelector('#stProviderProxyMode')?.addEventListener('change', (e) => {
      this.studio.provider.updateProvider(this.selectedProviderId, { useProxy: e.target.value });
    });

    root.querySelectorAll('[data-st-toggle-provider-gear]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.showProviderGearPanel = !this.showProviderGearPanel;
        this.render();
      });
    });
    root.querySelector('#stEditProviderName')?.addEventListener('input', (e) => {
      this.studio.provider.updateProvider(this.selectedProviderId, { name: e.target.value });
      this.studio._updateHomeStatusStrip();
    });
    root.querySelector('#btnStDeleteProvider')?.addEventListener('click', async () => {
      const cfg = this.studio.provider.getProviderConfig(this.selectedProviderId);
      if (!cfg?.custom) return;
      const ok = await this.studio.openAppPromptModal({
        title: 'Delete provider',
        message: `Remove "${cfg.name}" and its synced models?`,
        confirmText: 'Delete',
        danger: true,
      });
      if (ok && this.studio.provider.deleteCustomProvider(cfg.id)) {
        this.selectedProviderId = this.studio.provider.type || 'strata';
        this.showProviderGearPanel = false;
        this.studio._updateHomeStatusStrip();
        this.render({ animateDetail: true });
      }
    });

    root.querySelector('#stProviderEnableSwitch')?.addEventListener('change', (e) => {
      this.studio.provider.updateProvider(this.selectedProviderId, { enabled: e.target.checked });
      if (e.target.checked) {
        this.studio.provider.activateProvider(this.selectedProviderId);
      }
      this.studio._updateHomeStatusStrip();
      this.render();
    });
    root.querySelector('#stProviderApiKey')?.addEventListener('input', (e) => {
      this.studio.provider.updateProvider(this.selectedProviderId, { apiKey: e.target.value.trim() });
    });
    root.querySelector('#stProviderBaseUrl')?.addEventListener('input', (e) => {
      this.studio.provider.updateProvider(this.selectedProviderId, { baseUrl: e.target.value.trim() });
    });
    root.querySelector('#btnStResetHost')?.addEventListener('click', () => {
      this.studio.provider.updateProvider(this.selectedProviderId, { baseUrl: '' });
      this.render();
    });

    root.querySelector('#btnStCheckProvider')?.addEventListener('click', async () => {
      const id = this.selectedProviderId;
      this.checkingProviderId = id;
      this.render();
      const res = await this.studio.provider.testConnectionForProvider(id);
      this.checkingProviderId = null;
      if (!res.ok) {
        this.studio.showToast(res.error || 'Connection check failed', true);
      } else {
        this.studio._updateConnectionStatus();
        this.studio._updateHomeStatusStrip();
      }
      this.render();
    });

    root.querySelectorAll('[data-st-sync-models]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = this.selectedProviderId;
        this.syncingProviderId = id;
        this.render();
        try {
          await this.studio.provider.fetchModelsForProvider(id);
          this.studio._updateConnectionStatus();
          this.studio._updateHomeStatusStrip();
        } catch (err) {
          this.studio.showToast(err?.message || 'Failed to sync models', true);
        } finally {
          this.syncingProviderId = null;
          this.render();
        }
      });
    });

    root.querySelector('#btnStModelSearchToggle')?.addEventListener('click', () => {
      this.modelSearchOpen = !this.modelSearchOpen;
      this.render();
      if (this.modelSearchOpen) root.querySelector('#stModelSearchInput')?.focus();
    });
    root.querySelector('#btnStModelFilterCycle')?.addEventListener('click', () => {
      const order = ['all', 'free', 'vision', 'reasoning'];
      const next = order[(order.indexOf(this.modelFilter) + 1) % order.length];
      this.modelFilter = next;
      this.render();
    });
    root.querySelector('#stModelSearchInput')?.addEventListener('input', (e) => {
      this.modelSearch = e.target.value;
      this.render();
    });
    root.querySelector('#stModelFilterSelect')?.addEventListener('change', (e) => {
      this.modelFilter = e.target.value;
      this.render();
    });
    root.querySelector('#btnStToggleAddModel')?.addEventListener('click', () => {
      this.showAddModelForm = !this.showAddModelForm;
      this.render();
    });
    root.querySelectorAll('[data-st-close-add-model]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.showAddModelForm = false;
        this.render();
      });
    });
    root.querySelector('#btnStSaveManualModel')?.addEventListener('click', () => {
      const id = root.querySelector('#stManualModelId')?.value?.trim();
      const name = root.querySelector('#stManualModelName')?.value?.trim();
      const ctx = parseInt(root.querySelector('#stManualModelCtx')?.value || '32768', 10);
      if (!id) {
        this.studio.showToast('Model ID is required', true);
        return;
      }
      this.studio.provider.addManualModel(this.selectedProviderId, { id, name: name || id, contextLength: ctx });
      this.showAddModelForm = false;
      this.studio._updateHomeStatusStrip();
      this.render();
    });
    root.querySelectorAll('[data-st-toggle-family]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.stToggleFamily;
        if (this.collapsedFamilies.has(key)) this.collapsedFamilies.delete(key);
        else this.collapsedFamilies.add(key);
        this.render();
      });
    });
    root.querySelectorAll('[data-st-edit-model]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.stEditModel;
        this.editingModelId = this.editingModelId === id ? null : id;
        this.render();
      });
    });
    root.querySelector('#stEditModelName')?.addEventListener('input', (e) => {
      if (this.editingModelId) {
        this.studio.provider.updateModelSettings(this.selectedProviderId, this.editingModelId, { name: e.target.value });
      }
    });
    root.querySelector('#stEditModelCtx')?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (this.editingModelId && Number.isFinite(val) && val >= 2048) {
        this.studio.provider.updateModelSettings(this.selectedProviderId, this.editingModelId, { contextLength: val });
        this.studio._updateContextBudgetMeter();
      }
    });
    root.querySelectorAll('[data-st-remove-model]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.stRemoveModel;
        if (this.studio.provider.removeModel(this.selectedProviderId, id)) {
          if (this.editingModelId === id) this.editingModelId = null;
          this.studio._updateHomeStatusStrip();
          this.render();
        }
      });
    });

    // ── Default Models & Generation bindings ──
    root.querySelectorAll('[data-st-role-model]').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const role = sel.dataset.stRoleModel;
        const opt = sel.selectedOptions[0];
        const providerId = opt?.dataset?.providerId || null;
        this.studio.provider.setRoleModel(role, e.target.value, providerId);
        this.studio._updateHomeStatusStrip();
        this.studio._updateContextBudgetMeter();
      });
    });
    root.querySelector('#stGenTemp')?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (Number.isFinite(val)) this.studio.provider.configure({ temperature: val });
    });
    root.querySelector('#stGenTopP')?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (Number.isFinite(val)) this.studio.provider.configure({ topP: val });
    });
    root.querySelector('#stGenMaxTokens')?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (Number.isFinite(val) && val > 0) this.studio.provider.configure({ maxTokens: val });
    });
    root.querySelector('#stGenContextWindow')?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (Number.isFinite(val) && val >= 2048) {
        this.studio.provider.configure({ contextWindow: val });
        this.studio._updateContextBudgetMeter();
        this.studio._updateHomeStatusStrip();
      }
    });

    // ── Local Models bindings ──
    root.querySelectorAll('[data-st-open-provider]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedProviderId = btn.dataset.stOpenProvider;
        this.navigate('model-provider');
      });
    });

    // ── Agent bindings ──
    root.querySelector('#stToggleSubAgents')?.addEventListener('change', (e) => {
      this.studio.agentPrefs.subAgents = e.target.checked;
      this.studio._saveAgentPrefs();
      this.studio._syncAgentPrefsUI();
    });
    root.querySelector('#stToggleWebSearch')?.addEventListener('change', (e) => {
      this.studio.agentPrefs.webSearch = e.target.checked;
      this.studio._saveAgentPrefs();
      this.studio._syncAgentPrefsUI();
    });
    root.querySelector('#btnStTestWebSearch')?.addEventListener('click', async () => {
      this.webSearchTesting = true;
      this.render();
      try {
        const res = await performWebSearch('React Tailwind CSS latest release', { limit: 3 });
        this.webSearchResult = {
          summary: res.results?.length
            ? `Connected via ${res.engine} (${res.elapsedMs}ms · ${res.results.length} results)`
            : 'No results returned.',
          items: (res.results || []).slice(0, 3),
        };
      } catch (err) {
        this.studio.showToast(err?.message || 'Web search test failed', true);
      } finally {
        this.webSearchTesting = false;
        this.render();
      }
    });

    // ── Skills bindings ──
    root.querySelector('#stSkillsSearch')?.addEventListener('input', (e) => {
      this.skillListSearch = e.target.value;
      this.render();
    });
    root.querySelectorAll('[data-st-skill-select]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextId = btn.dataset.stSkillSelect;
        const changed = nextId !== this.selectedSkillId;
        this.selectedSkillId = nextId;
        this.render({ animateDetail: changed });
      });
    });
    root.querySelector('#stSkillMobileSelect')?.addEventListener('change', (e) => {
      this.selectedSkillId = e.target.value;
      this.render({ animateDetail: true });
    });
    root.querySelectorAll('[data-st-skill-row]').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.st-switch')) return;
        const nextId = row.dataset.stSkillRow;
        const changed = nextId !== this.selectedSkillId;
        this.selectedSkillId = nextId;
        this.render({ animateDetail: changed });
      });
    });
    root.querySelectorAll('[data-st-skill-toggle]').forEach((cb) => {
      cb.addEventListener('change', () => {
        this.studio.skillManager.toggle(cb.dataset.stSkillToggle);
        this.studio._renderSkillsIndicator();
        this.studio._updateContextBudgetMeter();
        this.render();
      });
    });
    root.querySelector('[data-st-skill-editor]')?.addEventListener('input', (e) => {
      const id = e.target.dataset.stSkillEditor;
      this.studio.skillManager.updateSkill(id, { prompt: e.target.value });
      this.studio._updateContextBudgetMeter();
    });
    root.querySelector('[data-st-delete-skill]')?.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.stDeleteSkill;
      const sk = this.studio.skillManager.skills.find((x) => x.id === id);
      if (!sk) return;
      const ok = await this.studio.openAppPromptModal({
        title: 'Delete skill',
        message: `Remove custom skill "${sk.name}"?`,
        confirmText: 'Delete',
        danger: true,
      });
      if (ok && this.studio.skillManager.delete(id)) {
        this.selectedSkillId = this.studio.skillManager.skills[0]?.id || null;
        this.studio._renderSkillsIndicator();
        this.render();
      }
    });
    root.querySelector('#btnStAddSkillMenu')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.skillAddMenuOpen = !this.skillAddMenuOpen;
      this.render();
    });
    root.querySelectorAll('[data-st-add-skill-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.skillAddMode = btn.dataset.stAddSkillMode;
        this.skillAddMenuOpen = false;
        this.skillGithubDiscover = null;
        this.render();
      });
    });
    root.querySelectorAll('[data-st-close-skill-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.skillAddMode = null;
        this.skillGithubDiscover = null;
        this.render();
      });
    });
    root.querySelector('#stGithubSkillUrl')?.addEventListener('input', (e) => {
      this.skillGithubUrl = e.target.value;
    });
    root.querySelector('#btnStScanGithubSkill')?.addEventListener('click', async () => {
      const url = (this.skillGithubUrl || '').trim();
      if (!url) {
        this.studio.showToast('Paste a GitHub repo URL or owner/repo', true);
        return;
      }
      this.skillGithubScanning = true;
      this.render();
      try {
        const { imported, discovered } = await this.studio.skillManager.importFromGitHub(url);
        if (imported.length === 1) {
          this.selectedSkillId = imported[0].id;
          this.skillAddMode = null;
          this.skillGithubUrl = '';
          this.skillGithubDiscover = null;
          this.studio._renderSkillsIndicator();
        } else if (discovered?.skills?.length) {
          this.skillGithubDiscover = discovered;
        }
      } catch (err) {
        this.studio.showToast(err?.message || 'GitHub skill scan failed', true);
      } finally {
        this.skillGithubScanning = false;
        this.render();
      }
    });
    root.querySelectorAll('[data-st-gh-import-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = this.skillGithubDiscover?.skills?.[Number(btn.dataset.stGhImportIdx)];
        if (!item) return;
        const { skill } = this.studio.skillManager.importDiscoveredSkill(item);
        this.selectedSkillId = skill.id;
        this.studio._renderSkillsIndicator();
        this.render();
      });
    });
    root.querySelector('#btnStCreateCustomSkill')?.addEventListener('click', () => {
      const name = root.querySelector('#stCustomSkillName')?.value?.trim();
      const desc = root.querySelector('#stCustomSkillDesc')?.value?.trim();
      const prompt = root.querySelector('#stCustomSkillPrompt')?.value?.trim();
      if (!name || !prompt) {
        this.studio.showToast('Name and instructions are required', true);
        return;
      }
      const created = this.studio.skillManager.importFromText(name, desc || 'Custom skill', prompt);
      this.selectedSkillId = created.id;
      this.skillAddMode = null;
      this.studio._renderSkillsIndicator();
      this.render();
    });

    // ── System Instructions bindings ──
    root.querySelector('#stSystemBaseTextarea')?.addEventListener('input', (e) => {
      const val = e.target.value;
      this.studio.skillManager.setBaseInstructions(val);
      const chars = root.querySelector('#stSystemBaseChars');
      const toks = root.querySelector('#stSystemBaseTok');
      if (chars) chars.textContent = `${val.length.toLocaleString()} characters`;
      if (toks) toks.textContent = `~${estimateTokens(val).toLocaleString()} tok`;
      this.studio._updateContextBudgetMeter();
    });
    root.querySelector('#btnStResetSystemBase')?.addEventListener('click', () => {
      this.studio.skillManager.resetBaseInstructions();
      this.studio._updateContextBudgetMeter();
      this.render();
    });
    root.querySelector('#stProjectInstructionsTextarea')?.addEventListener('input', (e) => {
      const proj = this.studio._getActiveProject();
      if (!proj) return;
      const val = e.target.value;
      proj.customInstructions = val;
      this.studio._saveProjects();
      const chars = root.querySelector('#stProjectChars');
      const toks = root.querySelector('#stProjectTok');
      if (chars) chars.textContent = `${val.length.toLocaleString()} characters`;
      if (toks) toks.textContent = `~${estimateTokens(val).toLocaleString()} tok`;
      this.studio._updateContextBudgetMeter();
    });

    // ── General bindings ──
    root.querySelector('#stTogglePlanMode')?.addEventListener('change', (e) => {
      this.studio.togglePlanMode(e.target.checked);
    });
    root.querySelector('#stToggleSidebarCollapsed')?.addEventListener('change', (e) => {
      this.studio.toggleHomeSidebar(e.target.checked);
    });

    // ── Appearance bindings ──
    root.querySelector('#stThemeSelect')?.addEventListener('change', (e) => {
      this.studio.setTheme(e.target.value);
    });

    // ── Keyboard Shortcuts bindings ──
    root.querySelector('#btnStLaunchCommandPalette')?.addEventListener('click', () => {
      this.studio.openCommandPalette('');
    });

    // ── Data bindings ──
    root.querySelector('#btnStExportData')?.addEventListener('click', () => {
      try {
        const snapshot = {
          exportedAt: new Date().toISOString(),
          theme: safeStorageGet(STORAGE_KEYS.THEME, 'dark'),
          agentPrefs: this.studio.agentPrefs,
          systemBase: this.studio.skillManager.baseInstructions,
          skills: this.studio.skillManager.skills.map(({ id, name, enabled, builtin, source, description, prompt }) => ({
            id,
            name,
            enabled,
            builtin,
            source,
            description,
            prompt: builtin ? undefined : prompt,
          })),
          projects: this.studio.projectsList,
        };
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `webforge-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (err) {
        this.studio.showToast(err?.message || 'Backup export failed', true);
      }
    });
    root.querySelector('#btnStClearThumbs')?.addEventListener('click', () => {
      try {
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('wf_thumb_')) toRemove.push(k);
        }
        toRemove.forEach((k) => localStorage.removeItem(k));
        this.render();
      } catch (err) {
        this.studio.showToast(err?.message || 'Failed to clear cache', true);
      }
    });
    root.querySelector('#btnStDataResetBase')?.addEventListener('click', async () => {
      const ok = await this.studio.openAppPromptModal({
        title: 'Reset system instructions',
        message: 'Restore WebForge global system instructions to default?',
        confirmText: 'Reset',
        danger: true,
      });
      if (ok) {
        this.studio.skillManager.resetBaseInstructions();
        this.render();
      }
    });
  }
}
