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
} from './ai-queue-store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const aiQueueFilePath = path.join(root, DEFAULT_AI_QUEUE_REL_PATH);
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
  const decoded = decodeURIComponent((urlPath || '/').split('?')[0]);
  const cleaned = path.normalize(decoded).replace(/^([/\\])+/, '');
  const full = path.join(root, cleaned);
  if (!full.startsWith(root)) return null;
  return full;
}

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    const pathname = parsedUrl.pathname;

    // ── Built-in API routes (zero API keys required) ──
    if (pathname === '/api/health') {
      return sendJson(res, 200, {
        ok: true,
        webSearch: true,
        githubSkills: true,
        version: '2.0',
      });
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

    // ── Static files ──
    let filePath = safeJoin(pathname === '/' ? '/index.html' : pathname);
    if (!filePath) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
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
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
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
