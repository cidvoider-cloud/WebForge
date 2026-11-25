/**
 * WebForge Studio — Multi-Library GitHub Remote Catalog Engine
 *
 * Powers full indexed catalogs with sub-10ms search, category counts, pagination,
 * on-demand GitHub source fetching, and local disk caching for:
 *   - Kokonut UI (kokonut-labs/kokonutui)
 *   - HyperUI    (markmead/hyperui)
 *   - shadcn/ui  (shadcn-ui/ui)
 */
import fs from 'fs';
import path from 'path';
import {
  classifyAwesomeCategory,
  computeCategoryCounts,
  htmlSnapshotToReactComponent,
} from './awesome-components.mjs';
import {
  enrichWatermelonCatalogItems,
  computeWatermelonCounts,
  buildWatermelonStarterVfs,
  prioritizeBlocksFirst,
} from '../js/modules/watermelon-ecosystem.mjs';

export const CATALOG_CACHE_VERSION = 3;

export const REMOTE_CATALOG_CONFIGS = {
  'kokonut-ui': {
    id: 'kokonut-ui',
    name: 'Kokonut UI',
    owner: 'kokonut-labs',
    repo: 'kokonutui',
    branch: 'main',
    catalogType: 'tsx',
    repoUrl: 'https://github.com/kokonut-labs/kokonutui',
    rawBase: 'https://raw.githubusercontent.com/kokonut-labs/kokonutui/main',
    indexRelPath: 'data/kokonut-ui-index.json',
    cacheRelDir: 'data/catalog-cache/kokonut-ui',
  },
  'watermelon-ui': {
    id: 'watermelon-ui',
    name: 'Watermelon UI',
    owner: 'WatermelonCorp',
    repo: 'watermelon-platform',
    branch: 'main',
    catalogType: 'tsx',
    sourceMode: 'watermelon-vite',
    registryBase: 'https://ui.watermelon.sh/r',
    repoUrl: 'https://ui.watermelon.sh',
    rawBase: 'https://ui.watermelon.sh/r',
    indexRelPath: 'data/watermelon-ui-index.json',
    detailsRelPath: 'data/watermelon-ui-details.json',
    cacheRelDir: 'data/catalog-cache/watermelon-ui',
  },
  hyperui: {
    id: 'hyperui',
    name: 'HyperUI',
    owner: 'markmead',
    repo: 'hyperui',
    branch: 'main',
    catalogType: 'html',
    repoUrl: 'https://github.com/markmead/hyperui',
    rawBase: 'https://raw.githubusercontent.com/markmead/hyperui/main',
    indexRelPath: 'data/hyperui-index.json',
    cacheRelDir: 'data/catalog-cache/hyperui',
  },
  'shadcn-ui': {
    id: 'shadcn-ui',
    name: 'shadcn/ui',
    owner: 'shadcn-ui',
    repo: 'ui',
    branch: 'main',
    catalogType: 'tsx',
    repoUrl: 'https://github.com/shadcn-ui/ui',
    rawBase: 'https://raw.githubusercontent.com/shadcn-ui/ui/main',
    indexRelPath: 'data/shadcn-ui-index.json',
    cacheRelDir: 'data/catalog-cache/shadcn-ui',
  },
};

export function getRemoteCatalogConfig(catalogId) {
  return REMOTE_CATALOG_CONFIGS[String(catalogId || '').trim()] || null;
}

export function formatTitleFromSlug(slug = '') {
  return String(slug || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAi\b/g, 'AI')
    .replace(/\bUi\b/g, 'UI')
    .replace(/\bCta\b/g, 'CTA')
    .replace(/\bFaq\b/g, 'FAQ')
    .replace(/\bOtp\b/g, 'OTP')
    .replace(/\bKbd\b/g, 'KBD')
    .replace(/\bId\b/g, 'ID')
    .trim();
}

export function classifyCatalogCategory(slug = '', name = '', collection = '') {
  const hay = `${slug} ${name} ${collection}`.toLowerCase();
  if (/pricing|price|plan|tier|billing|subscription|checkout/.test(hay)) return 'pricing';
  if (/navbar|nav-bar|header|topbar|sidebar|dock|navigation|breadcrumb|menubar|command|side-menu|vertical-menu|pagination/.test(hay)) return 'navbar';
  if (/hero|banner|landing|marquee|spotlight|globe|shader|aurora|beams|particles|background|halftone|vortex|lamp|meteor|sparkles|waves|announcement|cta|newsletter/.test(hay)) return 'hero';
  if (/button|btn|toggle|switch|checkbox|radio|slider|quantity-input/.test(hay)) return 'buttons';
  if (/modal|dialog|drawer|popover|sheet|lightbox|dropdown|tooltip|context-menu|hover-card|command-dialog/.test(hay)) return 'modals';
  if (/login|signin|sign-in|signup|sign-up|auth|form|input|textarea|select|otp|search|upload|date-picker|calendar|combobox|password|contact|field|filter|prompt/.test(hay)) return 'forms';
  if (/table|chart|graph|metric|kpi|stat|analytics|dashboard|kanban|timeline|heatmap|sparkline|progress|counter|ticker|detail|list|meter|diff/.test(hay)) return 'tables';
  if (/(?:^|[^a-z])tabs?(?:[^a-z]|$)|stepper|steps|segmented|carousel|pagin/.test(hay)) return 'tabs';
  if (/alert|toast|sonner|notification|status|cookie|empty-state|empty|badge|pill|chip|error|skeleton|spinner/.test(hay)) return 'alerts';
  if (/accordion|faq|collapse|collapsible|disclosure|expandable|tree/.test(hay)) return 'accordion';
  if (/footer|site-footer/.test(hay)) return 'footer';
  return classifyAwesomeCategory(slug, name);
}

/**
 * Normalizes Kokonut UI registry.json + components/kokonutui/*.tsx tree into catalog entries.
 */
export function buildKokonutIndexFromTree(registryJson = null, treePaths = []) {
  const cfg = REMOTE_CATALOG_CONFIGS['kokonut-ui'];
  const bySlug = new Map();
  const registryItems = Array.isArray(registryJson?.items) ? registryJson.items : [];

  for (const item of registryItems) {
    if (!item || !item.name) continue;
    const files = Array.isArray(item.files) ? item.files : [];
    const tsxFiles = files
      .map((f) => String(f?.path || '').replace(/^\/+/, ''))
      .filter((p) => /\.(tsx|jsx|ts|js)$/i.test(p));
    const primary = tsxFiles.find((p) => p.includes('components/kokonutui/')) || tsxFiles[0];
    if (!primary) continue;

    const slug = String(item.name).trim();
    const title = String(item.title || formatTitleFromSlug(slug)).trim();
    const aux = tsxFiles.filter((p) => p !== primary);
    const isAi = /^ai[-_]/i.test(slug) || /\bai\b/i.test(title);
    const isBg = /background|shader|beams|particles|shape|halftone/i.test(slug);
    const collection = isAi ? 'AI Interfaces' : isBg ? 'Backgrounds' : 'Motion UI';

    bySlug.set(slug, {
      id: `kokonut/${slug}`,
      catalogId: 'kokonut-ui',
      slug,
      name: title,
      category: classifyCatalogCategory(slug, title, collection),
      collection,
      description: String(item.description || `${title} component from Kokonut UI`).trim(),
      sourcePath: primary,
      auxiliaryPaths: aux,
      dependencies: Array.isArray(item.dependencies) ? item.dependencies.slice(0, 8) : [],
      authorName: 'Kokonut UI',
      catalogType: 'tsx',
      repoUrl: `${cfg.repoUrl}/blob/${cfg.branch}/${primary}`,
    });
  }

  for (const p of treePaths) {
    if (!/^components\/kokonutui\/[^/]+\.tsx$/i.test(p)) continue;
    const slug = path.basename(p, '.tsx');
    if (bySlug.has(slug)) continue;
    const title = formatTitleFromSlug(slug);
    const isAi = /^ai[-_]/i.test(slug);
    const isBg = /background|shader|beams|particles|shape|halftone/i.test(slug);
    const collection = isAi ? 'AI Interfaces' : isBg ? 'Backgrounds' : 'Motion UI';
    bySlug.set(slug, {
      id: `kokonut/${slug}`,
      catalogId: 'kokonut-ui',
      slug,
      name: title,
      category: classifyCatalogCategory(slug, title, collection),
      collection,
      description: `${title} component from Kokonut UI`,
      sourcePath: p,
      auxiliaryPaths: [],
      dependencies: [],
      authorName: 'Kokonut UI',
      catalogType: 'tsx',
      repoUrl: `${cfg.repoUrl}/blob/${cfg.branch}/${p}`,
    });
  }

  return Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Normalizes HyperUI public/examples/<collection>/<group>/<variant>.html into paired light/dark entries.
 */
export function buildHyperUiIndexFromTree(treePaths = []) {
  const cfg = REMOTE_CATALOG_CONFIGS.hyperui;
  const htmlPaths = treePaths.filter((p) => /^public\/examples\/[^/]+\/[^/]+\/[^/]+\.html$/i.test(p));
  const pairs = new Map();

  for (const p of htmlPaths) {
    const parts = p.split('/');
    const collectionRaw = parts[2] || 'application';
    const groupRaw = parts[3] || 'components';
    const fileBase = path.basename(parts[4] || '', '.html');
    const isDark = fileBase.endsWith('-dark');
    const variantKey = isDark ? fileBase.slice(0, -5) : fileBase;
    const pairKey = `${collectionRaw}/${groupRaw}/${variantKey}`;

    if (!pairs.has(pairKey)) {
      pairs.set(pairKey, {
        collectionRaw,
        groupRaw,
        variantKey,
        lightPath: '',
        darkPath: '',
      });
    }
    const entry = pairs.get(pairKey);
    if (isDark) entry.darkPath = p;
    else entry.lightPath = p;
  }

  const items = [];
  for (const [pairKey, entry] of pairs.entries()) {
    const collectionLabel = formatTitleFromSlug(entry.collectionRaw);
    const groupTitle = formatTitleFromSlug(entry.groupRaw);
    const variantLabel = /^\d+$/.test(entry.variantKey)
      ? `#${entry.variantKey}`
      : formatTitleFromSlug(entry.variantKey);
    const name = `${groupTitle} ${variantLabel}`;
    const primaryPath = entry.lightPath || entry.darkPath;
    const darkPath = entry.lightPath && entry.darkPath ? entry.darkPath : '';
    const hasDarkVariant = Boolean(darkPath);

    items.push({
      id: `hyperui/${pairKey}`,
      catalogId: 'hyperui',
      slug: `${entry.groupRaw}-${entry.variantKey}`,
      name,
      category: classifyCatalogCategory(entry.groupRaw, name, entry.collectionRaw),
      collection: collectionLabel,
      description: `${collectionLabel} · Pure Tailwind CSS HTML${hasDarkVariant ? ' (Light & Dark variants)' : ''}`,
      sourcePath: primaryPath,
      darkSourcePath: darkPath,
      hasDarkVariant,
      authorName: 'HyperUI',
      catalogType: 'html',
      repoUrl: `${cfg.repoUrl}/blob/${cfg.branch}/${primaryPath}`,
    });
  }

  return items.sort((a, b) => a.collection.localeCompare(b.collection) || a.name.localeCompare(b.name));
}

/**
 * Normalizes shadcn/ui v4 primitives, interactive examples, and layout blocks into catalog entries.
 */
export function buildShadcnIndexFromTree(treePaths = []) {
  const cfg = REMOTE_CATALOG_CONFIGS['shadcn-ui'];
  const uiPrefix = 'apps/v4/registry/new-york-v4/ui/';
  const exPrefix = 'apps/v4/registry/new-york-v4/examples/';
  const blockPrefix = 'apps/v4/registry/new-york-v4/blocks/';

  const uiPaths = treePaths.filter((p) => p.startsWith(uiPrefix) && p.endsWith('.tsx') && !p.slice(uiPrefix.length).includes('/'));
  const exPaths = treePaths.filter((p) => p.startsWith(exPrefix) && p.endsWith('.tsx') && !p.slice(exPrefix.length).includes('/'));
  const blockFiles = treePaths.filter((p) => p.startsWith(blockPrefix) && p.endsWith('.tsx'));

  const exampleSet = new Set(exPaths);
  const items = [];
  const usedAsPrimaryDemo = new Set();

  // 1. Core UI Primitives (paired with official <name>-demo.tsx when available)
  for (const p of uiPaths) {
    const slug = path.basename(p, '.tsx');
    const demoCandidate = `${exPrefix}${slug}-demo.tsx`;
    const demoSourcePath = exampleSet.has(demoCandidate) ? demoCandidate : '';
    if (demoSourcePath) usedAsPrimaryDemo.add(demoSourcePath);

    const title = formatTitleFromSlug(slug);
    items.push({
      id: `shadcn/ui/${slug}`,
      catalogId: 'shadcn-ui',
      slug,
      name: title,
      category: classifyCatalogCategory(slug, title, 'primitive'),
      collection: 'Core Primitive',
      description: demoSourcePath
        ? `Official shadcn/ui v4 ${title} primitive with live interactive demo`
        : `Official shadcn/ui v4 ${title} primitive component`,
      sourcePath: p,
      demoSourcePath,
      auxiliaryPaths: [],
      authorName: 'shadcn/ui',
      catalogType: 'tsx',
      repoUrl: `${cfg.repoUrl}/blob/${cfg.branch}/${p}`,
    });
  }

  // 2. Layout Blocks (group by block folder under blocks/<blockName>/)
  const blocksByName = new Map();
  for (const p of blockFiles) {
    const rel = p.slice(blockPrefix.length);
    const blockName = rel.split('/')[0];
    if (!blockName || blockName.endsWith('.tsx')) continue;
    if (!blocksByName.has(blockName)) blocksByName.set(blockName, []);
    blocksByName.get(blockName).push(p);
  }

  for (const [blockName, files] of blocksByName.entries()) {
    const pageFile = files.find((f) => f.endsWith('/page.tsx')) || files[0];
    if (!pageFile) continue;
    const title = formatTitleFromSlug(blockName);
    const aux = files.filter((f) => f !== pageFile).slice(0, 8);
    items.push({
      id: `shadcn/block/${blockName}`,
      catalogId: 'shadcn-ui',
      slug: blockName,
      name: `${title} Block`,
      category: classifyCatalogCategory(blockName, title, 'block'),
      collection: 'Layout Block',
      description: `Official shadcn/ui v4 multi-file ${title} block (${files.length} file${files.length === 1 ? '' : 's'})`,
      sourcePath: pageFile,
      demoSourcePath: '',
      auxiliaryPaths: aux,
      authorName: 'shadcn/ui',
      catalogType: 'tsx',
      repoUrl: `${cfg.repoUrl}/tree/${cfg.branch}/${blockPrefix}${blockName}`,
    });
  }

  // 3. Additional Interactive Examples (variants like badge-destructive, button-with-icon, etc.)
  for (const p of exPaths) {
    if (usedAsPrimaryDemo.has(p)) continue;
    const slug = path.basename(p, '.tsx');
    if (/^index$/i.test(slug)) continue;
    const title = formatTitleFromSlug(slug);
    items.push({
      id: `shadcn/example/${slug}`,
      catalogId: 'shadcn-ui',
      slug,
      name: title,
      category: classifyCatalogCategory(slug, title, 'example'),
      collection: 'Interactive Example',
      description: `Official shadcn/ui v4 interactive example · ${title}`,
      sourcePath: p,
      demoSourcePath: '',
      auxiliaryPaths: [],
      authorName: 'shadcn/ui',
      catalogType: 'tsx',
      repoUrl: `${cfg.repoUrl}/blob/${cfg.branch}/${p}`,
    });
  }

  const colOrder = { 'Core Primitive': 0, 'Layout Block': 1, 'Interactive Example': 2 };
  return items.sort(
    (a, b) => (colOrder[a.collection] ?? 9) - (colOrder[b.collection] ?? 9) || a.name.localeCompare(b.name)
  );
}

const _catalogMemCache = new Map();
const _detailsBundleCache = new Map();
const _inFlightDetailFetches = new Map();

export function loadRemoteCatalog(catalogId, rootDir = process.cwd()) {
  const cfg = getRemoteCatalogConfig(catalogId);
  if (!cfg) return [];
  const indexPath = path.join(rootDir, cfg.indexRelPath);
  if (_catalogMemCache.has(indexPath)) {
    return _catalogMemCache.get(indexPath);
  }
  if (!fs.existsSync(indexPath)) return [];
  try {
    const raw = fs.readFileSync(indexPath, 'utf8');
    const parsed = JSON.parse(raw);
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
    const items = catalogId === 'watermelon-ui' ? enrichWatermelonCatalogItems(rawItems) : rawItems;
    _catalogMemCache.set(indexPath, items);
    return items;
  } catch {
    return [];
  }
}

export function loadCatalogDetailsBundle(catalogId, rootDir = process.cwd()) {
  const cfg = getRemoteCatalogConfig(catalogId);
  if (!cfg?.detailsRelPath) return null;
  const detailsPath = path.join(rootDir, cfg.detailsRelPath);
  if (_detailsBundleCache.has(detailsPath)) {
    return _detailsBundleCache.get(detailsPath);
  }
  if (!fs.existsSync(detailsPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
    const map = parsed?.details && typeof parsed.details === 'object' ? parsed.details : null;
    if (map) _detailsBundleCache.set(detailsPath, map);
    return map;
  } catch {
    return null;
  }
}

export function clearRemoteCatalogMemCache() {
  _catalogMemCache.clear();
  _detailsBundleCache.clear();
}

export function searchRemoteCatalog(
  items = [],
  { q = '', category = 'all', collection = 'all', blockCategory = 'all', subCategory = 'all', blocksFirst = false, page = 1, limit = 24 } = {}
) {
  const cleanQ = String(q || '').trim().toLowerCase();
  const cleanCat = String(category || 'all').trim().toLowerCase();
  const cleanCol = String(collection || 'all').trim().toLowerCase();
  const cleanBlockCat = String(blockCategory || 'all').trim().toLowerCase();
  const cleanSubCat = String(subCategory || 'all').trim().toLowerCase();
  const preferBlocks = Boolean(blocksFirst);
  const safeLimit = Math.max(1, Math.min(60, Number(limit) || 24));
  const safePage = Math.max(1, Number(page) || 1);
  const tokens = cleanQ.split(/\s+/).filter((t) => t.length >= 2);

  let scored;
  if (!tokens.length) {
    scored = items.map((item) => ({ item, score: 1 }));
  } else {
    scored = [];
    for (const item of items) {
      const nameLower = String(item.name || '').toLowerCase();
      const slugLower = String(item.slug || '').toLowerCase();
      const colLower = String(item.collection || '').toLowerCase();
      const wfColLower = String(item.wfCollection || '').toLowerCase();
      const blkLower = String(item.blockCategory || '').toLowerCase();
      const descLower = String(item.description || '').toLowerCase();
      const catLower = String(item.category || '').toLowerCase();
      const hay = `${nameLower} ${slugLower} ${colLower} ${wfColLower} ${blkLower} ${descLower} ${catLower}`;

      let matchedAll = true;
      let score = 0;
      for (const tok of tokens) {
        if (!hay.includes(tok)) {
          matchedAll = false;
          break;
        }
        if (slugLower === tok || nameLower === tok) score += 24;
        else if (slugLower.startsWith(tok) || nameLower.startsWith(tok)) score += 14;
        else if (blkLower === tok || wfColLower === tok) score += 12;
        else if (nameLower.includes(tok) || slugLower.includes(tok)) score += 9;
        else if (colLower.includes(tok) || catLower === tok) score += 5;
        else score += 2;
      }
      if (matchedAll) {
        if (item.collection === 'Core Primitive') score += 3;
        if (preferBlocks && (wfColLower === 'blocks' || colLower === 'blocks' || colLower === 'layout block')) {
          score += 18;
        }
        scored.push({ item, score });
      }
    }
    scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  }

  let matchedForCounts = scored.map((s) => s.item);
  if (preferBlocks) {
    matchedForCounts = prioritizeBlocksFirst(matchedForCounts);
  }

  const hasWfCollections = items.some((it) => Boolean(it?.wfCollection));
  const { collectionCounts, blockCategoryCounts } = hasWfCollections
    ? computeWatermelonCounts(matchedForCounts)
    : { collectionCounts: null, blockCategoryCounts: null };

  let scoped = matchedForCounts;
  if (cleanCol && cleanCol !== 'all') {
    scoped = scoped.filter(
      (item) =>
        String(item.wfCollection || '').toLowerCase() === cleanCol ||
        String(item.collection || '').toLowerCase() === cleanCol
    );
  }

  const categoryCounts = computeCategoryCounts(scoped);
  const subCategoryCounts = { all: scoped.length };
  for (const it of scoped) {
    const sc = String(it.subCategory || it.blockCategory || '').trim().toLowerCase();
    if (sc) subCategoryCounts[sc] = (subCategoryCounts[sc] || 0) + 1;
  }

  let filtered = scoped;
  if (cleanSubCat && cleanSubCat !== 'all') {
    filtered = filtered.filter(
      (item) =>
        String(item.subCategory || '').toLowerCase() === cleanSubCat ||
        String(item.blockCategory || '').toLowerCase() === cleanSubCat
    );
  } else if (cleanBlockCat && cleanBlockCat !== 'all') {
    filtered = filtered.filter((item) => String(item.blockCategory || '').toLowerCase() === cleanBlockCat);
  } else if (cleanCat && cleanCat !== 'all') {
    filtered = filtered.filter((item) => item.category === cleanCat);
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const clampedPage = Math.min(safePage, totalPages);
  const start = (clampedPage - 1) * safeLimit;
  const pageItems = filtered.slice(start, start + safeLimit);

  return {
    items: pageItems,
    total,
    catalogTotal: items.length,
    page: clampedPage,
    limit: safeLimit,
    totalPages,
    categoryCounts,
    subCategoryCounts,
    ...(collectionCounts ? { collectionCounts, blockCategoryCounts } : {}),
  };
}

async function fetchRawGitHubText(rawBase, relPath) {
  if (!relPath) return '';
  const url = `${rawBase}/${relPath.replace(/^\/+/, '')}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'WebForge-Studio/2.0' },
    signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined,
  }).catch(() => null);
  if (!res || !res.ok) return '';
  return res.text();
}

async function fetchRegistryItemJson(registryUrl) {
  if (!registryUrl) return null;
  const res = await fetch(registryUrl, {
    headers: { 'User-Agent': 'WebForge-Studio/2.0', Accept: 'application/json' },
    signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined,
  }).catch(() => null);
  if (!res || !res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchRemoteComponentDetail(catalogId, item, cacheDir, rootDir = process.cwd()) {
  const cfg = getRemoteCatalogConfig(catalogId);
  if (!cfg || !item) throw new Error('Catalog component not found');

  // Consolidated offline details bundle (Watermelon UI synced from official GitHub repo)
  if (cfg.detailsRelPath) {
    const bundle = loadCatalogDetailsBundle(catalogId, rootDir);
    const bundled = bundle?.[item.id];
    if (bundled && (bundled.code || bundled.demoCode)) {
      return {
        ...item,
        ...bundled,
        cacheVersion: CATALOG_CACHE_VERSION,
        renderedHtml: '',
        fromCache: true,
      };
    }
  }

  // Legacy curated Watermelon Resources & local Templates resolve immediately without upstream HTTP traffic
  if (catalogId === 'watermelon-ui' && item.wfCollection === 'resources') {
    const prompt = String(item.skillPrompt || item.description || '').trim();
    return {
      ...item,
      code: prompt,
      jsxCode: prompt,
      demoCode: '',
      auxiliaryFiles: [],
      renderedHtml: '',
      prompt,
      fromCache: true,
    };
  }
  if (catalogId === 'watermelon-ui' && !item.registryUrl && item.previewRuntime !== 'watermelon-vite' && (item.wfCollection === 'templates' || item.wfCollection === 'dashboards')) {
    const vfs = buildWatermelonStarterVfs(item);
    const appCode = vfs['src/App.jsx'] || '';
    return {
      ...item,
      code: appCode,
      jsxCode: appCode,
      demoCode: '',
      auxiliaryFiles: [{ path: 'src/index.css', code: vfs['src/index.css'] || '' }],
      renderedHtml: '',
      prompt: `# ${item.name} (Watermelon UI — ${item.collection})\n\nUse this complete multi-section React + Tailwind starter:\n\`\`\`tsx\n${appCode.slice(0, 6000)}\n\`\`\``,
      fromCache: true,
    };
  }

  const safeKey = String(item.id || item.slug).replace(/[^a-zA-Z0-9_-]/g, '__');
  const cacheFile = cacheDir ? path.join(cacheDir, `${safeKey}.json`) : '';

  if (cacheFile && fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (cached && cached.cacheVersion === CATALOG_CACHE_VERSION && (cached.code || cached.renderedHtml)) {
        return { ...item, ...cached, fromCache: true };
      }
    } catch {
      // Corrupted cache — refetch cleanly
    }
  }

  // Deduplicate simultaneous in-flight upstream requests for the same component
  const inflightKey = `${catalogId}::${safeKey}`;
  if (_inFlightDetailFetches.has(inflightKey)) {
    return _inFlightDetailFetches.get(inflightKey);
  }

  const fetchPromise = (async () => {
  let payload;
  if (cfg.catalogType === 'html') {
    const [lightHtml, darkHtml] = await Promise.all([
      fetchRawGitHubText(cfg.rawBase, item.sourcePath),
      item.darkSourcePath ? fetchRawGitHubText(cfg.rawBase, item.darkSourcePath) : Promise.resolve(''),
    ]);
    const primaryHtml = (lightHtml || darkHtml || '').trim();
    if (!primaryHtml) {
      throw new Error(`Could not fetch HTML source for "${item.name}" from ${cfg.name}`);
    }
    const jsxCode = htmlSnapshotToReactComponent(item.name, primaryHtml, `${cfg.owner}/${cfg.repo}`);
    const prompt = [
      `# ${item.name} (${cfg.name} — ${item.collection})`,
      `Source: ${item.repoUrl}`,
      ``,
      `Implement this Tailwind CSS component with faithful typography, spacing, dark mode support, and responsive behavior:`,
      `\`\`\`html`,
      primaryHtml,
      `\`\`\``,
    ].join('\n');

    payload = {
      cacheVersion: CATALOG_CACHE_VERSION,
      renderedHtml: primaryHtml,
      darkRenderedHtml: darkHtml.trim(),
      htmlCode: primaryHtml,
      darkHtmlCode: darkHtml.trim(),
      jsxCode,
      code: jsxCode,
      prompt,
      fetchedAt: new Date().toISOString(),
    };
  } else if (cfg.sourceMode === 'shadcn-registry') {
    const regUrl = item.registryUrl || `${cfg.registryBase}/${encodeURIComponent(item.slug)}.json`;
    const regJson = await fetchRegistryItemJson(regUrl);
    const files = Array.isArray(regJson?.files) ? regJson.files.filter((f) => f && typeof f.content === 'string' && f.content.trim()) : [];
    const tsxFiles = files.filter((f) => /\.(tsx|jsx)$/i.test(String(f.path || '')));
    const slugLower = String(item.slug || '').toLowerCase();
    const pickPrimary = () => {
      if (tsxFiles.length <= 1) return tsxFiles[0] || files[0];
      const byPriority = [
        (f) => /(?:^|\/)(?:demo|page|app)\.(?:tsx|jsx)$/i.test(String(f.path || '')),
        (f) => /(?:^|\/)index\.(?:tsx|jsx)$/i.test(String(f.path || '')),
        (f) => /(?:^|\/).*dashboard.*\.(?:tsx|jsx)$/i.test(String(f.path || '')) && !/content|page/i.test(String(f.path || '')),
        (f) => slugLower && String(f.path || '').toLowerCase().includes(slugLower),
        (f) => /export\s+default\s+function/i.test(String(f.content || '')),
      ];
      for (const pred of byPriority) {
        const hit = tsxFiles.find(pred);
        if (hit) return hit;
      }
      return tsxFiles[0];
    };
    const primaryFile = pickPrimary();
    let primaryCode = String(primaryFile?.content || '').trim();
    if (!primaryCode && (item.wfCollection === 'dashboards' || item.wfCollection === 'templates')) {
      // Graceful offline/rate-limit fallback to curated Watermelon starter scaffold
      const vfs = buildWatermelonStarterVfs(item);
      primaryCode = vfs['src/App.jsx'] || '';
    }
    if (!primaryCode) {
      throw new Error(`Could not fetch registry source for "${item.name}" from ${cfg.name}`);
    }
    const auxiliaryFiles = files
      .filter((f) => f !== primaryFile)
      .slice(0, 24)
      .map((f) => ({ path: String(f.path || 'aux.tsx'), code: String(f.content || '').trim() }))
      .filter((entry) => entry.code);

    const prompt = [
      `# ${item.name} (${cfg.name} — ${item.collection || 'Interactive UI'})`,
      `CLI: npx shadcn@latest add ${regUrl}`,
      ``,
      `Integrate this ${cfg.name} React/Tailwind/Motion component cleanly into the WebForge project:`,
      `\`\`\`tsx`,
      primaryCode.slice(0, 6000),
      `\`\`\``,
    ].join('\n');

    payload = {
      cacheVersion: CATALOG_CACHE_VERSION,
      code: primaryCode,
      jsxCode: primaryCode,
      demoCode: '',
      auxiliaryFiles,
      dependencies: Array.isArray(regJson?.dependencies) ? regJson.dependencies : item.dependencies || [],
      renderedHtml: '',
      prompt,
      fetchedAt: new Date().toISOString(),
    };
  } else {
    const auxPaths = Array.isArray(item.auxiliaryPaths) ? item.auxiliaryPaths.slice(0, 6) : [];
    const [primaryCode, demoCode, ...auxContents] = await Promise.all([
      fetchRawGitHubText(cfg.rawBase, item.sourcePath),
      item.demoSourcePath ? fetchRawGitHubText(cfg.rawBase, item.demoSourcePath) : Promise.resolve(''),
      ...auxPaths.map((p) => fetchRawGitHubText(cfg.rawBase, p)),
    ]);

    if (!primaryCode.trim()) {
      throw new Error(`Could not fetch TSX source for "${item.name}" from ${cfg.name}`);
    }

    const auxiliaryFiles = auxPaths
      .map((p, idx) => ({ path: p, code: (auxContents[idx] || '').trim() }))
      .filter((entry) => entry.code);

    const prompt = [
      `# ${item.name} (${cfg.name} — ${item.collection})`,
      `Source: ${item.repoUrl}`,
      ``,
      `Integrate this ${cfg.name} React/Tailwind component cleanly into the WebForge project:`,
      `\`\`\`tsx`,
      (demoCode.trim() || primaryCode.trim()).slice(0, 6000),
      `\`\`\``,
    ].join('\n');

    payload = {
      cacheVersion: CATALOG_CACHE_VERSION,
      code: primaryCode.trim(),
      jsxCode: primaryCode.trim(),
      demoCode: demoCode.trim(),
      auxiliaryFiles,
      renderedHtml: '',
      prompt,
      fetchedAt: new Date().toISOString(),
    };
  }

  if (cacheFile) {
    try {
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(payload), 'utf8');
    } catch {
      // Ignore cache write errors
    }
  }

  return { ...item, ...payload, fromCache: false };
  })();

  _inFlightDetailFetches.set(inflightKey, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    _inFlightDetailFetches.delete(inflightKey);
  }
}
