/**
 * WebForge Studio — Built-in Flagship Starter Projects
 *
 * Replaces the legacy minimal demos with three aesthetic, interactive
 * flagship websites across SaaS (GSAP), Minimalist Luxury Fashion, and
 * Hypercar Automotive categories.
 */

import { safeStorageGet, safeStorageJsonGet, safeStorageSet, STORAGE_KEYS } from './storage.mjs';
import { DEMO_KINETIX_SAAS } from './demo-saas.mjs';
import { DEMO_MAISON_VERA } from './demo-luxury.mjs';
import { DEMO_VALKYR_CAR } from './demo-car.mjs';
import { DEMO_SOLA_CERAMIC } from './demo-ceramic.mjs';

export const DEMO_SEED_VERSION = 'flagship-v2.2';

export const LEGACY_DEMO_IDS = [
  'demo-petal-pop',
  'demo-atelier-botanica',
  'demo-wild-fern',
];

export const DEMO_PROJECTS = [
  DEMO_KINETIX_SAAS,
  DEMO_MAISON_VERA,
  DEMO_VALKYR_CAR,
  DEMO_SOLA_CERAMIC,
];

function removeProjectStorageKeys(projectId) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem('wf_vfs_' + projectId);
    localStorage.removeItem('wf_chat_' + projectId);
    localStorage.removeItem('wf_checkpoints_' + projectId);
  } catch {
    /* ignore storage access errors */
  }
}

export function seedDemoProjects() {
  if (typeof localStorage === 'undefined') return;
  if (safeStorageGet(STORAGE_KEYS.DEMOS_SEEDED) === DEMO_SEED_VERSION) return;

  const existingList = safeStorageJsonGet(STORAGE_KEYS.PROJECTS, []) || [];
  const legacySet = new Set(LEGACY_DEMO_IDS);

  // Strip legacy starter projects while preserving all custom user projects
  const list = existingList.filter((project) => {
    if (!project || !project.id) return false;
    if (legacySet.has(project.id)) {
      removeProjectStorageKeys(project.id);
      return false;
    }
    return true;
  });

  // Also clear orphaned legacy storage even if not in project list
  LEGACY_DEMO_IDS.forEach((legacyId) => removeProjectStorageKeys(legacyId));

  // Reset last opened project pointer if it referenced a removed legacy demo
  const lastProject = safeStorageGet(STORAGE_KEYS.LAST_PROJECT, '');
  if (lastProject && legacySet.has(lastProject)) {
    try {
      localStorage.removeItem(STORAGE_KEYS.LAST_PROJECT);
    } catch {
      /* ignore */
    }
  }

  const now = Date.now();
  DEMO_PROJECTS.forEach((demo, i) => {
    const idx = list.findIndex((p) => p.id === demo.id);
    const meta = {
      id: demo.id,
      name: demo.name,
      createdAt: now - (DEMO_PROJECTS.length - i) * 60000,
      updatedAt: now - (DEMO_PROJECTS.length - i) * 60000,
      demo: true,
      icon: demo.icon,
      accent: demo.accent,
      tagline: demo.tagline,
      pinnedFiles: ['src/App.jsx', 'src/data.js'],
      customInstructions: '',
    };
    if (idx === -1) {
      list.push(meta);
    } else {
      list[idx] = { ...list[idx], ...meta };
    }
    safeStorageSet('wf_vfs_' + demo.id, JSON.stringify(demo.vfs), demo.id);
  });

  safeStorageSet(STORAGE_KEYS.PROJECTS, JSON.stringify(list));
  safeStorageSet(STORAGE_KEYS.DEMOS_SEEDED, DEMO_SEED_VERSION);
}
