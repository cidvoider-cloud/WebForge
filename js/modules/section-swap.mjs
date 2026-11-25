/**
 * WebForge Studio — Cross-Library Section Slots, AI Freedom Engine & Surgical Swap Compiler
 *
 * Pure, DOM-free module powering:
 *  1. Core 6 Mix & Match section slots (Navbar, Hero, Features, Cards, CTA, Footer)
 *  2. 4-Level AI Freedom slider directives tailored for small local LLMs (9B-12B) & frontier models
 *  3. Cross-library component matching across built-in packs, 21st.dev, Kokonut UI, HyperUI, shadcn/ui, Awesome
 *  4. Preview Inspector DOM-to-slot inference & surgical "Change This to That" prompt compilation
 */

export const CORE_SECTION_SLOTS = Object.freeze([
  {
    id: 'navbar',
    label: 'Navbar',
    shortDesc: 'Header, brand bar, links & mobile drawer',
    categories: ['navigation'],
    keywords: ['navbar', 'nav', 'header', 'topbar', 'menu', 'navigation', 'sidebar', 'dock'],
    remoteCategory: 'navigation',
    remoteQuery: 'navbar header navigation',
  },
  {
    id: 'hero',
    label: 'Hero',
    shortDesc: 'Above-the-fold headline, CTA & focal visual',
    categories: ['hero'],
    keywords: ['hero', 'banner', 'landing', 'headline', 'spotlight', 'aurora', 'beams', 'above'],
    remoteCategory: 'hero',
    remoteQuery: 'hero banner',
  },
  {
    id: 'features',
    label: 'Features',
    shortDesc: 'Bento grid, capabilities & showcase sections',
    categories: ['cards', 'tabs', 'data', 'hero'],
    keywords: ['feature', 'bento', 'grid', 'showcase', 'timeline', 'step', 'tabs', 'accordion', 'comparison'],
    remoteCategory: 'all',
    remoteQuery: 'bento feature grid',
  },
  {
    id: 'cards',
    label: 'Cards',
    shortDesc: 'Product, pricing, testimonial & KPI cards',
    categories: ['cards', 'pricing', 'data'],
    keywords: ['card', 'pricing', 'testimonial', 'stats', 'metric', 'product', 'tile', 'profile', 'table'],
    remoteCategory: 'cards',
    remoteQuery: 'card pricing',
  },
  {
    id: 'cta',
    label: 'CTA',
    shortDesc: 'Conversion banner, newsletter & action callout',
    categories: ['buttons', 'alerts', 'forms'],
    keywords: ['cta', 'call to action', 'newsletter', 'waitlist', 'subscribe', 'banner', 'signup', 'button', 'alert'],
    remoteCategory: 'all',
    remoteQuery: 'cta newsletter banner',
  },
  {
    id: 'footer',
    label: 'Footer',
    shortDesc: 'Directory links, legal bar & newsletter strip',
    categories: ['footer'],
    keywords: ['footer', 'sitemap', 'bottom', 'copyright'],
    remoteCategory: 'footer',
    remoteQuery: 'footer',
  },
]);

export const EXTENDED_SECTION_SLOTS = Object.freeze([
  {
    id: 'benchmark',
    label: 'Benchmark',
    shortDesc: 'Latency table, comparison matrix & live metrics',
    categories: ['data', 'tables', 'cards'],
    keywords: ['benchmark', 'table', 'latency', 'comparison', 'metric', 'chart', 'data', 'stats'],
    remoteCategory: 'data',
    remoteQuery: 'table stats metrics',
  },
  {
    id: 'pricing',
    label: 'Pricing',
    shortDesc: 'Tiered plans, monthly/annual toggle & CTA cards',
    categories: ['pricing', 'cards'],
    keywords: ['pricing', 'plan', 'tier', 'subscription', 'billing'],
    remoteCategory: 'pricing',
    remoteQuery: 'pricing',
  },
  {
    id: 'proof',
    label: 'Proof',
    shortDesc: 'Customer quotes, logo strip & KPI trust metrics',
    categories: ['cards', 'data'],
    keywords: ['testimonial', 'proof', 'quote', 'review', 'social proof', 'trust', 'logo'],
    remoteCategory: 'all',
    remoteQuery: 'testimonial',
  },
  {
    id: 'faq',
    label: 'FAQ',
    shortDesc: 'Accessible accordion questions & help disclosures',
    categories: ['tabs', 'cards', 'data'],
    keywords: ['faq', 'accordion', 'question', 'disclosure', 'help'],
    remoteCategory: 'all',
    remoteQuery: 'faq accordion',
  },
]);

export const MIX_MATCH_SECTION_SLOTS = Object.freeze([
  CORE_SECTION_SLOTS[0], // navbar
  CORE_SECTION_SLOTS[1], // hero
  CORE_SECTION_SLOTS[2], // features
  CORE_SECTION_SLOTS[3], // cards
  ...EXTENDED_SECTION_SLOTS, // benchmark, pricing, proof, faq
  CORE_SECTION_SLOTS[4], // cta
  CORE_SECTION_SLOTS[5], // footer
]);

export const AI_FREEDOM_LEVELS = Object.freeze([
  {
    level: 1,
    id: 'strict',
    label: 'Strict Blueprint',
    shortLabel: 'Strict',
    badge: 'Local LLM Safe',
    summary: 'Copy-paste selected UI elements verbatim. Only swap brand copy and fix broken imports or syntax — never redesign.',
    usesTemplates: true,
    directive: [
      'AI FREEDOM LEVEL 1 — STRICT BLUEPRINT (VERBATIM ADHERENCE):',
      '- You MUST copy-paste the selected UI components and preset structure verbatim.',
      '- Preserve the exact HTML/JSX hierarchy, Tailwind utility classes, layout grid, and visual styling of each chosen component.',
      '- ONLY replace placeholder brand names/text/links with domain copy and repair broken imports, missing icons, or syntax errors.',
      '- Do NOT invent new layouts, rewrite component structures, or swap out chosen UI patterns.',
    ].join('\n'),
  },
  {
    level: 2,
    id: 'guided',
    label: 'Guided Presets',
    shortLabel: 'Guided',
    badge: 'Default',
    summary: 'Use chosen UI presets and slot elements as anchors with tasteful adaptation for palette, copy, and responsiveness.',
    usesTemplates: true,
    directive: [
      'AI FREEDOM LEVEL 2 — GUIDED PRESETS (BALANCED DEFAULT):',
      '- Use the selected UI presets and slot components as your primary structural anchors.',
      '- Keep their core layout rhythm and interaction mechanics intact while adapting colors, typography, spacing, and copy to unify the brand.',
      '- You may add clean responsive refinements and subtle supporting sections so the page feels cohesive.',
    ].join('\n'),
  },
  {
    level: 3,
    id: 'creative',
    label: 'Full Creativity',
    shortLabel: 'Creative',
    badge: 'Flexible',
    summary: 'UI presets are optional inspiration. The AI decides whether to adopt, remix, or reimagine components.',
    usesTemplates: true,
    directive: [
      'AI FREEDOM LEVEL 3 — FULL CREATIVITY (OPTIONAL PRESETS):',
      '- Treat any referenced UI library or slot picks as optional inspiration rather than strict templates.',
      '- You are free to remix, merge, or completely reimagine section layouts and interactions whenever it produces a stronger user experience.',
      '- Prioritize visual cohesion, crisp hierarchy, and distinctive craft over strict template fidelity.',
    ].join('\n'),
  },
  {
    level: 4,
    id: 'max',
    label: 'Max Creativity',
    shortLabel: 'Pure System',
    badge: 'No Templates',
    summary: 'Pure Design System mode. Skips all template UI components and builds bespoke interfaces strictly from your design tokens.',
    usesTemplates: false,
    directive: [
      'AI FREEDOM LEVEL 4 — MAX CREATIVITY (PURE DESIGN SYSTEM ONLY):',
      '- Do NOT copy or rely on any prebuilt UI template or component library boilerplate.',
      '- Architect every section from scratch using ONLY the specified Design System tokens (color palette, typography pairing, layout geometry, spacing density, and motion choreography).',
      '- Craft bespoke, original UI components tailored exclusively to this brand and audience.',
    ].join('\n'),
  },
]);

export const DEFAULT_AI_FREEDOM_LEVEL = 2;

export function getFreedomLevelMeta(level = DEFAULT_AI_FREEDOM_LEVEL) {
  const num = Number(level);
  return AI_FREEDOM_LEVELS.find((l) => l.level === num) || AI_FREEDOM_LEVELS[1];
}

export function getSlotMeta(slotId) {
  return MIX_MATCH_SECTION_SLOTS.find((s) => s.id === slotId) || null;
}

/**
 * Builds the AI Freedom directive block injected into compiled prompts.
 * Auto-downgrades L1 Strict to Style Reference whenever zero component source code is attached.
 */
export function buildFreedomPromptDirective(level = DEFAULT_AI_FREEDOM_LEVEL, opts = {}) {
  const meta = getFreedomLevelMeta(level);
  const hasSource = opts.hasSourceCode !== undefined ? Boolean(opts.hasSourceCode) : Boolean(opts.hasSlotPicks);
  if (meta.level === 1 && !hasSource) {
    const libRef = opts.activeLibraryName || 'the selected UI library';
    return [
      'AI FREEDOM LEVEL 1 (AUTO-DOWNGRADED TO STYLE REFERENCE — NO SOURCE ATTACHED):',
      '- L1 applies ONLY if component source is attached below. Copy it exactly and change only copy, links and broken imports.',
      `- No source attached: treat ${libRef} as a style reference, never as code you can quote.`,
    ].join('\n');
  }
  const lines = [meta.directive];
  if (meta.level === 1 && hasSource) {
    lines.push('- Every assigned section slot below MUST appear in the final build using its provided component code as the exact foundation.');
  }
  if (meta.level === 4) {
    lines.push('- Ignore any active UI library templates; synthesize clean semantic React + Tailwind components directly from the palette and typography specs.');
  }
  return lines.join('\n');
}

/**
 * Infers which Core 6 section slot corresponds to an element clicked inside the live preview.
 * Returns one of: 'navbar' | 'hero' | 'features' | 'cards' | 'cta' | 'footer' | 'custom'.
 */
export function inferSlotFromElement(selectedElement = null) {
  if (!selectedElement || typeof selectedElement !== 'object') return 'hero';
  const tag = String(selectedElement.tag || '').toLowerCase().trim();
  const id = String(selectedElement.id || '').toLowerCase();
  const classes = String(selectedElement.classes || '').toLowerCase();
  const text = String(selectedElement.text || '').toLowerCase();
  const haystack = `${tag} ${id} ${classes} ${text}`;

  if (tag === 'footer' || /\bfooter\b|\bsite-footer\b|\bcopyright\b/.test(haystack)) {
    return 'footer';
  }
  if (tag === 'nav' || /\bnavbar\b|\btopbar\b|\bnav-bar\b|\bsite-nav\b|\bnavigation\b/.test(haystack)) {
    return 'navbar';
  }
  if (tag === 'header') {
    if (/\bhero\b/.test(haystack)) return 'hero';
    return 'navbar';
  }
  if (/\bhero\b|\babove-the-fold\b|\bjumbotron\b|\bspotlight\b/.test(haystack) || tag === 'h1') {
    return 'hero';
  }
  if (/\bcta\b|\bcall-to-action\b|\bnewsletter\b|\bwaitlist\b|\bsubscribe\b|\bget-started\b/.test(haystack)) {
    return 'cta';
  }
  if (/\bfeature|\bbento\b|\bcapabilit|\bworkflow|\bhow-it-works\b|\bbenefit/.test(haystack)) {
    return 'features';
  }
  if (tag === 'article' || /\bcard\b|\bpricing\b|\bplan\b|\btestimonial|\bproduct-|\bmetric|\bkpi\b/.test(haystack)) {
    return 'cards';
  }
  return 'custom';
}

/**
 * Normalizes a component from either a local built-in/custom library or a remote server catalog
 * into a unified candidate shape for Mix & Match and Section Swapper UIs.
 */
export function normalizeSlotCandidate(rawElement, rawLibrary, slotHint = '') {
  if (!rawElement || !rawLibrary) return null;
  const code = String(
    rawElement.code ||
    rawElement.jsxCode ||
    rawElement.tsxCode ||
    rawElement.htmlCode ||
    rawElement.renderedHtml ||
    rawElement.previewHtml ||
    ''
  ).trim();
  const swatch = rawLibrary.swatches?.[2] || rawLibrary.swatches?.[0] || '#F59E0B';
  return {
    id: String(rawElement.id || `${rawLibrary.id}-${rawElement.name || 'item'}`),
    libraryId: String(rawLibrary.id),
    libraryName: String(rawLibrary.name || rawLibrary.id),
    librarySwatch: swatch,
    name: String(rawElement.name || 'Component'),
    category: String(rawElement.category || slotHint || 'component'),
    description: String(rawElement.description || rawElement.tagline || '').trim(),
    code,
    previewHtml: String(rawElement.previewHtml || ''),
    renderedHtml: String(rawElement.renderedHtml || ''),
    previewCss: String(rawElement.previewCss || ''),
    previewScript: String(rawElement.previewScript || ''),
    isRemote: Boolean(rawLibrary.isRemoteCatalog),
    authorName: String(rawElement.authorName || ''),
    rawElement,
    rawLibrary,
  };
}

/**
 * Scores how well a local element fits a requested Core 6 slot & search query.
 */
export function scoreElementForSlot(element, slotId, query = '') {
  const slot = getSlotMeta(slotId);
  const name = String(element?.name || '').toLowerCase();
  const cat = String(element?.category || '').toLowerCase();
  const desc = String(element?.description || '').toLowerCase();
  const combined = `${name} ${cat} ${desc}`;

  const q = String(query || '').trim().toLowerCase();
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    const matchesAll = terms.every((t) => combined.includes(t));
    if (!matchesAll) return -1;
  }

  if (!slot) return q ? 20 : 10;

  let score = 0;
  if (slot.categories.includes(cat)) score += 35;
  for (const kw of slot.keywords) {
    if (name.includes(kw)) score += 28;
    else if (cat.includes(kw)) score += 22;
    else if (desc.includes(kw)) score += 10;
  }
  if (q && name.includes(q)) score += 25;
  return score;
}

/**
 * Collects and ranks matching local components (Built-in packs, 21st.dev, DESIGN.md, Custom)
 * for a given slot, library filter, and search query.
 */
export function collectLocalSlotCandidates(libraries = [], { slot = 'hero', libraryFilter = 'all', query = '', limit = 36 } = {}) {
  const libs = Array.isArray(libraries) ? libraries : [];
  const scored = [];

  for (const lib of libs) {
    if (!lib || lib.isRemoteCatalog) continue;
    if (libraryFilter && libraryFilter !== 'all' && libraryFilter !== 'built-in') {
      if (lib.id !== libraryFilter) continue;
    } else if (libraryFilter === 'built-in') {
      if (lib.id === '21st-dev') continue;
    }

    const elements = Array.isArray(lib.elements) ? lib.elements : [];
    for (const el of elements) {
      const score = scoreElementForSlot(el, slot, query);
      if (score < 0) continue;
      // When no search query is entered and slot is one of the Core 6, require at least some slot relevance
      if (!query && slot && slot !== 'custom' && score === 0) continue;
      const cand = normalizeSlotCandidate(el, lib, slot);
      if (cand) scored.push({ cand, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.cand.name.localeCompare(b.cand.name));
  return scored.slice(0, limit).map((s) => s.cand);
}

/**
 * Returns optimal remote catalog query params for a Core 6 slot + user search string.
 */
export function getRemoteQueryForSlot(slotId, userQuery = '') {
  const cleanQ = String(userQuery || '').trim();
  const slot = getSlotMeta(slotId);
  if (!slot) {
    return { q: cleanQ, category: 'all' };
  }
  if (cleanQ) {
    return { q: cleanQ, category: 'all' };
  }
  // Use focused query keywords so HyperUI, Kokonut UI, shadcn/ui, and Awesome return slot-relevant hits immediately
  const defaultQueryBySlot = {
    navbar: 'header',
    hero: 'hero',
    features: 'bento',
    cards: 'card',
    benchmark: 'table',
    pricing: 'pricing',
    proof: 'testimonial',
    faq: 'faq',
    cta: 'cta',
    footer: 'footer',
  };
  return {
    q: defaultQueryBySlot[slot.id] || slot.id,
    category: 'all',
  };
}

/**
 * Trims component source code cleanly for compact prompt injection (optimized for 9B-12B local LLMs).
 */
export function trimComponentSnippet(code = '', maxChars = 1800) {
  const clean = String(code || '').trim();
  if (!clean) return '';
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars).trimEnd()}\n// ... (trimmed for compact context)`;
}

/**
 * Formats assigned Mix & Match slot selections into a clean, high-signal prompt section.
 */
export function formatSlotSelectionsForPrompt(slotSelections = {}, freedomLevel = DEFAULT_AI_FREEDOM_LEVEL) {
  const meta = getFreedomLevelMeta(freedomLevel);
  if (!meta.usesTemplates) return '';
  const entries = MIX_MATCH_SECTION_SLOTS
    .map((slot) => ({ slot, pick: slotSelections?.[slot.id] }))
    .filter((entry) => entry.pick && entry.pick.name);

  if (!entries.length) return '';

  const includeCode = meta.level <= 2;
  const maxPerSlot = meta.level === 1 ? 1900 : 1200;

  const blocks = entries.map(({ slot, pick }) => {
    const header = `### ${slot.label.toUpperCase()} SLOT — "${pick.name}" (from ${pick.libraryName || pick.libraryId})`;
    const snippet = includeCode ? trimComponentSnippet(pick.code || pick.renderedHtml || pick.previewHtml, maxPerSlot) : '';
    if (!snippet) {
      return `${header}\n- Reference style: ${pick.description || pick.category || slot.shortDesc}`;
    }
    const lang = /^\s*</.test(snippet) && !/export\s+(default\s+)?function|import\s+/.test(snippet) ? 'html' : 'tsx';
    return `${header}\n\`\`\`${lang}\n${snippet}\n\`\`\``;
  });

  return `\nMIX & MATCH SECTION BLUEPRINTS (${entries.length} SELECTED SLOTS):\n${blocks.join('\n\n')}`;
}

/**
 * Compiles a surgical "Change This to That" prompt when swapping a section inside an open project.
 */
export function buildSectionSwapPrompt({
  targetSlot = 'hero',
  targetLabel = '',
  domContext = '',
  candidate = null,
  adherence = 'adapt', // 'strict' | 'adapt'
  customNotes = '',
} = {}) {
  if (!candidate || !candidate.name) return '';
  const slotMeta = getSlotMeta(targetSlot);
  const sectionName = targetLabel || (slotMeta ? `${slotMeta.label} section` : 'selected section');
  const libName = candidate.libraryName || candidate.libraryId || 'UI Library';
  const isStrict = adherence === 'strict';
  const snippet = trimComponentSnippet(
    candidate.code || candidate.renderedHtml || candidate.previewHtml || '',
    isStrict ? 2600 : 1800
  );
  const lang = /^\s*</.test(snippet) && !/export\s+(default\s+)?function|import\s+/.test(snippet) ? 'html' : 'tsx';

  const lines = [
    `SURGICAL SECTION SWAP — Replace ONLY the ${sectionName} with "${candidate.name}" from ${libName}.`,
  ];

  if (domContext) {
    lines.push(domContext);
  }

  lines.push(
    '',
    isStrict
      ? 'ADHERENCE MODE: STRICT COPY-PASTE'
      : 'ADHERENCE MODE: ADAPT TO PROJECT THEME',
    isStrict
      ? '- Copy the replacement component structure and Tailwind styling verbatim into this project. ONLY update text/links to match the existing project brand and fix any broken imports or TypeScript/JSX syntax so it compiles cleanly.'
      : '- Preserve the layout architecture and interactive pattern of the replacement component while harmonizing its colors, typography, spacing, and copy to match the existing project seamlessly.',
    '- Keep ALL other sections, routes, state, and files untouched — modify only the targeted section and any required helper imports.',
    '- Ensure responsive layout across desktop and mobile with zero console or build errors.'
  );

  if (customNotes && String(customNotes).trim()) {
    lines.push(`- Additional user note: ${String(customNotes).trim()}`);
  }

  if (snippet) {
    lines.push('', `REPLACEMENT COMPONENT REFERENCE ("${candidate.name}" · ${libName}):`, `\`\`\`${lang}`, snippet, '```');
  }

  return lines.join('\n');
}

/**
 * Formats UI components attached directly in the Home or Workspace chat bar
 * (just like image attachments) into a clean, high-signal prompt section.
 */
export function formatAttachedComponentsForPrompt(components = []) {
  const list = Array.isArray(components)
    ? components.filter((c) => c && c.name && c.status !== 'failed' && c.verificationStatus !== 'failed')
    : [];
  if (!list.length) return '';

  const maxPerItem = list.length === 1 ? 2600 : 1600;
  const mergedDeps = {};
  const blocks = list.map((item, idx) => {
    const libName = item.libraryName || item.libraryId || 'UI Library';
    const libId = item.libraryId || '';
    const cat = item.category ? ` · ${item.category}` : '';
    const snippet = trimComponentSnippet(
      item.code || item.renderedHtml || item.previewHtml || '',
      maxPerItem
    );
    const lang = /^\s*</.test(snippet) && !/export\s+(default\s+)?function|import\s+/.test(snippet) ? 'html' : 'tsx';
    const header = `### ATTACHED UI COMPONENT ${idx + 1}: "${item.name}" (from ${libName}${libId ? `, libraryId: ${libId}` : ''}${cat})`;
    const depObj = item.manifest?.dependencies && typeof item.manifest.dependencies === 'object'
      ? item.manifest.dependencies
      : item.dependencies && typeof item.dependencies === 'object'
        ? item.dependencies
        : {};
    Object.assign(mergedDeps, depObj);
    const depPairs = Object.entries(depObj).map(([pkg, ver]) => `"${pkg}": "${ver}"`);
    const metaLines = [
      depPairs.length ? `- Dependencies (pinned): ${depPairs.join(', ')}` : '',
      item.manifest?.keyframes?.length ? `- Required Tailwind keyframes: ${item.manifest.keyframes.join(', ')}` : '',
      item.usageNotes ? `- Usage notes: ${item.usageNotes}` : '',
    ].filter(Boolean);

    if (!snippet) {
      return [header, `- Description: ${item.description || 'User-selected UI reference component'}`, ...metaLines].join('\n');
    }
    return [header, ...metaLines, `\`\`\`${lang}\n${snippet}\n\`\`\``].join('\n');
  });

  const depSummary = Object.keys(mergedDeps).length
    ? `Required pinned packages to include in package.json: ${Object.entries(mergedDeps).map(([p, v]) => `"${p}": "${v}"`).join(', ')}.`
    : '';

  return [
    `ATTACHED UI COMPONENTS (${list.length} USER-SELECTED REFERENCE${list.length === 1 ? '' : 'S'}):`,
    'Follow the user instruction above to apply, integrate, or replace sections using these normalized verified component blueprint(s). Adapt imports/paths cleanly so the project compiles with zero errors.',
    ...(depSummary ? [depSummary] : []),
    '',
    blocks.join('\n\n'),
  ].join('\n');
}


