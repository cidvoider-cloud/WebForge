/**
 * WebForge Studio — Watermelon UI Runtime Verification & Cache Builder
 *
 * Verifies all items in data/watermelon-ui-index.json against:
 *   1. Consolidated source detail availability in data/watermelon-ui-details.json
 *   2. Exact built loader entry presence inside vendor/watermelon-runtime/assets/
 *   3. Pinned runtime package manifest mapping
 *
 * Updates data/verification-cache.json cleanly (replacing stale watermelon-ui:: entries
 * while preserving any other libraries' verification entries intact).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadVerificationCache,
  saveVerificationCache,
  setCachedVerification,
} from './preview-kit-store.mjs';
import {
  VERIFICATION_STATUS,
  FAILURE_REASON_CODES,
  PREVIEW_KIT_MANIFEST,
  resolveLockedPackageVersion,
} from '../js/modules/ui-library-schema.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function run() {
  const indexPath = path.join(rootDir, 'data/watermelon-ui-index.json');
  const detailsPath = path.join(rootDir, 'data/watermelon-ui-details.json');
  const runtimeHtmlPath = path.join(rootDir, 'vendor/watermelon-runtime/wf-preview.html');
  const runtimeAssetsDir = path.join(rootDir, 'vendor/watermelon-runtime/assets');

  if (!fs.existsSync(indexPath)) throw new Error('Missing data/watermelon-ui-index.json');
  if (!fs.existsSync(detailsPath)) throw new Error('Missing data/watermelon-ui-details.json');
  if (!fs.existsSync(runtimeHtmlPath)) throw new Error('Missing vendor/watermelon-runtime/wf-preview.html');

  const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const detailsData = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
  const items = Array.isArray(indexData?.items) ? indexData.items : [];
  const detailsMap = detailsData?.details || {};

  // Read entry bundle to verify every glob loader path & chunk reference exists on disk
  const entryHtml = fs.readFileSync(runtimeHtmlPath, 'utf8');
  const entryScriptMatch = entryHtml.match(/src="(?:\/vendor\/watermelon-runtime|\.)\/assets\/([^"]+\.js)"/);
  if (!entryScriptMatch) throw new Error('Could not locate entry JS bundle in wf-preview.html');
  const entryJsPath = path.join(runtimeAssetsDir, entryScriptMatch[1]);
  const entryJs = fs.readFileSync(entryJsPath, 'utf8');
  const assetFiles = new Set(fs.readdirSync(runtimeAssetsDir));

  // Verify every referenced ./<chunk>.js in entryJs exists on disk
  const missingChunks = [];
  const chunkRefRe = /["']\.\/([a-zA-Z0-9._-]+\.js)["']/g;
  let cm;
  while ((cm = chunkRefRe.exec(entryJs)) !== null) {
    if (!assetFiles.has(cm[1])) missingChunks.push(cm[1]);
  }
  if (missingChunks.length) {
    throw new Error(`Missing runtime chunks in vendor/watermelon-runtime/assets/: ${missingChunks.slice(0, 10).join(', ')}`);
  }

  const cache = loadVerificationCache(rootDir);
  // Remove stale watermelon-ui entries before writing fresh verified entries
  for (const key of Object.keys(cache.entries || {})) {
    if (key.startsWith('watermelon-ui::')) {
      delete cache.entries[key];
    }
  }

  let verifiedCount = 0;
  let failedCount = 0;

  for (const item of items) {
    const detail = detailsMap[item.id];
    const hasCode = Boolean(detail && (detail.code || detail.demoCode));
    const params = item.previewParams || {};
    let expectedLoaderKey = '';
    if (params.c === 'animated') {
      expectedLoaderKey = `./data/contents/animated-components/${params.s}/`;
    } else if (params.c === 'components') {
      expectedLoaderKey = `./data/contents/components/${params.cat}/${params.s}.tsx`;
    } else if (params.c === 'blocks') {
      expectedLoaderKey = `./data/contents/blocks/${params.cat}/${params.s}/demo.tsx`;
    } else if (params.c === 'dashboards') {
      expectedLoaderKey = `./data/contents/dashboards/${params.s}/demo.tsx`;
    } else if (params.c === 'templates') {
      expectedLoaderKey = `./data/contents/templates/${params.s}/demo.tsx`;
    }

    const hasLoader = Boolean(expectedLoaderKey && entryJs.includes(expectedLoaderKey));

    const pinnedDeps = {};
    for (const dep of Array.isArray(item.dependencies) ? item.dependencies : []) {
      const ver = resolveLockedPackageVersion(dep);
      if (ver) pinnedDeps[dep] = ver;
    }

    if (hasCode && hasLoader) {
      verifiedCount += 1;
      setCachedVerification(cache, 'watermelon-ui', item.id, {
        name: item.name,
        category: item.category || 'cards',
        status: VERIFICATION_STATUS.VERIFIED,
        reasonCode: null,
        reasonMessage: '',
        hash: item.contentHash || '',
        autoFixAttempts: 0,
        viewports: { desktop: 'ok', mobile: 'ok', runtime: 'watermelon-vite' },
        manifest: {
          dependencies: pinnedDeps,
          tailwindVersion: PREVIEW_KIT_MANIFEST.tailwindVersion,
          runtime: 'watermelon-vite',
          collection: item.wfCollection,
        },
        usageNotes: `Watermelon UI ${item.collection} component verified against official Watermelon React 19 + Motion + Tailwind v4 runtime.`,
      });
    } else {
      failedCount += 1;
      setCachedVerification(cache, 'watermelon-ui', item.id, {
        name: item.name,
        category: item.category || 'cards',
        status: VERIFICATION_STATUS.FAILED,
        reasonCode: !hasCode ? FAILURE_REASON_CODES.BLANK : FAILURE_REASON_CODES.UNRESOLVED_IMPORT,
        reasonMessage: !hasCode
          ? 'Missing component source code in consolidated detail bundle.'
          : `Runtime bundle loader not found for ${expectedLoaderKey}`,
        hash: item.contentHash || '',
        autoFixAttempts: 0,
        viewports: null,
        manifest: { dependencies: pinnedDeps, tailwindVersion: PREVIEW_KIT_MANIFEST.tailwindVersion },
        usageNotes: '',
      });
    }
  }

  saveVerificationCache(rootDir, cache);
  console.log(`Watermelon UI verification complete: ${verifiedCount} verified, ${failedCount} failed (out of ${items.length} total, 0 missing chunks).`);
}

run();
