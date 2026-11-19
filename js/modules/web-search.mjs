/**
 * WebForge Studio — Free Keyless Web Search Client
 * Calls the local zero-API-key /api/web-search endpoint (auto-started by start.bat / tools/serve.mjs)
 * and falls back gracefully to direct CORS-friendly keyless public APIs (Wikipedia, HN Algolia, MDN)
 * if opened via a plain static server.
 */

export function extractSearchQuery(userPrompt = '') {
  const raw = String(userPrompt || '').trim();
  if (!raw) return '';
  if (/^\/search\s+/i.test(raw)) {
    return raw.replace(/^\/search\s+/i, '').trim().slice(0, 140);
  }
  // Condense long multi-paragraph prompts into a focused search query
  const firstSentence = raw
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[`*_#>\[\]()]/g, ' ')
    .replace(/\b(build|create|make|design|generate|website|web app|landing page|page|app|please|using react|tailwind|with|for me|that has|a modern)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:for|about|of|a|an|the)\s+/i, '')
    .trim();

  const candidate = firstSentence.length >= 4 ? firstSentence : raw.replace(/\s+/g, ' ').trim();
  return candidate.split(' ').slice(0, 12).join(' ').slice(0, 120);
}

export function shouldAutoRunWebSearch({ enabled, userMessage }) {
  const msg = String(userMessage || '').trim();
  if (!msg) return false;
  if (/^\/search\s+/i.test(msg)) return true;
  if (!enabled) return false;
  // Skip trivial pure debug/refactor prompts unless user explicitly mentions searching or live data
  if (/^(DEBUG MODE|VERIFY & FIX MODE)/i.test(msg)) return false;
  return true;
}

async function browserFallbackSearch(query, limit = 6) {
  const start = Date.now();
  const tasks = [
    fetch(`https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=4&query=${encodeURIComponent(query)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        (d?.hits || [])
          .filter((h) => h.title && (h.url || h.objectID))
          .map((h) => ({
            title: h.title,
            url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
            snippet: `${h.points || 0} points · ${String(h.created_at || '').slice(0, 10)}`,
            source: 'Web / HN Index',
          }))
      )
      .catch(() => []),
    fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*&srlimit=4`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        (d?.query?.search || []).map((item) => ({
          title: item.title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
          snippet: String(item.snippet || '').replace(/<[^>]+>/g, ''),
          source: 'Wikipedia',
        }))
      )
      .catch(() => []),
  ];

  const [hn, wiki] = await Promise.all(tasks);
  const seen = new Set();
  const merged = [];
  for (const r of [...hn, ...wiki]) {
    if (!r?.url || seen.has(r.url)) continue;
    seen.add(r.url);
    merged.push(r);
    if (merged.length >= limit) break;
  }

  return {
    query,
    engine: 'Direct Keyless Fallback (Web/HN + Wikipedia)',
    results: merged,
    elapsedMs: Date.now() - start,
  };
}

export async function performWebSearch(query, { limit = 6, signal } = {}) {
  const cleaned = String(query || '').trim();
  if (!cleaned) return { query: '', engine: 'none', results: [], elapsedMs: 0 };

  try {
    const res = await fetch(`/api/web-search?q=${encodeURIComponent(cleaned)}&limit=${encodeURIComponent(limit)}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results)) return data;
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    // Fallback to browser-direct keyless search when running on static hosting
  }

  return browserFallbackSearch(cleaned, limit);
}

export async function checkWebSearchHealth() {
  try {
    const res = await fetch('/api/health', { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      return { localServer: true, webSearch: !!data.webSearch, githubSkills: !!data.githubSkills };
    }
  } catch {
    // Static mode
  }
  return { localServer: false, webSearch: true, githubSkills: true };
}

export function formatSearchResultsForPrompt(searchResponse) {
  if (!searchResponse || !Array.isArray(searchResponse.results) || !searchResponse.results.length) {
    return '';
  }
  const lines = searchResponse.results.map((r, i) => {
    const snippet = r.snippet ? `\n   Summary: ${r.snippet.slice(0, 260)}` : '';
    return `${i + 1}. ${r.title} (${r.url}) [${r.source || 'Web'}]${snippet}`;
  });
  return [
    `## LIVE WEB SEARCH CONTEXT (Query: "${searchResponse.query}" · Engine: ${searchResponse.engine})`,
    'Use these verified web search results for up-to-date facts, copy, features, and references where relevant:',
    ...lines,
  ].join('\n');
}
