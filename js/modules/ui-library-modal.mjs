/**
 * WebForge Studio — UI Component Library Studio Modal Controller
 *
 * Powers the interactive 2-pane UI Library gallery: live-rendered scoped
 * component previews across 6 built-in style packs + custom/imported packs,
 * in-app authoring, GitHub component scanning, project extraction, and JSON I/O.
 */

import { escapeHtml, timeAgo } from './storage.mjs';
import { UI_ELEMENT_CATEGORIES, extractElementFromProjectFile } from './ui-library.mjs';
import { buildInteractivePreviewSrcdoc, isCanvasOnlySnapshot, isDarkSurfaceSnapshot, isMobileComponentSnapshot } from './ui-preview-builder.mjs';

function buildScopedPreviewSrcdoc(lib, element) {
  const fontsLink = lib?.fontsUrl
    ? `<link rel="stylesheet" href="${escapeHtml(lib.fontsUrl)}">`
    : '';
  const tokensCss = lib?.tokensCss || '';
  const extraCss = element.previewCss || '';
  const extraScript = element.previewScript ? `<script>${element.previewScript}</script>` : '';
  const bodyHtml = element.previewHtml || `
    <div class="wf-ui-card">
      <div class="wf-ui-meta">${escapeHtml(element.category || 'component')}</div>
      <h4 class="wf-ui-card-title">${escapeHtml(element.name)}</h4>
      <p class="wf-ui-muted">${escapeHtml(element.description || 'Custom React component')}</p>
    </div>`;

  // Auto-scale tall static previews (Hero, Pricing, Tables, Modals) so they never clip inside 186px cards
  const autoFitScript = element.previewScript
    ? ''
    : `<script>
      (function () {
        function fit() {
          var stage = document.querySelector('.preview-stage');
          if (!stage) return;
          stage.style.transform = '';
          var availH = Math.max(120, window.innerHeight - 20);
          var availW = Math.max(200, window.innerWidth - 24);
          var rect = stage.getBoundingClientRect();
          var scaleH = rect.height > availH ? availH / rect.height : 1;
          var scaleW = rect.width > availW ? availW / rect.width : 1;
          var scale = Math.min(1, scaleH, scaleW);
          if (scale < 0.99) {
            stage.style.transformOrigin = 'center center';
            stage.style.transform = 'scale(' + Math.max(0.58, scale).toFixed(3) + ')';
          }
        }
        window.addEventListener('load', fit);
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(fit);
        }
        fit();
      })();
    </script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${fontsLink}
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; min-height: 100%; overflow: hidden; }
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 14px;
    background: var(--wf-bg, #090A0F);
  }
  .preview-stage { width: 100%; max-width: 340px; }
  ${tokensCss}
  ${extraCss}
</style>
</head>
<body class="wf-ui-scope">
  <div class="preview-stage">${bodyHtml}</div>
  ${extraScript}
  ${autoFitScript}
</body>
</html>`;
}

export class UILibraryModalController {
  constructor(studio) {
    this.studio = studio;
    this.manager = studio.uiLibraryManager;
    this.selectedLibraryId = this.manager.getActiveLibrary()?.id || 'saas-modern';
    this.viewMode = 'library'; // 'library' | 'ai-instructions'
    this.selectedCategory = 'all';
    this.subpanelMode = null; // null | 'new-pack' | 'add-element' | 'github' | 'inspect' | 'ai-template-form'
    this.subpanelPayload = null;
    this.expandedAiTemplateIds = new Set();
    this.awesomeQuery = '';
    this.awesomePage = 1;
    this.awesomeResult = null;
    this.awesomeLoading = false;
    this.awesomeError = '';
    this.awesomeInspectTab = 'jsx'; // 'jsx' | 'prompt'
    this._awesomeDebounce = null;
    this._awesomeReqSeq = 0;
    this.fsLib = null;
    this.fsElement = null;
    this.fsMode = 'preview'; // 'preview' | 'split' | 'code'
    this.fsViewport = 'desktop'; // 'desktop' | 'tablet' | 'mobile'
    this.fsTheme = 'dark'; // 'dark' | 'light'
    this.fsCodeTab = 'jsx'; // 'jsx' | 'prompt' | 'html'
    this._fsReqSeq = 0;
    this._wired = false;
  }

  init() {
    if (this._wired) return;
    this._wired = true;

    document.getElementById('btnUiLibNewPack')?.addEventListener('click', () => {
      this.subpanelMode = this.subpanelMode === 'new-pack' ? null : 'new-pack';
      this.subpanelPayload = null;
      this._renderSubpanel();
    });

    document.getElementById('btnUiLibImportGithub')?.addEventListener('click', () => {
      this.subpanelMode = this.subpanelMode === 'github' ? null : 'github';
      this.subpanelPayload = null;
      this._renderSubpanel();
    });

    document.getElementById('uiLibJsonFileInput')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = this.manager.importLibraryJson(String(reader.result || ''));
          this.selectedLibraryId = imported.id;
          this.selectedCategory = 'all';
          this.subpanelMode = null;
          this.render();
          this.studio.syncUiLibraryIndicators();
          this.studio.showToast(`Imported UI library "${imported.name}"`);
        } catch (err) {
          this.studio.showToast(err.message || 'JSON import failed', true);
        }
      };
      reader.readAsText(file);
    });

    this._initFullscreenPreviewControls();
  }

  _initFullscreenPreviewControls() {
    const modal = document.getElementById('uiFullscreenPreviewModal');
    if (!modal) return;

    modal.querySelector('#btnUiFsClose')?.addEventListener('click', () => modal.close());

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });

    modal.querySelectorAll('[data-fs-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.fsMode = btn.dataset.fsMode || 'preview';
        this._syncFullscreenLayout();
      });
    });

    modal.querySelectorAll('[data-fs-vp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.fsViewport = btn.dataset.fsVp || 'desktop';
        this._syncFullscreenLayout();
      });
    });

    modal.querySelector('#btnUiFsReplay')?.addEventListener('click', () => {
      const iframe = document.getElementById('uiFsIframe');
      try {
        iframe?.contentWindow?.postMessage({ type: 'wf-replay-animation' }, '*');
      } catch {
        // Fallback: re-assign srcdoc
        this._renderFullscreenIframe();
      }
    });

    modal.querySelector('#btnUiFsTheme')?.addEventListener('click', () => {
      this.fsTheme = this.fsTheme === 'dark' ? 'light' : 'dark';
      this._syncFullscreenThemeButton();
      const iframe = document.getElementById('uiFsIframe');
      try {
        iframe?.contentWindow?.postMessage({ type: 'wf-set-theme', theme: this.fsTheme }, '*');
      } catch {
        this._renderFullscreenIframe();
      }
    });

    const copyActiveCode = () => {
      const code = this._getFullscreenActiveCode();
      if (!code) return this.studio.showToast('No code available to copy', true);
      navigator.clipboard?.writeText(code).catch(() => {});
      const tabLabel = this.fsCodeTab === 'prompt' ? 'prompt' : this.fsCodeTab === 'html' ? 'HTML' : 'JSX';
      this.studio.showToast(`Copied ${this.fsElement?.name || 'component'} ${tabLabel}`);
    };

    modal.querySelector('#btnUiFsCopy')?.addEventListener('click', copyActiveCode);
    modal.querySelector('#btnUiFsCodeCopy')?.addEventListener('click', copyActiveCode);

    modal.querySelector('#btnUiFsInsert')?.addEventListener('click', () => {
      if (!this.fsLib || !this.fsElement) return;
      modal.close();
      this.studio.insertUiElementIntoProject(this.fsLib, this.fsElement);
    });

    modal.querySelector('#btnUiFsBuildAi')?.addEventListener('click', () => {
      const prompt = this.fsElement?.prompt;
      if (!prompt) return this.studio.showToast('No AI build prompt available for this component', true);
      const name = this.fsElement?.name || 'component';
      modal.close();
      document.getElementById('uiLibraryModal')?.close();
      const targetInput = this.studio.activeProjectId
        ? document.getElementById('chatInput')
        : document.getElementById('homePromptInput');
      if (targetInput) {
        targetInput.value = `Implement the "${name}" UI component with full animations and interactivity based on this specification:\n\n${prompt}`;
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        targetInput.focus();
        this.studio.showToast(`Loaded "${name}" build prompt into AI Builder`);
      } else {
        navigator.clipboard?.writeText(prompt).catch(() => {});
        this.studio.showToast(`Copied "${name}" prompt to clipboard`);
      }
    });
  }

  _getFullscreenActiveCode() {
    const el = this.fsElement;
    if (!el) return '';
    if (this.fsCodeTab === 'prompt' && el.prompt) return el.prompt;
    if (this.fsCodeTab === 'html' && (el.renderedHtml || el.previewHtml)) return el.renderedHtml || el.previewHtml;
    return el.code || el.renderedHtml || el.previewHtml || '';
  }

  _syncFullscreenThemeButton() {
    const btn = document.getElementById('btnUiFsTheme');
    const label = document.getElementById('uiFsThemeLabel');
    const frame = document.getElementById('uiFsStageFrame');
    if (label) label.textContent = this.fsTheme === 'dark' ? 'Light' : 'Dark';
    if (btn) {
      const icon = btn.querySelector('i, svg');
      if (icon) {
        const fresh = document.createElement('i');
        fresh.setAttribute('data-lucide', this.fsTheme === 'dark' ? 'sun' : 'moon');
        icon.replaceWith(fresh);
        this.studio._safeCreateIcons(btn);
      }
    }
    if (frame) {
      frame.classList.toggle('theme-light', this.fsTheme === 'light');
    }
  }

  _syncFullscreenLayout() {
    const modal = document.getElementById('uiFullscreenPreviewModal');
    const body = document.getElementById('uiFsBody');
    const frame = document.getElementById('uiFsStageFrame');
    const vpSeg = document.getElementById('uiFsViewportSeg');
    const refModeBtn = document.getElementById('btnUiFsModeReference');
    const refView = document.getElementById('uiFsReferenceView');
    const refImg = document.getElementById('uiFsReferenceImg');
    const refCap = document.getElementById('uiFsReferenceCaption');
    const buildAiBtn = document.getElementById('btnUiFsBuildAi');
    if (!modal || !body || !frame) return;

    const hasShot = Boolean(this.fsElement?.screenshotUrl);
    if (refModeBtn) refModeBtn.classList.toggle('hidden', !hasShot);
    if (buildAiBtn) buildAiBtn.classList.toggle('hidden', !this.fsElement?.prompt);

    if (this.fsMode === 'reference' && !hasShot) {
      this.fsMode = 'preview';
    }

    body.classList.remove('mode-preview', 'mode-reference', 'mode-split', 'mode-code');
    body.classList.add(`mode-${this.fsMode}`);

    frame.classList.remove('vp-desktop', 'vp-tablet', 'vp-mobile');
    frame.classList.add(`vp-${this.fsViewport}`);

    if (vpSeg) {
      vpSeg.classList.toggle('hidden', this.fsMode === 'code' || this.fsMode === 'reference');
    }

    if (refView) {
      const showRef = this.fsMode === 'reference' && hasShot;
      refView.classList.toggle('hidden', !showRef);
      if (showRef && refImg && refImg.getAttribute('src') !== this.fsElement.screenshotUrl) {
        refImg.src = this.fsElement.screenshotUrl;
        refImg.alt = `${this.fsElement.name || 'Component'} original GitHub reference`;
      }
      if (refCap) {
        refCap.textContent = `Original GitHub reference capture (screenshot.png) · ${this.fsElement?.name || ''}`;
      }
    }

    modal.querySelectorAll('[data-fs-mode]').forEach((btn) => {
      const active = btn.dataset.fsMode === this.fsMode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    modal.querySelectorAll('[data-fs-vp]').forEach((btn) => {
      const active = btn.dataset.fsVp === this.fsViewport;
      btn.classList.toggle('active', active);
    });
  }

  _renderFullscreenCodePane() {
    const tabsEl = document.getElementById('uiFsCodeTabs');
    const codeEl = document.getElementById('uiFsCodeContent');
    const repoLink = document.getElementById('uiFsRepoLink');
    const el = this.fsElement;
    if (!tabsEl || !codeEl || !el) return;

    const tabs = [];
    if (el.code) tabs.push({ id: 'jsx', label: 'React JSX' });
    if (el.prompt) tabs.push({ id: 'prompt', label: 'Prompt.md' });
    if (el.renderedHtml || el.previewHtml) tabs.push({ id: 'html', label: 'HTML Preview' });
    if (!tabs.length) tabs.push({ id: 'jsx', label: 'Code' });

    if (!tabs.some((t) => t.id === this.fsCodeTab)) {
      this.fsCodeTab = tabs[0].id;
    }

    tabsEl.innerHTML = tabs.map((t) => `
      <button type="button" role="tab" aria-selected="${this.fsCodeTab === t.id}" class="ui-lib-inspect-tab ${this.fsCodeTab === t.id ? 'active' : ''}" data-fs-code-tab="${escapeHtml(t.id)}">
        ${escapeHtml(t.label)}
      </button>
    `).join('');

    tabsEl.querySelectorAll('[data-fs-code-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.fsCodeTab = btn.dataset.fsCodeTab;
        this._renderFullscreenCodePane();
      });
    });

    codeEl.textContent = this._getFullscreenActiveCode();

    if (repoLink) {
      if (el.repoUrl) {
        repoLink.href = el.repoUrl;
        repoLink.classList.remove('hidden');
      } else {
        repoLink.classList.add('hidden');
      }
    }
  }

  _renderFullscreenIframe() {
    const iframe = document.getElementById('uiFsIframe');
    const loading = document.getElementById('uiFsLoading');
    if (!iframe || !this.fsElement) return;
    if (loading) loading.classList.add('hidden');
    iframe.srcdoc = buildInteractivePreviewSrcdoc({
      lib: this.fsLib,
      element: this.fsElement,
      theme: this.fsTheme,
      animate: true,
    });
  }

  openFullscreenPreview(lib, element, { initialMode = 'preview' } = {}) {
    this.init();
    const modal = document.getElementById('uiFullscreenPreviewModal');
    if (!modal || !lib || !element) return;

    this._fsReqSeq += 1;
    this.fsLib = lib;
    this.fsElement = element;
    this.fsMode = initialMode;
    this.fsViewport = 'desktop';
    this.fsCodeTab = 'jsx';
    this.fsTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

    const catLabel = UI_ELEMENT_CATEGORIES.find((c) => c.id === element.category)?.label || element.category || 'UI';
    const titleEl = document.getElementById('uiFsTitle');
    const libBadge = document.getElementById('uiFsLibBadge');
    const catBadge = document.getElementById('uiFsCatBadge');
    const subEl = document.getElementById('uiFsSubline');
    const insertBtn = document.getElementById('btnUiFsInsert');

    if (titleEl) titleEl.textContent = element.name || 'UI Component';
    if (libBadge) libBadge.textContent = lib.name || 'Library';
    if (catBadge) catBadge.textContent = catLabel;
    if (subEl) {
      subEl.textContent = element.authorName
        ? `by ${element.authorName} · Interactive animated preview`
        : (element.description || 'Interactive animated preview');
    }
    if (insertBtn) {
      insertBtn.classList.toggle('hidden', !this.studio.activeProjectId);
    }

    this._syncFullscreenLayout();
    this._syncFullscreenThemeButton();
    this._renderFullscreenCodePane();
    this._renderFullscreenIframe();

    if (!modal.open) modal.showModal();
    this.studio._safeCreateIcons(modal);
  }

  async openAwesomeFullscreenPreview(lib, item, { initialMode = 'preview' } = {}) {
    this.init();
    const modal = document.getElementById('uiFullscreenPreviewModal');
    if (!modal || !lib || !item) return;

    const reqId = ++this._fsReqSeq;
    this.fsLib = lib;
    this.fsElement = {
      id: item.id,
      name: item.name,
      category: item.category,
      authorName: item.authorName,
      repoUrl: item.repoUrl,
      screenshotUrl: item.screenshotUrl || '',
      description: `Imported from wundercorp/awesome-components by ${item.authorName}`,
      code: '// Loading React JSX from wundercorp/awesome-components…',
      prompt: '',
      renderedHtml: '',
    };
    this.fsMode = initialMode;
    this.fsViewport = 'desktop';
    this.fsCodeTab = 'jsx';
    this.fsTheme = 'dark';

    const catLabel = UI_ELEMENT_CATEGORIES.find((c) => c.id === item.category)?.label || item.category || 'UI';
    const titleEl = document.getElementById('uiFsTitle');
    const libBadge = document.getElementById('uiFsLibBadge');
    const catBadge = document.getElementById('uiFsCatBadge');
    const subEl = document.getElementById('uiFsSubline');
    const insertBtn = document.getElementById('btnUiFsInsert');
    const loading = document.getElementById('uiFsLoading');
    const iframe = document.getElementById('uiFsIframe');

    if (titleEl) titleEl.textContent = item.name;
    if (libBadge) libBadge.textContent = lib.name;
    if (catBadge) catBadge.textContent = catLabel;
    if (subEl) subEl.textContent = `by ${item.authorName} · Fetching interactive Tailwind preview & source…`;
    if (insertBtn) insertBtn.classList.toggle('hidden', !this.studio.activeProjectId);
    if (iframe) iframe.srcdoc = '';
    if (loading) loading.classList.remove('hidden');

    this._syncFullscreenLayout();
    this._syncFullscreenThemeButton();
    this._renderFullscreenCodePane();

    if (!modal.open) modal.showModal();
    this.studio._safeCreateIcons(modal);

    try {
      const detail = await this.manager.fetchAwesomeComponentDetail(item.id);
      if (reqId !== this._fsReqSeq) return;

      const rawHtml = detail.renderedHtml || '';
      const canvasOnly = isCanvasOnlySnapshot(rawHtml);
      const mobileOnly = isMobileComponentSnapshot(rawHtml, detail.name || item.name);
      this.fsTheme = isDarkSurfaceSnapshot(rawHtml) ? 'dark' : 'light';
      this.fsViewport = mobileOnly ? 'mobile' : 'desktop';
      this.fsElement = {
        id: detail.id,
        name: detail.name,
        category: detail.category,
        authorName: detail.authorName,
        repoUrl: detail.repoUrl,
        screenshotUrl: detail.screenshotUrl || item.screenshotUrl || '',
        description: `Imported from wundercorp/awesome-components by ${detail.authorName}`,
        code: detail.jsxCode || '',
        prompt: detail.prompt || '',
        promptCss: detail.promptCss || '',
        renderedHtml: rawHtml,
      };
      if (subEl) {
        subEl.textContent = canvasOnly
          ? `by ${detail.authorName} · Canvas / WebGL capture (use Build with AI for live JS runtime)`
          : mobileOnly
            ? `by ${detail.authorName} · Mobile interactive preview`
            : `by ${detail.authorName} · Live interactive Tailwind preview`;
      }
      this._syncFullscreenLayout();
      this._syncFullscreenThemeButton();
      this._renderFullscreenCodePane();
      this._renderFullscreenIframe();
      this.studio._safeCreateIcons(modal);
    } catch (err) {
      if (reqId !== this._fsReqSeq) return;
      if (loading) loading.classList.add('hidden');
      this.studio.showToast(err?.message || `Could not load ${item.name}`, true);
      if (subEl) subEl.textContent = err?.message || 'Could not load component source';
    }
  }

  open(initialLibraryId = null, initialSubpanel = null) {
    this.init();
    if (initialLibraryId === 'ai-instructions') {
      this.viewMode = 'ai-instructions';
    } else {
      this.viewMode = 'library';
      if (initialLibraryId) {
        this.selectedLibraryId = initialLibraryId;
      } else {
        const active = this.manager.getActiveLibrary();
        if (active) this.selectedLibraryId = active.id;
      }
    }
    this.subpanelMode = initialSubpanel || null;
    this.subpanelPayload = null;
    this.render();
    document.getElementById('uiLibraryModal')?.showModal();
    this.manager.syncAiTemplatesFromServer().then(() => {
      if (document.getElementById('uiLibraryModal')?.open) {
        this.render();
      }
    });
  }

  openSaveActiveFileFlow(filePath, fileCode) {
    this.init();
    this.viewMode = 'library';
    const extracted = extractElementFromProjectFile(filePath, fileCode);
    const active = this.manager.getActiveLibrary();
    if (active) this.selectedLibraryId = active.id;
    this.subpanelMode = 'add-element';
    this.subpanelPayload = extracted;
    this.render();
    document.getElementById('uiLibraryModal')?.showModal();
  }

  render() {
    this._renderSidebar();
    this._renderDetailHeader();
    this._renderSearchBar();
    this._renderCategoryBar();
    this._renderSubpanel();
    this._renderElementsGrid();
    const modal = document.getElementById('uiLibraryModal');
    if (modal) this.studio._safeCreateIcons(modal);
  }

  async _loadAwesomeCatalog(resetPage = false) {
    if (resetPage) this.awesomePage = 1;
    const reqId = ++this._awesomeReqSeq;
    this.awesomeLoading = true;
    this.awesomeError = '';
    this._renderElementsGrid();
    try {
      const result = await this.manager.queryAwesomeCatalog({
        q: this.awesomeQuery,
        category: this.selectedCategory,
        page: this.awesomePage,
        limit: 24,
      });
      if (reqId !== this._awesomeReqSeq) return;
      this.awesomeResult = result;
      this.awesomePage = result.page || 1;
      this.awesomeLoading = false;
      this._updateSearchBarMeta();
      this._renderCategoryBar();
      this._renderElementsGrid();
    } catch (err) {
      if (reqId !== this._awesomeReqSeq) return;
      this.awesomeLoading = false;
      this.awesomeError = err?.message || 'Could not load Awesome Components catalog';
      this._renderElementsGrid();
    }
  }

  _updateSearchBarMeta() {
    const metaEl = document.getElementById('awesomeSearchMeta');
    const clearBtn = document.getElementById('btnAwesomeSearchClear');
    if (clearBtn) clearBtn.classList.toggle('hidden', !this.awesomeQuery);
    if (!metaEl) return;
    if (this.awesomeLoading && !this.awesomeResult) {
      metaEl.textContent = 'Indexing catalog…';
      return;
    }
    const res = this.awesomeResult;
    if (!res) {
      metaEl.textContent = '6,345 components indexed';
      return;
    }
    const total = Number(res.total || 0);
    const catalogTotal = Number(res.catalogTotal || 6345);
    if (this.awesomeQuery || this.selectedCategory !== 'all') {
      metaEl.textContent = `${total.toLocaleString()} of ${catalogTotal.toLocaleString()} matches`;
    } else {
      metaEl.textContent = `${catalogTotal.toLocaleString()} components · Page ${res.page || 1} of ${res.totalPages || 1}`;
    }
  }

  _renderSearchBar() {
    const bar = document.getElementById('uiLibSearchBar');
    if (!bar) return;
    const lib = this._getSelectedLibrary();
    if (this.viewMode !== 'library' || !lib?.isRemoteCatalog) {
      bar.classList.add('hidden');
      bar.innerHTML = '';
      return;
    }
    bar.classList.remove('hidden');
    if (!bar.querySelector('#awesomeSearchInput')) {
      bar.innerHTML = `
        <div class="ui-lib-search-input-wrap">
          <i data-lucide="search" class="ui-lib-search-icon"></i>
          <input type="text" id="awesomeSearchInput" placeholder="Search all 6,345 components (e.g. bento, login, pricing, hero, shader, dock, card, author)…" autocomplete="off" aria-label="Search Awesome Components catalog" value="${escapeHtml(this.awesomeQuery)}">
          <button type="button" class="icon-action-btn ${this.awesomeQuery ? '' : 'hidden'}" id="btnAwesomeSearchClear" aria-label="Clear search">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="ui-lib-search-meta tabular-nums" id="awesomeSearchMeta"></div>
      `;

      const input = bar.querySelector('#awesomeSearchInput');
      const clearBtn = bar.querySelector('#btnAwesomeSearchClear');

      input?.addEventListener('input', () => {
        this.awesomeQuery = input.value.trim();
        if (clearBtn) clearBtn.classList.toggle('hidden', !this.awesomeQuery);
        clearTimeout(this._awesomeDebounce);
        this._awesomeDebounce = setTimeout(() => {
          this._loadAwesomeCatalog(true);
        }, 160);
      });

      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(this._awesomeDebounce);
          this.awesomeQuery = input.value.trim();
          this._loadAwesomeCatalog(true);
        }
      });

      clearBtn?.addEventListener('click', () => {
        this.awesomeQuery = '';
        if (input) {
          input.value = '';
          input.focus();
        }
        clearBtn.classList.add('hidden');
        this._loadAwesomeCatalog(true);
      });
    } else {
      const input = bar.querySelector('#awesomeSearchInput');
      if (input && document.activeElement !== input && input.value !== this.awesomeQuery) {
        input.value = this.awesomeQuery;
      }
    }
    this._updateSearchBarMeta();
  }

  _getSelectedLibrary() {
    return this.manager.getLibrary(this.selectedLibraryId) || this.manager.getAllLibraries()[0];
  }

  _renderSidebar() {
    const listEl = document.getElementById('uiLibSidebarList');
    if (!listEl) return;

    const all = this.manager.getAllLibraries();
    const builtIns = all.filter((l) => l.isBuiltIn);
    const customs = all.filter((l) => !l.isBuiltIn);
    const activeId = this.manager.activeLibraryId;
    const pendingAiCount = this.manager.getPendingAiTemplatesCount();
    const totalAiCount = this.manager.getAiTemplates().length;

    const renderPackBtn = (lib) => {
      const isSelected = this.viewMode === 'library' && lib.id === this.selectedLibraryId;
      const isActive = lib.id === activeId;
      const dotColor = lib.swatches?.[2] || lib.swatches?.[0] || '#FAFAFA';
      const countBadge = !isActive && lib.catalogCount
        ? `<span class="ui-lib-pack-count tabular-nums">${lib.catalogCount >= 1000 ? `${(lib.catalogCount / 1000).toFixed(1)}k` : lib.catalogCount}</span>`
        : '';
      return `
        <button type="button" class="ui-lib-pack-item ${isSelected ? 'selected' : ''}" data-lib-id="${escapeHtml(lib.id)}">
          <span class="ui-lib-pack-item-left">
            <span class="ui-lib-pack-dot" style="background:${escapeHtml(dotColor)}"></span>
            <span class="truncate">${escapeHtml(lib.name)}</span>
          </span>
          ${isActive ? '<span class="ui-lib-active-mark">AI ON</span>' : countBadge}
        </button>`;
    };

    listEl.innerHTML = `
      <div class="ui-lib-rail-label">AI Template Queue</div>
      <button type="button" class="ui-lib-pack-item ${this.viewMode === 'ai-instructions' ? 'selected' : ''}" id="btnUiLibAiInstructions" data-action="open-ai-instructions">
        <span class="ui-lib-pack-item-left">
          <i data-lucide="bot" style="width:14px;height:14px;opacity:0.85"></i>
          <span class="truncate">AI Instructions</span>
        </span>
        ${pendingAiCount > 0
          ? `<span class="ui-lib-queue-count" title="${pendingAiCount} pending import">${pendingAiCount}</span>`
          : totalAiCount > 0
            ? `<span class="ui-lib-queue-count done" title="${totalAiCount} imported">${totalAiCount}</span>`
            : ''}
      </button>
      <button type="button" class="ui-lib-pack-item ${this.viewMode === 'library' && activeId === 'none' ? 'selected' : ''}" data-action="disable-ai-lib">
        <span class="ui-lib-pack-item-left">
          <i data-lucide="slash" style="width:13px;height:13px;opacity:0.7"></i>
          <span class="truncate">No AI Library (From Scratch)</span>
        </span>
        ${activeId === 'none' ? '<span class="ui-lib-active-mark">ACTIVE</span>' : ''}
      </button>
      <div class="ui-lib-rail-label">Built-in Style Packs (${builtIns.length})</div>
      ${builtIns.map(renderPackBtn).join('')}
      <div class="ui-lib-rail-label">Custom &amp; Imported (${customs.length})</div>
      ${customs.length
        ? customs.map(renderPackBtn).join('')
        : '<div style="padding:6px 10px;font-size:12px;color:var(--md-text-dim)">No custom libraries yet. Create one, paste from GitHub, or import JSON.</div>'}
    `;

    listEl.querySelector('[data-action="open-ai-instructions"]')?.addEventListener('click', () => {
      this.viewMode = 'ai-instructions';
      this.subpanelMode = null;
      this.subpanelPayload = null;
      this.render();
    });

    listEl.querySelector('[data-action="disable-ai-lib"]')?.addEventListener('click', () => {
      this.viewMode = 'library';
      this.manager.setActiveLibrary('none');
      this.studio.syncUiLibraryIndicators();
      this.render();
      this.studio.showToast('AI UI Library disabled (building from scratch)');
    });

    listEl.querySelectorAll('[data-lib-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextId = btn.dataset.libId;
        const changed = nextId !== this.selectedLibraryId || this.viewMode !== 'library';
        this.viewMode = 'library';
        this.selectedLibraryId = nextId;
        this.selectedCategory = 'all';
        this.subpanelMode = null;
        this.subpanelPayload = null;
        if (changed) {
          this.awesomePage = 1;
        }
        this.render();
      });
    });
  }

  _renderDetailHeader() {
    const head = document.getElementById('uiLibDetailHead');
    if (!head) return;

    if (this.viewMode === 'ai-instructions') {
      const templates = this.manager.getAiTemplates();
      const pendingCount = templates.filter((t) => t.status !== 'imported').length;
      const importedCount = templates.length - pendingCount;

      head.innerHTML = `
        <div class="ui-lib-detail-copy">
          <h3>AI Instructions</h3>
          <p>Queue UI templates and component prompts here. Everything you add is saved to your workspace queue so you can ask the AI to go through and import all of them into your library.</p>
          <div class="ui-lib-swatches">
            <span class="tabular-nums">${pendingCount} pending import</span>
            <span aria-hidden="true">·</span>
            <span class="tabular-nums">${importedCount} imported</span>
            <span aria-hidden="true">·</span>
            <span class="ui-lib-queue-path">data/ui-library-ai-queue.json</span>
          </div>
        </div>
        <div class="ui-lib-detail-actions">
          <button type="button" class="btn btn-primary btn-sm" id="btnAiQueueAdd">
            <i data-lucide="plus"></i>
            <span>Add Template</span>
          </button>
          <button type="button" class="btn btn-outline btn-sm" id="btnAiQueueCopyAll" ${pendingCount === 0 ? 'disabled' : ''}>
            <i data-lucide="copy"></i>
            <span>Copy Pending</span>
          </button>
          <button type="button" class="btn btn-ghost btn-sm" id="btnAiQueueExport" ${templates.length === 0 ? 'disabled' : ''}>
            <i data-lucide="download"></i>
            <span>Export JSON</span>
          </button>
        </div>
      `;

      head.querySelector('#btnAiQueueAdd')?.addEventListener('click', () => {
        this.subpanelMode = this.subpanelMode === 'ai-template-form' && !this.subpanelPayload ? null : 'ai-template-form';
        this.subpanelPayload = null;
        this._renderSubpanel();
        if (this.subpanelMode === 'ai-template-form') {
          document.getElementById('aiTplName')?.focus();
        }
      });

      head.querySelector('#btnAiQueueCopyAll')?.addEventListener('click', () => {
        const text = this.manager.buildAiImportSummaryPrompt();
        if (!text) return this.studio.showToast('No pending templates to copy', true);
        navigator.clipboard?.writeText(text).catch(() => {});
        this.studio.showToast(`Copied ${pendingCount} pending template${pendingCount === 1 ? '' : 's'}`);
      });

      head.querySelector('#btnAiQueueExport')?.addEventListener('click', () => {
        const json = this.manager.exportAiTemplatesJson();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ui-library-ai-queue.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        this.studio.showToast('Exported AI Instructions queue JSON');
      });
      return;
    }

    const lib = this._getSelectedLibrary();
    if (!lib) {
      head.innerHTML = '';
      return;
    }

    const isActive = this.manager.activeLibraryId === lib.id;
    const swatchesHtml = (lib.swatches || [])
      .map((hex) => `<span class="ui-lib-swatch" title="${escapeHtml(hex)}" style="background:${escapeHtml(hex)}"></span>`)
      .join('');

    const isRemote = Boolean(lib.isRemoteCatalog);
    const totalCount = isRemote
      ? Number(this.awesomeResult?.catalogTotal || lib.catalogCount || 6345)
      : (lib.elements || []).length;
    const countLabel = isRemote
      ? `${totalCount.toLocaleString()} components`
      : `${totalCount} element${totalCount === 1 ? '' : 's'}`;

    head.innerHTML = `
      <div class="ui-lib-detail-copy">
        <h3>${escapeHtml(lib.name)}</h3>
        <p>${escapeHtml(lib.tagline || '')}</p>
        <div class="ui-lib-swatches">
          <span class="ui-lib-swatch-strip">${swatchesHtml}</span>
          <span>${escapeHtml(lib.fontsLabel || 'Custom typography')}</span>
          <span aria-hidden="true">·</span>
          <span class="tabular-nums">${escapeHtml(countLabel)}</span>
        </div>
      </div>
      <div class="ui-lib-detail-actions">
        <button type="button" class="btn ${isActive ? 'btn-outline' : 'btn-primary'} btn-sm" id="btnUiLibActivateAi">
          <i data-lucide="${isActive ? 'check-circle-2' : 'sparkles'}"></i>
          <span>${isActive ? 'Active for AI' : 'Activate for AI'}</span>
        </button>
        ${this.studio.activeProjectId ? `
          <button type="button" class="btn btn-outline btn-sm" id="btnUiLibApplyProject" title="Bundle src/components/ui.jsx & src/styles/ui-tokens.css into current project">
            <i data-lucide="package-plus"></i>
            <span>Apply Kit to Project</span>
          </button>` : ''}
        ${!isRemote ? `
          <button type="button" class="btn btn-outline btn-sm" id="btnUiLibAddElement">
            <i data-lucide="plus"></i>
            <span>Add Element</span>
          </button>
          <button type="button" class="btn btn-ghost btn-sm" id="btnUiLibExportJson" title="Download portable JSON pack">
            <i data-lucide="download"></i>
            <span>Export JSON</span>
          </button>` : `
          <a class="btn btn-ghost btn-sm" href="https://github.com/wundercorp/awesome-components" target="_blank" rel="noopener noreferrer">
            <i data-lucide="github"></i>
            <span>GitHub Repo</span>
          </a>`}
        ${!lib.isBuiltIn ? `
          <button type="button" class="icon-action-btn danger" id="btnUiLibDeletePack" title="Delete custom library" aria-label="Delete ${escapeHtml(lib.name)}">
            <i data-lucide="trash-2"></i>
          </button>` : ''}
      </div>
    `;

    head.querySelector('#btnUiLibActivateAi')?.addEventListener('click', () => {
      if (isActive) {
        this.manager.setActiveLibrary('none');
        this.studio.showToast('Deactivated UI Library for AI');
      } else {
        this.manager.setActiveLibrary(lib.id);
        this.studio.showToast(`Activated "${lib.name}" for AI builds`);
      }
      this.studio.syncUiLibraryIndicators();
      this.render();
    });

    head.querySelector('#btnUiLibApplyProject')?.addEventListener('click', () => {
      this.studio.applyActiveUiLibraryToProject(lib.id);
    });

    head.querySelector('#btnUiLibAddElement')?.addEventListener('click', () => {
      this.subpanelMode = this.subpanelMode === 'add-element' ? null : 'add-element';
      this.subpanelPayload = null;
      this._renderSubpanel();
    });

    head.querySelector('#btnUiLibExportJson')?.addEventListener('click', () => {
      const json = this.manager.exportLibraryJson(lib.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${lib.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-ui-library.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      this.studio.showToast(`Exported "${lib.name}" as JSON`);
    });

    head.querySelector('#btnUiLibDeletePack')?.addEventListener('click', async () => {
      const ok = await this.studio.openAppPromptModal({
        title: 'Delete UI Library',
        message: `Delete custom UI library "${lib.name}" and its ${(lib.elements || []).length} element(s)?`,
        confirmText: 'Delete',
        danger: true,
      });
      if (!ok) return;
      this.manager.deleteCustomLibrary(lib.id);
      this.selectedLibraryId = 'saas-modern';
      this.studio.syncUiLibraryIndicators();
      this.render();
      this.studio.showToast(`Deleted "${lib.name}"`);
    });
  }

  _renderCategoryBar() {
    const bar = document.getElementById('uiLibCategoryBar');
    if (!bar) return;
    if (this.viewMode === 'ai-instructions') {
      bar.innerHTML = '';
      bar.classList.add('hidden');
      return;
    }
    bar.classList.remove('hidden');
    const lib = this._getSelectedLibrary();
    const isRemote = Boolean(lib?.isRemoteCatalog);
    const elements = lib?.elements || [];
    const remoteCounts = this.awesomeResult?.categoryCounts || null;

    const cats = isRemote
      ? [
          {
            id: 'all',
            label: remoteCounts
              ? `All (${Number(remoteCounts.all || 0).toLocaleString()})`
              : `All (${Number(lib.catalogCount || 6345).toLocaleString()})`,
          },
          ...UI_ELEMENT_CATEGORIES.map((c) => {
            const count = remoteCounts ? Number(remoteCounts[c.id] || 0) : null;
            return {
              id: c.id,
              label: count !== null ? `${c.label} (${count.toLocaleString()})` : c.label,
            };
          }),
        ]
      : [
          { id: 'all', label: `All (${elements.length})` },
          ...UI_ELEMENT_CATEGORIES.map((c) => {
            const count = elements.filter((e) => e.category === c.id).length;
            return { id: c.id, label: count ? `${c.label} (${count})` : c.label };
          }),
        ];

    bar.innerHTML = cats.map((c) => `
      <button type="button" role="tab" aria-selected="${this.selectedCategory === c.id}" class="ui-lib-cat-btn ${this.selectedCategory === c.id ? 'active' : ''}" data-cat-id="${escapeHtml(c.id)}">
        ${escapeHtml(c.label)}
      </button>
    `).join('');

    bar.querySelectorAll('[data-cat-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedCategory = btn.dataset.catId;
        if (isRemote) {
          this._renderCategoryBar();
          this._loadAwesomeCatalog(true);
        } else {
          this._renderCategoryBar();
          this._renderElementsGrid();
        }
      });
    });
  }

  _renderSubpanel() {
    const panel = document.getElementById('uiLibSubpanel');
    if (!panel) return;
    if (!this.subpanelMode) {
      panel.classList.add('hidden');
      panel.innerHTML = '';
      return;
    }

    panel.classList.remove('hidden');

    if (this.subpanelMode === 'new-pack') {
      panel.innerHTML = `
        <div class="ui-lib-subpanel-head">
          <h4>Create Custom UI Library</h4>
          <button type="button" class="icon-action-btn" data-close-subpanel aria-label="Close form"><i data-lucide="x"></i></button>
        </div>
        <div class="ui-lib-form-grid">
          <div>
            <label style="display:block;font-size:11.5px;margin-bottom:4px;color:var(--md-text-muted)">Library Name</label>
            <input type="text" id="newLibName" placeholder="e.g. Cyber Terminal UI">
          </div>
          <div>
            <label style="display:block;font-size:11.5px;margin-bottom:4px;color:var(--md-text-muted)">Tagline / Aesthetic</label>
            <input type="text" id="newLibTagline" placeholder="e.g. Phosphor green mono borders on deep black">
          </div>
          <div>
            <label style="display:block;font-size:11.5px;margin-bottom:4px;color:var(--md-text-muted)">Background &amp; Surface Hex (comma separated)</label>
            <input type="text" id="newLibSwatches" value="#0D1117, #161B22, #58A6FF, #F0F6FC">
          </div>
          <div>
            <label style="display:block;font-size:11.5px;margin-bottom:4px;color:var(--md-text-muted)">Typography Label</label>
            <input type="text" id="newLibFonts" value="Plus Jakarta Sans + JetBrains Mono">
          </div>
          <div class="span-2">
            <label style="display:block;font-size:11.5px;margin-bottom:4px;color:var(--md-text-muted)">Optional Custom CSS Tokens (leave blank to auto-generate from swatches)</label>
            <textarea id="newLibTokensCss" rows="4" placeholder=":root, .wf-ui-scope { --wf-radius: 6px; ... }"></textarea>
          </div>
        </div>
        <div class="ui-lib-subpanel-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-close-subpanel>Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" id="btnConfirmCreateLib">Create Library</button>
        </div>
      `;

      panel.querySelector('#btnConfirmCreateLib')?.addEventListener('click', () => {
        const name = panel.querySelector('#newLibName')?.value?.trim() || '';
        const tagline = panel.querySelector('#newLibTagline')?.value?.trim() || '';
        const fontsLabel = panel.querySelector('#newLibFonts')?.value?.trim() || 'Custom Typography';
        const tokensCss = panel.querySelector('#newLibTokensCss')?.value || '';
        const swatches = (panel.querySelector('#newLibSwatches')?.value || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        try {
          const created = this.manager.createCustomLibrary({
            name,
            tagline: tagline || 'Custom UI component library',
            fontsLabel,
            swatches: swatches.length >= 2 ? swatches : undefined,
            tokensCss,
          });
          this.selectedLibraryId = created.id;
          this.manager.setActiveLibrary(created.id);
          this.subpanelMode = null;
          this.studio.syncUiLibraryIndicators();
          this.render();
          this.studio.showToast(`Created & activated "${created.name}"`);
        } catch (err) {
          this.studio.showToast(err.message, true);
        }
      });
    } else if (this.subpanelMode === 'add-element') {
      const lib = this._getSelectedLibrary();
      const preset = this.subpanelPayload || {};
      const catOptions = UI_ELEMENT_CATEGORIES.map(
        (c) => `<option value="${c.id}" ${preset.category === c.id ? 'selected' : ''}>${escapeHtml(c.label)}</option>`
      ).join('');
      const targetNote = lib?.isBuiltIn
        ? `Adding to built-in "${lib.name}" automatically creates/updates "${lib.name} (Custom)".`
        : `Adding directly to "${lib?.name || 'Custom Library'}".`;

      panel.innerHTML = `
        <div class="ui-lib-subpanel-head">
          <h4>Add Custom UI Element</h4>
          <button type="button" class="icon-action-btn" data-close-subpanel aria-label="Close form"><i data-lucide="x"></i></button>
        </div>
        <p style="margin:0;font-size:12px;color:var(--md-text-muted)">${escapeHtml(targetNote)}</p>
        <div class="ui-lib-form-grid">
          <div>
            <label style="display:block;font-size:11.5px;margin-bottom:4px;color:var(--md-text-muted)">Element Name</label>
            <input type="text" id="newElName" placeholder="e.g. Pixel Action Button" value="${escapeHtml(preset.name || '')}">
          </div>
          <div>
            <label style="display:block;font-size:11.5px;margin-bottom:4px;color:var(--md-text-muted)">Category</label>
            <select id="newElCategory">${catOptions}</select>
          </div>
          <div class="span-2">
            <label style="display:block;font-size:11.5px;margin-bottom:4px;color:var(--md-text-muted)">Description</label>
            <input type="text" id="newElDesc" placeholder="Short description of when the AI should use this element" value="${escapeHtml(preset.description || '')}">
          </div>
          <div class="span-2">
            <label style="display:block;font-size:11.5px;margin-bottom:4px;color:var(--md-text-muted)">Component Code (React JSX / CSS)</label>
            <textarea id="newElCode" rows="6" placeholder="export function CustomButton({ children }) { ... }">${escapeHtml(preset.code || '')}</textarea>
          </div>
          <div class="span-2">
            <label style="display:block;font-size:11.5px;margin-bottom:4px;color:var(--md-text-muted)">Optional Live HTML Preview Snippet</label>
            <textarea id="newElPreviewHtml" rows="2" placeholder="<button class='wf-ui-btn wf-ui-btn-primary'>Click Me</button>">${escapeHtml(preset.previewHtml || '')}</textarea>
          </div>
        </div>
        <div class="ui-lib-subpanel-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-close-subpanel>Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" id="btnConfirmAddElement">Save Element</button>
        </div>
      `;

      panel.querySelector('#btnConfirmAddElement')?.addEventListener('click', () => {
        try {
          const { library, element } = this.manager.addElementToLibrary(lib.id, {
            name: panel.querySelector('#newElName')?.value,
            category: panel.querySelector('#newElCategory')?.value,
            description: panel.querySelector('#newElDesc')?.value,
            code: panel.querySelector('#newElCode')?.value,
            previewHtml: panel.querySelector('#newElPreviewHtml')?.value,
          });
          this.selectedLibraryId = library.id;
          this.selectedCategory = 'all';
          this.subpanelMode = null;
          this.subpanelPayload = null;
          this.studio.syncUiLibraryIndicators();
          this.render();
          this.studio.showToast(`Saved "${element.name}" to ${library.name}`);
        } catch (err) {
          this.studio.showToast(err.message, true);
        }
      });
    } else if (this.subpanelMode === 'github') {
      panel.innerHTML = `
        <div class="ui-lib-subpanel-head">
          <h4>Import UI Library from GitHub</h4>
          <button type="button" class="icon-action-btn" data-close-subpanel aria-label="Close form"><i data-lucide="x"></i></button>
        </div>
        <p style="margin:0;font-size:12px;color:var(--md-text-muted)">
          Paste any public GitHub repository, component folder, or single <code>.jsx</code>/<code>.tsx</code> file URL. WebForge scans and imports components with zero API keys.
        </p>
        <div class="skill-import-row">
          <input type="text" id="ghUiLibUrlInput" placeholder="https://github.com/owner/repo or .../components/ui/button.tsx" autocomplete="off">
          <button type="button" class="btn btn-primary btn-sm" id="btnRunGhUiScan">Scan &amp; Import</button>
        </div>
        <div id="ghUiScanStatus" style="font-size:12px;color:var(--md-text-muted)"></div>
      `;

      const runScan = async () => {
        const input = panel.querySelector('#ghUiLibUrlInput');
        const status = panel.querySelector('#ghUiScanStatus');
        const btn = panel.querySelector('#btnRunGhUiScan');
        const url = (input?.value || '').trim();
        if (!url) {
          this.studio.showToast('Paste a GitHub repo or file URL first', true);
          return;
        }
        btn.disabled = true;
        status.textContent = 'Scanning GitHub repository for UI components…';
        try {
          const res = await fetch(`/api/github-ui?url=${encodeURIComponent(url)}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'GitHub scan failed');
          const imported = this.manager.importFromGitHubPayload(data);
          this.selectedLibraryId = imported.id;
          this.manager.setActiveLibrary(imported.id);
          this.subpanelMode = null;
          this.studio.syncUiLibraryIndicators();
          this.render();
          this.studio.showToast(`Imported ${imported.elements.length} components into "${imported.name}"`);
        } catch (err) {
          status.textContent = err.message || 'Could not scan GitHub repository';
          this.studio.showToast(err.message || 'GitHub import failed', true);
        } finally {
          btn.disabled = false;
        }
      };

      panel.querySelector('#btnRunGhUiScan')?.addEventListener('click', runScan);
      panel.querySelector('#ghUiLibUrlInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          runScan();
        }
      });
    } else if (this.subpanelMode === 'inspect' && this.subpanelPayload) {
      const el = this.subpanelPayload;
      const hasPrompt = Boolean(el.prompt);
      const activeTab = hasPrompt && this.awesomeInspectTab === 'prompt' ? 'prompt' : 'jsx';
      const activeContent = activeTab === 'prompt' ? (el.prompt || '') : (el.code || '');
      panel.innerHTML = `
        <div class="ui-lib-subpanel-head">
          <div class="ui-lib-inspect-title-wrap">
            <h4>Inspect · ${escapeHtml(el.name)}</h4>
            ${el.authorName ? `<span class="ui-lib-inspect-author">by ${escapeHtml(el.authorName)}</span>` : ''}
          </div>
          <div class="ui-lib-inspect-head-right">
            ${hasPrompt ? `
              <div class="ui-lib-inspect-tabs" role="tablist" aria-label="Source view">
                <button type="button" role="tab" aria-selected="${activeTab === 'jsx'}" class="ui-lib-inspect-tab ${activeTab === 'jsx' ? 'active' : ''}" data-inspect-tab="jsx">React JSX</button>
                <button type="button" role="tab" aria-selected="${activeTab === 'prompt'}" class="ui-lib-inspect-tab ${activeTab === 'prompt' ? 'active' : ''}" data-inspect-tab="prompt">Prompt.md</button>
              </div>` : ''}
            <button type="button" class="icon-action-btn" data-close-subpanel aria-label="Close code preview"><i data-lucide="x"></i></button>
          </div>
        </div>
        <textarea rows="12" readonly id="uiLibInspectTextarea">${escapeHtml(activeContent)}</textarea>
        <div class="ui-lib-subpanel-actions">
          ${el.repoUrl ? `
            <a class="btn btn-ghost btn-sm" href="${escapeHtml(el.repoUrl)}" target="_blank" rel="noopener noreferrer" style="margin-right:auto">
              <i data-lucide="external-link"></i> Source on GitHub
            </a>` : ''}
          <button type="button" class="btn btn-outline btn-sm" id="btnCopyInspectedEl">
            <i data-lucide="copy"></i> ${activeTab === 'prompt' ? 'Copy Prompt' : 'Copy JSX'}
          </button>
          ${this.studio.activeProjectId ? `
            <button type="button" class="btn btn-primary btn-sm" id="btnInsertInspectedEl">
              <i data-lucide="file-plus"></i> Insert into Project
            </button>` : ''}
        </div>
      `;

      panel.querySelectorAll('[data-inspect-tab]').forEach((tabBtn) => {
        tabBtn.addEventListener('click', () => {
          this.awesomeInspectTab = tabBtn.dataset.inspectTab;
          this._renderSubpanel();
        });
      });

      panel.querySelector('#btnCopyInspectedEl')?.addEventListener('click', () => {
        navigator.clipboard?.writeText(activeContent).catch(() => {});
        this.studio.showToast(`Copied ${el.name} ${activeTab === 'prompt' ? 'prompt' : 'JSX'}`);
      });

      panel.querySelector('#btnInsertInspectedEl')?.addEventListener('click', () => {
        this.studio.insertUiElementIntoProject(this._getSelectedLibrary(), el);
      });
    } else if (this.subpanelMode === 'ai-template-form') {
      const editing = this.subpanelPayload || null;
      const allLibs = this.manager.getAllLibraries();
      const libNames = ['21st.dev', ...allLibs.map((l) => l.name).filter((n) => n !== '21st.dev')];
      const currentTarget = editing?.targetLibrary || '21st.dev';
      if (currentTarget && !libNames.includes(currentTarget)) libNames.push(currentTarget);

      panel.innerHTML = `
        <div class="ui-lib-subpanel-head">
          <h4>${editing ? `Edit Queued Template · ${escapeHtml(editing.name)}` : 'Add Template to AI Import Queue'}</h4>
          <button type="button" class="icon-action-btn" data-close-subpanel aria-label="Close template form"><i data-lucide="x"></i></button>
        </div>
        <div class="ui-lib-form-grid">
          <div>
            <label for="aiTplName" style="display:block;font-size:11.5px;margin-bottom:4px;color:var(--md-text-muted)">Template Name</label>
            <input type="text" id="aiTplName" placeholder="e.g. Magnetic Dock, Bento Grid, Liquid Glass Card" value="${escapeHtml(editing?.name || '')}" autocomplete="off">
          </div>
          <div>
            <label for="aiTplTargetLibrary" style="display:block;font-size:11.5px;margin-bottom:4px;color:var(--md-text-muted)">Target Library Category</label>
            <select id="aiTplTargetLibrary">
              ${libNames.map((n) => `<option value="${escapeHtml(n)}" ${n === currentTarget ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('')}
            </select>
          </div>
          <div class="span-2">
            <label for="aiTplPrompt" style="display:block;font-size:11.5px;margin-bottom:4px;color:var(--md-text-muted)">Prompt / Component Code</label>
            <textarea id="aiTplPrompt" rows="8" placeholder="Paste the full template prompt, 21st.dev copy-paste prompt, React/TSX code, or integration instructions here…">${escapeHtml(editing?.prompt || '')}</textarea>
          </div>
        </div>
        <div class="ui-lib-subpanel-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-close-subpanel>Cancel</button>
          ${!editing ? '<button type="button" class="btn btn-outline btn-sm" id="btnAiTplSaveAndNext">Add &amp; Add Another</button>' : ''}
          <button type="button" class="btn btn-primary btn-sm" id="btnAiTplSave">${editing ? 'Save Changes' : 'Add'}</button>
        </div>
      `;

      const submitForm = async (keepOpenForNext = false) => {
        const nameInput = panel.querySelector('#aiTplName');
        const targetSelect = panel.querySelector('#aiTplTargetLibrary');
        const promptInput = panel.querySelector('#aiTplPrompt');
        const saveBtn = panel.querySelector('#btnAiTplSave');
        const nextBtn = panel.querySelector('#btnAiTplSaveAndNext');
        const name = (nameInput?.value || '').trim();
        const prompt = (promptInput?.value || '').trim();
        const targetLibrary = (targetSelect?.value || '21st.dev').trim();

        if (!name) {
          this.studio.showToast('Please enter a template name', true);
          nameInput?.focus();
          return;
        }
        if (!prompt) {
          this.studio.showToast('Please paste the template prompt or code', true);
          promptInput?.focus();
          return;
        }

        if (saveBtn) saveBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        try {
          if (editing?.id) {
            await this.manager.updateAiTemplate(editing.id, { name, prompt, targetLibrary });
            this.subpanelMode = null;
            this.subpanelPayload = null;
            this.render();
            this.studio.showToast(`Updated "${name}"`);
          } else {
            await this.manager.addAiTemplate({ name, prompt, targetLibrary });
            if (keepOpenForNext) {
              this.subpanelMode = 'ai-template-form';
              this.subpanelPayload = null;
              this.render();
              const freshName = document.getElementById('aiTplName');
              const freshTarget = document.getElementById('aiTplTargetLibrary');
              if (freshTarget) freshTarget.value = targetLibrary;
              freshName?.focus();
            } else {
              this.subpanelMode = null;
              this.subpanelPayload = null;
              this.render();
            }
            this.studio.showToast(`Added "${name}" to AI Instructions queue`);
          }
        } catch (err) {
          this.studio.showToast(err?.message || 'Could not save template', true);
          if (saveBtn) saveBtn.disabled = false;
          if (nextBtn) nextBtn.disabled = false;
        }
      };

      panel.querySelector('#btnAiTplSave')?.addEventListener('click', () => submitForm(false));
      panel.querySelector('#btnAiTplSaveAndNext')?.addEventListener('click', () => submitForm(true));
    }

    panel.querySelectorAll('[data-close-subpanel]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.subpanelMode = null;
        this.subpanelPayload = null;
        this._renderSubpanel();
      });
    });

    this.studio._safeCreateIcons(panel);
  }

  _renderElementsGrid() {
    const grid = document.getElementById('uiLibElementsGrid');
    if (!grid) return;

    if (this.viewMode === 'ai-instructions') {
      grid.classList.add('ui-lib-ai-list');
      this._renderAiInstructionsList(grid);
      return;
    }

    grid.classList.remove('ui-lib-ai-list');
    const lib = this._getSelectedLibrary();
    if (!lib) {
      grid.innerHTML = '';
      return;
    }

    if (lib.isRemoteCatalog) {
      this._renderAwesomeCatalogGrid(grid, lib);
      return;
    }

    const filtered = (lib.elements || []).filter((el) =>
      this.selectedCategory === 'all' ? true : el.category === this.selectedCategory
    );

    if (!filtered.length) {
      grid.innerHTML = `
        <div class="home-empty-state" style="grid-column:1 / -1">
          <i data-lucide="blocks"></i>
          <h3>No elements in this category yet</h3>
          <p>Click “Add Element” above to paste a JSX or HTML component into ${escapeHtml(lib.name)}.</p>
        </div>`;
      this.studio._safeCreateIcons(grid);
      return;
    }

    grid.innerHTML = filtered.map((el) => {
      const catLabel = UI_ELEMENT_CATEGORIES.find((c) => c.id === el.category)?.label || el.category;
      const sandboxAttr = 'allow-scripts';
      const heightStyle = el.previewHeight ? ` style="height:${Number(el.previewHeight)}px"` : '';
      const previewMarkup = el.previewHtml
        ? `<div class="ui-lib-el-preview-wrap ${el.previewScript ? 'has-live-script' : ''}">
            <iframe class="ui-lib-el-preview-frame" title="${escapeHtml(el.name)} preview" sandbox="${sandboxAttr}" loading="lazy"${heightStyle}></iframe>
            ${!el.previewScript ? `<button type="button" class="ui-lib-preview-click-cover" data-el-action="fullscreen" aria-label="Open ${escapeHtml(el.name)} fullscreen interactive preview"></button>` : ''}
            <button type="button" class="ui-lib-expand-pill" data-el-action="fullscreen" aria-label="Fullscreen preview ${escapeHtml(el.name)}">
              <i data-lucide="maximize-2"></i><span>Fullscreen</span>
            </button>
          </div>`
        : `<div class="ui-lib-el-preview-wrap">
            <pre class="ui-lib-el-code-preview">${escapeHtml((el.code || '').slice(0, 600))}</pre>
            <button type="button" class="ui-lib-preview-click-cover" data-el-action="fullscreen" aria-label="Open ${escapeHtml(el.name)} fullscreen interactive preview"></button>
            <button type="button" class="ui-lib-expand-pill" data-el-action="fullscreen" aria-label="Fullscreen preview ${escapeHtml(el.name)}">
              <i data-lucide="maximize-2"></i><span>Fullscreen</span>
            </button>
          </div>`;

      return `
        <article class="ui-lib-el-card" data-el-id="${escapeHtml(el.id)}">
          ${previewMarkup}
          <div class="ui-lib-el-body">
            <div class="ui-lib-el-title-row">
              <button type="button" class="ui-lib-el-title-btn truncate" data-el-action="fullscreen" title="Open ${escapeHtml(el.name)} fullscreen preview">${escapeHtml(el.name)}</button>
              <span class="ui-lib-el-cat">${escapeHtml(catLabel)}</span>
            </div>
            <p class="ui-lib-el-desc">${escapeHtml(el.description || '')}</p>
            <div class="ui-lib-el-actions">
              <button type="button" class="btn btn-outline btn-sm" data-el-action="fullscreen">
                <i data-lucide="maximize-2"></i> Preview
              </button>
              <button type="button" class="btn btn-ghost btn-sm" data-el-action="inspect">Code</button>
              <button type="button" class="btn btn-ghost btn-sm" data-el-action="copy">Copy JSX</button>
              ${this.studio.activeProjectId
                ? '<button type="button" class="btn btn-primary btn-sm" data-el-action="insert">Insert</button>'
                : ''}
              ${!lib.isBuiltIn
                ? `<button type="button" class="icon-action-btn danger" data-el-action="delete" aria-label="Remove ${escapeHtml(el.name)}" style="margin-left:auto"><i data-lucide="trash-2"></i></button>`
                : ''}
            </div>
          </div>
        </article>`;
    }).join('');

    grid.querySelectorAll('.ui-lib-el-card').forEach((card) => {
      const el = filtered.find((item) => item.id === card.dataset.elId);
      if (!el) return;

      const iframe = card.querySelector('.ui-lib-el-preview-frame');
      if (iframe && el.previewHtml) {
        iframe.srcdoc = buildScopedPreviewSrcdoc(lib, el);
      }

      card.querySelectorAll('[data-el-action="fullscreen"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.openFullscreenPreview(lib, el, { initialMode: 'preview' });
        });
      });

      card.querySelector('[data-el-action="inspect"]')?.addEventListener('click', () => {
        this.openFullscreenPreview(lib, el, { initialMode: 'split' });
      });

      card.querySelector('[data-el-action="copy"]')?.addEventListener('click', () => {
        navigator.clipboard?.writeText(el.code || '').catch(() => {});
        this.studio.showToast(`Copied ${el.name} JSX`);
      });

      card.querySelector('[data-el-action="insert"]')?.addEventListener('click', () => {
        this.studio.insertUiElementIntoProject(lib, el);
      });

      card.querySelector('[data-el-action="delete"]')?.addEventListener('click', () => {
        this.manager.deleteElementFromLibrary(lib.id, el.id);
        this.render();
        this.studio.showToast(`Removed "${el.name}"`);
      });
    });

    this.studio._safeCreateIcons(grid);
  }

  _renderAwesomeCatalogGrid(grid, lib) {
    if (!this.awesomeResult && !this.awesomeLoading && !this.awesomeError) {
      this._loadAwesomeCatalog(false);
      return;
    }

    if (this.awesomeLoading && !this.awesomeResult) {
      grid.innerHTML = `
        <div class="home-empty-state" style="grid-column:1 / -1">
          <i data-lucide="loader-2"></i>
          <h3>Loading Awesome Components catalog…</h3>
          <p>Querying 6,345 indexed community UI components from wundercorp/awesome-components.</p>
        </div>`;
      this.studio._safeCreateIcons(grid);
      return;
    }

    if (this.awesomeError) {
      grid.innerHTML = `
        <div class="home-empty-state" style="grid-column:1 / -1">
          <i data-lucide="alert-circle"></i>
          <h3>Could not load catalog</h3>
          <p>${escapeHtml(this.awesomeError)}</p>
          <button type="button" class="btn btn-primary btn-sm" id="btnAwesomeRetry" style="margin-top:8px">Retry</button>
        </div>`;
      grid.querySelector('#btnAwesomeRetry')?.addEventListener('click', () => this._loadAwesomeCatalog(false));
      this.studio._safeCreateIcons(grid);
      return;
    }

    const res = this.awesomeResult || { items: [], total: 0, page: 1, totalPages: 1 };
    const items = Array.isArray(res.items) ? res.items : [];

    if (!items.length) {
      grid.innerHTML = `
        <div class="home-empty-state" style="grid-column:1 / -1">
          <i data-lucide="search"></i>
          <h3>No matching components</h3>
          <p>No components matched "${escapeHtml(this.awesomeQuery)}" in this category. Try another keyword or switch to All.</p>
          <button type="button" class="btn btn-outline btn-sm" id="btnAwesomeResetFilters" style="margin-top:8px">Reset Filters</button>
        </div>`;
      grid.querySelector('#btnAwesomeResetFilters')?.addEventListener('click', () => {
        this.awesomeQuery = '';
        this.selectedCategory = 'all';
        const input = document.getElementById('awesomeSearchInput');
        if (input) input.value = '';
        this._loadAwesomeCatalog(true);
      });
      this.studio._safeCreateIcons(grid);
      return;
    }

    const cardsHtml = items.map((item) => {
      const catLabel = UI_ELEMENT_CATEGORIES.find((c) => c.id === item.category)?.label || item.category;
      return `
        <article class="ui-lib-el-card ui-lib-awesome-card" data-awesome-id="${escapeHtml(item.id)}">
          <div class="ui-lib-awesome-thumb-wrap ui-lib-el-preview-wrap">
            <img class="ui-lib-awesome-thumb" src="${escapeHtml(item.screenshotUrl)}" alt="${escapeHtml(item.name)} preview" loading="lazy" decoding="async">
            <div class="ui-lib-awesome-fallback hidden">
              <span>${escapeHtml(item.name)}</span>
            </div>
            <button type="button" class="ui-lib-preview-click-cover" data-awesome-action="fullscreen" aria-label="Open ${escapeHtml(item.name)} fullscreen interactive preview"></button>
            <button type="button" class="ui-lib-expand-pill" data-awesome-action="fullscreen" aria-label="Fullscreen preview ${escapeHtml(item.name)}">
              <i data-lucide="maximize-2"></i><span>Interactive Preview</span>
            </button>
          </div>
          <div class="ui-lib-el-body">
            <div class="ui-lib-el-title-row">
              <button type="button" class="ui-lib-el-title-btn truncate" data-awesome-action="fullscreen" title="Open ${escapeHtml(item.name)} fullscreen preview">${escapeHtml(item.name)}</button>
              <span class="ui-lib-el-cat">${escapeHtml(catLabel)}</span>
            </div>
            <p class="ui-lib-el-desc">by ${escapeHtml(item.authorName)} · Tailwind / shadcn</p>
            <div class="ui-lib-el-actions">
              <button type="button" class="btn btn-outline btn-sm" data-awesome-action="fullscreen">
                <i data-lucide="maximize-2"></i> Preview
              </button>
              <button type="button" class="btn btn-ghost btn-sm" data-awesome-action="inspect">Code</button>
              <button type="button" class="btn btn-ghost btn-sm" data-awesome-action="copy-jsx">Copy JSX</button>
              ${this.studio.activeProjectId
                ? '<button type="button" class="btn btn-primary btn-sm" data-awesome-action="insert">Insert</button>'
                : ''}
            </div>
          </div>
        </article>`;
    }).join('');

    const totalPages = Math.max(1, Number(res.totalPages || 1));
    const currentPage = Math.max(1, Number(res.page || 1));
    const paginationHtml = `
      <div class="ui-lib-pagination" role="navigation" aria-label="Catalog pagination">
        <button type="button" class="btn btn-outline btn-sm" id="btnAwesomePrevPage" ${currentPage <= 1 || this.awesomeLoading ? 'disabled' : ''}>
          <i data-lucide="chevron-left"></i> Previous
        </button>
        <span class="ui-lib-pagination-info tabular-nums">
          Page ${currentPage.toLocaleString()} of ${totalPages.toLocaleString()} · ${Number(res.total || 0).toLocaleString()} component${res.total === 1 ? '' : 's'}
        </span>
        <button type="button" class="btn btn-outline btn-sm" id="btnAwesomeNextPage" ${currentPage >= totalPages || this.awesomeLoading ? 'disabled' : ''}>
          Next <i data-lucide="chevron-right"></i>
        </button>
      </div>
    `;

    grid.innerHTML = cardsHtml + paginationHtml;

    const runItemAction = async (item, btn, action) => {
      if (action === 'fullscreen') {
        this.openAwesomeFullscreenPreview(lib, item, { initialMode: 'preview' });
        return;
      }
      if (action === 'inspect') {
        this.openAwesomeFullscreenPreview(lib, item, { initialMode: 'split' });
        return;
      }
      const prevHtml = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Loading…';
      try {
        const detail = await this.manager.fetchAwesomeComponentDetail(item.id);
        const elementPayload = {
          id: detail.id,
          name: detail.name,
          category: detail.category,
          authorName: detail.authorName,
          repoUrl: detail.repoUrl,
          description: `Imported from wundercorp/awesome-components by ${detail.authorName}`,
          code: detail.jsxCode || '',
          prompt: detail.prompt || '',
          renderedHtml: detail.renderedHtml || '',
        };
        if (action === 'copy-jsx') {
          navigator.clipboard?.writeText(detail.jsxCode || '').catch(() => {});
          this.studio.showToast(`Copied ${item.name} JSX`);
        } else if (action === 'copy-prompt') {
          navigator.clipboard?.writeText(detail.prompt || '').catch(() => {});
          this.studio.showToast(`Copied ${item.name} prompt`);
        } else if (action === 'insert') {
          this.studio.insertUiElementIntoProject(lib, elementPayload);
        }
      } catch (err) {
        this.studio.showToast(err?.message || `Could not load ${item.name}`, true);
      } finally {
        btn.disabled = false;
        btn.innerHTML = prevHtml;
      }
    };

    grid.querySelectorAll('.ui-lib-awesome-card').forEach((card) => {
      const item = items.find((entry) => entry.id === card.dataset.awesomeId);
      if (!item) return;

      const img = card.querySelector('.ui-lib-awesome-thumb');
      const fallback = card.querySelector('.ui-lib-awesome-fallback');
      img?.addEventListener('error', () => {
        img.classList.add('hidden');
        fallback?.classList.remove('hidden');
      });

      card.querySelectorAll('[data-awesome-action]').forEach((actionBtn) => {
        actionBtn.addEventListener('click', () => {
          runItemAction(item, actionBtn, actionBtn.dataset.awesomeAction);
        });
      });
    });

    grid.querySelector('#btnAwesomePrevPage')?.addEventListener('click', () => {
      if (this.awesomePage > 1) {
        this.awesomePage -= 1;
        this._loadAwesomeCatalog(false);
        document.querySelector('.ui-lib-stage')?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    grid.querySelector('#btnAwesomeNextPage')?.addEventListener('click', () => {
      if (this.awesomePage < totalPages) {
        this.awesomePage += 1;
        this._loadAwesomeCatalog(false);
        document.querySelector('.ui-lib-stage')?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    this.studio._safeCreateIcons(grid);
  }

  _renderAiInstructionsList(container) {
    const templates = this.manager.getAiTemplates();
    if (!templates.length) {
      container.innerHTML = `
        <div class="home-empty-state ui-lib-ai-empty">
          <i data-lucide="bot"></i>
          <h3>No templates queued yet</h3>
          <p>Click <strong>Add Template</strong>, give it a name, and paste the prompt or component code. Add as many as you want — then tell the AI in chat to go through and import all of them.</p>
          <button type="button" class="btn btn-primary btn-sm" id="btnAiQueueEmptyAdd" style="margin-top:8px">
            <i data-lucide="plus"></i>
            <span>Add First Template</span>
          </button>
        </div>`;

      container.querySelector('#btnAiQueueEmptyAdd')?.addEventListener('click', () => {
        this.subpanelMode = 'ai-template-form';
        this.subpanelPayload = null;
        this._renderSubpanel();
        document.getElementById('aiTplName')?.focus();
      });
      this.studio._safeCreateIcons(container);
      return;
    }

    container.innerHTML = templates.map((tpl) => {
      const isExpanded = this.expandedAiTemplateIds.has(tpl.id);
      const lineCount = String(tpl.prompt || '').split(/\r?\n/).length;
      const charCount = String(tpl.prompt || '').length;
      const isImported = tpl.status === 'imported';
      const previewText = isExpanded
        ? tpl.prompt
        : tpl.prompt.length > 520
          ? `${tpl.prompt.slice(0, 520)}…`
          : tpl.prompt;

      return `
        <article class="ui-lib-ai-card" data-ai-tpl-id="${escapeHtml(tpl.id)}">
          <div class="ui-lib-ai-card-head">
            <div class="ui-lib-ai-card-title-wrap">
              <h4 class="ui-lib-ai-card-title">${escapeHtml(tpl.name)}</h4>
              <div class="ui-lib-ai-meta-row">
                <span class="ui-lib-ai-target">${escapeHtml(tpl.targetLibrary || '21st.dev')}</span>
                <span aria-hidden="true">·</span>
                <span class="ui-lib-ai-status ${isImported ? 'imported' : 'pending'}">${isImported ? 'Imported' : 'Pending Import'}</span>
                <span aria-hidden="true">·</span>
                <span class="tabular-nums">${lineCount} line${lineCount === 1 ? '' : 's'} · ${charCount.toLocaleString()} chars</span>
                ${tpl.updatedAt ? `<span aria-hidden="true">·</span><span>${escapeHtml(timeAgo(tpl.updatedAt))}</span>` : ''}
              </div>
            </div>
            <div class="ui-lib-ai-card-actions">
              ${tpl.prompt.length > 520 ? `
                <button type="button" class="btn btn-ghost btn-sm" data-ai-action="toggle-expand">
                  ${isExpanded ? 'Collapse' : 'Expand'}
                </button>` : ''}
              <button type="button" class="btn btn-outline btn-sm" data-ai-action="edit">Edit</button>
              <button type="button" class="btn btn-ghost btn-sm" data-ai-action="copy">Copy</button>
              <button type="button" class="icon-action-btn danger" data-ai-action="delete" aria-label="Delete ${escapeHtml(tpl.name)}">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
          <pre class="ui-lib-ai-prompt-preview ${isExpanded ? 'expanded' : ''}">${escapeHtml(previewText)}</pre>
        </article>`;
    }).join('');

    container.querySelectorAll('.ui-lib-ai-card').forEach((card) => {
      const tpl = templates.find((t) => t.id === card.dataset.aiTplId);
      if (!tpl) return;

      card.querySelector('[data-ai-action="toggle-expand"]')?.addEventListener('click', () => {
        if (this.expandedAiTemplateIds.has(tpl.id)) this.expandedAiTemplateIds.delete(tpl.id);
        else this.expandedAiTemplateIds.add(tpl.id);
        this._renderAiInstructionsList(container);
      });

      card.querySelector('[data-ai-action="edit"]')?.addEventListener('click', () => {
        this.subpanelMode = 'ai-template-form';
        this.subpanelPayload = tpl;
        this._renderSubpanel();
        document.getElementById('uiLibSubpanel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        document.getElementById('aiTplName')?.focus();
      });

      card.querySelector('[data-ai-action="copy"]')?.addEventListener('click', () => {
        navigator.clipboard?.writeText(tpl.prompt || '').catch(() => {});
        this.studio.showToast(`Copied prompt for "${tpl.name}"`);
      });

      card.querySelector('[data-ai-action="delete"]')?.addEventListener('click', async () => {
        await this.manager.deleteAiTemplate(tpl.id);
        if (this.subpanelPayload?.id === tpl.id) {
          this.subpanelMode = null;
          this.subpanelPayload = null;
        }
        this.render();
        this.studio.showToast(`Removed "${tpl.name}" from queue`);
      });
    });

    this.studio._safeCreateIcons(container);
  }
}
