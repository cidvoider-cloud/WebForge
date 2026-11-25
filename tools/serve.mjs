/**
 * Zero-dependency WebForge Studio server.
 * Serves static ES modules AND built-in zero-API-key /api/web-search + /api/github-skills endpoints.
 * Usage: node tools/serve.mjs [port]
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runKeylessWebSearch, discoverGitHubSkills, discoverGitHubUIComponents } from './search-engine.mjs';
import {
  DEFAULT_AI_QUEUE_REL_PATH,
  readAiQueueFile,
  addAiTemplateItem,
  updateAiTemplateItem,
  deleteAiTemplateItem,
  clearImportedAiTemplateItems,
  syncAiTemplateItems,
} from './ai-queue-store.mjs';
import {
  AWESOME_INDEX_REL_PATH,
  AWESOME_CACHE_REL_DIR,
  loadAwesomeCatalog,
  searchAwesomeCatalog,
  fetchAwesomeComponentDetail,
} from './awesome-components.mjs';
import {
  getRemoteCatalogConfig,
  loadRemoteCatalog,
  searchRemoteCatalog,
  fetchRemoteComponentDetail,
} from './github-catalogs.mjs';
import {
  getPreviewKitStatus,
  loadVerificationCache,
  getLibraryVerificationStats,
  getAllLibrariesVerificationSummary,
  filterCatalogByVerification,
} from './preview-kit-store.mjs';
import { normalizeComponentRecord, applyNormalizationAutoFix } from '../js/modules/ui-normalizer.mjs';
import { buildInteractivePreviewSrcdoc } from '../js/modules/ui-preview-builder.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const aiQueueFilePath = path.join(root, DEFAULT_AI_QUEUE_REL_PATH);
const awesomeIndexPath = path.join(root, AWESOME_INDEX_REL_PATH);
const awesomeCacheDir = path.join(root, AWESOME_CACHE_REL_DIR);
const port = Number(process.argv[2] || process.env.PORT || 3000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req, maxBytes = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Request payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (!text) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function safeJoin(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent((urlPath || '/').split('?')[0]);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const cleaned = path.normalize(decoded).replace(/^([/\\])+/, '');
  const segments = cleaned.split(/[/\\]+/).filter(Boolean);
  // Block hidden dotfiles/directories (.env, .git, .aistudio, etc.)
  if (segments.some((seg) => seg.startsWith('.'))) return null;
  const full = path.resolve(root, cleaned);
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    const pathname = parsedUrl.pathname;

    // ── Built-in API routes (zero API keys required) ──
    if (pathname === '/api/health') {
      const kit = getPreviewKitStatus(root);
      return sendJson(res, 200, {
        ok: true,
        webSearch: true,
        githubSkills: true,
        providerProxy: true,
        previewKit: kit.ok,
        watermelonRuntime: kit.watermelonRuntimeReady,
        version: '2.0',
      });
    }

    // ── Local AI Provider Proxy (fixes browser CORS for Strata, Ollama, Anthropic, etc.) ──
    if (pathname === '/api/provider-proxy' && (req.method || 'GET').toUpperCase() === 'POST') {
      let rawBody = '';
      try {
        rawBody = await new Promise((resolve, reject) => {
          let buf = '';
          let bytes = 0;
          req.on('data', (chunk) => {
            bytes += chunk.length;
            if (bytes > 20 * 1024 * 1024) {
              reject(new Error('Proxy payload too large'));
              req.destroy();
              return;
            }
            buf += chunk.toString('utf8');
          });
          req.on('end', () => resolve(buf));
          req.on('error', reject);
        });
      } catch (err) {
        return sendJson(res, 413, { error: err?.message || 'Invalid request body' });
      }

      let payload;
      try {
        payload = JSON.parse(rawBody || '{}');
      } catch {
        return sendJson(res, 400, { error: 'Invalid JSON payload' });
      }

      const targetUrlStr = String(payload.targetUrl || '').trim();
      let targetUrl;
      try {
        targetUrl = new URL(targetUrlStr);
      } catch {
        return sendJson(res, 400, { error: 'Invalid targetUrl' });
      }
      if (!['http:', 'https:'].includes(targetUrl.protocol)) {
        return sendJson(res, 400, { error: 'Only http:// and https:// endpoints are allowed' });
      }
      const hostLower = targetUrl.hostname.toLowerCase();
      // Block cloud metadata SSRF targets while allowing localhost/LAN LLM runtimes & public APIs
      if (
        hostLower === '169.254.169.254' ||
        hostLower.startsWith('169.254.') ||
        hostLower === 'metadata.google.internal' ||
        hostLower === 'metadata.goog'
      ) {
        return sendJson(res, 403, { error: 'Blocked metadata endpoint' });
      }

      const method = ['GET', 'POST', 'HEAD'].includes(String(payload.method || 'GET').toUpperCase())
        ? String(payload.method || 'GET').toUpperCase()
        : 'GET';

      const fwdHeaders = {};
      if (payload.headers && typeof payload.headers === 'object') {
        const forbidden = new Set(['host', 'origin', 'referer', 'connection', 'content-length', 'transfer-encoding']);
        for (const [k, v] of Object.entries(payload.headers)) {
          if (!forbidden.has(k.toLowerCase()) && typeof v === 'string' && v.length <= 8192) {
            fwdHeaders[k] = v;
          }
        }
      }

      const upstreamAbort = new AbortController();
      req.on('close', () => {
        if (!res.writableEnded) upstreamAbort.abort();
      });

      try {
        const upstreamRes = await fetch(targetUrl.toString(), {
          method,
          headers: fwdHeaders,
          body: method === 'POST' && payload.body !== undefined
            ? (typeof payload.body === 'string' ? payload.body : JSON.stringify(payload.body))
            : undefined,
          signal: upstreamAbort.signal,
        });

        const contentType = upstreamRes.headers.get('content-type') || 'application/json; charset=utf-8';
        res.writeHead(upstreamRes.status, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
          'X-Content-Type-Options': 'nosniff',
        });

        if (!upstreamRes.body) {
          res.end();
          return;
        }

        const reader = upstreamRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!res.writableEnded) {
            res.write(Buffer.from(value));
          }
        }
        if (!res.writableEnded) res.end();
        return;
      } catch (err) {
        if (err?.name === 'AbortError') {
          if (!res.writableEnded) res.end();
          return;
        }
        if (!res.headersSent) {
          return sendJson(res, 502, {
            error: `Proxy could not reach ${targetUrl.origin}: ${err?.message || 'Connection refused'}`,
          });
        }
        if (!res.writableEnded) res.end();
        return;
      }
    }

    if (pathname === '/api/preview-kit/status') {
      const kit = getPreviewKitStatus(root);
      const verification = getAllLibrariesVerificationSummary(root);
      return sendJson(res, 200, { ok: kit.ok, kit, verification });
    }

    if (pathname === '/api/preview-kit/repair' && (req.method || 'GET').toUpperCase() === 'POST') {
      const kit = getPreviewKitStatus(root);
      const verification = getAllLibrariesVerificationSummary(root);
      return sendJson(res, kit.ok ? 200 : 500, {
        ok: kit.ok,
        repaired: kit.ok,
        kit,
        verification,
        error: kit.ok ? undefined : `Missing or corrupted assets: ${[...kit.missingAssets, ...kit.corruptedAssets].join(', ')}`,
      });
    }

    if (pathname === '/api/preview-kit/render') {
      const libId = (parsedUrl.searchParams.get('lib') || '').trim();
      const compId = (parsedUrl.searchParams.get('id') || '').trim();
      const theme = (parsedUrl.searchParams.get('theme') || 'dark').trim();
      const attempt = Math.max(0, Math.min(2, Number(parsedUrl.searchParams.get('attempt') || 0)));
      const prevReason = (parsedUrl.searchParams.get('reason') || '').trim();
      if (!libId || !compId) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Missing lib or id');
        return;
      }
      try {
        let detail = null;
        if (libId === 'awesome-components') {
          const catalog = loadAwesomeCatalog(awesomeIndexPath);
          const item = catalog.find((c) => c.id === compId);
          if (!item) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
            return;
          }
          detail = await fetchAwesomeComponentDetail(item, awesomeCacheDir);
        } else {
          const cfg = getRemoteCatalogConfig(libId);
          if (!cfg) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Unknown library');
            return;
          }
          const catalog = loadRemoteCatalog(libId, root);
          const item = catalog.find((c) => c.id === compId);
          if (!item) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
            return;
          }
          detail = await fetchRemoteComponentDetail(libId, item, path.join(root, cfg.cacheRelDir));
        }
        let normalized = normalizeComponentRecord(detail, { libraryId: libId });
        if (attempt > 0) {
          const patched = applyNormalizationAutoFix(normalized, attempt, {
            reasonCode: prevReason || 'RUNTIME_ERROR',
          });
          if (patched) normalized = patched;
        }
        const html = buildInteractivePreviewSrcdoc({
          lib: { id: libId, name: libId },
          element: {
            ...detail,
            ...normalized,
            code: attempt > 0 ? normalized.code : (detail.code || detail.jsxCode || normalized.code),
            demoCode: attempt > 0 ? normalized.demoCode : (detail.demoCode || normalized.demoCode),
          },
          theme: theme === 'light' ? 'light' : 'dark',
          animate: false,
        });
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(html);
        return;
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(String(err?.message || 'Render error'));
        return;
      }
    }

    if (pathname === '/api/web-search') {
      const q = (parsedUrl.searchParams.get('q') || '').trim();
      const limit = Number(parsedUrl.searchParams.get('limit') || 6);
      if (!q) return sendJson(res, 400, { error: 'Missing query parameter q' });
      try {
        const data = await runKeylessWebSearch(q, { limit });
        return sendJson(res, 200, data);
      } catch (err) {
        return sendJson(res, 502, { error: err?.message || 'Web search failed', results: [] });
      }
    }

    if (pathname === '/api/github-skills') {
      const repoUrl = (parsedUrl.searchParams.get('url') || '').trim();
      if (!repoUrl) return sendJson(res, 400, { error: 'Missing query parameter url' });
      try {
        const data = await discoverGitHubSkills(repoUrl);
        return sendJson(res, 200, data);
      } catch (err) {
        return sendJson(res, 400, { error: err?.message || 'GitHub skill discovery failed' });
      }
    }

    if (pathname === '/api/github-ui') {
      const repoUrl = (parsedUrl.searchParams.get('url') || '').trim();
      if (!repoUrl) return sendJson(res, 400, { error: 'Missing query parameter url' });
      try {
        const data = await discoverGitHubUIComponents(repoUrl);
        return sendJson(res, 200, data);
      } catch (err) {
        return sendJson(res, 400, { error: err?.message || 'GitHub UI component discovery failed' });
      }
    }

    if (pathname === '/api/ui-ai-queue') {
      const method = (req.method || 'GET').toUpperCase();
      try {
        if (method === 'GET') {
          const templates = readAiQueueFile(aiQueueFilePath);
          return sendJson(res, 200, { templates, filePath: DEFAULT_AI_QUEUE_REL_PATH });
        }
        if (method === 'POST') {
          const body = await readJsonBody(req);
          const result = addAiTemplateItem(aiQueueFilePath, body);
          return sendJson(res, 201, { ...result, filePath: DEFAULT_AI_QUEUE_REL_PATH });
        }
        if (method === 'PATCH' || method === 'PUT') {
          const body = await readJsonBody(req);
          const result = updateAiTemplateItem(aiQueueFilePath, body.id, body);
          return sendJson(res, 200, { ...result, filePath: DEFAULT_AI_QUEUE_REL_PATH });
        }
        if (method === 'DELETE') {
          const id = (parsedUrl.searchParams.get('id') || '').trim();
          const status = (parsedUrl.searchParams.get('status') || '').trim();
          if (status === 'imported') {
            const result = clearImportedAiTemplateItems(aiQueueFilePath);
            return sendJson(res, 200, { ok: true, ...result, filePath: DEFAULT_AI_QUEUE_REL_PATH });
          }
          if (!id) return sendJson(res, 400, { error: 'Missing id query parameter' });
          const result = deleteAiTemplateItem(aiQueueFilePath, id);
          return sendJson(res, 200, { ok: result.deleted, templates: result.templates, filePath: DEFAULT_AI_QUEUE_REL_PATH });
        }
        return sendJson(res, 405, { error: 'Method not allowed' });
      } catch (err) {
        return sendJson(res, 400, { error: err?.message || 'AI template queue operation failed' });
      }
    }

    if (pathname === '/api/ui-ai-queue/sync' && (req.method || 'GET').toUpperCase() === 'POST') {
      try {
        const body = await readJsonBody(req);
        const incoming = Array.isArray(body?.templates) ? body.templates : [];
        const result = syncAiTemplateItems(aiQueueFilePath, incoming);
        return sendJson(res, 200, { ...result, filePath: DEFAULT_AI_QUEUE_REL_PATH });
      } catch (err) {
        return sendJson(res, 400, { error: err?.message || 'AI template queue sync failed' });
      }
    }

    // ── Unified Multi-Library Remote Catalog API (/api/catalogs/:catalogId) ──
    const catalogRouteMatch = pathname.match(/^\/api\/catalogs\/([a-z0-9-]+)(?:\/(detail|ai-match|issues))?$/);
    if (catalogRouteMatch) {
      const catalogId = catalogRouteMatch[1];
      const subAction = catalogRouteMatch[2] || '';
      const vCache = loadVerificationCache(root);

      if (subAction === 'issues') {
        const stats = getLibraryVerificationStats(vCache, catalogId);
        return sendJson(res, 200, stats);
      }

      if (catalogId === 'awesome-components') {
        if (!subAction) {
          const q = (parsedUrl.searchParams.get('q') || '').trim();
          const category = (parsedUrl.searchParams.get('category') || 'all').trim();
          const page = Number(parsedUrl.searchParams.get('page') || 1);
          const limit = Number(parsedUrl.searchParams.get('limit') || 24);
          const catalog = loadAwesomeCatalog(awesomeIndexPath);
          const verifiedItems = filterCatalogByVerification(catalog, 'awesome-components', vCache, { includeDegraded: true });
          const stats = getLibraryVerificationStats(vCache, 'awesome-components');
          const result = searchAwesomeCatalog(verifiedItems, { q, category, page, limit });
          return sendJson(res, 200, {
            ...result,
            catalogTotal: stats.verifiedCount,
            verifiedCount: stats.verifiedCount,
            degradedCount: stats.degradedCount,
            failedCount: stats.failedCount,
            indexedTotal: catalog.length,
          });
        }
        if (subAction === 'detail') {
          const id = (parsedUrl.searchParams.get('id') || '').trim();
          if (!id) return sendJson(res, 400, { error: 'Missing id query parameter' });
          const catalog = loadAwesomeCatalog(awesomeIndexPath);
          const item = catalog.find((c) => c.id === id);
          if (!item) return sendJson(res, 404, { error: 'Component not found' });
          try {
            const detail = await fetchAwesomeComponentDetail(item, awesomeCacheDir);
            const normalized = normalizeComponentRecord(detail, { libraryId: 'awesome-components', framework: 'html' });
            const cachedEntry = vCache.entries[`awesome-components::${item.id}`] || null;
            return sendJson(res, 200, {
              ...detail,
              manifest: cachedEntry?.manifest || normalized.manifest,
              usageNotes: cachedEntry?.usageNotes || normalized.usageNotes,
              hash: cachedEntry?.hash || normalized.hash,
              verificationStatus: cachedEntry?.status || normalized.status,
              reasonCode: cachedEntry?.reasonCode || normalized.reasonCode,
              reasonMessage: cachedEntry?.reasonMessage || normalized.reasonMessage,
            });
          } catch (err) {
            return sendJson(res, 502, { error: err?.message || 'Failed to fetch component detail' });
          }
        }
      }

      const cfg = getRemoteCatalogConfig(catalogId);
      if (cfg) {
        const catalog = loadRemoteCatalog(catalogId, root);
        const cacheDir = path.join(root, cfg.cacheRelDir);

        if (!subAction) {
          const q = (parsedUrl.searchParams.get('q') || '').trim();
          const category = (parsedUrl.searchParams.get('category') || 'all').trim();
          const collection = (parsedUrl.searchParams.get('collection') || 'all').trim();
          const blockCategory = (parsedUrl.searchParams.get('blockCategory') || 'all').trim();
          const subCategory = (parsedUrl.searchParams.get('subCategory') || 'all').trim();
          const blocksFirst = parsedUrl.searchParams.get('blocksFirst') === '1' || parsedUrl.searchParams.get('blocksFirst') === 'true';
          const page = Number(parsedUrl.searchParams.get('page') || 1);
          const limit = Number(parsedUrl.searchParams.get('limit') || 24);
          const verifiedItems = filterCatalogByVerification(catalog, catalogId, vCache, { includeDegraded: true });
          const stats = getLibraryVerificationStats(vCache, catalogId);
          const result = searchRemoteCatalog(verifiedItems, { q, category, collection, blockCategory, subCategory, blocksFirst, page, limit });
          return sendJson(res, 200, {
            ...result,
            catalogTotal: stats.verifiedCount,
            verifiedCount: stats.verifiedCount,
            degradedCount: stats.degradedCount,
            failedCount: stats.failedCount,
            indexedTotal: catalog.length,
          });
        }

        if (subAction === 'detail') {
          const id = (parsedUrl.searchParams.get('id') || '').trim();
          if (!id) return sendJson(res, 400, { error: 'Missing id query parameter' });
          const item = catalog.find((c) => c.id === id);
          if (!item) return sendJson(res, 404, { error: `${cfg.name} component not found` });
          try {
            const detail = await fetchRemoteComponentDetail(catalogId, item, cacheDir, root);
            const normalized = normalizeComponentRecord(detail, {
              libraryId: catalogId,
              framework: cfg.catalogType === 'html' ? 'html' : 'react',
            });
            const cachedEntry = vCache.entries[`${catalogId}::${item.id}`] || null;
            return sendJson(res, 200, {
              ...detail,
              manifest: cachedEntry?.manifest || normalized.manifest,
              usageNotes: cachedEntry?.usageNotes || normalized.usageNotes,
              hash: cachedEntry?.hash || normalized.hash,
              verificationStatus: cachedEntry?.status || normalized.status,
              reasonCode: cachedEntry?.reasonCode || normalized.reasonCode,
              reasonMessage: cachedEntry?.reasonMessage || normalized.reasonMessage,
            });
          } catch (err) {
            return sendJson(res, 502, { error: err?.message || `Failed to fetch ${cfg.name} detail` });
          }
        }

        if (subAction === 'ai-match') {
          const q = (parsedUrl.searchParams.get('q') || '').trim();
          const limit = Math.max(1, Math.min(4, Number(parsedUrl.searchParams.get('limit') || 2)));
          if (!catalog.length) return sendJson(res, 200, { matches: [], catalogTotal: 0, catalogName: cfg.name });

          const stopWords = new Set(['build', 'create', 'make', 'website', 'webapp', 'page', 'with', 'that', 'this', 'from', 'using', 'modern', 'clean', 'nice', 'good', 'best', 'please', 'want', 'need', 'like', 'style', 'design', 'section', 'component', 'components', 'react', 'tailwind']);
          const keywords = q
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length >= 3 && !stopWords.has(w))
            .slice(0, 5);

          let picks = [];
          for (const kw of keywords) {
            const resSearch = searchRemoteCatalog(catalog, { q: kw, limit: 2 });
            for (const it of resSearch.items) {
              if (!picks.some((p) => p.id === it.id)) picks.push(it);
              if (picks.length >= limit) break;
            }
            if (picks.length >= limit) break;
          }
          if (!picks.length) {
            picks = catalog.slice(0, limit);
          }

          const details = await Promise.all(
            picks.slice(0, limit).map(async (it) => {
              try {
                const d = await fetchRemoteComponentDetail(catalogId, it, cacheDir);
                return {
                  id: d.id,
                  name: d.name,
                  category: d.category,
                  authorName: d.authorName,
                  jsxSnippet: (d.demoCode || d.jsxCode || d.code || '').slice(0, 2200),
                };
              } catch {
                return { id: it.id, name: it.name, category: it.category, authorName: it.authorName, jsxSnippet: '' };
              }
            })
          );
          return sendJson(res, 200, { matches: details, catalogTotal: catalog.length, catalogName: cfg.name });
        }
      }
    }

    if (pathname === '/api/awesome-components') {
      const q = (parsedUrl.searchParams.get('q') || '').trim();
      const category = (parsedUrl.searchParams.get('category') || 'all').trim();
      const page = Number(parsedUrl.searchParams.get('page') || 1);
      const limit = Number(parsedUrl.searchParams.get('limit') || 24);
      const catalog = loadAwesomeCatalog(awesomeIndexPath);
      const vCache = loadVerificationCache(root);
      const verifiedItems = filterCatalogByVerification(catalog, 'awesome-components', vCache, { includeDegraded: true });
      const stats = getLibraryVerificationStats(vCache, 'awesome-components');
      const result = searchAwesomeCatalog(verifiedItems, { q, category, page, limit });
      return sendJson(res, 200, {
        ...result,
        catalogTotal: stats.verifiedCount,
        verifiedCount: stats.verifiedCount,
        degradedCount: stats.degradedCount,
        failedCount: stats.failedCount,
        indexedTotal: catalog.length,
      });
    }

    if (pathname === '/api/awesome-components/detail') {
      const id = (parsedUrl.searchParams.get('id') || '').trim();
      if (!id) return sendJson(res, 400, { error: 'Missing id query parameter' });
      const catalog = loadAwesomeCatalog(awesomeIndexPath);
      const item = catalog.find((c) => c.id === id);
      if (!item) return sendJson(res, 404, { error: 'Awesome component not found' });
      try {
        const detail = await fetchAwesomeComponentDetail(item, awesomeCacheDir);
        const normalized = normalizeComponentRecord(detail, { libraryId: 'awesome-components', framework: 'html' });
        const vCache = loadVerificationCache(root);
        const cachedEntry = vCache.entries[`awesome-components::${item.id}`] || null;
        return sendJson(res, 200, {
          ...detail,
          manifest: cachedEntry?.manifest || normalized.manifest,
          usageNotes: cachedEntry?.usageNotes || normalized.usageNotes,
          hash: cachedEntry?.hash || normalized.hash,
          verificationStatus: cachedEntry?.status || normalized.status,
          reasonCode: cachedEntry?.reasonCode || normalized.reasonCode,
          reasonMessage: cachedEntry?.reasonMessage || normalized.reasonMessage,
        });
      } catch (err) {
        return sendJson(res, 502, { error: err?.message || 'Failed to fetch component detail' });
      }
    }

    if (pathname === '/api/awesome-components/ai-match') {
      const q = (parsedUrl.searchParams.get('q') || '').trim();
      const limit = Math.max(1, Math.min(4, Number(parsedUrl.searchParams.get('limit') || 2)));
      const catalog = loadAwesomeCatalog(awesomeIndexPath);
      if (!catalog.length) return sendJson(res, 200, { matches: [] });

      // Extract high-signal UI keywords from natural language prompt
      const stopWords = new Set(['build', 'create', 'make', 'website', 'webapp', 'page', 'with', 'that', 'this', 'from', 'using', 'modern', 'clean', 'nice', 'good', 'best', 'please', 'want', 'need', 'like', 'style', 'design', 'section', 'component', 'components', 'using', 'react', 'tailwind']);
      const keywords = q
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !stopWords.has(w))
        .slice(0, 5);

      let picks = [];
      for (const kw of keywords) {
        const resSearch = searchAwesomeCatalog(catalog, { q: kw, limit: 2 });
        for (const it of resSearch.items) {
          if (!picks.some((p) => p.id === it.id)) picks.push(it);
          if (picks.length >= limit) break;
        }
        if (picks.length >= limit) break;
      }
      if (!picks.length) {
        picks = searchAwesomeCatalog(catalog, { q: 'hero', limit }).items;
      }

      const details = await Promise.all(
        picks.slice(0, limit).map(async (it) => {
          try {
            const d = await fetchAwesomeComponentDetail(it, awesomeCacheDir);
            return {
              id: d.id,
              name: d.name,
              category: d.category,
              authorName: d.authorName,
              jsxSnippet: (d.jsxCode || '').slice(0, 2200),
            };
          } catch {
            return { id: it.id, name: it.name, category: it.category, authorName: it.authorName, jsxSnippet: '' };
          }
        })
      );
      return sendJson(res, 200, { matches: details, catalogTotal: catalog.length });
    }

    // ── Static files ──
    const isSpaRoute = pathname === '/' || pathname === '/settings' || pathname.startsWith('/settings/');
    let filePath = safeJoin(isSpaRoute ? '/index.html' : pathname);
    if (!filePath) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Fallback for root-relative Watermelon runtime media assets (/content/*, /brand/*, /products/*)
    if (!fs.existsSync(filePath) && /^\/(content|brand|products)\//.test(pathname)) {
      const wmAssetPath = safeJoin(`/vendor/watermelon-runtime${pathname}`);
      if (wmAssetPath && fs.existsSync(wmAssetPath)) {
        filePath = wmAssetPath;
      }
    }

    fs.stat(filePath, (err, stat) => {
      if (!err && stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const isHashedAsset =
          pathname.startsWith('/vendor/watermelon-runtime/assets/') ||
          pathname.startsWith('/vendor/preview-kit/');
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
          'X-Content-Type-Options': 'nosniff',
        });
        res.end(data);
      });
    });
  } catch (err) {
    sendJson(res, 500, { error: err?.message || 'Internal server error' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`WebForge serving ${root}`);
  console.log(`Open http://0.0.0.0:${port}/index.html`);
  console.log(`Built-in free keyless Web Search active at /api/web-search`);
});

server.on('error', (err) => {
  console.error(err.message || err);
  process.exit(1);
});
