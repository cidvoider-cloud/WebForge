/**
 * WebForge Studio — Pure Token Ring Metrics & Lovable-Style Agent Activity Model
 *
 * Decouples SVG ring geometry, context-level thresholds, turn activity step
 * tracking, and history serialization from DOM manipulation so all rules are
 * deterministic and unit-tested.
 */

export function computeTokenRingMetrics(total = 0, limit = 32768, radius = 9.5) {
  const safeLimit = Math.max(1, Number(limit) || 32768);
  const safeTotal = Math.max(0, Number(total) || 0);
  const rawPct = (safeTotal / safeLimit) * 100;
  const percent = Math.min(100, Math.round(rawPct));
  const clampedPercent = Math.min(100, Math.max(0, rawPct));
  const circumference = Number((2 * Math.PI * radius).toFixed(3));
  // Keep a subtle 4% visual arc whenever tokens > 0 so the ring reads as active
  const visualPct = safeTotal > 0 ? Math.max(4, clampedPercent) : 0;
  const strokeDashoffset = Number((circumference * (1 - visualPct / 100)).toFixed(3));

  let level = 'ok';
  if (rawPct >= 85) level = 'critical';
  else if (rawPct >= 65) level = 'warn';

  const compactUsed = safeTotal >= 1000
    ? `${(safeTotal / 1000).toFixed(safeTotal >= 10000 ? 0 : 1)}k`
    : String(safeTotal);
  const compactLimit = safeLimit >= 1000
    ? `${Math.round(safeLimit / 1000)}k`
    : String(safeLimit);

  return {
    total: safeTotal,
    limit: safeLimit,
    percent,
    clampedPercent: Number(clampedPercent.toFixed(1)),
    circumference,
    strokeDashoffset,
    level,
    shortLabel: `${percent}%`,
    compactLabel: `${compactUsed} / ${compactLimit}`,
    detailLabel: `${safeTotal.toLocaleString()} / ${safeLimit.toLocaleString()} tok`,
  };
}

export function createActivityTurnState({
  turnId = '',
  mode = 'BUILD',
  prompt = '',
  isResume = false,
  startedAt = Date.now(),
} = {}) {
  return {
    turnId: String(turnId || `turn-${startedAt}`),
    mode: String(mode || 'BUILD'),
    prompt: String(prompt || '').slice(0, 260),
    status: 'running', // running | done | error | stopped
    headline: isResume ? 'Resuming build…' : 'Working on your app…',
    activeDetail: isResume ? 'Restoring partial output' : 'Preparing workspace context',
    startedAt: Number(startedAt) || Date.now(),
    elapsedSec: '0.0',
    tokens: 0,
    steps: [
      {
        key: 'context',
        label: `Context prepared (${String(mode || 'BUILD')})`,
        codeLabel: '',
        status: 'done',
      },
    ],
    webQuery: '',
    webEngine: '',
    webSources: [],
    subAgents: [],
    subAgentMode: '',
    subAgentFallback: '',
    reasoning: '',
    isThinking: false,
    files: [],
    checkpointId: '',
    hasBeforeFiles: false,
    revertLabel: 'Revert to Before Turn',
    errorMessage: '',
  };
}

export function addOrUpdateActivityStep(turn, { key, label = '', codeLabel = '', status = 'active' } = {}) {
  if (!turn || !Array.isArray(turn.steps)) return turn;
  const cleanKey = String(key || label || `step-${turn.steps.length}`);

  if (status === 'active') {
    for (const s of turn.steps) {
      if (s.status === 'active' && s.key !== cleanKey) {
        s.status = 'done';
      }
    }
  }

  const existing = turn.steps.find((s) => s.key === cleanKey);
  if (existing) {
    if (label) existing.label = label;
    if (codeLabel !== undefined) existing.codeLabel = codeLabel;
    existing.status = status;
  } else {
    turn.steps.push({
      key: cleanKey,
      label: String(label || cleanKey),
      codeLabel: String(codeLabel || ''),
      status,
    });
  }
  return turn;
}

export function finalizeActivityTurn(turn, {
  status = 'done',
  headline = '',
  elapsedSec = '',
  tokens = 0,
  files = [],
  checkpointId = '',
  hasBeforeFiles = false,
  errorMessage = '',
} = {}) {
  if (!turn) return turn;
  turn.status = status;
  turn.isThinking = false;
  if (elapsedSec !== '') turn.elapsedSec = String(elapsedSec);
  if (tokens) turn.tokens = Number(tokens) || 0;
  if (Array.isArray(files) && files.length) turn.files = files;
  if (checkpointId) turn.checkpointId = String(checkpointId);
  turn.hasBeforeFiles = Boolean(hasBeforeFiles);
  if (errorMessage) turn.errorMessage = String(errorMessage);

  if (Array.isArray(turn.steps)) {
    for (const s of turn.steps) {
      if (s.status === 'active') {
        s.status = status === 'error' ? 'error' : 'done';
      }
    }
  }

  if (headline) {
    turn.headline = headline;
  } else if (status === 'done') {
    const fileCount = turn.files.length;
    turn.headline = fileCount > 0
      ? `Edited ${fileCount} file${fileCount === 1 ? '' : 's'}`
      : 'Changes applied';
  } else if (status === 'stopped') {
    turn.headline = 'Generation stopped';
  } else if (status === 'error') {
    turn.headline = 'Build interrupted';
  }

  return turn;
}

export function buildActivitySummary(turn) {
  if (!turn) {
    return {
      headline: 'Agent activity',
      subtitle: 'Click to inspect details',
      stepCount: 0,
    };
  }

  const stepCount = Array.isArray(turn.steps) ? turn.steps.length : 0;
  const fileCount = Array.isArray(turn.files) ? turn.files.length : 0;

  if (turn.status === 'running') {
    const parts = [];
    if (turn.activeDetail) parts.push(turn.activeDetail);
    if (stepCount > 0) parts.push(`${stepCount} step${stepCount === 1 ? '' : 's'}`);
    if (turn.elapsedSec && Number(turn.elapsedSec) > 0) parts.push(`${turn.elapsedSec}s`);
    return {
      headline: turn.headline || 'Working…',
      subtitle: parts.length ? `${parts.join(' · ')} · Inspect` : 'Click to inspect live activity',
      stepCount,
    };
  }

  const doneParts = [];
  if (turn.status === 'done') {
    if (turn.elapsedSec && Number(turn.elapsedSec) > 0) doneParts.push(`${turn.elapsedSec}s`);
    if (stepCount > 0) doneParts.push(`${stepCount} step${stepCount === 1 ? '' : 's'}`);
    if (turn.webSources?.length) doneParts.push(`${turn.webSources.length} web sources`);
    if (!doneParts.length && fileCount > 0) doneParts.push(`${fileCount} file${fileCount === 1 ? '' : 's'}`);
  } else if (turn.errorMessage) {
    doneParts.push(turn.errorMessage.slice(0, 72));
  }

  return {
    headline: turn.headline || (turn.status === 'done' ? 'App ready' : 'Activity log'),
    subtitle: doneParts.length ? `${doneParts.join(' · ')} · View activity` : 'Click to inspect activity',
    stepCount,
  };
}

export function serializeTurnActivity(turn) {
  if (!turn) return '';
  try {
    const compact = {
      ...turn,
      reasoning: String(turn.reasoning || '').slice(0, 12000),
      webSources: Array.isArray(turn.webSources) ? turn.webSources.slice(0, 8) : [],
      files: Array.isArray(turn.files) ? turn.files.slice(0, 40) : [],
    };
    return encodeURIComponent(JSON.stringify(compact));
  } catch {
    return '';
  }
}

export function hydrateTurnActivity(encoded) {
  if (!encoded) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(String(encoded)));
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}
