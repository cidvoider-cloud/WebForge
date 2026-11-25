/**
 * WebForge Studio — UI Component Library Studio Modal Controller
 *
 * Powers the interactive 2-pane UI Library gallery: live-rendered scoped
 * component previews across 6 built-in style packs + custom/imported packs,
 * in-app authoring, GitHub component scanning, project extraction, and JSON I/O.
 */

import { escapeHtml, timeAgo } from './storage.mjs';
import { UI_ELEMENT_CATEGORIES, extractElementFromProjectFile, parseBulkAiTemplatesInput } from './ui-library.mjs';
import {
  HIDE_OTHER_SOURCES,
  WATERMELON_ONLY_MODE,
  PREFERRED_FALLBACK_LIBRARY_ID,
  VERIFICATION_STATUS,
  isLibraryArchived,
} from './ui-library-schema.mjs';
import { buildInteractivePreviewSrcdoc, isCanvasOnlySnapshot, isDarkSurfaceSnapshot, isMobileComponentSnapshot } from './ui-preview-builder.mjs';
import {
  WATERMELON_COLLECTIONS,
  WATERMELON_BLOCK_CATEGORIES,
  buildWatermelonStructuralThumbHtml,
  getWatermelonBlockCategoryForSlot,
  resourceToSkillDefinition,
} from './watermelon-ecosystem.mjs';

function formatSubCategoryLabel(slug = '') {
  return String(slug || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bOtp\b/g, 'OTP')
    .replace(/\bCta\b/g, 'CTA')
    .replace(/\bFaq\b/g, 'FAQ')
    .replace(/\bUi\b/g, 'UI')
    .trim();
}

function buildScopedPreviewSrcdoc(lib, element) {
  return buildInteractivePreviewSrcdoc({
    lib,
    element,
    theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
    animate: false,
    compactCard: true,
  });
}

export class UILibraryModalController {
  constructor(studio) {
    this.studio = studio;
    this.manager = studio.uiLibraryManager;
    this.selectedLibraryId = WATERMELON_ONLY_MODE
      ? 'watermelon-ui'
      : (this.manager.getActiveLibrary()?.id || PREFERRED_FALLBACK_LIBRARY_ID);
    this.viewMode = 'library'; // 'library' | 'ai-instructions'
    this.showIssuesView = false;
    this.issuesCache = new Map();
    this.issuesLoading = false;
    this.kitCheckInProgress = false;
    this.kitRepairing = false;
    this.kitProgressMessage = '';
    this.selectedCategory = 'all';
    this.selectedCollection = 'all'; // Watermelon UI official visual collections
    this.selectedBlockCategory = 'all'; // 22 Watermelon Block categories
    this.selectedSubCategory = 'all'; // Components / Animated sub-categories
    this.previewTheme = 'dark'; // Live preview canvas theme ('dark' | 'light')
    this._wmCollectionCounts = null;
    this._wmSubCatCache = {};
    this.pickerBlocksFirst = true;
    this.assembledBlocks = []; // Ordered section-by-section Page Assembler queue
    this.subpanelMode = null;
    this.subpanelPayload = null;
    this.expandedAiTemplateIds = new Set();
    this.awesomeQuery = '';
    this.awesomePage = 1;
    this.awesomeResult = null;
    this.awesomeLoading = false;
    this.awesomeError = '';
    this.remoteCatalogLoadedId = '';
    this.awesomeInspectTab = 'jsx'; // 'jsx' | 'prompt'
    this._awesomeDebounce = null;
    this._awesomeReqSeq = 0;
    this.fsLib = null;
    this.fsElement = null;
    this.fsMode = 'preview'; // 'preview' | 'split' | 'code'
    this.fsViewport = 'desktop'; // 'desktop' | 'tablet' | 'mobile'
    this.fsTheme = 'dark'; // 'dark' | 'light'
    this.fsCodeTab = 'jsx'; // 'jsx' | 'demo' | 'aux' | 'html' | 'html-dark' | 'prompt'
    this._fsReqSeq = 0;
    this._cardPreviewObserver = null;
    this._cardPreviewGen = 0;
    this.pickerContext = {
      mode: 'browse', // 'browse' | 'pick-slot' | 'attach-chat'
      slotId: '',
      slotLabel: '',
      chatTarget: 'ws',
      onPickSlot: null,
    };
    this._wired = false;
    this._previewMessageBound = false;
  }

  _buildWatermelonPreviewUrl(baseUrl = '', { mode = 'card', theme = 'dark' } = {}) {
    if (!baseUrl) return '';
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}mode=${encodeURIComponent(mode)}&theme=${encodeURIComponent(theme === 'light' ? 'light' : 'dark')}`;
  }

  _syncCanvasThemeButton() {
    const btn = document.getElementById('btnUiLibCanvasTheme');
    const label = document.getElementById('uiLibCanvasThemeLabel');
    if (label) label.textContent = this.previewTheme === 'dark' ? 'Light canvas' : 'Dark canvas';
    if (btn) {
      const icon = btn.querySelector('i, svg');
      if (icon) {
        const fresh = document.createElement('i');
        fresh.setAttribute('data-lucide', this.previewTheme === 'dark' ? 'sun' : 'moon');
        icon.replaceWith(fresh);
        this.studio._safeCreateIcons(btn);
      }
    }
  }

  _broadcastPreviewTheme(theme) {
    const grid = document.getElementById('uiLibElementsGrid');
    if (!grid) return;
    grid.querySelectorAll('.ui-lib-remote-stage').forEach((stage) => {
      stage.classList.toggle('is-light-canvas', theme === 'light');
    });
    grid.querySelectorAll('iframe.ui-lib-remote-live-iframe').forEach((frame) => {
      try {
        frame.contentWindow?.postMessage({ type: 'wf-theme', theme }, '*');
        frame.contentWindow?.postMessage({ type: 'wf-set-theme', theme }, '*');
      } catch {
        // Ignore cross-origin frame message errors
      }
    });
  }

  _resetPickerContext() {
    this.pickerContext = {
      mode: 'browse',
      slotId: '',
      slotLabel: '',
      chatTarget: 'ws',
      onPickSlot: null,
    };
  }

  _getPrimaryActionMeta() {
    if (this.pickerContext?.mode === 'pick-slot') {
      const slotName = this.pickerContext.slotLabel || 'Slot';
      return {
        label: `Select for ${slotName}`,
        shortLabel: 'Select',
        icon: 'check',
      };
    }
    return {
      label: 'Attach to Chat',
      shortLabel: 'Attach to Chat',
      icon: 'paperclip',
    };
  }

  _completePrimarySelection(lib, element) {
    if (!lib || !element) return;
    if (element.verificationStatus === VERIFICATION_STATUS.FAILED || element.status === VERIFICATION_STATUS.FAILED) {
      this.studio.showToast('Cannot attach a failed component. Open "Show issues" for details.', true);
      return;
    }
    const fsModal = document.getElementById('uiFullscreenPreviewModal');
    const libModal = document.getElementById('uiLibraryModal');

    if (this.pickerContext?.mode === 'pick-slot' && typeof this.pickerContext.onPickSlot === 'function') {
      const swatch = lib.swatches?.[2] || lib.swatches?.[0] || '#F59E0B';
      const payload = {
        id: String(element.id || `${lib.id}-${element.name || 'item'}`),
        libraryId: String(lib.id),
        libraryName: String(lib.name || lib.id),
        librarySwatch: swatch,
        name: String(element.name || 'Component'),
        category: String(element.category || this.pickerContext.slotId || 'component'),
        description: String(element.description || '').trim(),
        code: String(
          element.normalizedCode ||
          element.code ||
          element.jsxCode ||
          element.htmlCode ||
          element.renderedHtml ||
          element.previewHtml ||
          ''
        ).trim(),
        manifest: element.manifest || null,
        dependencies: element.dependencies || element.manifest?.dependencies || {},
        usageNotes: element.usageNotes || '',
        verificationStatus: element.verificationStatus || element.status || VERIFICATION_STATUS.VERIFIED,
      };
      const cb = this.pickerContext.onPickSlot;
      if (fsModal?.open) fsModal.close();
      if (libModal?.open) libModal.close();
      cb(payload);
      return;
    }

    const chatTarget = this.pickerContext?.mode === 'attach-chat'
      ? (this.pickerContext.chatTarget === 'home' ? 'home' : 'ws')
      : (this.studio.isHomeViewActive?.() ? 'home' : 'ws');

    if (fsModal?.open) fsModal.close();
    if (libModal?.open) libModal.close();
    this.studio.attachUiComponentToChat(chatTarget, lib, element);
  }

  _teardownCardPreviewObserver() {
    this._cardPreviewGen += 1;
    if (this._cardPreviewObserver) {
      try {
        this._cardPreviewObserver.disconnect();
      } catch {
        // Ignore
      }
      this._cardPreviewObserver = null;
    }
  }

  init() {
    if (this._wired) return;
    this._wired = true;

    document.getElementById('btnUiLibCanvasTheme')?.addEventListener('click', () => {
      this.previewTheme = this.previewTheme === 'dark' ? 'light' : 'dark';
      this._syncCanvasThemeButton();
      this._broadcastPreviewTheme(this.previewTheme);
    });

    document.getElementById('uiLibraryModal')?.addEventListener('close', () => {
      this._teardownCardPreviewObserver();
      this._resetPickerContext();
    });

    if (!this._previewMessageBound) {
      this._previewMessageBound = true;
      window.addEventListener('message', (event) => {
        const data = event?.data;
        if (!data || data.type !== 'wf-preview-status') return;
        const fsIframe = document.getElementById('uiFsIframe');
        if (fsIframe && event.source === fsIframe.contentWindow) {
          const loading = document.getElementById('uiFsLoading');
          if (loading) loading.classList.add('hidden');
          return;
        }
        const grid = document.getElementById('uiLibElementsGrid');
        if (!grid) return;
        const iframes = grid.querySelectorAll('iframe.ui-lib-remote-live-iframe');
        for (const frame of iframes) {
          if (frame.contentWindow === event.source) {
            const stage = frame.closest('.ui-lib-remote-stage');
            if (data.status === 'error') {
              stage?.classList.add('is-preview-error', 'is-runtime-error');
              const mid = stage?.querySelector('.ui-lib-remote-loader-mid');
              if (mid) {
                const msg = String(data.error || 'Preview failed to render');
                mid.innerHTML = `
                  <div class="ui-lib-card-error">
                    <i data-lucide="alert-circle"></i>
                    <span class="ui-lib-card-error-msg">${escapeHtml(msg)}</span>
                    <button type="button" class="btn btn-outline btn-xs ui-lib-retry-preview-btn">Retry</button>
                  </div>`;
                this.studio._safeCreateIcons(mid);
                mid.querySelector('.ui-lib-retry-preview-btn')?.addEventListener('click', (ev) => {
                  ev.stopPropagation();
                  stage.classList.remove('is-preview-error', 'is-runtime-error', 'is-loaded');
                  frame.classList.remove('is-ready');
                  mid.innerHTML = '<div class="ui-lib-skeleton-box"></div>';
                  const baseUrl = stage.dataset.wmViteUrl;
                  if (baseUrl) {
                    frame.src = `${this._buildWatermelonPreviewUrl(baseUrl, { mode: 'card', theme: this.previewTheme })}&_r=${Date.now()}`;
                  }
                });
              }
            } else {
              frame.classList.add('is-ready');
              stage?.classList.add('is-loaded');
              stage?.classList.remove('is-preview-error', 'is-runtime-error');
            }
            break;
          }
        }
      });
    }

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
        iframe?.contentWindow?.postMessage({ type: 'wf-replay' }, '*');
        iframe?.contentWindow?.postMessage({ type: 'wf-replay-animation' }, '*');
      } catch {
        this._renderFullscreenIframe();
      }
    });

    modal.querySelector('#btnUiFsTheme')?.addEventListener('click', () => {
      this.fsTheme = this.fsTheme === 'dark' ? 'light' : 'dark';
      this._syncFullscreenThemeButton();
      const iframe = document.getElementById('uiFsIframe');
      try {
        iframe?.contentWindow?.postMessage({ type: 'wf-theme', theme: this.fsTheme }, '*');
        iframe?.contentWindow?.postMessage({ type: 'wf-set-theme', theme: this.fsTheme }, '*');
      } catch {
        this._renderFullscreenIframe();
      }
    });

    const copyActiveCode = () => {
      const code = this._getFullscreenActiveCode();
      if (!code) return this.studio.showToast('No code available to copy', true);
      navigator.clipboard?.writeText(code).catch(() => {});
      const labelMap = {
        prompt: 'prompt',
        html: 'HTML',
        'html-dark': 'Dark HTML',
        demo: 'Demo TSX',
        jsx: this.fsLib?.catalogType === 'tsx' ? 'TSX' : 'JSX',
      };
      this.studio.showToast(`Copied ${this.fsElement?.name || 'component'} ${labelMap[this.fsCodeTab] || 'code'}`);
    };

    modal.querySelector('#btnUiFsCopy')?.addEventListener('click', copyActiveCode);
    modal.querySelector('#btnUiFsCodeCopy')?.addEventListener('click', copyActiveCode);

    modal.querySelector('#btnUiFsInsert')?.addEventListener('click', () => {
      if (!this.fsLib || !this.fsElement) return;
      this._completePrimarySelection(this.fsLib, this.fsElement);
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
    if (this.fsCodeTab === 'demo' && el.demoCode) return el.demoCode;
    if (this.fsCodeTab === 'aux' && Array.isArray(el.auxiliaryFiles) && el.auxiliaryFiles.length) {
      return el.auxiliaryFiles.map((f) => `// ─── ${f.path} ───\n${f.code}`).join('\n\n');
    }
    if (this.fsCodeTab === 'html-dark' && (el.darkHtmlCode || el.darkRenderedHtml)) {
      return el.darkHtmlCode || el.darkRenderedHtml;
    }
    if (this.fsCodeTab === 'html' && (el.htmlCode || el.renderedHtml || el.previewHtml)) {
      return el.htmlCode || el.renderedHtml || el.previewHtml;
    }
    return el.code || el.demoCode || el.renderedHtml || el.previewHtml || '';
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

    const hasShot = Boolean(this.fsElement?.screenshotUrl && !/^https?:\/\//i.test(this.fsElement.screenshotUrl));
    const isWmVite = this.fsElement?.previewRuntime === 'watermelon-vite';
    if (refModeBtn) refModeBtn.classList.toggle('hidden', !hasShot);
    if (buildAiBtn) buildAiBtn.classList.toggle('hidden', isWmVite || !this.fsElement?.prompt);

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
    const isHtmlCatalog = this.fsLib?.catalogType === 'html';
    if (isHtmlCatalog && (el.htmlCode || el.renderedHtml)) {
      tabs.push({ id: 'html', label: el.darkHtmlCode || el.darkRenderedHtml ? 'HTML (Light)' : 'Tailwind HTML' });
      if (el.darkHtmlCode || el.darkRenderedHtml) {
        tabs.push({ id: 'html-dark', label: 'HTML (Dark)' });
      }
      if (el.code) tabs.push({ id: 'jsx', label: 'React JSX' });
    } else {
      if (el.code) tabs.push({ id: 'jsx', label: this.fsLib?.catalogType === 'tsx' ? 'React TSX' : 'React JSX' });
      if (el.demoCode && el.demoCode.trim() !== (el.code || '').trim()) {
        tabs.push({ id: 'demo', label: 'Demo Usage' });
      }
      if (Array.isArray(el.auxiliaryFiles) && el.auxiliaryFiles.length) {
        tabs.push({ id: 'aux', label: `Files (${el.auxiliaryFiles.length})` });
      }
      if (el.renderedHtml || el.previewHtml) tabs.push({ id: 'html', label: 'HTML Preview' });
    }
    if (el.prompt && tabs.length < 4) tabs.push({ id: 'prompt', label: 'Prompt' });
    if (!tabs.length) tabs.push({ id: 'jsx', label: 'Code' });

    if (!tabs.some((t) => t.id === this.fsCodeTab)) {
      this.fsCodeTab = tabs[0].id;
    }

    tabsEl.innerHTML = tabs.slice(0, 4).map((t) => `
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
        const linkLabel = repoLink.querySelector('span');
        if (linkLabel) linkLabel.textContent = el.previewRuntime === 'watermelon-vite' ? 'ui.watermelon.sh' : 'GitHub';
      } else {
        repoLink.classList.add('hidden');
      }
    }
  }

  _renderFullscreenIframe() {
    const iframe = document.getElementById('uiFsIframe');
    const loading = document.getElementById('uiFsLoading');
    if (!iframe || !this.fsElement) return;
    if (loading) loading.classList.remove('hidden');
    let settled = false;
    const clearLoading = () => {
      if (settled) return;
      settled = true;
      if (loading) loading.classList.add('hidden');
    };

    if (this.fsElement.previewRuntime === 'watermelon-vite' && this.fsElement.previewUrl) {
      iframe.removeAttribute('srcdoc');
      iframe.onload = () => setTimeout(clearLoading, 360);
      setTimeout(clearLoading, 2600);
      iframe.src = this._buildWatermelonPreviewUrl(this.fsElement.previewUrl, {
        mode: 'full',
        theme: this.fsTheme,
      });
      return;
    }

    iframe.removeAttribute('src');
    iframe.onload = () => setTimeout(clearLoading, 140);
    setTimeout(clearLoading, 1800);
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
      const actionMeta = this._getPrimaryActionMeta();
      insertBtn.classList.remove('hidden');
      insertBtn.innerHTML = `<i data-lucide="${actionMeta.icon}"></i><span>${escapeHtml(actionMeta.label)}</span>`;
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
    const isHtmlLib = lib.catalogType === 'html';
    const isTsxLib = lib.catalogType === 'tsx';
    const isWmVite = item.previewRuntime === 'watermelon-vite' && Boolean(item.previewUrl);
    this.fsLib = lib;
    this.fsElement = {
      id: item.id,
      name: item.name,
      category: item.category,
      collection: item.collection || '',
      wfCollection: item.wfCollection || '',
      subCategory: item.subCategory || '',
      blockCategory: item.blockCategory || '',
      previewRuntime: item.previewRuntime || '',
      previewUrl: item.previewUrl || '',
      dependencies: item.dependencies || [],
      authorName: item.authorName || lib.name,
      repoUrl: item.repoUrl || lib.sourceUrl,
      screenshotUrl: item.screenshotUrl || '',
      description: item.description || `Imported from ${lib.name}`,
      code: `// Loading component source from ${lib.name}…`,
      demoCode: '',
      auxiliaryFiles: [],
      sourcePath: item.sourcePath || '',
      prompt: '',
      renderedHtml: '',
      darkRenderedHtml: '',
    };
    this.fsMode = initialMode;
    this.fsViewport = 'desktop';
    this.fsCodeTab = isHtmlLib ? 'html' : 'jsx';
    this.fsTheme = isWmVite ? this.previewTheme : 'dark';

    const catLabel = item.subCategory
      ? formatSubCategoryLabel(item.subCategory)
      : (UI_ELEMENT_CATEGORIES.find((c) => c.id === item.category)?.label || item.category || 'UI');
    const titleEl = document.getElementById('uiFsTitle');
    const libBadge = document.getElementById('uiFsLibBadge');
    const catBadge = document.getElementById('uiFsCatBadge');
    const subEl = document.getElementById('uiFsSubline');
    const insertBtn = document.getElementById('btnUiFsInsert');
    const loading = document.getElementById('uiFsLoading');
    const iframe = document.getElementById('uiFsIframe');

    if (titleEl) titleEl.textContent = item.name;
    if (libBadge) libBadge.textContent = item.collection || lib.name;
    if (catBadge) catBadge.textContent = catLabel;
    if (subEl) {
      subEl.textContent = isWmVite
        ? (item.description || `${item.collection || 'Watermelon UI'} · Real React 19 + Motion live runtime`)
        : `${item.collection ? `${item.collection} · ` : ''}Fetching live preview & source from ${lib.name}…`;
    }
    if (insertBtn) {
      const actionMeta = this._getPrimaryActionMeta();
      insertBtn.classList.remove('hidden');
      insertBtn.innerHTML = `<i data-lucide="${actionMeta.icon}"></i><span>${escapeHtml(actionMeta.label)}</span>`;
    }

    this._syncFullscreenLayout();
    this._syncFullscreenThemeButton();
    this._renderFullscreenCodePane();

    // Mount real Watermelon Vite preview immediately without blocking on source fetch
    if (isWmVite) {
      this._renderFullscreenIframe();
    } else {
      if (iframe) {
        iframe.removeAttribute('src');
        iframe.srcdoc = '';
      }
      if (loading) loading.classList.remove('hidden');
    }

    if (!modal.open) modal.showModal();
    this.studio._safeCreateIcons(modal);

    try {
      const detail = await this.manager.fetchRemoteComponentDetail(lib.id, item.id);
      if (reqId !== this._fsReqSeq) return;

      const rawHtml = detail.renderedHtml || '';
      const darkHtml = detail.darkRenderedHtml || '';
      const canvasOnly = rawHtml ? isCanvasOnlySnapshot(rawHtml) : false;
      const mobileOnly = rawHtml ? isMobileComponentSnapshot(rawHtml, detail.name || item.name) : false;

      if (!isWmVite) {
        if (isHtmlLib) {
          this.fsTheme = darkHtml ? 'dark' : 'light';
          this.fsViewport = 'desktop';
        } else if (isTsxLib) {
          this.fsTheme = 'dark';
          this.fsViewport = 'desktop';
        } else {
          this.fsTheme = isDarkSurfaceSnapshot(rawHtml) ? 'dark' : 'light';
          this.fsViewport = mobileOnly ? 'mobile' : 'desktop';
        }
      }

      this.fsElement = {
        ...this.fsElement,
        id: detail.id,
        name: detail.name,
        category: detail.category,
        collection: detail.collection || item.collection || '',
        wfCollection: detail.wfCollection || item.wfCollection || '',
        subCategory: detail.subCategory || item.subCategory || '',
        blockCategory: detail.blockCategory || item.blockCategory || '',
        previewRuntime: detail.previewRuntime || item.previewRuntime || '',
        previewUrl: detail.previewUrl || item.previewUrl || '',
        authorName: detail.authorName || lib.name,
        repoUrl: detail.repoUrl || item.repoUrl || lib.sourceUrl,
        screenshotUrl: detail.screenshotUrl || item.screenshotUrl || '',
        description: detail.description || `Imported from ${lib.name}`,
        code: detail.code || detail.jsxCode || '',
        normalizedCode: detail.normalizedCode || detail.code || detail.jsxCode || '',
        demoCode: detail.demoCode || '',
        auxiliaryFiles: Array.isArray(detail.auxiliaryFiles) ? detail.auxiliaryFiles : [],
        sourcePath: detail.sourcePath || item.sourcePath || '',
        prompt: detail.prompt || '',
        promptCss: detail.promptCss || '',
        renderedHtml: rawHtml,
        darkRenderedHtml: darkHtml,
        htmlCode: detail.htmlCode || rawHtml,
        darkHtmlCode: detail.darkHtmlCode || darkHtml,
        manifest: detail.manifest || null,
        dependencies: detail.dependencies || detail.manifest?.dependencies || {},
        usageNotes: detail.usageNotes || '',
        verificationStatus: detail.verificationStatus || item.verificationStatus || VERIFICATION_STATUS.VERIFIED,
      };
      if (subEl) {
        if (isWmVite) {
          const depList = Array.isArray(detail.dependencies) ? detail.dependencies.slice(0, 4).join(', ') : '';
          subEl.textContent = depList
            ? `${detail.description || detail.collection || 'Watermelon UI'} · ${depList}`
            : (detail.description || `${detail.collection || 'Watermelon UI'} · Real interactive preview`);
        } else if (isHtmlLib) {
          subEl.textContent = darkHtml
            ? `${detail.collection || 'HyperUI'} · Pure Tailwind CSS (toggle Dark / Light for official variants)`
            : `${detail.collection || 'HyperUI'} · Live pure Tailwind CSS HTML preview`;
        } else if (isTsxLib) {
          subEl.textContent = detail.demoCode
            ? `${detail.collection || lib.name} · Live interactive React/TSX demo preview`
            : `${detail.collection || lib.name} · Live React/TSX sandbox preview`;
        } else {
          subEl.textContent = canvasOnly
            ? `by ${detail.authorName} · Canvas / WebGL capture (use Build with AI for live JS runtime)`
            : mobileOnly
              ? `by ${detail.authorName} · Mobile interactive preview`
              : `by ${detail.authorName} · Live interactive Tailwind preview`;
        }
      }
      this._syncFullscreenLayout();
      this._syncFullscreenThemeButton();
      this._renderFullscreenCodePane();
      if (!isWmVite) {
        this._renderFullscreenIframe();
      }
      this.studio._safeCreateIcons(modal);
    } catch (err) {
      if (reqId !== this._fsReqSeq) return;
      if (loading) loading.classList.add('hidden');
      this.studio.showToast(err?.message || `Could not load ${item.name}`, true);
      if (subEl) subEl.textContent = err?.message || 'Could not load component source';
    }
  }

  open(initialLibraryId = null, initialSubpanel = null, options = {}) {
    this.init();
    const opts = options && typeof options === 'object' ? options : {};
    const nextMode = opts.mode || 'browse';
    this.pickerContext = {
      mode: nextMode,
      slotId: opts.slotId || '',
      slotLabel: opts.slotLabel || '',
      chatTarget: opts.chatTarget || (this.studio.isHomeViewActive?.() ? 'home' : 'ws'),
      onPickSlot: typeof opts.onPickSlot === 'function' ? opts.onPickSlot : null,
    };

    const prevLibId = this.selectedLibraryId;
    if (WATERMELON_ONLY_MODE) {
      this.viewMode = 'library';
      this.showIssuesView = false;
      this.selectedLibraryId = 'watermelon-ui';
    } else if (initialLibraryId === 'ai-instructions') {
      this.viewMode = 'ai-instructions';
      this.showIssuesView = false;
    } else {
      this.viewMode = 'library';
      this.showIssuesView = false;
      if (initialLibraryId) {
        const requested = this.manager.getLibrary(initialLibraryId);
        if (requested && !isLibraryArchived(requested)) {
          this.selectedLibraryId = requested.id;
        } else {
          this.selectedLibraryId = this.manager.getActiveLibrary()?.id || PREFERRED_FALLBACK_LIBRARY_ID;
        }
      } else {
        const active = this.manager.getActiveLibrary();
        const current = this.manager.getLibrary(this.selectedLibraryId);
        if (active && !isLibraryArchived(active)) {
          this.selectedLibraryId = active.id;
        } else if (!current || isLibraryArchived(current)) {
          this.selectedLibraryId = PREFERRED_FALLBACK_LIBRARY_ID;
        }
      }
    }

    if (nextMode === 'pick-slot' && opts.slotId) {
      const slotCategoryMap = {
        navbar: 'navbar',
        hero: 'hero',
        cards: 'cards',
        footer: 'footer',
        features: 'all',
        cta: 'all',
      };
      this.pickerBlocksFirst = opts.blocksFirst !== false;
      this.selectedCategory = slotCategoryMap[opts.slotId] || 'all';
      this.selectedSubCategory = 'all';
      if (this.selectedLibraryId === 'watermelon-ui') {
        this.selectedCollection = this.pickerBlocksFirst ? 'blocks' : 'all';
        this.selectedBlockCategory = this.pickerBlocksFirst
          ? getWatermelonBlockCategoryForSlot(opts.slotId)
          : 'all';
      } else {
        this.selectedCollection = 'all';
        this.selectedBlockCategory = 'all';
      }
      this.awesomeQuery = '';
      this.awesomePage = 1;
      this.awesomeResult = null;
      this.remoteCatalogLoadedId = '';
    } else if (this.selectedLibraryId !== prevLibId) {
      this.selectedCategory = 'all';
      this.selectedCollection = opts.initialCollection || 'all';
      this.selectedBlockCategory = 'all';
      this.selectedSubCategory = 'all';
      this.awesomeQuery = '';
      this.awesomePage = 1;
      this.awesomeResult = null;
      this.remoteCatalogLoadedId = '';
    } else if (opts.initialCollection) {
      this.selectedCollection = opts.initialCollection;
      this.selectedBlockCategory = 'all';
      this.selectedSubCategory = 'all';
      this.awesomePage = 1;
      this.awesomeResult = null;
      this.remoteCatalogLoadedId = '';
    }

    this.subpanelMode = WATERMELON_ONLY_MODE ? null : (initialSubpanel || null);
    this.subpanelPayload = null;
    this._syncCanvasThemeButton();
    const dialog = document.getElementById('uiLibraryModal');
    if (dialog && !dialog.open) dialog.showModal();
    this.render();

    const fallbackNotice = this.manager.consumeActiveLibraryFallbackNotice();
    if (fallbackNotice?.message) {
      this.studio.showToast(fallbackNotice.message);
      this.studio.syncUiLibraryIndicators();
    }

    this._checkPreviewKitOnOpen();
  }

  async _checkPreviewKitOnOpen() {
    if (this.kitCheckInProgress) return;
    const isFirstCheck = !this.manager.previewKitStatus;
    if (isFirstCheck) {
      this.kitCheckInProgress = true;
      this.kitProgressMessage = 'Checking local Preview Kit runtime…';
      this._renderDetailHeader();
    }
    try {
      await this.manager.fetchPreviewKitStatus();
    } finally {
      this.kitCheckInProgress = false;
      this.kitProgressMessage = '';
      if (document.getElementById('uiLibraryModal')?.open) {
        this._renderSidebar();
        this._renderDetailHeader();
        this._updateSearchBarMeta();
        this.studio.syncUiLibraryIndicators();
      }
    }
  }

  async _runRepairPreviewEnvironment() {
    if (this.kitRepairing) return;
    this.kitRepairing = true;
    this.kitProgressMessage = 'Verifying Preview Kit assets and refreshing cache…';
    this._renderDetailHeader();
    try {
      const res = await this.manager.repairPreviewKit();
      this.issuesCache.clear();
      this.remoteCatalogLoadedId = '';
      this.awesomeResult = null;
      if (res?.kit?.ready) {
        this.studio.showToast('Preview environment verified and ready.');
      } else {
        this.studio.showToast('Preview Kit has missing assets. Check local vendor bundle.', true);
      }
      this.render();
      this.studio.syncUiLibraryIndicators();
    } catch (err) {
      this.studio.showToast(err?.message || 'Could not repair preview environment', true);
    } finally {
      this.kitRepairing = false;
      this.kitProgressMessage = '';
      this._renderDetailHeader();
    }
  }

  openSaveActiveFileFlow(filePath, fileCode) {
    this.init();
    this._resetPickerContext();
    this.viewMode = 'library';
    const extracted = extractElementFromProjectFile(filePath, fileCode);
    const active = this.manager.getActiveLibrary();
    if (active) this.selectedLibraryId = active.id;
    this.subpanelMode = 'add-element';
    this.subpanelPayload = extracted;
    this.render();
    document.getElementById('uiLibraryModal')?.showModal();
  }

  _renderContextBanner() {
    const banner = document.getElementById('uiLibContextBanner');
    if (!banner) return;
    const mode = this.pickerContext?.mode || 'browse';
    if (mode === 'pick-slot') {
      const slotName = this.pickerContext.slotLabel || 'Section';
      banner.classList.remove('hidden');
      banner.innerHTML = `
        <div class="ui-lib-ctx-left">
          <span class="ui-lib-ctx-icon"><i data-lucide="layers"></i></span>
          <div class="ui-lib-ctx-copy">
            <strong>Selecting ${escapeHtml(slotName)} component for Mix &amp; Match</strong>
            <span>Full-width page Blocks are prioritized first — preview live across libraries, then click <strong>Select</strong>.</span>
          </div>
        </div>
        <div class="ui-lib-ctx-actions">
          <div class="ui-lib-scope-seg" role="group" aria-label="Component ranking scope">
            <button type="button" class="ui-lib-scope-btn ${this.pickerBlocksFirst ? 'active' : ''}" data-ctx-scope="blocks">Blocks First</button>
            <button type="button" class="ui-lib-scope-btn ${!this.pickerBlocksFirst ? 'active' : ''}" data-ctx-scope="all">All UI</button>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" id="btnUiLibCtxCancel">Back to Prompt Studio</button>
        </div>
      `;
      banner.querySelectorAll('[data-ctx-scope]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const nextBlocksFirst = btn.dataset.ctxScope === 'blocks';
          if (nextBlocksFirst === this.pickerBlocksFirst) return;
          this.pickerBlocksFirst = nextBlocksFirst;
          if (this.selectedLibraryId === 'watermelon-ui') {
            this.selectedCollection = nextBlocksFirst ? 'blocks' : 'all';
            this.selectedBlockCategory = nextBlocksFirst
              ? getWatermelonBlockCategoryForSlot(this.pickerContext.slotId)
              : 'all';
          }
          this._renderContextBanner();
          this._renderCollectionBar();
          this._renderCategoryBar();
          this._loadAwesomeCatalog(true);
        });
      });
      banner.querySelector('#btnUiLibCtxCancel')?.addEventListener('click', () => {
        document.getElementById('uiLibraryModal')?.close();
      });
      return;
    }
    if (mode === 'attach-chat') {
      const targetLabel = this.pickerContext.chatTarget === 'home' ? 'Home prompt' : 'Workspace chat';
      banner.classList.remove('hidden');
      banner.innerHTML = `
        <div class="ui-lib-ctx-left">
          <span class="ui-lib-ctx-icon"><i data-lucide="paperclip"></i></span>
          <div class="ui-lib-ctx-copy">
            <strong>Attach UI component to ${escapeHtml(targetLabel)}</strong>
            <span>Choose any component to attach as a prompt reference chip (like an image) — your project files stay untouched until you send.</span>
          </div>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="btnUiLibCtxCancel">Done</button>
      `;
      banner.querySelector('#btnUiLibCtxCancel')?.addEventListener('click', () => {
        document.getElementById('uiLibraryModal')?.close();
      });
      return;
    }
    banner.classList.add('hidden');
    banner.innerHTML = '';
  }

  render() {
    this._renderSidebar();
    this._renderContextBanner();
    this._renderDetailHeader();
    this._renderCollectionBar();
    this._renderSearchBar();
    this._renderCategoryBar();
    this._renderSubpanel();
    this._renderElementsGrid();
    this._renderAssemblerTray();
    const modal = document.getElementById('uiLibraryModal');
    if (modal) this.studio._safeCreateIcons(modal);
  }

  async _loadAwesomeCatalog(resetPage = false) {
    const lib = this._getSelectedLibrary();
    if (!lib?.isRemoteCatalog) return;
    if (resetPage) {
      this.awesomePage = 1;
      this.awesomeResult = null;
    }
    const targetCatalogId = lib.id;
    const isWatermelon = targetCatalogId === 'watermelon-ui';
    const reqId = ++this._awesomeReqSeq;
    this.remoteCatalogLoadedId = targetCatalogId;
    this.awesomeLoading = true;
    this.awesomeError = '';
    this._teardownCardPreviewObserver();
    this._renderElementsGrid();
    try {
      const useSubCat = isWatermelon && (this.selectedCollection === 'components' || this.selectedCollection === 'animated');
      const result = await this.manager.queryRemoteCatalog(targetCatalogId, {
        q: this.awesomeQuery,
        category: isWatermelon ? 'all' : this.selectedCategory,
        collection: isWatermelon ? this.selectedCollection : 'all',
        blockCategory: isWatermelon && this.selectedCollection === 'blocks' ? this.selectedBlockCategory : 'all',
        subCategory: useSubCat ? this.selectedSubCategory : 'all',
        blocksFirst: this.pickerContext?.mode === 'pick-slot' && this.pickerBlocksFirst,
        page: this.awesomePage,
        limit: 24,
      });
      if (reqId !== this._awesomeReqSeq || this._getSelectedLibrary()?.id !== targetCatalogId) return;
      this.awesomeResult = result;
      this.awesomePage = result.page || 1;
      this.awesomeLoading = false;
      if (isWatermelon && result.collectionCounts && !this.awesomeQuery) {
        this._wmCollectionCounts = result.collectionCounts;
      }
      if (isWatermelon && result.subCategoryCounts && this.selectedSubCategory === 'all') {
        this._wmSubCatCache[this.selectedCollection] = result.subCategoryCounts;
      }
      this._renderSidebar();
      this._renderDetailHeader();
      this._updateSearchBarMeta();
      this._renderCollectionBar();
      this._renderCategoryBar();
      this._renderElementsGrid();
      this._renderAssemblerTray();
      const modal = document.getElementById('uiLibraryModal');
      if (modal) this.studio._safeCreateIcons(modal);
    } catch (err) {
      if (reqId !== this._awesomeReqSeq) return;
      this.awesomeLoading = false;
      this.awesomeError = err?.message || `Could not load ${lib.name} catalog`;
      this._renderElementsGrid();
    }
  }

  _updateSearchBarMeta() {
    const metaEl = document.getElementById('awesomeSearchMeta');
    const clearBtn = document.getElementById('btnAwesomeSearchClear');
    const lib = this._getSelectedLibrary();
    const verifiedFallback = this.manager.getVerifiedCount(lib);
    if (clearBtn) clearBtn.classList.toggle('hidden', !this.awesomeQuery);
    if (!metaEl) return;
    if (this.awesomeLoading && !this.awesomeResult) {
      metaEl.textContent = 'Loading verified catalog…';
      return;
    }
    const res = this.awesomeResult;
    if (!res || this.remoteCatalogLoadedId !== lib?.id) {
      metaEl.textContent = `${verifiedFallback.toLocaleString()} verified components`;
      return;
    }
    const total = Number(res.total || 0);
    const verifiedTotal = Number(res.verifiedCount ?? res.catalogTotal ?? verifiedFallback);
    const isWatermelonSubView =
      lib?.id === 'watermelon-ui' && this.selectedCollection && this.selectedCollection !== 'all';
    const activeScopeTotal = isWatermelonSubView
      ? Number(this._wmCollectionCounts?.[this.selectedCollection] ?? total)
      : verifiedTotal;
    if (
      this.awesomeQuery ||
      this.selectedCategory !== 'all' ||
      this.selectedSubCategory !== 'all' ||
      this.selectedBlockCategory !== 'all'
    ) {
      metaEl.textContent = `${total.toLocaleString()} of ${activeScopeTotal.toLocaleString()} matches`;
    } else {
      metaEl.textContent = `${total.toLocaleString()} verified · Page ${res.page || 1} of ${res.totalPages || 1}`;
    }
  }

  _renderSearchBar() {
    const bar = document.getElementById('uiLibSearchBar');
    if (!bar) return;
    const lib = this._getSelectedLibrary();
    if (this.viewMode !== 'library' || this.showIssuesView || !lib?.isRemoteCatalog) {
      bar.classList.add('hidden');
      bar.innerHTML = '';
      return;
    }
    bar.classList.remove('hidden');
    const placeholderByLib = {
      'watermelon-ui': 'Search verified Watermelon UI components, blocks & animated UI…',
      'kokonut-ui': 'Search verified Kokonut UI components (e.g. ai, card, drawer, button)…',
      hyperui: 'Search verified HyperUI Tailwind blocks (e.g. pricing, header, hero, marketing)…',
      'shadcn-ui': 'Search verified shadcn/ui v4 primitives, examples & blocks…',
      'awesome-components': 'Search verified Awesome Components (e.g. hero, bento, pricing, card)…',
    };
    const nextPlaceholder = placeholderByLib[lib.id] || `Search verified ${lib.name} components…`;

    if (!bar.querySelector('#awesomeSearchInput')) {
      bar.innerHTML = `
        <div class="ui-lib-search-input-wrap">
          <i data-lucide="search" class="ui-lib-search-icon"></i>
          <input type="text" id="awesomeSearchInput" placeholder="${escapeHtml(nextPlaceholder)}" autocomplete="off" aria-label="Search ${escapeHtml(lib.name)} catalog" value="${escapeHtml(this.awesomeQuery)}">
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
      if (input) {
        input.placeholder = nextPlaceholder;
        input.setAttribute('aria-label', `Search ${lib.name} catalog`);
        if (document.activeElement !== input && input.value !== this.awesomeQuery) {
          input.value = this.awesomeQuery;
        }
      }
    }
    this._updateSearchBarMeta();
  }

  _getSelectedLibrary() {
    const visible = this.manager.getVisibleLibraries();
    const direct = this.manager.getLibrary(this.selectedLibraryId);
    if (direct && !isLibraryArchived(direct)) return direct;
    return (
      visible.find((l) => l.id === PREFERRED_FALLBACK_LIBRARY_ID) ||
      visible[0] ||
      this.manager.getAllLibraries()[0]
    );
  }

  _renderSidebar() {
    const listEl = document.getElementById('uiLibSidebarList');
    if (!listEl) return;

    if (WATERMELON_ONLY_MODE) {
      const wmLib = this.manager.getLibrary('watermelon-ui');
      const colCounts =
        this._wmCollectionCounts ||
        (this.remoteCatalogLoadedId === 'watermelon-ui' ? this.awesomeResult?.collectionCounts : null);
      const fallbackAll = this.manager.getVerifiedCount(wmLib) || Number(wmLib?.catalogCount || 849);

      listEl.innerHTML = `
        <div class="ui-lib-wm-brand">
          <div class="ui-lib-wm-brand-row">
            <span class="ui-lib-pack-dot" style="background:#10B981"></span>
            <span class="ui-lib-wm-brand-title">Watermelon UI</span>
          </div>
          <span class="ui-lib-wm-brand-sub">ui.watermelon.sh</span>
        </div>
        <div class="ui-lib-rail-label">Collections</div>
        ${WATERMELON_COLLECTIONS.map((col) => {
          const isSelected = !this.showIssuesView && this.selectedCollection === col.id;
          const rawCount = colCounts && colCounts[col.id] !== undefined
            ? Number(colCounts[col.id])
            : (col.id === 'all' ? fallbackAll : null);
          return `
            <button
              type="button"
              class="ui-lib-pack-item ${isSelected ? 'selected' : ''}"
              data-wm-rail-col="${escapeHtml(col.id)}"
              aria-current="${isSelected ? 'page' : 'false'}"
              title="${escapeHtml(col.desc)}"
            >
              <span class="ui-lib-pack-item-left">
                <i data-lucide="${escapeHtml(col.icon)}" style="width:14px;height:14px;opacity:0.82;flex-shrink:0"></i>
                <span class="truncate">${escapeHtml(col.label)}</span>
              </span>
              ${rawCount !== null ? `<span class="ui-lib-pack-count tabular-nums">${rawCount.toLocaleString()}</span>` : ''}
            </button>
          `;
        }).join('')}
      `;

      listEl.querySelectorAll('[data-wm-rail-col]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const nextCol = btn.dataset.wmRailCol || 'all';
          const changed = nextCol !== this.selectedCollection || this.showIssuesView || this.viewMode !== 'library';
          this.viewMode = 'library';
          this.showIssuesView = false;
          this.selectedLibraryId = 'watermelon-ui';
          this.selectedCollection = nextCol;
          this.selectedCategory = 'all';
          this.selectedSubCategory = 'all';
          this.selectedBlockCategory = 'all';
          this.subpanelMode = null;
          this.subpanelPayload = null;
          if (changed) {
            this._teardownCardPreviewObserver();
            this._renderSidebar();
            this._renderDetailHeader();
            this._renderCategoryBar();
            this._loadAwesomeCatalog(true);
            document.querySelector('.ui-lib-stage')?.scrollTo({ top: 0, behavior: 'auto' });
          }
        });
      });
      this.studio._safeCreateIcons(listEl);
      return;
    }

    const visible = this.manager.getVisibleLibraries();
    const remoteCatalogs = visible.filter((l) => l.isBuiltIn && l.isRemoteCatalog);
    const designMdPresets = HIDE_OTHER_SOURCES
      ? []
      : visible.filter((l) => l.isBuiltIn && !l.isRemoteCatalog && l.isDesignMdPreset);
    const builtIns = HIDE_OTHER_SOURCES
      ? []
      : visible.filter((l) => l.isBuiltIn && !l.isRemoteCatalog && !l.isDesignMdPreset);
    const customs = visible.filter((l) => !l.isBuiltIn);
    const activeId = this.manager.activeLibraryId;
    const pendingAiCount = this.manager.getPendingAiTemplatesCount();
    const totalAiCount = this.manager.getAiTemplates().length;

    const renderPackBtn = (lib) => {
      const isSelected = this.viewMode === 'library' && lib.id === this.selectedLibraryId;
      const isActive = lib.id === activeId;
      const dotColor = lib.swatches?.[2] || lib.swatches?.[0] || '#FAFAFA';
      const verifiedCount = this.manager.getVerifiedCount(lib);
      const countBadge = !isActive
        ? `<span class="ui-lib-pack-count tabular-nums" title="${verifiedCount} verified components">${verifiedCount.toLocaleString()}</span>`
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
          <span class="truncate">No AI Library</span>
        </span>
        ${activeId === 'none' ? '<span class="ui-lib-active-mark">ACTIVE</span>' : ''}
      </button>
      <div class="ui-lib-rail-label">Indexed UI Libraries (${remoteCatalogs.length})</div>
      ${remoteCatalogs.map(renderPackBtn).join('')}
      ${designMdPresets.length ? `<div class="ui-lib-rail-label">DESIGN.md Systems (${designMdPresets.length})</div>${designMdPresets.map(renderPackBtn).join('')}` : ''}
      ${builtIns.length ? `<div class="ui-lib-rail-label">Built-in Style Packs (${builtIns.length})</div>${builtIns.map(renderPackBtn).join('')}` : ''}
      ${customs.length ? `<div class="ui-lib-rail-label">Custom &amp; Imported (${customs.length})</div>${customs.map(renderPackBtn).join('')}` : ''}
    `;

    listEl.querySelector('[data-action="open-ai-instructions"]')?.addEventListener('click', () => {
      this.viewMode = 'ai-instructions';
      this.showIssuesView = false;
      this.subpanelMode = null;
      this.subpanelPayload = null;
      this.render();
    });

    listEl.querySelector('[data-action="disable-ai-lib"]')?.addEventListener('click', () => {
      this.viewMode = 'library';
      this.showIssuesView = false;
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
        this.showIssuesView = false;
        this.selectedLibraryId = nextId;
        this.selectedCategory = 'all';
        this.selectedSubCategory = 'all';
        this.selectedBlockCategory = 'all';
        if (nextId === 'watermelon-ui' && this.pickerContext?.mode === 'pick-slot' && this.pickerBlocksFirst) {
          this.selectedCollection = 'blocks';
          this.selectedBlockCategory = getWatermelonBlockCategoryForSlot(this.pickerContext.slotId);
        } else {
          this.selectedCollection = 'all';
        }
        this.subpanelMode = null;
        this.subpanelPayload = null;
        if (changed) {
          this.awesomeQuery = '';
          this.awesomePage = 1;
          this.awesomeResult = null;
          this.awesomeError = '';
          this.remoteCatalogLoadedId = '';
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
          <p>Queue custom UI names &amp; code here. Items sync non-destructively between your browser and workspace, and can be imported directly into your UI Library in one click.</p>
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
          <button type="button" class="btn btn-outline btn-sm" id="btnAiQueueBulkPaste">
            <i data-lucide="layers"></i>
            <span>Bulk Paste</span>
          </button>
          ${pendingCount > 0 ? `
            <button type="button" class="btn btn-outline btn-sm" id="btnAiQueueImportAll">
              <i data-lucide="package-plus"></i>
              <span>Import All (${pendingCount})</span>
            </button>` : ''}
          <button type="button" class="btn btn-ghost btn-sm" id="btnAiQueueCopyAll" ${pendingCount === 0 ? 'disabled' : ''}>
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

      head.querySelector('#btnAiQueueBulkPaste')?.addEventListener('click', () => {
        this.subpanelMode = this.subpanelMode === 'ai-bulk-import' ? null : 'ai-bulk-import';
        this.subpanelPayload = null;
        this._renderSubpanel();
        if (this.subpanelMode === 'ai-bulk-import') {
          document.getElementById('aiBulkPasteInput')?.focus();
        }
      });

      head.querySelector('#btnAiQueueImportAll')?.addEventListener('click', async () => {
        const pending = this.manager.getAiTemplates().filter((t) => t.status !== 'imported');
        if (!pending.length) return;
        let importedOk = 0;
        let lastLib = null;
        for (const tpl of pending) {
          try {
            const res = await this.manager.importAiTemplateToLibrary(tpl.id);
            lastLib = res.library;
            importedOk += 1;
          } catch {
            // Skip individual malformed item
          }
        }
        this.studio.syncUiLibraryIndicators();
        this.render();
        if (importedOk > 0) {
          this.studio.showToast(`Imported ${importedOk} component${importedOk === 1 ? '' : 's'} into ${lastLib?.name || 'your UI Library'}`);
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
    const stats = this.manager.getLibraryStats(lib.id);
    const verifiedCount = isRemote
      ? Number((this.remoteCatalogLoadedId === lib.id ? this.awesomeResult?.verifiedCount : null) ?? stats.verifiedCount ?? 0)
      : this.manager.getVerifiedCount(lib);
    const degradedCount = isRemote ? Number(stats.degradedCount || 0) : 0;
    const failedCount = isRemote
      ? Number(stats.failedCount || 0)
      : (lib.elements || []).filter((e) => (e.status || e.verificationStatus) === VERIFICATION_STATUS.FAILED).length;
    const countLabel = `${verifiedCount.toLocaleString()} verified${degradedCount > 0 ? ` · ${degradedCount} degraded` : ''}`;

    const showKitProgress = this.kitCheckInProgress || this.kitRepairing;
    const kitUnhealthy = Boolean(this.manager.previewKitStatus && !this.manager.previewKitStatus.ready && !showKitProgress);
    const kitBannerHtml = showKitProgress
      ? `<div class="ui-lib-kit-progress" role="status" aria-live="polite">
          <div class="ui-lib-kit-progress-bar"></div>
          <span>${escapeHtml(this.kitProgressMessage || 'Preparing local Preview Kit…')}</span>
        </div>`
      : kitUnhealthy
        ? `<div class="ui-lib-kit-warning" role="alert">
            <i data-lucide="alert-triangle"></i>
            <span>Local Preview Kit needs repair (${(this.manager.previewKitStatus?.missingAssets || []).length} asset issue).</span>
            <button type="button" class="btn btn-outline btn-sm" id="btnUiLibBannerRepair">Repair</button>
          </div>`
        : '';

    const isWatermelonFocused = WATERMELON_ONLY_MODE && lib.id === 'watermelon-ui';
    const activeColMeta = isWatermelonFocused
      ? (WATERMELON_COLLECTIONS.find((c) => c.id === this.selectedCollection) || WATERMELON_COLLECTIONS[0])
      : null;
    const activeColCount = isWatermelonFocused && this._wmCollectionCounts && this._wmCollectionCounts[this.selectedCollection] !== undefined
      ? Number(this._wmCollectionCounts[this.selectedCollection])
      : verifiedCount;
    const detailHeading = isWatermelonFocused
      ? (this.showIssuesView
          ? 'Preview issues'
          : (this.selectedCollection === 'all' ? 'All Components' : activeColMeta.label))
      : lib.name;
    const detailSubcopy = isWatermelonFocused
      ? (this.showIssuesView
          ? 'Components that failed runtime verification are hidden from the grid.'
          : (activeColMeta?.desc || lib.tagline || ''))
      : (lib.tagline || '');
    const metaLineHtml = isWatermelonFocused
      ? `<div class="ui-lib-swatches">
           <span class="tabular-nums">${activeColCount.toLocaleString()} verified</span>
           <span aria-hidden="true">·</span>
           <span>React 19</span>
           <span aria-hidden="true">·</span>
           <span>Motion</span>
           <span aria-hidden="true">·</span>
           <span>Tailwind v4</span>
         </div>`
      : `<div class="ui-lib-swatches">
           <span class="ui-lib-swatch-strip">${swatchesHtml}</span>
           <span>${escapeHtml(lib.fontsLabel || 'Custom typography')}</span>
           <span aria-hidden="true">·</span>
           <span class="tabular-nums">${escapeHtml(countLabel)}</span>
         </div>`;

    head.innerHTML = `
      <div class="ui-lib-detail-top-row">
        <div class="ui-lib-detail-copy">
          <h3>${escapeHtml(detailHeading)}</h3>
          <p>${escapeHtml(detailSubcopy)}</p>
          ${metaLineHtml}
        </div>
        <div class="ui-lib-detail-actions">
          <button type="button" class="btn ${isActive ? 'btn-outline' : 'btn-primary'} btn-sm" id="btnUiLibActivateAi">
            <i data-lucide="${isActive ? 'check-circle-2' : 'sparkles'}"></i>
            <span>${isActive ? 'Active for AI' : 'Activate for AI'}</span>
          </button>
          ${this.studio.activeProjectId ? `
            <button type="button" class="btn btn-outline btn-sm" id="btnUiLibApplyProject" title="Bundle tokens into current project">
              <i data-lucide="package-plus"></i>
              <span>Apply Kit</span>
            </button>` : ''}
          ${!isRemote ? `
            <button type="button" class="btn btn-outline btn-sm" id="btnUiLibAddElement">
              <i data-lucide="plus"></i>
              <span>Add Element</span>
            </button>` : ''}
          <div class="ui-lib-more-wrap">
            <button type="button" class="icon-action-btn ${this.showIssuesView ? 'is-active' : ''}" id="btnUiLibMoreMenu" aria-haspopup="menu" aria-expanded="false" aria-label="Library actions" title="More library actions">
              <i data-lucide="more-horizontal"></i>
            </button>
            <div class="ui-lib-more-menu hidden" id="uiLibMoreMenu" role="menu">
              <button type="button" class="ui-lib-more-item" role="menuitem" id="btnUiLibToggleIssues">
                <i data-lucide="${this.showIssuesView ? 'layout-grid' : 'alert-circle'}"></i>
                <span>${this.showIssuesView ? 'Back to verified' : `Show issues${failedCount > 0 ? ` (${failedCount})` : ''}`}</span>
              </button>
              <button type="button" class="ui-lib-more-item" role="menuitem" id="btnUiLibRepairKit" ${this.kitRepairing ? 'disabled' : ''}>
                <i data-lucide="wrench"></i>
                <span>Repair preview runtime</span>
              </button>
              ${isWatermelonFocused ? `
                <a class="ui-lib-more-item" role="menuitem" href="https://ui.watermelon.sh" target="_blank" rel="noopener noreferrer">
                  <i data-lucide="external-link"></i>
                  <span>Open ui.watermelon.sh</span>
                </a>` : (isRemote && lib.sourceUrl ? `
                <a class="ui-lib-more-item" role="menuitem" href="${escapeHtml(lib.sourceUrl)}" target="_blank" rel="noopener noreferrer">
                  <i data-lucide="external-link"></i>
                  <span>Open source repository</span>
                </a>` : '')}
              ${!isRemote ? `
                <button type="button" class="ui-lib-more-item" role="menuitem" id="btnUiLibExportJson">
                  <i data-lucide="download"></i>
                  <span>Export JSON</span>
                </button>` : ''}
              ${!lib.isBuiltIn ? `
                <button type="button" class="ui-lib-more-item danger" role="menuitem" id="btnUiLibDeletePack">
                  <i data-lucide="trash-2"></i>
                  <span>Delete library</span>
                </button>` : ''}
            </div>
          </div>
        </div>
      </div>
      ${kitBannerHtml}
    `;

    const moreBtn = head.querySelector('#btnUiLibMoreMenu');
    const moreMenu = head.querySelector('#uiLibMoreMenu');
    const closeMore = () => {
      if (moreMenu) moreMenu.classList.add('hidden');
      moreBtn?.setAttribute('aria-expanded', 'false');
    };
    moreBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = moreMenu?.classList.contains('hidden');
      moreMenu?.classList.toggle('hidden', !willOpen);
      moreBtn.setAttribute('aria-expanded', String(Boolean(willOpen)));
    });
    if (moreMenu) {
      const onDocClick = (ev) => {
        if (!head.contains(ev.target)) {
          closeMore();
          document.removeEventListener('click', onDocClick);
        }
      };
      moreBtn?.addEventListener('click', () => {
        document.removeEventListener('click', onDocClick);
        if (!moreMenu.classList.contains('hidden')) {
          setTimeout(() => document.addEventListener('click', onDocClick), 0);
        }
      });
    }

    head.querySelector('#btnUiLibToggleIssues')?.addEventListener('click', () => {
      closeMore();
      this.showIssuesView = !this.showIssuesView;
      this.render();
    });

    head.querySelector('#btnUiLibRepairKit')?.addEventListener('click', () => {
      closeMore();
      this._runRepairPreviewEnvironment();
    });

    head.querySelector('#btnUiLibBannerRepair')?.addEventListener('click', () => {
      this._runRepairPreviewEnvironment();
    });

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
      closeMore();
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
      closeMore();
      const ok = await this.studio.openAppPromptModal({
        title: 'Delete UI Library',
        message: `Delete custom UI library "${lib.name}" and its ${(lib.elements || []).length} element(s)?`,
        confirmText: 'Delete',
        danger: true,
      });
      if (!ok) return;
      this.manager.deleteCustomLibrary(lib.id);
      this.selectedLibraryId = PREFERRED_FALLBACK_LIBRARY_ID;
      this.studio.syncUiLibraryIndicators();
      this.render();
      this.studio.showToast(`Deleted "${lib.name}"`);
    });
    this.studio._safeCreateIcons(head);
  }

  _renderCollectionBar() {
    const bar = document.getElementById('uiLibCollectionBar');
    if (!bar) return;
    const lib = this._getSelectedLibrary();
    // In Watermelon-only mode, collections live exclusively in the left rail (one home per feature).
    if (WATERMELON_ONLY_MODE || this.viewMode !== 'library' || this.showIssuesView || lib?.id !== 'watermelon-ui') {
      bar.classList.add('hidden');
      bar.innerHTML = '';
      return;
    }

    bar.classList.remove('hidden');
    const colCounts = this.remoteCatalogLoadedId === 'watermelon-ui' ? (this.awesomeResult?.collectionCounts || null) : null;

    bar.innerHTML = WATERMELON_COLLECTIONS.map((col) => {
      const count = colCounts && colCounts[col.id] !== undefined ? Number(colCounts[col.id]) : null;
      const active = this.selectedCollection === col.id;
      return `
        <button
          type="button"
          role="tab"
          aria-selected="${active}"
          class="ui-lib-col-tab ${active ? 'active' : ''}"
          data-wm-col="${escapeHtml(col.id)}"
          title="${escapeHtml(col.desc)}"
        >
          <i data-lucide="${escapeHtml(col.icon)}"></i>
          <span>${escapeHtml(col.label)}</span>
          ${count !== null ? `<span class="ui-lib-col-count tabular-nums">${count.toLocaleString()}</span>` : ''}
        </button>
      `;
    }).join('');

    bar.querySelectorAll('[data-wm-col]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextCol = btn.dataset.wmCol || 'all';
        if (nextCol === this.selectedCollection) return;
        this._teardownCardPreviewObserver();
        this.selectedCollection = nextCol;
        this.selectedCategory = 'all';
        this.selectedSubCategory = 'all';
        this.selectedBlockCategory = 'all';
        this._renderCollectionBar();
        this._renderCategoryBar();
        this._loadAwesomeCatalog(true);
      });
    });
    this.studio._safeCreateIcons(bar);
  }

  _renderCategoryBar() {
    const bar = document.getElementById('uiLibCategoryBar');
    if (!bar) return;
    if (this.viewMode === 'ai-instructions' || this.showIssuesView) {
      bar.innerHTML = '';
      bar.classList.add('hidden');
      return;
    }
    const lib = this._getSelectedLibrary();
    const isRemote = Boolean(lib?.isRemoteCatalog);
    const isWatermelon = lib?.id === 'watermelon-ui';

    // All, Dashboards & Templates stay ultra-clean with zero extra filter strip
    if (
      isWatermelon &&
      (this.selectedCollection === 'all' ||
        this.selectedCollection === 'dashboards' ||
        this.selectedCollection === 'templates')
    ) {
      bar.innerHTML = '';
      bar.classList.add('hidden');
      return;
    }

    // Watermelon Blocks sub-tab: show canonical Block categories
    if (isWatermelon && this.selectedCollection === 'blocks') {
      bar.classList.remove('hidden');
      const bCounts = this.remoteCatalogLoadedId === 'watermelon-ui' ? (this.awesomeResult?.blockCategoryCounts || null) : null;
      const blockChips = WATERMELON_BLOCK_CATEGORIES.filter((bc) => {
        if (bc.id === 'all' || !bCounts) return true;
        return Number(bCounts[bc.id] || 0) > 0;
      });
      bar.innerHTML = blockChips.map((bc) => {
        const count = bCounts && bCounts[bc.id] !== undefined ? Number(bCounts[bc.id]) : null;
        const label = count !== null ? `${bc.label} (${count.toLocaleString()})` : bc.label;
        return `
          <button type="button" role="tab" aria-selected="${this.selectedBlockCategory === bc.id}" class="ui-lib-cat-btn ${this.selectedBlockCategory === bc.id ? 'active' : ''}" data-block-cat="${escapeHtml(bc.id)}">
            ${escapeHtml(label)}
          </button>
        `;
      }).join('');

      bar.querySelectorAll('[data-block-cat]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.selectedBlockCategory = btn.dataset.blockCat || 'all';
          this._renderCategoryBar();
          this._loadAwesomeCatalog(true);
        });
      });
      return;
    }

    // Watermelon Components & Animated: show official subCategory filter chips
    if (isWatermelon && (this.selectedCollection === 'components' || this.selectedCollection === 'animated')) {
      const subCounts =
        this._wmSubCatCache?.[this.selectedCollection] ||
        (this.remoteCatalogLoadedId === 'watermelon-ui' ? this.awesomeResult?.subCategoryCounts : null);
      const entries = subCounts
        ? Object.entries(subCounts)
            .filter(([key, val]) => key !== 'all' && Number(val) > 0)
            .sort((a, b) => Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0]))
        : [];
      if (entries.length <= 1) {
        bar.innerHTML = '';
        bar.classList.add('hidden');
        return;
      }
      bar.classList.remove('hidden');
      const allCount = Number(subCounts.all || entries.reduce((acc, [, v]) => acc + Number(v), 0));
      const chips = [
        { id: 'all', label: `All (${allCount.toLocaleString()})` },
        ...entries.map(([key, val]) => ({
          id: key,
          label: `${formatSubCategoryLabel(key)} (${Number(val).toLocaleString()})`,
        })),
      ];
      bar.innerHTML = chips.map((c) => `
        <button type="button" role="tab" aria-selected="${this.selectedSubCategory === c.id}" class="ui-lib-cat-btn ${this.selectedSubCategory === c.id ? 'active' : ''}" data-sub-cat="${escapeHtml(c.id)}">
          ${escapeHtml(c.label)}
        </button>
      `).join('');

      bar.querySelectorAll('[data-sub-cat]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.selectedSubCategory = btn.dataset.subCat || 'all';
          this._renderCategoryBar();
          this._loadAwesomeCatalog(true);
        });
      });
      return;
    }

    bar.classList.remove('hidden');

    const elements = (lib?.elements || []).filter(
      (e) => (e.status || e.verificationStatus) !== VERIFICATION_STATUS.FAILED
    );
    const remoteCounts = this.remoteCatalogLoadedId === lib?.id ? (this.awesomeResult?.categoryCounts || null) : null;
    const verifiedFallback = this.manager.getVerifiedCount(lib);

    const cats = isRemote
      ? [
          {
            id: 'all',
            label: remoteCounts
              ? `All (${Number(remoteCounts.all || 0).toLocaleString()})`
              : `All (${verifiedFallback.toLocaleString()})`,
          },
          ...UI_ELEMENT_CATEGORIES.map((c) => {
            const count = remoteCounts ? Number(remoteCounts[c.id] || 0) : null;
            return {
              id: c.id,
              count,
              label: count !== null ? `${c.label} (${count.toLocaleString()})` : c.label,
            };
          }).filter((c) => c.count === null || c.count > 0),
        ]
      : [
          { id: 'all', label: `All (${elements.length})` },
          ...UI_ELEMENT_CATEGORIES.map((c) => {
            const count = elements.filter((e) => e.category === c.id).length;
            return { id: c.id, count, label: count ? `${c.label} (${count})` : c.label };
          }).filter((c) => c.count > 0),
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
      const allLibs = this.manager.getVisibleLibraries();
      const libNames = allLibs.map((l) => l.name);
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
    } else if (this.subpanelMode === 'ai-bulk-import') {
      const allLibs = this.manager.getVisibleLibraries();
      const libNames = allLibs.map((l) => l.name);

      panel.innerHTML = `
        <div class="ui-lib-subpanel-head">
          <h4>Bulk Paste Custom UIs (Markdown or JSON)</h4>
          <button type="button" class="icon-action-btn" data-close-subpanel aria-label="Close bulk paste"><i data-lucide="x"></i></button>
        </div>
        <p style="margin:0;font-size:12px;color:var(--md-text-muted)">
          Paste exported queue JSON, or multiple named components separated by <code>## Component Name</code> headings followed by TSX or HTML code.
        </p>
        <div class="ui-lib-form-grid">
          <div class="span-2">
            <label for="aiBulkTargetLibrary" style="display:block;font-size:11.5px;margin-bottom:4px;color:var(--md-text-muted)">Default Target Library</label>
            <select id="aiBulkTargetLibrary">
              ${libNames.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')}
            </select>
          </div>
          <div class="span-2">
            <label for="aiBulkPasteInput" style="display:block;font-size:11.5px;margin-bottom:4px;color:var(--md-text-muted)">Named Components (JSON or ## Headings + Code)</label>
            <textarea id="aiBulkPasteInput" rows="8" placeholder="## Neon CTA Button&#10;\`\`\`tsx&#10;export default function NeonButton() { return <button className='px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold'>Launch</button>; }&#10;\`\`\`"></textarea>
          </div>
        </div>
        <div class="ui-lib-subpanel-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-close-subpanel>Cancel</button>
          <button type="button" class="btn btn-outline btn-sm" id="btnAiBulkQueueOnly">Add to Queue</button>
          <button type="button" class="btn btn-primary btn-sm" id="btnAiBulkQueueAndImport">Add &amp; Import to Library</button>
        </div>
      `;

      const runBulk = async (importImmediately) => {
        const raw = panel.querySelector('#aiBulkPasteInput')?.value || '';
        const defaultTarget = panel.querySelector('#aiBulkTargetLibrary')?.value || '21st.dev';
        const parsed = parseBulkAiTemplatesInput(raw, defaultTarget);
        if (!parsed.length) {
          this.studio.showToast('Could not find named components. Use JSON or "## Component Name" headings.', true);
          return;
        }
        let addedCount = 0;
        for (const entry of parsed) {
          const added = await this.manager.addAiTemplate(entry);
          addedCount += 1;
          if (importImmediately && added?.item?.id) {
            await this.manager.importAiTemplateToLibrary(added.item.id);
          }
        }
        this.subpanelMode = null;
        this.subpanelPayload = null;
        this.studio.syncUiLibraryIndicators();
        this.render();
        this.studio.showToast(
          importImmediately
            ? `Added & imported ${addedCount} custom UI${addedCount === 1 ? '' : 's'} into your library`
            : `Added ${addedCount} template${addedCount === 1 ? '' : 's'} to AI Instructions queue`
        );
      };

      panel.querySelector('#btnAiBulkQueueOnly')?.addEventListener('click', () => runBulk(false));
      panel.querySelector('#btnAiBulkQueueAndImport')?.addEventListener('click', () => runBulk(true));
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

    if (this.showIssuesView) {
      this._teardownCardPreviewObserver();
      this._renderIssuesPanel(grid, lib);
      return;
    }

    if (lib.isRemoteCatalog) {
      this._renderAwesomeCatalogGrid(grid, lib);
      return;
    }

    const filtered = (lib.elements || []).filter((el) => {
      const st = el.status || el.verificationStatus || VERIFICATION_STATUS.VERIFIED;
      if (st === VERIFICATION_STATUS.FAILED) return false;
      return this.selectedCategory === 'all' ? true : el.category === this.selectedCategory;
    });

    if (!filtered.length) {
      grid.innerHTML = `
        <div class="home-empty-state" style="grid-column:1 / -1">
          <i data-lucide="blocks"></i>
          <h3>No verified components yet</h3>
          <p>Add a component to ${escapeHtml(lib.name)} or open "Show issues" in the header menu.</p>
        </div>`;
      this.studio._safeCreateIcons(grid);
      return;
    }

    grid.innerHTML = filtered.map((el) => {
      const catLabel = UI_ELEMENT_CATEGORIES.find((c) => c.id === el.category)?.label || el.category;
      const previewMarkup = `<div class="ui-lib-remote-stage ui-lib-el-preview-wrap" data-custom-live-el="${escapeHtml(el.id)}" style="--remote-accent:${escapeHtml(lib.swatches?.[2] || '#f59e0b')}">
          <div class="ui-lib-remote-live-host" aria-hidden="true"></div>
          <div class="ui-lib-remote-placeholder ui-lib-skeleton-stage">
            <div class="ui-lib-skeleton-line w-40"></div>
            <div class="ui-lib-skeleton-box"></div>
          </div>
          <button type="button" class="ui-lib-preview-click-cover" data-el-action="fullscreen" aria-label="Open ${escapeHtml(el.name)} interactive preview"></button>
        </div>`;

      return `
        <article class="ui-lib-el-card" data-el-id="${escapeHtml(el.id)}">
          ${previewMarkup}
          <div class="ui-lib-el-body">
            <div class="ui-lib-el-title-row">
              <button type="button" class="ui-lib-el-title-btn truncate" data-el-action="fullscreen" title="Preview ${escapeHtml(el.name)}">${escapeHtml(el.name)}</button>
              <span class="ui-lib-el-cat">${escapeHtml(catLabel)}</span>
            </div>
            <p class="ui-lib-el-desc">${escapeHtml(el.description || '')}</p>
            <div class="ui-lib-el-actions">
              <button type="button" class="btn btn-primary btn-sm" data-el-action="select-primary">
                <i data-lucide="${this._getPrimaryActionMeta().icon}"></i> ${escapeHtml(this._getPrimaryActionMeta().shortLabel)}
              </button>
              <div class="ui-lib-card-hover-icons">
                <button type="button" class="icon-action-btn ui-lib-card-hover-btn" data-el-action="inspect" title="View code" aria-label="View ${escapeHtml(el.name)} code">
                  <i data-lucide="code-2"></i>
                </button>
                <button type="button" class="icon-action-btn ui-lib-card-hover-btn" data-el-action="copy" title="Copy code" aria-label="Copy ${escapeHtml(el.name)} code">
                  <i data-lucide="copy"></i>
                </button>
                ${!lib.isBuiltIn
                  ? `<button type="button" class="icon-action-btn danger ui-lib-card-hover-btn" data-el-action="delete" title="Remove component" aria-label="Remove ${escapeHtml(el.name)}"><i data-lucide="trash-2"></i></button>`
                  : ''}
              </div>
            </div>
          </div>
        </article>`;
    }).join('');

    this._teardownCardPreviewObserver();

    grid.querySelectorAll('.ui-lib-el-card').forEach((card) => {
      const el = filtered.find((item) => item.id === card.dataset.elId);
      if (!el) return;

      const customStage = card.querySelector('[data-custom-live-el]');
      if (customStage) {
        this._mountScaledIframeInStage(customStage, {
          lib,
          element: el,
          isHtmlLib: Boolean(el.renderedHtml || el.previewHtml),
          theme: el.renderedHtml && !isDarkSurfaceSnapshot(el.renderedHtml) ? 'light' : 'dark',
        });
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

      card.querySelector('[data-el-action="select-primary"]')?.addEventListener('click', () => {
        this._completePrimarySelection(lib, el);
      });

      card.querySelector('[data-el-action="delete"]')?.addEventListener('click', () => {
        this.manager.deleteElementFromLibrary(lib.id, el.id);
        this.render();
        this.studio.showToast(`Removed "${el.name}"`);
      });
    });

    this.studio._safeCreateIcons(grid);
  }

  async _renderIssuesPanel(grid, lib) {
    if (!lib) return;
    let issues = [];
    if (lib.isRemoteCatalog) {
      if (!this.issuesCache.has(lib.id)) {
        grid.innerHTML = `
          <div class="ui-lib-issues-wrap">
            <div class="ui-lib-issues-head">
              <div>
                <h4>Preview issues</h4>
                <p>Loading verification issues for ${escapeHtml(lib.name)}…</p>
              </div>
              <button type="button" class="btn btn-outline btn-sm" id="btnUiLibIssuesBack">Back to verified</button>
            </div>
          </div>`;
        grid.querySelector('#btnUiLibIssuesBack')?.addEventListener('click', () => {
          this.showIssuesView = false;
          this.render();
        });
        const res = await this.manager.fetchCatalogIssues(lib.id);
        this.issuesCache.set(lib.id, Array.isArray(res?.issues) ? res.issues : []);
        if (!this.showIssuesView || this._getSelectedLibrary()?.id !== lib.id) return;
      }
      issues = this.issuesCache.get(lib.id) || [];
    } else {
      issues = (lib.elements || [])
        .filter((e) => (e.status || e.verificationStatus) === VERIFICATION_STATUS.FAILED)
        .map((e) => ({
          id: e.id,
          name: e.name,
          reasonCode: e.reasonCode || 'RUNTIME_ERROR',
          reasonMessage: e.reasonMessage || 'Failed preview verification.',
        }));
    }

    if (!issues.length) {
      grid.innerHTML = `
        <div class="home-empty-state" style="grid-column:1 / -1">
          <i data-lucide="check-circle-2"></i>
          <h3>No preview issues in ${escapeHtml(lib.name)}</h3>
          <p>All checked components passed offline verification.</p>
          <button type="button" class="btn btn-outline btn-sm" id="btnUiLibIssuesBack" style="margin-top:8px">Back to verified</button>
        </div>`;
      grid.querySelector('#btnUiLibIssuesBack')?.addEventListener('click', () => {
        this.showIssuesView = false;
        this.render();
      });
      this.studio._safeCreateIcons(grid);
      return;
    }

    grid.innerHTML = `
      <div class="ui-lib-issues-wrap">
        <div class="ui-lib-issues-head">
          <div>
            <h4>Failed components (${issues.length})</h4>
            <p>Hidden from the library grid and blocked from Attach to Chat until fixed.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="btnUiLibIssuesBack">Back to verified</button>
        </div>
        <div class="ui-lib-issues-list" role="list">
          ${issues.map((it) => `
            <div class="ui-lib-issue-row" role="listitem">
              <div class="ui-lib-issue-main">
                <div class="ui-lib-issue-title-row">
                  <span class="ui-lib-issue-name">${escapeHtml(it.name || it.id)}</span>
                  <span class="ui-lib-issue-code">${escapeHtml(it.reasonCode || 'RUNTIME_ERROR')}</span>
                </div>
                <p class="ui-lib-issue-msg">${escapeHtml(it.reasonMessage || 'Component failed offline preview verification.')}</p>
              </div>
              <span class="ui-lib-issue-blocked">Blocked</span>
            </div>
          `).join('')}
        </div>
      </div>`;

    grid.querySelector('#btnUiLibIssuesBack')?.addEventListener('click', () => {
      this.showIssuesView = false;
      this.render();
    });
    this.studio._safeCreateIcons(grid);
  }

  _renderAwesomeCatalogGrid(grid, lib) {
    const isWatermelonGrid = lib?.id === 'watermelon-ui';
    grid.classList.toggle(
      'is-wide-cards',
      isWatermelonGrid && this.selectedCollection === 'blocks'
    );
    grid.classList.toggle(
      'is-showcase-cards',
      isWatermelonGrid && ['dashboards', 'templates'].includes(this.selectedCollection)
    );

    if (this.remoteCatalogLoadedId !== lib.id) {
      this.awesomeResult = null;
      this.awesomeError = '';
      this.awesomePage = 1;
      this._loadAwesomeCatalog(false);
      return;
    }

    if (!this.awesomeResult && !this.awesomeLoading && !this.awesomeError) {
      this._loadAwesomeCatalog(false);
      return;
    }

    if (this.awesomeLoading && !this.awesomeResult) {
      grid.innerHTML = Array.from({ length: 6 }).map(() => `
        <article class="ui-lib-el-card ui-lib-skeleton-card" aria-hidden="true">
          <div class="ui-lib-remote-stage ui-lib-skeleton-stage">
            <div class="ui-lib-skeleton-line w-40"></div>
            <div class="ui-lib-skeleton-box"></div>
          </div>
          <div class="ui-lib-el-body">
            <div class="ui-lib-skeleton-line w-60"></div>
            <div class="ui-lib-skeleton-line w-85"></div>
          </div>
        </article>`).join('');
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
      const hasQuery = Boolean(
        this.awesomeQuery ||
        this.selectedCategory !== 'all' ||
        this.selectedSubCategory !== 'all' ||
        this.selectedBlockCategory !== 'all'
      );
      grid.innerHTML = `
        <div class="home-empty-state" style="grid-column:1 / -1">
          <i data-lucide="search"></i>
          <h3>${hasQuery ? 'No matching verified components' : `No verified components yet in ${escapeHtml(lib.name)}`}</h3>
          <p>${hasQuery ? 'Try another keyword or reset the active filters.' : 'Run Repair preview runtime from the menu to refresh verification status.'}</p>
          ${hasQuery ? '<button type="button" class="btn btn-outline btn-sm" id="btnAwesomeResetFilters" style="margin-top:8px">Reset filters</button>' : ''}
        </div>`;
      grid.querySelector('#btnAwesomeResetFilters')?.addEventListener('click', () => {
        this.awesomeQuery = '';
        this.selectedCategory = 'all';
        this.selectedSubCategory = 'all';
        this.selectedBlockCategory = 'all';
        const input = document.getElementById('awesomeSearchInput');
        if (input) input.value = '';
        this._renderCategoryBar();
        this._loadAwesomeCatalog(true);
      });
      this.studio._safeCreateIcons(grid);
      return;
    }

    const isHtmlLib = lib.catalogType === 'html';
    const isTsxLib = lib.catalogType === 'tsx';
    const isWatermelon = lib.id === 'watermelon-ui';
    const isPickSlot = this.pickerContext?.mode === 'pick-slot';
    const copyTitle = isHtmlLib ? 'Copy HTML' : isTsxLib ? 'Copy TSX' : 'Copy JSX';
    const libAccent = lib.swatches?.[2] || '#10B981';
    const assembledIds = new Set(this.assembledBlocks.map((b) => b.id));
    const cardBtnVariant = WATERMELON_ONLY_MODE ? 'btn-outline' : 'btn-primary';

    const cardsHtml = items.map((item) => {
      const wmCol = isWatermelon ? (item.wfCollection || '') : '';
      const isWatermelonVite = isWatermelon && item.previewRuntime === 'watermelon-vite' && Boolean(item.previewUrl);
      const useStructuralThumb =
        !isWatermelonVite && isWatermelon && (wmCol === 'dashboards' || wmCol === 'templates' || wmCol === 'resources');
      const isInteractiveCard = isWatermelonVite && (wmCol === 'animated' || wmCol === 'components');
      const catLabel = isWatermelon && wmCol === 'blocks' && item.blockCategory
        ? (WATERMELON_BLOCK_CATEGORIES.find((c) => c.id === item.blockCategory)?.label || formatSubCategoryLabel(item.blockCategory))
        : isWatermelon && (wmCol === 'components' || wmCol === 'animated') && item.subCategory
          ? formatSubCategoryLabel(item.subCategory)
          : isWatermelon && wmCol === 'dashboards'
            ? 'Dashboard'
            : isWatermelon && wmCol === 'templates'
              ? 'Template'
              : (UI_ELEMENT_CATEGORIES.find((c) => c.id === item.category)?.label || item.category);
      const collectionLabel = item.collection || (isHtmlLib ? 'Tailwind HTML' : isTsxLib ? 'React TSX' : 'Tailwind');
      const specMeta = isWatermelonVite
        ? 'Live runtime'
        : isHtmlLib
          ? (item.hasDarkVariant ? 'Light & Dark' : 'Tailwind HTML')
          : item.demoSourcePath
            ? 'Live Demo'
            : isTsxLib
              ? 'React TSX'
              : (item.authorName ? `by ${item.authorName}` : 'Verified');

      let visualStage = '';
      if (useStructuralThumb) {
        const previewAction = wmCol === 'resources' ? 'view-recipe' : 'fullscreen';
        visualStage = `<div class="ui-lib-remote-stage ui-lib-structural-stage ui-lib-el-preview-wrap" data-wm-collection="${escapeHtml(wmCol)}" style="--remote-accent:${escapeHtml(libAccent)}">
            ${buildWatermelonStructuralThumbHtml(item, { escapeHtmlFn: escapeHtml })}
            <button type="button" class="ui-lib-preview-click-cover" data-awesome-action="${previewAction}" aria-label="Open ${escapeHtml(item.name)} preview"></button>
          </div>`;
      } else {
        const stageClasses = [
          'ui-lib-remote-stage',
          'ui-lib-el-preview-wrap',
          isInteractiveCard ? 'is-interactive-card' : '',
          isWatermelonVite && this.previewTheme === 'light' ? 'is-light-canvas' : '',
        ].filter(Boolean).join(' ');
        const viteAttrs = isWatermelonVite
          ? ` data-wm-vite-url="${escapeHtml(item.previewUrl)}" data-wm-collection="${escapeHtml(wmCol)}"`
          : '';
        const coverOrExpand = isInteractiveCard
          ? `<button type="button" class="icon-action-btn ui-lib-card-expand-btn" data-awesome-action="fullscreen" title="Open fullscreen preview" aria-label="Open ${escapeHtml(item.name)} fullscreen preview">
               <i data-lucide="maximize-2"></i>
             </button>`
          : `<button type="button" class="ui-lib-preview-click-cover" data-awesome-action="fullscreen" aria-label="Open ${escapeHtml(item.name)} interactive preview"></button>`;

        visualStage = `<div class="${stageClasses}" data-live-card-id="${escapeHtml(item.id)}"${viteAttrs} data-catalog-theme="${escapeHtml(lib.id)}" style="--remote-accent:${escapeHtml(libAccent)}">
            <div class="ui-lib-remote-live-host"></div>
            <div class="ui-lib-remote-placeholder ui-lib-skeleton-stage">
              <div class="ui-lib-remote-stage-top">
                <span class="ui-lib-remote-col">${escapeHtml(collectionLabel)}</span>
                <span class="ui-lib-remote-spec">${escapeHtml(specMeta)}</span>
              </div>
              <div class="ui-lib-remote-loader-mid">
                <div class="ui-lib-skeleton-box"></div>
              </div>
            </div>
            ${coverOrExpand}
          </div>`;
      }

      const descText = item.description || `${collectionLabel} · ${specMeta}`;
      const isDegraded = item.verificationStatus === VERIFICATION_STATUS.DEGRADED;

      let primaryBtnHtml = '';
      if (isPickSlot && wmCol !== 'resources') {
        primaryBtnHtml = `
          <button type="button" class="btn ${cardBtnVariant} btn-sm" data-awesome-action="select-primary">
            <i data-lucide="${this._getPrimaryActionMeta().icon}"></i> ${escapeHtml(this._getPrimaryActionMeta().shortLabel)}
          </button>`;
      } else if (isWatermelon && (wmCol === 'dashboards' || wmCol === 'templates')) {
        primaryBtnHtml = `
          <button type="button" class="btn ${cardBtnVariant} btn-sm" data-awesome-action="load-starter">
            <i data-lucide="rocket"></i> Load starter
          </button>`;
      } else if (isWatermelon && wmCol === 'blocks') {
        const isAdded = assembledIds.has(item.id);
        primaryBtnHtml = `
          <button type="button" class="btn ${isAdded ? 'btn-outline wm-assembled-btn is-active' : cardBtnVariant} btn-sm" data-awesome-action="toggle-assemble" aria-pressed="${isAdded ? 'true' : 'false'}">
            <i data-lucide="${isAdded ? 'check' : 'plus'}"></i> ${isAdded ? 'Added' : 'Add to page'}
          </button>`;
      } else if (isWatermelon && wmCol === 'resources') {
        const skillDef = resourceToSkillDefinition(item);
        const isSkillOn = Boolean(this.studio?.skillManager?.isSkillEnabled?.(skillDef.id));
        primaryBtnHtml = `
          <button type="button" class="btn ${isSkillOn ? 'btn-primary wm-skill-toggle-btn is-active' : 'btn-outline wm-skill-toggle-btn'} btn-sm" data-awesome-action="toggle-skill" aria-pressed="${isSkillOn ? 'true' : 'false'}">
            <i data-lucide="${isSkillOn ? 'check-circle-2' : 'sparkles'}"></i> ${isSkillOn ? 'Skill active' : 'Enable skill'}
          </button>`;
      } else {
        primaryBtnHtml = `
          <button type="button" class="btn ${cardBtnVariant} btn-sm" data-awesome-action="select-primary">
            <i data-lucide="${this._getPrimaryActionMeta().icon}"></i> ${escapeHtml(this._getPrimaryActionMeta().shortLabel)}
          </button>`;
      }

      const hoverIconsHtml = wmCol === 'resources'
        ? `<div class="ui-lib-card-hover-icons">
            <button type="button" class="icon-action-btn ui-lib-card-hover-btn" data-awesome-action="view-recipe" title="View recipe" aria-label="View ${escapeHtml(item.name)} recipe">
              <i data-lucide="code-2"></i>
            </button>
            <button type="button" class="icon-action-btn ui-lib-card-hover-btn" data-awesome-action="copy-jsx" title="Copy recipe" aria-label="Copy ${escapeHtml(item.name)} recipe">
              <i data-lucide="copy"></i>
            </button>
          </div>`
        : `<div class="ui-lib-card-hover-icons">
            <button type="button" class="icon-action-btn ui-lib-card-hover-btn" data-awesome-action="inspect" title="View code" aria-label="View ${escapeHtml(item.name)} code">
              <i data-lucide="code-2"></i>
            </button>
            <button type="button" class="icon-action-btn ui-lib-card-hover-btn" data-awesome-action="copy-jsx" title="${escapeHtml(copyTitle)}" aria-label="${escapeHtml(copyTitle)} for ${escapeHtml(item.name)}">
              <i data-lucide="copy"></i>
            </button>
          </div>`;

      const titleAction = wmCol === 'resources' ? 'view-recipe' : 'fullscreen';

      return `
        <article class="ui-lib-el-card ui-lib-awesome-card${assembledIds.has(item.id) ? ' is-assembled' : ''}" data-awesome-id="${escapeHtml(item.id)}"${wmCol ? ` data-wm-collection="${escapeHtml(wmCol)}"` : ''}>
          ${visualStage}
          <div class="ui-lib-el-body">
            <div class="ui-lib-el-title-row">
              <button type="button" class="ui-lib-el-title-btn truncate" data-awesome-action="${titleAction}" title="Preview ${escapeHtml(item.name)}">${escapeHtml(item.name)}</button>
              <span class="ui-lib-el-cat">${escapeHtml(catLabel)}${isDegraded ? ' · degraded' : ''}</span>
            </div>
            <p class="ui-lib-el-desc">${escapeHtml(descText)}</p>
            <div class="ui-lib-el-actions">
              ${primaryBtnHtml}
              ${hoverIconsHtml}
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
          Page ${currentPage.toLocaleString()} of ${totalPages.toLocaleString()} · ${Number(res.total || 0).toLocaleString()} verified
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
      if (action === 'view-recipe') {
        this.openAwesomeFullscreenPreview(lib, item, { initialMode: 'code' });
        return;
      }
      if (action === 'toggle-assemble') {
        this._toggleAssembledBlock(item);
        return;
      }
      if (action === 'toggle-skill') {
        const skillDef = resourceToSkillDefinition(item);
        if (typeof this.studio?.toggleWatermelonResourceSkill === 'function') {
          this.studio.toggleWatermelonResourceSkill(skillDef);
        } else if (this.studio?.skillManager?.toggleExternalSkill) {
          const { enabled } = this.studio.skillManager.toggleExternalSkill(skillDef);
          this.studio._renderSkillsIndicator?.();
          this.studio._renderSkillsSettingsList?.();
          this.studio.showToast(enabled ? `Enabled "${skillDef.name}" as an active AI Skill` : `Disabled "${skillDef.name}" AI Skill`);
        }
        this._renderAwesomeCatalogGrid(grid, lib);
        return;
      }
      if (action === 'load-starter') {
        if (typeof this.studio?.loadWatermelonStarterProject === 'function') {
          this.studio.loadWatermelonStarterProject(item);
        }
        return;
      }
      if (action === 'open-in-prompt-studio') {
        if (typeof this.studio?.openPromptStudioWithWatermelonStarter === 'function') {
          this.studio.openPromptStudioWithWatermelonStarter(item);
        }
        return;
      }
      const prevHtml = btn.innerHTML;
      btn.disabled = true;
      try {
        const detail = await this.manager.fetchRemoteComponentDetail(lib.id, item.id);
        const elementPayload = {
          id: detail.id,
          name: detail.name,
          category: detail.category,
          wfCollection: item.wfCollection || detail.wfCollection || '',
          blockCategory: item.blockCategory || detail.blockCategory || '',
          authorName: detail.authorName || lib.name,
          repoUrl: detail.repoUrl || item.repoUrl || lib.sourceUrl,
          description: detail.description || `Imported from ${lib.name}`,
          code: detail.code || detail.jsxCode || '',
          normalizedCode: detail.normalizedCode || detail.code || detail.jsxCode || '',
          demoCode: detail.demoCode || '',
          prompt: detail.prompt || '',
          renderedHtml: detail.renderedHtml || '',
          darkRenderedHtml: detail.darkRenderedHtml || '',
          manifest: detail.manifest || null,
          dependencies: detail.dependencies || detail.manifest?.dependencies || {},
          usageNotes: detail.usageNotes || '',
          verificationStatus: detail.verificationStatus || item.verificationStatus || VERIFICATION_STATUS.VERIFIED,
        };
        if (action === 'copy-jsx') {
          const textToCopy = isHtmlLib
            ? (detail.htmlCode || detail.renderedHtml || detail.code || '')
            : (detail.normalizedCode || detail.code || detail.jsxCode || detail.prompt || '');
          navigator.clipboard?.writeText(textToCopy).catch(() => {});
          this.studio.showToast(`Copied ${item.name} ${item.wfCollection === 'resources' ? 'recipe' : isHtmlLib ? 'HTML' : isTsxLib ? 'TSX' : 'JSX'}`);
        } else if (action === 'copy-prompt') {
          navigator.clipboard?.writeText(detail.prompt || '').catch(() => {});
          this.studio.showToast(`Copied ${item.name} prompt`);
        } else if (action === 'select-primary') {
          this._completePrimarySelection(lib, elementPayload);
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

    // Mount live scaled previews only for stages with data-live-card-id (excludes screenshots & structural thumbs)
    if (grid.querySelector('.ui-lib-remote-stage[data-live-card-id]')) {
      this._mountRemoteCardPreviews(grid, lib, items);
    } else {
      this._teardownCardPreviewObserver();
    }
  }

  _mountScaledIframeInStage(stage, { lib, element, isHtmlLib, theme }) {
    const host = stage?.querySelector('.ui-lib-remote-live-host');
    if (!host) return;
    const stageW = Math.max(260, stage.clientWidth || 380);
    const stageH = Math.max(170, stage.clientHeight || 200);
    const virtualW = isHtmlLib ? 760 : 600;
    const scale = stageW / virtualW;
    const virtualH = Math.ceil(stageH / scale);

    const iframe = document.createElement('iframe');
    iframe.className = 'ui-lib-remote-live-iframe';
    iframe.title = `${element.name || 'Component'} live preview`;
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.setAttribute('tabindex', '-1');
    iframe.style.width = `${virtualW}px`;
    iframe.style.height = `${virtualH}px`;
    iframe.style.transform = `scale(${scale.toFixed(4)})`;

    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      iframe.classList.add('is-ready');
      stage.classList.add('is-loaded');
    };
    iframe.addEventListener('load', () => {
      // Allow Tailwind CSS v4 CDN / Babel TSX runtime a brief settle before fading in
      setTimeout(reveal, isHtmlLib ? 180 : 420);
    });
    // Safety reveal timer in case a subresource is slow
    setTimeout(reveal, 2400);

    iframe.srcdoc = buildInteractivePreviewSrcdoc({
      lib,
      element,
      theme,
      animate: false,
      compactCard: true,
    });
    host.innerHTML = '';
    host.appendChild(iframe);
  }

  _mountWatermelonViteIframeInStage(stage, item, onSettled) {
    const host = stage?.querySelector('.ui-lib-remote-live-host');
    const rawUrl = stage?.dataset?.wmViteUrl || item?.previewUrl || '';
    if (!host || !rawUrl) {
      onSettled?.();
      return;
    }
    const wmCol = stage.dataset.wmCollection || item?.wfCollection || 'components';
    const isInteractive = wmCol === 'animated' || wmCol === 'components';
    const stageW = Math.max(260, stage.clientWidth || (isInteractive ? 400 : 480));
    const stageH = Math.max(170, stage.clientHeight || (isInteractive ? 220 : 256));

    const iframe = document.createElement('iframe');
    iframe.className = 'ui-lib-remote-live-iframe';
    iframe.title = `${item?.name || 'Watermelon component'} live preview`;
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');

    if (isInteractive) {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.transform = 'none';
    } else {
      iframe.setAttribute('tabindex', '-1');
      const virtualW = wmCol === 'blocks' ? 1140 : 1280;
      const scale = stageW / virtualW;
      const virtualH = Math.ceil(stageH / scale);
      iframe.style.width = `${virtualW}px`;
      iframe.style.height = `${virtualH}px`;
      iframe.style.transform = `scale(${scale.toFixed(4)})`;
    }

    let settled = false;
    let pollTimer = null;
    const finish = (markReady) => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (markReady && !stage.classList.contains('is-preview-error')) {
        iframe.classList.add('is-ready');
        stage.classList.add('is-loaded');
      }
      if (!settled) {
        settled = true;
        onSettled?.();
      }
    };

    const hasRenderedDom = () => {
      try {
        const root = iframe.contentDocument?.getElementById('root');
        return Boolean(root && root.childElementCount > 0);
      } catch {
        return false;
      }
    };

    iframe.addEventListener('load', () => {
      if (hasRenderedDom()) {
        finish(true);
        return;
      }
      let ticks = 0;
      pollTimer = setInterval(() => {
        ticks += 1;
        if (!iframe.isConnected || stage.classList.contains('is-loaded') || stage.classList.contains('is-preview-error')) {
          finish(false);
          return;
        }
        if (hasRenderedDom() || ticks >= 40) {
          finish(true);
        }
      }, 150);
    });
    iframe.addEventListener('error', () => {
      finish(false);
    });
    setTimeout(() => {
      if (!settled) finish(hasRenderedDom());
    }, 6500);

    iframe.src = this._buildWatermelonPreviewUrl(rawUrl, {
      mode: 'card',
      theme: this.previewTheme,
    });
    host.innerHTML = '';
    host.appendChild(iframe);
  }

  _mountRemoteCardPreviews(grid, lib, items) {
    this._teardownCardPreviewObserver();
    const gen = this._cardPreviewGen;
    const isHtmlLib = lib.catalogType === 'html';
    const stages = Array.from(grid.querySelectorAll('.ui-lib-remote-stage[data-live-card-id]'));
    if (!stages.length) return;

    const hasWatermelonVite = stages.some((st) => Boolean(st.dataset.wmViteUrl));
    const itemById = new Map(items.map((it) => [it.id, it]));
    const pendingQueue = [];
    const queuedIds = new Set();
    let activeCount = 0;
    const MAX_CONCURRENT = 2;

    const pump = () => {
      if (gen !== this._cardPreviewGen) return;
      while (activeCount < MAX_CONCURRENT && pendingQueue.length > 0) {
        const stage = pendingQueue.shift();
        const itemId = stage.dataset.liveCardId;
        const item = itemById.get(itemId);
        if (!item || !stage.isConnected) continue;
        activeCount += 1;

        if (stage.dataset.wmViteUrl) {
          this._mountWatermelonViteIframeInStage(stage, item, () => {
            activeCount = Math.max(0, activeCount - 1);
            pump();
          });
          continue;
        }

        this.manager
          .fetchRemoteComponentDetail(lib.id, item.id)
          .then((detail) => {
            if (gen !== this._cardPreviewGen || !stage.isConnected) return;
            const element = {
              id: detail.id,
              name: detail.name || item.name,
              category: detail.category || item.category,
              code: detail.code || detail.jsxCode || '',
              demoCode: detail.demoCode || '',
              auxiliaryFiles: Array.isArray(detail.auxiliaryFiles) ? detail.auxiliaryFiles : [],
              sourcePath: detail.sourcePath || item.sourcePath || '',
              renderedHtml: detail.renderedHtml || '',
              darkRenderedHtml: detail.darkRenderedHtml || '',
              promptCss: detail.promptCss || '',
            };
            const theme = isHtmlLib
              ? (detail.darkRenderedHtml ? 'dark' : 'light')
              : 'dark';
            this._mountScaledIframeInStage(stage, { lib, element, isHtmlLib, theme });
          })
          .catch((err) => {
            if (gen !== this._cardPreviewGen || !stage.isConnected) return;
            stage.classList.add('is-preview-error');
            const mid = stage.querySelector('.ui-lib-remote-loader-mid');
            if (mid) {
              const errMsg = String(err?.message || 'Could not load offline preview');
              mid.innerHTML = `
                <div class="ui-lib-card-error">
                  <i data-lucide="alert-circle"></i>
                  <span class="ui-lib-card-error-msg">${escapeHtml(errMsg)}</span>
                  <button type="button" class="btn btn-outline btn-xs ui-lib-retry-preview-btn">Retry</button>
                </div>
              `;
              this.studio._safeCreateIcons(mid);
              mid.querySelector('.ui-lib-retry-preview-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                stage.classList.remove('is-preview-error');
                mid.innerHTML = '<div class="ui-lib-skeleton-box"></div>';
                queuedIds.delete(itemId);
                enqueueStage(stage);
              });
            }
          })
          .finally(() => {
            activeCount = Math.max(0, activeCount - 1);
            pump();
          });
      }
    };

    const enqueueStage = (stage) => {
      const id = stage.dataset.liveCardId;
      if (!id || queuedIds.has(id)) return;
      queuedIds.add(id);
      pendingQueue.push(stage);
      pump();
    };

    if (typeof IntersectionObserver === 'function') {
      const scrollRoot = document.querySelector('.ui-lib-stage') || null;
      this._cardPreviewObserver = new IntersectionObserver(
        (entries) => {
          if (gen !== this._cardPreviewGen) return;
          for (const entry of entries) {
            if (entry.isIntersecting) {
              this._cardPreviewObserver?.unobserve(entry.target);
              enqueueStage(entry.target);
            }
          }
        },
        { root: scrollRoot, rootMargin: '220px 0px', threshold: 0.01 }
      );
      stages.forEach((st) => this._cardPreviewObserver.observe(st));
      stages.slice(0, hasWatermelonVite ? 6 : 2).forEach((st) => {
        this._cardPreviewObserver?.unobserve(st);
        enqueueStage(st);
      });
    } else {
      stages.slice(0, hasWatermelonVite ? 6 : 4).forEach(enqueueStage);
    }
  }

  _toggleAssembledBlock(item) {
    if (!item?.id) return;
    const idx = this.assembledBlocks.findIndex((b) => b.id === item.id);
    if (idx >= 0) {
      this.assembledBlocks.splice(idx, 1);
      this.studio.showToast(`Removed "${item.name}" from Page Assembler`);
    } else {
      if (this.assembledBlocks.length >= 8) {
        this.studio.showToast('Page Assembler supports up to 8 ordered sections', true);
        return;
      }
      this.assembledBlocks.push({
        id: item.id,
        name: item.name,
        category: item.category || 'cards',
        wfCollection: item.wfCollection || 'blocks',
        blockCategory: item.blockCategory || '',
        description: item.description || '',
        libraryId: 'watermelon-ui',
        libraryName: 'Watermelon UI',
        librarySwatch: '#10B981',
        code: item.code || '',
      });
      this.studio.showToast(`Added "${item.name}" to Page Assembler (${this.assembledBlocks.length} section${this.assembledBlocks.length === 1 ? '' : 's'})`);
    }
    this._renderAssemblerTray();
    const grid = document.getElementById('uiLibElementsGrid');
    const lib = this._getSelectedLibrary();
    if (grid && lib?.isRemoteCatalog) {
      this._renderAwesomeCatalogGrid(grid, lib);
    }
  }

  _moveAssembledBlock(index, delta) {
    const next = index + delta;
    if (index < 0 || next < 0 || index >= this.assembledBlocks.length || next >= this.assembledBlocks.length) return;
    const [entry] = this.assembledBlocks.splice(index, 1);
    this.assembledBlocks.splice(next, 0, entry);
    this._renderAssemblerTray();
  }

  async _hydrateAssembledBlocks() {
    const out = [];
    for (const blk of this.assembledBlocks) {
      if (blk.code) {
        out.push(blk);
        continue;
      }
      try {
        const detail = await this.manager.fetchRemoteComponentDetail('watermelon-ui', blk.id);
        out.push({
          ...blk,
          code: detail?.code || detail?.jsxCode || '',
          description: detail?.description || blk.description || '',
        });
      } catch {
        out.push(blk);
      }
    }
    this.assembledBlocks = out;
    return out;
  }

  _renderAssemblerTray() {
    const tray = document.getElementById('uiLibAssemblerTray');
    if (!tray) return;
    const lib = this._getSelectedLibrary();
    const showTray = this.assembledBlocks.length > 0 && lib?.id === 'watermelon-ui' && this.pickerContext?.mode !== 'pick-slot';
    if (!showTray) {
      tray.classList.add('hidden');
      tray.innerHTML = '';
      return;
    }

    tray.classList.remove('hidden');
    tray.innerHTML = `
      <div class="ui-lib-asm-head">
        <div class="ui-lib-asm-title">
          <i data-lucide="layers"></i>
          <span>Page Assembler</span>
          <span class="ui-lib-asm-count tabular-nums">${this.assembledBlocks.length} section${this.assembledBlocks.length === 1 ? '' : 's'}</span>
        </div>
        <div class="ui-lib-asm-actions">
          <button type="button" class="btn btn-ghost btn-sm" id="btnWmAsmClear">Clear</button>
          <button type="button" class="btn btn-outline btn-sm" id="btnWmAsmMixMatch">
            <i data-lucide="layout-grid"></i> Load into Mix & Match
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="btnWmAsmSendChat">
            <i data-lucide="paperclip"></i> Send to AI Builder
          </button>
        </div>
      </div>
      <div class="ui-lib-asm-slots" role="list">
        ${this.assembledBlocks.map((blk, i) => `
          <div class="ui-lib-asm-slot" role="listitem">
            <span class="ui-lib-asm-idx tabular-nums">${i + 1}</span>
            <span class="ui-lib-asm-name" title="${escapeHtml(blk.name)}">${escapeHtml(blk.name)}</span>
            <span class="ui-lib-asm-cat">${escapeHtml(blk.blockCategory || blk.category || 'block')}</span>
            <div class="ui-lib-asm-controls">
              <button type="button" class="ui-lib-asm-icon-btn" data-asm-move="-1" data-asm-idx="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move ${escapeHtml(blk.name)} left">
                <i data-lucide="chevron-left"></i>
              </button>
              <button type="button" class="ui-lib-asm-icon-btn" data-asm-move="1" data-asm-idx="${i}" ${i === this.assembledBlocks.length - 1 ? 'disabled' : ''} aria-label="Move ${escapeHtml(blk.name)} right">
                <i data-lucide="chevron-right"></i>
              </button>
              <button type="button" class="ui-lib-asm-icon-btn danger" data-asm-remove="${i}" aria-label="Remove ${escapeHtml(blk.name)}">
                <i data-lucide="x"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    tray.querySelector('#btnWmAsmClear')?.addEventListener('click', () => {
      this.assembledBlocks = [];
      this._renderAssemblerTray();
      const grid = document.getElementById('uiLibElementsGrid');
      if (grid && lib?.isRemoteCatalog) this._renderAwesomeCatalogGrid(grid, lib);
    });

    tray.querySelector('#btnWmAsmMixMatch')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        const hydrated = await this._hydrateAssembledBlocks();
        this.studio.loadAssembledBlocksIntoPromptStudio?.(hydrated);
      } finally {
        btn.disabled = false;
      }
    });

    tray.querySelector('#btnWmAsmSendChat')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        const hydrated = await this._hydrateAssembledBlocks();
        this.studio.attachPageAssemblerToChat?.(hydrated);
        this.assembledBlocks = [];
        this._renderAssemblerTray();
        document.getElementById('uiLibraryModal')?.close();
      } finally {
        btn.disabled = false;
      }
    });

    tray.querySelectorAll('[data-asm-move]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this._moveAssembledBlock(Number(btn.dataset.asmIdx), Number(btn.dataset.asmMove));
      });
    });

    tray.querySelectorAll('[data-asm-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.asmRemove);
        if (idx >= 0 && idx < this.assembledBlocks.length) {
          this.assembledBlocks.splice(idx, 1);
          this._renderAssemblerTray();
          const grid = document.getElementById('uiLibElementsGrid');
          if (grid && lib?.isRemoteCatalog) this._renderAwesomeCatalogGrid(grid, lib);
        }
      });
    });

    this.studio._safeCreateIcons(tray);
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
              <button type="button" class="btn ${isImported ? 'btn-outline' : 'btn-primary'} btn-sm" data-ai-action="import-now">
                <i data-lucide="package-plus"></i> ${isImported ? 'Re-import' : 'Import to Library'}
              </button>
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

      card.querySelector('[data-ai-action="import-now"]')?.addEventListener('click', async () => {
        try {
          const { library, element } = await this.manager.importAiTemplateToLibrary(tpl.id);
          this.studio.syncUiLibraryIndicators();
          this.render();
          this.studio.showToast(`Imported "${element.name}" into ${library.name}`);
        } catch (err) {
          this.studio.showToast(err?.message || `Could not import "${tpl.name}"`, true);
        }
      });

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
