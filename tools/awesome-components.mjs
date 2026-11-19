/**
 * WebForge Studio — Awesome Components (wundercorp/awesome-components) Catalog Engine
 *
 * Indexes all 6,591+ components from `wundercorp/awesome-components`, provides
 * sub-10ms search & category filtering, on-demand prompt/HTML fetching with
 * disk caching, and clean HTML-snapshot-to-React-JSX conversion for instant
 * one-click insertion into WebForge projects.
 */
import fs from 'fs';
import path from 'path';

export const AWESOME_REPO_RAW_BASE = 'https://raw.githubusercontent.com/wundercorp/awesome-components/main';
export const AWESOME_INDEX_REL_PATH = 'data/awesome-components-index.json';
export const AWESOME_CACHE_REL_DIR = 'data/awesome-cache';
export const AWESOME_CACHE_VERSION = 8;

export function classifyAwesomeCategory(slug = '', name = '') {
  const hay = `${slug} ${name}`.toLowerCase();
  if (/pricing|price|plan|tier|billing|subscription/.test(hay)) return 'pricing';
  if (/navbar|nav-bar|header|topbar|sidebar|dock|navigation|breadcrumb|menubar|command-menu|command-palette/.test(hay)) return 'navbar';
  if (/hero|landing|marquee|spotlight|globe|shader|aurora|beams|particles|background|vortex|lamp|meteor|sparkles|waves/.test(hay)) return 'hero';
  if (/button|btn|cta|toggle|switch|checkbox|radio|slider|badge-button/.test(hay)) return 'buttons';
  if (/modal|dialog|drawer|popover|sheet|lightbox|dropdown|tooltip|context-menu/.test(hay)) return 'modals';
  if (/login|signin|sign-in|signup|sign-up|auth|form|input|textarea|select|otp|search|upload|date-picker|calendar|combobox|password|checkout|contact/.test(hay)) return 'forms';
  if (/table|chart|graph|metric|kpi|stat|analytics|dashboard|kanban|timeline|calendar|heatmap|sparkline|progress|counter|ticker/.test(hay)) return 'tables';
  if (/(?:^|[^a-z])tabs?(?:[^a-z]|$)|stepper|segmented|carousel|slider|pagination/.test(hay)) return 'tabs';
  if (/alert|toast|banner|notification|announcement|status|cookie|empty-state|badge|pill|chip/.test(hay)) return 'alerts';
  if (/accordion|faq|collapse|disclosure|expandable|tree/.test(hay)) return 'accordion';
  if (/footer|site-footer/.test(hay)) return 'footer';
  return 'cards';
}

export function expandCompactRecord(row) {
  if (!Array.isArray(row) || row.length < 7) return null;
  const [bucket, author, authorName, component, componentName, variant, variantName, category] = row;
  const id = `${bucket}/${author}/${component}/${variant}`;
  const basePath = `components/${bucket}/${author}/${component}/${variant}`;
  const displayName = variant && variant !== 'default' && variantName
    ? `${componentName} · ${variantName}`
    : componentName;

  return {
    id,
    bucket,
    author,
    authorName: authorName || author,
    component,
    componentName: componentName || component,
    variant,
    variantName: variantName || variant,
    name: displayName || component,
    category: category || classifyAwesomeCategory(component, componentName),
    promptPath: `${basePath}/prompt.md`,
    htmlPath: `${basePath}/rendered.html`,
    screenshotPath: `${basePath}/screenshot.png`,
    screenshotUrl: `${AWESOME_REPO_RAW_BASE}/${basePath}/screenshot.png`,
    repoUrl: `https://github.com/wundercorp/awesome-components/tree/main/${basePath}`,
  };
}

let _cachedIndex = null;
let _cachedIndexPath = '';

export function loadAwesomeCatalog(indexFilePath) {
  if (_cachedIndex && _cachedIndexPath === indexFilePath) {
    return _cachedIndex;
  }
  if (!fs.existsSync(indexFilePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(indexFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
    const expanded = rows.map(expandCompactRecord).filter(Boolean);
    _cachedIndex = expanded;
    _cachedIndexPath = indexFilePath;
    return expanded;
  } catch {
    return [];
  }
}

export function computeCategoryCounts(items = []) {
  const counts = { all: items.length };
  for (const item of items) {
    counts[item.category] = (counts[item.category] || 0) + 1;
  }
  return counts;
}

export function searchAwesomeCatalog(items = [], { q = '', category = 'all', page = 1, limit = 24 } = {}) {
  const cleanQ = String(q || '').trim().toLowerCase();
  const cleanCat = String(category || 'all').trim().toLowerCase();
  const safeLimit = Math.max(1, Math.min(60, Number(limit) || 24));
  const safePage = Math.max(1, Number(page) || 1);

  const tokens = cleanQ.split(/\s+/).filter((t) => t.length >= 2);

  let scored;
  if (!tokens.length) {
    scored = items.map((item) => ({ item, score: 1 }));
  } else {
    scored = [];
    for (const item of items) {
      const nameLower = item.name.toLowerCase();
      const slugLower = item.component.toLowerCase();
      const authorLower = item.authorName.toLowerCase();
      const catLower = item.category.toLowerCase();
      const fullHay = `${nameLower} ${slugLower} ${authorLower} ${catLower}`;

      let matchedAll = true;
      let score = 0;
      for (const tok of tokens) {
        if (!fullHay.includes(tok)) {
          matchedAll = false;
          break;
        }
        if (slugLower === tok || nameLower === tok) score += 20;
        else if (slugLower.startsWith(tok) || nameLower.startsWith(tok)) score += 12;
        else if (nameLower.includes(tok) || slugLower.includes(tok)) score += 8;
        else if (catLower === tok) score += 5;
        else score += 2;
      }
      if (matchedAll) {
        if (item.variant === 'default') score += 1;
        scored.push({ item, score });
      }
    }
    scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  }

  const matchedForCounts = scored.map((s) => s.item);
  const categoryCounts = computeCategoryCounts(matchedForCounts);

  const filtered = cleanCat && cleanCat !== 'all'
    ? matchedForCounts.filter((item) => item.category === cleanCat)
    : matchedForCounts;

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
  };
}

function cssStyleStringToJsxObject(styleStr) {
  const entries = [];
  const decls = String(styleStr || '').split(';');
  for (const decl of decls) {
    const colon = decl.indexOf(':');
    if (colon === -1) continue;
    const rawProp = decl.slice(0, colon).trim();
    const rawVal = decl.slice(colon + 1).trim();
    if (!rawProp || !rawVal) continue;
    const key = rawProp.startsWith('--')
      ? JSON.stringify(rawProp)
      : rawProp.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    entries.push(`${key}: ${JSON.stringify(rawVal)}`);
  }
  return `{{ ${entries.join(', ')} }}`;
}

function unwrapOuterHarnessDivs(rawHtml = '') {
  let html = String(rawHtml || '').trim();
  let strippedLabBg = false;
  for (let pass = 0; pass < 5; pass++) {
    const labBgMatch = html.match(/^<div\b[^>]*\bclass=["'][^"']*\blab-bg\b[^"']*["'][^>]*>/i);
    if (labBgMatch) {
      const divRe = /<\/?div\b[^>]*>/gi;
      let d = 0;
      let endIdx = -1;
      let m;
      while ((m = divRe.exec(html)) !== null) {
        if (/^<\/div/i.test(m[0])) {
          d -= 1;
          if (d === 0) {
            endIdx = divRe.lastIndex;
            break;
          }
        } else if (!/\/>\s*$/.test(m[0])) {
          d += 1;
        }
      }
      if (endIdx > 0) {
        html = html.slice(endIdx).trim();
        strippedLabBg = true;
        continue;
      }
    }

    const openMatch = html.match(/^<div\b([^>]*)>/i);
    if (!openMatch || !/<\/div>\s*$/i.test(html)) break;

    const attrs = openMatch[1] || '';
    const clsMatch = attrs.match(/\bclass=["']([^"']*)["']/i);
    const idMatch = attrs.match(/\bid=["']([^"']*)["']/i);
    const cls = clsMatch ? clsMatch[1] : '';
    const idVal = idMatch ? idMatch[1] : '';

    const isRootId = /^(?:root|__next)$/i.test(idVal);
    const isViewportHarness =
      /\b(?:w-screen|min-h-screen|h-screen)\b/.test(cls) &&
      /\bflex\b/.test(cls) &&
      /\bjustify-center\b/.test(cls) &&
      /\bitems-center\b/.test(cls) &&
      !/\b(?:border|shadow|rounded|grid|card|bg-gradient|bg-linear|from-|via-|to-|overflow-hidden|bg-black|bg-zinc|bg-slate|bg-neutral)\b/.test(cls);
    const isLabBgInnerWrapper =
      strippedLabBg &&
      /^flex\s+w-full\s+justify-center\s+relative$/i.test(cls.trim());

    if (!isRootId && !isViewportHarness && !isLabBgInnerWrapper) break;

    const tagRe = /<\/?div\b[^>]*>/gi;
    let depth = 0;
    let closesEarly = false;
    let match;
    while ((match = tagRe.exec(html)) !== null) {
      const token = match[0];
      if (/^<\/div/i.test(token)) {
        depth -= 1;
        if (depth === 0 && tagRe.lastIndex < html.trimEnd().length) {
          closesEarly = true;
          break;
        }
      } else if (!/\/>\s*$/.test(token)) {
        depth += 1;
      }
    }

    if (closesEarly || depth !== 0) break;

    html = html
      .slice(openMatch[0].length)
      .replace(/<\/div>\s*$/i, '')
      .trim();
    if (isLabBgInnerWrapper) strippedLabBg = false;
  }
  return html;
}

/**
 * Formats minified JSX markup into clean, readable 2-space indented lines
 * while keeping short leaf elements (e.g. <span>01</span>) compact on one line.
 */
export function formatJsxMarkup(markup = '', baseIndent = 6) {
  const raw = String(markup || '').trim();
  if (!raw) return '';

  // Tokenize into tags and text nodes
  const tokens = raw.match(/<[^>]+>|[^<]+/g) || [];
  const lines = [];
  let depth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok) continue;

    if (!tok.startsWith('<')) {
      const text = tok.replace(/\s+/g, ' ').trim();
      if (text) {
        lines.push(`${' '.repeat(baseIndent + depth * 2)}${text}`);
      }
      continue;
    }

    const isClosing = /^<\//.test(tok);
    const isSelfClosing = /\/>\s*$/.test(tok);

    if (isClosing) {
      depth = Math.max(0, depth - 1);
      lines.push(`${' '.repeat(baseIndent + depth * 2)}${tok}`);
      continue;
    }

    if (isSelfClosing) {
      lines.push(`${' '.repeat(baseIndent + depth * 2)}${tok}`);
      continue;
    }

    // Keep short leaf elements (<tag>short text</tag>) or empty pairs (<tag></tag>) on one line
    const tagNameMatch = tok.match(/^<([A-Za-z0-9:_-]+)/);
    const tagName = tagNameMatch ? tagNameMatch[1] : '';
    const next1 = tokens[i + 1] || '';
    const next2 = tokens[i + 2] || '';

    if (tagName && next1.toLowerCase() === `</${tagName.toLowerCase()}>`) {
      lines.push(`${' '.repeat(baseIndent + depth * 2)}${tok}${next1}`);
      i += 1;
      continue;
    }

    if (
      tagName &&
      !next1.startsWith('<') &&
      next2.toLowerCase() === `</${tagName.toLowerCase()}>` &&
      tok.length + next1.trim().length + next2.length <= 130
    ) {
      lines.push(`${' '.repeat(baseIndent + depth * 2)}${tok}${next1.replace(/\s+/g, ' ').trim()}${next2}`);
      i += 2;
      continue;
    }

    lines.push(`${' '.repeat(baseIndent + depth * 2)}${tok}`);
    depth += 1;
  }

  return lines.join('\n');
}

/**
 * Converts a Tailwind rendered HTML snapshot from awesome-components into a clean,
 * properly indented, self-contained React JSX component ready for WebForge's Live Preview.
 */
export function htmlSnapshotToReactComponent(componentName = 'AwesomeComponent', renderedHtml = '') {
  const pascal = String(componentName || 'AwesomeComponent')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
    .replace(/^[0-9]+/, '') || 'AwesomeComponent';

  let body = String(renderedHtml || '').trim();
  // Remove scripts, styles, comments, dead links, and meta/title tags
  body = body
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '');

  // If snapshot is a full HTML document, extract only the <body> contents
  const bodyMatch = body.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    body = bodyMatch[1].trim();
  } else {
    body = body
      .replace(/<!doctype\b[^>]*>/gi, '')
      .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, '')
      .trim();
  }

  // Peel redundant BuilderStudio outer screenshot harness divs
  body = unwrapOuterHarnessDivs(body);

  // Unwrap relative and full-origin Next.js /_next/image?url=... proxy URLs
  body = body.replace(/(?:https?:\/\/[^"'\s>\/]+)?\/_next\/image\?([^"'\s>]+)/gi, (full, queryStr) => {
    try {
      const params = new URLSearchParams(queryStr.replace(/&amp;/g, '&'));
      const target = params.get('url');
      if (target && /^https?:\/\//i.test(target)) {
        return target.replace(/^http:\/\//i, 'https://');
      }
    } catch {}
    return full;
  });

  // Upgrade http:// image URLs to https:// and decode &amp; inside src/href/class attributes for clean JSX
  body = body
    .replace(/(<img\b[^>]*\bsrc=["'])http:\/\//gi, '$1https://')
    .replace(/\b(src|href|class)="([^"]*?)"/gi, (_, attr, val) => `${attr}="${val.replace(/&amp;/g, '&')}"`);

  // Replace empty Shadow-DOM <number-flow-react> custom elements with clean numeric JSX spans
  body = body.replace(/<number-flow-react[^>]*>\s*<\/number-flow-react>/gi, '<span className="tabular-nums">$12.99</span>');

  // Normalize remaining viewport lock classes so full-bleed hero/gradient/aurora sections preserve height
  body = body
    .replace(/\bw-screen\b/g, 'w-full')
    .replace(/\bmin-w-screen\b/g, 'min-w-0 w-full')
    .replace(/\bmin-h-screen\b/g, 'min-h-[600px]')
    .replace(/\bmin-h-dvh\b/g, 'min-h-[600px]')
    .replace(/\bmin-h-\[100vh\]/g, 'min-h-[600px]')
    .replace(/\bh-screen\b/g, 'h-[640px]')
    .replace(/\bh-dvh\b/g, 'h-[640px]')
    .replace(/\bh-\[100vh\]/g, 'h-[640px]');

  if (!body) {
    body = `      <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100">${componentName}</div>`;
  } else {
    // Convert HTML attributes to valid JSX
    body = body
      .replace(/\sclass=/g, ' className=')
      .replace(/\sfor=/g, ' htmlFor=')
      .replace(/\stabindex=/gi, ' tabIndex=')
      .replace(/\sreadonly(?=[\s=>/])/gi, ' readOnly')
      .replace(/\sautocomplete=/gi, ' autoComplete=')
      .replace(/\sautofocus(?=[\s=>/])/gi, ' autoFocus')
      .replace(/\smaxlength=/gi, ' maxLength=')
      .replace(/\sminlength=/gi, ' minLength=')
      .replace(/\scolspan=/gi, ' colSpan=')
      .replace(/\srowspan=/gi, ' rowSpan=')
      .replace(/\scrossorigin=/gi, ' crossOrigin=')
      .replace(/\sframeborder=/gi, ' frameBorder=')
      .replace(/\sallowfullscreen(?=[\s=>/])/gi, ' allowFullScreen')
      .replace(/\sreferrerpolicy=/gi, ' referrerPolicy=')
      .replace(/\sstroke-width=/g, ' strokeWidth=')
      .replace(/\sstroke-linecap=/g, ' strokeLinecap=')
      .replace(/\sstroke-linejoin=/g, ' strokeLinejoin=')
      .replace(/\sstroke-dasharray=/g, ' strokeDasharray=')
      .replace(/\sstroke-dashoffset=/g, ' strokeDashoffset=')
      .replace(/\sstroke-miterlimit=/g, ' strokeMiterlimit=')
      .replace(/\sstroke-opacity=/g, ' strokeOpacity=')
      .replace(/\sfill-rule=/g, ' fillRule=')
      .replace(/\sclip-rule=/g, ' clipRule=')
      .replace(/\sclip-path=/g, ' clipPath=')
      .replace(/\sfill-opacity=/g, ' fillOpacity=')
      .replace(/\sstop-color=/g, ' stopColor=')
      .replace(/\sstop-opacity=/g, ' stopOpacity=')
      .replace(/\sxmlns:xlink=/g, ' xmlnsXlink=')
      .replace(/\sxlink:href=/g, ' xlinkHref=')
      .replace(/\sfetchpriority=/gi, ' fetchPriority=')
      .replace(/\sviewbox=/gi, ' viewBox=')
      .replace(/\spreserveaspectratio=/gi, ' preserveAspectRatio=');

    // Convert inline style="..." to JSX style={{ ... }}
    body = body.replace(/\sstyle="([^"]*)"/g, (_, s) => ` style=${cssStyleStringToJsxObject(s)}`);
    body = body.replace(/\sstyle='([^']*)'/g, (_, s) => ` style=${cssStyleStringToJsxObject(s)}`);

    // Remove raw inline event attributes like onclick="..."
    body = body.replace(/\son[a-z]+="[^"]*"/gi, '');

    // Ensure void HTML tags are self-closed for JSX
    body = body.replace(/<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b([^>]*?)(?<!\/)>/gi, '<$1$2 />');

    // Escape stray curly braces inside text nodes between > and <
    body = body.replace(/>([^<]*)</g, (match, text) => {
      if (!text.includes('{') && !text.includes('}')) return match;
      return `>${text.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')}<`;
    });

    body = formatJsxMarkup(body, 6);
  }

  return `import React from 'react';

/**
 * ${componentName}
 * Imported from wundercorp/awesome-components
 */
export function ${pascal}() {
  return (
    <div className="wf-ui-scope w-full">
${body}
    </div>
  );
}

export default ${pascal};
`;
}

export function isBrokenRenderedHtml(html = '') {
  const raw = String(html || '').trim();
  if (!raw || raw.length < 40) return true;
  if (/Something went wrong|The page failed to render|404: This page could not be found|__next_error__|NEXT_HTTP_ERROR_FALLBACK/i.test(raw)) {
    return true;
  }
  const stripped = raw.replace(/<[^>]+>/g, '').replace(/\s+/g, '');
  const hasVisualTag = /<(svg|img|canvas|video|input|button)\b/i.test(raw);
  const hasStyledVisualBox = /(?:aria-label=|background\s*:|background-image\s*:|border-radius\s*:|box-shadow\s*:|bg-gradient|bg-linear|from-|animate-)/i.test(raw);
  if (!stripped && !hasVisualTag && !hasStyledVisualBox) {
    return true;
  }
  return false;
}

/**
 * Harvests author-defined CSS custom properties (`:root`, `.dark`), `@property`
 * rules, `@keyframes`, and custom glow/shimmer/shiny utility classes from the
 * component's `prompt.md` so live Tailwind previews restore exact glowing borders
 * and landing-page accent colors that upstream `rendered.html` omitted.
 */
export function extractStyleHintsFromPrompt(promptMd = '') {
  const raw = String(promptMd || '');
  if (!raw) return '';

  const chunks = [];
  const seen = new Set();
  const pushChunk = (css) => {
    const clean = String(css || '')
      .replace(/@import\s+[^;]+;/gi, '')
      .replace(/@tailwind\s+[^;]+;/gi, '')
      .replace(/@layer\s+[^{]+\{([\s\S]*)\}\s*$/i, '$1')
      .trim();
    if (!clean || clean.length < 12 || clean.length > 14000) return;
    if (seen.has(clean)) return;
    seen.add(clean);
    chunks.push(clean);
  };

  // 1. Extract fenced ```css / ```scss blocks (commonly globals.css in prompt.md)
  const cssFenceRe = /```(?:css|scss)\b[^\n]*\n([\s\S]*?)```/gi;
  let m;
  while ((m = cssFenceRe.exec(raw)) !== null) {
    const block = m[1] || '';
    if (/(?:--[a-z0-9-]+|@keyframes|@property|glow|shimmer|shiny|rainbow|beam|primary|accent|brand)/i.test(block)) {
      pushChunk(block);
    }
  }

  // 2. Extract Tailwind config keyframes/colors if mentioned inline in ts/js fences
  const colorVarMatches = [...raw.matchAll(/["']?(brand|brand-foreground|primary|accent|glow-color|glow-color-via|glow-color-to|shiny-cta-[a-z-]+|shimmer-color)["']?\s*:\s*["'](#[0-9a-fA-F]{3,8}|hsl\([^)]+\)|rgb[a]?\([^)]+\))["']/gi)];
  if (colorVarMatches.length) {
    const varDecls = [];
    const added = new Set();
    for (const cm of colorVarMatches) {
      const key = cm[1].toLowerCase();
      const val = cm[2].trim();
      if (added.has(key)) continue;
      added.add(key);
      if (key === 'primary' || key === 'accent' || key === 'brand' || key === 'brand-foreground') {
        varDecls.push(`--wf-extracted-${key}: ${val};`);
      } else {
        varDecls.push(`--${key}: ${val};`);
      }
    }
    if (varDecls.length) {
      pushChunk(`:root { ${varDecls.join(' ')} }`);
    }
  }

  return chunks.join('\n\n').slice(0, 18000);
}

export async function fetchAwesomeComponentDetail(item, cacheDir) {
  if (!item) throw new Error('Component not found');
  const safeKey = item.id.replace(/[^a-zA-Z0-9_-]/g, '__');
  const cacheFile = cacheDir ? path.join(cacheDir, `${safeKey}.json`) : '';

  if (cacheFile && fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (cached && (cached.prompt || cached.renderedHtml) && (cached.renderedHtml || cached.cacheVersion === AWESOME_CACHE_VERSION)) {
        const hasValidHtml = !isBrokenRenderedHtml(cached.renderedHtml);
        const cleanRenderedHtml = hasValidHtml ? cached.renderedHtml : '';
        // Re-generate formatted jsxCode & promptCss in-place if cache came from an older schema version
        const freshJsx = cached.cacheVersion === AWESOME_CACHE_VERSION && cached.jsxCode
          ? cached.jsxCode
          : htmlSnapshotToReactComponent(item.name, cleanRenderedHtml);
        const freshPromptCss = cached.cacheVersion === AWESOME_CACHE_VERSION && typeof cached.promptCss === 'string'
          ? cached.promptCss
          : extractStyleHintsFromPrompt(cached.prompt || '');
        if (cached.cacheVersion !== AWESOME_CACHE_VERSION) {
          try {
            fs.writeFileSync(cacheFile, JSON.stringify({
              ...cached,
              cacheVersion: AWESOME_CACHE_VERSION,
              renderedHtml: cleanRenderedHtml,
              hasValidHtml,
              jsxCode: freshJsx,
              promptCss: freshPromptCss,
            }), 'utf8');
          } catch {}
        }
        return {
          ...item,
          ...cached,
          cacheVersion: AWESOME_CACHE_VERSION,
          renderedHtml: cleanRenderedHtml,
          hasValidHtml,
          jsxCode: freshJsx,
          promptCss: freshPromptCss,
          fromCache: true,
        };
      }
    } catch {
      // Cache corrupted — refetch
    }
  }

  const headers = { 'User-Agent': 'WebForge-Studio/2.0' };
  const [promptRes, htmlRes] = await Promise.all([
    fetch(`${AWESOME_REPO_RAW_BASE}/${item.promptPath}`, { headers }).catch(() => null),
    fetch(`${AWESOME_REPO_RAW_BASE}/${item.htmlPath}`, { headers }).catch(() => null),
  ]);

  const prompt = promptRes && promptRes.ok ? await promptRes.text() : '';
  const rawRenderedHtml = htmlRes && htmlRes.ok ? await htmlRes.text() : '';

  if (!prompt && !rawRenderedHtml) {
    throw new Error(`Could not fetch source files for "${item.name}" from GitHub`);
  }

  const hasValidHtml = !isBrokenRenderedHtml(rawRenderedHtml);
  const renderedHtml = hasValidHtml ? rawRenderedHtml : '';
  const jsxCode = htmlSnapshotToReactComponent(item.name, renderedHtml);
  const promptCss = extractStyleHintsFromPrompt(prompt);
  const payload = {
    cacheVersion: AWESOME_CACHE_VERSION,
    prompt,
    renderedHtml,
    hasValidHtml,
    jsxCode,
    promptCss,
    fetchedAt: new Date().toISOString(),
  };

  if (cacheFile) {
    try {
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(payload), 'utf8');
    } catch {
      // Ignore cache write errors
    }
  }

  return { ...item, ...payload, fromCache: false };
}
