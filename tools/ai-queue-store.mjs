/**
 * WebForge Studio — Workspace-Persisted AI Template Import Queue Store
 *
 * Persists queued UI templates & prompts to `data/ui-library-ai-queue.json`
 * so users can batch-add templates in the UI Library and then ask the coding AI
 * to go through the workspace file and import all of them into the library.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const DEFAULT_AI_QUEUE_REL_PATH = 'data/ui-library-ai-queue.json';

export function normalizeAiTemplateInput(input = {}, existing = null) {
  const name = String(input.name ?? existing?.name ?? '').trim();
  const prompt = String(input.prompt ?? existing?.prompt ?? '').trim();
  const targetLibrary = String(input.targetLibrary ?? existing?.targetLibrary ?? '21st.dev').trim() || '21st.dev';
  const category = String(input.category ?? existing?.category ?? 'auto').trim() || 'auto';
  const status = input.status === 'imported' || (!input.status && existing?.status === 'imported')
    ? 'imported'
    : 'pending';

  if (!name) throw new Error('Template name is required');
  if (!prompt) throw new Error('Template prompt is required');

  const now = Date.now();
  return {
    id: existing?.id || input.id || `tpl-${crypto.randomBytes(4).toString('hex')}`,
    name,
    targetLibrary,
    category,
    prompt,
    status,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

export function readAiQueueFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.templates) ? parsed.templates : [];
    return list.filter((item) => item && typeof item === 'object' && item.id && item.name && item.prompt);
  } catch {
    return [];
  }
}

export function writeAiQueueFile(filePath, templates = []) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    instructions: 'Batch-queued UI templates added from WebForge Studio UI Library -> AI Instructions. Import pending items into the requested targetLibrary and set status to "imported".',
    templates: Array.isArray(templates) ? templates : [],
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return payload.templates;
}

export function addAiTemplateItem(filePath, input) {
  const current = readAiQueueFile(filePath);
  const item = normalizeAiTemplateInput(input);
  const next = [item, ...current];
  writeAiQueueFile(filePath, next);
  return { item, templates: next };
}

export function updateAiTemplateItem(filePath, id, patch = {}) {
  const cleanId = String(id || '').trim();
  if (!cleanId) throw new Error('Template id is required');
  const current = readAiQueueFile(filePath);
  const idx = current.findIndex((t) => t.id === cleanId);
  if (idx === -1) throw new Error('Template not found');
  const updated = normalizeAiTemplateInput(patch, current[idx]);
  const next = [...current];
  next[idx] = updated;
  writeAiQueueFile(filePath, next);
  return { item: updated, templates: next };
}

export function deleteAiTemplateItem(filePath, id) {
  const cleanId = String(id || '').trim();
  if (!cleanId) throw new Error('Template id is required');
  const current = readAiQueueFile(filePath);
  const next = current.filter((t) => t.id !== cleanId);
  if (next.length === current.length) return { deleted: false, templates: current };
  writeAiQueueFile(filePath, next);
  return { deleted: true, templates: next };
}

export function clearImportedAiTemplateItems(filePath) {
  const current = readAiQueueFile(filePath);
  const next = current.filter((t) => t.status !== 'imported');
  writeAiQueueFile(filePath, next);
  return { removedCount: current.length - next.length, templates: next };
}
