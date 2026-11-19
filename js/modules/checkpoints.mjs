/**
 * WebForge Studio — VFS Checkpoints & Snapshot Manager
 * Stores named & turn-based VFS snapshots with per-file rollback support.
 */

import { safeStorageJsonGet, safeStorageSet, generateId } from './storage.mjs';
import { computeFileSetDiff } from './diff.mjs';

const MAX_CHECKPOINTS_PER_PROJECT = 15;

export function listCheckpoints(projectId) {
  if (!projectId) return [];
  const list = safeStorageJsonGet(`wf_checkpoints_${projectId}`, []);
  return Array.isArray(list) ? list : [];
}

export function createCheckpoint({
  projectId,
  label = 'Checkpoint',
  prompt = '',
  files = {},
  prevFiles = null,
  type = 'manual',
} = {}) {
  if (!projectId) return null;
  const existing = listCheckpoints(projectId);
  const snapshot = JSON.parse(JSON.stringify(files || {}));
  const beforeSnapshot = prevFiles ? JSON.parse(JSON.stringify(prevFiles)) : null;
  const changedPaths = beforeSnapshot
    ? computeFileSetDiff(beforeSnapshot, snapshot).map((d) => d.path)
    : Object.keys(snapshot).sort();

  const cp = {
    id: 'cp-' + generateId(),
    label: String(label || 'Checkpoint').slice(0, 60),
    prompt: String(prompt || '').slice(0, 200),
    type,
    timestamp: Date.now(),
    fileCount: Object.keys(snapshot).length,
    changedPaths,
    files: snapshot,
    ...(beforeSnapshot ? { beforeFiles: beforeSnapshot } : {}),
  };

  const next = [cp, ...existing].slice(0, MAX_CHECKPOINTS_PER_PROJECT);
  safeStorageSet(`wf_checkpoints_${projectId}`, JSON.stringify(next), projectId);
  return cp;
}

export function getCheckpoint(projectId, checkpointId) {
  if (!projectId || !checkpointId) return null;
  return listCheckpoints(projectId).find((c) => c.id === checkpointId) || null;
}

export function deleteCheckpoint(projectId, checkpointId) {
  if (!projectId || !checkpointId) return false;
  const list = listCheckpoints(projectId);
  const filtered = list.filter((c) => c.id !== checkpointId);
  if (filtered.length === list.length) return false;
  safeStorageSet(`wf_checkpoints_${projectId}`, JSON.stringify(filtered), projectId);
  return true;
}
