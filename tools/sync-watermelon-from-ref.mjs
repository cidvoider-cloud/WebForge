/**
 * WebForge Studio — Watermelon UI Official GitHub Reference Sync
 *
 * Extracts all 5 official ui.watermelon.sh collections from the cloned
 * WatermelonCorp/watermelon-platform repository (/tmp/watermelon-ref):
 *   1. Animated Components (src/data/contents/animated-components/<slug> + registry/*.mdx)
 *   2. Core Components     (src/data/contents/components/<cat>)
 *   3. Blocks              (src/data/contents/blocks/<cat>/<slug>)
 *   4. Dashboards          (src/data/contents/dashboards/<slug>)
 *   5. Templates           (src/data/contents/templates/<slug>)
 *
 * Outputs:
 *   - data/watermelon-ui-index.json (complete searchable index with exact previewParams)
 *   - data/catalog-cache/watermelon-ui/<safeId>.json (full real source, demo & aux files)
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const refRoot = process.argv[2] || '/tmp/watermelon-ref';

function sha12(str) {
  return crypto.createHash('sha256').update(String(str || '')).digest('hex').slice(0, 12);
}

function safeCacheFilename(id) {
  return String(id || '').replace(/[^a-zA-Z0-9._-]+/g, '__') + '.json';
}

function parseSimpleFrontmatter(mdxText = '') {
  const m = String(mdxText || '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const lines = m[1].split(/\r?\n/);
  const out = {};
  let currentKey = null;
  let multilineMode = false;
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      if (multilineMode) continue;
      continue;
    }
    if (line.trim().startsWith('#') && !multilineMode) continue;
    if (multilineMode && /^\s+/.test(rawLine) && currentKey) {
      out[currentKey] = out[currentKey]
        ? `${out[currentKey]} ${line.trim()}`
        : line.trim();
      continue;
    }
    multilineMode = false;
    const arrMatch = line.match(/^\s+-\s+(.*)$/);
    if (arrMatch && currentKey) {
      if (!Array.isArray(out[currentKey])) out[currentKey] = [];
      out[currentKey].push(arrMatch[1].trim().replace(/^['"]|['"]$/g, ''));
      continue;
    }
    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    currentKey = kv[1];
    let val = kv[2].trim();
    if (val === '>' || val === '>-' || val === '|' || val === '|-') {
      out[currentKey] = '';
      multilineMode = true;
      continue;
    }
    if (!val) {
      out[currentKey] = [];
      continue;
    }
    if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim();
      out[currentKey] = inner
        ? inner.split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
        : [];
      continue;
    }
    val = val.replace(/^['"]|['"]$/g, '');
    if (val === 'true') out[currentKey] = true;
    else if (val === 'false') out[currentKey] = false;
    else if (/^\d+$/.test(val)) out[currentKey] = Number(val);
    else out[currentKey] = val;
  }
  return out;
}

function extractDepsFromCode(code = '') {
  const deps = new Set();
  const re = /(?:from|import)\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(String(code || ''))) !== null) {
    const spec = m[1];
    if (!spec || spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('@/')) continue;
    const base = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    if (base && base !== 'react' && base !== 'react-dom') deps.add(base);
  }
  return Array.from(deps);
}

function mapToWebForgeCategory(collection, subCat = '', slug = '') {
  const s = `${subCat} ${slug}`.toLowerCase();
  if (collection === 'dashboards') return 'cards';
  if (collection === 'templates') return 'hero';
  if (/\bhero\b/.test(s)) return 'hero';
  if (/\b(nav|navigation|navbar|header|breadcrumb|menubar|announcement)\b/.test(s)) return 'navbar';
  if (/\b(footer)\b/.test(s)) return 'footer';
  if (/\b(button|toggle|action|choice-chips)\b/.test(s)) return 'buttons';
  if (/\b(form|input|select|checkbox|radio|switch|textarea|combobox|slider|date-picker|calendar|otp|mask|auth|contact|newsletter|file-upload)\b/.test(s)) return 'forms';
  if (/\b(tab|pagination|filter)\b/.test(s)) return 'tabs';
  if (/\b(modal|dialog|sheet|drawer|popover|dropdown|tooltip|disclosure)\b/.test(s)) return 'modals';
  if (/\b(alert|sonner|toast|notification|badge)\b/.test(s)) return 'alerts';
  if (/\b(accordion|accordian|collapsible|faq)\b/.test(s)) return 'accordion';
  if (/\b(cta)\b/.test(s)) return 'cta';
  if (/\b(feature|bento|integration|stats|team|career|blog|testimonial)\b/.test(s)) return 'features';
  return 'cards';
}

function collectRecursiveFiles(dir, baseDir = dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      out.push(...collectRecursiveFiles(full, baseDir));
    } else if (/\.(tsx|ts|css)$/.test(entry.name)) {
      const rel = path.relative(baseDir, full).replace(/\\/g, '/');
      out.push({ path: rel, code: fs.readFileSync(full, 'utf8') });
    }
  }
  return out;
}

function titleFromSlug(slug = '') {
  return String(slug || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function parseComponentIndexVariants(indexPath) {
  const src = fs.readFileSync(indexPath, 'utf8');
  // Map imported symbols like `import Accordion1 from "./variant-1"`
  const compToFile = {};
  const impRe = /import\s+([A-Za-z0-9_$]+)\s+from\s+['"]\.\/(variant-\d+)['"]/g;
  let m;
  while ((m = impRe.exec(src)) !== null) {
    compToFile[m[1]] = m[2];
  }
  // Linear O(n) brace scanner over the `variants` array so there is zero regex backtracking
  const variants = [];
  const startIdx = src.indexOf('variants');
  const arrStart = startIdx === -1 ? 0 : src.indexOf('[', startIdx);
  if (arrStart === -1) return variants;
  let depth = 0;
  let objStart = -1;
  let inStr = null;
  for (let i = arrStart; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        const block = src.slice(objStart, i + 1);
        objStart = -1;
        const id = (block.match(/\bid\s*:\s*['"]([^'"]+)['"]/) || [])[1];
        if (!id) continue;
        const title = (block.match(/\btitle\s*:\s*['"]([^'"]+)['"]/) || [])[1] || titleFromSlug(id);
        const descMatch = block.match(/\bdescription\s*:\s*(['"`])((?:\\.|(?!\1)[\s\S])*)\1/);
        const description = descMatch ? descMatch[2].replace(/\s+/g, ' ').trim() : '';
        const compSym = (block.match(/\bcomponent\s*:\s*([A-Za-z0-9_$]+)/) || [])[1] || '';
        const cli = (block.match(/\bcli\s*:\s*['"]([^'"]+)['"]/) || [])[1] || '';
        const fileStem = compToFile[compSym] || (() => {
          const n = id.match(/(\d+)$/);
          return n ? `variant-${Number(n[1])}` : '';
        })();
        if (fileStem) {
          variants.push({ id, title, description, cli, fileStem });
        }
      }
    }
  }
  return variants;
}

function syncWatermelonFromRef() {
  const contentsDir = path.join(refRoot, 'src/data/contents');
  if (!fs.existsSync(contentsDir)) {
    throw new Error(`Watermelon reference repo not found at ${refRoot}`);
  }

  const refPkg = JSON.parse(fs.readFileSync(path.join(refRoot, 'package.json'), 'utf8'));
  // Remove legacy per-item cache directory to keep workspace file count lean
  const legacyCacheDir = path.join(appRoot, 'data/catalog-cache/watermelon-ui');
  fs.rmSync(legacyCacheDir, { recursive: true, force: true });

  const items = [];
  const detailsById = {};
  const collectionCounts = { animated: 0, components: 0, blocks: 0, dashboards: 0, templates: 0 };

  function pushItem(item, detailPayload) {
    items.push(item);
    collectionCounts[item.wfCollection] = (collectionCounts[item.wfCollection] || 0) + 1;
    const primaryCode = String(detailPayload.code || detailPayload.demoCode || '').trim();
    const demoCode = String(detailPayload.demoCode || '').trim();
    const cliCmd = item.cli || `npx shadcn@latest add https://ui.watermelon.sh/r/${encodeURIComponent(item.slug)}.json`;
    const prompt = [
      `# ${item.name} (Watermelon UI — ${item.collection})`,
      `Source: ${item.repoUrl}`,
      `CLI: ${cliCmd}`,
      item.dependencies?.length ? `Dependencies: ${item.dependencies.join(', ')}` : '',
      ``,
      `Integrate this real Watermelon UI React + Tailwind + Motion component cleanly:`,
      `\`\`\`tsx`,
      primaryCode.slice(0, 8000),
      `\`\`\``,
    ].filter(Boolean).join('\n');

    detailsById[item.id] = {
      code: primaryCode,
      jsxCode: primaryCode,
      demoCode,
      auxiliaryFiles: Array.isArray(detailPayload.auxiliaryFiles) ? detailPayload.auxiliaryFiles : [],
      dependencies: item.dependencies || [],
      prompt,
      fetchedAt: new Date().toISOString(),
    };
  }

  // 1. ANIMATED COMPONENTS
  const registryMdxDir = path.join(contentsDir, 'registry');
  const animDir = path.join(contentsDir, 'animated-components');
  const mdxBySlug = new Map();
  if (fs.existsSync(registryMdxDir)) {
    for (const f of fs.readdirSync(registryMdxDir)) {
      if (!f.endsWith('.mdx')) continue;
      const fm = parseSimpleFrontmatter(fs.readFileSync(path.join(registryMdxDir, f), 'utf8'));
      const slug = fm.slug || f.replace(/\.mdx$/i, '');
      mdxBySlug.set(slug, fm);
    }
  }
  for (const slug of fs.readdirSync(animDir).sort()) {
    const dir = path.join(animDir, slug);
    if (!fs.statSync(dir).isDirectory()) continue;
    const demoPath = ['demo-original.tsx', 'demo.tsx', 'demo-base.tsx']
      .map((f) => path.join(dir, f))
      .find((p) => fs.existsSync(p));
    const codePath = ['original.tsx', 'index.tsx', 'base.tsx']
      .map((f) => path.join(dir, f))
      .find((p) => fs.existsSync(p));
    if (!demoPath) continue;
    const demoCode = fs.readFileSync(demoPath, 'utf8');
    const code = codePath ? fs.readFileSync(codePath, 'utf8') : demoCode;
    const fm = mdxBySlug.get(slug) || {};
    const subCategory = String(fm.category || 'micro-interaction').toLowerCase();
    const deps = Array.from(new Set([
      ...(Array.isArray(fm.dependencies) ? fm.dependencies : []),
      ...extractDepsFromCode(code),
      ...extractDepsFromCode(demoCode),
    ]));
    const id = `watermelon/animated/${slug}`;
    const previewUrl = `/vendor/watermelon-runtime/wf-preview.html?c=animated&s=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}`;
    pushItem(
      {
        id,
        catalogId: 'watermelon-ui',
        slug,
        name: fm.title || titleFromSlug(slug),
        wfCollection: 'animated',
        collection: 'Animated',
        subCategory,
        blockCategory: '',
        category: mapToWebForgeCategory('animated', subCategory, slug),
        description: fm.description || `Interactive Watermelon UI animated ${titleFromSlug(slug)} component.`,
        dependencies: deps,
        featured: Boolean(fm.featured),
        featuredOrder: Number(fm.featuredOrder || 999),
        authorName: 'Watermelon UI',
        catalogType: 'tsx',
        previewRuntime: 'watermelon-vite',
        previewUrl,
        previewParams: { c: 'animated', s: slug, cat: '' },
        repoUrl: `https://ui.watermelon.sh/animated-components/${slug}`,
        contentHash: sha12(code + demoCode),
      },
      { code, demoCode, auxiliaryFiles: [] }
    );
  }

  // 2. CORE COMPONENTS (30 categories, ~516 variants)
  const compRoot = path.join(contentsDir, 'components');
  for (const cat of fs.readdirSync(compRoot).sort()) {
    const dir = path.join(compRoot, cat);
    if (!fs.statSync(dir).isDirectory()) continue;
    const indexPath = path.join(dir, 'index.ts');
    const variants = fs.existsSync(indexPath) ? parseComponentIndexVariants(indexPath) : [];
    const seenStems = new Set();
    for (const v of variants) {
      const filePath = path.join(dir, `${v.fileStem}.tsx`);
      if (!fs.existsSync(filePath)) continue;
      seenStems.add(v.fileStem);
      const code = fs.readFileSync(filePath, 'utf8');
      const deps = extractDepsFromCode(code);
      const id = `watermelon/components/${cat}/${v.id}`;
      const previewUrl = `/vendor/watermelon-runtime/wf-preview.html?c=components&cat=${encodeURIComponent(cat)}&s=${encodeURIComponent(v.fileStem)}&id=${encodeURIComponent(id)}`;
      pushItem(
        {
          id,
          catalogId: 'watermelon-ui',
          slug: v.id,
          name: v.title || titleFromSlug(v.id),
          wfCollection: 'components',
          collection: 'Components',
          subCategory: cat,
          blockCategory: '',
          category: mapToWebForgeCategory('components', cat, v.id),
          description: v.description || `Watermelon UI ${titleFromSlug(cat)} component variant.`,
          dependencies: deps,
          cli: v.cli || '',
          authorName: 'Watermelon UI',
          catalogType: 'tsx',
          previewRuntime: 'watermelon-vite',
          previewUrl,
          previewParams: { c: 'components', s: v.fileStem, cat },
          repoUrl: `https://ui.watermelon.sh/components/${cat}`,
          contentHash: sha12(code),
        },
        { code, demoCode: code, auxiliaryFiles: [] }
      );
    }
    // Include any variant-*.tsx not matched in index.ts
    for (const f of fs.readdirSync(dir).filter((x) => /^variant-\d+\.tsx$/.test(x)).sort()) {
      const stem = f.replace(/\.tsx$/, '');
      if (seenStems.has(stem)) continue;
      const num = stem.replace('variant-', '');
      const code = fs.readFileSync(path.join(dir, f), 'utf8');
      const slug = `${cat}-${num.padStart(2, '0')}`;
      const id = `watermelon/components/${cat}/${slug}`;
      const previewUrl = `/vendor/watermelon-runtime/wf-preview.html?c=components&cat=${encodeURIComponent(cat)}&s=${encodeURIComponent(stem)}&id=${encodeURIComponent(id)}`;
      pushItem(
        {
          id,
          catalogId: 'watermelon-ui',
          slug,
          name: `${titleFromSlug(cat)} ${num}`,
          wfCollection: 'components',
          collection: 'Components',
          subCategory: cat,
          blockCategory: '',
          category: mapToWebForgeCategory('components', cat, slug),
          description: `Watermelon UI ${titleFromSlug(cat)} variant ${num}.`,
          dependencies: extractDepsFromCode(code),
          authorName: 'Watermelon UI',
          catalogType: 'tsx',
          previewRuntime: 'watermelon-vite',
          previewUrl,
          previewParams: { c: 'components', s: stem, cat },
          repoUrl: `https://ui.watermelon.sh/components/${cat}`,
          contentHash: sha12(code),
        },
        { code, demoCode: code, auxiliaryFiles: [] }
      );
    }
  }

  // 3. BLOCKS (22 categories, ~189 blocks)
  const blocksRoot = path.join(contentsDir, 'blocks');
  for (const cat of fs.readdirSync(blocksRoot).sort()) {
    const catDir = path.join(blocksRoot, cat);
    if (!fs.statSync(catDir).isDirectory()) continue;
    for (const slug of fs.readdirSync(catDir).sort()) {
      const bDir = path.join(catDir, slug);
      if (!fs.statSync(bDir).isDirectory()) continue;
      const demoPath = path.join(bDir, 'demo.tsx');
      if (!fs.existsSync(demoPath)) continue;
      const mdxFile = fs.readdirSync(bDir).find((f) => f.endsWith('.mdx'));
      const fm = mdxFile ? parseSimpleFrontmatter(fs.readFileSync(path.join(bDir, mdxFile), 'utf8')) : {};
      const allFiles = collectRecursiveFiles(bDir);
      const demoCode = fs.readFileSync(demoPath, 'utf8');
      const primary = allFiles.find((f) => f.path !== 'demo.tsx' && f.path.endsWith('.tsx')) || { code: demoCode };
      const auxFiles = allFiles.filter((f) => f.path !== 'demo.tsx');
      const deps = Array.from(new Set([
        ...(Array.isArray(fm.dependencies) ? fm.dependencies : []),
        ...allFiles.flatMap((f) => extractDepsFromCode(f.code)),
      ]));
      const id = `watermelon/blocks/${cat}/${slug}`;
      const previewUrl = `/vendor/watermelon-runtime/wf-preview.html?c=blocks&cat=${encodeURIComponent(cat)}&s=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}`;
      pushItem(
        {
          id,
          catalogId: 'watermelon-ui',
          slug,
          name: fm.title || titleFromSlug(slug),
          wfCollection: 'blocks',
          collection: 'Blocks',
          subCategory: cat,
          blockCategory: cat,
          category: mapToWebForgeCategory('blocks', cat, slug),
          description: fm.description || `Responsive Watermelon UI ${titleFromSlug(cat)} page block.`,
          dependencies: deps,
          featured: Boolean(fm.featured),
          authorName: 'Watermelon UI',
          catalogType: 'tsx',
          previewRuntime: 'watermelon-vite',
          previewUrl,
          previewParams: { c: 'blocks', s: slug, cat },
          repoUrl: `https://ui.watermelon.sh/blocks/${cat}`,
          contentHash: sha12(allFiles.map((f) => f.code).join('\n')),
        },
        { code: primary.code, demoCode, auxiliaryFiles: auxFiles }
      );
    }
  }

  // 4. DASHBOARDS (12 full interactive dashboards)
  const dashRoot = path.join(contentsDir, 'dashboards');
  for (const slug of fs.readdirSync(dashRoot).sort()) {
    const dDir = path.join(dashRoot, slug);
    if (!fs.statSync(dDir).isDirectory()) continue;
    const demoPath = path.join(dDir, 'demo.tsx');
    if (!fs.existsSync(demoPath)) continue;
    const mdxFile = fs.readdirSync(dDir).find((f) => f.endsWith('.mdx'));
    const fm = mdxFile ? parseSimpleFrontmatter(fs.readFileSync(path.join(dDir, mdxFile), 'utf8')) : {};
    const allFiles = collectRecursiveFiles(dDir);
    const demoCode = fs.readFileSync(demoPath, 'utf8');
    const primary = allFiles.find((f) => f.path === 'dashboard-layout.tsx') || allFiles.find((f) => f.path !== 'demo.tsx' && f.path.endsWith('.tsx')) || { code: demoCode };
    const auxFiles = allFiles.filter((f) => f.path !== 'demo.tsx');
    const deps = Array.from(new Set([
      ...(Array.isArray(fm.dependencies) ? fm.dependencies : []),
      ...allFiles.flatMap((f) => extractDepsFromCode(f.code)),
    ]));
    const id = `watermelon/dashboards/${slug}`;
    const previewUrl = `/vendor/watermelon-runtime/wf-preview.html?c=dashboards&s=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}`;
    pushItem(
      {
        id,
        catalogId: 'watermelon-ui',
        slug,
        name: fm.title || titleFromSlug(slug),
        wfCollection: 'dashboards',
        collection: 'Dashboards',
        subCategory: 'dashboard',
        blockCategory: '',
        category: 'cards',
        description: fm.description || `Complete multi-panel ${titleFromSlug(slug)} layout from Watermelon UI.`,
        dependencies: deps,
        featured: Boolean(fm.featured),
        authorName: 'Watermelon UI',
        catalogType: 'tsx',
        previewRuntime: 'watermelon-vite',
        previewUrl,
        previewParams: { c: 'dashboards', s: slug, cat: '' },
        repoUrl: `https://ui.watermelon.sh/dashboards/${slug}`,
        contentHash: sha12(allFiles.map((f) => f.code).join('\n')),
      },
      { code: primary.code, demoCode, auxiliaryFiles: auxFiles }
    );
  }

  // 5. TEMPLATES (complete multi-section website templates)
  const tmplRoot = path.join(contentsDir, 'templates');
  for (const slug of fs.readdirSync(tmplRoot).sort()) {
    const tDir = path.join(tmplRoot, slug);
    if (!fs.statSync(tDir).isDirectory()) continue;
    const demoPath = path.join(tDir, 'demo.tsx');
    if (!fs.existsSync(demoPath)) continue;
    const mdxFile = fs.readdirSync(tDir).find((f) => f.endsWith('.mdx'));
    const fm = mdxFile ? parseSimpleFrontmatter(fs.readFileSync(path.join(tDir, mdxFile), 'utf8')) : {};
    const allFiles = collectRecursiveFiles(tDir);
    const demoCode = fs.readFileSync(demoPath, 'utf8');
    const primary = allFiles.find((f) => f.path !== 'demo.tsx' && f.path.endsWith('.tsx')) || { code: demoCode };
    const auxFiles = allFiles.filter((f) => f.path !== 'demo.tsx');
    const deps = Array.from(new Set([
      ...(Array.isArray(fm.dependencies) ? fm.dependencies : []),
      ...allFiles.flatMap((f) => extractDepsFromCode(f.code)),
    ]));
    const id = `watermelon/templates/${slug}`;
    const previewUrl = `/vendor/watermelon-runtime/wf-preview.html?c=templates&s=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}`;
    pushItem(
      {
        id,
        catalogId: 'watermelon-ui',
        slug,
        name: fm.title || titleFromSlug(slug),
        wfCollection: 'templates',
        collection: 'Templates',
        subCategory: 'template',
        blockCategory: '',
        category: 'hero',
        description: fm.description || `Complete full-page ${titleFromSlug(slug)} template from Watermelon UI.`,
        dependencies: deps,
        featured: Boolean(fm.featured),
        authorName: 'Watermelon UI',
        catalogType: 'tsx',
        previewRuntime: 'watermelon-vite',
        previewUrl,
        previewParams: { c: 'templates', s: slug, cat: '' },
        repoUrl: `https://ui.watermelon.sh/templates/${slug}`,
        contentHash: sha12(allFiles.map((f) => f.code).join('\n')),
      },
      { code: primary.code, demoCode, auxiliaryFiles: auxFiles }
    );
  }

  // Sort: featured animated first, then clean alphabetical within collection
  const order = { animated: 0, components: 1, blocks: 2, dashboards: 3, templates: 4 };
  items.sort((a, b) => {
    const oa = order[a.wfCollection] ?? 9;
    const ob = order[b.wfCollection] ?? 9;
    if (oa !== ob) return oa - ob;
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    if (a.featured && b.featured && a.featuredOrder !== b.featuredOrder) {
      return (a.featuredOrder || 999) - (b.featuredOrder || 999);
    }
    return a.name.localeCompare(b.name);
  });

  const indexOut = {
    catalogId: 'watermelon-ui',
    name: 'Watermelon UI',
    homepage: 'https://ui.watermelon.sh',
    sourceRepo: 'WatermelonCorp/watermelon-platform',
    generatedAt: new Date().toISOString(),
    runtimePackages: refPkg.dependencies || {},
    collectionCounts,
    total: items.length,
    items,
  };

  fs.writeFileSync(
    path.join(appRoot, 'data/watermelon-ui-index.json'),
    JSON.stringify(indexOut, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.join(appRoot, 'data/watermelon-ui-details.json'),
    JSON.stringify({
      catalogId: 'watermelon-ui',
      generatedAt: indexOut.generatedAt,
      total: Object.keys(detailsById).length,
      details: detailsById,
    }),
    'utf8'
  );
  console.log(`Synced ${items.length} real Watermelon UI items -> data/watermelon-ui-index.json + data/watermelon-ui-details.json`, collectionCounts);
}

syncWatermelonFromRef();
