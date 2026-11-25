/**
 * WebForge Studio — Kubai Layered Animated SVG Icon Engine
 * Inspired by https://github.com/kubai087/kubai-icons
 *
 * Design grammar:
 *  - Consistent 24x24 architectural grid with rounded layered back-plate & front-plate
 *  - Accent-derived tonal gradients & subtle inner highlight strokes (adapts to dark & light themes)
 *  - Compositor-only hover/focus micro-interpolation (.kb-back, .kb-front, .kb-accent)
 *  - Zero external CDN dependencies (100% offline-safe)
 */

import { escapeHtml } from './storage.mjs';

const TONES = {
  amber:   { back: '#F59E0B', front: '#FBBF24', stroke: '#D97706', tint: 'rgba(245,158,11,0.18)' },
  indigo:  { back: '#6366F1', front: '#818CF8', stroke: '#4F46E5', tint: 'rgba(99,102,241,0.18)' },
  emerald: { back: '#10B981', front: '#34D399', stroke: '#059669', tint: 'rgba(16,185,129,0.18)' },
  sky:     { back: '#0EA5E9', front: '#38BDF8', stroke: '#0284C7', tint: 'rgba(14,165,233,0.18)' },
  violet:  { back: '#8B5CF6', front: '#A78BFA', stroke: '#7C3AED', tint: 'rgba(139,92,246,0.18)' },
  rose:    { back: '#F43F5E', front: '#FB7185', stroke: '#E11D48', tint: 'rgba(244,63,94,0.18)' },
  teal:    { back: '#14B8A6', front: '#2DD4BF', stroke: '#0D9488', tint: 'rgba(20,184,166,0.18)' },
  slate:   { back: '#71717A', front: '#A1A1AA', stroke: '#52525B', tint: 'rgba(113,113,122,0.18)' },
  orange:  { back: '#F97316', front: '#FB923C', stroke: '#EA580C', tint: 'rgba(249,115,22,0.18)' },
  cyan:    { back: '#06B6D4', front: '#22D3EE', stroke: '#0891B2', tint: 'rgba(6,182,212,0.18)' },
};

const ICON_SPECS = {
  dashboard: {
    tone: 'indigo',
    body: `
      <rect class="kb-back" x="2.5" y="4" width="19" height="16.5" rx="4.2" fill="var(--kb-back)" fill-opacity="0.22" stroke="var(--kb-stroke)" stroke-opacity="0.45" stroke-width="1.2"/>
      <rect class="kb-front" x="4.5" y="6.2" width="6.5" height="6.5" rx="2" fill="var(--kb-front)" fill-opacity="0.92"/>
      <rect class="kb-accent" x="13" y="6.2" width="6.5" height="4" rx="1.6" fill="var(--kb-back)" fill-opacity="0.72"/>
      <rect class="kb-accent" x="13" y="12" width="6.5" height="6.2" rx="1.8" fill="var(--kb-front)" fill-opacity="0.52"/>
      <rect class="kb-front" x="4.5" y="14.5" width="6.5" height="3.7" rx="1.5" fill="var(--kb-back)" fill-opacity="0.65"/>
    `,
  },
  'prompt-builder': {
    tone: 'amber',
    body: `
      <rect class="kb-back" x="3" y="4.5" width="18" height="15.5" rx="4.2" fill="var(--kb-back)" fill-opacity="0.20" stroke="var(--kb-stroke)" stroke-opacity="0.48" stroke-width="1.2"/>
      <path class="kb-front" d="M6.5 16.5L13.5 9.5L16.2 12.2L9.2 19.2C8.7 19.7 7.9 19.7 7.4 19.2L6.5 18.3C6 17.8 6 17 6.5 16.5Z" fill="var(--kb-front)"/>
      <path class="kb-accent" d="M16.4 5.2L17.2 7.3L19.3 8.1L17.2 8.9L16.4 11L15.6 8.9L13.5 8.1L15.6 7.3L16.4 5.2Z" fill="var(--kb-back)"/>
      <circle class="kb-accent" cx="8.2" cy="8.4" r="1.4" fill="var(--kb-front)" fill-opacity="0.8"/>
    `,
  },
  'ui-library': {
    tone: 'emerald',
    body: `
      <rect class="kb-back" x="3" y="6" width="15.5" height="14.5" rx="3.8" fill="var(--kb-back)" fill-opacity="0.22" stroke="var(--kb-stroke)" stroke-opacity="0.45" stroke-width="1.2"/>
      <rect class="kb-front" x="5.5" y="3.5" width="15.5" height="14.5" rx="3.8" fill="var(--kb-front)" fill-opacity="0.28" stroke="var(--kb-front)" stroke-width="1.25"/>
      <rect class="kb-accent" x="8.2" y="6.6" width="10" height="3.2" rx="1.4" fill="var(--kb-front)"/>
      <rect class="kb-accent" x="8.2" y="11.4" width="4.4" height="4" rx="1.3" fill="var(--kb-back)" fill-opacity="0.88"/>
      <rect class="kb-accent" x="13.8" y="11.4" width="4.4" height="4" rx="1.3" fill="var(--kb-front)" fill-opacity="0.65"/>
    `,
  },
  settings: {
    tone: 'slate',
    body: `
      <rect class="kb-back" x="3" y="4" width="18" height="16.5" rx="4.4" fill="var(--kb-back)" fill-opacity="0.20" stroke="var(--kb-stroke)" stroke-opacity="0.45" stroke-width="1.2"/>
      <line class="kb-front" x1="6.5" y1="9.2" x2="17.5" y2="9.2" stroke="var(--kb-front)" stroke-width="1.8" stroke-linecap="round"/>
      <circle class="kb-accent" cx="10" cy="9.2" r="2.2" fill="var(--kb-front)"/>
      <line class="kb-front" x1="6.5" y1="15.2" x2="17.5" y2="15.2" stroke="var(--kb-front)" stroke-width="1.8" stroke-linecap="round"/>
      <circle class="kb-accent" cx="14.5" cy="15.2" r="2.2" fill="var(--kb-back)"/>
    `,
  },
  'new-project': {
    tone: 'sky',
    body: `
      <path class="kb-back" d="M3 7.4C3 5.7 4.3 4.4 6 4.4H9.6L11.4 6.5H18C19.7 6.5 21 7.8 21 9.5V17.4C21 19.1 19.7 20.4 18 20.4H6C4.3 20.4 3 19.1 3 17.4V7.4Z" fill="var(--kb-back)" fill-opacity="0.26" stroke="var(--kb-stroke)" stroke-opacity="0.5" stroke-width="1.2"/>
      <rect class="kb-front" x="4.5" y="9" width="15" height="10" rx="2.8" fill="var(--kb-front)" fill-opacity="0.34"/>
      <path class="kb-accent" d="M12 11.2V16.8M9.2 14H14.8" stroke="var(--kb-front)" stroke-width="2" stroke-linecap="round"/>
    `,
  },
  'model-provider': {
    tone: 'sky',
    body: `
      <rect class="kb-back" x="3.2" y="4.8" width="17.6" height="15.4" rx="4.2" fill="var(--kb-back)" fill-opacity="0.22" stroke="var(--kb-stroke)" stroke-opacity="0.5" stroke-width="1.2"/>
      <rect class="kb-front" x="6.5" y="7.8" width="11" height="9.4" rx="2.5" fill="var(--kb-front)" fill-opacity="0.92"/>
      <circle class="kb-accent" cx="10" cy="12.5" r="1.4" fill="var(--md-bg, #0f1115)"/>
      <circle class="kb-accent" cx="14.2" cy="12.5" r="1.4" fill="var(--md-bg, #0f1115)"/>
      <path class="kb-accent" d="M9 3.2V5M15 3.2V5M9 19.8V21.5M15 19.8V21.5" stroke="var(--kb-front)" stroke-width="1.5" stroke-linecap="round"/>
    `,
  },
  'default-models': {
    tone: 'violet',
    body: `
      <rect class="kb-back" x="4" y="12.2" width="16" height="7.5" rx="2.8" fill="var(--kb-back)" fill-opacity="0.28" stroke="var(--kb-stroke)" stroke-opacity="0.45" stroke-width="1.15"/>
      <rect class="kb-front" x="3" y="8" width="18" height="7.4" rx="2.8" fill="var(--kb-front)" fill-opacity="0.52"/>
      <rect class="kb-accent" x="4.8" y="4" width="14.4" height="6.2" rx="2.4" fill="var(--kb-front)"/>
    `,
  },
  'local-models': {
    tone: 'emerald',
    body: `
      <rect class="kb-back" x="3" y="4.5" width="18" height="15.5" rx="4.2" fill="var(--kb-back)" fill-opacity="0.22" stroke="var(--kb-stroke)" stroke-opacity="0.48" stroke-width="1.2"/>
      <rect class="kb-front" x="5.2" y="11.8" width="13.6" height="6" rx="2" fill="var(--kb-front)" fill-opacity="0.92"/>
      <circle class="kb-accent" cx="15.8" cy="14.8" r="1.3" fill="var(--md-bg, #0f1115)"/>
      <path class="kb-accent" d="M7.5 8.5H13.5" stroke="var(--kb-front)" stroke-width="1.8" stroke-linecap="round"/>
    `,
  },
  agent: {
    tone: 'amber',
    body: `
      <rect class="kb-back" x="3.5" y="6.2" width="17" height="13.6" rx="4.4" fill="var(--kb-back)" fill-opacity="0.24" stroke="var(--kb-stroke)" stroke-opacity="0.48" stroke-width="1.2"/>
      <rect class="kb-front" x="6" y="8.8" width="12" height="8.4" rx="3" fill="var(--kb-front)" fill-opacity="0.9"/>
      <circle class="kb-accent" cx="9.8" cy="13" r="1.35" fill="var(--md-bg, #0f1115)"/>
      <circle class="kb-accent" cx="14.2" cy="13" r="1.35" fill="var(--md-bg, #0f1115)"/>
      <path class="kb-accent" d="M12 3.2V6.2" stroke="var(--kb-front)" stroke-width="1.7" stroke-linecap="round"/>
    `,
  },
  skills: {
    tone: 'rose',
    body: `
      <rect class="kb-back" x="3.2" y="4.5" width="17.6" height="15.5" rx="4.2" fill="var(--kb-back)" fill-opacity="0.20" stroke="var(--kb-stroke)" stroke-opacity="0.45" stroke-width="1.2"/>
      <path class="kb-front" d="M11.6 6.8L13.1 10.6L16.9 12.1L13.1 13.6L11.6 17.4L10.1 13.6L6.3 12.1L10.1 10.6L11.6 6.8Z" fill="var(--kb-front)"/>
      <circle class="kb-accent" cx="17.2" cy="7.6" r="1.5" fill="var(--kb-back)"/>
    `,
  },
  'system-instructions': {
    tone: 'indigo',
    body: `
      <rect class="kb-back" x="4.5" y="3.2" width="15" height="17.8" rx="3.6" fill="var(--kb-back)" fill-opacity="0.22" stroke="var(--kb-stroke)" stroke-opacity="0.48" stroke-width="1.2"/>
      <path class="kb-front" d="M7.6 8.2H16.4M7.6 12H16.4M7.6 15.8H12.8" stroke="var(--kb-front)" stroke-width="1.85" stroke-linecap="round"/>
      <circle class="kb-accent" cx="15.8" cy="15.8" r="1.4" fill="var(--kb-front)"/>
    `,
  },
  general: {
    tone: 'teal',
    body: `
      <rect class="kb-back" x="3" y="4.2" width="18" height="16" rx="4.2" fill="var(--kb-back)" fill-opacity="0.22" stroke="var(--kb-stroke)" stroke-opacity="0.48" stroke-width="1.2"/>
      <rect class="kb-front" x="6" y="7.6" width="12" height="3.6" rx="1.8" fill="var(--kb-front)" fill-opacity="0.5"/>
      <circle class="kb-accent" cx="14.8" cy="9.4" r="1.8" fill="var(--kb-front)"/>
      <rect class="kb-front" x="6" y="13.4" width="12" height="3.6" rx="1.8" fill="var(--kb-back)" fill-opacity="0.45"/>
      <circle class="kb-accent" cx="9.2" cy="15.2" r="1.8" fill="var(--kb-front)"/>
    `,
  },
  appearance: {
    tone: 'orange',
    body: `
      <circle class="kb-back" cx="12" cy="12" r="8.6" fill="var(--kb-back)" fill-opacity="0.22" stroke="var(--kb-stroke)" stroke-opacity="0.48" stroke-width="1.2"/>
      <path class="kb-front" d="M12 4.4A7.6 7.6 0 0 1 12 19.6Z" fill="var(--kb-front)" fill-opacity="0.9"/>
      <circle class="kb-accent" cx="9.2" cy="10.2" r="1.5" fill="var(--kb-front)"/>
      <circle class="kb-accent" cx="9.2" cy="14.2" r="1.2" fill="var(--kb-back)"/>
    `,
  },
  'keyboard-shortcuts': {
    tone: 'cyan',
    body: `
      <rect class="kb-back" x="2.6" y="5.6" width="18.8" height="13.2" rx="3.8" fill="var(--kb-back)" fill-opacity="0.22" stroke="var(--kb-stroke)" stroke-opacity="0.48" stroke-width="1.2"/>
      <rect class="kb-front" x="5.4" y="8.4" width="3.2" height="3" rx="1" fill="var(--kb-front)"/>
      <rect class="kb-front" x="10.4" y="8.4" width="3.2" height="3" rx="1" fill="var(--kb-front)"/>
      <rect class="kb-front" x="15.4" y="8.4" width="3.2" height="3" rx="1" fill="var(--kb-front)"/>
      <rect class="kb-accent" x="7" y="13.4" width="10" height="2.6" rx="1.2" fill="var(--kb-front)" fill-opacity="0.88"/>
    `,
  },
  data: {
    tone: 'emerald',
    body: `
      <ellipse class="kb-back" cx="12" cy="6.8" rx="7.6" ry="3.2" fill="var(--kb-back)" fill-opacity="0.34" stroke="var(--kb-stroke)" stroke-opacity="0.5" stroke-width="1.2"/>
      <path class="kb-front" d="M4.4 6.8V16.8C4.4 18.6 7.8 20 12 20C16.2 20 19.6 18.6 19.6 16.8V6.8" fill="var(--kb-front)" fill-opacity="0.25" stroke="var(--kb-front)" stroke-width="1.25"/>
      <path class="kb-accent" d="M4.4 11.8C4.4 13.6 7.8 15 12 15C16.2 15 19.6 13.6 19.6 11.8" fill="none" stroke="var(--kb-front)" stroke-width="1.4"/>
    `,
  },
  about: {
    tone: 'slate',
    body: `
      <circle class="kb-back" cx="12" cy="12" r="8.6" fill="var(--kb-back)" fill-opacity="0.22" stroke="var(--kb-stroke)" stroke-opacity="0.48" stroke-width="1.2"/>
      <rect class="kb-front" x="10.8" y="10.4" width="2.4" height="6.2" rx="1.2" fill="var(--kb-front)"/>
      <circle class="kb-accent" cx="12" cy="7.6" r="1.45" fill="var(--kb-front)"/>
    `,
  },
  'empty-models': {
    tone: 'sky',
    body: `
      <rect class="kb-back" x="3" y="6.2" width="18" height="13.4" rx="4.2" fill="var(--kb-back)" fill-opacity="0.20" stroke="var(--kb-stroke)" stroke-opacity="0.45" stroke-width="1.2"/>
      <path class="kb-front" d="M3.5 13.2H8.4L9.8 15.2H14.2L15.6 13.2H20.5V16.8C20.5 18.4 19.2 19.6 17.6 19.6H6.4C4.8 19.6 3.5 18.4 3.5 16.8V13.2Z" fill="var(--kb-front)" fill-opacity="0.88"/>
      <path class="kb-accent" d="M12 4.2V10.4M9.4 7.8L12 10.4L14.6 7.8" stroke="var(--kb-front)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    `,
  },
  'empty-search': {
    tone: 'violet',
    body: `
      <circle class="kb-back" cx="10.6" cy="10.6" r="6.8" fill="var(--kb-back)" fill-opacity="0.24" stroke="var(--kb-stroke)" stroke-opacity="0.5" stroke-width="1.25"/>
      <circle class="kb-front" cx="10.6" cy="10.6" r="3.6" fill="var(--kb-front)" fill-opacity="0.82"/>
      <path class="kb-accent" d="M15.8 15.8L20.2 20.2" stroke="var(--kb-front)" stroke-width="2.2" stroke-linecap="round"/>
    `,
  },
  strata: {
    tone: 'amber',
    body: `
      <rect class="kb-back" x="3" y="14.2" width="18" height="5" rx="2.2" fill="var(--kb-back)" fill-opacity="0.34"/>
      <rect class="kb-front" x="4.5" y="9.5" width="15" height="4.8" rx="2.2" fill="var(--kb-front)" fill-opacity="0.68"/>
      <rect class="kb-accent" x="6.5" y="4.8" width="11" height="4.6" rx="2.1" fill="var(--kb-front)"/>
    `,
  },
  ollama: {
    tone: 'slate',
    body: `
      <rect class="kb-back" x="4.5" y="6.8" width="15" height="13.4" rx="5.5" fill="var(--kb-back)" fill-opacity="0.28" stroke="var(--kb-stroke)" stroke-opacity="0.5" stroke-width="1.2"/>
      <path class="kb-front" d="M8.5 7.4V4.5C8.5 3.6 9.8 3.6 10.2 4.6L11 7M15.5 7.4V4.5C15.5 3.6 14.2 3.6 13.8 4.6L13 7" stroke="var(--kb-front)" stroke-width="1.6" stroke-linecap="round"/>
      <circle class="kb-accent" cx="9.6" cy="12.5" r="1.35" fill="var(--kb-front)"/>
      <circle class="kb-accent" cx="14.4" cy="12.5" r="1.35" fill="var(--kb-front)"/>
      <ellipse class="kb-accent" cx="12" cy="15.8" rx="2.2" ry="1.3" fill="var(--kb-front)" fill-opacity="0.78"/>
    `,
  },
  lmstudio: {
    tone: 'violet',
    body: `
      <rect class="kb-back" x="3" y="4" width="18" height="16" rx="4.5" fill="var(--kb-back)" fill-opacity="0.26" stroke="var(--kb-stroke)" stroke-opacity="0.55" stroke-width="1.2"/>
      <path class="kb-front" d="M7.4 8.5H16.6L8.4 15.5H16.6" fill="none" stroke="var(--kb-front)" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
    `,
  },
  openrouter: {
    tone: 'emerald',
    body: `
      <rect class="kb-back" x="3" y="4.5" width="18" height="15" rx="4.5" fill="var(--kb-back)" fill-opacity="0.24" stroke="var(--kb-stroke)" stroke-opacity="0.5" stroke-width="1.2"/>
      <circle class="kb-front" cx="9.4" cy="12" r="3.1" fill="none" stroke="var(--kb-front)" stroke-width="2"/>
      <path class="kb-accent" d="M12.6 12H17.4M15.2 9.6L17.6 12L15.2 14.4" fill="none" stroke="var(--kb-front)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
    `,
  },
  anthropic: {
    tone: 'orange',
    body: `
      <rect class="kb-back" x="3" y="4" width="18" height="16" rx="4.2" fill="var(--kb-back)" fill-opacity="0.24" stroke="var(--kb-stroke)" stroke-opacity="0.5" stroke-width="1.2"/>
      <path class="kb-front" d="M7.5 16.5L11.2 7.5H13.4L17 16.5M9.1 13.4H14.5" fill="none" stroke="var(--kb-front)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    `,
  },
  openai: {
    tone: 'teal',
    body: `
      <circle class="kb-back" cx="12" cy="12" r="8.2" fill="var(--kb-back)" fill-opacity="0.22" stroke="var(--kb-stroke)" stroke-opacity="0.5" stroke-width="1.2"/>
      <polygon class="kb-front" points="12,5.6 17.5,8.8 17.5,15.2 12,18.4 6.5,15.2 6.5,8.8" fill="none" stroke="var(--kb-front)" stroke-width="1.8" stroke-linejoin="round"/>
      <circle class="kb-accent" cx="12" cy="12" r="2.2" fill="var(--kb-front)"/>
    `,
  },
  gemini: {
    tone: 'sky',
    body: `
      <rect class="kb-back" x="3.5" y="3.5" width="17" height="17" rx="5" fill="var(--kb-back)" fill-opacity="0.20" stroke="var(--kb-stroke)" stroke-opacity="0.45" stroke-width="1.2"/>
      <path class="kb-front" d="M12 5.2C12.7 9.4 14.6 11.3 18.8 12C14.6 12.7 12.7 14.6 12 18.8C11.3 14.6 9.4 12.7 5.2 12C9.4 11.3 11.3 9.4 12 5.2Z" fill="var(--kb-front)"/>
    `,
  },
  deepseek: {
    tone: 'indigo',
    body: `
      <rect class="kb-back" x="3" y="4.5" width="18" height="15" rx="4.5" fill="var(--kb-back)" fill-opacity="0.24" stroke="var(--kb-stroke)" stroke-opacity="0.5" stroke-width="1.2"/>
      <path class="kb-front" d="M6.6 13.8C7.8 9.2 12.4 7.8 16.8 9.6C15.8 13.8 12.6 16.4 7.8 15.6Z" fill="var(--kb-front)" fill-opacity="0.9"/>
      <circle class="kb-accent" cx="13.4" cy="11.4" r="1.2" fill="var(--md-bg, #0f1115)"/>
    `,
  },
};

export const KUBAI_ICON_NAMES = Object.freeze(Object.keys(ICON_SPECS));

const PROVIDER_ICON_MAP = {
  strata: 'strata',
  ollama: 'ollama',
  lmstudio: 'lmstudio',
  openrouter: 'openrouter',
  anthropic: 'anthropic',
  'claude-code': 'anthropic',
  openai: 'openai',
  'openai-codex': 'openai',
  gemini: 'gemini',
  vertexai: 'gemini',
  deepseek: 'deepseek',
};

/**
 * Renders a layered, hover-animated Kubai-style SVG icon.
 * Works purely from strings so it can be embedded inside templates and unit-tested cleanly.
 */
export function renderKubaiIcon(name, { size = 18, tone = null, className = '', label = '' } = {}) {
  const spec = ICON_SPECS[name] || ICON_SPECS['model-provider'];
  const palette = TONES[tone || spec.tone] || TONES.indigo;
  const px = Math.max(14, Math.min(64, Number(size) || 18));
  const aria = label
    ? `role="img" aria-label="${escapeHtml(label)}"`
    : `aria-hidden="true"`;
  const style = `--kb-back:${palette.back};--kb-front:${palette.front};--kb-stroke:${palette.stroke};width:${px}px;height:${px}px;`;
  return `<span class="kb-icon ${escapeHtml(className)}" data-kubai-rendered="${escapeHtml(name)}" style="${style}" ${aria}><svg viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" xmlns="http://www.w3.org/2000/svg">${spec.body}</svg></span>`;
}

/**
 * Renders a provider list mark:
 *  - Featured runtimes & flagship clouds use dedicated Kubai layered animated SVG marks.
 *  - All other providers use a crisp tonal layered badge keyed to their brand tone.
 */
export function renderProviderMark(provider = {}, { size = 22 } = {}) {
  const id = String(provider.id || '').toLowerCase();
  if (PROVIDER_ICON_MAP[id]) {
    return renderKubaiIcon(PROVIDER_ICON_MAP[id], { size, className: 'kb-provider-mark' });
  }
  const toneKey = provider.brandTone || (provider.group === 'local' ? 'emerald' : provider.group === 'cloud' ? 'sky' : 'violet');
  const palette = TONES[toneKey] || TONES.slate;
  const code = escapeHtml((provider.logoCode || provider.name?.slice(0, 2) || 'AI').toUpperCase().slice(0, 3));
  return `<span class="kb-mono-mark" style="--kb-back:${palette.back};--kb-front:${palette.front};--kb-tint:${palette.tint};" aria-hidden="true">${code}</span>`;
}

/**
 * Hydrates `<span data-kubai-icon="name" data-kubai-size="20"></span>` placeholders in DOM.
 */
export function hydrateKubaiIcons(root = null) {
  if (typeof document === 'undefined') return 0;
  const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
  const nodes = scope.querySelectorAll('[data-kubai-icon]');
  let count = 0;
  nodes.forEach((node) => {
    const name = node.getAttribute('data-kubai-icon');
    if (!name) return;
    const size = Number(node.getAttribute('data-kubai-size') || 18);
    const tone = node.getAttribute('data-kubai-tone') || null;
    const extraClass = node.getAttribute('data-kubai-class') || '';
    if (node.dataset.kubaiBound === `${name}:${size}:${tone || ''}`) return;
    node.innerHTML = renderKubaiIcon(name, { size, tone, className: extraClass });
    node.dataset.kubaiBound = `${name}:${size}:${tone || ''}`;
    count += 1;
  });
  return count;
}

export const KUBAI_ICONS_SKILL_PROMPT = `# Kubai Icons (kubai087/kubai-icons) — Layered Animated Icon System

When creating custom feature icons, navigation emblems, section badges, empty-state illustrations, or product marks in user websites, apply the Kubai Icons layered architecture:

1. **Consistent Layered Geometry**:
   - Build every icon on a unified \`24x24\` (or \`32x32\`) SVG viewBox with three clear semantic layers:
     - \`.kb-back\` — soft rounded container or back-plate (\`rx="4"\`, \`fill-opacity="0.22"\`, subtle 1.2px derived stroke).
     - \`.kb-front\` — crisp primary foreground shape carrying the silhouette.
     - \`.kb-accent\` — focused highlight detail or indicator dot/spark that moves slightly on hover.
2. **Single-Accent Tonal Derivation**:
   - Derive back-plate tint, foreground fill, and outer stroke from one brand accent color per icon so the entire icon set shares optical weight across both dark and light surfaces.
3. **Tactile Hover Micro-Interpolation (160–200ms)**:
   - On parent button/card \`:hover\` or \`:focus-visible\`, shift \`.kb-front\` by \`translateY(-0.9px)\` and \`.kb-accent\` by \`translate(0.7px, -1.1px) scale(1.06)\` using \`cubic-bezier(0.16, 1, 0.3, 1)\`.
   - Always disable hover motion inside \`@media (prefers-reduced-motion: reduce)\`.
4. **Right-Sized Restraint**:
   - Use Kubai layered animated icons at \`20px–48px\` on navigation landmarks, feature cards, settings categories, and empty states. Keep dense \`14px–16px\` inline toolbar buttons crisp with minimal single-stroke Lucide icons.`;
