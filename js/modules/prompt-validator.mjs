/**
 * WebForge Studio — Prompt Studio Validation, Contrast Audit & Unified Section Specs
 *
 * Pure, DOM-free module powering:
 *  1. WCAG 2.1 contrast math & palette token auditing (>= 4.5:1 normal text AA)
 *  2. Cross-step Compatibility Matrix (Category vs Brief, Motion conflicts, Tone/Preset, L1 source check)
 *  3. Concrete Motion choreography specifications (zero vague boilerplate)
 *  4. Unified Sections & Interactive Features catalog with expandable mini-configs
 *  5. Output Format, Motion Library, Target Model Delivery Mode, and Do Not defaults
 */

export const DEFAULT_TECH_FEATURES = Object.freeze([
  'Use semantic HTML5 elements',
  'Ensure WCAG AA accessibility standards',
  'Use CSS custom properties',
]);

export const DEFAULT_DO_NOT_LIST =
  'Gradient blobs, emoji, stock illustrations, lorem ipsum, invented customer logos, fake claims without the "illustrative" label, inline styles for colors.';

export const OUTPUT_FORMATS = Object.freeze([
  {
    id: 'single-file',
    label: 'Single App.jsx',
    desc: 'One self-contained App.jsx with inline components & default export',
    promptLine: 'a single App.jsx with inline components, default export.',
  },
  {
    id: 'file-tree',
    label: 'Modular File Tree',
    desc: 'Multi-file React + Tailwind tree (src/App.jsx, src/components/*, src/index.css)',
    promptLine: 'a clean modular React + Tailwind file tree (src/App.jsx, src/components/*, src/data.js, src/index.css).',
  },
]);

export const MOTION_LIBRARIES = Object.freeze([
  {
    id: 'css-only',
    label: 'CSS Only',
    desc: 'Zero motion deps — compositor-only transform & opacity',
    promptTag: 'CSS only, transform and opacity only',
  },
  {
    id: 'framer-motion',
    label: 'Framer Motion',
    desc: 'motion/react springs, layoutId tabs & AnimatePresence',
    promptTag: 'Framer Motion (motion/react), transform and opacity only',
  },
]);

export const DELIVERY_MODES = Object.freeze([
  {
    id: 'full-one-shot',
    label: 'Frontier / >30B (One-Shot)',
    desc: 'Deliver the complete runnable application in one response',
    code: 'FULL_ONE_SHOT',
  },
  {
    id: 'phased',
    label: 'Local <30B (Phased)',
    desc: 'Phase 1: tokens, nav, hero, footer — then 1 section per reply',
    code: 'PHASED',
  },
]);

export const MOTION_CONCRETE_SPECS = Object.freeze({
  'expressive-20': {
    label: 'Expressive',
    rules: [
      'Press: scale(0.97) on :active, 90ms, spring back with overshoot.',
      'Stagger: 36ms per item, capped at 8 items.',
      'Menus/dialogs: scale from their trigger origin, 180ms enter.',
      'Exit: 120ms ease-in, faster than enter.',
      'Completion flourish: one 300ms check-mark pop after form submission succeeds.',
    ],
  },
  'refined-minimal': {
    label: 'Refined Linear Precision',
    rules: [
      'Micro-transitions: 150ms cubic-bezier(0.2, 0, 0, 1), zero bounce or overshoot.',
      'Press: subtle opacity/background shift within 80ms, no squash-stretch.',
      'Menus/dialogs: 140ms ease-out opacity + 4px translateY enter; 100ms ease-in exit.',
      'Focus rings: crisp 2px :focus-visible outline with 2px offset.',
    ],
  },
  'editorial-smooth': {
    label: 'Editorial Smooth Reveals',
    rules: [
      'Section reveals: 420ms cubic-bezier(0.16, 1, 0.3, 1) opacity + 12px translateY, triggered once via IntersectionObserver.',
      'Link underlines: 180ms scaleX(0 -> 1) from left origin on hover.',
      'Exit: 140ms ease-in for drawers and overlays.',
    ],
  },
  'kinetic-stagger': {
    label: 'Kinetic Stagger Cascade',
    rules: [
      'Stagger: 36ms per card/row, capped at 8 items (max 288ms total).',
      'Active tab indicator: 200ms cubic-bezier(0.22, 1, 0.36, 1) transform glide.',
      'Filter/sort updates: 140ms ease-out opacity + 6px translateY swap.',
    ],
  },
  'elastic-tactile': {
    label: 'Elastic Tactile Pop',
    rules: [
      'Hover lift: translateY(-2px) in 220ms cubic-bezier(0.34, 1.56, 0.64, 1).',
      'Press: scale(0.96) on :active in 85ms with spring rebound.',
      'Toggle & badge confirmations: 240ms spring scale(0.92 -> 1.04 -> 1) pop.',
    ],
  },
  'zero-motion': {
    label: 'Instant / Reduced Motion',
    rules: [
      'Zero decorative motion: 0ms instant state transitions for panels, tabs, and menus.',
      'Hover & active feedback: contrast and border color shifts only, no transform scaling.',
      'Focus states: crisp 2px :focus-visible outline.',
    ],
  },
});

export const MOTION_INCOMPATIBLE_PAIRS = Object.freeze([
  ['expressive-20', 'refined-minimal'],
  ['elastic-tactile', 'refined-minimal'],
  ['zero-motion', 'expressive-20'],
  ['zero-motion', 'refined-minimal'],
  ['zero-motion', 'editorial-smooth'],
  ['zero-motion', 'kinetic-stagger'],
  ['zero-motion', 'elastic-tactile'],
]);

/**
 * Resolves a motion profile toggle click cleanly so contradictory combinations
 * (e.g. Expressive + Refined "zero bounce", or Zero Motion + any animated profile)
 * are prevented at click time with a clear explanation.
 */
export function resolveMotionProfileToggle(currentIds = [], clickedId = '') {
  const current = Array.isArray(currentIds) ? currentIds.filter(Boolean) : [];
  if (!clickedId) return { nextIds: current, conflictNote: '' };

  if (current.includes(clickedId)) {
    return { nextIds: current.filter((x) => x !== clickedId), conflictNote: '' };
  }

  if (clickedId === 'zero-motion') {
    const replaced = current.length > 0;
    return {
      nextIds: ['zero-motion'],
      conflictNote: replaced ? 'Instant / Reduced Motion replaces animated profiles.' : '',
    };
  }

  let next = current.filter((x) => x !== 'zero-motion');
  const removed = [];
  for (const [a, b] of MOTION_INCOMPATIBLE_PAIRS) {
    if (clickedId === a && next.includes(b)) {
      next = next.filter((x) => x !== b);
      removed.push(b);
    } else if (clickedId === b && next.includes(a)) {
      next = next.filter((x) => x !== a);
      removed.push(a);
    }
  }
  next.push(clickedId);

  let conflictNote = '';
  if (removed.length) {
    const removedLabels = removed.map((id) => MOTION_CONCRETE_SPECS[id]?.label || id).join(', ');
    const clickedLabel = MOTION_CONCRETE_SPECS[clickedId]?.label || clickedId;
    conflictNote = `Replaced ${removedLabels} — incompatible with ${clickedLabel}.`;
  } else if (current.includes('zero-motion')) {
    conflictNote = 'Switched from Instant / Reduced Motion to animated profile.';
  }

  return { nextIds: next, conflictNote };
}

/**
 * Unified Sections & Interactive Features catalog.
 * Replaces bare checkboxes + separate free-text section list with one configurable,
 * non-duplicating model.
 */
export const UNIFIED_SECTION_CATALOG = Object.freeze([
  {
    id: 'benchmark',
    label: 'Latency / Metrics Table',
    shortLabel: 'Benchmark Table',
    kind: 'section',
    featureValue: '',
    keywords: ['benchmark', 'latency', 'comparison', 'metrics table'],
    fields: [
      { key: 'rows', label: 'Rows', type: 'text', placeholder: '6 rows', defaultValue: '6 rows' },
      {
        key: 'sampleData',
        label: 'Seed data (labelled illustrative)',
        type: 'text',
        placeholder: 'e.g. Primary p50 118ms / p99 187ms; Container 640ms / 1.9s; Serverless 420ms / 1.2s',
        defaultValue: 'Edge runtime p50 118ms / p99 187ms; Container 640ms / 1.9s; Serverless cold start 420ms / 1.2s',
      },
      {
        key: 'filterChips',
        label: 'Filter chips / search',
        type: 'text',
        placeholder: 'e.g. us-east, eu-west, ap-south + workflow search',
        defaultValue: 'Region chips (us-east, eu-west, ap-south) plus search box filtering by workflow name with empty state',
      },
    ],
  },
  {
    id: 'bento-arch',
    label: 'Bento Feature Grid',
    shortLabel: 'Bento Grid',
    kind: 'section',
    featureValue: '',
    keywords: ['bento', 'architecture', 'feature grid', 'capabilities'],
    fields: [
      { key: 'tileCount', label: 'Tiles', type: 'text', placeholder: '4 tiles', defaultValue: '4 tiles' },
      {
        key: 'tiles',
        label: 'Tile topics',
        type: 'text',
        placeholder: 'e.g. Edge Orchestration, Live Telemetry, Instant Rollback, Zero-Config Deploy',
        defaultValue: 'Core Orchestration, Live Telemetry, Instant Rollback, Zero-Config Deploy',
      },
    ],
  },
  {
    id: 'search-filters',
    label: 'Search & Filters',
    shortLabel: 'Search & Filters',
    kind: 'feature',
    featureValue: 'Interactive data filter / search',
    keywords: ['search', 'filter', 'catalog filter'],
    fields: [
      { key: 'target', label: 'What it filters', type: 'text', placeholder: 'e.g. workflows, catalog items, or table rows', defaultValue: 'primary items/rows by keyword and category chips' },
      { key: 'chips', label: 'Filter chips', type: 'text', placeholder: 'e.g. All, us-east, eu-west, ap-south', defaultValue: 'All + 3 domain filter chips' },
      { key: 'emptyState', label: 'Empty state', type: 'text', placeholder: 'e.g. Clear filters button + helpful message', defaultValue: 'Clear-filters action and concise no-matches state' },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing Table',
    shortLabel: 'Pricing Table',
    kind: 'feature',
    featureValue: 'Pricing table section',
    keywords: ['pricing', 'plans', 'tiers'],
    fields: [
      { key: 'tiers', label: 'Tiers & prices', type: 'text', placeholder: 'e.g. Free $0 / Team $29 seat/mo / Enterprise custom', defaultValue: 'Free $0 / Team $29 per seat per month / Enterprise custom' },
      { key: 'billingToggle', label: 'Billing toggle', type: 'text', placeholder: 'Monthly/annual toggle with sliding indicator', defaultValue: 'Monthly/annual toggle with a sliding indicator' },
    ],
  },
  {
    id: 'proof',
    label: 'Customer Proof',
    shortLabel: 'Customer Proof',
    kind: 'section',
    featureValue: '',
    keywords: ['proof', 'testimonial', 'quotes', 'social proof'],
    fields: [
      { key: 'items', label: 'Quotes & metrics', type: 'text', placeholder: 'e.g. 3 quotes and 4 metrics', defaultValue: '3 quotes and 4 metrics (fictional names marked "placeholder")' },
    ],
  },
  {
    id: 'faq',
    label: 'FAQ Accordion',
    shortLabel: 'FAQ Accordion',
    kind: 'feature',
    featureValue: 'FAQ accordion section',
    keywords: ['faq', 'questions', 'accordion'],
    fields: [
      { key: 'count', label: 'Items', type: 'text', placeholder: '6 items', defaultValue: '6 items' },
      { key: 'a11y', label: 'Interaction', type: 'text', placeholder: 'Accessible button + aria-expanded', defaultValue: 'Accessible accordion using button + aria-expanded' },
    ],
  },
  {
    id: 'newsletter',
    label: 'Newsletter Form',
    shortLabel: 'Newsletter Form',
    kind: 'feature',
    featureValue: 'Newsletter subscription form',
    keywords: ['newsletter', 'subscribe', 'waitlist'],
    fields: [
      {
        key: 'behavior',
        label: 'Validation & submit behavior',
        type: 'text',
        placeholder: 'Client email validation, inline error/success, no network call, labelled "demo"',
        defaultValue: 'Client-side email validation, inline error and success text, no network call, labelled "demo"',
      },
    ],
  },
  {
    id: 'contact',
    label: 'Contact Form',
    shortLabel: 'Contact Form',
    kind: 'feature',
    featureValue: 'Contact form with validation',
    keywords: ['contact', 'inquiry', 'booking'],
    fields: [
      { key: 'fields', label: 'Fields', type: 'text', placeholder: 'Name, work email, message', defaultValue: 'Name, email, and project message' },
      { key: 'behavior', label: 'Submit behavior', type: 'text', placeholder: 'Client validation, inline status, labelled demo', defaultValue: 'Client validation, inline error/confirmation, no network call, labelled "demo"' },
    ],
  },
  {
    id: 'dark-light',
    label: 'Dark / Light Toggle',
    shortLabel: 'Dark/Light Toggle',
    kind: 'feature',
    featureValue: 'Dark / Light mode toggle',
    keywords: ['dark mode', 'light mode', 'theme toggle'],
    fields: [],
  },
  {
    id: 'mobile-menu',
    label: 'Mobile Menu',
    shortLabel: 'Mobile Menu',
    kind: 'feature',
    featureValue: 'Responsive hamburger mobile menu',
    keywords: ['mobile menu', 'hamburger', 'drawer'],
    fields: [],
  },
  {
    id: 'smooth-scroll',
    label: 'Smooth Scroll',
    shortLabel: 'Smooth Scroll',
    kind: 'feature',
    featureValue: 'Smooth scroll navigation',
    keywords: ['smooth scroll'],
    fields: [],
  },
]);

export function getDefaultSectionConfig(sectionId) {
  const item = UNIFIED_SECTION_CATALOG.find((x) => x.id === sectionId);
  if (!item) return {};
  const out = {};
  for (const f of item.fields || []) {
    out[f.key] = f.defaultValue || '';
  }
  return out;
}

// ── WCAG 2.1 Contrast Utilities ──

export function parseHexColor(hex) {
  if (typeof hex !== 'string') return null;
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(clean)) return null;
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function hexToRelativeLuminance(hex) {
  const rgb = parseHexColor(hex);
  if (!rgb) return 0;
  const linearize = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b);
}

export function computeContrastRatio(hexA, hexB) {
  const l1 = hexToRelativeLuminance(hexA);
  const l2 = hexToRelativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

/**
 * Audits a palette token object against WCAG AA (>= 4.5:1 normal text).
 * Checks text/bg, text/surface, muted/bg, muted/surface, accentText/bg,
 * accentText/surface, and onAccent/accent.
 */
export function auditPaletteContrast(palette) {
  if (!palette || !palette.bg || !palette.text) {
    return { passes: false, ratios: {}, failures: ['Missing bg or text token'] };
  }
  const bg = palette.bg;
  const surface = palette.surface || bg;
  const text = palette.text;
  const muted = palette.muted || text;
  const accent = palette.accent || text;
  const accentText = palette.accentText || accent;
  const onAccent = palette.onAccent || palette.accentFg || '#FFFFFF';

  const ratios = {
    textOnBg: computeContrastRatio(text, bg),
    textOnSurface: computeContrastRatio(text, surface),
    mutedOnBg: computeContrastRatio(muted, bg),
    mutedOnSurface: computeContrastRatio(muted, surface),
    accentTextOnBg: computeContrastRatio(accentText, bg),
    accentTextOnSurface: computeContrastRatio(accentText, surface),
    onAccentOnAccent: computeContrastRatio(onAccent, accent),
  };

  const failures = [];
  for (const [pair, ratio] of Object.entries(ratios)) {
    if (ratio < 4.5) {
      failures.push(`${pair} (${ratio}:1 < 4.5:1)`);
    }
  }

  return {
    passes: failures.length === 0,
    ratios,
    failures,
  };
}

// ── Cross-Step Compatibility Validator ──

function inferBriefDomain(selections) {
  const haystack = [
    selections.siteName || '',
    selections.siteTagline || '',
    selections.siteDescription || '',
    selections.audience || '',
  ].join(' ').toLowerCase();

  if (!haystack.trim()) return null;

  const devSaasScore = (haystack.match(/\b(saas|developer|developers|engineer|engineers|api|sdk|cloud|edge|telemetry|rollback|orchestration|workflow|workflows|deploy|latency|postgres|vector|devops|cli|webhook|infra|kubernetes|ci\/cd|ai agent)\b/g) || []).length;
  const ecomScore = (haystack.match(/\b(shop|store|storefront|cart|checkout|catalog|merch|ceramic|apparel|sneaker|clothing|shipping|sku|inventory|buy now|add to cart|dtc)\b/g) || []).length;
  const foodScore = (haystack.match(/\b(restaurant|cafe|bistro|bakery|coffee|roastery|menu|reservation|chef|dining|espresso|cocktail)\b/g) || []).length;
  const portfolioScore = (haystack.match(/\b(portfolio|monograph|architect|architecture|case studies|creative director|photographer|freelance|selected works)\b/g) || []).length;

  const ranked = [
    { domain: 'saas', category: 'SaaS / Landing Page', score: devSaasScore },
    { domain: 'ecommerce', category: 'E-Commerce / Online Store', score: ecomScore },
    { domain: 'restaurant', category: 'Restaurant / Cafe', score: foodScore },
    { domain: 'portfolio', category: 'Portfolio / Personal', score: portfolioScore },
  ].sort((a, b) => b.score - a.score);

  if (ranked[0].score >= 2 && ranked[0].score > ranked[1].score) {
    return ranked[0];
  }
  return null;
}

/**
 * Counts how many Mix & Match slots have actual attachable component source code.
 */
export function countSlotsWithSource(slotSelections = {}) {
  if (!slotSelections || typeof slotSelections !== 'object') return 0;
  let count = 0;
  for (const pick of Object.values(slotSelections)) {
    if (!pick || !pick.name) continue;
    const raw = String(pick.code || pick.renderedHtml || pick.previewHtml || '').trim();
    if (raw.length > 0) count++;
  }
  return count;
}

/**
 * Full Compatibility Matrix validator run live in Prompt Studio & in compiler.
 * Returns structured warnings with optional 1-click fix actions.
 */
export function validatePromptSelections(selections = {}, context = {}) {
  const warnings = [];
  const s = selections || {};

  // 1. L1 Strict Mode without attached component source code
  const freedomLevel = Number(s.aiFreedomLevel) || 2;
  const sourceSlotCount = countSlotsWithSource(s.slotSelections);
  const attachedSourceCount = sourceSlotCount + (Array.isArray(context.attachedComponents) ? context.attachedComponents.filter((c) => c?.code).length : 0);
  const l1AutoDowngraded = freedomLevel === 1 && attachedSourceCount === 0;

  if (l1AutoDowngraded) {
    warnings.push({
      id: 'l1-no-source',
      severity: 'warning',
      step: 5,
      title: 'L1 Strict has no component source attached',
      message: 'No slot component code is attached, so the compiler will auto-downgrade L1 to a style reference instead of asking the model to copy verbatim.',
      fixLabel: 'Pick Mix & Match Slots',
      fixAction: 'open-mix-match',
    });
  }

  // 2. Category (Step 2) vs Product Brief (Step 6) mismatch
  const inferred = inferBriefDomain(s);
  if (s.type && inferred) {
    const typeLower = String(s.type).toLowerCase();
    const matchesDomain =
      (inferred.domain === 'saas' && /saas|landing|dashboard|app|software|developer/.test(typeLower)) ||
      (inferred.domain === 'ecommerce' && /e-commerce|store|shop|retail/.test(typeLower)) ||
      (inferred.domain === 'restaurant' && /restaurant|cafe|food|hospitality/.test(typeLower)) ||
      (inferred.domain === 'portfolio' && /portfolio|personal|agency|gallery|photography/.test(typeLower));

    if (!matchesDomain) {
      warnings.push({
        id: 'category-brief-mismatch',
        severity: 'warning',
        step: 6,
        title: `Category "${s.type.split(' / ')[0]}" contradicts your product brief`,
        message: `Your brief describes a ${inferred.category.split(' / ')[0]} product, which conflicts with "${s.type}". Resolution Rule #2 will follow the brief, or you can switch category now.`,
        suggestedCategory: inferred.category,
        fixLabel: `Switch to ${inferred.category.split(' / ')[0]}`,
        fixAction: 'switch-category',
      });
    }
  }

  // 3. Conflicting Motion Profiles
  const motionIds = Array.isArray(s.motionProfiles) && s.motionProfiles.length
    ? s.motionProfiles
    : (s.motionProfileId ? [s.motionProfileId] : []);

  if (motionIds.length > 1) {
    for (const [a, b] of MOTION_INCOMPATIBLE_PAIRS) {
      if (motionIds.includes(a) && motionIds.includes(b)) {
        const labelA = MOTION_CONCRETE_SPECS[a]?.label || a;
        const labelB = MOTION_CONCRETE_SPECS[b]?.label || b;
        warnings.push({
          id: 'motion-conflict',
          severity: 'warning',
          step: 4,
          title: `Conflicting motion profiles: ${labelA} + ${labelB}`,
          message: `${labelA} and ${labelB} contradict each other. Pick one primary motion profile so the model does not mix bounce with zero-bounce/instant rules.`,
          fixLabel: `Keep ${labelA} Only`,
          fixAction: 'resolve-motion',
          keepMotionId: a === 'zero-motion' ? a : motionIds[0],
        });
        break;
      }
    }
  }

  // 4. Corporate style/tone paired with Developer audience or Linear/Vercel/Raycast/Supabase preset
  const isDevAudience = /developer|engineer/i.test(String(s.audience || ''));
  const isDevPreset = /^designmd-(linear|vercel|raycast|supabase)$/.test(String(s.designSystemId || s.paletteKey || ''));
  const isCorporateStyle = /corporate/i.test(String(s.style || '')) || /corporate/i.test(String(s.siteTone || ''));
  if (isCorporateStyle && (isDevAudience || isDevPreset)) {
    warnings.push({
      id: 'corporate-dev-mismatch',
      severity: 'info',
      step: 6,
      title: 'Corporate style/tone paired with developer audience',
      message: 'Developer tools and Linear/Vercel aesthetics perform better with a "Technical and concise" voice rather than Corporate copy.',
      fixLabel: 'Use Technical Tone',
      fixAction: 'set-technical-tone',
    });
  }

  // 5. Layout rhythm vs Bento section check
  const enabledSections = Array.isArray(s.enabledSections) ? s.enabledSections : [];
  const wantsBento = enabledSections.includes('bento-arch') || /\bbento\b/i.test(String(s.customSections || ''));
  const contentStr = String(s.content || '');
  const isBroadsheetOrAlt = /broadsheet|alternating|sticky sidebar/i.test(contentStr);
  if (wantsBento && isBroadsheetOrAlt && !s.secondaryLayout) {
    warnings.push({
      id: 'layout-bento-conflict',
      severity: 'info',
      step: 4,
      title: 'Bento section paired with non-Bento page rhythm',
      message: `Your sections include a Bento grid while Content Rhythm is "${contentStr.split(' ').slice(0, 3).join(' ')}". Set a Secondary Layout so Bento is used for the architecture grid and your primary rhythm elsewhere.`,
      fixLabel: 'Set Bento + Hairline Pair',
      fixAction: 'set-bento-secondary',
    });
  }

  return {
    valid: warnings.filter((w) => w.severity === 'warning').length === 0,
    warnings,
    l1AutoDowngraded,
    attachedSourceCount,
    inferredDomain: inferred,
  };
}
