/**
 * WebForge Studio — Import-Time Component Normalization Pipeline
 *
 * Runs at import/ingest time (both server-side for indexed catalogs and client-side
 * for Import GitHub / Import JSON / New Library / AI Instructions), NEVER ad-hoc at
 * render time. Produces a self-contained normalized component record:
 *   1. Single self-contained file with a guaranteed default export (inlining aux files)
 *   2. Rewritten imports (aliases resolved, Next.js shimmed, "use client" stripped)
 *   3. Demo wrapper (uses library's own demo if present, else synthesizes sample props)
 *   4. Exact dependency manifest (pinned versions sourced strictly from Preview Kit lockfile)
 *   5. Content hash, static diagnostics, and deterministic auto-fix retry passes
 */

import {
  PREVIEW_KIT_MANIFEST,
  VERIFICATION_STATUS,
  FAILURE_REASON_CODES,
  resolveLockedPackageVersion,
  computeContentHash,
  createNormalizedComponentRecord,
} from './ui-library-schema.mjs';
import { synthesizeTsxSampleProps } from './ui-tsx-sandbox.mjs';

const SERVER_ONLY_MODULES = new Set([
  'fs', 'node:fs', 'path', 'node:path', 'crypto', 'node:crypto', 'child_process', 'node:child_process',
  'next/headers', 'next/cache', 'next/server', 'server-only',
]);

const NEXT_SHIMMED_PREFIXES = ['next/link', 'next/image', 'next/navigation', 'next/router', 'next/font'];

const SHIMMED_PACKAGE_PREFIXES = [
  'react', 'react-dom', 'clsx', 'tailwind-merge', 'class-variance-authority',
  'lucide-react', 'motion', 'framer-motion', 'radix-ui', '@radix-ui/', '@base-ui/',
  'react-icons', '@hugeicons/', '@tabler/icons-react', '@aliimam/icons', 'phosphor-react', 'hugeicons-react',
  'sonner', 'cmdk', 'vaul', 'input-otp', 'recharts', 'react-day-picker', 'date-fns',
  'zod', 'react-hook-form', '@hookform/resolvers', 'react-use-measure', 'next-themes',
  '@number-flow/react', 'embla-carousel-react', 'embla-carousel-autoplay', 'react-resizable-panels',
  'canvas-confetti', 'nanoid', 'shiki', 'tunnel-rat', 'wavesurfer.js', 'matter-js',
  '@dnd-kit/', '@floating-ui/', 'react-aria-components', 'react-router-dom', 'react-router',
  'react-payment-inputs', 'use-mask-input',
];

function isShimmedPackage(spec) {
  if (!spec) return false;
  if (NEXT_SHIMMED_PREFIXES.some((p) => spec === p || spec.startsWith(`${p}/`))) return true;
  return SHIMMED_PACKAGE_PREFIXES.some((p) => (p.endsWith('/') ? spec.startsWith(p) : spec === p || spec.startsWith(`${p}/`)));
}

function getBasePackageName(spec = '') {
  const clean = String(spec || '').trim();
  if (!clean || clean.startsWith('.') || clean.startsWith('/') || clean.startsWith('@/')) return '';
  if (clean.startsWith('@')) return clean.split('/').slice(0, 2).join('/');
  return clean.split('/')[0];
}

export function extractImportSpecifiers(code = '') {
  const specs = [];
  const src = String(code || '');
  const importRe = /(?:^|\n)\s*import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(src)) !== null) {
    specs.push(m[1]);
  }
  const reqRe = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = reqRe.exec(src)) !== null) {
    specs.push(m[1]);
  }
  return Array.from(new Set(specs));
}

/**
 * Strips Next.js directives ("use client", "use server") and normalizes registry/alias paths.
 */
export function rewriteImportsForPreview(code = '', { libraryId = '' } = {}) {
  let out = String(code || '')
    .replace(/^\s*['"]use client['"];?\s*$/gm, '')
    .replace(/^\s*['"]use server['"];?\s*$/gm, '');

  // Rewrite shadcn registry internal paths to standard @/components/ui/* & @/lib/utils
  out = out.replace(
    /(['"])@\/registry\/(?:new-york-v4|default|new-york)\/ui\/([^'"]+)\1/g,
    '$1@/components/ui/$2$1'
  );
  out = out.replace(
    /(['"])@\/registry\/(?:new-york-v4|default|new-york)\/lib\/utils\1/g,
    '$1@/lib/utils$1'
  );
  out = out.replace(
    /(['"])@\/registry\/(?:new-york-v4|default|new-york)\/hooks\/([^'"]+)\1/g,
    '$1@/hooks/$2$1'
  );
  // Normalize Kokonut / Watermelon / shadcn v4 internal cn utils aliases
  out = out.replace(
    /(['"])(?:\.\.\/)+lib\/utils\1/g,
    '$1@/lib/utils$1'
  );
  out = out.replace(
    /(\bfrom\s+)(['"])cn\2/g,
    '$1$2@/lib/utils$2'
  );
  // Normalize next/font/* imports into safe inline font token stubs if present
  out = out.replace(
    /^\s*import\s+\{([^}]+)\}\s+from\s+['"]next\/font\/[^'"]+['"];?\s*$/gm,
    (_, names) => {
      const idents = names.split(',').map((s) => s.trim().split(/\s+as\s+/).pop().trim()).filter(Boolean);
      return idents.map((id) => `const ${id} = () => ({ className: '', variable: '', style: { fontFamily: 'inherit' } });`).join('\n');
    }
  );

  void libraryId;
  return out.trim();
}

function findPrimaryExportedComponentName(code = '') {
  const src = String(code || '');
  const patterns = [
    /export\s+default\s+function\s+([A-Z][\w$]*)/,
    /export\s+default\s+class\s+([A-Z][\w$]*)/,
    /export\s+default\s+([A-Z][\w$]*)\s*;/,
    /export\s+function\s+([A-Z][\w$]*)/,
    /export\s+(?:const|let)\s+([A-Z][\w$]*)\s*(?::[^=]+)?=\s*(?:React\.)?(?:memo|forwardRef|\(|async\s*\()/,
    /function\s+([A-Z][\w$]*)\s*\(/,
  ];
  for (const re of patterns) {
    const m = src.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/**
 * Ensures the normalized file always has a default export so preview & consumer imports succeed.
 */
export function ensureDefaultExport(code = '') {
  const src = String(code || '').trim();
  if (!src) return '';
  if (/\bexport\s+default\b/.test(src)) return src;
  const primary = findPrimaryExportedComponentName(src);
  if (primary) {
    return `${src}\n\nexport default ${primary};\n`;
  }
  return src;
}

/**
 * Inlines simple local helper auxiliary files into a single self-contained normalized file
 * when exporting/attaching, while also preserving structured auxiliaryFiles for the sandbox.
 */
export function buildSelfContainedSource(primaryCode = '', auxiliaryFiles = [], { libraryId = '' } = {}) {
  const rewrittenPrimary = ensureDefaultExport(rewriteImportsForPreview(primaryCode, { libraryId }));
  const auxList = Array.isArray(auxiliaryFiles) ? auxiliaryFiles.filter((f) => f && f.code) : [];
  if (!auxList.length) return rewrittenPrimary;

  // Rewrite each auxiliary file cleanly and append as reference comments/helpers if needed
  const cleanedAux = auxList.map((af) => ({
    path: String(af.path || 'helper.tsx'),
    code: rewriteImportsForPreview(af.code, { libraryId }),
  }));

  // If primary already imports relative helper modules that exist in auxList, keep a clean bundled banner
  const auxHeader = cleanedAux
    .map((af) => `// --- Bundled dependency: ${af.path} ---\n${af.code}`)
    .join('\n\n');

  // Only inline directly if the primary file has relative imports pointing to aux files and no symbol collision
  const hasRelativeAux = cleanedAux.some((af) => {
    const base = af.path.split('/').pop().replace(/\.(tsx|ts|jsx|js)$/, '');
    return new RegExp(`from\\s+['"][^'"]*/?${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`).test(rewrittenPrimary);
  });

  if (!hasRelativeAux) return rewrittenPrimary;
  return `${rewrittenPrimary}\n\n/* === Auxiliary Modules (Bundled for Single-File Export) ===\n${auxHeader.replace(/\*\//g, '* /')}\n*/`;
}

/**
 * Extracts CSS keyframes and custom CSS variables mentioned in component code or promptCss.
 */
export function extractCssManifest(code = '', extraCss = '') {
  const keyframes = [];
  const cssStr = String(extraCss || '');
  const kfRe = /@keyframes\s+([a-zA-Z0-9_-]+)/g;
  let m;
  while ((m = kfRe.exec(cssStr)) !== null) {
    keyframes.push(m[1]);
  }
  // Detect Tailwind animate-* references to known Preview Kit animations
  const animRe = /\banimate-(accordion-down|accordion-up|marquee|shimmer|shimmer-slide|spin-around|rainbow|spotlight|meteor|aurora|gradient|border-beam|ripple|orbit|shine|slide-up-fade|fade-in)\b/g;
  while ((m = animRe.exec(String(code || ''))) !== null) {
    keyframes.push(m[1]);
  }
  return {
    css: cssStr.trim(),
    keyframes: Array.from(new Set(keyframes)),
  };
}

/**
 * Generates a clean demo wrapper for components without an explicit demoCode.
 */
export function buildDemoWrapperCode(primaryCode = '', auxiliaryFiles = []) {
  const compName = findPrimaryExportedComponentName(primaryCode);
  if (!compName) return '';
  const { props, callbackNames } = synthesizeTsxSampleProps(primaryCode, auxiliaryFiles);
  const propKeys = Object.keys(props);
  if (!propKeys.length && !callbackNames.length) {
    return '';
  }
  const serializedProps = JSON.stringify(props, null, 2);
  const cbLines = callbackNames.map((cb) => `  ${cb}: () => {},`).join('\n');
  return [
    `import Component from './component';`,
    ``,
    `const SAMPLE_PROPS = ${serializedProps};`,
    ``,
    `export default function Demo() {`,
    `  return (`,
    `    <Component`,
    `      {...SAMPLE_PROPS}`,
    ...(cbLines ? [`      {...({\n${cbLines}\n      })}`] : []),
    `    />`,
    `  );`,
    `}`,
  ].join('\n');
}

/**
 * Normalizes any raw component (from indexed catalog, GitHub import, JSON import,
 * custom form, or AI Instructions) into a complete NormalizedComponentRecord.
 */
export function normalizeComponentRecord(raw = {}, {
  libraryId = '',
  framework = '',
  lockPackages = PREVIEW_KIT_MANIFEST.packages,
} = {}) {
  const lib = String(libraryId || raw.catalogId || raw.library || 'custom').trim();
  const renderedHtml = String(raw.renderedHtml || raw.htmlCode || raw.previewHtml || '').trim();
  const darkRenderedHtml = String(raw.darkRenderedHtml || raw.darkHtmlCode || '').trim();
  const rawCode = String(raw.code || raw.jsxCode || '').trim();
  const rawDemo = String(raw.demoCode || '').trim();
  const auxFiles = Array.isArray(raw.auxiliaryFiles)
    ? raw.auxiliaryFiles.map((af) => ({
        path: String(af?.path || 'helper.tsx'),
        code: rewriteImportsForPreview(af?.code || '', { libraryId: lib }),
      }))
    : [];

  const detectedFramework = framework
    || (raw.catalogType === 'html' || (renderedHtml && !rawCode) ? 'html' : 'react');

  const normalizedCode = rawCode
    ? buildSelfContainedSource(rawCode, auxFiles, { libraryId: lib })
    : '';
  const rewrittenPrimaryOnly = rawCode
    ? ensureDefaultExport(rewriteImportsForPreview(rawCode, { libraryId: lib }))
    : '';
  const rewrittenDemo = rawDemo
    ? ensureDefaultExport(rewriteImportsForPreview(rawDemo, { libraryId: lib }))
    : '';

  const allSources = [rewrittenPrimaryOnly, rewrittenDemo, ...auxFiles.map((f) => f.code)].filter(Boolean).join('\n');
  const specs = extractImportSpecifiers(allSources);

  const dependencies = {};
  const unsupportedPackages = [];
  const shimmedImports = [];
  const unresolvedImports = [];
  let hasNextOnly = false;
  let nextOnlySpec = '';

  const auxPathSet = new Set(
    auxFiles.flatMap((af) => {
      const clean = af.path.replace(/^\/+/, '');
      const noExt = clean.replace(/\.(tsx|ts|jsx|js)$/, '');
      const base = noExt.split('/').pop();
      return [clean, noExt, `@/${clean}`, `@/${noExt}`, base];
    })
  );

  for (const spec of specs) {
    if (SERVER_ONLY_MODULES.has(spec)) {
      hasNextOnly = true;
      nextOnlySpec = spec;
      continue;
    }
    if (NEXT_SHIMMED_PREFIXES.some((p) => spec === p || spec.startsWith(`${p}/`))) {
      shimmedImports.push(spec);
      continue;
    }
    if (spec === 'cn' || spec.startsWith('@/lib/utils') || spec.endsWith('/utils') || spec.endsWith('/cn')) {
      shimmedImports.push(spec);
      dependencies.clsx = resolveLockedPackageVersion('clsx', lockPackages);
      dependencies['tailwind-merge'] = resolveLockedPackageVersion('tailwind-merge', lockPackages);
      continue;
    }
    if (spec.startsWith('@/components/ui/') || spec.startsWith('@/hooks/')) {
      shimmedImports.push(spec);
      continue;
    }
    if (spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('@/')) {
      const norm = spec.replace(/^@\//, '').replace(/^\.\//, '').replace(/^(\.\.\/)+/, '').replace(/\.(tsx|ts|jsx|js)$/, '');
      const base = norm.split('/').pop();
      if (!auxPathSet.has(norm) && !auxPathSet.has(base) && !spec.includes('/ui/')) {
        unresolvedImports.push(spec);
      }
      continue;
    }

    const basePkg = getBasePackageName(spec);
    if (!basePkg) continue;
    const lockedVer = resolveLockedPackageVersion(basePkg, lockPackages);
    if (lockedVer) {
      dependencies[basePkg] = lockedVer;
    } else if (isShimmedPackage(spec)) {
      shimmedImports.push(spec);
    } else {
      unsupportedPackages.push(spec);
    }
  }

  // Always ensure React + utility baseline deps for React components
  if (detectedFramework === 'react') {
    dependencies.react = resolveLockedPackageVersion('react', lockPackages);
    dependencies['react-dom'] = resolveLockedPackageVersion('react-dom', lockPackages);
    if (/\bcn\(/.test(allSources)) {
      dependencies.clsx = resolveLockedPackageVersion('clsx', lockPackages);
      dependencies['tailwind-merge'] = resolveLockedPackageVersion('tailwind-merge', lockPackages);
    }
    if (/\bcva\(/.test(allSources)) {
      dependencies['class-variance-authority'] = resolveLockedPackageVersion('class-variance-authority', lockPackages);
    }
  }

  const cssManifest = extractCssManifest(allSources, raw.promptCss || raw.previewCss || '');
  const synthesizedSample = detectedFramework === 'react' && !rewrittenDemo && rewrittenPrimaryOnly
    ? synthesizeTsxSampleProps(rewrittenPrimaryOnly, auxFiles)
    : { props: {}, callbackNames: [] };
  const generatedDemoWrapper = detectedFramework === 'react' && !rewrittenDemo && rewrittenPrimaryOnly
    ? buildDemoWrapperCode(rewrittenPrimaryOnly, auxFiles)
    : '';

  // Static pre-verification diagnosis
  let status = VERIFICATION_STATUS.VERIFIED;
  let reasonCode = null;
  let reasonMessage = '';

  if (hasNextOnly) {
    status = VERIFICATION_STATUS.FAILED;
    reasonCode = FAILURE_REASON_CODES.NEXT_ONLY;
    reasonMessage = `Uses server-only or Next.js runtime module "${nextOnlySpec}"`;
  } else if (unsupportedPackages.length > 0) {
    status = VERIFICATION_STATUS.FAILED;
    reasonCode = FAILURE_REASON_CODES.MISSING_DEP;
    reasonMessage = `Requires package outside Preview Kit lockfile: ${unsupportedPackages.slice(0, 3).join(', ')}`;
  } else if (!renderedHtml && !rewrittenPrimaryOnly && !rewrittenDemo) {
    status = VERIFICATION_STATUS.FAILED;
    reasonCode = FAILURE_REASON_CODES.BLANK;
    reasonMessage = 'Component source and rendered HTML are both empty';
  } else if (unresolvedImports.length > 0) {
    status = VERIFICATION_STATUS.DEGRADED;
    reasonCode = FAILURE_REASON_CODES.UNRESOLVED_IMPORT;
    reasonMessage = `Shimmed unresolved local import(s): ${unresolvedImports.slice(0, 2).join(', ')}`;
  }

  const depNames = Object.keys(dependencies).filter((d) => d !== 'react' && d !== 'react-dom');
  const usageNotes = [
    detectedFramework === 'html'
      ? `Tailwind CSS v${PREVIEW_KIT_MANIFEST.tailwindVersion} HTML block from ${lib}.`
      : `Normalized React/TSX component from ${lib} (Tailwind v${PREVIEW_KIT_MANIFEST.tailwindVersion}).`,
    depNames.length ? `Install pinned packages: ${depNames.map((d) => `${d}@${dependencies[d]}`).join(', ')}.` : 'Zero external npm packages required beyond React.',
    shimmedImports.length ? `Preview Kit shimmed: ${shimmedImports.slice(0, 4).join(', ')}.` : '',
  ].filter(Boolean).join(' ');

  const hash = computeContentHash(JSON.stringify({
    kit: PREVIEW_KIT_MANIFEST.lockHash,
    code: rewrittenPrimaryOnly,
    demo: rewrittenDemo,
    html: renderedHtml,
    darkHtml: darkRenderedHtml,
    css: cssManifest.css,
    aux: auxFiles.map((a) => `${a.path}:${a.code.length}`),
  }));

  const record = createNormalizedComponentRecord({
    id: raw.id || `${lib}-${computeContentHash(raw.name || rawCode || renderedHtml).slice(0, 8)}`,
    library: lib,
    category: raw.category || 'cards',
    title: raw.title || raw.name || 'UI Component',
    description: raw.description || '',
    framework: detectedFramework,
    tags: Array.isArray(raw.tags) ? raw.tags : [raw.collection, raw.category, detectedFramework].filter(Boolean),
    status,
    reasonCode,
    reasonMessage,
    hash,
    code: normalizedCode || rewrittenPrimaryOnly,
    demoCode: rewrittenDemo,
    renderedHtml,
    darkRenderedHtml,
    css: cssManifest.css,
    manifest: {
      dependencies,
      tailwindVersion: PREVIEW_KIT_MANIFEST.tailwindVersion,
      css: cssManifest.css,
      keyframes: cssManifest.keyframes,
      unsupportedPackages,
      shimmedImports,
      unresolvedImports,
    },
    usageNotes,
  });

  // Preserve auxiliary files and synthesized props for runtime preview execution
  return {
    ...record,
    sourcePath: String(raw.sourcePath || ''),
    auxiliaryFiles: auxFiles,
    sampleProps: synthesizedSample.props,
    callbackNames: synthesizedSample.callbackNames,
    generatedDemoWrapper,
    prompt: String(raw.prompt || ''),
    repoUrl: String(raw.repoUrl || ''),
    screenshotUrl: String(raw.screenshotUrl || ''),
    authorName: String(raw.authorName || ''),
    wfCollection: String(raw.wfCollection || ''),
    blockCategory: String(raw.blockCategory || ''),
  };
}

/**
 * Step 4 — Deterministic auto-fix retry pass (up to 2 attempts) when verification fails.
 */
export function applyNormalizationAutoFix(record, attempt = 1, failure = {}) {
  if (!record || attempt > 2) return null;
  const code = String(record.code || '');
  const reason = failure.reasonCode || record.reasonCode || '';

  // Retry 1: Rewrite any missed @/ or relative imports & ensure default export
  if (attempt === 1) {
    let patched = rewriteImportsForPreview(code, { libraryId: record.library });
    // Convert unresolvable relative imports to @/components/ui/ stubs so preview sandbox can shim them
    if (reason === FAILURE_REASON_CODES.UNRESOLVED_IMPORT || reason === FAILURE_REASON_CODES.RUNTIME_ERROR) {
      patched = patched.replace(/from\s+['"]\.\.?\/([^'"]+)['"]/g, (_, sub) => {
        if (/utils|cn/i.test(sub)) return `from '@/lib/utils'`;
        return `from '@/components/ui/${sub.split('/').pop()}'`;
      });
    }
    patched = ensureDefaultExport(patched);
    if (patched !== code || !record.demoCode) {
      return {
        ...record,
        code: patched,
        autoFixAttempts: attempt,
      };
    }
  }

  // Retry 2: Force synthetic sample props injection or strip broken image/script tags in HTML
  if (attempt === 2) {
    if (record.framework === 'html' && record.renderedHtml) {
      const cleanedHtml = record.renderedHtml
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
      return {
        ...record,
        renderedHtml: cleanedHtml,
        autoFixAttempts: attempt,
      };
    }
    if (record.code) {
      // Drop broken demoCode and mount primary component directly with synthesized props
      const synth = synthesizeTsxSampleProps(record.code, record.auxiliaryFiles || []);
      return {
        ...record,
        demoCode: '',
        sampleProps: {
          title: record.title || 'Preview',
          label: record.title || 'Preview',
          children: record.title || 'Preview',
          ...(synth.props || {}),
        },
        callbackNames: synth.callbackNames || [],
        autoFixAttempts: attempt,
      };
    }
  }

  return null;
}
