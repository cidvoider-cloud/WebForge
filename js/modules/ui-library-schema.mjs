/**
 * WebForge Studio — Unified UI Component Library Schema, Switches & Preview Kit Config
 *
 * Single source of truth for:
 *   - Cleanup switches (HIDE_OTHER_SOURCES, HARD_DELETE, KEEP_INDEXED_LIBRARY_IDS)
 *   - Future-proof Library Manifest schema (shared by indexed, custom & custom-animation libraries)
 *   - Normalized component record & verification status / reason code contracts
 *   - Pinned Preview Kit runtime URLs & package versions (mirrored from vendor/preview-kit/lock.json)
 *   - Library-scoped CSS theme tokens ([data-lib="<id>"]) so libraries never clobber each other
 */

export const HIDE_OTHER_SOURCES = true;
export const HARD_DELETE = false;
export const WATERMELON_ONLY_MODE = true;

export const KEEP_INDEXED_LIBRARY_IDS = Object.freeze([
  'awesome-components',
  'kokonut-ui',
  'hyperui',
  'watermelon-ui',
  'shadcn-ui',
]);

export const PREFERRED_FALLBACK_LIBRARY_ID = 'watermelon-ui';

export const VERIFICATION_STATUS = Object.freeze({
  VERIFIED: 'verified',
  DEGRADED: 'degraded',
  FAILED: 'failed',
});

export const FAILURE_REASON_CODES = Object.freeze({
  MISSING_DEP: 'MISSING_DEP',
  UNRESOLVED_IMPORT: 'UNRESOLVED_IMPORT',
  NEXT_ONLY: 'NEXT_ONLY',
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  BLANK: 'BLANK',
  TIMEOUT: 'TIMEOUT',
  NEEDS_PROPS: 'NEEDS_PROPS',
});

/**
 * Runtime lock metadata matching `/vendor/preview-kit/lock.json`.
 * All preview script paths are local to the app origin — zero external CDN calls.
 */
export const PREVIEW_KIT_MANIFEST = Object.freeze({
  schemaVersion: 1,
  kitVersion: '1.0.0',
  tailwindVersion: 4,
  lockHash: 'pk-v1-tw4111-r1831-b72610',
  runtimeAssets: Object.freeze({
    tailwind: '/vendor/preview-kit/tailwind-browser.js',
    react: '/vendor/preview-kit/react.production.min.js',
    reactDom: '/vendor/preview-kit/react-dom.production.min.js',
    babel: '/vendor/preview-kit/babel.min.js',
  }),
  packages: Object.freeze({
    react: '18.3.1',
    'react-dom': '18.3.1',
    tailwindcss: '4.1.11',
    '@tailwindcss/vite': '4.1.11',
    '@vitejs/plugin-react': '4.3.4',
    vite: '6.1.0',
    clsx: '2.1.1',
    'tailwind-merge': '3.4.0',
    'class-variance-authority': '0.7.1',
    'lucide-react': '0.556.0',
    motion: '12.23.25',
    'framer-motion': '12.23.25',
    'radix-ui': '1.4.3',
    '@radix-ui/react-accordion': '1.2.3',
    '@radix-ui/react-alert-dialog': '1.1.6',
    '@radix-ui/react-aspect-ratio': '1.1.2',
    '@radix-ui/react-avatar': '1.1.3',
    '@radix-ui/react-checkbox': '1.1.4',
    '@radix-ui/react-collapsible': '1.1.3',
    '@radix-ui/react-context-menu': '2.2.6',
    '@radix-ui/react-dialog': '1.1.6',
    '@radix-ui/react-dropdown-menu': '2.1.6',
    '@radix-ui/react-hover-card': '1.1.6',
    '@radix-ui/react-icons': '1.3.2',
    '@radix-ui/react-label': '2.1.2',
    '@radix-ui/react-menubar': '1.1.6',
    '@radix-ui/react-navigation-menu': '1.2.5',
    '@radix-ui/react-popover': '1.1.6',
    '@radix-ui/react-progress': '1.1.2',
    '@radix-ui/react-radio-group': '1.2.3',
    '@radix-ui/react-scroll-area': '1.2.3',
    '@radix-ui/react-select': '2.1.6',
    '@radix-ui/react-separator': '1.1.2',
    '@radix-ui/react-slider': '1.2.3',
    '@radix-ui/react-slot': '1.1.2',
    '@radix-ui/react-switch': '1.1.3',
    '@radix-ui/react-tabs': '1.1.3',
    '@radix-ui/react-toast': '1.2.6',
    '@radix-ui/react-toggle': '1.1.2',
    '@radix-ui/react-toggle-group': '1.1.2',
    '@radix-ui/react-tooltip': '1.1.8',
    '@base-ui/react': '1.0.0-alpha.6',
    'react-icons': '5.5.0',
    '@hugeicons/react': '1.0.2',
    '@hugeicons/core-free-icons': '1.0.2',
    '@tabler/icons-react': '3.31.0',
    '@aliimam/icons': '1.0.14',
    'phosphor-react': '1.4.1',
    sonner: '2.0.1',
    cmdk: '1.1.1',
    vaul: '1.1.2',
    'input-otp': '1.4.2',
    recharts: '2.15.1',
    'react-day-picker': '9.6.1',
    'date-fns': '4.1.0',
    zod: '3.24.2',
    'react-hook-form': '7.54.2',
    '@hookform/resolvers': '4.1.3',
    'react-use-measure': '2.1.7',
    'next-themes': '0.4.6',
    '@number-flow/react': '0.5.9',
    'embla-carousel-react': '8.5.2',
    'embla-carousel-autoplay': '8.5.2',
    'react-resizable-panels': '2.1.7',
    'canvas-confetti': '1.9.3',
    nanoid: '5.1.2',
    shiki: '3.2.1',
    '@dnd-kit/core': '6.3.1',
    '@dnd-kit/sortable': '10.0.0',
    '@dnd-kit/utilities': '3.2.2',
    '@floating-ui/react': '0.27.4',
    'react-aria-components': '1.7.1',
    'react-router-dom': '7.2.0',
  }),
});

/**
 * Resolves a pinned package version strictly from the Preview Kit lockfile.
 * Never returns "latest" or unpinned ranges.
 */
export function resolveLockedPackageVersion(pkgName = '', lockPackages = PREVIEW_KIT_MANIFEST.packages) {
  const clean = String(pkgName || '').trim();
  if (!clean) return null;
  if (lockPackages[clean]) return lockPackages[clean];
  // Normalize subpath imports: motion/react -> motion, react-icons/fa -> react-icons, @base-ui/react/dialog -> @base-ui/react
  const basePkg = clean.startsWith('@')
    ? clean.split('/').slice(0, 2).join('/')
    : clean.split('/')[0];
  return lockPackages[basePkg] || null;
}

/**
 * Deterministic cross-environment content hash (FNV-1a 64-bit hex approximation via dual 32-bit).
 */
export function computeContentHash(input = '') {
  const str = typeof input === 'string' ? input : JSON.stringify(input ?? '');
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + (i & 255);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Step 7 — Unified Library Manifest Schema
 * Shared by built-in indexed libraries, custom libraries, and future custom animation libraries.
 */
export function createLibraryManifest({
  id,
  name,
  source = 'custom', // "indexed" | "custom"
  framework = 'react', // "html" | "react" | "mixed"
  tailwindVersion = 4,
  theme = {},
  deps = [],
  components = [],
  archived = false,
  pinnedCommit = '',
  sourceUrl = '',
} = {}) {
  const normalizedSource = source === 'indexed' ? 'indexed' : 'custom';
  return {
    schemaVersion: 1,
    id: String(id || '').trim(),
    name: String(name || 'Untitled Library').trim(),
    source: normalizedSource,
    framework: String(framework || 'react'),
    tailwindVersion: Number(tailwindVersion || 4),
    theme: {
      light: theme?.light && typeof theme.light === 'object' ? { ...theme.light } : {},
      dark: theme?.dark && typeof theme.dark === 'object' ? { ...theme.dark } : {},
      tokensCss: String(theme?.tokensCss || ''),
    },
    deps: Array.isArray(deps)
      ? Array.from(new Set(deps.map((d) => String(d || '').trim()).filter(Boolean)))
      : [],
    components: Array.isArray(components) ? components : [],
    archived: Boolean(archived),
    pinnedCommit: String(pinnedCommit || ''),
    sourceUrl: String(sourceUrl || ''),
  };
}

/**
 * Step 3 — Normalized Component Record factory.
 */
export function createNormalizedComponentRecord({
  id = '',
  library = '',
  category = 'cards',
  title = '',
  description = '',
  framework = 'react',
  tags = [],
  status = VERIFICATION_STATUS.VERIFIED,
  reasonCode = null,
  reasonMessage = '',
  hash = '',
  code = '',
  demoCode = '',
  renderedHtml = '',
  darkRenderedHtml = '',
  css = '',
  manifest = null,
  usageNotes = '',
} = {}) {
  const safeManifest = {
    dependencies: manifest?.dependencies && typeof manifest.dependencies === 'object' ? { ...manifest.dependencies } : {},
    tailwindVersion: Number(manifest?.tailwindVersion || PREVIEW_KIT_MANIFEST.tailwindVersion),
    css: String(manifest?.css || css || ''),
    keyframes: Array.isArray(manifest?.keyframes) ? [...manifest.keyframes] : [],
    unsupportedPackages: Array.isArray(manifest?.unsupportedPackages) ? [...manifest.unsupportedPackages] : [],
    shimmedImports: Array.isArray(manifest?.shimmedImports) ? [...manifest.shimmedImports] : [],
    unresolvedImports: Array.isArray(manifest?.unresolvedImports) ? [...manifest.unresolvedImports] : [],
  };

  return {
    id: String(id || ''),
    library: String(library || ''),
    category: String(category || 'cards'),
    title: String(title || 'Component'),
    name: String(title || 'Component'),
    description: String(description || ''),
    framework: String(framework || 'react'),
    tags: Array.isArray(tags) ? Array.from(new Set(tags.filter(Boolean))) : [],
    status: Object.values(VERIFICATION_STATUS).includes(status) ? status : VERIFICATION_STATUS.FAILED,
    reasonCode: reasonCode || null,
    reasonMessage: String(reasonMessage || ''),
    hash: String(hash || computeContentHash(`${code}\n${demoCode}\n${renderedHtml}\n${css}`)),
    code: String(code || ''),
    demoCode: String(demoCode || ''),
    renderedHtml: String(renderedHtml || ''),
    darkRenderedHtml: String(darkRenderedHtml || ''),
    css: String(css || ''),
    manifest: safeManifest,
    usageNotes: String(usageNotes || ''),
  };
}

/**
 * Per-library scoped theme token definitions so libraries never clobber each other's CSS variables.
 * Scoped under `[data-lib="<libraryId>"]` (light) and `[data-lib="<libraryId>"].dark` (dark).
 */
const SCOPED_LIBRARY_THEME_OVERRIDES = {
  'shadcn-ui': {
    light: {
      '--background': '0 0% 100%',
      '--foreground': '240 10% 3.9%',
      '--primary': '240 5.9% 10%',
      '--primary-foreground': '0 0% 98%',
      '--radius': '0.625rem',
    },
    dark: {
      '--background': '240 10% 3.9%',
      '--foreground': '0 0% 98%',
      '--primary': '0 0% 98%',
      '--primary-foreground': '240 5.9% 10%',
      '--radius': '0.625rem',
    },
  },
  'kokonut-ui': {
    light: {
      '--background': '0 0% 100%',
      '--foreground': '240 10% 3.9%',
      '--primary': '346.8 77.2% 49.8%',
      '--primary-foreground': '355.7 100% 97.3%',
      '--radius': '0.75rem',
    },
    dark: {
      '--background': '240 10% 3.9%',
      '--foreground': '0 0% 98%',
      '--primary': '350 89% 68%',
      '--primary-foreground': '240 10% 3.9%',
      '--radius': '0.75rem',
    },
  },
  hyperui: {
    light: {
      '--background': '0 0% 100%',
      '--foreground': '222.2 84% 4.9%',
      '--primary': '238.7 83.5% 66.7%',
      '--primary-foreground': '0 0% 100%',
      '--radius': '0.5rem',
    },
    dark: {
      '--background': '222.2 47.4% 11.2%',
      '--foreground': '210 40% 98%',
      '--primary': '234.5 89.5% 73.9%',
      '--primary-foreground': '222.2 47.4% 11.2%',
      '--radius': '0.5rem',
    },
  },
  'watermelon-ui': {
    light: {
      '--background': '0 0% 100%',
      '--foreground': '224 14% 10%',
      '--primary': '160 84% 39%',
      '--primary-foreground': '0 0% 100%',
      '--radius': '0.75rem',
    },
    dark: {
      '--background': '220 13% 5%',
      '--foreground': '220 14% 96%',
      '--card': '220 13% 8%',
      '--card-foreground': '220 14% 96%',
      '--primary': '160 84% 39%',
      '--primary-foreground': '160 84% 6%',
      '--radius': '0.75rem',
    },
  },
  'awesome-components': {
    light: {
      '--background': '0 0% 100%',
      '--foreground': '240 10% 3.9%',
      '--primary': '221.2 83.2% 53.3%',
      '--primary-foreground': '210 40% 98%',
      '--radius': '0.625rem',
    },
    dark: {
      '--background': '240 10% 3.9%',
      '--foreground': '0 0% 98%',
      '--primary': '217.2 91.2% 59.8%',
      '--primary-foreground': '222.2 47.4% 11.2%',
      '--radius': '0.625rem',
    },
  },
};

export function buildScopedLibraryThemeCss(libraryId = 'shadcn-ui') {
  const safeId = String(libraryId || 'shadcn-ui').replace(/[^a-z0-9_-]/gi, '');
  const overrides = SCOPED_LIBRARY_THEME_OVERRIDES[safeId];
  if (!overrides) return '';
  const fmt = (map) => Object.entries(map).map(([k, v]) => `    ${k}: ${v};`).join('\n');
  return `
  [data-lib="${safeId}"] {
${fmt(overrides.light)}
  }
  [data-lib="${safeId}"].dark,
  .dark [data-lib="${safeId}"] {
${fmt(overrides.dark)}
  }`;
}

/**
 * Checks whether a library is archived/hidden under the active switches.
 * Existing projects referencing hidden libraries can still resolve them via getLibrary(id).
 */
export function isLibraryArchived(lib) {
  if (!lib) return true;
  if (lib.archived === true) return true;
  if (WATERMELON_ONLY_MODE) {
    return lib.id !== 'watermelon-ui';
  }
  if (!HIDE_OTHER_SOURCES) return false;
  if (!lib.isBuiltIn) return false;
  return !KEEP_INDEXED_LIBRARY_IDS.includes(lib.id);
}
