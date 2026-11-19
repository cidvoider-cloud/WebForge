/**
 * WebForge Studio — Safe Storage & Formatting Helpers
 */

export const STORAGE_KEYS = {
  THEME: 'wf_theme',
  LAYOUT: 'wf_studio_layout',
  PROVIDER: 'wf_provider',
  SKILLS: 'wf_skills',
  SYSTEM_BASE: 'wf_system_base',
  PROJECTS: 'wf_projects',
  DEMOS_SEEDED: 'wf_demos_seeded',
  ACTIVE_GEN: 'wf_active_gen',
  LAST_PROJECT: 'wf_last_project',
  AGENT_PREFS: 'wf_agent_prefs',
  UI_LIBRARIES: 'wf_ui_libraries',
  ACTIVE_UI_LIBRARY: 'wf_active_ui_library',
  UI_AI_QUEUE: 'wf_ui_ai_queue',
};

export function safeStorageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
}

export function safeStorageJsonGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function safeStorageSet(key, value, activeProjectId = null) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    try {
      // Evict older project histories & checkpoints outside the active project first
      const evictable = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        const isHistory = k.startsWith('wf_vfs_history_') && k !== `wf_vfs_history_${activeProjectId}`;
        const isCheckpoint = k.startsWith('wf_checkpoints_') && k !== `wf_checkpoints_${activeProjectId}`;
        if (isHistory || isCheckpoint) evictable.push(k);
      }
      for (const k of evictable) {
        localStorage.removeItem(k);
      }
      localStorage.setItem(key, value);
      return true;
    } catch {
      try {
        // Trim active project checkpoints to latest 3 as a last resort
        if (activeProjectId) {
          const cpKey = `wf_checkpoints_${activeProjectId}`;
          const list = safeStorageJsonGet(cpKey, []);
          if (Array.isArray(list) && list.length > 3) {
            localStorage.setItem(cpKey, JSON.stringify(list.slice(0, 3)));
          }
        }
        localStorage.setItem(key, value);
        return true;
      } catch {
        console.warn('[WebForge] Storage write failed for', key, err);
        return false;
      }
    }
  }
}

export function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatTimeShort(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}
