/**
 * WebForge Studio — Preview Kit Integrity & Verification Cache Store
 *
 * Manages:
 *   1. Single pinned Preview Kit lockfile validation (vendor/preview-kit/lock.json)
 *      with SHA-256 verification of all local offline runtime assets.
 *   2. Hash-keyed component verification cache (data/verification-cache.json)
 *      invalidated only when the kit lockfile hash or component content hash changes.
 *   3. Per-library verified/degraded/failed stats & issue listings.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  KEEP_INDEXED_LIBRARY_IDS,
  VERIFICATION_STATUS,
} from '../js/modules/ui-library-schema.mjs';

export const PREVIEW_KIT_LOCK_REL_PATH = 'vendor/preview-kit/lock.json';
export const VERIFICATION_CACHE_REL_PATH = 'data/verification-cache.json';

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function readPreviewKitLock(rootDir) {
  const lockPath = path.join(rootDir, PREVIEW_KIT_LOCK_REL_PATH);
  if (!fs.existsSync(lockPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  } catch {
    return null;
  }
}

export function getPreviewKitStatus(rootDir) {
  const lock = readPreviewKitLock(rootDir);
  if (!lock || !lock.runtimeAssets) {
    return {
      ok: false,
      ready: false,
      kitVersion: null,
      lockHash: '',
      tailwindVersion: 4,
      assets: [],
      missingAssets: ['lock.json'],
      corruptedAssets: [],
    };
  }

  const assets = [];
  const missingAssets = [];
  const corruptedAssets = [];

  for (const [pkg, meta] of Object.entries(lock.runtimeAssets)) {
    const rel = String(meta.path || '').replace(/^\/+/, '');
    const abs = path.join(rootDir, rel);
    const exists = fs.existsSync(abs);
    let actualSha = '';
    let sizeBytes = 0;
    let valid = false;

    if (!exists) {
      missingAssets.push(pkg);
    } else {
      try {
        sizeBytes = fs.statSync(abs).size;
        actualSha = sha256File(abs);
        valid = !meta.sha256 || actualSha === meta.sha256;
        if (!valid) corruptedAssets.push(pkg);
      } catch {
        corruptedAssets.push(pkg);
      }
    }

    assets.push({
      package: pkg,
      version: meta.version,
      path: meta.path,
      exists,
      valid,
      sizeBytes,
      expectedSha256: meta.sha256 || '',
      actualSha256: actualSha,
    });
  }

  const wmRuntimeEntry = path.join(rootDir, 'vendor/watermelon-runtime/wf-preview.html');
  const watermelonRuntimeReady = fs.existsSync(wmRuntimeEntry);
  if (!watermelonRuntimeReady) {
    missingAssets.push('watermelon-runtime');
  }

  const ok = missingAssets.length === 0 && corruptedAssets.length === 0;
  return {
    ok,
    ready: ok,
    watermelonRuntimeReady,
    kitVersion: lock.kitVersion || '1.0.0',
    lockHash: lock.lockHash || '',
    tailwindVersion: Number(lock.tailwindVersion || 4),
    packageCount: Object.keys(lock.packages || {}).length,
    assets,
    missingAssets,
    corruptedAssets,
  };
}

export function loadVerificationCache(rootDir) {
  const cachePath = path.join(rootDir, VERIFICATION_CACHE_REL_PATH);
  const lock = readPreviewKitLock(rootDir);
  const lockHash = lock?.lockHash || 'unknown';
  if (!fs.existsSync(cachePath)) {
    return { schemaVersion: 1, kitLockHash: lockHash, updatedAt: null, entries: {} };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || typeof parsed.entries !== 'object') {
      return { schemaVersion: 1, kitLockHash: lockHash, updatedAt: null, entries: {} };
    }
    return {
      schemaVersion: 1,
      kitLockHash: parsed.kitLockHash || lockHash,
      updatedAt: parsed.updatedAt || null,
      entries: parsed.entries || {},
    };
  } catch {
    return { schemaVersion: 1, kitLockHash: lockHash, updatedAt: null, entries: {} };
  }
}

export function saveVerificationCache(rootDir, cache) {
  const cachePath = path.join(rootDir, VERIFICATION_CACHE_REL_PATH);
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  const payload = {
    schemaVersion: 1,
    kitLockHash: cache.kitLockHash || readPreviewKitLock(rootDir)?.lockHash || 'unknown',
    updatedAt: new Date().toISOString(),
    entries: cache.entries || {},
  };
  const tmp = `${cachePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmp, cachePath);
  return payload;
}

export function verificationEntryKey(libraryId, componentId) {
  return `${String(libraryId || '').trim()}::${String(componentId || '').trim()}`;
}

export function getCachedVerification(cache, libraryId, componentId, contentHash = '', lockHash = '') {
  if (!cache || !cache.entries) return null;
  if (lockHash && cache.kitLockHash && cache.kitLockHash !== lockHash) return null;
  const entry = cache.entries[verificationEntryKey(libraryId, componentId)];
  if (!entry) return null;
  if (contentHash && entry.hash && entry.hash !== contentHash) return null;
  return entry;
}

export function setCachedVerification(cache, libraryId, componentId, entry) {
  if (!cache.entries) cache.entries = {};
  cache.entries[verificationEntryKey(libraryId, componentId)] = {
    id: String(componentId || ''),
    library: String(libraryId || ''),
    name: String(entry.name || entry.title || componentId || ''),
    category: String(entry.category || 'cards'),
    status: entry.status || VERIFICATION_STATUS.FAILED,
    reasonCode: entry.reasonCode || null,
    reasonMessage: String(entry.reasonMessage || ''),
    hash: String(entry.hash || ''),
    verifiedAt: entry.verifiedAt || new Date().toISOString(),
    autoFixAttempts: Number(entry.autoFixAttempts || 0),
    viewports: entry.viewports || null,
    manifest: entry.manifest || null,
    usageNotes: String(entry.usageNotes || ''),
  };
  return cache;
}

export function getLibraryVerificationStats(cache, libraryId) {
  const entries = Object.values(cache?.entries || {}).filter((e) => e && e.library === libraryId);
  let verifiedCount = 0;
  let degradedCount = 0;
  let failedCount = 0;
  const reasonCounts = {};
  const issues = [];

  for (const e of entries) {
    if (e.status === VERIFICATION_STATUS.VERIFIED) {
      verifiedCount += 1;
    } else if (e.status === VERIFICATION_STATUS.DEGRADED) {
      degradedCount += 1;
    } else {
      failedCount += 1;
      const rc = e.reasonCode || 'RUNTIME_ERROR';
      reasonCounts[rc] = (reasonCounts[rc] || 0) + 1;
      issues.push({
        id: e.id,
        name: e.name || e.id,
        category: e.category || 'cards',
        status: e.status,
        reasonCode: rc,
        reasonMessage: e.reasonMessage || 'Verification failed',
        verifiedAt: e.verifiedAt || null,
      });
    }
  }

  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reasonCode, count]) => ({ reasonCode, count }));

  return {
    libraryId,
    verifiedCount,
    degradedCount,
    failedCount,
    totalChecked: entries.length,
    topReasons,
    issues: issues.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function getAllLibrariesVerificationSummary(rootDir) {
  const cache = loadVerificationCache(rootDir);
  const byLibrary = {};
  let totalVerified = 0;
  let totalDegraded = 0;
  let totalFailed = 0;

  for (const libId of KEEP_INDEXED_LIBRARY_IDS) {
    const stats = getLibraryVerificationStats(cache, libId);
    byLibrary[libId] = stats;
    totalVerified += stats.verifiedCount;
    totalDegraded += stats.degradedCount;
    totalFailed += stats.failedCount;
  }

  return {
    kitLockHash: cache.kitLockHash,
    updatedAt: cache.updatedAt,
    totalVerified,
    totalDegraded,
    totalFailed,
    libraries: byLibrary,
  };
}

/**
 * Filters a catalog's item list using verification cache results.
 * - Default mode: returns ONLY verified (and optionally degraded) items; hides failed & unverified items.
 * - onlyFailed mode: returns failed items enriched with reasonCode and reasonMessage.
 */
export function filterCatalogByVerification(items = [], libraryId = '', cache = null, {
  includeDegraded = true,
  onlyFailed = false,
} = {}) {
  if (!cache || !cache.entries) return [];
  const out = [];
  for (const item of items) {
    const entry = cache.entries[verificationEntryKey(libraryId, item.id)];
    if (!entry) continue;
    if (onlyFailed) {
      if (entry.status === VERIFICATION_STATUS.FAILED) {
        out.push({
          ...item,
          verificationStatus: entry.status,
          reasonCode: entry.reasonCode,
          reasonMessage: entry.reasonMessage,
          verifiedAt: entry.verifiedAt,
        });
      }
      continue;
    }
    if (
      entry.status === VERIFICATION_STATUS.VERIFIED ||
      (includeDegraded && entry.status === VERIFICATION_STATUS.DEGRADED)
    ) {
      out.push({
        ...item,
        verificationStatus: entry.status,
        reasonCode: entry.reasonCode || null,
        reasonMessage: entry.reasonMessage || '',
        manifest: entry.manifest || null,
        usageNotes: entry.usageNotes || '',
        hash: entry.hash || '',
        verifiedAt: entry.verifiedAt || null,
      });
    }
  }
  return out;
}
