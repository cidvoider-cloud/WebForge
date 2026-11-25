/**
 * WebForge Studio — Startup Preflight Check, Auto-Downloader & Error Reporter
 *
 * Called automatically by start.bat (or `node tools/preflight-check.mjs --repair`).
 *
 * Phase 1 — Verify & Auto-Download / Repair:
 *   1. Core App & UI Files (HTML, CSS, ES modules, Settings UI, Server tools)
 *   2. Node.js Runtime & package.json npm Dependencies (runs `npm install` if missing)
 *   3. Local UI Preview Kit Runtime (SHA-256 verified Tailwind v4, React, ReactDOM, Babel + Lucide offline backup;
 *      auto-downloads missing or corrupted files from pinned CDN mirrors)
 *   4. Watermelon UI Library Catalog & Live Runtime (849 items index, consolidated details,
 *      wf-preview.html, all referenced JS/CSS chunks, media assets, and verification cache;
 *      auto-rebuilds verification-cache.json if missing/stale)
 *   5. Optional External Connectivity Check (Google Fonts / Free Web Search)
 *
 * Phase 2 — Structured Errors Section:
 *   Prints a clear, numbered ERRORS section with error codes, what auto-fix tried,
 *   and exact recovery instructions, and writes logs/startup-errors.log on failure.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROOT_DIR = path.resolve(__dirname, '..');

export const MIN_NODE_MAJOR = 18;

export const REQUIRED_APP_FILES = [
  // Entry & metadata
  'index.html',
  'package.json',
  'metadata.json',
  // Stylesheets (UI)
  'css/app.css',
  'css/prompt-builder.css',
  'css/settings.css',
  // Core app entry & modules
  'js/main.mjs',
  'js/modules/agent-activity.mjs',
  'js/modules/checkpoints.mjs',
  'js/modules/context-budget.mjs',
  'js/modules/demo-car.mjs',
  'js/modules/demo-ceramic.mjs',
  'js/modules/demo-luxury.mjs',
  'js/modules/demo-saas.mjs',
  'js/modules/demos.mjs',
  'js/modules/diff.mjs',
  'js/modules/kubai-icons.mjs',
  'js/modules/motion.mjs',
  'js/modules/pb-wireframes.mjs',
  'js/modules/plan-mode.mjs',
  'js/modules/preview.mjs',
  'js/modules/prompt-builder.mjs',
  'js/modules/prompt-validator.mjs',
  'js/modules/providers.mjs',
  'js/modules/section-swap-modal.mjs',
  'js/modules/section-swap.mjs',
  'js/modules/skills.mjs',
  'js/modules/storage.mjs',
  'js/modules/stream-parser.mjs',
  'js/modules/studio.mjs',
  'js/modules/sub-agents.mjs',
  'js/modules/thumbnails.mjs',
  'js/modules/ui-library-21st.mjs',
  'js/modules/ui-library-modal.mjs',
  'js/modules/ui-library-packs.mjs',
  'js/modules/ui-library-schema.mjs',
  'js/modules/ui-library.mjs',
  'js/modules/ui-normalizer.mjs',
  'js/modules/ui-preview-builder.mjs',
  'js/modules/ui-tsx-sandbox.mjs',
  'js/modules/watermelon-ecosystem.mjs',
  'js/modules/web-search.mjs',
  'js/modules/zip-export.mjs',
  // Settings UI primitives
  'src/components/settings/index.mjs',
  'src/components/settings/primitives.mjs',
  'src/components/settings/settings-data.mjs',
  // Server & catalog engine
  'tools/serve.mjs',
  'tools/search-engine.mjs',
  'tools/github-catalogs.mjs',
  'tools/preview-kit-store.mjs',
  'tools/awesome-components.mjs',
  'tools/ai-queue-store.mjs',
  'tools/verify-watermelon-runtime.mjs',
];

export const PREVIEW_KIT_CANONICAL_LOCK = {
  schemaVersion: 1,
  kitVersion: '1.0.0',
  tailwindVersion: 4,
  lockHash: 'pk-v1-tw4111-r1831-b72610',
  runtimeAssets: {
    '@tailwindcss/browser': {
      version: '4.1.11',
      path: '/vendor/preview-kit/tailwind-browser.js',
      sha256: '7933e213b39f3434b04eb24d219f279596a9c7d9f7833f7e3a8db3cebe7e69d3',
    },
    react: {
      version: '18.3.1',
      path: '/vendor/preview-kit/react.production.min.js',
      sha256: 'd949f1c3687aedadcedac85261865f29b17cd273997e7f6b2bfc53b2f9d4c4dd',
    },
    'react-dom': {
      version: '18.3.1',
      path: '/vendor/preview-kit/react-dom.production.min.js',
      sha256: '35f4f974f4b2bcd44da73963347f8952e341f83909e4498227d4e26b98f66f0d',
    },
    '@babel/standalone': {
      version: '7.26.10',
      path: '/vendor/preview-kit/babel.min.js',
      sha256: '7acf405141ca9e611b6d40aeef52071432d5f387cf906fc3556fb9f0b1a28601',
    },
  },
};

export const PREVIEW_KIT_DOWNLOAD_MIRRORS = {
  '@tailwindcss/browser': [
    'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.1.11/dist/index.global.js',
    'https://unpkg.com/@tailwindcss/browser@4.1.11/dist/index.global.js',
  ],
  react: [
    'https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js',
    'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
  ],
  'react-dom': [
    'https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js',
    'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
  ],
  '@babel/standalone': [
    'https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.10/babel.min.js',
    'https://unpkg.com/@babel/standalone@7.26.10/babel.min.js',
  ],
  lucide: [
    'https://cdn.jsdelivr.net/npm/lucide@0.460.0/dist/umd/lucide.min.js',
    'https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js',
  ],
};

export function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function makeError({ code, category, title, detail, attemptedFix = 'None', howToFix }) {
  return {
    code: String(code || 'ERR_UNKNOWN'),
    category: String(category || 'General'),
    title: String(title || 'Startup check failed'),
    detail: String(detail || ''),
    attemptedFix: String(attemptedFix || 'None'),
    howToFix: String(howToFix || 'Re-download WebForge completely and run start.bat again.'),
  };
}

function makeWarning({ code, category, message }) {
  return {
    code: String(code || 'WARN_GENERAL'),
    category: String(category || 'General'),
    message: String(message || ''),
  };
}

/**
 * Downloads a file from an ordered list of mirror URLs, optionally verifying SHA-256,
 * and writes it atomically to targetPath.
 */
export async function downloadWithMirrors(mirrors, targetPath, {
  expectedSha256 = '',
  minBytes = 256,
  timeoutMs = 20000,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    return { ok: false, error: 'Fetch API is unavailable in this Node.js runtime.' };
  }
  const attempts = [];
  for (const url of mirrors) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'WebForge-Preflight/1.0' },
      });
      if (!res.ok) {
        attempts.push(`${url} -> HTTP ${res.status}`);
        continue;
      }
      const arrBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrBuf);
      if (buf.length < minBytes) {
        attempts.push(`${url} -> response too small (${buf.length} bytes)`);
        continue;
      }
      const actualSha = sha256Buffer(buf);
      if (expectedSha256 && actualSha !== expectedSha256) {
        attempts.push(`${url} -> SHA-256 mismatch (expected ${expectedSha256.slice(0, 12)}, got ${actualSha.slice(0, 12)})`);
        continue;
      }
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      const tmpPath = `${targetPath}.tmp`;
      fs.writeFileSync(tmpPath, buf);
      fs.renameSync(tmpPath, targetPath);
      return { ok: true, url, sizeBytes: buf.length, sha256: actualSha };
    } catch (err) {
      attempts.push(`${url} -> ${err?.name === 'AbortError' ? 'timeout' : (err?.message || String(err))}`);
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    ok: false,
    error: attempts.join(' | ') || 'No download mirrors available',
  };
}

/**
 * 1) Checks every required core app, CSS, JS module, Settings UI, and server file.
 */
export function checkCoreAppFiles(rootDir, requiredFiles = REQUIRED_APP_FILES) {
  const missing = [];
  const empty = [];
  const invalidJson = [];

  for (const rel of requiredFiles) {
    const abs = path.join(rootDir, rel);
    if (!fs.existsSync(abs)) {
      missing.push(rel);
      continue;
    }
    try {
      const stat = fs.statSync(abs);
      if (!stat.isFile() || stat.size === 0) {
        empty.push(rel);
        continue;
      }
      if (rel.endsWith('.json')) {
        JSON.parse(fs.readFileSync(abs, 'utf8'));
      }
    } catch {
      invalidJson.push(rel);
    }
  }

  const errors = [];
  if (missing.length > 0) {
    errors.push(
      makeError({
        code: 'ERR_APP_FILES_MISSING',
        category: 'App Files',
        title: `${missing.length} required WebForge file${missing.length === 1 ? '' : 's'} missing`,
        detail: `Missing: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ` (+${missing.length - 10} more)` : ''}`,
        attemptedFix: 'Core source files cannot be downloaded automatically without the full project archive.',
        howToFix: 'Re-download or re-extract the complete WebForge ZIP/repository so all folders (css, js, src, tools, data, vendor) are intact.',
      })
    );
  }
  if (empty.length > 0) {
    errors.push(
      makeError({
        code: 'ERR_APP_FILES_TRUNCATED',
        category: 'App Files',
        title: `${empty.length} WebForge file${empty.length === 1 ? '' : 's'} empty or incomplete (0 bytes)`,
        detail: `Empty files: ${empty.slice(0, 10).join(', ')}`,
        attemptedFix: 'Verified file sizes on disk.',
        howToFix: 'Your download or extraction was interrupted. Re-extract the WebForge archive and run start.bat again.',
      })
    );
  }
  if (invalidJson.length > 0) {
    errors.push(
      makeError({
        code: 'ERR_APP_JSON_CORRUPT',
        category: 'App Files',
        title: `Corrupted JSON configuration file${invalidJson.length === 1 ? '' : 's'}`,
        detail: `Invalid JSON: ${invalidJson.join(', ')}`,
        attemptedFix: 'Validated JSON syntax.',
        howToFix: 'Restore the original JSON files from the WebForge download archive.',
      })
    );
  }

  return {
    ok: errors.length === 0,
    checkedCount: requiredFiles.length,
    missing,
    empty,
    invalidJson,
    errors,
  };
}

/**
 * 2) Checks Node.js version and package.json npm dependencies (auto-runs npm install if needed).
 */
export function checkAndRepairAppDependencies(rootDir, {
  repair = true,
  nodeVersion = process.versions.node,
  runCommand = spawnSync,
} = {}) {
  const errors = [];
  const fixed = [];
  const major = Number(String(nodeVersion || '0').split('.')[0]);

  if (!Number.isFinite(major) || major < MIN_NODE_MAJOR) {
    errors.push(
      makeError({
        code: 'ERR_NODE_VERSION',
        category: 'Dependencies',
        title: `Node.js ${MIN_NODE_MAJOR}+ is required (found v${nodeVersion || 'unknown'})`,
        detail: 'WebForge server and Watermelon UI APIs require Node.js 18 or newer.',
        attemptedFix: 'Checked current Node.js runtime version.',
        howToFix: 'Install Node.js LTS (v20+) from https://nodejs.org, reopen your terminal, and run start.bat again.',
      })
    );
  }

  const pkgPath = path.join(rootDir, 'package.json');
  let declaredDeps = [];
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      declaredDeps = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
      ];
    } catch {
      // Reported by checkCoreAppFiles
    }
  }

  const findMissingPackages = () =>
    declaredDeps.filter((name) => !fs.existsSync(path.join(rootDir, 'node_modules', name, 'package.json')));

  let missingPackages = findMissingPackages();
  if (missingPackages.length > 0 && repair) {
    const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const res = runCommand(npmBin, ['install', '--no-audit', '--no-fund'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: 'pipe',
      shell: process.platform === 'win32',
    });
    const remaining = findMissingPackages();
    if (res.status === 0 && remaining.length === 0) {
      fixed.push(`Installed ${missingPackages.length} npm package(s) via npm install`);
      missingPackages = [];
    } else {
      const stderrSnippet = String(res.stderr || res.error?.message || '').trim().slice(0, 220);
      errors.push(
        makeError({
          code: 'ERR_NPM_DEPS_INSTALL',
          category: 'Dependencies',
          title: `Failed to install ${remaining.length} required npm package${remaining.length === 1 ? '' : 's'}`,
          detail: `Missing: ${remaining.slice(0, 8).join(', ')}${stderrSnippet ? ` (${stderrSnippet})` : ''}`,
          attemptedFix: 'Ran `npm install --no-audit --no-fund` automatically.',
          howToFix: 'Check your internet connection and run `npm install` manually inside the WebForge folder.',
        })
      );
    }
  } else if (missingPackages.length > 0) {
    errors.push(
      makeError({
        code: 'ERR_NPM_DEPS_MISSING',
        category: 'Dependencies',
        title: `${missingPackages.length} npm package${missingPackages.length === 1 ? '' : 's'} not installed`,
        detail: `Missing: ${missingPackages.slice(0, 8).join(', ')}`,
        attemptedFix: 'Check-only mode (auto-install skipped).',
        howToFix: 'Run `npm install` or start.bat with auto-repair enabled.',
      })
    );
  }

  return {
    ok: errors.length === 0,
    nodeVersion,
    declaredCount: declaredDeps.length,
    missingPackages,
    fixed,
    errors,
  };
}

/**
 * 3) Checks UI Preview Kit runtime files (lock.json + SHA-256 verified assets + Lucide icon library)
 *    and automatically downloads/repairs missing or corrupted files from pinned CDN mirrors.
 */
export async function checkAndRepairPreviewKit(rootDir, {
  repair = true,
  fetchImpl = globalThis.fetch,
  log = () => {},
} = {}) {
  const errors = [];
  const warnings = [];
  const fixed = [];

  const lockPath = path.join(rootDir, 'vendor/preview-kit/lock.json');
  let lock = null;

  if (fs.existsSync(lockPath)) {
    try {
      lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    } catch {
      lock = null;
    }
  }

  if (!lock || !lock.runtimeAssets) {
    if (repair) {
      try {
        fs.mkdirSync(path.dirname(lockPath), { recursive: true });
        fs.writeFileSync(lockPath, JSON.stringify(PREVIEW_KIT_CANONICAL_LOCK, null, 2), 'utf8');
        lock = PREVIEW_KIT_CANONICAL_LOCK;
        fixed.push('Restored missing/corrupted vendor/preview-kit/lock.json');
      } catch (err) {
        errors.push(
          makeError({
            code: 'ERR_PREVIEW_KIT_LOCK',
            category: 'UI Preview Kit',
            title: 'Could not restore vendor/preview-kit/lock.json',
            detail: err?.message || 'Write failed',
            attemptedFix: 'Tried regenerating vendor/preview-kit/lock.json from pinned manifest.',
            howToFix: 'Check folder write permissions in the WebForge directory and run start.bat again.',
          })
        );
        return { ok: false, checkedAssets: 0, fixed, warnings, errors };
      }
    } else {
      errors.push(
        makeError({
          code: 'ERR_PREVIEW_KIT_LOCK',
          category: 'UI Preview Kit',
          title: 'Missing or invalid vendor/preview-kit/lock.json',
          detail: 'Preview Kit lockfile is missing or corrupted.',
          attemptedFix: 'Check-only mode.',
          howToFix: 'Run `node tools/preflight-check.mjs --repair` or start.bat.',
        })
      );
      return { ok: false, checkedAssets: 0, fixed, warnings, errors };
    }
  }

  const runtimeEntries = Object.entries(lock.runtimeAssets);
  for (const [pkg, meta] of runtimeEntries) {
    const rel = String(meta.path || '').replace(/^\/+/, '');
    const abs = path.join(rootDir, rel);
    const expectedSha = String(meta.sha256 || '');

    let issue = '';
    if (!fs.existsSync(abs)) {
      issue = 'missing';
    } else {
      try {
        const size = fs.statSync(abs).size;
        if (size === 0) {
          issue = 'empty (0 bytes)';
        } else if (expectedSha && sha256File(abs) !== expectedSha) {
          issue = 'corrupted (SHA-256 mismatch)';
        }
      } catch {
        issue = 'unreadable';
      }
    }

    if (!issue) continue;

    const mirrors = PREVIEW_KIT_DOWNLOAD_MIRRORS[pkg] || [];
    if (repair && mirrors.length > 0) {
      log(`  [FIX] Preview Kit "${pkg}" is ${issue}. Downloading from pinned CDN...`);
      const dl = await downloadWithMirrors(mirrors, abs, {
        expectedSha256: expectedSha,
        fetchImpl,
      });
      if (dl.ok) {
        fixed.push(`Downloaded & SHA-256 verified ${rel} (${pkg}@${meta.version})`);
        continue;
      }
      errors.push(
        makeError({
          code: 'ERR_PREVIEW_KIT_DOWNLOAD',
          category: 'UI Preview Kit',
          title: `Failed to download required UI runtime asset: ${pkg}@${meta.version}`,
          detail: `File ${rel} was ${issue}. Download attempts failed: ${dl.error}`,
          attemptedFix: `Tried downloading from ${mirrors.join(' and ')} with SHA-256 verification.`,
          howToFix: `Check your internet/firewall access to cdn.jsdelivr.net or unpkg.com, or manually save ${mirrors[0]} to ${rel}.`,
        })
      );
    } else {
      errors.push(
        makeError({
          code: 'ERR_PREVIEW_KIT_ASSET',
          category: 'UI Preview Kit',
          title: `Required UI runtime asset ${pkg} is ${issue}`,
          detail: `Expected verified file at ${rel}.`,
          attemptedFix: repair ? 'No CDN mirror configured for this asset.' : 'Check-only mode.',
          howToFix: 'Run start.bat with internet access so WebForge can automatically repair vendor/preview-kit.',
        })
      );
    }
  }

  // Offline Lucide UI icon library backup (used automatically if unpkg CDN is blocked/offline)
  const lucideRel = 'vendor/preview-kit/lucide.min.js';
  const lucideAbs = path.join(rootDir, lucideRel);
  const lucideOk = fs.existsSync(lucideAbs) && fs.statSync(lucideAbs).size > 10000;
  if (!lucideOk && repair) {
    log('  [FIX] Downloading offline UI icon library backup (lucide.min.js)...');
    const dl = await downloadWithMirrors(PREVIEW_KIT_DOWNLOAD_MIRRORS.lucide, lucideAbs, {
      minBytes: 10000,
      fetchImpl,
    });
    if (dl.ok) {
      fixed.push('Downloaded offline Lucide icon backup (vendor/preview-kit/lucide.min.js)');
    } else {
      warnings.push(
        makeWarning({
          code: 'WARN_LUCIDE_OFFLINE_BACKUP',
          category: 'UI Icons',
          message: 'Could not download offline Lucide icon backup (icons will load from CDN when online).',
        })
      );
    }
  }

  return {
    ok: errors.length === 0,
    checkedAssets: runtimeEntries.length,
    fixed,
    warnings,
    errors,
  };
}

/**
 * 4) Checks Watermelon UI Library catalog JSONs, compiled Watermelon Vite runtime bundle,
 *    referenced chunks, media directories, and verification cache.
 *    Auto-rebuilds data/verification-cache.json if missing or out of sync.
 */
export function checkAndRepairWatermelonLibrary(rootDir, {
  repair = true,
  runCommand = spawnSync,
  log = () => {},
} = {}) {
  const errors = [];
  const warnings = [];
  const fixed = [];

  const indexRel = 'data/watermelon-ui-index.json';
  const detailsRel = 'data/watermelon-ui-details.json';
  const cacheRel = 'data/verification-cache.json';
  const runtimeHtmlRel = 'vendor/watermelon-runtime/wf-preview.html';
  const runtimeAssetsDir = path.join(rootDir, 'vendor/watermelon-runtime/assets');

  let indexItems = [];
  let detailsCount = 0;

  // 4a. Check catalog index JSON
  const indexAbs = path.join(rootDir, indexRel);
  if (!fs.existsSync(indexAbs) || fs.statSync(indexAbs).size === 0) {
    errors.push(
      makeError({
        code: 'ERR_WATERMELON_INDEX_MISSING',
        category: 'Watermelon UI Library',
        title: 'Watermelon UI catalog index is missing or empty',
        detail: `Missing or empty file: ${indexRel}`,
        attemptedFix: 'Checked data/watermelon-ui-index.json on disk.',
        howToFix: 'Re-download the complete WebForge archive (making sure the `data/` folder is included) and run start.bat again.',
      })
    );
  } else {
    try {
      const parsed = JSON.parse(fs.readFileSync(indexAbs, 'utf8'));
      indexItems = Array.isArray(parsed?.items) ? parsed.items : [];
      if (indexItems.length === 0) {
        errors.push(
          makeError({
            code: 'ERR_WATERMELON_INDEX_EMPTY',
            category: 'Watermelon UI Library',
            title: 'Watermelon UI catalog index contains 0 items',
            detail: `${indexRel} parsed as JSON but has no items.`,
            attemptedFix: 'Validated catalog item array.',
            howToFix: 'Restore data/watermelon-ui-index.json from the WebForge release archive.',
          })
        );
      }
    } catch (err) {
      errors.push(
        makeError({
          code: 'ERR_WATERMELON_INDEX_CORRUPT',
          category: 'Watermelon UI Library',
          title: 'Watermelon UI catalog index is corrupted',
          detail: `Failed to parse ${indexRel}: ${err?.message || 'invalid JSON'}`,
          attemptedFix: 'Parsed JSON to verify integrity.',
          howToFix: 'Re-download or re-extract data/watermelon-ui-index.json cleanly.',
        })
      );
    }
  }

  // 4b. Check consolidated TSX/Demo/Prompt details bundle
  const detailsAbs = path.join(rootDir, detailsRel);
  if (!fs.existsSync(detailsAbs) || fs.statSync(detailsAbs).size === 0) {
    errors.push(
      makeError({
        code: 'ERR_WATERMELON_DETAILS_MISSING',
        category: 'Watermelon UI Library',
        title: 'Watermelon UI source code bundle is missing or empty',
        detail: `Missing or empty file: ${detailsRel} (~17 MB consolidated component TSX/demo bundle).`,
        attemptedFix: 'Checked data/watermelon-ui-details.json on disk.',
        howToFix: 'Ensure the full `data/watermelon-ui-details.json` file finished downloading/extracting, then run start.bat again.',
      })
    );
  } else {
    try {
      const parsed = JSON.parse(fs.readFileSync(detailsAbs, 'utf8'));
      detailsCount = Object.keys(parsed?.details || {}).length;
      if (detailsCount === 0) {
        errors.push(
          makeError({
            code: 'ERR_WATERMELON_DETAILS_EMPTY',
            category: 'Watermelon UI Library',
            title: 'Watermelon UI source code bundle is empty',
            detail: `${detailsRel} contains 0 component entries.`,
            attemptedFix: 'Validated details map.',
            howToFix: 'Restore data/watermelon-ui-details.json from the WebForge archive.',
          })
        );
      }
    } catch (err) {
      errors.push(
        makeError({
          code: 'ERR_WATERMELON_DETAILS_CORRUPT',
          category: 'Watermelon UI Library',
          title: 'Watermelon UI source code bundle is truncated or corrupted',
          detail: `Failed to parse ${detailsRel}: ${err?.message || 'invalid JSON'}`,
          attemptedFix: 'Parsed JSON to verify download completeness.',
          howToFix: 'Your download of data/watermelon-ui-details.json was cut short. Re-download the WebForge archive and extract it again.',
        })
      );
    }
  }

  // 4c. Check compiled Watermelon Vite live preview runtime & every referenced JS/CSS chunk
  const runtimeHtmlAbs = path.join(rootDir, runtimeHtmlRel);
  let runtimeOk = true;
  if (!fs.existsSync(runtimeHtmlAbs) || !fs.existsSync(runtimeAssetsDir)) {
    runtimeOk = false;
    errors.push(
      makeError({
        code: 'ERR_WATERMELON_RUNTIME_MISSING',
        category: 'Watermelon UI Library',
        title: 'Watermelon UI live preview runtime bundle is missing',
        detail: `Expected ${runtimeHtmlRel} and vendor/watermelon-runtime/assets/ directory.`,
        attemptedFix: 'Checked vendor/watermelon-runtime/ bundle on disk.',
        howToFix: 'Re-extract the complete `vendor/watermelon-runtime/` folder from the WebForge download archive.',
      })
    );
  } else {
    const html = fs.readFileSync(runtimeHtmlAbs, 'utf8');
    const missingAssets = [];

    // Every script src, modulepreload href, and stylesheet href in wf-preview.html
    const refRe = /(?:src|href)="(?:\/vendor\/watermelon-runtime|\.)\/assets\/([^"]+)"/g;
    let m;
    let entryJsFile = '';
    while ((m = refRe.exec(html)) !== null) {
      const assetName = m[1];
      if (!entryJsFile && assetName.startsWith('preview-') && assetName.endsWith('.js')) {
        entryJsFile = assetName;
      }
      const assetAbs = path.join(runtimeAssetsDir, assetName);
      if (!fs.existsSync(assetAbs) || fs.statSync(assetAbs).size === 0) {
        missingAssets.push(assetName);
      }
    }

    if (!entryJsFile) {
      runtimeOk = false;
      errors.push(
        makeError({
          code: 'ERR_WATERMELON_RUNTIME_ENTRY',
          category: 'Watermelon UI Library',
          title: 'Watermelon runtime entry script not found in wf-preview.html',
          detail: `${runtimeHtmlRel} is missing its compiled preview-*.js script tag.`,
          attemptedFix: 'Inspected wf-preview.html asset references.',
          howToFix: 'Restore vendor/watermelon-runtime/ from the complete WebForge archive.',
        })
      );
    } else {
      const entryJsAbs = path.join(runtimeAssetsDir, entryJsFile);
      if (fs.existsSync(entryJsAbs) && fs.statSync(entryJsAbs).size > 0) {
        const entryJs = fs.readFileSync(entryJsAbs, 'utf8');
        const onDisk = new Set(fs.readdirSync(runtimeAssetsDir));
        const chunkRe = /["']\.\/([a-zA-Z0-9._-]+\.js)["']/g;
        let cm;
        while ((cm = chunkRe.exec(entryJs)) !== null) {
          const chunkName = cm[1];
          const chunkAbs = path.join(runtimeAssetsDir, chunkName);
          if (!onDisk.has(chunkName) || !fs.existsSync(chunkAbs) || fs.statSync(chunkAbs).size === 0) {
            if (!missingAssets.includes(chunkName)) missingAssets.push(chunkName);
          }
        }
      }
    }

    if (missingAssets.length > 0) {
      runtimeOk = false;
      errors.push(
        makeError({
          code: 'ERR_WATERMELON_CHUNKS_MISSING',
          category: 'Watermelon UI Library',
          title: `${missingAssets.length} Watermelon UI runtime chunk${missingAssets.length === 1 ? '' : 's'} missing or empty`,
          detail: `Missing in vendor/watermelon-runtime/assets/: ${missingAssets.slice(0, 8).join(', ')}${missingAssets.length > 8 ? ` (+${missingAssets.length - 8} more)` : ''}`,
          attemptedFix: 'Verified all JS/CSS chunks referenced by wf-preview.html and its entry bundle.',
          howToFix: 'Your download or extraction of vendor/watermelon-runtime/assets/ was incomplete. Re-extract the full folder and run start.bat again.',
        })
      );
    }

    // Check media folders (brand, content, products)
    for (const mediaSub of ['brand', 'content', 'products']) {
      const dirAbs = path.join(rootDir, 'vendor/watermelon-runtime', mediaSub);
      if (!fs.existsSync(dirAbs) || fs.readdirSync(dirAbs).length === 0) {
        warnings.push(
          makeWarning({
            code: 'WARN_WATERMELON_MEDIA',
            category: 'Watermelon UI Library',
            message: `Optional template/block media folder vendor/watermelon-runtime/${mediaSub}/ is missing or empty.`,
          })
        );
      }
    }
  }

  // 4d. Check verification-cache.json & auto-rebuild via verify-watermelon-runtime.mjs if missing/stale
  const cacheAbs = path.join(rootDir, cacheRel);
  const countVerifiedWatermelon = () => {
    if (!fs.existsSync(cacheAbs)) return -1;
    try {
      const parsed = JSON.parse(fs.readFileSync(cacheAbs, 'utf8'));
      const entries = parsed?.entries || {};
      return Object.entries(entries).filter(
        ([k, v]) => k.startsWith('watermelon-ui::') && v?.status === 'verified'
      ).length;
    } catch {
      return -1;
    }
  };

  let verifiedCount = countVerifiedWatermelon();
  const needsCacheRepair =
    indexItems.length > 0 &&
    detailsCount > 0 &&
    runtimeOk &&
    (verifiedCount < indexItems.length);

  if (needsCacheRepair) {
    if (repair) {
      log('  [FIX] Rebuilding Watermelon UI verification cache (data/verification-cache.json)...');
      const verifyScript = path.join(rootDir, 'tools/verify-watermelon-runtime.mjs');
      const res = runCommand(process.execPath, [verifyScript], {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      verifiedCount = countVerifiedWatermelon();
      if (res.status === 0 && verifiedCount >= indexItems.length) {
        fixed.push(`Rebuilt data/verification-cache.json (${verifiedCount} Watermelon UI items verified)`);
      } else {
        errors.push(
          makeError({
            code: 'ERR_WATERMELON_VERIFY_CACHE',
            category: 'Watermelon UI Library',
            title: 'Failed to rebuild Watermelon UI verification cache',
            detail: String(res.stderr || res.stdout || 'verify-watermelon-runtime.mjs exited with error').trim().slice(0, 240),
            attemptedFix: 'Ran `node tools/verify-watermelon-runtime.mjs` automatically.',
            howToFix: 'Run `node tools/verify-watermelon-runtime.mjs` manually to see detailed verification output.',
          })
        );
      }
    } else {
      errors.push(
        makeError({
          code: 'ERR_WATERMELON_VERIFY_CACHE',
          category: 'Watermelon UI Library',
          title: 'Watermelon UI verification cache is missing or out of sync',
          detail: `Found ${Math.max(0, verifiedCount)} verified entries in ${cacheRel}, expected ${indexItems.length}.`,
          attemptedFix: 'Check-only mode.',
          howToFix: 'Run `node tools/verify-watermelon-runtime.mjs` or start.bat to rebuild automatically.',
        })
      );
    }
  }

  return {
    ok: errors.length === 0,
    indexCount: indexItems.length,
    detailsCount,
    verifiedCount: Math.max(0, verifiedCount),
    runtimeOk,
    fixed,
    warnings,
    errors,
  };
}

/**
 * 5) Optional internet reachability check (non-blocking warning when offline).
 */
export async function checkOptionalNetwork({
  timeoutMs = 5000,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    return { online: false, warning: makeWarning({ code: 'WARN_OFFLINE', category: 'Network', message: 'Offline check skipped.' }) };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl('https://cdn.jsdelivr.net/npm/lucide@0.460.0/package.json', {
      method: 'HEAD',
      signal: controller.signal,
    });
    if (res.ok) return { online: true, warning: null };
  } catch {
    // Offline or blocked
  } finally {
    clearTimeout(timer);
  }
  return {
    online: false,
    warning: makeWarning({
      code: 'WARN_OFFLINE_MODE',
      category: 'Network',
      message: 'Internet appears offline or restricted. Local Watermelon UI & Preview Kit work offline, but AI providers, Google Fonts, and Web Search need internet.',
    }),
  };
}

/**
 * Formats a clear human-readable summary with a dedicated ERRORS section.
 */
export function formatPreflightReport(report) {
  const lines = [];
  lines.push('');
  lines.push('==========================================================');
  lines.push(' WEBFORGE PREFLIGHT CHECK SUMMARY');
  lines.push('==========================================================');
  lines.push(`  App & UI Files        : ${report.coreFiles.ok ? 'OK' : 'ERROR'} (${report.coreFiles.checkedCount} checked)`);
  lines.push(`  Node & Dependencies   : ${report.dependencies.ok ? 'OK' : 'ERROR'} (Node v${report.dependencies.nodeVersion}, ${report.dependencies.declaredCount} npm deps)`);
  lines.push(`  UI Preview Kit        : ${report.previewKit.ok ? 'OK' : 'ERROR'} (${report.previewKit.checkedAssets} SHA-256 verified runtime assets)`);
  lines.push(`  Watermelon UI Library : ${report.watermelon.ok ? 'OK' : 'ERROR'} (${report.watermelon.verifiedCount}/${report.watermelon.indexCount} verified, runtime ${report.watermelon.runtimeOk ? 'ready' : 'incomplete'})`);
  lines.push(`  Internet Connectivity : ${report.network.online ? 'ONLINE' : 'OFFLINE (local studio still works)'}`);

  if (report.fixed.length > 0) {
    lines.push('');
    lines.push('----------------------------------------------------------');
    lines.push(` AUTO-DOWNLOADED / REPAIRED (${report.fixed.length})`);
    lines.push('----------------------------------------------------------');
    for (const item of report.fixed) {
      lines.push(`  [FIXED] ${item}`);
    }
  }

  if (report.warnings.length > 0) {
    lines.push('');
    lines.push('----------------------------------------------------------');
    lines.push(` WARNINGS (${report.warnings.length}) — Non-blocking`);
    lines.push('----------------------------------------------------------');
    for (const w of report.warnings) {
      lines.push(`  [WARN] ${w.code} (${w.category}): ${w.message}`);
    }
  }

  lines.push('');
  lines.push('==========================================================');
  if (report.errors.length === 0) {
    lines.push(' ERRORS (0) — All checks passed!');
    lines.push('==========================================================');
    lines.push('  No errors found. WebForge Studio is ready to launch.');
  } else {
    lines.push(` ERRORS (${report.errors.length}) — Action required before launch`);
    lines.push('==========================================================');
    report.errors.forEach((err, idx) => {
      lines.push('');
      lines.push(`  [${idx + 1}] ${err.code} — ${err.category}`);
      lines.push(`      Problem : ${err.title}`);
      if (err.detail) lines.push(`      Details : ${err.detail}`);
      if (err.attemptedFix) lines.push(`      Tried   : ${err.attemptedFix}`);
      lines.push(`      Fix     : ${err.howToFix}`);
    });
  }
  lines.push('');
  return lines.join('\n');
}

export function writeStartupErrorLog(rootDir, reportText) {
  try {
    const logDir = path.join(rootDir, 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, 'startup-errors.log');
    const header = `WebForge Startup Preflight Log — ${new Date().toISOString()}\n`;
    fs.writeFileSync(logPath, header + reportText + '\n', 'utf8');
    return logPath;
  } catch {
    return null;
  }
}

export async function runPreflight({
  rootDir = DEFAULT_ROOT_DIR,
  repair = true,
  skipNetwork = false,
  fetchImpl = globalThis.fetch,
  runCommand = spawnSync,
  log = () => {},
} = {}) {
  log('  [1/5] Checking core WebForge app, CSS & UI files...');
  const coreFiles = checkCoreAppFiles(rootDir);

  log('  [2/5] Checking Node.js & package dependencies...');
  const dependencies = checkAndRepairAppDependencies(rootDir, { repair, runCommand });

  log('  [3/5] Checking UI Preview Kit runtime (Tailwind v4, React, Babel, Lucide)...');
  const previewKit = await checkAndRepairPreviewKit(rootDir, { repair, fetchImpl, log });

  log('  [4/5] Checking Watermelon UI library catalog & live runtime (849 items)...');
  const watermelon = checkAndRepairWatermelonLibrary(rootDir, { repair, runCommand, log });

  log('  [5/5] Checking internet connectivity (Fonts & Web Search)...');
  const network = skipNetwork
    ? { online: false, warning: null }
    : await checkOptionalNetwork({ fetchImpl });

  const fixed = [
    ...dependencies.fixed,
    ...previewKit.fixed,
    ...watermelon.fixed,
  ];
  const warnings = [
    ...previewKit.warnings,
    ...watermelon.warnings,
    ...(network.warning ? [network.warning] : []),
  ];
  const errors = [
    ...coreFiles.errors,
    ...dependencies.errors,
    ...previewKit.errors,
    ...watermelon.errors,
  ];

  const report = {
    ok: errors.length === 0,
    coreFiles,
    dependencies,
    previewKit,
    watermelon,
    network,
    fixed,
    warnings,
    errors,
  };
  return report;
}

// CLI execution when run directly via `node tools/preflight-check.mjs`
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = new Set(process.argv.slice(2));
  const repair = !args.has('--check-only');
  const skipNetwork = args.has('--skip-network');
  const quiet = args.has('--json');

  runPreflight({
    rootDir: DEFAULT_ROOT_DIR,
    repair,
    skipNetwork,
    log: quiet ? () => {} : (msg) => console.log(msg),
  })
    .then((report) => {
      if (quiet) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        const text = formatPreflightReport(report);
        console.log(text);
        if (!report.ok) {
          const logPath = writeStartupErrorLog(DEFAULT_ROOT_DIR, text);
          if (logPath) {
            console.log(`  Full error report saved to: ${path.relative(DEFAULT_ROOT_DIR, logPath)}`);
          }
        }
      }
      process.exit(report.ok ? 0 : 1);
    })
    .catch((err) => {
      console.error('\n==========================================================');
      console.error(' ERRORS (1) — Preflight runner crashed unexpectedly');
      console.error('==========================================================');
      console.error(`  [1] ERR_PREFLIGHT_CRASH — Launcher`);
      console.error(`      Problem : ${err?.message || String(err)}`);
      console.error(`      Fix     : Verify Node.js 18+ is installed and re-extract WebForge.\n`);
      process.exit(1);
    });
}
