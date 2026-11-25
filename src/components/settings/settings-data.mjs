/**
 * WebForge Settings — Pure Data, Navigation Map, Route Resolution & Model Grouping
 * Zero DOM dependencies so every helper can be unit-tested cleanly.
 */

import { inferModelCapabilities } from '../../../js/modules/providers.mjs';

export const SETTINGS_NAV_GROUPS = [
  {
    id: 'models',
    label: 'Models',
    items: [
      {
        id: 'model-provider',
        route: '/settings/model-provider',
        label: 'Model provider',
        icon: 'cpu',
        masterDetail: true,
        keywords: ['api key', 'strata', 'openrouter', 'anthropic', 'openai', 'gemini', 'deepseek', 'grok', 'mistral', 'lm studio', 'ollama', 'unsloth', 'litellm', 'claude code', 'codex', 'siliconflow', 'custom', 'host', 'proxy', 'protocol', 'sync', 'providers'],
      },
      {
        id: 'default-models',
        route: '/settings/default-models',
        label: 'Default models',
        icon: 'layers',
        masterDetail: false,
        keywords: ['build', 'quick', 'planning', 'vision', 'temperature', 'top-p', 'max tokens', 'context window', 'generation'],
      },
      {
        id: 'local-models',
        route: '/settings/local-models',
        label: 'Local models',
        icon: 'hard-drive',
        masterDetail: false,
        keywords: ['strata', 'ollama', 'lm studio', 'unsloth', 'litellm', 'omlx', 'gpustack', 'comfyui', 'localhost', 'cors', 'proxy', 'offline'],
      },
    ],
  },
  {
    id: 'build',
    label: 'Build',
    items: [
      {
        id: 'agent',
        route: '/settings/agent',
        label: 'Agent',
        icon: 'bot',
        masterDetail: false,
        keywords: ['sub-agents', 'parallel', 'web search', 'grounding', 'test search'],
      },
      {
        id: 'skills',
        route: '/settings/skills',
        label: 'Skills',
        icon: 'sparkles',
        masterDetail: true,
        keywords: ['github', 'custom', 'prompt', 'ponytail', 'impeccable', 'restraint', 'kubai', 'icons'],
      },
      {
        id: 'system-instructions',
        route: '/settings/system-instructions',
        label: 'System instructions',
        icon: 'file-text',
        masterDetail: false,
        keywords: ['base prompt', 'system prompt', 'project instructions', 'reset'],
      },
    ],
  },
  {
    id: 'preferences',
    label: 'Preferences',
    items: [
      {
        id: 'general',
        route: '/settings/general',
        label: 'General',
        icon: 'sliders-horizontal',
        masterDetail: false,
        keywords: ['plan mode', 'sidebar', 'startup', 'defaults'],
      },
      {
        id: 'appearance',
        route: '/settings/appearance',
        label: 'Appearance',
        icon: 'palette',
        masterDetail: false,
        keywords: ['theme', 'dark', 'light', 'mode'],
      },
      {
        id: 'keyboard-shortcuts',
        route: '/settings/keyboard-shortcuts',
        label: 'Keyboard shortcuts',
        icon: 'keyboard',
        masterDetail: false,
        keywords: ['command palette', 'ctrl+k', 'ctrl+,', 'hotkeys', 'shortcuts'],
      },
      {
        id: 'data',
        route: '/settings/data',
        label: 'Data',
        icon: 'database',
        masterDetail: false,
        keywords: ['export', 'backup', 'storage', 'clear', 'cache', 'reset'],
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      {
        id: 'about',
        route: '/settings/about',
        label: 'About & feedback',
        icon: 'info',
        masterDetail: false,
        keywords: ['version', 'license', 'local', 'feedback', 'webforge'],
      },
    ],
  },
];

export const ALL_SETTINGS_ITEMS = SETTINGS_NAV_GROUPS.flatMap((g) => g.items);

export const SETTINGS_ROUTES = Object.fromEntries(
  ALL_SETTINGS_ITEMS.map((item) => [item.id, item.route])
);

export const DEFAULT_SETTINGS_PAGE = 'model-provider';

export function resolveSettingsRoute(pathOrId = '') {
  const raw = String(pathOrId || '').trim().toLowerCase();
  if (!raw) return DEFAULT_SETTINGS_PAGE;
  const cleaned = raw.replace(/^\/?settings\/?/, '').replace(/\/+$/, '');
  const found = ALL_SETTINGS_ITEMS.find((item) => item.id === cleaned || item.route === raw);
  return found ? found.id : DEFAULT_SETTINGS_PAGE;
}

export function getSettingsPageMeta(pageId) {
  return ALL_SETTINGS_ITEMS.find((item) => item.id === pageId) || ALL_SETTINGS_ITEMS[0];
}

export function filterNavGroups(groups = SETTINGS_NAV_GROUPS, query = '') {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.label.toLowerCase().includes(q)) return true;
        if (item.id.includes(q)) return true;
        return (item.keywords || []).some((kw) => kw.toLowerCase().includes(q));
      }),
    }))
    .filter((group) => group.items.length > 0);
}

const FAMILY_MATCHERS = [
  { key: 'anthropic', label: 'Anthropic', re: /anthropic\/|claude/i },
  { key: 'openai', label: 'OpenAI', re: /openai\/|gpt-|o1|o3|o4|chatgpt/i },
  { key: 'google', label: 'Google', re: /google\/|gemini|gemma/i },
  { key: 'deepseek', label: 'DeepSeek', re: /deepseek/i },
  { key: 'meta', label: 'Meta', re: /meta-llama|llama/i },
  { key: 'qwen', label: 'Qwen', re: /qwen|qwq/i },
  { key: 'mistral', label: 'Mistral', re: /mistral|mixtral|codestral|pixtral/i },
  { key: 'xai', label: 'xAI', re: /x-ai\/|grok/i },
];

export function detectModelFamily(model = {}) {
  const id = String(model.id || model.name || '');
  for (const fam of FAMILY_MATCHERS) {
    if (fam.re.test(id)) return fam;
  }
  const prefix = id.includes('/') ? id.split('/')[0] : '';
  if (prefix) {
    const label = prefix
      .split(/[-_]+/)
      .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : ''))
      .join(' ');
    return { key: prefix.toLowerCase(), label };
  }
  return { key: 'other', label: 'Other models' };
}

export function groupModelsByFamily(models = [], { query = '', filter = 'all' } = {}) {
  const q = String(query || '').trim().toLowerCase();
  const filtered = (models || []).filter((m) => {
    const caps = m.capabilities || inferModelCapabilities(m);
    if (filter === 'free' && !m.free) return false;
    if (filter === 'vision' && !caps.vision) return false;
    if (filter === 'reasoning' && !caps.reasoning) return false;
    if (filter === 'tools' && !caps.tools) return false;
    if (!q) return true;
    return String(m.name || '').toLowerCase().includes(q) || String(m.id || '').toLowerCase().includes(q);
  });

  const groups = new Map();
  for (const m of filtered) {
    const fam = detectModelFamily(m);
    if (!groups.has(fam.key)) {
      groups.set(fam.key, { key: fam.key, label: fam.label, models: [] });
    }
    groups.get(fam.key).models.push({
      ...m,
      capabilities: m.capabilities || inferModelCapabilities(m),
    });
  }

  return Array.from(groups.values());
}

export const KEYBOARD_SHORTCUTS_LIST = [
  { id: 'command-palette', label: 'Command palette', description: 'Search commands, files, and projects', keys: 'Ctrl + K' },
  { id: 'open-settings', label: 'Open settings', description: 'Jump straight to full-page Settings', keys: 'Ctrl + ,' },
  { id: 'toggle-sidebar', label: 'Toggle sidebar', description: 'Expand or collapse the dashboard sidebar', keys: 'Ctrl + B' },
  { id: 'quick-open', label: 'Quick open file', description: 'Jump to any file in the code editor', keys: 'Ctrl + P' },
  { id: 'close-view', label: 'Back / dismiss', description: 'Exit Settings or close open menus', keys: 'Esc' },
];
