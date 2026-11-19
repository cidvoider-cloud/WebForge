/**
 * WebForge Studio — Free Zero-API-Key Multi-Engine Web Search & GitHub Skill Discovery
 * Zero external dependencies; uses Node.js built-in fetch().
 *
 * Strategy:
 * 1. DuckDuckGo HTML/Lite (full web search — works best on residential IPs via start.bat)
 * 2. DuckDuckGo Instant Answer API (entity summaries & direct answers)
 * 3. Multi-source keyless fallback & enrichment: Wikipedia API + Hacker News Algolia + MDN Docs
 *    (guarantees real, accurate web results even when DDG throttles cloud/shared IPs)
 */

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const APP_UA = 'WebForgeStudio/2.0 (+https://github.com/webforge)';

export function decodeHtmlEntities(str = '') {
  return String(str)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function unwrapDuckDuckGoUrl(rawHref = '') {
  const href = String(rawHref || '').trim();
  if (!href) return '';
  try {
    const normalized = href.startsWith('//') ? `https:${href}` : href.startsWith('/') ? `https://duckduckgo.com${href}` : href;
    const u = new URL(normalized);
    const uddg = u.searchParams.get('uddg');
    if (uddg) return decodeURIComponent(uddg);
    return normalized;
  } catch {
    return href;
  }
}

export function parseDuckDuckGoHtml(html = '', limit = 8) {
  const results = [];
  const blockRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div|span)>)?/gi;
  let match;
  while ((match = blockRegex.exec(html)) !== null && results.length < limit) {
    const url = unwrapDuckDuckGoUrl(match[1]);
    const title = decodeHtmlEntities(match[2]);
    const snippet = decodeHtmlEntities(match[3] || '');
    if (title && /^https?:\/\//i.test(url) && !/duckduckgo\.com\/y\.js/i.test(url)) {
      results.push({ title, url, snippet, source: 'DuckDuckGo' });
    }
  }
  return results;
}

export function parseDuckDuckGoLite(html = '', limit = 8) {
  const results = [];
  const linkRegex = /<a[^>]*class=['"][^'"]*result-link[^'"]*['"][^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /<td[^>]*class=['"][^'"]*result-snippet[^'"]*['"][^>]*>([\s\S]*?)<\/td>/gi;
  const links = [];
  const snippets = [];
  let m;
  while ((m = linkRegex.exec(html)) !== null) {
    links.push({ url: unwrapDuckDuckGoUrl(m[1]), title: decodeHtmlEntities(m[2]) });
  }
  while ((m = snippetRegex.exec(html)) !== null) {
    snippets.push(decodeHtmlEntities(m[1]));
  }
  for (let i = 0; i < links.length && results.length < limit; i++) {
    const { title, url } = links[i];
    if (title && /^https?:\/\//i.test(url)) {
      results.push({ title, url, snippet: snippets[i] || '', source: 'DuckDuckGo Lite' });
    }
  }
  return results;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 6500) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function searchDuckDuckGo(query, limit) {
  // Try HTML endpoint first, then Lite endpoint
  try {
    const res = await fetchWithTimeout('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: new URLSearchParams({ q: query }).toString(),
    });
    if (res.status === 200) {
      const html = await res.text();
      const parsed = parseDuckDuckGoHtml(html, limit);
      if (parsed.length) return { engine: 'DuckDuckGo', results: parsed };
    }
  } catch {
    // Fall through to Lite
  }

  try {
    const res = await fetchWithTimeout('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: new URLSearchParams({ q: query }).toString(),
    });
    if (res.status === 200) {
      const html = await res.text();
      const parsed = parseDuckDuckGoLite(html, limit);
      if (parsed.length) return { engine: 'DuckDuckGo Lite', results: parsed };
    }
  } catch {
    // Fall through
  }

  return { engine: null, results: [] };
}

async function searchDuckDuckGoInstant(query) {
  try {
    const res = await fetchWithTimeout(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { headers: { 'User-Agent': APP_UA } },
      4500
    );
    if (!res.ok) return [];
    const data = await res.json();
    const out = [];
    if (data.AbstractText && data.AbstractURL) {
      out.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        snippet: decodeHtmlEntities(data.AbstractText).slice(0, 320),
        source: data.AbstractSource || 'DuckDuckGo Instant',
      });
    }
    for (const topic of (data.RelatedTopics || []).slice(0, 4)) {
      if (topic?.Text && topic?.FirstURL) {
        out.push({
          title: topic.Text.split(' - ')[0].slice(0, 90),
          url: topic.FirstURL,
          snippet: decodeHtmlEntities(topic.Text).slice(0, 260),
          source: 'DuckDuckGo Instant',
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function searchWikipedia(query, limit = 4) {
  try {
    const res = await fetchWithTimeout(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=${limit}`,
      { headers: { 'User-Agent': APP_UA } },
      5000
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.query?.search || []).map((item) => ({
      title: item.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
      snippet: decodeHtmlEntities(item.snippet || ''),
      source: 'Wikipedia',
    }));
  } catch {
    return [];
  }
}

async function searchHackerNews(query, limit = 4) {
  try {
    const res = await fetchWithTimeout(
      `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=${limit}&query=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': APP_UA } },
      5000
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits || [])
      .filter((h) => h.title && (h.url || h.objectID))
      .map((h) => ({
        title: h.title,
        url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        snippet: h.story_text
          ? decodeHtmlEntities(h.story_text).slice(0, 240)
          : `${h.points || 0} points · ${h.num_comments || 0} comments · ${String(h.created_at || '').slice(0, 10)}`,
        source: 'Web / HN Index',
      }));
  } catch {
    return [];
  }
}

async function searchMdn(query, limit = 3) {
  if (!/\b(css|html|js|javascript|typescript|react|dom|svg|canvas|webgl|api|fetch|grid|flex|aria|browser|http|tailwind|font)\b/i.test(query)) {
    return [];
  }
  try {
    const res = await fetchWithTimeout(
      `https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(query)}&size=${limit}`,
      { headers: { 'User-Agent': APP_UA } },
      4500
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.documents || []).map((doc) => ({
      title: doc.title,
      url: `https://developer.mozilla.org${doc.mdn_url}`,
      snippet: decodeHtmlEntities(doc.summary || ''),
      source: 'MDN Web Docs',
    }));
  } catch {
    return [];
  }
}

export function dedupeSearchResults(list = [], limit = 8) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item?.url || !item?.title) continue;
    const key = item.url.replace(/\/+$/, '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      title: String(item.title).trim(),
      url: String(item.url).trim(),
      snippet: String(item.snippet || '').trim(),
      source: String(item.source || 'Web').trim(),
    });
    if (out.length >= limit) break;
  }
  return out;
}

export async function runKeylessWebSearch(rawQuery, { limit = 6 } = {}) {
  const query = String(rawQuery || '').trim();
  if (!query) return { query: '', engine: 'none', results: [], elapsedMs: 0 };

  const start = Date.now();
  const cappedLimit = Math.max(1, Math.min(12, Number(limit) || 6));

  // 1) Primary full-web DuckDuckGo search
  const ddg = await searchDuckDuckGo(query, cappedLimit);
  if (ddg.results.length >= 3) {
    return {
      query,
      engine: ddg.engine,
      results: dedupeSearchResults(ddg.results, cappedLimit),
      elapsedMs: Date.now() - start,
    };
  }

  // 2) Parallel keyless fallback & web-index blend (always works without API keys)
  const [instant, hn, mdn, wiki] = await Promise.all([
    searchDuckDuckGoInstant(query),
    searchHackerNews(query, 4),
    searchMdn(query, 3),
    searchWikipedia(query, 4),
  ]);

  const combined = dedupeSearchResults([...ddg.results, ...instant, ...mdn, ...hn, ...wiki], cappedLimit);
  const engines = [];
  if (ddg.results.length) engines.push(ddg.engine);
  if (instant.length) engines.push('DuckDuckGo Instant');
  if (mdn.length) engines.push('MDN');
  if (hn.length) engines.push('Web/HN');
  if (wiki.length) engines.push('Wikipedia');

  return {
    query,
    engine: engines.join(' + ') || 'Keyless Multi-Search',
    results: combined,
    elapsedMs: Date.now() - start,
  };
}

/**
 * Parse any GitHub repository URL or owner/repo shorthand into structured coordinates.
 */
export function parseGitHubSkillTarget(rawInput = '') {
  const input = String(rawInput || '').trim();
  if (!input) return null;

  // Raw URL: https://raw.githubusercontent.com/owner/repo/branch/path/to/file.md
  const rawMatch = input.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i);
  if (rawMatch) {
    return {
      owner: rawMatch[1],
      repo: rawMatch[2].replace(/\.git$/i, ''),
      branch: rawMatch[3],
      filePath: rawMatch[4],
      kind: 'file',
    };
  }

  // GitHub blob/tree URL
  const blobMatch = input.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/(blob|tree)\/([^/]+)\/(.+?)(?:[?#].*)?$/i);
  if (blobMatch) {
    return {
      owner: blobMatch[1],
      repo: blobMatch[2].replace(/\.git$/i, ''),
      branch: blobMatch[4],
      filePath: blobMatch[5].replace(/\/+$/, ''),
      kind: blobMatch[3].toLowerCase() === 'blob' ? 'file' : 'dir',
    };
  }

  // Standard GitHub repo URL
  const repoMatch = input.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/?#]+)(?:[/?#].*)?$/i);
  if (repoMatch) {
    return {
      owner: repoMatch[1],
      repo: repoMatch[2].replace(/\.git$/i, ''),
      branch: '',
      filePath: '',
      kind: 'repo',
    };
  }

  // Shorthand: owner/repo
  const shortMatch = input.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2].replace(/\.git$/i, ''),
      branch: '',
      filePath: '',
      kind: 'repo',
    };
  }

  return null;
}

export function extractFrontmatter(markdown = '') {
  const text = String(markdown || '');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!fm) return { meta: {}, body: text.trim() };

  const meta = {};
  const lines = fm[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1].toLowerCase();
    const rawVal = kv[2].trim();
    if (/^[>|][-+]?$/.test(rawVal)) {
      const blockLines = [];
      while (i + 1 < lines.length && (/^\s+/.test(lines[i + 1]) || lines[i + 1].trim() === '')) {
        i += 1;
        blockLines.push(lines[i].trim());
      }
      meta[key] = blockLines.filter(Boolean).join(' ').trim();
    } else {
      meta[key] = rawVal.replace(/^["']|["']$/g, '').trim();
    }
  }
  return { meta, body: text.slice(fm[0].length).trim() };
}

export function rankRepoSkillPaths(paths = [], dirPrefix = '') {
  const normalizedPrefix = dirPrefix ? `${dirPrefix.replace(/^\/+|\/+$/g, '')}/` : '';
  const candidates = [];

  for (const p of paths) {
    if (normalizedPrefix && !p.startsWith(normalizedPrefix)) continue;
    const lower = p.toLowerCase();
    let priority = 99;
    if (/(?:^|\/)skill\.md$/.test(lower)) priority = 1;
    else if (/(?:^|\/)(?:agents|claude|system)\.md$/.test(lower)) priority = 2;
    else if (/(?:^|\/)\.cursor\/rules\/[^/]+\.(?:mdc|md)$/.test(lower)) priority = 3;
    else if (/(?:^|\/)\.(?:agents|clinerules|kiro)\/(?:rules|steering)?\/?[^/]+\.md$/.test(lower)) priority = 4;
    else if (/(?:^|\/)\.github\/copilot-instructions\.md$/.test(lower)) priority = 5;
    else if (lower === 'readme.md' || lower === `${normalizedPrefix.toLowerCase()}readme.md`) priority = 10;

    if (priority < 99) {
      candidates.push({ path: p, priority });
    }
  }

  candidates.sort((a, b) => a.priority - b.priority || a.path.length - b.path.length || a.path.localeCompare(b.path));

  // If SKILL.md files exist, prioritize them and deduplicate mirrored folders (e.g. skills/x vs .claude/skills/x)
  const hasSkillMd = candidates.some((c) => c.priority === 1);
  if (hasSkillMd) {
    const seenFolder = new Set();
    const uniqueSkills = [];
    for (const c of candidates.filter((x) => x.priority === 1)) {
      const parts = c.path.split('/');
      const skillKey = (parts.length >= 2 ? parts[parts.length - 2] : c.path).toLowerCase();
      if (seenFolder.has(skillKey)) continue;
      seenFolder.add(skillKey);
      uniqueSkills.push(c.path);
      if (uniqueSkills.length >= 12) break;
    }
    return uniqueSkills;
  }
  return candidates.slice(0, 8).map((c) => c.path);
}

export async function discoverGitHubSkills(rawInput) {
  const target = parseGitHubSkillTarget(rawInput);
  if (!target) {
    throw new Error('Invalid GitHub URL. Paste a repo like https://github.com/owner/repo or owner/repo.');
  }

  const { owner, repo } = target;
  let branch = target.branch || '';

  // Resolve default branch if not specified
  if (!branch) {
    try {
      const repoRes = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { 'User-Agent': APP_UA, Accept: 'application/vnd.github+json' },
      });
      if (repoRes.ok) {
        const meta = await repoRes.json();
        branch = meta.default_branch || 'main';
      }
    } catch {
      // Fallback below
    }
    if (!branch) branch = 'main';
  }

  const buildSkillEntry = async (filePath, activeBranch) => {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${activeBranch}/${filePath}`;
    const res = await fetchWithTimeout(rawUrl, { headers: { 'User-Agent': APP_UA } });
    if (!res.ok) return null;
    const rawText = await res.text();
    const { meta, body } = extractFrontmatter(rawText);
    const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim() || '';
    const folderName = filePath.split('/').slice(-2, -1)[0] || repo;
    const baseName = filePath.split('/').pop().replace(/\.(md|mdc)$/i, '');
    const inferredName =
      meta.name ||
      heading ||
      (/^(skill|readme|agents|claude)$/i.test(baseName) ? folderName : baseName);

    const niceName = inferredName
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const firstParagraph = body
      .replace(/^#.*$/gm, '')
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .find((s) => s.length > 16 && !s.startsWith('|') && !s.startsWith('```'));

    return {
      path: filePath,
      branch: activeBranch,
      name: niceName,
      slug: `${owner}-${repo}-${meta.name || folderName || baseName}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
      description: meta.description || (firstParagraph ? firstParagraph.slice(0, 140) : `Imported from ${owner}/${repo} (${filePath})`),
      author: owner,
      source: `https://github.com/${owner}/${repo}/blob/${activeBranch}/${filePath}`,
      prompt: body.slice(0, 12000),
    };
  };

  // Direct file URL
  if (target.kind === 'file' && target.filePath) {
    const item = await buildSkillEntry(target.filePath, branch);
    if (!item) throw new Error(`Could not fetch ${target.filePath} from ${owner}/${repo}`);
    return { owner, repo, branch, skills: [item] };
  }

  // Scan repo tree via GitHub API to discover SKILL.md / rules / AGENTS.md
  let candidatePaths = [];
  for (const br of [...new Set([branch, 'main', 'master'])]) {
    try {
      const treeRes = await fetchWithTimeout(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${br}?recursive=1`,
        { headers: { 'User-Agent': APP_UA, Accept: 'application/vnd.github+json' } }
      );
      if (treeRes.ok) {
        const treeData = await treeRes.json();
        const blobPaths = (treeData.tree || []).filter((n) => n.type === 'blob').map((n) => n.path);
        candidatePaths = rankRepoSkillPaths(blobPaths, target.kind === 'dir' ? target.filePath : '');
        branch = br;
        break;
      }
    } catch {
      // Try next branch
    }
  }

  // Fallback direct probe if GitHub API rate-limits
  if (!candidatePaths.length) {
    const probes = ['SKILL.md', 'skills/SKILL.md', 'AGENTS.md', 'CLAUDE.md', '.github/copilot-instructions.md', 'README.md'];
    for (const br of [...new Set([branch, 'main', 'master'])]) {
      for (const p of probes) {
        const item = await buildSkillEntry(p, br);
        if (item) return { owner, repo, branch: br, skills: [item] };
      }
    }
    throw new Error(`No SKILL.md, AGENTS.md, or README.md found in ${owner}/${repo}`);
  }

  const fetchedRaw = (await Promise.all(candidatePaths.map((p) => buildSkillEntry(p, branch)))).filter(Boolean);
  const seenNames = new Set();
  const fetched = [];
  for (const item of fetchedRaw) {
    const key = item.name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    fetched.push(item);
  }
  if (!fetched.length) {
    throw new Error(`Could not download skill files from ${owner}/${repo}`);
  }
  return { owner, repo, branch, skills: fetched };
}

/**
 * Infer a UI Library element category from a file path or component name.
 */
export function inferUIComponentCategory(filePath = '') {
  const lower = String(filePath || '').toLowerCase();
  if (/button|btn|cta/.test(lower)) return 'buttons';
  if (/pricing|price|plan|tier/.test(lower)) return 'pricing';
  if (/modal|dialog|drawer|sheet|popover/.test(lower)) return 'modals';
  if (/table|grid|metric|stat|kpi|chart/.test(lower)) return 'tables';
  if (/nav|header|topbar|sidebar|menu/.test(lower)) return 'navbar';
  if (/hero|banner|jumbotron/.test(lower)) return 'hero';
  if (/input|form|field|select|switch|checkbox|textarea/.test(lower)) return 'forms';
  if (/(?:^|[^a-z])tabs?(?:[^a-z]|$)|segment/.test(lower)) return 'tabs';
  if (/alert|toast|badge|notice|status/.test(lower)) return 'alerts';
  if (/accordion|faq|collapse|disclosure/.test(lower)) return 'accordion';
  if (/footer/.test(lower)) return 'footer';
  if (/card|tile|bento|feature/.test(lower)) return 'cards';
  return 'cards';
}

export function rankRepoUIComponentPaths(paths = [], dirPrefix = '') {
  const normalizedPrefix = dirPrefix ? `${dirPrefix.replace(/^\/+|\/+$/g, '')}/` : '';
  const candidates = [];

  for (const p of paths) {
    if (normalizedPrefix && !p.startsWith(normalizedPrefix)) continue;
    const lower = p.toLowerCase();
    if (!/\.(jsx|tsx|js|css)$/i.test(lower)) continue;
    if (/(?:node_modules|dist|build|\.test\.|\.spec\.|\.stories\.|\.d\.ts$|config\.|vite\.|tailwind\.|postcss\.|eslint)/i.test(lower)) {
      continue;
    }

    let priority = 50;
    if (/(?:^|\/)(?:components\/ui|ui\/components|registry\/.*\/ui|primitives)\//i.test(lower)) priority = 1;
    else if (/(?:^|\/)components\//i.test(lower)) priority = 2;
    else if (/(?:^|\/)(?:ui|elements|blocks)\//i.test(lower)) priority = 3;
    else if (/(?:button|card|input|modal|dialog|tabs|table|navbar|badge|alert|accordion|pricing|hero|footer)/i.test(lower)) priority = 4;
    else continue;

    candidates.push({ path: p, priority });
  }

  candidates.sort((a, b) => a.priority - b.priority || a.path.length - b.path.length || a.path.localeCompare(b.path));
  return candidates.slice(0, 12).map((c) => c.path);
}

/**
 * Scan any public GitHub repo or component file URL for UI components (zero API keys).
 */
export async function discoverGitHubUIComponents(rawInput) {
  const target = parseGitHubSkillTarget(rawInput);
  if (!target) {
    throw new Error('Invalid GitHub URL. Paste a repo like https://github.com/owner/repo or a direct component file URL.');
  }

  const { owner, repo } = target;
  let branch = target.branch || '';

  if (!branch) {
    try {
      const repoRes = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { 'User-Agent': APP_UA, Accept: 'application/vnd.github+json' },
      });
      if (repoRes.ok) {
        const meta = await repoRes.json();
        branch = meta.default_branch || 'main';
      }
    } catch {
      // Fallback below
    }
    if (!branch) branch = 'main';
  }

  const fetchComponentFile = async (filePath, activeBranch) => {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${activeBranch}/${filePath}`;
    const res = await fetchWithTimeout(rawUrl, { headers: { 'User-Agent': APP_UA } });
    if (!res.ok) return null;
    const code = (await res.text()).slice(0, 14000);
    const baseName = filePath.split('/').pop().replace(/\.(jsx|tsx|js|css)$/i, '');
    const niceName = baseName
      .replace(/[-_]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    return {
      id: `${owner}-${repo}-${baseName}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
      name: niceName,
      category: inferUIComponentCategory(filePath),
      description: `Imported from ${owner}/${repo} (${filePath})`,
      path: filePath,
      source: `https://github.com/${owner}/${repo}/blob/${activeBranch}/${filePath}`,
      code,
    };
  };

  if (target.kind === 'file' && target.filePath) {
    const item = await fetchComponentFile(target.filePath, branch);
    if (!item) throw new Error(`Could not fetch ${target.filePath} from ${owner}/${repo}`);
    return {
      owner,
      repo,
      branch,
      libraryName: `${repo.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} UI`,
      sourceUrl: `https://github.com/${owner}/${repo}`,
      elements: [item],
    };
  }

  let candidatePaths = [];
  for (const br of [...new Set([branch, 'main', 'master'])]) {
    try {
      const treeRes = await fetchWithTimeout(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${br}?recursive=1`,
        { headers: { 'User-Agent': APP_UA, Accept: 'application/vnd.github+json' } }
      );
      if (treeRes.ok) {
        const treeData = await treeRes.json();
        const blobPaths = (treeData.tree || []).filter((n) => n.type === 'blob').map((n) => n.path);
        candidatePaths = rankRepoUIComponentPaths(blobPaths, target.kind === 'dir' ? target.filePath : '');
        branch = br;
        break;
      }
    } catch {
      // Try next branch
    }
  }

  if (!candidatePaths.length) {
    throw new Error(`No UI component files (.jsx/.tsx/.css) found in ${owner}/${repo}. Try pasting a direct file or folder URL.`);
  }

  const elements = (await Promise.all(candidatePaths.map((p) => fetchComponentFile(p, branch)))).filter(Boolean);
  if (!elements.length) {
    throw new Error(`Could not download component files from ${owner}/${repo}`);
  }

  return {
    owner,
    repo,
    branch,
    libraryName: `${repo.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} UI`,
    sourceUrl: `https://github.com/${owner}/${repo}`,
    elements,
  };
}

