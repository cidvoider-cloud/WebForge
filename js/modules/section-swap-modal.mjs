/**
 * WebForge Studio — Workspace Section Swapper Modal Controller ("Change This to That")
 *
 * Powers both:
 *  1. Shared cross-library search helper `queryCrossLibraryCandidates()` (used by Prompt Studio Mix & Match + Section Swapper)
 *  2. The Workspace `#sectionSwapModal` popup triggered from the toolbar "Swap Section" button
 *     OR directly from the live Preview Element Inspector tooltip ("Swap from Library").
 */

import { escapeHtml } from './storage.mjs';
import { openDialogWithOrigin, closeDialogFast } from './motion.mjs';
import { buildInteractivePreviewSrcdoc } from './ui-preview-builder.mjs';
import {
  CORE_SECTION_SLOTS,
  collectLocalSlotCandidates,
  getRemoteQueryForSlot,
  inferSlotFromElement,
  normalizeSlotCandidate,
  buildSectionSwapPrompt,
} from './section-swap.mjs';
import { prioritizeBlocksFirst } from './watermelon-ecosystem.mjs';

export const CROSS_LIBRARY_FILTERS = Object.freeze([
  { id: 'all', label: 'All Libraries' },
  { id: 'watermelon-ui', label: 'Watermelon UI' },
  { id: 'kokonut-ui', label: 'Kokonut UI' },
  { id: 'hyperui', label: 'HyperUI' },
  { id: '21st-dev', label: '21st.dev' },
  { id: 'awesome-components', label: 'Awesome' },
  { id: 'shadcn-ui', label: 'shadcn/ui' },
  { id: 'built-in', label: 'Built-in Packs' },
]);

const REMOTE_CATALOG_IDS = ['watermelon-ui', 'kokonut-ui', 'hyperui', 'awesome-components', 'shadcn-ui'];

/**
 * Unified cross-library component search across local packs (21st.dev, DESIGN.md, Built-in, Custom)
 * and remote server-indexed catalogs (Watermelon UI, Kokonut UI, HyperUI, Awesome Components, shadcn/ui).
 */
export async function queryCrossLibraryCandidates(
  uiLibraryManager,
  { slot = 'hero', libraryFilter = 'all', query = '', limit = 24, blocksFirst = true } = {}
) {
  if (!uiLibraryManager) return [];
  const allLibs = uiLibraryManager.getAllLibraries() || [];
  const results = [];

  // 1. Collect local candidates (prioritize 21st.dev & custom over repetitive built-in generics when viewing "all")
  const wantLocal = libraryFilter === 'all' || !REMOTE_CATALOG_IDS.includes(libraryFilter);
  const localHits = wantLocal
    ? collectLocalSlotCandidates(allLibs, {
        slot,
        libraryFilter,
        query,
        limit: libraryFilter === 'all' ? 8 : limit,
      })
    : [];

  // 2. Query remote disk catalogs via existing /api/catalogs/:id & /api/awesome-components endpoints
  const remoteTargets = REMOTE_CATALOG_IDS.includes(libraryFilter)
    ? [libraryFilter]
    : libraryFilter === 'all'
      ? ['watermelon-ui', 'kokonut-ui', 'hyperui', 'awesome-components', 'shadcn-ui']
      : [];

  const remoteBuckets = [];
  if (remoteTargets.length && typeof uiLibraryManager.queryRemoteCatalog === 'function') {
    const remoteParams = getRemoteQueryForSlot(slot, query);
    const perCatalogLimit = remoteTargets.length === 1 ? limit : 6;
    const remoteResponses = await Promise.all(
      remoteTargets.map(async (catId) => {
        const lib = uiLibraryManager.getLibrary(catId);
        if (!lib) return [];
        try {
          const res = await uiLibraryManager.queryRemoteCatalog(catId, {
            q: remoteParams.q,
            category: remoteParams.category,
            blocksFirst: blocksFirst && catId === 'watermelon-ui',
            page: 1,
            limit: perCatalogLimit,
          });
          const items = Array.isArray(res?.items) ? res.items : [];
          return items
            .map((item) => {
              const cand = normalizeSlotCandidate(item, lib, slot);
              if (cand && item.wfCollection) {
                cand.wfCollection = item.wfCollection;
                cand.blockCategory = item.blockCategory || '';
              }
              return cand;
            })
            .filter(Boolean);
        } catch {
          return [];
        }
      })
    );
    for (const chunk of remoteResponses) {
      if (chunk.length) remoteBuckets.push(chunk);
    }
  }

  // Interleave remote catalogs + 21st.dev/custom first when browsing "All Libraries" so results show diverse real components
  if (libraryFilter === 'all') {
    const twentyFirstAndCustom = localHits.filter((c) => c.libraryId === '21st-dev' || !c.rawLibrary?.isBuiltIn);
    const builtInPacks = localHits.filter((c) => c.libraryId !== '21st-dev' && c.rawLibrary?.isBuiltIn);
    const buckets = [
      ...remoteBuckets,
      ...(twentyFirstAndCustom.length ? [twentyFirstAndCustom] : []),
      ...(builtInPacks.length ? [builtInPacks.slice(0, 4)] : []),
    ];
    const maxLen = Math.max(0, ...buckets.map((b) => b.length));
    for (let i = 0; i < maxLen; i += 1) {
      for (const bucket of buckets) {
        if (bucket[i]) results.push(bucket[i]);
      }
    }
  } else {
    results.push(...localHits);
    for (const chunk of remoteBuckets) {
      results.push(...chunk);
    }
  }

  // Deduplicate by libraryId + id while preserving ranking order
  const seen = new Set();
  const deduped = [];
  for (const item of results) {
    const key = `${item.libraryId}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
    if (deduped.length >= limit) break;
  }
  return blocksFirst ? prioritizeBlocksFirst(deduped) : deduped;
}

/**
 * Fetches full JSX/TSX/HTML source code for a remote candidate (or returns local candidate as-is).
 */
export async function hydrateCandidateDetail(uiLibraryManager, candidate) {
  if (!candidate) return null;
  if (!candidate.isRemote || !uiLibraryManager?.fetchRemoteComponentDetail) {
    return candidate;
  }
  if (candidate._hydrated && (candidate.code || candidate.renderedHtml)) {
    return candidate;
  }
  try {
    const detail = await uiLibraryManager.fetchRemoteComponentDetail(candidate.libraryId, candidate.id);
    if (!detail) return candidate;
    const mergedRaw = { ...(candidate.rawElement || {}), ...detail };
    const hydrated = normalizeSlotCandidate(mergedRaw, candidate.rawLibrary, candidate.category);
    if (hydrated) {
      hydrated._hydrated = true;
      return hydrated;
    }
  } catch {
    // Keep lightweight metadata if server detail fails
  }
  return candidate;
}

export class SectionSwapModalController {
  constructor(studio) {
    this.studio = studio;
    this.activeSlot = 'hero';
    this.libraryFilter = 'all';
    this.searchQuery = '';
    this.blocksFirst = true;
    this.adherence = 'adapt'; // 'adapt' | 'strict'
    this.previewMode = 'preview'; // 'preview' | 'code'
    this.previewTheme = 'dark';
    this.inspectedElement = null;
    this.candidates = [];
    this.selectedCandidate = null;
    this.loading = false;
    this._searchDebounce = null;
    this._reqSeq = 0;
    this._detailSeq = 0;
    this._wired = false;
  }

  init() {
    if (this._wired) return;
    const modal = document.getElementById('sectionSwapModal');
    if (!modal) return;
    this._wired = true;

    document.getElementById('btnSwapClose')?.addEventListener('click', () => closeDialogFast(modal));
    document.getElementById('btnSwapCancel')?.addEventListener('click', () => closeDialogFast(modal));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeDialogFast(modal);
    });

    document.getElementById('btnSwapClearInspect')?.addEventListener('click', () => {
      this.inspectedElement = null;
      this._renderInspectedBanner();
    });

    const searchInput = document.getElementById('swapSearchInput');
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value.trim();
      clearTimeout(this._searchDebounce);
      this._searchDebounce = setTimeout(() => this._loadCandidates(), 160);
    });

    // Adherence toggle (Adapt vs Strict)
    modal.querySelectorAll('[data-swap-adherence]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.adherence = btn.dataset.swapAdherence === 'strict' ? 'strict' : 'adapt';
        this._syncAdherenceButtons();
      });
    });

    // Preview vs Code toggle
    modal.querySelectorAll('[data-swap-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.previewMode = btn.dataset.swapView === 'code' ? 'code' : 'preview';
        this._syncPreviewPane();
      });
    });

    // Preview Dark/Light toggle
    document.getElementById('btnSwapPreviewTheme')?.addEventListener('click', () => {
      this.previewTheme = this.previewTheme === 'dark' ? 'light' : 'dark';
      const lbl = document.getElementById('swapPreviewThemeLabel');
      if (lbl) lbl.textContent = this.previewTheme === 'dark' ? 'Light' : 'Dark';
      this._renderPreviewIframe();
    });

    // Blocks First prioritization toggle
    document.getElementById('btnSwapBlocksFirst')?.addEventListener('click', () => {
      this.blocksFirst = !this.blocksFirst;
      this._syncBlocksFirstButton();
      this._loadCandidates();
    });

    // Primary Execute Swap CTA
    document.getElementById('btnSwapApply')?.addEventListener('click', () => this._applySwap());

    this._renderSlotTabs();
    this._renderLibraryFilters();
    this._syncAdherenceButtons();
    this._syncBlocksFirstButton();
  }

  _syncBlocksFirstButton() {
    const btn = document.getElementById('btnSwapBlocksFirst');
    if (!btn) return;
    btn.classList.toggle('active', this.blocksFirst);
    btn.setAttribute('aria-pressed', this.blocksFirst ? 'true' : 'false');
    btn.innerHTML = this.blocksFirst
      ? '<i data-lucide="layout-template"></i><span>Blocks First</span>'
      : '<i data-lucide="grid-2x2"></i><span>All UI</span>';
    if (typeof window.lucide !== 'undefined') {
      try { window.lucide.createIcons({ root: btn }); } catch {}
    }
  }

  /**
   * Opens the Section Swapper popup from either:
   *  - Toolbar button (inspectedElement = null)
   *  - Live Preview Element Inspector tooltip (inspectedElement = preview.selectedElement)
   */
  open({ slot = '', inspectedElement = null, triggerEl = null } = {}) {
    this.init();
    const modal = document.getElementById('sectionSwapModal');
    if (!modal) return;

    this.inspectedElement = inspectedElement ? { ...inspectedElement } : null;
    if (slot) {
      this.activeSlot = slot;
    } else if (this.inspectedElement) {
      this.activeSlot = inferSlotFromElement(this.inspectedElement);
    } else if (!this.activeSlot) {
      this.activeSlot = 'hero';
    }

    this.searchQuery = '';
    const searchInput = document.getElementById('swapSearchInput');
    if (searchInput) searchInput.value = '';
    const noteInput = document.getElementById('swapNoteInput');
    if (noteInput) noteInput.value = '';

    this.previewTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    const lbl = document.getElementById('swapPreviewThemeLabel');
    if (lbl) lbl.textContent = this.previewTheme === 'dark' ? 'Light' : 'Dark';

    this._renderInspectedBanner();
    this._renderSlotTabs();
    this._renderLibraryFilters();
    this._syncAdherenceButtons();

    openDialogWithOrigin(modal, triggerEl);
    this._loadCandidates();

    if (typeof window.lucide !== 'undefined') {
      try { window.lucide.createIcons({ root: modal }); } catch {}
    }
  }

  _renderInspectedBanner() {
    const banner = document.getElementById('swapInspectedBanner');
    const codeEl = document.getElementById('swapInspectedSelector');
    if (!banner || !codeEl) return;
    if (!this.inspectedElement) {
      banner.hidden = true;
      return;
    }
    banner.hidden = false;
    const textHint = this.inspectedElement.text ? ` — "${this.inspectedElement.text.slice(0, 42)}"` : '';
    codeEl.textContent = `${this.inspectedElement.label || this.inspectedElement.tag}${textHint}`;
  }

  _renderSlotTabs() {
    const host = document.getElementById('swapSlotTabs');
    if (!host) return;
    const tabs = [...CORE_SECTION_SLOTS.map((s) => ({ id: s.id, label: s.label }))];
    if (this.inspectedElement || this.activeSlot === 'custom') {
      tabs.push({ id: 'custom', label: 'Selected Element' });
    }

    host.innerHTML = tabs.map((t) => `
      <button type="button" class="swap-slot-tab${this.activeSlot === t.id ? ' active' : ''}" data-swap-slot="${escapeHtml(t.id)}" role="tab" aria-selected="${this.activeSlot === t.id ? 'true' : 'false'}">
        ${escapeHtml(t.label)}
      </button>
    `).join('');

    host.querySelectorAll('[data-swap-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeSlot = btn.dataset.swapSlot || 'hero';
        this._renderSlotTabs();
        this._loadCandidates();
      });
    });
  }

  _renderLibraryFilters() {
    const host = document.getElementById('swapLibraryFilters');
    if (!host) return;
    host.innerHTML = CROSS_LIBRARY_FILTERS.map((f) => `
      <button type="button" class="swap-lib-filter${this.libraryFilter === f.id ? ' active' : ''}" data-swap-lib="${escapeHtml(f.id)}">
        ${escapeHtml(f.label)}
      </button>
    `).join('');

    host.querySelectorAll('[data-swap-lib]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.libraryFilter = btn.dataset.swapLib || 'all';
        this._renderLibraryFilters();
        this._loadCandidates();
      });
    });
  }

  _syncAdherenceButtons() {
    const modal = document.getElementById('sectionSwapModal');
    if (!modal) return;
    modal.querySelectorAll('[data-swap-adherence]').forEach((btn) => {
      const isActive = btn.dataset.swapAdherence === this.adherence;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    const hintEl = document.getElementById('swapAdherenceHint');
    if (hintEl) {
      hintEl.textContent = this.adherence === 'strict'
        ? 'Verbatim copy-paste: preserves exact layout & classes, updates only brand copy and imports.'
        : 'Theme adapted: preserves layout structure while matching your project colors, fonts & tone.';
    }
  }

  async _loadCandidates() {
    const seq = ++this._reqSeq;
    this.loading = true;
    this._renderList();

    const items = await queryCrossLibraryCandidates(this.studio.uiLibraryManager, {
      slot: this.activeSlot,
      libraryFilter: this.libraryFilter,
      query: this.searchQuery,
      blocksFirst: this.blocksFirst,
      limit: 30,
    });

    if (seq !== this._reqSeq) return;
    this.loading = false;
    this.candidates = items;

    // Auto-select first item if current selection is absent from list
    const stillPresent = this.selectedCandidate
      && items.some((c) => c.libraryId === this.selectedCandidate.libraryId && c.id === this.selectedCandidate.id);
    if (!stillPresent) {
      this.selectedCandidate = items[0] || null;
    }

    this._renderList();
    if (this.selectedCandidate) {
      this._selectCandidate(this.selectedCandidate);
    } else {
      this._syncPreviewPane();
    }
  }

  _renderList() {
    const listEl = document.getElementById('swapCandidateList');
    const countEl = document.getElementById('swapResultsCount');
    if (!listEl) return;

    if (this.loading) {
      if (countEl) countEl.textContent = 'Searching…';
      listEl.innerHTML = `<div class="swap-list-empty">Loading components across libraries…</div>`;
      return;
    }

    if (countEl) {
      countEl.textContent = `${this.candidates.length} ${this.candidates.length === 1 ? 'component' : 'components'}`;
    }

    if (!this.candidates.length) {
      listEl.innerHTML = `<div class="swap-list-empty">No components matched. Try another library filter or clear your search.</div>`;
      return;
    }

    listEl.innerHTML = this.candidates.map((item, idx) => {
      const isSelected = this.selectedCandidate
        && this.selectedCandidate.libraryId === item.libraryId
        && this.selectedCandidate.id === item.id;
      return `
        <button type="button" class="swap-cand-item${isSelected ? ' selected' : ''}" data-cand-idx="${idx}">
          <span class="swap-cand-top">
            <span class="swap-cand-name">${escapeHtml(item.name)}</span>
            <span class="swap-cand-lib">
              <span class="swap-cand-dot" style="background:${escapeHtml(item.librarySwatch)}"></span>
              ${escapeHtml(item.libraryName)}
            </span>
          </span>
          <span class="swap-cand-desc">${escapeHtml(item.description || item.category || 'UI component')}</span>
        </button>
      `;
    }).join('');

    listEl.querySelectorAll('[data-cand-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cand = this.candidates[Number(btn.dataset.candIdx)];
        if (cand) this._selectCandidate(cand);
      });
    });
  }

  async _selectCandidate(candidate) {
    this.selectedCandidate = candidate;
    this._renderList();
    this._syncPreviewPane();

    const detailSeq = ++this._detailSeq;
    const hydrated = await hydrateCandidateDetail(this.studio.uiLibraryManager, candidate);
    if (detailSeq !== this._detailSeq || !hydrated) return;
    this.selectedCandidate = hydrated;
    // Update cached item in list so re-clicking is instant
    const idx = this.candidates.findIndex((c) => c.libraryId === hydrated.libraryId && c.id === hydrated.id);
    if (idx >= 0) this.candidates[idx] = hydrated;
    this._syncPreviewPane();
  }

  _syncPreviewPane() {
    const modal = document.getElementById('sectionSwapModal');
    const titleEl = document.getElementById('swapSelectedTitle');
    const metaEl = document.getElementById('swapSelectedMeta');
    const previewWrap = document.getElementById('swapPreviewFrameWrap');
    const codePre = document.getElementById('swapCodeView');
    const applyBtn = document.getElementById('btnSwapApply');

    modal?.querySelectorAll('[data-swap-view]').forEach((btn) => {
      const active = btn.dataset.swapView === this.previewMode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    const cand = this.selectedCandidate;
    if (!cand) {
      if (titleEl) titleEl.textContent = 'Select a replacement component';
      if (metaEl) metaEl.textContent = 'Choose any block from the left catalog';
      if (applyBtn) applyBtn.disabled = true;
      if (previewWrap) previewWrap.hidden = false;
      if (codePre) {
        codePre.hidden = true;
        codePre.textContent = '';
      }
      const iframe = document.getElementById('swapPreviewIframe');
      if (iframe) iframe.srcdoc = '<!doctype html><html><body style="margin:0;background:#0d0d10;color:#71717a;font:13px/1.5 system-ui;display:grid;place-items:center;height:100vh">Select a component to preview</body></html>';
      return;
    }

    if (titleEl) titleEl.textContent = cand.name;
    if (metaEl) metaEl.textContent = `${cand.libraryName} · ${cand.category}`;
    if (applyBtn) applyBtn.disabled = false;

    if (previewWrap) previewWrap.hidden = this.previewMode !== 'preview';
    if (codePre) {
      codePre.hidden = this.previewMode !== 'code';
      codePre.textContent = cand.code || cand.renderedHtml || cand.previewHtml || '// Loading component source…';
    }

    if (this.previewMode === 'preview') {
      this._renderPreviewIframe();
    }
  }

  _renderPreviewIframe() {
    const iframe = document.getElementById('swapPreviewIframe');
    const cand = this.selectedCandidate;
    if (!iframe || !cand) return;

    try {
      const srcdoc = buildInteractivePreviewSrcdoc({
        lib: cand.rawLibrary,
        element: cand.rawElement,
        theme: this.previewTheme,
        animate: true,
      });
      iframe.srcdoc = srcdoc;
    } catch {
      const fallback = escapeHtml(cand.code || cand.name).slice(0, 600);
      iframe.srcdoc = `<!doctype html><html><body style="margin:0;padding:20px;background:#111;color:#e4e4e7;font:12px/1.5 monospace"><pre>${fallback}</pre></body></html>`;
    }
  }

  async _applySwap() {
    if (!this.selectedCandidate) return;
    const applyBtn = document.getElementById('btnSwapApply');
    if (applyBtn) applyBtn.disabled = true;

    const hydrated = await hydrateCandidateDetail(this.studio.uiLibraryManager, this.selectedCandidate);
    const note = document.getElementById('swapNoteInput')?.value?.trim() || '';

    let domContext = '';
    let targetLabel = '';
    if (this.inspectedElement) {
      const sel = this.inspectedElement;
      let desc = `<${sel.tag}`;
      if (sel.id) desc += ` id="${sel.id}"`;
      if (sel.classes) desc += ` class="${sel.classes}"`;
      desc += '>';
      if (sel.text) desc += ` (text: "${sel.text}")`;
      domContext = `[Inspected Target Element: \`${desc}\` — replace this specific section/component in the active project.]`;
      targetLabel = sel.label || sel.tag;
    }

    const prompt = buildSectionSwapPrompt({
      targetSlot: this.activeSlot,
      targetLabel,
      domContext,
      candidate: hydrated,
      adherence: this.adherence,
      customNotes: note,
    });

    if (applyBtn) applyBtn.disabled = false;
    if (!prompt) return;

    const modal = document.getElementById('sectionSwapModal');
    closeDialogFast(modal, {
      onClosed: () => {
        this.studio.preview?.clearSelectedElement?.();
        const input = document.getElementById('chatInput');
        if (input) {
          input.value = prompt;
          this.studio.autoGrow?.(input);
          input.focus();
        }
        this.studio.showToast(`Swapping section with "${hydrated.name}" (${hydrated.libraryName})…`);
        requestAnimationFrame(() => this.studio.sendChatMessage());
      },
    });
  }
}
