/**
 * WebForge Studio — One-shot GitHub Catalog Index Builder
 *
 * Fetches official repository trees & registries for Kokonut UI, HyperUI,
 * and shadcn/ui and writes compact normalized JSON indexes to data/.
 *
 * Usage: node tools/build-github-catalogs.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  REMOTE_CATALOG_CONFIGS,
  buildKokonutIndexFromTree,
  buildHyperUiIndexFromTree,
  buildShadcnIndexFromTree,
} from './github-catalogs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'WebForge-Studio-Indexer/2.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

async function fetchRepoTreePaths(owner, repo, branch = 'main') {
  const data = await fetchJson(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  );
  return (data?.tree || []).filter((n) => n.type === 'blob').map((n) => n.path);
}

function writeIndex(relPath, meta, items) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    ...meta,
    total: items.length,
    items,
  };
  fs.writeFileSync(fullPath, JSON.stringify(payload), 'utf8');
  console.log(`Wrote ${items.length} items -> ${relPath}`);
}

async function main() {
  // 1. Kokonut UI
  {
    const cfg = REMOTE_CATALOG_CONFIGS['kokonut-ui'];
    const [treePaths, registryJson] = await Promise.all([
      fetchRepoTreePaths(cfg.owner, cfg.repo, cfg.branch),
      fetchJson(`${cfg.rawBase}/registry.json`).catch(() => null),
    ]);
    const items = buildKokonutIndexFromTree(registryJson, treePaths);
    writeIndex(cfg.indexRelPath, { catalogId: cfg.id, repo: `${cfg.owner}/${cfg.repo}`, branch: cfg.branch }, items);
  }

  // 2. HyperUI
  {
    const cfg = REMOTE_CATALOG_CONFIGS.hyperui;
    const treePaths = await fetchRepoTreePaths(cfg.owner, cfg.repo, cfg.branch);
    const items = buildHyperUiIndexFromTree(treePaths);
    writeIndex(cfg.indexRelPath, { catalogId: cfg.id, repo: `${cfg.owner}/${cfg.repo}`, branch: cfg.branch }, items);
  }

  // 3. shadcn/ui
  {
    const cfg = REMOTE_CATALOG_CONFIGS['shadcn-ui'];
    const treePaths = await fetchRepoTreePaths(cfg.owner, cfg.repo, cfg.branch);
    const items = buildShadcnIndexFromTree(treePaths);
    writeIndex(cfg.indexRelPath, { catalogId: cfg.id, repo: `${cfg.owner}/${cfg.repo}`, branch: cfg.branch }, items);
  }
}

main().catch((err) => {
  console.error('Catalog indexing failed:', err?.message || err);
  process.exit(1);
});
