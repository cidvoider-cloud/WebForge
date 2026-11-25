/**
 * WebForge Studio — Component Normalization & Verification Pipeline CLI
 *
 * Modes:
 *   node tools/verify-components.mjs --prepare [--per-lib=20] [--out=/tmp/wf-verify-targets.json]
 *     Pre-warms diverse multi-category components across all 5 kept indexed libraries,
 *     normalizes every cached component, checks the hash-keyed verification cache, and
 *     writes the target list for real headless Chromium verification via playwright-cli.
 *
 *   node tools/verify-components.mjs --apply=/tmp/wf-verify-results.json
 *     Applies real browser verification results into data/verification-cache.json and
 *     prints the per-library summary report (verified / degraded / failed + top reasons).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  KEEP_INDEXED_LIBRARY_IDS,
  VERIFICATION_STATUS,
  FAILURE_REASON_CODES,
} from '../js/modules/ui-library-schema.mjs';
import { normalizeComponentRecord } from '../js/modules/ui-normalizer.mjs';
import {
  AWESOME_INDEX_REL_PATH,
  AWESOME_CACHE_REL_DIR,
  loadAwesomeCatalog,
  fetchAwesomeComponentDetail,
} from './awesome-components.mjs';
import {
  getRemoteCatalogConfig,
  loadRemoteCatalog,
  fetchRemoteComponentDetail,
} from './github-catalogs.mjs';
import {
  readPreviewKitLock,
  loadVerificationCache,
  saveVerificationCache,
  getCachedVerification,
  setCachedVerification,
  getAllLibrariesVerificationSummary,
} from './preview-kit-store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function listCachedIds(cacheDir) {
  if (!fs.existsSync(cacheDir)) return [];
  const ids = [];
  for (const f of fs.readdirSync(cacheDir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(cacheDir, f), 'utf8'));
      if (parsed?.id) {
        ids.push(String(parsed.id));
        continue;
      }
    } catch {
      // Fall back to filename
    }
    ids.push(f.replace(/\.json$/i, '').replace(/__/g, '/'));
  }
  return ids;
}

function pickDiverseItems(catalog, alreadyIds, targetCount) {
  const picked = [];
  const seen = new Set(alreadyIds);
  const byCategory = new Map();
  for (const item of catalog) {
    if (!item?.id || seen.has(item.id)) continue;
    // Skip non-renderable AI resource docs in Watermelon
    if (item.wfCollection === 'resources') continue;
    const cat = item.category || 'cards';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(item);
  }
  const categories = Array.from(byCategory.keys());
  let round = 0;
  while (picked.length + alreadyIds.size < targetCount) {
    let addedInRound = false;
    for (const cat of categories) {
      const list = byCategory.get(cat);
      if (list && list.length > round) {
        const candidate = list[round];
        if (!seen.has(candidate.id)) {
          seen.add(candidate.id);
          picked.push(candidate);
          addedInRound = true;
          if (picked.length + alreadyIds.size >= targetCount) break;
        }
      }
    }
    if (!addedInRound) break;
    round += 1;
  }
  return picked;
}

async function prepareTargets({ perLib = 20, outPath = '/tmp/wf-verify-targets.json', force = false }) {
  const lock = readPreviewKitLock(root);
  const lockHash = lock?.lockHash || 'unknown';
  const cache = loadVerificationCache(root);
  const targets = [];

  for (const libId of KEEP_INDEXED_LIBRARY_IDS) {
    const isAwesome = libId === 'awesome-components';
    const catalog = isAwesome
      ? loadAwesomeCatalog(path.join(root, AWESOME_INDEX_REL_PATH))
      : loadRemoteCatalog(libId, root);
    const cacheDir = isAwesome
      ? path.join(root, AWESOME_CACHE_REL_DIR)
      : path.join(root, getRemoteCatalogConfig(libId).cacheRelDir);

    fs.mkdirSync(cacheDir, { recursive: true });
    const cachedFileIds = new Set(listCachedIds(cacheDir));
    const catalogById = new Map(catalog.map((it) => [it.id, it]));

    // Pre-warm additional diverse multi-category components up to perLib
    if (cachedFileIds.size < perLib) {
      const toWarm = pickDiverseItems(catalog, cachedFileIds, perLib);
      for (const item of toWarm) {
        try {
          if (isAwesome) {
            await fetchAwesomeComponentDetail(item, cacheDir);
          } else {
            await fetchRemoteComponentDetail(libId, item, cacheDir);
          }
          cachedFileIds.add(item.id);
        } catch (err) {
          console.error(`[warm-skip] ${libId}/${item.id}: ${err?.message || err}`);
        }
      }
    }

    // Collect every cached component belonging to the catalog
    for (const compId of cachedFileIds) {
      const item = catalogById.get(compId);
      if (!item) continue;
      let detail = null;
      try {
        detail = isAwesome
          ? await fetchAwesomeComponentDetail(item, cacheDir)
          : await fetchRemoteComponentDetail(libId, item, cacheDir);
      } catch {
        continue;
      }

      const normalized = normalizeComponentRecord(detail, { libraryId: libId });
      const cachedHit = !force
        ? getCachedVerification(cache, libId, compId, normalized.hash, lockHash)
        : null;

      targets.push({
        libraryId: libId,
        id: compId,
        name: normalized.title || item.name || compId,
        category: normalized.category || item.category || 'cards',
        hash: normalized.hash,
        cachedHit: Boolean(cachedHit),
        staticStatus: normalized.status || VERIFICATION_STATUS.VERIFIED,
        staticReasonCode: normalized.reasonCode || null,
        staticReasonMessage: normalized.reasonMessage || '',
        manifest: normalized.manifest,
        usageNotes: normalized.usageNotes,
        isHtml: libId === 'hyperui' || libId === 'awesome-components',
      });
    }
  }

  fs.writeFileSync(outPath, JSON.stringify({ lockHash, count: targets.length, targets }, null, 2), 'utf8');
  console.log(`Prepared ${targets.length} verification targets across ${KEEP_INDEXED_LIBRARY_IDS.length} libraries -> ${outPath}`);
  return targets;
}

function applyResults(resultsPath) {
  const raw = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const results = Array.isArray(raw) ? raw : Array.isArray(raw.results) ? raw.results : [];
  const lock = readPreviewKitLock(root);
  const cache = loadVerificationCache(root);
  cache.kitLockHash = lock?.lockHash || cache.kitLockHash;

  for (const r of results) {
    if (!r || !r.libraryId || !r.id) continue;
    let status = r.status || VERIFICATION_STATUS.FAILED;
    let reasonCode = r.reasonCode || null;
    let reasonMessage = r.reasonMessage || '';

    if (
      status !== VERIFICATION_STATUS.VERIFIED &&
      status !== VERIFICATION_STATUS.DEGRADED &&
      status !== VERIFICATION_STATUS.FAILED
    ) {
      status = VERIFICATION_STATUS.FAILED;
    }
    if (status === VERIFICATION_STATUS.FAILED && !reasonCode) {
      reasonCode = FAILURE_REASON_CODES.RUNTIME_ERROR;
    }

    setCachedVerification(cache, r.libraryId, r.id, {
      name: r.name || r.id,
      category: r.category || 'cards',
      status,
      reasonCode,
      reasonMessage,
      hash: r.hash || '',
      autoFixAttempts: Number(r.autoFixAttempts || 0),
      viewports: r.viewports || null,
      manifest: r.manifest || null,
      usageNotes: r.usageNotes || '',
    });
  }

  saveVerificationCache(root, cache);
  const summary = getAllLibrariesVerificationSummary(root);

  console.log('\n=== Component Verification Summary ===');
  console.log('| Library | Checked | Verified | Degraded | Failed | Top Failure Reasons |');
  console.log('|---|---:|---:|---:|---:|---|');
  for (const libId of KEEP_INDEXED_LIBRARY_IDS) {
    const s = summary.libraries[libId];
    const reasons = s.topReasons.length
      ? s.topReasons.map((x) => `${x.reasonCode} (${x.count})`).join(', ')
      : 'None';
    console.log(`| ${libId} | ${s.totalChecked} | ${s.verifiedCount} | ${s.degradedCount} | ${s.failedCount} | ${reasons} |`);
  }
  console.log(`Total: ${summary.totalVerified} verified / ${summary.totalDegraded} degraded / ${summary.totalFailed} failed`);
  return summary;
}

const args = process.argv.slice(2);
const prepareFlag = args.includes('--prepare');
const forceFlag = args.includes('--force');
const applyArg = args.find((a) => a.startsWith('--apply='));
const perLibArg = args.find((a) => a.startsWith('--per-lib='));
const outArg = args.find((a) => a.startsWith('--out='));

if (prepareFlag) {
  const perLib = perLibArg ? Math.max(5, Number(perLibArg.split('=')[1]) || 20) : 20;
  const outPath = outArg ? outArg.split('=')[1] : '/tmp/wf-verify-targets.json';
  await prepareTargets({ perLib, outPath, force: forceFlag });
} else if (applyArg) {
  const resultsPath = applyArg.split('=')[1];
  applyResults(resultsPath);
} else {
  console.log('Usage: node tools/verify-components.mjs --prepare [--per-lib=20] | --apply=/tmp/wf-verify-results.json');
}
