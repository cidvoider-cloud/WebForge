/**
 * WebForge Studio — UI Component Library Manager
 *
 * Manages built-in + custom/imported UI libraries, compiles concise AI prompt
 * contracts, auto-bundles `src/components/ui.jsx` + `src/styles/ui-tokens.css`
 * into workspace VFS, extracts project files into library elements, and handles
 * JSON + GitHub library imports/exports.
 */

import { safeStorageGet, safeStorageJsonGet, safeStorageSet, STORAGE_KEYS, generateId } from './storage.mjs';
import {
  BUILT_IN_UI_LIBRARIES,
  UI_ELEMENT_CATEGORIES,
  SHARED_UI_BASE_CSS,
  buildReactKitModule,
} from './ui-library-packs.mjs';
import {
  HIDE_OTHER_SOURCES,
  HARD_DELETE,
  KEEP_INDEXED_LIBRARY_IDS,
  PREFERRED_FALLBACK_LIBRARY_ID,
  VERIFICATION_STATUS,
  PREVIEW_KIT_MANIFEST,
  isLibraryArchived,
  createLibraryManifest,
} from './ui-library-schema.mjs';
import { normalizeComponentRecord } from './ui-normalizer.mjs';

export {
  UI_ELEMENT_CATEGORIES,
  BUILT_IN_UI_LIBRARIES,
  HIDE_OTHER_SOURCES,
  HARD_DELETE,
  KEEP_INDEXED_LIBRARY_IDS,
  PREFERRED_FALLBACK_LIBRARY_ID,
};

export function inferCategoryFromCodeOrPath(nameOrPath = '', code = '') {
  const hay = `${nameOrPath} ${code.slice(0, 300)}`.toLowerCase();
  if (/button|btn|cta/.test(hay)) return 'buttons';
  if (/pricing|price|plan|tier/.test(hay)) return 'pricing';
  if (/modal|dialog|drawer|sheet/.test(hay)) return 'modals';
  if (/table|metric|kpi|stat/.test(hay)) return 'tables';
  if (/navbar|header|topbar|navigation/.test(hay)) return 'navbar';
  if (/hero|banner/.test(hay)) return 'hero';
  if (/input|form|field|textarea|select/.test(hay)) return 'forms';
  if (/(?:^|[^a-z])tabs?(?:[^a-z]|$)|segment/.test(hay)) return 'tabs';
  if (/alert|toast|notice|badge/.test(hay)) return 'alerts';
  if (/accordion|faq|disclosure/.test(hay)) return 'accordion';
  if (/footer/.test(hay)) return 'footer';
  return 'cards';
}

export function extractElementFromProjectFile(filePath = '', fileCode = '') {
  const cleanPath = String(filePath || 'Component.jsx').trim();
  const baseName = cleanPath.split('/').pop().replace(/\.(jsx|tsx|js|ts|css|html)$/i, '');
  const exportMatch = String(fileCode || '').match(/export\s+(?:default\s+)?(?:function|const|class)\s+([A-Z][A-Za-z0-9_]*)/);
  const rawName = exportMatch?.[1] || baseName || 'Custom Element';
  const name = rawName
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const category = inferCategoryFromCodeOrPath(`${cleanPath} ${rawName}`, fileCode);
  return {
    id: `el-${generateId()}`,
    name,
    category,
    description: `Saved from ${cleanPath}`,
    code: String(fileCode || '').slice(0, 14000),
    previewHtml: '',
  };
}

export function mergeClientAiTemplates(localList = [], serverList = []) {
  const byId = new Map();
  for (const item of Array.isArray(serverList) ? serverList : []) {
    if (!item || !item.id || !item.name || !item.prompt) continue;
    byId.set(String(item.id), { ...item });
  }
  let recoveredCount = 0;
  for (const item of Array.isArray(localList) ? localList : []) {
    if (!item || !item.id || !item.name || !item.prompt) continue;
    const id = String(item.id);
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, { ...item });
      recoveredCount += 1;
    } else if (Number(item.updatedAt || 0) > Number(existing.updatedAt || 0)) {
      byId.set(id, { ...existing, ...item });
    }
  }
  const templates = Array.from(byId.values()).sort(
    (a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0)
  );
  return { templates, recoveredCount };
}

export function extractCodeFromAiPrompt(promptText = '') {
  const raw = String(promptText || '').trim();
  if (!raw) return { code: '', renderedHtml: '', isHtml: false };

  const fenceMatch = raw.match(/```(tsx|jsx|ts|js|html|htm)?\s*\n([\s\S]*?)```/i);
  const lang = (fenceMatch?.[1] || '').toLowerCase();
  const code = (fenceMatch?.[2] || raw).trim();
  const looksHtml =
    lang === 'html' ||
    lang === 'htm' ||
    (!/\b(?:import|export|function|const|return\s*\(|useState|useEffect)\b/.test(code) &&
      /^<(?:!doctype|html|div|section|header|nav|main|article|aside|footer|form|button|a|ul|table)\b/i.test(code));

  return {
    code,
    renderedHtml: looksHtml ? code : '',
    isHtml: looksHtml,
  };
}

export function parseBulkAiTemplatesInput(rawText = '', defaultTargetLibrary = '21st.dev') {
  const text = String(rawText || '').trim();
  if (!text) return [];

  // 1. JSON array or exported queue object
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.templates) ? parsed.templates : [];
      const cleaned = list
        .filter((it) => it && (it.name || it.title) && (it.prompt || it.code))
        .map((it) => ({
          name: String(it.name || it.title).trim(),
          targetLibrary: String(it.targetLibrary || defaultTargetLibrary || '21st.dev').trim() || '21st.dev',
          category: String(it.category || 'auto').trim() || 'auto',
          prompt: String(it.prompt || it.code).trim(),
        }));
      if (cleaned.length) return cleaned;
    } catch {
      // Fall through to markdown parser
    }
  }

  // 2. Markdown sections separated by ## Heading
  const sectionRe = /^#{1,3}\s+(?:\d+\.\s*)?([^\n]+)\n([\s\S]*?)(?=^#{1,3}\s+|\Z)/gm;
  const sections = [];
  const normalized = text.replace(/\r\n/g, '\n');
  const headingMatches = [...normalized.matchAll(/^#{1,3}\s+(?:\d+\.\s*)?([^\n]+)$/gm)];
  if (headingMatches.length) {
    for (let i = 0; i < headingMatches.length; i++) {
      const m = headingMatches[i];
      const start = m.index + m[0].length;
      const end = i + 1 < headingMatches.length ? headingMatches[i + 1].index : normalized.length;
      let heading = m[1].trim();
      let targetLibrary = defaultTargetLibrary || '21st.dev';
      const targetMatch = heading.match(/\(\s*Target\s+Library\s*:\s*([^)]+)\)/i);
      if (targetMatch) {
        targetLibrary = targetMatch[1].trim();
        heading = heading.replace(targetMatch[0], '').trim();
      }
      const body = normalized.slice(start, end).trim();
      if (heading && body) {
        sections.push({ name: heading, targetLibrary, category: 'auto', prompt: body });
      }
    }
    if (sections.length) return sections;
  }

  void sectionRe;
  return [];
}

export class UILibraryManager {
  constructor() {
    this.customLibraries = this._loadCustomLibraries();
    this.verificationSummary = null;
    this.previewKitStatus = null;
    this.activeLibraryFallbackNotice = null;
    this.activeLibraryId = safeStorageGet(STORAGE_KEYS.ACTIVE_UI_LIBRARY, PREFERRED_FALLBACK_LIBRARY_ID) || 'none';
    this._ensureVisibleActiveLibrary();
    this.aiTemplates = this._loadCachedAiTemplates();
    this.lastSyncRecoveredCount = 0;
  }

  _ensureVisibleActiveLibrary() {
    if (!this.activeLibraryId || this.activeLibraryId === 'none') return;
    const current = this.getLibrary(this.activeLibraryId);
    if (!current || isLibraryArchived(current)) {
      const visible = this.getVisibleLibraries();
      const preferred =
        visible.find((l) => l.id === PREFERRED_FALLBACK_LIBRARY_ID) ||
        visible.find((l) => KEEP_INDEXED_LIBRARY_IDS.includes(l.id)) ||
        visible[0] ||
        null;
      const prevName = current?.name || this.activeLibraryId;
      this.activeLibraryId = preferred ? preferred.id : 'none';
      this._persist();
      if (preferred) {
        this.activeLibraryFallbackNotice = {
          previousId: current?.id || '',
          previousName: prevName,
          nextId: preferred.id,
          nextName: preferred.name,
          message: `Switched active UI library from ${prevName} to ${preferred.name}.`,
        };
      }
    }
  }

  consumeActiveLibraryFallbackNotice() {
    const notice = this.activeLibraryFallbackNotice;
    this.activeLibraryFallbackNotice = null;
    return notice;
  }

  _loadCachedAiTemplates() {
    const raw = safeStorageJsonGet(STORAGE_KEYS.UI_AI_QUEUE, []);
    const valid = Array.isArray(raw) ? raw.filter((t) => t && t.id && t.name && t.prompt) : [];
    if (valid.length) return valid;
    const backup = safeStorageJsonGet('wf_ui_ai_templates_backup_v1', []);
    return Array.isArray(backup) ? backup.filter((t) => t && t.id && t.name && t.prompt) : [];
  }

  _persistAiTemplatesCache(allowClearBackup = false) {
    const serialized = JSON.stringify(this.aiTemplates);
    safeStorageSet(STORAGE_KEYS.UI_AI_QUEUE, serialized);
    if (this.aiTemplates.length > 0 || allowClearBackup) {
      safeStorageSet('wf_ui_ai_templates_backup_v1', serialized);
    }
  }

  _loadCustomLibraries() {
    const raw = safeStorageJsonGet(STORAGE_KEYS.UI_LIBRARIES, []);
    if (!Array.isArray(raw)) return [];
    return raw.filter((lib) => lib && lib.id && lib.name).map((lib) => ({
      ...lib,
      isBuiltIn: false,
      archived: Boolean(lib.archived),
      manifestSource: 'custom',
      tailwindVersion: Number(lib.tailwindVersion || PREVIEW_KIT_MANIFEST.tailwindVersion),
      elements: Array.isArray(lib.elements) ? lib.elements : [],
      swatches: Array.isArray(lib.swatches) && lib.swatches.length ? lib.swatches : ['#111113', '#27272A', '#FAFAFA', '#10B981'],
    }));
  }

  _persist() {
    safeStorageSet(STORAGE_KEYS.UI_LIBRARIES, JSON.stringify(this.customLibraries));
    safeStorageSet(STORAGE_KEYS.ACTIVE_UI_LIBRARY, this.activeLibraryId || 'none');
  }

  getAllLibraries() {
    return [...BUILT_IN_UI_LIBRARIES, ...this.customLibraries];
  }

  /**
   * Returns only non-archived libraries for UI navigation (5 kept indexed libraries + custom/imported).
   */
  getVisibleLibraries() {
    return this.getAllLibraries().filter((l) => !isLibraryArchived(l));
  }

  /**
   * Resolves any library ID including archived ones so existing projects keep working seamlessly.
   */
  getLibrary(id) {
    if (!id || id === 'none') return null;
    return this.getAllLibraries().find((l) => l.id === id) || null;
  }

  getActiveLibrary() {
    return this.getLibrary(this.activeLibraryId);
  }

  setActiveLibrary(id) {
    if (!id || id === 'none') {
      this.activeLibraryId = 'none';
      this._persist();
      return null;
    }
    const found = this.getLibrary(id);
    if (!found || isLibraryArchived(found)) {
      const visible = this.getVisibleLibraries();
      const fallback = visible.find((l) => l.id === PREFERRED_FALLBACK_LIBRARY_ID) || visible[0] || null;
      this.activeLibraryId = fallback ? fallback.id : 'none';
      this._persist();
      return fallback;
    }
    this.activeLibraryId = found.id;
    this._persist();
    return found;
  }

  /**
   * Returns strictly the verified component count for a library.
   */
  getVerifiedCount(libOrId) {
    const lib = typeof libOrId === 'string' ? this.getLibrary(libOrId) : libOrId;
    if (!lib) return 0;
    if (lib.isRemoteCatalog) {
      const stats = this.verificationSummary?.libraries?.[lib.id];
      return stats ? Number(stats.verifiedCount || 0) : 0;
    }
    const els = Array.isArray(lib.elements) ? lib.elements : [];
    return els.filter((e) => (e.status || e.verificationStatus || VERIFICATION_STATUS.VERIFIED) === VERIFICATION_STATUS.VERIFIED).length;
  }

  getTotalVerifiedCount() {
    let total = 0;
    for (const lib of this.getVisibleLibraries()) {
      total += this.getVerifiedCount(lib);
    }
    return total;
  }

  getLibraryStats(libId) {
    return this.verificationSummary?.libraries?.[libId] || {
      libraryId: libId,
      verifiedCount: 0,
      degradedCount: 0,
      failedCount: 0,
      totalChecked: 0,
      topReasons: [],
      issues: [],
    };
  }

  /**
   * Step 7 — Returns the unified Library Manifest Schema for any library.
   */
  getLibraryManifest(libraryId) {
    const lib = this.getLibrary(libraryId);
    if (!lib) return null;
    const elements = Array.isArray(lib.elements) ? lib.elements : [];
    const deps = new Set();
    for (const el of elements) {
      const depObj = el?.manifest?.dependencies || {};
      for (const pkg of Object.keys(depObj)) deps.add(pkg);
    }
    return createLibraryManifest({
      id: lib.id,
      name: lib.name,
      source: lib.isRemoteCatalog ? 'indexed' : 'custom',
      framework: lib.framework || (lib.catalogType === 'html' ? 'html' : 'react'),
      tailwindVersion: lib.tailwindVersion || PREVIEW_KIT_MANIFEST.tailwindVersion,
      theme: { tokensCss: lib.tokensCss || '' },
      deps: Array.from(deps),
      components: elements,
      archived: isLibraryArchived(lib),
      pinnedCommit: lib.pinnedCommit || '',
      sourceUrl: lib.sourceUrl || '',
    });
  }

  async fetchPreviewKitStatus() {
    if (typeof fetch !== 'function') return null;
    try {
      const res = await fetch('/api/preview-kit/status', { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      this.previewKitStatus = data.kit || null;
      if (data.verification) this.verificationSummary = data.verification;
      return data;
    } catch {
      return null;
    }
  }

  async repairPreviewKit() {
    if (typeof fetch !== 'function') return null;
    const res = await fetch('/api/preview-kit/repair', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Could not repair preview environment');
    this.previewKitStatus = data.kit || null;
    if (data.verification) this.verificationSummary = data.verification;
    return data;
  }

  async fetchCatalogIssues(catalogId) {
    const id = String(catalogId || '').trim();
    if (!id || typeof fetch !== 'function') return { issues: [], failedCount: 0 };
    const res = await fetch(`/api/catalogs/${encodeURIComponent(id)}/issues`, { cache: 'no-store' });
    if (!res.ok) return { issues: [], failedCount: 0 };
    return res.json();
  }

  createCustomLibrary({
    name,
    tagline = 'Custom UI component library',
    source = 'custom',
    sourceUrl = '',
    fontsLabel = 'Plus Jakarta Sans + JetBrains Mono',
    fontsUrl = '',
    swatches = ['#111113', '#1E1F24', '#FAFAFA', '#3B82F6'],
    tokensCss = '',
    aiRules = [],
    elements = [],
  } = {}) {
    const cleanName = String(name || '').trim();
    if (!cleanName) throw new Error('Library name is required');

    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom';
    const id = `custom-${slug}-${generateId().slice(0, 4)}`;
    const bg = swatches[0] || '#111113';
    const surface = swatches[1] || '#1B1C22';
    const accent = swatches[2] || '#FAFAFA';
    const text = swatches[3] || '#F4F4F5';

    const generatedTokens = tokensCss.trim()
      ? tokensCss.trim()
      : `${fontsUrl ? `@import url('${fontsUrl}');\n` : ''}${SHARED_UI_BASE_CSS}
:root, .wf-ui-scope {
  --wf-bg: ${bg};
  --wf-surface: ${surface};
  --wf-fg: ${text};
  --wf-muted: #94A3B8;
  --wf-border: rgba(148,163,184,0.24);
  --wf-border-width: 1px;
  --wf-accent: ${accent};
  --wf-accent-fg: ${bg};
  --wf-accent-text: ${accent};
  --wf-radius: 8px;
  --wf-font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --wf-font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
  --wf-font-mono: 'JetBrains Mono', monospace;
}`;

    const normalizedElements = (Array.isArray(elements) ? elements : []).map((rawEl) =>
      this._normalizeCustomElement(rawEl, id)
    );

    const pack = {
      id,
      name: cleanName,
      tagline: String(tagline || 'Custom UI component library').trim(),
      isBuiltIn: false,
      archived: false,
      manifestSource: 'custom',
      framework: 'react',
      tailwindVersion: PREVIEW_KIT_MANIFEST.tailwindVersion,
      source,
      sourceUrl,
      fontsLabel,
      fontsUrl,
      swatches,
      aiRules: Array.isArray(aiRules) && aiRules.length
        ? aiRules
        : [`Follow the ${cleanName} component styling and CSS tokens consistently across all screens.`],
      tokensCss: generatedTokens,
      kitCode: '',
      elements: normalizedElements,
    };
    pack.kitCode = buildReactKitModule(pack);

    this.customLibraries.unshift(pack);
    this._persist();
    return pack;
  }

  _normalizeCustomElement(elementInput = {}, libraryId = 'custom') {
    const name = String(elementInput.name || elementInput.title || 'Custom Component').trim();
    const code = String(elementInput.code || '').trim();
    const previewHtml = String(elementInput.previewHtml || '').trim();
    const renderedHtml = String(elementInput.renderedHtml || '').trim();
    const category = UI_ELEMENT_CATEGORIES.some((c) => c.id === elementInput.category)
      ? elementInput.category
      : inferCategoryFromCodeOrPath(elementInput.path || name, code);

    const norm = normalizeComponentRecord(
      {
        id: elementInput.id || `el-${generateId()}`,
        name,
        title: name,
        category,
        description: String(elementInput.description || 'Custom UI component').trim(),
        code,
        demoCode: String(elementInput.demoCode || '').trim(),
        renderedHtml: renderedHtml || (!code ? previewHtml : ''),
        previewCss: String(elementInput.previewCss || '').trim(),
        auxiliaryFiles: Array.isArray(elementInput.auxiliaryFiles) ? elementInput.auxiliaryFiles : [],
      },
      { libraryId }
    );

    return {
      ...norm,
      name,
      previewHtml,
      renderedHtml,
      previewCss: String(elementInput.previewCss || '').trim(),
      verificationStatus: norm.status,
    };
  }

  deleteCustomLibrary(id) {
    const idx = this.customLibraries.findIndex((l) => l.id === id);
    if (idx === -1) return false;
    this.customLibraries.splice(idx, 1);
    if (this.activeLibraryId === id) this.activeLibraryId = 'none';
    this._persist();
    return true;
  }

  addElementToLibrary(libraryId, elementInput = {}) {
    let target = this.customLibraries.find((l) => l.id === libraryId);

    // If user tries to add an element to a built-in library, auto-create/reuse a companion custom pack
    if (!target) {
      const builtIn = BUILT_IN_UI_LIBRARIES.find((l) => l.id === libraryId);
      if (!builtIn) throw new Error('Target library not found');
      const companionName = `${builtIn.name} (Custom)`;
      target = this.customLibraries.find((l) => l.name === companionName);
      if (!target) {
        target = this.createCustomLibrary({
          name: companionName,
          tagline: `Extended from ${builtIn.name}`,
          fontsLabel: builtIn.fontsLabel,
          fontsUrl: builtIn.fontsUrl,
          swatches: [...builtIn.swatches],
          tokensCss: builtIn.tokensCss,
          aiRules: [...(builtIn.aiRules || [])],
          elements: builtIn.elements.map((e) => ({ ...e })),
        });
        if (builtIn.extraFiles) target.extraFiles = { ...builtIn.extraFiles };
        if (builtIn.aiComponentDocs) target.aiComponentDocs = [...builtIn.aiComponentDocs];
      }
    }

    const name = String(elementInput.name || '').trim();
    const code = String(elementInput.code || '').trim();
    if (!name) throw new Error('Element name is required');
    if (!code) throw new Error('Component JSX or HTML code is required');

    const el = this._normalizeCustomElement(
      {
        ...elementInput,
        name,
        code,
      },
      target.id
    );

    target.elements.unshift(el);
    this._persist();
    return { library: target, element: el };
  }

  deleteElementFromLibrary(libraryId, elementId) {
    const lib = this.customLibraries.find((l) => l.id === libraryId);
    if (!lib) return false;
    const before = lib.elements.length;
    lib.elements = lib.elements.filter((e) => e.id !== elementId);
    if (lib.elements.length === before) return false;
    this._persist();
    return true;
  }

  importFromGitHubPayload(payload) {
    if (!payload || !Array.isArray(payload.elements) || !payload.elements.length) {
      throw new Error('No UI components found in GitHub response');
    }
    const lib = this.createCustomLibrary({
      name: payload.libraryName || `${payload.repo || 'GitHub'} UI`,
      tagline: `Imported ${payload.elements.length} component${payload.elements.length === 1 ? '' : 's'} from ${payload.owner || 'GitHub'}/${payload.repo || 'repo'}`,
      source: 'github',
      sourceUrl: payload.sourceUrl || '',
      elements: payload.elements.map((el) => ({
        id: el.id || `el-${generateId()}`,
        name: el.name || 'Imported Component',
        category: el.category || inferCategoryFromCodeOrPath(el.path || el.name, el.code),
        description: el.description || `Imported from GitHub`,
        code: el.code || '',
        previewHtml: '',
      })),
    });
    return lib;
  }

  exportLibraryJson(libraryId) {
    const lib = this.getLibrary(libraryId);
    if (!lib) throw new Error('Library not found');
    return JSON.stringify(
      {
        schema: 'webforge-ui-library/v1',
        name: lib.name,
        tagline: lib.tagline,
        fontsLabel: lib.fontsLabel,
        fontsUrl: lib.fontsUrl || '',
        swatches: lib.swatches || [],
        aiRules: lib.aiRules || [],
        tokensCss: lib.tokensCss || '',
        elements: (lib.elements || []).map((e) => ({
          name: e.name,
          category: e.category,
          description: e.description || '',
          previewHtml: e.previewHtml || '',
          code: e.code || '',
        })),
      },
      null,
      2
    );
  }

  importLibraryJson(rawJson) {
    let parsed;
    try {
      parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
    } catch {
      throw new Error('Invalid JSON file. Please provide a valid WebForge UI Library JSON.');
    }
    if (!parsed || typeof parsed !== 'object' || !parsed.name) {
      throw new Error('JSON library must include at least a "name" field.');
    }
    const elements = Array.isArray(parsed.elements)
      ? parsed.elements
          .filter((e) => e && e.name && (e.code || e.previewHtml))
          .map((e) => ({
            id: `el-${generateId()}`,
            name: String(e.name).trim(),
            category: UI_ELEMENT_CATEGORIES.some((c) => c.id === e.category)
              ? e.category
              : inferCategoryFromCodeOrPath(e.name, e.code || ''),
            description: String(e.description || 'Imported component').trim(),
            previewHtml: String(e.previewHtml || '').trim(),
            code: String(e.code || '').trim(),
          }))
      : [];

    return this.createCustomLibrary({
      name: parsed.name,
      tagline: parsed.tagline || 'Imported JSON UI Library',
      source: 'json',
      fontsLabel: parsed.fontsLabel || 'Custom Typography',
      fontsUrl: parsed.fontsUrl || '',
      swatches: Array.isArray(parsed.swatches) && parsed.swatches.length ? parsed.swatches : undefined,
      tokensCss: parsed.tokensCss || '',
      aiRules: Array.isArray(parsed.aiRules) ? parsed.aiRules : [],
      elements,
    });
  }

  /**
   * Auto-bundle the library's CSS tokens and React kit into a workspace VFS.
   * Preserves existing user code and adds `./styles/ui-tokens.css` import to `src/index.css`.
   */
  applyLibraryToVfs(vfs = {}, libraryId = this.activeLibraryId) {
    const lib = this.getLibrary(libraryId);
    if (!lib) return { nextVfs: { ...vfs }, addedPaths: [] };

    const nextVfs = { ...vfs };
    const addedPaths = [];

    nextVfs['src/styles/ui-tokens.css'] = lib.tokensCss;
    addedPaths.push('src/styles/ui-tokens.css');

    nextVfs['src/components/ui.jsx'] = lib.kitCode || buildReactKitModule(lib);
    addedPaths.push('src/components/ui.jsx');

    if (lib.extraFiles && typeof lib.extraFiles === 'object') {
      for (const [filePath, fileCode] of Object.entries(lib.extraFiles)) {
        if (!filePath || typeof fileCode !== 'string') continue;
        nextVfs[filePath] = fileCode;
        addedPaths.push(filePath);
      }
    }

    // Ensure src/index.css imports the bundled UI tokens
    const importLine = "@import './styles/ui-tokens.css';";
    if (typeof nextVfs['src/index.css'] === 'string') {
      if (!nextVfs['src/index.css'].includes('./styles/ui-tokens.css')) {
        nextVfs['src/index.css'] = `${importLine}\n${nextVfs['src/index.css']}`;
      }
    } else {
      nextVfs['src/index.css'] = `${importLine}\n\nbody { margin: 0; background: var(--wf-bg); color: var(--wf-fg); font-family: var(--wf-font-body); }\n`;
      addedPaths.push('src/index.css');
    }

    return { nextVfs, addedPaths };
  }

  /**
   * Compiles a concise, high-signal AI system prompt section so local & cloud LLMs
   * import and compose the active UI library cleanly instead of writing raw HTML from scratch.
   */
  buildPromptGuide(libraryId = this.activeLibraryId) {
    const lib = this.getLibrary(libraryId);
    if (!lib) return '';

    const curatedDocs = Array.isArray(lib.aiComponentDocs) && lib.aiComponentDocs.length
      ? lib.aiComponentDocs
          .map((doc) => `- **${doc.name}** (\`${doc.filePath}\` -> import from \`${doc.importPath}\`):\n\`\`\`tsx\n${doc.usage}\n\`\`\``)
          .join('\n')
      : '';

    const customSnippets = (lib.elements || [])
      .filter((el) => !lib.isBuiltIn && el.code)
      .slice(0, 4)
      .map((el) => `- ${el.name} (${el.category}): ${el.description}\n\`\`\`jsx\n${el.code.slice(0, 600)}\n\`\`\``)
      .join('\n');

    return [
      `# Active UI Component Library: ${lib.name}`,
      `Aesthetic: ${lib.tagline}`,
      `Typography: ${lib.fontsLabel || 'Library defined'}`,
      `Color Swatches: ${(lib.swatches || []).join(', ')}`,
      ``,
      `## Pre-Bundled Kit Available in Project`,
      `The project includes \`src/styles/ui-tokens.css\` and \`src/components/ui.jsx\`.`,
      `Always wrap your root container in \`className="wf-ui-scope min-h-screen"\` and import primitives directly from \`./components/ui\` instead of rebuilding them from scratch:`,
      `- Exported components: \`Button\`, \`Navbar\`, \`HeroShell\`, \`Card\`, \`Input\`, \`Tabs\`, \`Modal\`, \`MetricTile\`, \`DataTable\`, \`PricingCard\`, \`AlertBanner\`, \`Accordion\`, \`SiteFooter\`.`,
      `- CSS tokens available: \`var(--wf-bg)\`, \`var(--wf-surface)\`, \`var(--wf-fg)\`, \`var(--wf-muted)\`, \`var(--wf-border)\`, \`var(--wf-accent)\`, \`var(--wf-accent-fg)\`, \`var(--wf-radius)\`, \`var(--wf-font-display)\`, \`var(--wf-font-body)\`, \`var(--wf-font-mono)\`.`,
      ...(curatedDocs ? [``, `## Curated Components Bundled in Project`, curatedDocs] : []),
      ...(lib.aiRules?.length ? [``, `## Visual Rules for ${lib.name}`, ...lib.aiRules.map((r) => `- ${r}`)] : []),
      ...(customSnippets ? [``, `## Custom Library Components`, customSnippets] : []),
    ].join('\n');
  }

  // ── AI Instructions (Batch Template Import Queue) ──

  getAiTemplates() {
    return Array.isArray(this.aiTemplates) ? this.aiTemplates : [];
  }

  getPendingAiTemplatesCount() {
    return this.getAiTemplates().filter((t) => t.status !== 'imported').length;
  }

  async syncAiTemplatesFromServer() {
    this.lastSyncRecoveredCount = 0;
    if (typeof fetch !== 'function') return this.getAiTemplates();
    const localItems = this.getAiTemplates();
    try {
      if (localItems.length > 0) {
        const res = await fetch('/api/ui-ai-queue/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templates: localItems }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.templates)) {
            this.aiTemplates = data.templates;
            this.lastSyncRecoveredCount = Number(data.recoveredCount || 0);
            this._persistAiTemplatesCache();
            return this.getAiTemplates();
          }
        }
      }
      const res = await fetch('/api/ui-ai-queue', { cache: 'no-store' });
      if (!res.ok) return this.getAiTemplates();
      const data = await res.json();
      if (Array.isArray(data?.templates)) {
        const { templates, recoveredCount } = mergeClientAiTemplates(localItems, data.templates);
        this.aiTemplates = templates;
        this.lastSyncRecoveredCount = recoveredCount;
        this._persistAiTemplatesCache();
      }
    } catch {
      // Offline / static mode — keep localStorage cache intact
    }
    return this.getAiTemplates();
  }

  async importAiTemplateToLibrary(templateId) {
    const cleanId = String(templateId || '').trim();
    const tpl = this.getAiTemplates().find((t) => t.id === cleanId);
    if (!tpl) throw new Error('Queued template not found');

    const targetName = String(tpl.targetLibrary || '21st.dev').trim() || '21st.dev';
    const allLibs = this.getAllLibraries();
    let targetLib =
      allLibs.find((l) => l.id === targetName || l.name.toLowerCase() === targetName.toLowerCase()) ||
      this.customLibraries.find((l) => l.name.toLowerCase() === `${targetName.toLowerCase()} (custom)`);

    if (!targetLib) {
      targetLib = this.createCustomLibrary({
        name: targetName,
        tagline: `Custom UI components imported from AI Instructions`,
        source: 'ai-instructions',
      });
    }

    const extracted = extractCodeFromAiPrompt(tpl.prompt);
    const category =
      tpl.category && tpl.category !== 'auto' && UI_ELEMENT_CATEGORIES.some((c) => c.id === tpl.category)
        ? tpl.category
        : inferCategoryFromCodeOrPath(tpl.name, extracted.code);

    const { library, element } = this.addElementToLibrary(targetLib.id, {
      name: tpl.name,
      category,
      description: `Imported from AI Instructions (${targetName})`,
      code: extracted.code,
      renderedHtml: extracted.renderedHtml,
      previewHtml: '',
    });

    const updated = await this.updateAiTemplate(tpl.id, { status: 'imported' });
    return { library, element, template: updated.item };
  }

  async addAiTemplate({ name, prompt, targetLibrary = '21st.dev', category = 'auto' } = {}) {
    const cleanName = String(name || '').trim();
    const cleanPrompt = String(prompt || '').trim();
    const cleanTarget = String(targetLibrary || '21st.dev').trim() || '21st.dev';
    const cleanCategory = String(category || 'auto').trim() || 'auto';
    if (!cleanName) throw new Error('Template name is required');
    if (!cleanPrompt) throw new Error('Template prompt is required');

    if (typeof fetch === 'function') {
      try {
        const res = await fetch('/api/ui-ai-queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanName,
            prompt: cleanPrompt,
            targetLibrary: cleanTarget,
            category: cleanCategory,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Could not save template');
        if (Array.isArray(data.templates)) {
          this.aiTemplates = data.templates;
          this._persistAiTemplatesCache();
          return { item: data.item, templates: this.aiTemplates, persistedToWorkspace: true };
        }
      } catch (err) {
        if (err?.message && !/fetch|network|failed/i.test(err.message)) throw err;
      }
    }

    const now = Date.now();
    const fallbackItem = {
      id: `tpl-${generateId()}`,
      name: cleanName,
      targetLibrary: cleanTarget,
      category: cleanCategory,
      prompt: cleanPrompt,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    this.aiTemplates = [fallbackItem, ...this.getAiTemplates()];
    this._persistAiTemplatesCache();
    return { item: fallbackItem, templates: this.aiTemplates, persistedToWorkspace: false };
  }

  async updateAiTemplate(id, patch = {}) {
    const cleanId = String(id || '').trim();
    if (!cleanId) throw new Error('Template id is required');
    const existing = this.getAiTemplates().find((t) => t.id === cleanId);
    if (!existing) throw new Error('Template not found');

    const nextName = String(patch.name ?? existing.name).trim();
    const nextPrompt = String(patch.prompt ?? existing.prompt).trim();
    const nextTarget = String(patch.targetLibrary ?? existing.targetLibrary ?? '21st.dev').trim() || '21st.dev';
    const nextCategory = String(patch.category ?? existing.category ?? 'auto').trim() || 'auto';
    const nextStatus = patch.status === 'imported' || (!patch.status && existing.status === 'imported')
      ? 'imported'
      : 'pending';
    if (!nextName) throw new Error('Template name is required');
    if (!nextPrompt) throw new Error('Template prompt is required');

    if (typeof fetch === 'function') {
      try {
        const res = await fetch('/api/ui-ai-queue', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: cleanId,
            name: nextName,
            prompt: nextPrompt,
            targetLibrary: nextTarget,
            category: nextCategory,
            status: nextStatus,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Could not update template');
        if (Array.isArray(data.templates)) {
          this.aiTemplates = data.templates;
          this._persistAiTemplatesCache();
          return { item: data.item, templates: this.aiTemplates };
        }
      } catch (err) {
        if (err?.message && !/fetch|network|failed/i.test(err.message)) throw err;
      }
    }

    const updated = {
      ...existing,
      name: nextName,
      prompt: nextPrompt,
      targetLibrary: nextTarget,
      category: nextCategory,
      status: nextStatus,
      updatedAt: Date.now(),
    };
    this.aiTemplates = this.getAiTemplates().map((t) => (t.id === cleanId ? updated : t));
    this._persistAiTemplatesCache();
    return { item: updated, templates: this.aiTemplates };
  }

  async deleteAiTemplate(id) {
    const cleanId = String(id || '').trim();
    if (!cleanId) return false;

    if (typeof fetch === 'function') {
      try {
        const res = await fetch(`/api/ui-ai-queue?id=${encodeURIComponent(cleanId)}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && Array.isArray(data?.templates)) {
          this.aiTemplates = data.templates;
          this._persistAiTemplatesCache(true);
          return Boolean(data.ok);
        }
      } catch {
        // Offline fallback
      }
    }

    const before = this.getAiTemplates().length;
    this.aiTemplates = this.getAiTemplates().filter((t) => t.id !== cleanId);
    this._persistAiTemplatesCache(true);
    return this.aiTemplates.length !== before;
  }

  exportAiTemplatesJson() {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        templates: this.getAiTemplates(),
      },
      null,
      2
    );
  }

  buildAiImportSummaryPrompt() {
    const pending = this.getAiTemplates().filter((t) => t.status !== 'imported');
    if (!pending.length) return '';
    return [
      `Please go through my ${pending.length} queued UI library template${pending.length === 1 ? '' : 's'} and import all of them into their target libraries:`,
      '',
      ...pending.map((t, idx) =>
        `## ${idx + 1}. ${t.name} (Target Library: ${t.targetLibrary})\n\n${t.prompt}`
      ),
    ].join('\n\n');
  }

  // ── Unified Multi-Library Remote Catalogs (Awesome, Kokonut UI, HyperUI, shadcn/ui) ──

  async queryRemoteCatalog(
    catalogId,
    { q = '', category = 'all', collection = 'all', blockCategory = 'all', subCategory = 'all', blocksFirst = false, page = 1, limit = 24, includeIssues = false } = {}
  ) {
    const id = String(catalogId || 'awesome-components').trim();
    const lib = this.getLibrary(id);
    if (typeof fetch !== 'function') {
      return {
        items: [],
        total: 0,
        catalogTotal: this.getVerifiedCount(lib),
        verifiedCount: this.getVerifiedCount(lib),
        degradedCount: 0,
        failedCount: 0,
        page: 1,
        limit,
        totalPages: 1,
        categoryCounts: { all: 0 },
      };
    }
    const params = new URLSearchParams({
      q: String(q || ''),
      category: String(category || 'all'),
      page: String(page || 1),
      limit: String(limit || 24),
    });
    if (collection && collection !== 'all') params.set('collection', String(collection));
    if (blockCategory && blockCategory !== 'all') params.set('blockCategory', String(blockCategory));
    if (subCategory && subCategory !== 'all') params.set('subCategory', String(subCategory));
    if (blocksFirst) params.set('blocksFirst', '1');
    if (includeIssues) params.set('includeIssues', '1');
    const endpoint = id === 'awesome-components'
      ? `/api/awesome-components?${params.toString()}`
      : `/api/catalogs/${encodeURIComponent(id)}?${params.toString()}`;
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Could not query ${lib?.name || id} catalog`);
    return res.json();
  }

  async fetchRemoteComponentDetail(catalogId, componentId) {
    const id = String(catalogId || 'awesome-components').trim();
    if (!componentId) throw new Error('Component id is required');
    const endpoint = id === 'awesome-components'
      ? `/api/awesome-components/detail?id=${encodeURIComponent(componentId)}`
      : `/api/catalogs/${encodeURIComponent(id)}/detail?id=${encodeURIComponent(componentId)}`;
    const res = await fetch(endpoint, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Could not load component source');
    return data;
  }

  async fetchRemoteAiMatches(catalogId, promptText, limit = 2) {
    const id = String(catalogId || 'awesome-components').trim();
    if (typeof fetch !== 'function' || !promptText) return '';
    try {
      const endpoint = id === 'awesome-components'
        ? `/api/awesome-components/ai-match?q=${encodeURIComponent(promptText.slice(0, 300))}&limit=${limit}`
        : `/api/catalogs/${encodeURIComponent(id)}/ai-match?q=${encodeURIComponent(promptText.slice(0, 300))}&limit=${limit}`;
      const res = await fetch(endpoint);
      if (!res.ok) return '';
      const data = await res.json();
      const matches = Array.isArray(data?.matches) ? data.matches : [];
      if (!matches.length) return '';
      const libName = data.catalogName || this.getLibrary(id)?.name || 'Remote Library';
      return [
        `## Matched ${libName} References (from ${data.catalogTotal || matches.length} indexed components)`,
        ...matches.map((m) => [
          `### ${m.name} (${m.category}, by ${m.authorName})`,
          m.jsxSnippet ? `\`\`\`tsx\n${m.jsxSnippet}\n\`\`\`` : '',
        ].filter(Boolean).join('\n')),
      ].join('\n\n');
    } catch {
      return '';
    }
  }

  async queryAwesomeCatalog(opts = {}) {
    return this.queryRemoteCatalog('awesome-components', opts);
  }

  async fetchAwesomeComponentDetail(id) {
    return this.fetchRemoteComponentDetail('awesome-components', id);
  }

  async fetchAwesomeAiMatches(promptText, limit = 2) {
    return this.fetchRemoteAiMatches('awesome-components', promptText, limit);
  }
}
