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

export { UI_ELEMENT_CATEGORIES, BUILT_IN_UI_LIBRARIES };

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

export class UILibraryManager {
  constructor() {
    this.customLibraries = this._loadCustomLibraries();
    this.activeLibraryId = safeStorageGet(STORAGE_KEYS.ACTIVE_UI_LIBRARY, 'saas-modern') || 'none';
    this.aiTemplates = this._loadCachedAiTemplates();
  }

  _loadCachedAiTemplates() {
    const raw = safeStorageJsonGet(STORAGE_KEYS.UI_AI_QUEUE, []);
    return Array.isArray(raw) ? raw.filter((t) => t && t.id && t.name && t.prompt) : [];
  }

  _persistAiTemplatesCache() {
    safeStorageSet(STORAGE_KEYS.UI_AI_QUEUE, JSON.stringify(this.aiTemplates));
  }

  _loadCustomLibraries() {
    const raw = safeStorageJsonGet(STORAGE_KEYS.UI_LIBRARIES, []);
    if (!Array.isArray(raw)) return [];
    return raw.filter((lib) => lib && lib.id && lib.name).map((lib) => ({
      ...lib,
      isBuiltIn: false,
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
    this.activeLibraryId = found ? found.id : 'none';
    this._persist();
    return found;
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

    const pack = {
      id,
      name: cleanName,
      tagline: String(tagline || 'Custom UI component library').trim(),
      isBuiltIn: false,
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
      elements: Array.isArray(elements) ? elements : [],
    };
    pack.kitCode = buildReactKitModule(pack);

    this.customLibraries.unshift(pack);
    this._persist();
    return pack;
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

    const el = {
      id: elementInput.id || `el-${generateId()}`,
      name,
      category: UI_ELEMENT_CATEGORIES.some((c) => c.id === elementInput.category)
        ? elementInput.category
        : inferCategoryFromCodeOrPath(name, code),
      description: String(elementInput.description || 'Custom UI component').trim(),
      previewHtml: String(elementInput.previewHtml || '').trim(),
      code,
    };

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
    if (typeof fetch !== 'function') return this.getAiTemplates();
    try {
      const res = await fetch('/api/ui-ai-queue', { cache: 'no-store' });
      if (!res.ok) return this.getAiTemplates();
      const data = await res.json();
      if (Array.isArray(data?.templates)) {
        this.aiTemplates = data.templates;
        this._persistAiTemplatesCache();
      }
    } catch {
      // Offline / static mode — keep localStorage cache
    }
    return this.getAiTemplates();
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
          this._persistAiTemplatesCache();
          return Boolean(data.ok);
        }
      } catch {
        // Offline fallback
      }
    }

    const before = this.getAiTemplates().length;
    this.aiTemplates = this.getAiTemplates().filter((t) => t.id !== cleanId);
    this._persistAiTemplatesCache();
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

  // ── Awesome Components (6,345 verified components) ──

  async queryAwesomeCatalog({ q = '', category = 'all', page = 1, limit = 24 } = {}) {
    if (typeof fetch !== 'function') {
      return { items: [], total: 0, catalogTotal: 6345, page: 1, limit, totalPages: 1, categoryCounts: { all: 0 } };
    }
    const params = new URLSearchParams({
      q: String(q || ''),
      category: String(category || 'all'),
      page: String(page || 1),
      limit: String(limit || 24),
    });
    const res = await fetch(`/api/awesome-components?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Could not query Awesome Components catalog');
    return res.json();
  }

  async fetchAwesomeComponentDetail(id) {
    if (!id) throw new Error('Component id is required');
    const res = await fetch(`/api/awesome-components/detail?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Could not load component source');
    return data;
  }

  async fetchAwesomeAiMatches(promptText, limit = 2) {
    if (typeof fetch !== 'function' || !promptText) return '';
    try {
      const res = await fetch(`/api/awesome-components/ai-match?q=${encodeURIComponent(promptText.slice(0, 300))}&limit=${limit}`);
      if (!res.ok) return '';
      const data = await res.json();
      const matches = Array.isArray(data?.matches) ? data.matches : [];
      if (!matches.length) return '';
      return [
        `## Matched Awesome Components References (from ${data.catalogTotal || 6345} indexed components)`,
        ...matches.map((m) => [
          `### ${m.name} (${m.category}, by ${m.authorName})`,
          m.jsxSnippet ? `\`\`\`jsx\n${m.jsxSnippet}\n\`\`\`` : '',
        ].filter(Boolean).join('\n')),
      ].join('\n\n');
    } catch {
      return '';
    }
  }
}
