/**
 * WebForge Studio — Industrialized Minimal Prompt Studio
 *
 * Pure data + prompt compiler + localStorage templates + interactive 2-pane controller
 * (Focused single-step stage on left; 3D Live Blueprint Preview + Step Index Rail + Templates on right)
 * with 2-way Studio sync, Core 6 Cross-Library Mix & Match, and 4-Level AI Freedom slider.
 */

import { safeStorageJsonGet, safeStorageSet, escapeHtml, generateId } from './storage.mjs';
import {
  attachInteractiveCardTilt,
  attachRubberBandScroll,
  closeDialogFast,
  computeStaggerDelayMs,
  syncSlidingTabIndicator,
  triggerPeakEndBurst,
} from './motion.mjs';
import { WEBSITE_CATEGORIES, getCategoryWireframeSvg } from './pb-wireframes.mjs';
import {
  CORE_SECTION_SLOTS,
  MIX_MATCH_SECTION_SLOTS,
  AI_FREEDOM_LEVELS,
  DEFAULT_AI_FREEDOM_LEVEL,
  getFreedomLevelMeta,
  buildFreedomPromptDirective,
  formatSlotSelectionsForPrompt,
} from './section-swap.mjs';
import {
  CROSS_LIBRARY_FILTERS,
  queryCrossLibraryCandidates,
  hydrateCandidateDetail,
} from './section-swap-modal.mjs';
import {
  WATERMELON_CURATED_TEMPLATES,
  buildWatermelonPromptBlueprint,
  mapAssemblerBlocksToSlots,
} from './watermelon-ecosystem.mjs';
import {
  DEFAULT_TECH_FEATURES,
  DEFAULT_DO_NOT_LIST,
  OUTPUT_FORMATS,
  MOTION_LIBRARIES,
  DELIVERY_MODES,
  MOTION_CONCRETE_SPECS,
  UNIFIED_SECTION_CATALOG,
  getDefaultSectionConfig,
  resolveMotionProfileToggle,
  countSlotsWithSource,
  validatePromptSelections,
  auditPaletteContrast,
} from './prompt-validator.mjs';

export const PROMPT_TEMPLATES_STORAGE_KEY = 'wf_prompt_templates_v1';

export const PALETTE_TOKENS = Object.freeze({
  'obsidian-amber': {
    label: 'Obsidian Amber',
    bg: '#0B0B0D',
    surface: '#141316',
    surface2: '#1C1A1E',
    text: '#FAF8F5',
    muted: '#A8A29A',
    accent: '#F59E0B',
    accentText: '#FBBF24',
    accentFg: '#140E05',
    onAccent: '#140E05',
    border: 'rgba(255, 244, 230, 0.10)',
    isDark: true,
    lightTokens: {
      bg: '#FAF8F5',
      surface: '#FFFFFF',
      text: '#141316',
      muted: '#57534E',
      accent: '#B45309',
      accentText: '#92400E',
      onAccent: '#FFFFFF',
      hairline: 'rgba(20, 19, 22, 0.10)',
    },
    value: 'Obsidian (#0B0B0D) dark canvas with warm Amber (#F59E0B) focal accents and #FAF8F5 text',
    swatches: ['#0B0B0D', '#141316', '#F59E0B', '#FAF8F5'],
  },
  'industrial-steel': {
    label: 'Industrial Steel',
    bg: '#0E1012',
    surface: '#16191D',
    surface2: '#20242A',
    text: '#E5E7EB',
    muted: '#A1A8B3',
    accent: '#F97316',
    accentText: '#FB923C',
    accentFg: '#120802',
    onAccent: '#120802',
    border: 'rgba(229, 231, 235, 0.10)',
    isDark: true,
    lightTokens: {
      bg: '#F4F6F8',
      surface: '#FFFFFF',
      text: '#111827',
      muted: '#4B5563',
      accent: '#C2410C',
      accentText: '#9A3412',
      onAccent: '#FFFFFF',
      hairline: 'rgba(17, 24, 39, 0.10)',
    },
    value: 'Industrial Steel (#0E1012) machined slate canvas with Safety Orange (#F97316) accents and #E5E7EB ink',
    swatches: ['#0E1012', '#16191D', '#F97316', '#E5E7EB'],
  },
  'swiss-paper': {
    label: 'Swiss Paper',
    bg: '#F7F6F2',
    surface: '#FFFFFF',
    surface2: '#ECEAE3',
    text: '#111111',
    muted: '#57534E',
    accent: '#DC2626',
    accentText: '#B91C1C',
    accentFg: '#FFFFFF',
    onAccent: '#FFFFFF',
    border: 'rgba(17, 17, 17, 0.11)',
    isDark: false,
    darkTokens: {
      bg: '#111111',
      surface: '#1A1A1A',
      text: '#F7F6F2',
      muted: '#A8A29E',
      accent: '#EF4444',
      accentText: '#FCA5A5',
      onAccent: '#140505',
      hairline: 'rgba(255, 255, 255, 0.10)',
    },
    value: 'Swiss Archival Paper (#F7F6F2) canvas with Ink Black (#111111) typography and Signal Red (#DC2626) accents',
    swatches: ['#F7F6F2', '#FFFFFF', '#DC2626', '#111111'],
  },
  'deep-ocean': {
    label: 'Deep Ocean',
    bg: '#0C1219',
    surface: '#141D28',
    surface2: '#1B2736',
    text: '#F1F5F9',
    muted: '#94A3B8',
    accent: '#38BDF8',
    accentText: '#7DD3FC',
    accentFg: '#082F49',
    onAccent: '#082F49',
    border: 'rgba(148, 163, 184, 0.15)',
    isDark: true,
    lightTokens: {
      bg: '#F0F7FF',
      surface: '#FFFFFF',
      text: '#0C1219',
      muted: '#475569',
      accent: '#0369A1',
      accentText: '#075985',
      onAccent: '#FFFFFF',
      hairline: 'rgba(12, 18, 25, 0.10)',
    },
    value: 'Deep slate (#0C1219) dark mode with Cyan/Sky (#38BDF8) accents',
    swatches: ['#0C1219', '#141D28', '#38BDF8', '#F1F5F9'],
  },
  'botanical-slate': {
    label: 'Botanical Slate',
    bg: '#0C1411',
    surface: '#13201B',
    surface2: '#1A2B24',
    text: '#ECFDF5',
    muted: '#8EB3A5',
    accent: '#34D399',
    accentText: '#6EE7B7',
    accentFg: '#052E1C',
    onAccent: '#052E1C',
    border: 'rgba(134, 168, 155, 0.16)',
    isDark: true,
    lightTokens: {
      bg: '#F2FAF6',
      surface: '#FFFFFF',
      text: '#0C1F17',
      muted: '#3E5C50',
      accent: '#047857',
      accentText: '#065F46',
      onAccent: '#FFFFFF',
      hairline: 'rgba(12, 31, 23, 0.10)',
    },
    value: 'Deep Botanical Slate (#0C1411) canvas with Sage Mint (#34D399) focal highlights and #ECFDF5 text',
    swatches: ['#0C1411', '#13201B', '#34D399', '#ECFDF5'],
  },
  'midnight-indigo': {
    label: 'Midnight Indigo',
    bg: '#090A18',
    surface: '#12142B',
    surface2: '#1B1E3D',
    text: '#EEF2FF',
    muted: '#9AA8CE',
    accent: '#818CF8',
    accentText: '#A5B4FC',
    accentFg: '#0B0D24',
    onAccent: '#0B0D24',
    border: 'rgba(129, 140, 248, 0.18)',
    isDark: true,
    lightTokens: {
      bg: '#F5F7FF',
      surface: '#FFFFFF',
      text: '#11132B',
      muted: '#4B527A',
      accent: '#4338CA',
      accentText: '#3730A3',
      onAccent: '#FFFFFF',
      hairline: 'rgba(17, 19, 43, 0.10)',
    },
    value: 'Midnight Indigo (#090A18) dark canvas with Electric Periwinkle (#818CF8) accents and #EEF2FF text',
    swatches: ['#090A18', '#12142B', '#818CF8', '#EEF2FF'],
  },
  'crimson-editorial': {
    label: 'Crimson Editorial',
    bg: '#110B0C',
    surface: '#1C1214',
    surface2: '#291B1E',
    text: '#FAF5F5',
    muted: '#BCA4A6',
    accent: '#FB7185',
    accentText: '#FDA4AF',
    accentFg: '#1F080C',
    onAccent: '#1F080C',
    border: 'rgba(251, 113, 133, 0.16)',
    isDark: true,
    lightTokens: {
      bg: '#FDF6F7',
      surface: '#FFFFFF',
      text: '#1F0D10',
      muted: '#69474C',
      accent: '#BE123C',
      accentText: '#9F1239',
      onAccent: '#FFFFFF',
      hairline: 'rgba(31, 13, 16, 0.10)',
    },
    value: 'Espresso Plum (#110B0C) editorial dark canvas with Rose Crimson (#FB7185) highlights and warm ivory ink',
    swatches: ['#110B0C', '#1C1214', '#FB7185', '#FAF5F5'],
  },
  'sand-ink': {
    label: 'Sand & Teal',
    bg: '#EFECE6',
    surface: '#FAF8F4',
    surface2: '#E4DFD6',
    text: '#1A1816',
    muted: '#57524A',
    accent: '#0F766E',
    accentText: '#115E59',
    accentFg: '#FFFFFF',
    onAccent: '#FFFFFF',
    border: 'rgba(26, 24, 22, 0.11)',
    isDark: false,
    darkTokens: {
      bg: '#141311',
      surface: '#1E1C19',
      text: '#F5F2EB',
      muted: '#A8A298',
      accent: '#2DD4BF',
      accentText: '#5EEAD4',
      onAccent: '#042F2E',
      hairline: 'rgba(245, 242, 235, 0.10)',
    },
    value: 'Warm Limestone Sand (#EFECE6) canvas with Charcoal Ink (#1A1816) and Deep Teal (#0F766E) primary actions',
    swatches: ['#EFECE6', '#FAF8F4', '#0F766E', '#1A1816'],
  },
  'classic-blue': {
    label: 'Cobalt Blue',
    bg: '#FFFFFF',
    surface: '#F8FAFC',
    surface2: '#EFF6FF',
    text: '#0F172A',
    muted: '#475569',
    accent: '#2563EB',
    accentText: '#1D4ED8',
    accentFg: '#FFFFFF',
    onAccent: '#FFFFFF',
    border: 'rgba(15, 23, 42, 0.10)',
    isDark: false,
    darkTokens: {
      bg: '#0B1120',
      surface: '#111827',
      text: '#F8FAFC',
      muted: '#94A3B8',
      accent: '#60A5FA',
      accentText: '#93C5FD',
      onAccent: '#0B1120',
      hairline: 'rgba(248, 250, 252, 0.10)',
    },
    value: 'Cobalt Blue (#2563EB) primary with white (#ffffff) surface',
    swatches: ['#FFFFFF', '#2563EB', '#0F172A', '#F8FAFC'],
  },
  'charcoal-gold': {
    label: 'Charcoal & Gold',
    bg: '#F8F5EF',
    surface: '#FFFFFF',
    surface2: '#F1EAE0',
    text: '#1C1917',
    muted: '#595248',
    accent: '#8A5D12',
    accentText: '#784F0D',
    accentFg: '#FFFFFF',
    onAccent: '#FFFFFF',
    border: 'rgba(28, 25, 23, 0.11)',
    isDark: false,
    darkTokens: {
      bg: '#141210',
      surface: '#1E1B18',
      text: '#F8F5EF',
      muted: '#AFA69A',
      accent: '#EAB308',
      accentText: '#FACC15',
      onAccent: '#1A1304',
      hairline: 'rgba(248, 245, 239, 0.10)',
    },
    value: 'Charcoal (#1C1917) with Gold (#8A5D12) accents on warm paper (#F8F5EF)',
    swatches: ['#F8F5EF', '#1C1917', '#8A5D12', '#FFFFFF'],
  },
  'terracotta-paper': {
    label: 'Terracotta Paper',
    bg: '#FAF7F2',
    surface: '#FFFFFF',
    surface2: '#F3ECE2',
    text: '#231D18',
    muted: '#5C5046',
    accent: '#B34722',
    accentText: '#9A3A1A',
    accentFg: '#FFFFFF',
    onAccent: '#FFFFFF',
    border: 'rgba(35, 29, 24, 0.10)',
    isDark: false,
    darkTokens: {
      bg: '#161210',
      surface: '#211B18',
      text: '#FAF7F2',
      muted: '#B5A598',
      accent: '#FB923C',
      accentText: '#FDBA74',
      onAccent: '#1D0E05',
      hairline: 'rgba(250, 247, 242, 0.10)',
    },
    value: 'Warm Alabaster (#FAF7F2) canvas, Espresso (#231D18) ink, and Terracotta (#B34722) accents',
    swatches: ['#FAF7F2', '#231D18', '#B34722', '#FFFFFF'],
  },
  'forest-green': {
    label: 'Forest Green',
    bg: '#F4FBF7',
    surface: '#FFFFFF',
    surface2: '#ECFDF5',
    text: '#064E3B',
    muted: '#3A5A4E',
    accent: '#047857',
    accentText: '#065F46',
    accentFg: '#FFFFFF',
    onAccent: '#FFFFFF',
    border: 'rgba(6, 78, 59, 0.12)',
    isDark: false,
    darkTokens: {
      bg: '#081511',
      surface: '#10211B',
      text: '#ECFDF5',
      muted: '#8DB3A4',
      accent: '#34D399',
      accentText: '#6EE7B7',
      onAccent: '#052E1C',
      hairline: 'rgba(236, 253, 245, 0.10)',
    },
    value: 'Emerald (#047857) and Forest (#064E3B) with crisp light surface',
    swatches: ['#F4FBF7', '#047857', '#064E3B', '#FFFFFF'],
  },
  monochrome: {
    label: 'Monochrome',
    bg: '#FFFFFF',
    surface: '#FAFAFA',
    surface2: '#F4F4F5',
    text: '#111111',
    muted: '#52525B',
    accent: '#18181B',
    accentText: '#18181B',
    accentFg: '#FFFFFF',
    onAccent: '#FFFFFF',
    border: 'rgba(24, 24, 27, 0.10)',
    isDark: false,
    darkTokens: {
      bg: '#09090B',
      surface: '#141417',
      text: '#FAFAFA',
      muted: '#A1A1AA',
      accent: '#FAFAFA',
      accentText: '#E4E4E7',
      onAccent: '#09090B',
      hairline: 'rgba(255, 255, 255, 0.10)',
    },
    value: 'Slate (#52525B) and Ink (#111111) with white background',
    swatches: ['#FFFFFF', '#111111', '#52525B', '#F4F4F5'],
  },
  'nordic-slate': {
    label: 'Nordic Slate',
    bg: '#F0F5F9',
    surface: '#FFFFFF',
    surface2: '#E4ECF2',
    text: '#1E2022',
    muted: '#4A5862',
    accent: '#3B5266',
    accentText: '#2C4256',
    accentFg: '#FFFFFF',
    onAccent: '#FFFFFF',
    border: 'rgba(30, 32, 34, 0.10)',
    isDark: false,
    darkTokens: {
      bg: '#0D1318',
      surface: '#151E26',
      text: '#F0F5F9',
      muted: '#99ABB8',
      accent: '#7DD3FC',
      accentText: '#BAE6FD',
      onAccent: '#082032',
      hairline: 'rgba(240, 245, 249, 0.10)',
    },
    value: 'Nordic slate (#F0F5F9) background, steel (#3B5266), and charcoal (#1E2022)',
    swatches: ['#F0F5F9', '#3B5266', '#4A5862', '#1E2022'],
  },
  'designmd-linear': {
    label: 'Linear Dark Craft',
    bg: '#08090A',
    surface: '#111214',
    surface2: '#191B1F',
    text: '#F7F8F8',
    muted: '#8A8F98',
    accent: '#5E6AD2',
    accentText: '#8B93E8',
    accentFg: '#FFFFFF',
    onAccent: '#FFFFFF',
    border: 'rgba(255, 255, 255, 0.08)',
    isDark: true,
    lightTokens: {
      bg: '#F8F9FA',
      surface: '#FFFFFF',
      text: '#111214',
      muted: '#525866',
      accent: '#4C56C0',
      accentText: '#3E48B0',
      onAccent: '#FFFFFF',
      hairline: 'rgba(17, 18, 20, 0.09)',
    },
  },
  'designmd-stripe': {
    label: 'Stripe Editorial Fintech',
    bg: '#FFFFFF',
    surface: '#F6F9FC',
    surface2: '#EEF2FF',
    text: '#0A2540',
    muted: '#425466',
    accent: '#5850EC',
    accentText: '#4B40DB',
    accentFg: '#FFFFFF',
    onAccent: '#FFFFFF',
    border: 'rgba(10, 37, 64, 0.10)',
    isDark: false,
    darkTokens: {
      bg: '#0A192F',
      surface: '#112240',
      text: '#F8FAFC',
      muted: '#94A3B8',
      accent: '#818CF8',
      accentText: '#A5B4FC',
      onAccent: '#0A192F',
      hairline: 'rgba(248, 250, 252, 0.10)',
    },
  },
  'designmd-vercel': {
    label: 'Vercel Geist Monochrome',
    bg: '#000000',
    surface: '#0A0A0A',
    surface2: '#161616',
    text: '#EDEDED',
    muted: '#8E8E93',
    accent: '#FFFFFF',
    accentText: '#FFFFFF',
    accentFg: '#000000',
    onAccent: '#000000',
    border: 'rgba(255, 255, 255, 0.12)',
    isDark: true,
    lightTokens: {
      bg: '#FFFFFF',
      surface: '#FAFAFA',
      text: '#000000',
      muted: '#555555',
      accent: '#000000',
      accentText: '#111111',
      onAccent: '#FFFFFF',
      hairline: 'rgba(0, 0, 0, 0.10)',
    },
  },
  'designmd-raycast': {
    label: 'Raycast Tactile Dark',
    bg: '#0C0D0F',
    surface: '#15161A',
    surface2: '#1E2026',
    text: '#F5F5F7',
    muted: '#9C9EA8',
    accent: '#FF6363',
    accentText: '#FF8585',
    accentFg: '#140505',
    onAccent: '#140505',
    border: 'rgba(255, 255, 255, 0.09)',
    isDark: true,
    lightTokens: {
      bg: '#FAF9FA',
      surface: '#FFFFFF',
      text: '#111216',
      muted: '#525460',
      accent: '#D93838',
      accentText: '#B91C1C',
      onAccent: '#FFFFFF',
      hairline: 'rgba(17, 18, 22, 0.10)',
    },
  },
  'designmd-supabase': {
    label: 'Supabase Emerald Dev',
    bg: '#121212',
    surface: '#1A1A1A',
    surface2: '#232323',
    text: '#EDEDED',
    muted: '#949494',
    accent: '#3ECF8E',
    accentText: '#6EE7B7',
    accentFg: '#052E1C',
    onAccent: '#052E1C',
    border: 'rgba(255, 255, 255, 0.09)',
    isDark: true,
    lightTokens: {
      bg: '#F8FAF9',
      surface: '#FFFFFF',
      text: '#111815',
      muted: '#4B5B54',
      accent: '#047857',
      accentText: '#065F46',
      onAccent: '#FFFFFF',
      hairline: 'rgba(17, 24, 21, 0.10)',
    },
  },
});

export const CURATED_PALETTE_KEYS = Object.freeze([
  'obsidian-amber',
  'industrial-steel',
  'swiss-paper',
  'deep-ocean',
  'botanical-slate',
  'midnight-indigo',
  'crimson-editorial',
  'sand-ink',
  'classic-blue',
  'charcoal-gold',
  'terracotta-paper',
  'forest-green',
  'monochrome',
  'nordic-slate',
]);

export const DESIGN_MD_PRESETS = Object.freeze([
  {
    id: 'designmd-linear',
    name: 'Linear DESIGN.md',
    subtitle: 'Obsidian #08090A · Inter + Mono · Hairline glass',
    swatches: ['#08090A', '#191B1F', '#5E6AD2'],
    styleValue: 'Dark and Modern (Linear DESIGN.md aesthetic: ultra-crisp 1px hairlines, obsidian surfaces, subtle indigo focus)',
    colorValue: 'Linear Dark (#08090A background, #111214 surfaces, #F7F8F8 text, #5E6AD2 indigo accent)',
    fontValue: 'Inter for UI & headings, JetBrains Mono for technical labels and tabular metrics',
  },
  {
    id: 'designmd-stripe',
    name: 'Stripe DESIGN.md',
    subtitle: 'Crisp #FFFFFF · #0A2540 ink · Indigo #635BFF',
    swatches: ['#FFFFFF', '#0A2540', '#635BFF'],
    styleValue: 'Editorial Fintech (Stripe DESIGN.md aesthetic: crisp white surfaces, deep navy ink, structured Bento precision)',
    colorValue: 'Stripe Fintech (#FFFFFF background, #F6F9FC surface, #0A2540 ink, #635BFF indigo accent)',
    fontValue: 'Plus Jakarta Sans for display headlines, Inter for body copy, JetBrains Mono for API snippets',
  },
  {
    id: 'designmd-vercel',
    name: 'Vercel DESIGN.md',
    subtitle: 'Pure #000000 · Geist Monochrome · High contrast',
    swatches: ['#000000', '#161616', '#FFFFFF'],
    styleValue: 'Swiss Monochrome (Vercel DESIGN.md aesthetic: pure black canvas, hairline borders, high-contrast Geist typography)',
    colorValue: 'Vercel Monochrome (#000000 canvas, #0A0A0A cards, #EDEDED text, pure #FFFFFF primary CTA)',
    fontValue: 'Space Grotesk / Geist Sans for headings, Inter for UI copy, JetBrains Mono for code',
  },
  {
    id: 'designmd-raycast',
    name: 'Raycast DESIGN.md',
    subtitle: 'Graphite #0C0D0F · Coral #FF6363 · Keyboard-first',
    swatches: ['#0C0D0F', '#1E2026', '#FF6363'],
    styleValue: 'Tactile Launcher Dark (Raycast DESIGN.md aesthetic: smoked graphite surfaces, coral highlight, keyboard shortcut hints)',
    colorValue: 'Raycast Dark (#0C0D0F canvas, #15161A elevated panels, #F5F5F7 text, #FF6363 coral focal CTA)',
    fontValue: 'Inter for interface clarity, JetBrains Mono for shortcut hints and telemetry',
  },
  {
    id: 'designmd-supabase',
    name: 'Supabase DESIGN.md',
    subtitle: 'Carbon #121212 · Emerald #3ECF8E · Dev console',
    swatches: ['#121212', '#1A1A1A', '#3ECF8E'],
    styleValue: 'Developer Console Dark (Supabase DESIGN.md aesthetic: carbon surfaces, emerald accents, structured technical grids)',
    colorValue: 'Supabase Emerald (#121212 canvas, #1A1A1A surfaces, #EDEDED text, #3ECF8E emerald accent)',
    fontValue: 'Inter for copy & headings, JetBrains Mono for schemas, SQL, and tabular KPIs',
  },
]);

export const TYPOGRAPHY_PAIRINGS = Object.freeze([
  {
    id: 'inter-mono',
    name: 'Inter + JetBrains Mono',
    desc: 'Crisp product UI & developer clarity',
    sampleHeading: 'Ship faster with precision',
    headingCss: "'Inter', system-ui, sans-serif",
    bodyCss: "'Inter', system-ui, sans-serif",
    value: 'Inter for headings and UI body, JetBrains Mono for code, metrics, and tabular numbers',
  },
  {
    id: 'instrument-jakarta',
    name: 'Instrument Serif + Jakarta',
    desc: 'Editorial warmth with modern SaaS polish',
    sampleHeading: 'Crafted for modern teams',
    headingCss: "Georgia, 'Instrument Serif', serif",
    bodyCss: "'Plus Jakarta Sans', 'Inter', sans-serif",
    value: 'Instrument Serif (or Playfair Display) for expressive editorial headings, Plus Jakarta Sans for body UI',
  },
  {
    id: 'grotesk-inter',
    name: 'Space Grotesk + Inter',
    desc: 'Geometric tech & bold product presence',
    sampleHeading: 'Next-generation studio',
    headingCss: "'Space Grotesk', 'Inter', sans-serif",
    bodyCss: "'Inter', system-ui, sans-serif",
    value: 'Space Grotesk for geometric display headlines, Inter for high-legibility body copy',
  },
  {
    id: 'cormorant-dm',
    name: 'Cormorant + DM Sans',
    desc: 'Quiet luxury & architectural elegance',
    sampleHeading: 'Timeless visual presence',
    headingCss: "Georgia, 'Cormorant Garamond', serif",
    bodyCss: "'DM Sans', 'Inter', sans-serif",
    value: 'Cormorant Garamond for high-contrast luxury headings, DM Sans for clean minimalist body copy',
  },
  {
    id: 'mono-technical',
    name: 'IBM Plex Sans + Plex Mono',
    desc: 'Analytical precision & enterprise trust',
    sampleHeading: 'Operational clarity at scale',
    headingCss: "'IBM Plex Sans', 'Inter', sans-serif",
    bodyCss: "'IBM Plex Mono', monospace",
    value: 'IBM Plex Sans for authoritative headers and copy, IBM Plex Mono for structured data and badges',
  },
  {
    id: 'bricolage-manrope',
    name: 'Bricolage + Manrope',
    desc: 'Distinctive founder SaaS & modern brands',
    sampleHeading: 'Built with unmistakable character',
    headingCss: "'Bricolage Grotesque', 'Space Grotesk', sans-serif",
    bodyCss: "'Manrope', 'Inter', sans-serif",
    value: 'Bricolage Grotesque for expressive characterful headings, Manrope for crisp readable UI copy',
  },
  {
    id: 'fraunces-jakarta',
    name: 'Fraunces + Plus Jakarta',
    desc: 'Soft optical serif & tactile storefront UI',
    sampleHeading: 'Objects made to last decades',
    headingCss: "'Fraunces', Georgia, serif",
    bodyCss: "'Plus Jakarta Sans', 'Inter', sans-serif",
    value: 'Fraunces soft optical display serif for headlines, Plus Jakarta Sans for modern interface legibility',
  },
  {
    id: 'outfit-mono',
    name: 'Outfit + JetBrains Mono',
    desc: 'Industrial geometric hardware & AI tools',
    sampleHeading: 'Engineered for zero latency',
    headingCss: "'Outfit', 'Inter', sans-serif",
    bodyCss: "'JetBrains Mono', monospace",
    value: 'Outfit geometric sans for crisp industrial headlines, JetBrains Mono for technical specs and KPIs',
  },
  {
    id: 'playfair-dm',
    name: 'Playfair Display + DM Sans',
    desc: 'High-contrast magazine & luxury hospitality',
    sampleHeading: 'Season Four Monograph',
    headingCss: "'Playfair Display', Georgia, serif",
    bodyCss: "'DM Sans', 'Inter', sans-serif",
    value: 'Playfair Display for dramatic editorial mastheads, DM Sans for balanced clean paragraphs',
  },
  {
    id: 'barlow-inter',
    name: 'Barlow Condensed + Inter',
    desc: 'Bold kinetic posters, fitness & industrial',
    sampleHeading: 'MAXIMUM VELOCITY SYSTEMS',
    headingCss: "'Barlow Condensed', 'Inter', sans-serif",
    bodyCss: "'Inter', system-ui, sans-serif",
    value: 'Barlow Condensed uppercase display typography for high-impact headlines, Inter for body copy',
  },
]);

export const MOTION_PROFILES = Object.freeze([
  {
    id: 'expressive-20',
    name: 'Expressive 20-Principle',
    desc: 'Squash-stretch springs, directional transitions & fast close',
    previewKind: 'spring-press',
    value: 'Expressive 20-Principle UX Motion: tactile squash-and-stretch press feedback, capped 36ms stagger cascades, origin-aware dialogs/menus, fast asymmetric exits (120ms ease-in), and Peak-End completion flourishes (respecting prefers-reduced-motion)',
  },
  {
    id: 'refined-minimal',
    name: 'Refined Linear Precision',
    desc: 'Ultra-crisp 150ms cubic-out snaps with zero bounce',
    previewKind: 'linear-snap',
    value: 'Refined Linear Precision Motion: crisp 150ms ease-out micro-transitions, subtle focus rings, zero gratuitous bounce, compositor-only transform/opacity',
  },
  {
    id: 'editorial-smooth',
    name: 'Editorial Smooth Reveals',
    desc: 'Unhurried veil reveals, depth glide & soft entrances',
    previewKind: 'editorial-reveal',
    value: 'Editorial Smooth Motion: measured scroll-triggered section reveals, gentle depth parallax on hero imagery, and silky typographic fade-ins',
  },
  {
    id: 'kinetic-stagger',
    name: 'Kinetic Stagger Cascade',
    desc: 'Sequential 36ms card wave & directional sliding tabs',
    previewKind: 'stagger-cascade',
    value: 'Kinetic Stagger Cascade Motion: sequential capped 36ms card wave entrances, sliding tab indicators, and snappy list filtering transitions',
  },
  {
    id: 'elastic-tactile',
    name: 'Elastic Tactile Pop',
    desc: 'Playful spring overshoot lift & responsive press bounce',
    previewKind: 'elastic-pop',
    value: 'Elastic Tactile Pop Motion: spring-curve overshoot lift on interactive cards, playful badge pop confirmations, and tactile toggle physics',
  },
  {
    id: 'zero-motion',
    name: 'Instant / Reduced Motion',
    desc: 'Zero decorative motion — crisp instant state changes',
    previewKind: 'instant-snap',
    value: 'Instant / Accessibility-First Motion: no decorative animations, instant state changes with crisp focus states and hover contrast shifts',
  },
]);

export const INTERACTION_STYLES = Object.freeze([
  {
    id: 'tactile-springs',
    name: 'Tactile Springs & Hover Lift',
    desc: 'Curved card elevation, sliding tab indicators, subtle 3D tilt',
    value: 'Tactile Springs & Hover Lift: sliding active tab indicators, subtle 3D card sheen on hover, crisp active press compression, and instant inline feedback',
  },
  {
    id: 'keyboard-command',
    name: 'Keyboard-First Command',
    desc: 'Cmd+K palette, visible shortcut hints & instant focus nav',
    value: 'Keyboard-First Command Craft: Cmd+K quick command palette, keyboard-navigable cards and menus, and visible shortcut hints',
  },
  {
    id: 'magnetic-editorial',
    name: 'Editorial Focus & Hairlines',
    desc: 'Underline ink reveals, calm surface elevation & drawers',
    value: 'Editorial Focus & Hairlines: animated link underlines, calm hairline border transitions, and tactile drawer reveals',
  },
  {
    id: 'data-dense',
    name: 'High-Density Pro Workspace',
    desc: 'Inline filtering, instant sort, tabular numerals & row actions',
    value: 'High-Density Pro Workspace: instant client-side search/filter, tabular-nums alignment, sticky headers, and contextual hover row actions',
  },
]);

export const AUDIENCE_PRESETS = Object.freeze([
  { id: 'b2b-saas', name: 'B2B SaaS Buyers', desc: 'Product leaders & decision-makers' },
  { id: 'developers', name: 'Developers & Engineers', desc: 'Technical teams wanting proof & speed' },
  { id: 'consumers', name: 'Design-Conscious Shoppers', desc: 'Visual buyers seeking trust & craft' },
  { id: 'founders', name: 'Founders & Executives', desc: 'Time-poor buyers scanning high-signal KPIs' },
  { id: 'creatives', name: 'Studios & Clients', desc: 'Creative directors evaluating craft & case studies' },
  { id: 'community', name: 'Broad Consumer Audience', desc: 'Approachable, effortless onboarding' },
]);

export const PAGE_SCOPES = Object.freeze([
  { id: 'single-launchpad', name: 'Single-Page Launchpad', desc: 'Focused conversion flow with anchor sections', value: 'single-page launchpad' },
  { id: 'multi-section-flagship', name: 'Multi-Section Flagship', desc: 'Rich storytelling, interactive demos, pricing, FAQ', value: 'multi-section flagship website' },
  { id: 'interactive-workspace', name: 'Interactive App Workspace', desc: 'Live dashboard with views, filters, and stateful tools', value: 'interactive web application workspace' },
  { id: 'content-hub', name: 'Editorial / Catalog Hub', desc: 'Filterable catalog, detail drawers, and search', value: 'multi-view content and catalog hub' },
]);

export const STARTER_BLUEPRINTS = Object.freeze([
  {
    id: 'saas-launchpad',
    name: 'SaaS Launchpad',
    category: 'Linear Dark · Product',
    summary: 'Obsidian product site with interactive preview, Bento features & pricing',
    swatches: ['#08090A', '#191B1F', '#5E6AD2'],
    selections: {
      type: 'SaaS / Landing Page',
      style: DESIGN_MD_PRESETS[0].styleValue,
      designSystemId: 'designmd-linear',
      paletteKey: 'designmd-linear',
      color: DESIGN_MD_PRESETS[0].colorValue,
      typographyId: 'inter-mono',
      fontPref: TYPOGRAPHY_PAIRINGS[0].value,
      header: 'Fixed top navigation bar',
      hero: 'Split hero with text on left and visual on right',
      content: 'Card-based grid layout',
      footer: 'Multi-column footer with navigation and contact',
      spacing: 'Balanced modern spacing (80-96px section rhythm)',
      motionProfile: MOTION_PROFILES[0].value,
      motionProfileId: 'expressive-20',
      interactionStyle: INTERACTION_STYLES[0].value,
      interactionStyleId: 'tactile-springs',
      siteName: 'Kinetix Cloud',
      siteTagline: 'Deploy edge workflows in under 200ms',
      siteDescription: 'Zero-config edge orchestration, live telemetry, and instant rollbacks for high-velocity engineering teams.',
      siteTone: 'Technical and concise',
      audience: 'Developers & Engineers',
      pageCount: 'multi-section flagship website',
      customSections: 'Interactive Latency Benchmark, Bento Architecture Grid, Transparent Pricing Tiers, Customer Proof, FAQ',
      tech: 'React with Tailwind CSS and Lucide React',
      features: [
        'Responsive hamburger mobile menu',
        'Smooth scroll navigation',
        'Pricing table section',
        'FAQ accordion section',
        'Interactive data filter / search',
      ],
      techFeatures: ['Use semantic HTML5 elements', 'Ensure WCAG AA accessibility standards', 'Use CSS custom properties'],
    },
  },
  {
    id: 'editorial-luxury',
    name: 'Editorial Luxury',
    category: 'Warm Paper · Brand',
    summary: 'Architectural serif brand house with gallery narrative and booking',
    swatches: ['#F8F5EF', '#1C1917', '#B4832C'],
    selections: {
      type: 'Portfolio / Personal',
      style: 'Elegant and Luxury',
      designSystemId: '',
      paletteKey: 'charcoal-gold',
      color: 'Charcoal (#1C1917) with Gold (#B4832C) accents on warm architectural paper (#F8F5EF)',
      typographyId: 'cormorant-dm',
      fontPref: TYPOGRAPHY_PAIRINGS[3].value,
      header: 'Centered logo with navigation below',
      hero: 'Minimal text-only hero with bold typography',
      content: 'Alternating left-right feature sections',
      footer: 'Minimal single-line footer',
      spacing: 'Generous editorial breathing room (120px+ whitespace)',
      motionProfile: MOTION_PROFILES[2].value,
      motionProfileId: 'editorial-smooth',
      interactionStyle: INTERACTION_STYLES[2].value,
      interactionStyleId: 'magnetic-editorial',
      siteName: 'Atelier Lumière',
      siteTagline: 'Quiet architectural spaces crafted for permanence',
      siteDescription: 'Boutique residential architecture and interior studio based in Milan and Zurich, specializing in travertine, warm oak, and natural light.',
      siteTone: 'Editorial and refined',
      audience: 'Studios & Clients',
      pageCount: 'multi-section flagship website',
      customSections: 'Selected Monograph Index, Studio Ethos, Material Archive, Private Consultation Inquiry',
      tech: 'React with Tailwind CSS and Lucide React',
      features: [
        'Responsive hamburger mobile menu',
        'Smooth scroll navigation',
        'Contact form with validation',
      ],
      techFeatures: ['Use semantic HTML5 elements', 'Ensure WCAG AA accessibility standards', 'Include Google Fonts'],
    },
  },
  {
    id: 'commerce-flagship',
    name: 'Modern Storefront',
    category: 'Terracotta · Commerce',
    summary: 'Tactile DTC flagship with filterable catalog, quick-view drawer & cart',
    swatches: ['#FAF7F2', '#231D18', '#C25934'],
    selections: {
      type: 'E-Commerce / Online Store',
      style: 'Minimalist and Clean',
      designSystemId: '',
      paletteKey: 'terracotta-paper',
      color: 'Warm Alabaster (#FAF7F2) canvas, Espresso (#231D18) ink, and Terracotta (#C25934) accents',
      typographyId: 'instrument-jakarta',
      fontPref: TYPOGRAPHY_PAIRINGS[1].value,
      header: 'Fixed top navigation bar',
      hero: 'Split hero with text on left and visual on right',
      content: 'Card-based grid layout',
      footer: 'Multi-column footer with navigation and contact',
      spacing: 'Balanced modern spacing (80-96px section rhythm)',
      motionProfile: MOTION_PROFILES[0].value,
      motionProfileId: 'expressive-20',
      interactionStyle: INTERACTION_STYLES[0].value,
      interactionStyleId: 'tactile-springs',
      siteName: 'Sola Ceramic Studio',
      siteTagline: 'Small-batch stoneware thrown for daily rituals',
      siteDescription: 'Hand-glazed ceramic pour-overs, mugs, and dining sets fired in small batches with interactive category filtering and slide-out cart drawer.',
      siteTone: 'Warm and approachable',
      audience: 'Design-Conscious Shoppers',
      pageCount: 'multi-view content and catalog hub',
      customSections: 'Featured Collection Grid, Category Filter Bar, Interactive Cart Drawer, Craftsmanship Story, Newsletter',
      tech: 'React with Tailwind CSS and Lucide React',
      features: [
        'Responsive hamburger mobile menu',
        'Smooth scroll navigation',
        'Interactive data filter / search',
        'Newsletter subscription form',
      ],
      techFeatures: ['Use semantic HTML5 elements', 'Ensure WCAG AA accessibility standards', 'Include Google Fonts'],
    },
  },
  {
    id: 'ai-workspace',
    name: 'AI Agent Workspace',
    category: 'Raycast Dark · App',
    summary: 'Keyboard-first AI cockpit with sidebar nav, live queue & KPI telemetry',
    swatches: ['#0C0D0F', '#1E2026', '#FF6363'],
    selections: {
      type: 'SaaS / Landing Page',
      style: DESIGN_MD_PRESETS[3].styleValue,
      designSystemId: 'designmd-raycast',
      paletteKey: 'designmd-raycast',
      color: DESIGN_MD_PRESETS[3].colorValue,
      typographyId: 'inter-mono',
      fontPref: TYPOGRAPHY_PAIRINGS[0].value,
      header: 'Left sidebar navigation',
      hero: 'Split hero with text on left and visual on right',
      content: 'Data-dense tabbed dashboard workspace',
      footer: 'Minimal single-line footer',
      spacing: 'Compact high-density workspace (tight 16-24px rhythm)',
      motionProfile: MOTION_PROFILES[0].value,
      motionProfileId: 'expressive-20',
      interactionStyle: INTERACTION_STYLES[1].value,
      interactionStyleId: 'keyboard-command',
      siteName: 'PulseOps AI',
      siteTagline: 'Autonomous incident triage and live runbooks',
      siteDescription: 'Real-time operational cockpit for engineering teams monitoring AI workflows, latency budgets, and automated remediation runs.',
      siteTone: 'Technical and concise',
      audience: 'Developers & Engineers',
      pageCount: 'interactive web application workspace',
      customSections: 'KPI Metrics Strip, Live Run Stream, Interactive Filterable Queue, Command Palette Overlay',
      tech: 'React with Tailwind CSS and Lucide React',
      features: [
        'Dark / Light mode toggle',
        'Interactive data filter / search',
        'Responsive hamburger mobile menu',
      ],
      techFeatures: ['Use semantic HTML5 elements', 'Ensure WCAG AA accessibility standards', 'Use CSS custom properties'],
    },
  },
  {
    id: 'dev-launchpad',
    name: 'Developer Platform',
    category: 'Supabase Emerald · Docs',
    summary: 'Carbon dev platform with live API explorer, SDK tabs & benchmarks',
    swatches: ['#121212', '#1A1A1A', '#3ECF8E'],
    selections: {
      type: 'SaaS / Landing Page',
      style: DESIGN_MD_PRESETS[4].styleValue,
      designSystemId: 'designmd-supabase',
      paletteKey: 'designmd-supabase',
      color: DESIGN_MD_PRESETS[4].colorValue,
      typographyId: 'mono-technical',
      fontPref: TYPOGRAPHY_PAIRINGS[4].value,
      header: 'Fixed top navigation bar',
      hero: 'Full-screen hero with centered headline',
      content: 'Card-based grid layout',
      footer: 'Multi-column footer with navigation and contact',
      spacing: 'Balanced modern spacing (80-96px section rhythm)',
      motionProfile: MOTION_PROFILES[1].value,
      motionProfileId: 'refined-minimal',
      interactionStyle: INTERACTION_STYLES[3].value,
      interactionStyleId: 'data-dense',
      siteName: 'VectorBase DB',
      siteTagline: 'Sub-millisecond hybrid vector storage for production apps',
      siteDescription: 'Open-source Postgres + vector indexing platform featuring interactive SDK language tabs, benchmark charts, and transparent usage pricing.',
      siteTone: 'Technical and concise',
      audience: 'Developers & Engineers',
      pageCount: 'multi-section flagship website',
      customSections: 'Interactive Code Tabs (TS/Python/cURL), Latency Benchmarks, Feature Matrix, Usage Pricing Calculator',
      tech: 'React with Tailwind CSS and Lucide React',
      features: [
        'Responsive hamburger mobile menu',
        'Smooth scroll navigation',
        'Pricing table section',
        'FAQ accordion section',
      ],
      techFeatures: ['Use semantic HTML5 elements', 'Ensure WCAG AA accessibility standards', 'Use CSS custom properties'],
    },
  },
  {
    id: 'creative-portfolio',
    name: 'Creative Director',
    category: 'Vercel Monochrome · Craft',
    summary: 'Pure black Swiss portfolio with bold index, case study cards & contact',
    swatches: ['#000000', '#161616', '#FFFFFF'],
    selections: {
      type: 'Portfolio / Personal',
      style: DESIGN_MD_PRESETS[2].styleValue,
      designSystemId: 'designmd-vercel',
      paletteKey: 'designmd-vercel',
      color: DESIGN_MD_PRESETS[2].colorValue,
      typographyId: 'grotesk-inter',
      fontPref: TYPOGRAPHY_PAIRINGS[2].value,
      header: 'Fixed top navigation bar',
      hero: 'Minimal text-only hero with bold typography',
      content: 'Alternating left-right feature sections',
      footer: 'Minimal single-line footer',
      spacing: 'Generous editorial breathing room (120px+ whitespace)',
      motionProfile: MOTION_PROFILES[0].value,
      motionProfileId: 'expressive-20',
      interactionStyle: INTERACTION_STYLES[0].value,
      interactionStyleId: 'tactile-springs',
      siteName: 'Soren Lindqvist',
      siteTagline: 'Design engineer crafting tactile web software',
      siteDescription: 'Independent design engineer partnering with Series A/B founders on design systems, interactive prototypes, and motion craft.',
      siteTone: 'Editorial and refined',
      audience: 'Founders & Executives',
      pageCount: 'single-page launchpad',
      customSections: 'Selected Works Index, Interactive Case Study Preview, Capabilities & Stack, Direct Booking Form',
      tech: 'React with Tailwind CSS and Lucide React',
      features: [
        'Responsive hamburger mobile menu',
        'Smooth scroll navigation',
        'Contact form with validation',
      ],
      techFeatures: ['Use semantic HTML5 elements', 'Ensure WCAG AA accessibility standards', 'Include Google Fonts'],
    },
  },
]);

export function createEmptySelections() {
  return {
    type: '',
    style: '',
    designSystemId: '',
    color: '',
    paletteKey: '',
    customPalette: null,
    typographyId: '',
    header: '',
    hero: '',
    content: '',
    secondaryLayout: '',
    footer: '',
    spacing: '',
    animation: '',
    motionProfile: '',
    motionProfileId: '',
    motionProfiles: [],
    motionLibrary: 'css-only', // 'css-only' | 'framer-motion'
    interactionStyle: '',
    interactionStyleId: '',
    aiFreedomLevel: DEFAULT_AI_FREEDOM_LEVEL,
    componentMode: 'library', // 'library' | 'mix-match'
    slotSelections: {}, // 10 Mix & Match slots
    outputFormat: 'single-file', // 'single-file' | 'file-tree'
    deliveryMode: 'full-one-shot', // 'full-one-shot' | 'phased'
    enabledSections: [], // unified configurable section IDs
    sectionConfigs: {}, // { [sectionId]: { ...fieldValues } }
    features: [],
    techFeatures: [...DEFAULT_TECH_FEATURES],
    tech: '',
    siteName: '',
    siteTagline: '',
    siteDescription: '',
    siteTone: '',
    audience: '',
    pageCount: '',
    customSections: '',
    fontPref: '',
    doNotList: DEFAULT_DO_NOT_LIST,
    selectedSkills: [], // explicitly toggled Prompt Studio skills (no hidden leaks)
  };
}

function resolveActivePaletteTokens(s) {
  if (s.customPalette && s.customPalette.bg) return s.customPalette;
  if (s.paletteKey && PALETTE_TOKENS[s.paletteKey]) return PALETTE_TOKENS[s.paletteKey];
  if (s.designSystemId && PALETTE_TOKENS[s.designSystemId]) return PALETTE_TOKENS[s.designSystemId];
  return null;
}

function buildUnifiedSectionsLines(s) {
  const features = Array.isArray(s.features) ? s.features : [];
  const enabledIds = new Set(Array.isArray(s.enabledSections) ? s.enabledSections : []);
  const configs = s.sectionConfigs && typeof s.sectionConfigs === 'object' ? s.sectionConfigs : {};

  // Sync legacy feature strings into unified section IDs automatically
  for (const item of UNIFIED_SECTION_CATALOG) {
    if (item.featureValue && features.includes(item.featureValue)) {
      enabledIds.add(item.id);
    }
  }

  const lines = [];
  const coveredKeywords = [];
  let idx = 1;

  const pushEntry = (title, details = []) => {
    lines.push(`${idx}. ${title}`);
    for (const d of details) {
      if (d) lines.push(`   ${d}`);
    }
    idx++;
  };

  for (const item of UNIFIED_SECTION_CATALOG) {
    if (!enabledIds.has(item.id)) continue;
    // Mobile menu, smooth scroll, and dark/light toggle belong in LAYOUT/TOKENS/ENGINEERING rather than page body sections
    if (item.id === 'mobile-menu' || item.id === 'smooth-scroll' || item.id === 'dark-light') continue;

    const cfg = { ...getDefaultSectionConfig(item.id), ...(configs[item.id] || {}) };
    coveredKeywords.push(...(item.keywords || []));

    if (item.id === 'benchmark') {
      pushEntry(`Latency / Metrics Benchmark: table of ${cfg.rows || '6 rows'}`, [
        cfg.sampleData ? `Seed data (illustrative): ${cfg.sampleData}` : '',
        cfg.filterChips ? `Filter: ${cfg.filterChips}` : '',
      ]);
    } else if (item.id === 'bento-arch') {
      pushEntry(`Bento Architecture: ${cfg.tileCount || '4 tiles'}`, [
        cfg.tiles ? `Tiles: ${cfg.tiles}` : '',
      ]);
    } else if (item.id === 'search-filters') {
      pushEntry(`Search & Filters: filters ${cfg.target || 'primary list/table items'}`, [
        cfg.chips ? `Filter chips: ${cfg.chips}` : '',
        cfg.emptyState ? `Empty state: ${cfg.emptyState}` : '',
      ]);
    } else if (item.id === 'pricing') {
      pushEntry(`Pricing: ${cfg.tiers || 'Free $0 / Team $29 per seat per month / Enterprise custom'}`, [
        cfg.billingToggle ? `${cfg.billingToggle}.` : '',
      ]);
    } else if (item.id === 'proof') {
      pushEntry(`Customer Proof: ${cfg.items || '3 quotes and 4 metrics (fictional names marked "placeholder")'}`);
    } else if (item.id === 'faq') {
      pushEntry(`FAQ: ${cfg.count || '6 items'} as an ${(cfg.a11y || 'accessible accordion (button + aria-expanded)').replace(/^accessible\s+/i, 'accessible ')}.`);
    } else if (item.id === 'newsletter') {
      pushEntry(`Newsletter: ${cfg.behavior || 'email validation on the client, inline error and success text, no network call, labelled "demo"'}.`);
    } else if (item.id === 'contact') {
      pushEntry(`Contact Form: fields (${cfg.fields || 'name, email, message'}).`, [
        cfg.behavior ? `Submit behavior: ${cfg.behavior}` : '',
      ]);
    }
  }

  // Merge any remaining customSections entries without duplicating enabled unified items
  const rawCustom = String(s.customSections || '')
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  for (const part of rawCustom) {
    const lower = part.toLowerCase();
    const isDup = coveredKeywords.some((kw) => lower.includes(kw));
    if (isDup) continue;
    pushEntry(`${part}: realistic domain content labelled "illustrative" where sample metrics appear.`);
  }

  return lines;
}

/**
 * Pure deterministic Master Prompt compiler used both for live right-pane spec preview
 * and final Step 7 output. Unit-tested directly in Node.
 */
export function compilePromptFromSelections(selections = {}, context = {}) {
  const s = { ...createEmptySelections(), ...selections };
  const activeLibraryName = context.activeLibraryName || '';
  const activeSkills = Array.isArray(context.activeSkills) ? context.activeSkills : [];
  const freedomMeta = getFreedomLevelMeta(s.aiFreedomLevel);
  const slotSelections = s.slotSelections && typeof s.slotSelections === 'object' ? s.slotSelections : {};
  const assignedSlotCount = MIX_MATCH_SECTION_SLOTS.filter((slot) => slotSelections[slot.id]?.name).length;
  const sourceSlotCount = countSlotsWithSource(slotSelections);
  const validation = validatePromptSelections(s, context);

  const scopeLabel = s.pageCount || 'multi-section website';
  const typeLabel = s.type ? `${s.type.toLowerCase()} (${scopeLabel})` : scopeLabel;
  const brandName = s.siteName || 'the target brand';
  const features = Array.isArray(s.features) ? s.features : [];
  const techFeatures = Array.isArray(s.techFeatures) ? s.techFeatures : [];
  const hasDarkLightToggle = features.includes('Dark / Light mode toggle') || (Array.isArray(s.enabledSections) && s.enabledSections.includes('dark-light'));
  const hasMobileMenu = features.includes('Responsive hamburger mobile menu') || (Array.isArray(s.enabledSections) && s.enabledSections.includes('mobile-menu'));
  const hasSmoothScroll = features.includes('Smooth scroll navigation') || (Array.isArray(s.enabledSections) && s.enabledSections.includes('smooth-scroll'));

  const sections = [];

  // 1. ROLE
  sections.push(
    [
      'ROLE',
      `You are a senior front-end engineer. Build a ${typeLabel} for ${brandName}.`,
    ].join('\n')
  );

  // 2. BRAND
  const brandLines = ['BRAND'];
  if (s.siteName) brandLines.push(`Name: ${s.siteName}`);
  if (s.siteTagline) brandLines.push(`Headline: ${s.siteTagline}`);
  if (s.audience) brandLines.push(`Audience: ${s.audience}`);
  if (s.siteDescription) brandLines.push(`Brief: ${s.siteDescription}`);
  if (s.siteTone) brandLines.push(`Tone: ${s.siteTone} (concise, no marketing filler)`);
  if (brandLines.length > 1) sections.push(brandLines.join('\n'));

  // 3. RESOLUTION RULES (always present so overlapping structure/category/motion decisions have clear precedence)
  const primaryLayout = s.content || 'Card-based grid layout';
  const secondaryLayout = s.secondaryLayout || '';
  const layoutRule = secondaryLayout
    ? `3. Layout conflicts: use ${primaryLayout} for the main flow and ${secondaryLayout} only for detail.`
    : `3. Layout conflicts: use ${primaryLayout} for the main flow; apply Bento grids only for dedicated feature/architecture grids.`;

  sections.push(
    [
      'RESOLUTION RULES (apply when inputs conflict)',
      '1. Explicit sections and data below beat category, page scope and layout presets.',
      '2. Category defines page type. If it contradicts the brief, follow the brief.',
      layoutRule,
      '4. Motion conflicts: pick one profile. prefers-reduced-motion always wins.',
      '5. Never ask questions. State assumptions in a 3-line note at the end.',
    ].join('\n')
  );

  // 4. FREEDOM LEVEL (with L1 auto-downgrade when no source code is attached)
  const freedomLines = [
    `FREEDOM LEVEL: L${freedomMeta.level} — ${freedomMeta.label}`,
    buildFreedomPromptDirective(freedomMeta.level, {
      hasSlotPicks: assignedSlotCount > 0,
      hasSourceCode: sourceSlotCount > 0,
      activeLibraryName,
    }),
  ];
  if (freedomMeta.usesTemplates && assignedSlotCount > 0) {
    const slotSection = formatSlotSelectionsForPrompt(slotSelections, freedomMeta.level);
    if (slotSection) freedomLines.push(slotSection.trim());
  } else if (freedomMeta.usesTemplates && activeLibraryName) {
    freedomLines.push(`Style Reference Library (no component source attached): ${activeLibraryName}`);
  } else if (freedomMeta.usesTemplates) {
    freedomLines.push('Attached component source: none');
  }
  sections.push(freedomLines.join('\n'));

  // 5. DESIGN TOKENS (contrast-checked :root tokens + optional paired Light/Dark token set)
  const pal = resolveActivePaletteTokens(s);
  const preset = s.designSystemId ? DESIGN_MD_PRESETS.find((p) => p.id === s.designSystemId) : null;
  const tokenLines = ['DESIGN TOKENS (CSS custom properties on :root)'];

  if (preset) {
    tokenLines.push(`Reference System: ${preset.name} (${preset.subtitle})`);
  } else if (s.style) {
    tokenLines.push(`Visual Direction: ${s.style}`);
  }

  if (pal) {
    const accentText = pal.accentText || pal.accent;
    const onAccent = pal.onAccent || pal.accentFg || '#FFFFFF';
    const hairline = pal.border || (pal.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.10)');
    tokenLines.push(`--bg ${pal.bg} | --surface ${pal.surface} | --text ${pal.text}`);
    tokenLines.push(`--text-muted ${pal.muted} (WCAG AA >= 4.5:1 on bg & surface)`);
    tokenLines.push(`--accent ${pal.accent} (fills, borders, large text only)`);
    tokenLines.push(`--accent-text ${accentText} (small text and links, WCAG AA >= 4.5:1)`);
    tokenLines.push(`--on-accent ${onAccent} (labels on accent fills, WCAG AA >= 4.5:1)`);
    tokenLines.push(`--hairline ${hairline}`);

    if (hasDarkLightToggle) {
      const paired = pal.isDark ? pal.lightTokens : pal.darkTokens;
      const pairedThemeName = pal.isDark ? 'light' : 'dark';
      if (paired) {
        tokenLines.push(
          `Paired ${pairedThemeName} theme (:root[data-theme="${pairedThemeName}"]):`,
          `--bg ${paired.bg} | --surface ${paired.surface} | --text ${paired.text} | --text-muted ${paired.muted}`,
          `--accent ${paired.accent} | --accent-text ${paired.accentText} | --on-accent ${paired.onAccent} | --hairline ${paired.hairline}`
        );
      } else {
        tokenLines.push(`Dark/Light toggle enabled: define a full WCAG AA paired ${pairedThemeName} token set on :root[data-theme="${pairedThemeName}"].`);
      }
    }
  } else if (s.color) {
    tokenLines.push(`Palette Direction: ${s.color}`);
    if (hasDarkLightToggle) {
      tokenLines.push('Dark/Light toggle enabled: define full WCAG AA :root dark and light CSS custom property token sets.');
    }
  } else {
    tokenLines.push('No palette preset selected yet: define cohesive CSS custom properties (--bg, --surface, --text, --text-muted, --accent, --accent-text, --on-accent, --hairline) meeting WCAG AA.');
  }

  if (s.fontPref) {
    tokenLines.push(`Fonts: ${s.fontPref}. Use tabular-nums for code, metrics, and pricing.`);
  } else {
    tokenLines.push('Fonts: Inter (UI), JetBrains Mono (code, metrics, tabular-nums).');
  }
  tokenLines.push('Every text and background pair must meet WCAG AA 4.5:1 (3:1 for 18px+ bold).');
  sections.push(tokenLines.join('\n'));

  // 6. LAYOUT
  const layoutParts = [];
  if (s.header) layoutParts.push(`Nav: ${s.header}.`);
  if (s.hero) layoutParts.push(`Hero: ${s.hero}.`);
  if (s.content) {
    layoutParts.push(
      secondaryLayout
        ? `Main flow: ${s.content}; secondary detail: ${secondaryLayout}.`
        : `Main flow: ${s.content}.`
    );
  }
  if (s.spacing) layoutParts.push(`Sections: ${s.spacing}.`);
  if (s.footer) layoutParts.push(`Footer: ${s.footer}.`);
  layoutParts.push('Touch targets at least 44px.');
  sections.push(['LAYOUT', ...layoutParts].join('\n'));

  // 7. MOTION (concrete measurable rules, never vague labels)
  const motionLib = MOTION_LIBRARIES.find((m) => m.id === s.motionLibrary) || MOTION_LIBRARIES[0];
  const activeMotionIds = Array.isArray(s.motionProfiles) && s.motionProfiles.length
    ? s.motionProfiles
    : (s.motionProfileId ? [s.motionProfileId] : []);
  const motionLines = [`MOTION (${motionLib.promptTag})`];

  if (activeMotionIds.length) {
    const profileNames = activeMotionIds
      .map((id) => MOTION_CONCRETE_SPECS[id]?.label || MOTION_PROFILES.find((m) => m.id === id)?.name || id)
      .join(' + ');
    motionLines.push(`Profile: ${profileNames}`);
    const seenRule = new Set();
    for (const id of activeMotionIds) {
      const spec = MOTION_CONCRETE_SPECS[id];
      if (spec) {
        for (const r of spec.rules) {
          if (!seenRule.has(r)) {
            seenRule.add(r);
            motionLines.push(`- ${r}`);
          }
        }
      }
    }
  } else if (s.motionProfile) {
    motionLines.push(`Profile: ${s.motionProfile}`);
  } else {
    motionLines.push('Profile: Refined micro-transitions (150ms ease-out, compositor-only transform/opacity).');
  }

  if (s.interactionStyle) {
    motionLines.push(`- Micro-interactions: ${s.interactionStyle}`);
  }
  motionLines.push('- @media (prefers-reduced-motion: reduce): remove all decorative motion except opacity fades under 100ms.');
  sections.push(motionLines.join('\n'));

  // 8. SECTIONS AND DATA (unified, deduplicated, seed data labelled "illustrative")
  const sectionDataLines = buildUnifiedSectionsLines(s);
  if (sectionDataLines.length) {
    sections.push(
      [
        'SECTIONS AND DATA (use exactly this data; label placeholders "illustrative")',
        ...sectionDataLines,
      ].join('\n')
    );
  }

  // 9. ENGINEERING
  const outFmt = OUTPUT_FORMATS.find((f) => f.id === s.outputFormat) || OUTPUT_FORMATS[0];
  const stackLine = s.tech
    ? `${s.tech}${s.motionLibrary === 'framer-motion' ? ', motion/react' : ''}. No other dependencies.`
    : `React, Tailwind, lucide-react${s.motionLibrary === 'framer-motion' ? ', motion/react' : ''}. No other dependencies.`;

  const engLines = [
    'ENGINEERING',
    `- Output: ${outFmt.promptLine}`,
    `- Allowed: ${stackLine}`,
  ];
  if (techFeatures.includes('Use semantic HTML5 elements') || techFeatures.length === 0) {
    engLines.push('- Semantic HTML5 (header, nav, main, section, footer), skip-to-content link, :focus-visible rings.');
  }
  if (techFeatures.includes('Ensure WCAG AA accessibility standards') || techFeatures.length === 0) {
    engLines.push('- One h1, heading order without skipped levels, labelled form inputs, WCAG AA contrast across all states.');
  }
  if (techFeatures.includes('Use CSS custom properties')) {
    engLines.push('- Define all color tokens via CSS custom properties on :root; avoid inline hex styles for colors.');
  }
  if (techFeatures.includes('Include Google Fonts')) {
    engLines.push('- Load the selected Google Fonts cleanly with display=swap and sensible system fallbacks.');
  }
  if (hasSmoothScroll) {
    engLines.push('- Smooth scroll anchor navigation (disabled automatically under prefers-reduced-motion).');
  }
  if (hasMobileMenu) {
    engLines.push('- Accessible mobile menu drawer with focus trap, Escape key close, and aria-expanded on the trigger button.');
  }
  if (activeSkills.length) {
    engLines.push(`- Active Studio Skills: ${activeSkills.join(', ')}.`);
  }
  sections.push(engLines.join('\n'));

  // 10. DO NOT
  const doNotText = String(s.doNotList || '').trim() || DEFAULT_DO_NOT_LIST;
  sections.push(['DO NOT', doNotText].join('\n'));

  // 11. DELIVERY
  const deliveryMeta = DELIVERY_MODES.find((d) => d.id === s.deliveryMode) || DELIVERY_MODES[0];
  const deliveryLines = ['DELIVERY'];
  if (deliveryMeta.code === 'PHASED') {
    deliveryLines.push(
      'Mode: PHASED (for models under ~30B):',
      '- Phase 1: design tokens, nav, hero, and footer — then stop and wait for "next".',
      '- Subsequent phases: deliver 1 complete section per reply until all sections above are finished.'
    );
  } else {
    deliveryLines.push(
      'Mode: FULL_ONE_SHOT',
      '- Deliver the complete, self-contained, runnable implementation in one response.'
    );
  }
  sections.push(deliveryLines.join('\n'));

  // 12. SELF-CHECK
  sections.push(
    [
      'SELF-CHECK (silently, before replying)',
      '- Contrast >= 4.5:1 on every text/background pair (including accent text and labels on accent fills).',
      '- prefers-reduced-motion respected; only transform and opacity animated.',
      '- No unrequested packages or external dependencies.',
      '- Every interactive control (filters, toggles, accordion, mobile drawer, demo forms) works in state.',
      '- Every section matches the exact data above with illustrative/placeholder labels where required.',
    ].join('\n')
  );

  const text = sections.join('\n\n');
  const tokens = Math.max(1, Math.ceil(text.length / 4));

  const scoredChecks = [
    Boolean(s.type),
    Boolean(s.style || s.designSystemId),
    Boolean(s.paletteKey || s.customPalette || s.color),
    Boolean(s.fontPref || s.typographyId),
    Boolean(s.header),
    Boolean(s.hero),
    Boolean(s.content),
    Boolean(s.footer),
    Boolean(s.spacing),
    Boolean(activeMotionIds.length > 0 || s.motionProfile),
    Boolean(s.interactionStyle),
    Boolean(s.siteName),
    Boolean(s.siteTagline),
    Boolean(s.siteDescription),
    Boolean(s.siteTone),
    Boolean(s.audience),
    Boolean(s.tech),
    Boolean(features.length > 0 || (Array.isArray(s.enabledSections) && s.enabledSections.length > 0) || s.customSections),
  ];
  const filledCount = scoredChecks.filter(Boolean).length;
  const totalCount = scoredChecks.length;
  const completenessPct = Math.round((filledCount / totalCount) * 100);

  return {
    text,
    tokens,
    completenessPct,
    filledCount,
    totalCount,
    validation,
  };
}

/**
 * Saved custom prompt templates CRUD (persisted under wf_prompt_templates_v1).
 */
export function loadSavedPromptTemplates() {
  const list = safeStorageJsonGet(PROMPT_TEMPLATES_STORAGE_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function savePromptTemplate(name, selections) {
  const cleanName = String(name || '').trim();
  if (!cleanName) return null;
  const list = loadSavedPromptTemplates();
  const entry = {
    id: generateId('tpl'),
    name: cleanName.slice(0, 60),
    createdAt: Date.now(),
    selections: JSON.parse(JSON.stringify({ ...createEmptySelections(), ...selections })),
  };
  const next = [entry, ...list.filter((t) => t.name.toLowerCase() !== cleanName.toLowerCase())].slice(0, 24);
  safeStorageSet(PROMPT_TEMPLATES_STORAGE_KEY, JSON.stringify(next));
  return entry;
}

export function deletePromptTemplate(id) {
  if (!id) return false;
  const list = loadSavedPromptTemplates();
  const next = list.filter((t) => t.id !== id);
  if (next.length === list.length) return false;
  safeStorageSet(PROMPT_TEMPLATES_STORAGE_KEY, JSON.stringify(next));
  return true;
}

function renderMotionMiniStage(kind) {
  switch (kind) {
    case 'spring-press':
      return `<div class="pb-motion-stage" data-motion-demo="spring-press" aria-hidden="true">
        <span class="pb-md-btn"></span>
        <span class="pb-md-ring"></span>
      </div>`;
    case 'linear-snap':
      return `<div class="pb-motion-stage" data-motion-demo="linear-snap" aria-hidden="true">
        <span class="pb-md-track"><span class="pb-md-glider"></span></span>
      </div>`;
    case 'editorial-reveal':
      return `<div class="pb-motion-stage" data-motion-demo="editorial-reveal" aria-hidden="true">
        <span class="pb-md-line pb-md-line-1"></span>
        <span class="pb-md-line pb-md-line-2"></span>
      </div>`;
    case 'stagger-cascade':
      return `<div class="pb-motion-stage" data-motion-demo="stagger-cascade" aria-hidden="true">
        <span class="pb-md-tile pb-md-tile-1"></span>
        <span class="pb-md-tile pb-md-tile-2"></span>
        <span class="pb-md-tile pb-md-tile-3"></span>
      </div>`;
    case 'elastic-pop':
      return `<div class="pb-motion-stage" data-motion-demo="elastic-pop" aria-hidden="true">
        <span class="pb-md-card"></span>
      </div>`;
    case 'instant-snap':
    default:
      return `<div class="pb-motion-stage" data-motion-demo="instant-snap" aria-hidden="true">
        <span class="pb-md-step"></span>
      </div>`;
  }
}

export class PromptBuilder {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.totalSteps = 7;
    this.currentStep = 1;
    this.prevStepNum = 1;
    this.promptGenerated = false;
    this.previewTab = 'visual'; // 'visual' | 'spec'
    this.activeBlueprintId = '';
    this.selections = createEmptySelections();

    // Step 1 starter source tabs ('curated' | 'wm-dashboards' | 'wm-templates')
    this.starterSourceTab = 'curated';
    this._wmDashboardsCache = null;
    this._wmTemplatesCache = null;
    this._wmStartersLoading = false;

    // Inline Mix & Match cross-library picker state (Step 5)
    this.activeSlotPickerId = ''; // '' | 'navbar' | 'hero' | 'features' | 'cards' | 'cta' | 'footer'
    this.slotPickerLibrary = 'all';
    this.slotPickerQuery = '';
    this.slotPickerResults = [];
    this.slotPickerLoading = false;
    this._slotSearchDebounce = null;
    this._slotReqSeq = 0;

    this.stepMeta = [
      { step: 1, name: 'Start', hint: 'Starter blueprints' },
      { step: 2, name: 'Category', hint: 'Website type' },
      { step: 3, name: 'Aesthetic', hint: 'System, color & type' },
      { step: 4, name: 'Layout & Motion', hint: 'Grid & choreography' },
      { step: 5, name: 'Components & AI', hint: 'Libraries & freedom' },
      { step: 6, name: 'Brand & Skills', hint: 'Copy & AI skills' },
      { step: 7, name: 'Build Prompt', hint: 'Review & launch' },
    ];
    this.stepNames = this.stepMeta.map((m) => m.name);

    this.smartSuggestions = {
      'Business / Corporate': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Contact form with validation', 'FAQ accordion section'],
      'Portfolio / Personal': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Contact form with validation'],
      'SaaS / Landing Page': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Pricing table section', 'FAQ accordion section', 'Interactive data filter / search', 'Newsletter subscription form'],
      'E-Commerce / Online Store': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Interactive data filter / search', 'Newsletter subscription form'],
      'Restaurant / Cafe': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Contact form with validation'],
      'Blog / Magazine': ['Responsive hamburger mobile menu', 'Dark / Light mode toggle', 'Smooth scroll navigation', 'Interactive data filter / search', 'Newsletter subscription form'],
      'Photography / Gallery': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Dark / Light mode toggle'],
      'Education / Course': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'FAQ accordion section', 'Pricing table section', 'Contact form with validation'],
      'Health / Wellness': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Contact form with validation'],
      'Event / Conference': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Pricing table section', 'Contact form with validation'],
      'Real Estate / Property': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Interactive data filter / search', 'Contact form with validation'],
      'Non-Profit / Charity': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Contact form with validation', 'Newsletter subscription form'],
      'Law / Legal Services': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Contact form with validation', 'FAQ accordion section'],
      'Gym / Fitness Studio': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Pricing table section', 'Contact form with validation'],
      'Music / Band': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Newsletter subscription form'],
      'Wedding / Celebration': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Contact form with validation'],
      'Travel / Tourism': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Interactive data filter / search'],
      'Church / Religious Organization': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Contact form with validation', 'Newsletter subscription form'],
    };

    this.styleColorMap = {
      Minimalist: ['monochrome', 'swiss-paper', 'nordic-slate', 'sand-ink'],
      Corporate: ['classic-blue', 'monochrome', 'nordic-slate'],
      Swiss: ['swiss-paper', 'monochrome', 'classic-blue'],
      Flat: ['classic-blue', 'forest-green', 'sand-ink'],
      Nordic: ['nordic-slate', 'sand-ink', 'monochrome'],
      Bento: ['obsidian-amber', 'industrial-steel', 'midnight-indigo'],
      Luxury: ['charcoal-gold', 'crimson-editorial', 'terracotta-paper'],
      Dark: ['obsidian-amber', 'industrial-steel', 'deep-ocean', 'midnight-indigo'],
      Brutalist: ['swiss-paper', 'industrial-steel', 'monochrome'],
      Playful: ['terracotta-paper', 'forest-green', 'classic-blue'],
      Editorial: ['charcoal-gold', 'crimson-editorial', 'swiss-paper'],
      Organic: ['botanical-slate', 'forest-green', 'terracotta-paper', 'sand-ink'],
    };

    this.promptHeights = { min: 220, mid: 380, max: 640 };

    if (typeof document !== 'undefined') {
      this._initStudioChrome();
      this._setupResizeHandler();
      this._enableCardKeyboard();
    }
  }

  _initStudioChrome() {
    const modal = document.getElementById('promptBuilderModal');
    if (!modal || modal.dataset.studioWired) return;
    modal.dataset.studioWired = '1';

    this._renderStarterBlueprints();
    this._renderCategoryCards();
    this._renderDesignMdCards();
    this._renderPaletteCards();
    this._renderTypographyCards();
    this._renderSecondaryLayoutControls();
    this._renderMotionLibraryControl();
    this._renderMotionAndInteractionCards();
    this._renderFreedomSlider();
    this._renderComponentModeUI();
    this._renderOutputAndDeliveryControls();
    this._renderUnifiedSectionsEditor();
    this._renderAudienceAndScopeCards();
    this._renderSavedTemplates();
    this._hydrateDOMFromSelections();
    this._renderStepRail();
    this._setupScrollCue();

    // Step 1 starter source tabs (Curated Starters | Watermelon Dashboards | Watermelon Templates)
    const starterTabs = document.getElementById('pbStarterSourceTabs');
    starterTabs?.querySelectorAll('[data-starter-tab]').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        const nextTab = tabBtn.dataset.starterTab || 'curated';
        if (nextTab === this.starterSourceTab) return;
        this.starterSourceTab = nextTab;
        starterTabs.querySelectorAll('[data-starter-tab]').forEach((b) => {
          const active = b.dataset.starterTab === nextTab;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        this._renderStarterBlueprints();
        this._updateScrollCue();
      });
    });

    // Step 1 "Start from scratch -> Choose category" button
    document.getElementById('btnPbStartFromScratch')?.addEventListener('click', () => {
      this.activeBlueprintId = '';
      document.querySelectorAll('#pbBlueprintsGrid [data-blueprint-id]').forEach((c) => c.classList.remove('selected'));
      this.goToStep(2);
    });

    // Live input & change listeners for Step 3 & Step 6 text fields
    ['siteName', 'siteTagline', 'siteDescription', 'customSections', 'fontPref', 'doNotList'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const syncField = () => {
        this.selections[id] = el.value.trim();
        this.updateLivePreview();
        this._renderStepRail();
      };
      el.addEventListener('input', syncField);
      el.addEventListener('change', syncField);
    });

    // L1 No-Source Notice 1-click button -> switch to Mix & Match
    document.getElementById('btnPbOpenMixMatchFromNotice')?.addEventListener('click', () => {
      this.selections.componentMode = 'mix-match';
      this._renderComponentModeUI();
      this.updateLivePreview();
      this._renderStepRail();
    });

    // Color picker live sync
    for (let i = 1; i <= 5; i++) {
      const picker = document.getElementById(`customColor${i}`);
      const text = document.getElementById(`customColor${i}Text`);
      picker?.addEventListener('input', () => {
        if (text) text.value = picker.value;
      });
    }

    // Step 2 category search filter
    document.getElementById('pbTypeSearch')?.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      document.querySelectorAll('#typeGrid .style-group').forEach((group) => {
        let visibleCount = 0;
        group.querySelectorAll('.select-card').forEach((card) => {
          const text = `${card.dataset.value || ''} ${card.textContent || ''}`.toLowerCase();
          const match = !q || text.includes(q);
          card.hidden = !match;
          if (match) visibleCount++;
        });
        group.hidden = visibleCount === 0;
      });
    });

    // Step 5 Component Mode segmented switch (Whole Library | Mix & Match 6 Slots)
    document.querySelectorAll('[data-pb-comp-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selections.componentMode = btn.dataset.pbCompMode === 'mix-match' ? 'mix-match' : 'library';
        this._renderComponentModeUI();
        this.updateLivePreview();
        this._renderStepRail();
      });
    });

    // Airy step sub-tabs (Steps 3, 4, 6) so each view stays calm and uncluttered
    modal.querySelectorAll('[data-pb-subtab-group]').forEach((groupEl) => {
      const groupName = groupEl.dataset.pbSubtabGroup;
      const buttons = groupEl.querySelectorAll('[data-pb-subtab]');
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetTab = btn.dataset.pbSubtab;
          buttons.forEach((b) => {
            const active = b === btn;
            b.classList.toggle('active', active);
            b.setAttribute('aria-selected', active ? 'true' : 'false');
          });
          modal.querySelectorAll(`[data-pb-subpane-group="${groupName}"]`).forEach((pane) => {
            pane.hidden = pane.dataset.pbSubpane !== targetTab;
          });
          const scroll = document.getElementById('pbCanvasScroll');
          if (scroll) scroll.scrollTop = 0;
          requestAnimationFrame(() => this._updateScrollCue());
        });
      });
    });

    // Right dock preview segmented tabs (Visual | Live Spec)
    const tabsWrap = document.getElementById('pbPreviewTabs');
    tabsWrap?.querySelectorAll('[data-pb-preview-tab]').forEach((btn) => {
      btn.addEventListener('click', () => this.switchPreviewTab(btn.dataset.pbPreviewTab));
    });

    // Mobile right dock sheet toggle
    document.getElementById('btnPbTogglePreview')?.addEventListener('click', () => {
      const pane = document.getElementById('pbPreviewPane');
      if (!pane) return;
      const open = pane.classList.toggle('is-mobile-open');
      document.getElementById('btnPbTogglePreview')?.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        requestAnimationFrame(() => syncSlidingTabIndicator(document.getElementById('pbPreviewTabs')));
      }
    });
    document.getElementById('btnPbCloseMobilePreview')?.addEventListener('click', () => {
      document.getElementById('pbPreviewPane')?.classList.remove('is-mobile-open');
      document.getElementById('btnPbTogglePreview')?.setAttribute('aria-expanded', 'false');
    });

    // Fast-close header button
    document.getElementById('btnClosePromptBuilder')?.addEventListener('click', () => {
      closeDialogFast(modal);
    });

    // Save Template inline form (Step 7 & Right Dock)
    const toggleSaveForm = (focusInput = true) => {
      const form = document.getElementById('pbSaveTemplateRow');
      if (!form) return;
      const isHidden = form.hidden;
      form.hidden = !isHidden;
      if (isHidden && focusInput) {
        const input = document.getElementById('pbTemplateNameInput');
        if (input) {
          input.value = this.selections.siteName || this.selections.type?.split(' / ')[0] || '';
          requestAnimationFrame(() => {
            input.focus();
            input.select();
          });
        }
      }
    };

    document.getElementById('btnPbOpenSaveTemplate')?.addEventListener('click', () => toggleSaveForm(true));
    document.getElementById('btnPbRailSaveTemplate')?.addEventListener('click', () => {
      if (this.currentStep !== 7) {
        this.generatePrompt();
      }
      const form = document.getElementById('pbSaveTemplateRow');
      if (form) form.hidden = false;
      const input = document.getElementById('pbTemplateNameInput');
      if (input) {
        input.value = this.selections.siteName || this.selections.type?.split(' / ')[0] || '';
        requestAnimationFrame(() => { input.focus(); input.select(); });
      }
    });

    document.getElementById('btnPbCancelSaveTemplate')?.addEventListener('click', () => {
      const form = document.getElementById('pbSaveTemplateRow');
      if (form) form.hidden = true;
    });

    const commitSaveTemplate = () => {
      const input = document.getElementById('pbTemplateNameInput');
      const name = (input?.value || '').trim();
      if (!name) {
        this.showToast('Enter a template name first', true);
        input?.focus();
        return;
      }
      this._syncTextInputs();
      this.collectFeatures();
      const saved = savePromptTemplate(name, this.selections);
      if (saved) {
        this._renderSavedTemplates();
        const form = document.getElementById('pbSaveTemplateRow');
        if (form) form.hidden = true;
        triggerPeakEndBurst(document.getElementById('btnPbConfirmSaveTemplate') || document.getElementById('btnPbOpenSaveTemplate'));
        this.showToast(`Saved template "${saved.name}"`);
      }
    };

    document.getElementById('btnPbConfirmSaveTemplate')?.addEventListener('click', commitSaveTemplate);
    document.getElementById('pbTemplateNameInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitSaveTemplate();
      } else if (e.key === 'Escape') {
        const form = document.getElementById('pbSaveTemplateRow');
        if (form) form.hidden = true;
      }
    });

    // Attach 3D tilt to live visual preview card & rubber-band scroll
    attachInteractiveCardTilt(document.getElementById('pbMiniSiteCard'), { maxTilt: 4.5 });
    attachRubberBandScroll(document.getElementById('pbCanvasScroll'));
    attachRubberBandScroll(document.getElementById('pbDockScroll'));

    window.addEventListener('resize', () => {
      if (modal.open) {
        syncSlidingTabIndicator(document.getElementById('pbPreviewTabs'));
        this._updateScrollCue();
      }
    });

    this.updateLivePreview();
  }

  _setupScrollCue() {
    const scroller = document.getElementById('pbCanvasScroll');
    const cue = document.getElementById('pbScrollCue');
    if (!scroller || !cue) return;

    scroller.addEventListener('scroll', () => this._updateScrollCue(), { passive: true });
    cue.addEventListener('click', () => {
      scroller.scrollBy({ top: 260, behavior: 'smooth' });
    });

    if (typeof ResizeObserver !== 'undefined') {
      this._scrollCueObserver = new ResizeObserver(() => this._updateScrollCue());
      this._scrollCueObserver.observe(scroller);
    }
    requestAnimationFrame(() => this._updateScrollCue());
  }

  _updateScrollCue() {
    const scroller = document.getElementById('pbCanvasScroll');
    const cue = document.getElementById('pbScrollCue');
    if (!scroller || !cue) return;
    const remaining = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    const hasMore = remaining > 24;
    cue.hidden = !hasMore;
    cue.classList.toggle('is-visible', hasMore);
  }

  syncStudioState() {
    this._renderUiLibraryPicker();
    this._renderSkillsPicker();
    this._renderSavedTemplates();
    this._renderFreedomSlider();
    this._renderComponentModeUI();
    this._renderOutputAndDeliveryControls();
    this._renderUnifiedSectionsEditor();
    this._renderStepRail();
    this.updateLivePreview();
    requestAnimationFrame(() => {
      syncSlidingTabIndicator(document.getElementById('pbPreviewTabs'));
      this._updateScrollCue();
    });
  }

  async _ensureWatermelonStartersLoaded(kind) {
    const isDash = kind === 'wm-dashboards';
    if (isDash && Array.isArray(this._wmDashboardsCache)) return this._wmDashboardsCache;
    if (!isDash && Array.isArray(this._wmTemplatesCache)) return this._wmTemplatesCache;

    const mgr = typeof this.callbacks.getUiLibraryManager === 'function'
      ? this.callbacks.getUiLibraryManager()
      : null;

    if (mgr && typeof mgr.queryRemoteCatalog === 'function') {
      try {
        const res = await mgr.queryRemoteCatalog('watermelon-ui', {
          collection: isDash ? 'dashboards' : 'templates',
          page: 1,
          limit: isDash ? 30 : 20,
        });
        const items = Array.isArray(res?.items) ? res.items : [];
        if (isDash) this._wmDashboardsCache = items;
        else this._wmTemplatesCache = items.length ? items : WATERMELON_CURATED_TEMPLATES;
        return isDash ? this._wmDashboardsCache : this._wmTemplatesCache;
      } catch {
        // Fallback cleanly below
      }
    }

    if (isDash) {
      this._wmDashboardsCache = [];
      return this._wmDashboardsCache;
    }
    this._wmTemplatesCache = WATERMELON_CURATED_TEMPLATES;
    return this._wmTemplatesCache;
  }

  _renderStarterBlueprints() {
    const grid = document.getElementById('pbBlueprintsGrid');
    if (!grid) return;

    const tab = this.starterSourceTab || 'curated';

    if (tab === 'curated') {
      grid.innerHTML = STARTER_BLUEPRINTS.map((bp, idx) => `
        <button type="button" class="pb-blueprint-card wf-stagger-in${this.activeBlueprintId === bp.id ? ' selected' : ''}" data-blueprint-id="${escapeHtml(bp.id)}" style="--wf-stagger:${computeStaggerDelayMs(idx, { stepMs: 28, maxTotalMs: 160 })}ms">
          <div class="pb-bp-top">
            <div class="pb-bp-swatches" aria-hidden="true">
              ${bp.swatches.map((hex) => `<span style="background:${hex}"></span>`).join('')}
            </div>
            <span class="pb-bp-cat">${escapeHtml(bp.category)}</span>
          </div>
          <div class="pb-bp-name">${escapeHtml(bp.name)}</div>
          <div class="pb-bp-desc">${escapeHtml(bp.summary)}</div>
        </button>
      `).join('');

      grid.querySelectorAll('[data-blueprint-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.applyBlueprint(btn.dataset.blueprintId, btn);
        });
      });
      return;
    }

    const cached = tab === 'wm-dashboards' ? this._wmDashboardsCache : this._wmTemplatesCache;
    if (!Array.isArray(cached)) {
      grid.innerHTML = `<div class="pb-wm-starters-loading">Loading Watermelon ${tab === 'wm-dashboards' ? 'Dashboards' : 'Templates'}…</div>`;
      this._ensureWatermelonStartersLoaded(tab).then(() => {
        if (this.starterSourceTab === tab) {
          this._renderStarterBlueprints();
        }
      });
      return;
    }

    if (!cached.length) {
      grid.innerHTML = `<div class="pb-wm-starters-loading">No Watermelon ${tab === 'wm-dashboards' ? 'dashboards' : 'templates'} found.</div>`;
      return;
    }

    grid.innerHTML = cached.map((item, idx) => {
      const bp = buildWatermelonPromptBlueprint(item);
      const isSelected = this.activeBlueprintId === bp.id;
      return `
        <div class="pb-blueprint-card pb-wm-starter-card wf-stagger-in${isSelected ? ' selected' : ''}" data-wm-starter-id="${escapeHtml(item.id)}" data-blueprint-id="${escapeHtml(bp.id)}" style="--wf-stagger:${computeStaggerDelayMs(idx, { stepMs: 20, maxTotalMs: 140 })}ms">
          <div class="pb-bp-top">
            <div class="pb-bp-swatches" aria-hidden="true">
              ${bp.swatches.map((hex) => `<span style="background:${hex}"></span>`).join('')}
            </div>
            <span class="pb-bp-cat">${escapeHtml(bp.category)}</span>
          </div>
          <div class="pb-bp-name">${escapeHtml(bp.name)}</div>
          <div class="pb-bp-desc">${escapeHtml(bp.summary)}</div>
          <div class="pb-wm-starter-actions">
            <button type="button" class="btn btn-outline btn-xs" data-wm-starter-apply="${escapeHtml(item.id)}">Use Blueprint</button>
            <button type="button" class="btn btn-primary btn-xs" data-wm-starter-launch="${escapeHtml(item.id)}">
              <i data-lucide="rocket"></i> Load Starter
            </button>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('[data-wm-starter-apply]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = cached.find((x) => x.id === btn.dataset.wmStarterApply);
        if (!item) return;
        const bp = buildWatermelonPromptBlueprint(item);
        this.applyCustomBlueprint(bp, btn.closest('.pb-blueprint-card'));
      });
    });

    grid.querySelectorAll('[data-wm-starter-launch]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = cached.find((x) => x.id === btn.dataset.wmStarterLaunch);
        if (!item) return;
        if (typeof this.callbacks.onLaunchWatermelonStarter === 'function') {
          this.callbacks.onLaunchWatermelonStarter(item);
        }
      });
    });

    grid.querySelectorAll('.pb-wm-starter-card').forEach((card) => {
      card.addEventListener('click', () => {
        const item = cached.find((x) => x.id === card.dataset.wmStarterId);
        if (!item) return;
        const bp = buildWatermelonPromptBlueprint(item);
        this.applyCustomBlueprint(bp, card);
      });
    });

    if (typeof window.lucide !== 'undefined') {
      try { window.lucide.createIcons({ root: grid }); } catch {}
    }
  }

  _renderCategoryCards() {
    const grid = document.getElementById('typeGrid');
    if (!grid) return;

    grid.innerHTML = WEBSITE_CATEGORIES.map((group) => `
      <div class="style-group">
        <div class="style-group-label">${escapeHtml(group.group)}</div>
        <div class="card-grid pb-cat-grid">
          ${group.items.map((item) => `
            <button type="button" class="select-card pb-cat-card" data-value="${escapeHtml(item.value)}">
              <span class="check-mark"><i data-lucide="check"></i></span>
              <div class="pb-cat-thumb">${getCategoryWireframeSvg(item.key)}</div>
              <div class="card-content">
                <div class="card-title">${escapeHtml(item.title)}</div>
                <div class="card-desc">${escapeHtml(item.desc)}</div>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.pb-cat-card').forEach((card) => {
      card.addEventListener('click', () => this.selectCard(card, 'type'));
    });

    if (typeof window.lucide !== 'undefined') {
      try { window.lucide.createIcons({ root: grid }); } catch {}
    }
  }

  applyBlueprint(blueprintId, anchorEl = null) {
    const bp = STARTER_BLUEPRINTS.find((b) => b.id === blueprintId);
    if (!bp) return;
    this.applyCustomBlueprint(bp, anchorEl);
  }

  applyCustomBlueprint(bp, anchorEl = null) {
    if (!bp || !bp.selections) return;

    this.activeBlueprintId = bp.id || '';
    const bpSel = JSON.parse(JSON.stringify(bp.selections));
    if (!Array.isArray(bpSel.motionProfiles) && bpSel.motionProfileId) {
      bpSel.motionProfiles = [bpSel.motionProfileId];
    }
    this.selections = {
      ...createEmptySelections(),
      ...bpSel,
      aiFreedomLevel: this.selections.aiFreedomLevel || DEFAULT_AI_FREEDOM_LEVEL,
    };

    if (bp.selections.designSystemId && typeof this.callbacks.setActiveLibrary === 'function') {
      this.callbacks.setActiveLibrary(bp.selections.designSystemId);
    }

    this._hydrateDOMFromSelections();
    this._triggerPopAnimation(anchorEl);
    this.updateLivePreview();
    this._renderStepRail();
    this.showToast(`Loaded "${bp.name}" blueprint — customize any step or jump to Build Prompt`);
  }

  loadBlocksIntoSlots(blocks = []) {
    if (!Array.isArray(blocks) || !blocks.length) return;
    const mapped = mapAssemblerBlocksToSlots(blocks);
    const mergedSlots = {
      ...(this.selections.slotSelections || {}),
      ...mapped,
    };
    this.selections.slotSelections = mergedSlots;
    this.selections.componentMode = 'mix-match';
    this._renderComponentModeUI();
    this._renderSlotCards();
    this.updateLivePreview();
    this._renderStepRail();
    this.goToStep(5);
    const count = Object.keys(mapped).length;
    this.showToast(`Loaded ${count} Watermelon Block${count === 1 ? '' : 's'} into Step 5 Mix & Match`);
  }

  _renderDesignMdCards() {
    const grid = document.getElementById('pbDesignMdGrid');
    if (!grid) return;

    const shortDescMap = {
      'designmd-linear': 'Obsidian · Indigo',
      'designmd-stripe': 'Light · Fintech',
      'designmd-vercel': 'Pure Monochrome',
      'designmd-raycast': 'Graphite · Coral',
      'designmd-supabase': 'Carbon · Emerald',
    };

    grid.innerHTML = DESIGN_MD_PRESETS.map((preset) => {
      const shortName = preset.name.replace(' DESIGN.md', '');
      const shortDesc = shortDescMap[preset.id] || preset.subtitle;
      return `
      <button type="button" class="select-card pb-designmd-card" data-designmd-id="${escapeHtml(preset.id)}" title="${escapeHtml(preset.subtitle)}">
        <span class="check-mark"><i data-lucide="check"></i></span>
        <div class="pb-dmd-swatches" aria-hidden="true">
          ${preset.swatches.map((hex) => `<span style="background:${hex}"></span>`).join('')}
        </div>
        <div class="card-content">
          <div class="card-title">${escapeHtml(shortName)}</div>
          <div class="card-desc">${escapeHtml(shortDesc)}</div>
        </div>
      </button>`;
    }).join('');

    grid.querySelectorAll('[data-designmd-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.designmdId;
        const preset = DESIGN_MD_PRESETS.find((p) => p.id === id);
        if (!preset) return;

        const isAlready = this.selections.designSystemId === id;
        grid.querySelectorAll('.pb-designmd-card').forEach((c) => c.classList.remove('selected'));

        if (isAlready) {
          this.selections.designSystemId = '';
          this.updateLivePreview();
          this._renderStepRail();
          return;
        }

        btn.classList.add('selected');
        this._triggerPopAnimation(btn);
        this.selections.designSystemId = preset.id;
        this.selections.style = preset.styleValue;
        this.selections.color = preset.colorValue;
        this.selections.paletteKey = preset.id;
        this.selections.fontPref = preset.fontValue;

        const fontInput = document.getElementById('fontPref');
        if (fontInput) fontInput.value = preset.fontValue;

        document.querySelectorAll('#styleGrid .select-card').forEach((c) => c.classList.remove('selected'));
        document.querySelectorAll('#colorGrid .select-card').forEach((c) => c.classList.remove('selected'));

        if (typeof this.callbacks.setActiveLibrary === 'function') {
          this.callbacks.setActiveLibrary(preset.id);
          this._renderUiLibraryPicker();
        }

        this.updateLivePreview();
        this._renderStepRail();
        this.showToast(`Applied ${preset.name}`);
      });
    });
  }

  _renderPaletteCards() {
    const grid = document.getElementById('pbPaletteCardsGrid');
    if (!grid) return;

    grid.innerHTML = CURATED_PALETTE_KEYS.map((key) => {
      const pal = PALETTE_TOKENS[key];
      if (!pal) return '';
      const swatches = pal.swatches || [pal.bg, pal.surface, pal.accent, pal.text];
      return `
        <button type="button" class="select-card color-card" data-palette="${escapeHtml(key)}" data-value="${escapeHtml(pal.value || pal.label)}">
          <span class="check-mark"><i data-lucide="check"></i></span>
          <div class="color-swatches">
            ${swatches.map((hex) => `<span style="background:${escapeHtml(hex)}"></span>`).join('')}
          </div>
          <div class="card-title-row">
            <div class="card-title">${escapeHtml(pal.label)}</div>
            <div class="color-rec">Match</div>
          </div>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('.color-card').forEach((card) => {
      card.addEventListener('click', () => this.selectCard(card, 'color'));
    });

    if (typeof window.lucide !== 'undefined') {
      try { window.lucide.createIcons({ root: grid }); } catch {}
    }
  }

  _renderTypographyCards() {
    const grid = document.getElementById('pbFontGrid');
    if (!grid) return;

    grid.innerHTML = TYPOGRAPHY_PAIRINGS.map((pair) => `
      <button type="button" class="select-card pb-font-card" data-font-id="${escapeHtml(pair.id)}" data-value="${escapeHtml(pair.value)}">
        <span class="check-mark"><i data-lucide="check"></i></span>
        <div class="pb-font-sample" style="font-family:${pair.headingCss}">${escapeHtml(pair.sampleHeading)}</div>
        <div class="card-title">${escapeHtml(pair.name)}</div>
        <div class="card-desc">${escapeHtml(pair.desc)}</div>
      </button>
    `).join('');

    grid.querySelectorAll('[data-font-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.pb-font-card').forEach((c) => c.classList.remove('selected'));
        btn.classList.add('selected');
        this._triggerPopAnimation(btn);
        this.selections.typographyId = btn.dataset.fontId;
        this.selections.fontPref = btn.dataset.value || '';
        const input = document.getElementById('fontPref');
        if (input) input.value = this.selections.fontPref;
        this.updateLivePreview();
        this._renderStepRail();
      });
    });
  }

  _renderSecondaryLayoutControls() {
    const grid = document.getElementById('pbSecondaryLayoutGrid');
    if (!grid) return;

    const options = [
      { value: '', label: 'None (single rhythm)' },
      { value: 'Hairline-ruled columns elsewhere', label: 'Hairline-ruled columns' },
      { value: 'Bento grid for architecture section', label: 'Bento for architecture' },
      { value: 'Alternating split rows for detail sections', label: 'Alternating detail rows' },
      { value: 'Compact data table & KPI cards', label: 'Data table & KPIs' },
    ];

    const current = this.selections.secondaryLayout || '';
    grid.innerHTML = options.map((opt) => `
      <button type="button" class="pb-inline-seg-btn${current === opt.value ? ' active' : ''}" data-secondary-layout="${escapeHtml(opt.value)}" aria-pressed="${current === opt.value ? 'true' : 'false'}">
        ${escapeHtml(opt.label)}
      </button>
    `).join('');

    grid.querySelectorAll('[data-secondary-layout]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selections.secondaryLayout = btn.dataset.secondaryLayout || '';
        this._renderSecondaryLayoutControls();
        this.updateLivePreview();
        this._renderStepRail();
      });
    });
  }

  _renderMotionLibraryControl() {
    const host = document.getElementById('pbMotionLibrarySeg');
    if (!host) return;

    const current = this.selections.motionLibrary || 'css-only';
    host.innerHTML = MOTION_LIBRARIES.map((lib) => `
      <button type="button" class="pb-inline-seg-btn${current === lib.id ? ' active' : ''}" data-motion-lib="${escapeHtml(lib.id)}" aria-pressed="${current === lib.id ? 'true' : 'false'}" title="${escapeHtml(lib.desc)}">
        <span class="pb-seg-title">${escapeHtml(lib.label)}</span>
        <span class="pb-seg-sub">${escapeHtml(lib.desc)}</span>
      </button>
    `).join('');

    host.querySelectorAll('[data-motion-lib]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selections.motionLibrary = btn.dataset.motionLib === 'framer-motion' ? 'framer-motion' : 'css-only';
        this._renderMotionLibraryControl();
        this.updateLivePreview();
        this._renderStepRail();
      });
    });
  }

  _syncMotionSelectionFields() {
    const ids = Array.isArray(this.selections.motionProfiles) ? this.selections.motionProfiles : [];
    const matched = ids
      .map((id) => MOTION_PROFILES.find((m) => m.id === id))
      .filter(Boolean);
    this.selections.motionProfileId = matched[0]?.id || '';
    this.selections.motionProfile = matched.map((m) => m.value).join(' + ');

    const countEl = document.getElementById('pbMotionCountHint');
    if (countEl) {
      countEl.textContent = matched.length === 0
        ? 'Compatible combinations only · conflicts auto-resolved'
        : matched.length === 1
          ? `1 selected · ${matched[0].name}`
          : `${matched.length} compatible motion profiles combined`;
    }
  }

  _renderMotionAndInteractionCards() {
    const motionGrid = document.getElementById('pbMotionGrid');
    if (motionGrid) {
      motionGrid.innerHTML = MOTION_PROFILES.map((m) => `
        <button type="button" class="select-card pb-motion-card" data-motion-id="${escapeHtml(m.id)}" data-value="${escapeHtml(m.value)}" aria-pressed="false">
          <span class="check-mark"><i data-lucide="check"></i></span>
          ${renderMotionMiniStage(m.previewKind)}
          <div class="card-title">${escapeHtml(m.name)}</div>
          <div class="card-desc">${escapeHtml(m.desc)}</div>
        </button>
      `).join('');

      motionGrid.querySelectorAll('[data-motion-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.motionId;
          const current = Array.isArray(this.selections.motionProfiles)
            ? this.selections.motionProfiles.slice()
            : (this.selections.motionProfileId ? [this.selections.motionProfileId] : []);

          const { nextIds, conflictNote } = resolveMotionProfileToggle(current, id);
          this.selections.motionProfiles = nextIds;
          this._syncMotionSelectionFields();

          motionGrid.querySelectorAll('[data-motion-id]').forEach((c) => {
            const isSelected = nextIds.includes(c.dataset.motionId);
            c.classList.toggle('selected', isSelected);
            c.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
          });

          if (conflictNote) {
            this.showToast(conflictNote);
          }
          this._triggerPopAnimation(btn);
          this.updateLivePreview();
          this._renderStepRail();
        });
      });
    }

    const interGrid = document.getElementById('pbInteractionGrid');
    if (interGrid) {
      interGrid.innerHTML = INTERACTION_STYLES.map((it) => `
        <button type="button" class="select-card" data-interaction-id="${escapeHtml(it.id)}" data-value="${escapeHtml(it.value)}">
          <span class="check-mark"><i data-lucide="check"></i></span>
          <div class="card-title">${escapeHtml(it.name)}</div>
          <div class="card-desc">${escapeHtml(it.desc)}</div>
        </button>
      `).join('');

      interGrid.querySelectorAll('[data-interaction-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          interGrid.querySelectorAll('.select-card').forEach((c) => c.classList.remove('selected'));
          btn.classList.add('selected');
          this._triggerPopAnimation(btn);
          this.selections.interactionStyleId = btn.dataset.interactionId;
          this.selections.interactionStyle = btn.dataset.value || '';
          this.updateLivePreview();
          this._renderStepRail();
        });
      });
    }
  }

  // ── Step 5: 4-Level AI Freedom Slider & Core 6 Cross-Library Mix & Match ──

  _renderFreedomSlider() {
    const host = document.getElementById('pbFreedomControl');
    if (!host) return;

    const currentLevel = getFreedomLevelMeta(this.selections.aiFreedomLevel);

    host.innerHTML = `
      <div class="pb-freedom-top">
        <div class="pb-freedom-title-group">
          <span class="pb-freedom-level-num tabular-nums">L${currentLevel.level}</span>
          <strong class="pb-freedom-label">${escapeHtml(currentLevel.label)}</strong>
          <span class="pb-freedom-tag">${escapeHtml(currentLevel.badge)}</span>
        </div>
        <span class="pb-freedom-scale-hint">Most Restricted → Pure Design System</span>
      </div>
      <div class="pb-freedom-slider-wrap">
        <input type="range" id="pbFreedomRange" class="pb-freedom-range" min="1" max="4" step="1" value="${currentLevel.level}" aria-label="AI model creative freedom level">
      </div>
      <div class="pb-freedom-stops" role="group" aria-label="Select AI freedom level">
        ${AI_FREEDOM_LEVELS.map((lvl) => `
          <button type="button" class="pb-freedom-stop${lvl.level === currentLevel.level ? ' active' : ''}" data-freedom-stop="${lvl.level}">
            <span class="pb-fstop-idx tabular-nums">0${lvl.level}</span>
            <span class="pb-fstop-name">${escapeHtml(lvl.shortLabel)}</span>
          </button>
        `).join('')}
      </div>
      <p class="pb-freedom-summary">${escapeHtml(currentLevel.summary)}</p>
    `;

    const applyLevel = (val) => {
      const next = Math.min(4, Math.max(1, Number(val) || DEFAULT_AI_FREEDOM_LEVEL));
      this.selections.aiFreedomLevel = next;
      this._renderFreedomSlider();
      this._renderComponentModeUI();
      this.updateLivePreview();
      this._renderStepRail();
    };

    host.querySelector('#pbFreedomRange')?.addEventListener('input', (e) => applyLevel(e.target.value));
    host.querySelectorAll('[data-freedom-stop]').forEach((btn) => {
      btn.addEventListener('click', () => applyLevel(btn.dataset.freedomStop));
    });
  }

  _renderComponentModeUI() {
    const freedomMeta = getFreedomLevelMeta(this.selections.aiFreedomLevel);
    const mode = this.selections.componentMode === 'mix-match' ? 'mix-match' : 'library';
    const wrapper = document.getElementById('pbComponentSourceWrap');
    const notice = document.getElementById('pbPureSystemNotice');
    const l1Notice = document.getElementById('pbL1NoSourceNotice');
    const wholePane = document.getElementById('pbWholeLibraryPane');
    const mixPane = document.getElementById('pbMixMatchPane');

    document.querySelectorAll('[data-pb-comp-mode]').forEach((btn) => {
      const active = btn.dataset.pbCompMode === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    if (wrapper) {
      wrapper.classList.toggle('is-bypassed', !freedomMeta.usesTemplates);
    }
    if (notice) {
      notice.hidden = freedomMeta.usesTemplates;
    }
    if (l1Notice) {
      const hasSource = countSlotsWithSource(this.selections.slotSelections) > 0;
      l1Notice.hidden = !(freedomMeta.level === 1 && !hasSource);
    }
    if (wholePane) wholePane.hidden = mode !== 'library';
    if (mixPane) mixPane.hidden = mode !== 'mix-match';

    if (mode === 'library') {
      this._renderUiLibraryPicker();
    } else {
      this._renderSlotCards();
    }
    requestAnimationFrame(() => this._updateScrollCue());
  }

  _renderOutputAndDeliveryControls() {
    const formatHost = document.getElementById('pbOutputFormatSeg');
    if (formatHost) {
      const curFmt = this.selections.outputFormat || 'single-file';
      formatHost.innerHTML = OUTPUT_FORMATS.map((fmt) => `
        <button type="button" class="pb-inline-seg-btn${curFmt === fmt.id ? ' active' : ''}" data-output-fmt="${escapeHtml(fmt.id)}" aria-pressed="${curFmt === fmt.id ? 'true' : 'false'}">
          <span class="pb-seg-title">${escapeHtml(fmt.label)}</span>
          <span class="pb-seg-sub">${escapeHtml(fmt.desc)}</span>
        </button>
      `).join('');

      formatHost.querySelectorAll('[data-output-fmt]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.selections.outputFormat = btn.dataset.outputFmt === 'file-tree' ? 'file-tree' : 'single-file';
          this._renderOutputAndDeliveryControls();
          this.updateLivePreview();
        });
      });
    }

    const delivHost = document.getElementById('pbDeliveryModeSeg');
    if (delivHost) {
      const curMode = this.selections.deliveryMode || 'full-one-shot';
      delivHost.innerHTML = DELIVERY_MODES.map((dm) => `
        <button type="button" class="pb-inline-seg-btn${curMode === dm.id ? ' active' : ''}" data-delivery-mode="${escapeHtml(dm.id)}" aria-pressed="${curMode === dm.id ? 'true' : 'false'}">
          <span class="pb-seg-title">${escapeHtml(dm.label)}</span>
          <span class="pb-seg-sub">${escapeHtml(dm.desc)}</span>
        </button>
      `).join('');

      delivHost.querySelectorAll('[data-delivery-mode]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.selections.deliveryMode = btn.dataset.deliveryMode === 'phased' ? 'phased' : 'full-one-shot';
          this._renderOutputAndDeliveryControls();
          this.updateLivePreview();
        });
      });
    }
  }

  _renderSlotCards() {
    const grid = document.getElementById('pbMixSlotsGrid');
    if (!grid) return;

    const picks = this.selections.slotSelections || {};
    grid.innerHTML = MIX_MATCH_SECTION_SLOTS.map((slot) => {
      const pick = picks[slot.id];
      return `
        <div class="pb-slot-card${pick ? ' assigned' : ''}" data-slot-card="${escapeHtml(slot.id)}">
          <div class="pb-slot-card-top">
            <span class="pb-slot-name">${escapeHtml(slot.label)}</span>
            ${pick
              ? `<button type="button" class="pb-slot-clear" data-slot-clear="${escapeHtml(slot.id)}" title="Clear ${escapeHtml(slot.label)}">Clear</button>`
              : `<span class="pb-slot-empty-tag">Auto</span>`}
          </div>
          ${pick
            ? `<div class="pb-slot-pick-name">${escapeHtml(pick.name)}</div>
               <div class="pb-slot-pick-lib">
                 <span class="pb-sync-dot" style="background:${escapeHtml(pick.librarySwatch || '#F59E0B')}"></span>
                 <span>${escapeHtml(pick.libraryName || pick.libraryId)}</span>
               </div>`
            : `<div class="pb-slot-desc">${escapeHtml(slot.shortDesc)}</div>`}
          <button type="button" class="pb-slot-choose-btn" data-slot-pick="${escapeHtml(slot.id)}">
            <i data-lucide="${pick ? 'replace' : 'blocks'}"></i>
            <span>${pick ? 'Change Element' : 'Pick from Library'}</span>
          </button>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('[data-slot-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slotId = btn.dataset.slotPick;
        const slot = MIX_MATCH_SECTION_SLOTS.find((s) => s.id === slotId);
        if (!slot) return;

        // Open the FULL UI Component Library Studio modal with live previews across all libraries!
        if (typeof this.callbacks.openUiLibraryForSlot === 'function') {
          this.callbacks.openUiLibraryForSlot(slot, (picked) => {
            if (!picked || !picked.name) return;
            if (!this.selections.slotSelections) this.selections.slotSelections = {};
            this.selections.slotSelections[slot.id] = {
              id: picked.id,
              libraryId: picked.libraryId,
              libraryName: picked.libraryName,
              librarySwatch: picked.librarySwatch,
              name: picked.name,
              category: picked.category || slot.id,
              description: picked.description || '',
              code: picked.code || '',
            };
            this._renderComponentModeUI();
            this.updateLivePreview();
            this._renderStepRail();
            this.showToast(`Selected "${picked.name}" (${picked.libraryName}) for ${slot.label}`);
          });
          return;
        }

        // Fallback if invoked outside Studio shell
        this.activeSlotPickerId = this.activeSlotPickerId === slotId ? '' : slotId;
        this._renderInlineSlotPicker();
      });
    });

    grid.querySelectorAll('[data-slot-clear]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slotId = btn.dataset.slotClear;
        if (this.selections.slotSelections && this.selections.slotSelections[slotId]) {
          delete this.selections.slotSelections[slotId];
          this._renderComponentModeUI();
          this.updateLivePreview();
          this._renderStepRail();
        }
      });
    });

    if (typeof window.lucide !== 'undefined') {
      try { window.lucide.createIcons({ root: grid }); } catch {}
    }
  }

  _renderInlineSlotPicker() {
    const panel = document.getElementById('pbSlotPickerPanel');
    if (!panel) return;
    const slot = MIX_MATCH_SECTION_SLOTS.find((s) => s.id === this.activeSlotPickerId);
    if (!slot) {
      panel.hidden = true;
      panel.innerHTML = '';
      return;
    }

    panel.hidden = false;
    panel.innerHTML = `
      <div class="pb-slot-picker-head">
        <div>
          <strong>Pick ${escapeHtml(slot.label)} Component</strong>
          <span class="pb-slot-picker-sub">Mix from HyperUI, Kokonut UI, 21st.dev, Awesome, shadcn/ui or Built-in</span>
        </div>
        <button type="button" class="pb-inline-btn" id="btnPbCloseSlotPicker">Done</button>
      </div>
      <div class="pb-slot-picker-controls">
        <div class="pb-slot-lib-filters">
          ${CROSS_LIBRARY_FILTERS.map((f) => `
            <button type="button" class="pb-slot-lib-chip${this.slotPickerLibrary === f.id ? ' active' : ''}" data-slot-lib-filter="${escapeHtml(f.id)}">
              ${escapeHtml(f.label)}
            </button>
          `).join('')}
        </div>
        <div class="pb-search-wrap pb-slot-search-wrap">
          <i data-lucide="search"></i>
          <input type="search" id="pbSlotSearchInput" placeholder="Search ${escapeHtml(slot.label.toLowerCase())} elements…" value="${escapeHtml(this.slotPickerQuery)}" autocomplete="off">
        </div>
      </div>
      <div class="pb-slot-results" id="pbSlotResultsList"></div>
    `;

    panel.querySelector('#btnPbCloseSlotPicker')?.addEventListener('click', () => {
      this.activeSlotPickerId = '';
      this._renderSlotCards();
    });

    panel.querySelectorAll('[data-slot-lib-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.slotPickerLibrary = btn.dataset.slotLibFilter || 'all';
        this._renderInlineSlotPicker();
        this._loadSlotPickerCandidates();
      });
    });

    const input = panel.querySelector('#pbSlotSearchInput');
    input?.addEventListener('input', () => {
      this.slotPickerQuery = input.value.trim();
      clearTimeout(this._slotSearchDebounce);
      this._slotSearchDebounce = setTimeout(() => this._loadSlotPickerCandidates(), 160);
    });

    if (typeof window.lucide !== 'undefined') {
      try { window.lucide.createIcons({ root: panel }); } catch {}
    }

    this._renderSlotPickerResults();
  }

  async _loadSlotPickerCandidates() {
    if (!this.activeSlotPickerId) return;
    const manager = this.callbacks.getUiLibraryManager?.();
    if (!manager) return;

    const seq = ++this._slotReqSeq;
    this.slotPickerLoading = true;
    this._renderSlotPickerResults();

    const results = await queryCrossLibraryCandidates(manager, {
      slot: this.activeSlotPickerId,
      libraryFilter: this.slotPickerLibrary,
      query: this.slotPickerQuery,
      limit: 18,
    });

    if (seq !== this._slotReqSeq) return;
    this.slotPickerLoading = false;
    this.slotPickerResults = results;
    this._renderSlotPickerResults();
  }

  _renderSlotPickerResults() {
    const listEl = document.getElementById('pbSlotResultsList');
    if (!listEl) return;

    if (this.slotPickerLoading) {
      listEl.innerHTML = `<div class="pb-slot-results-empty">Searching UI libraries…</div>`;
      return;
    }

    if (!this.slotPickerResults.length) {
      listEl.innerHTML = `<div class="pb-slot-results-empty">No matching components found. Try switching libraries or clearing search.</div>`;
      return;
    }

    const currentPick = this.selections.slotSelections?.[this.activeSlotPickerId];
    listEl.innerHTML = this.slotPickerResults.map((cand, idx) => {
      const selected = currentPick && currentPick.libraryId === cand.libraryId && currentPick.id === cand.id;
      return `
        <button type="button" class="pb-slot-result-row${selected ? ' selected' : ''}" data-slot-cand-idx="${idx}">
          <span class="pb-slot-res-main">
            <span class="pb-slot-res-name">${escapeHtml(cand.name)}</span>
            <span class="pb-slot-res-desc">${escapeHtml(cand.description || cand.category)}</span>
          </span>
          <span class="pb-slot-res-lib">
            <span class="pb-sync-dot" style="background:${escapeHtml(cand.librarySwatch)}"></span>
            <span>${escapeHtml(cand.libraryName)}</span>
          </span>
        </button>
      `;
    }).join('');

    listEl.querySelectorAll('[data-slot-cand-idx]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const cand = this.slotPickerResults[Number(btn.dataset.slotCandIdx)];
        if (!cand || !this.activeSlotPickerId) return;
        const slotId = this.activeSlotPickerId;
        const manager = this.callbacks.getUiLibraryManager?.();
        const hydrated = await hydrateCandidateDetail(manager, cand);

        if (!this.selections.slotSelections) this.selections.slotSelections = {};
        this.selections.slotSelections[slotId] = {
          id: hydrated.id,
          libraryId: hydrated.libraryId,
          libraryName: hydrated.libraryName,
          librarySwatch: hydrated.librarySwatch,
          name: hydrated.name,
          category: hydrated.category,
          description: hydrated.description,
          code: hydrated.code || hydrated.renderedHtml || hydrated.previewHtml || '',
        };

        this.activeSlotPickerId = '';
        this._renderSlotCards();
        this.updateLivePreview();
        this._renderStepRail();
        this.showToast(`Assigned "${hydrated.name}" (${hydrated.libraryName}) to ${slotId.toUpperCase()}`);
      });
    });
  }

  _renderAudienceAndScopeCards() {
    const audGrid = document.getElementById('pbAudienceGrid');
    if (audGrid) {
      audGrid.innerHTML = AUDIENCE_PRESETS.map((a) => `
        <button type="button" class="select-card" data-value="${escapeHtml(a.name)}">
          <span class="check-mark"><i data-lucide="check"></i></span>
          <div class="card-title">${escapeHtml(a.name)}</div>
          <div class="card-desc">${escapeHtml(a.desc)}</div>
        </button>
      `).join('');

      audGrid.querySelectorAll('.select-card').forEach((btn) => {
        btn.addEventListener('click', () => {
          audGrid.querySelectorAll('.select-card').forEach((c) => c.classList.remove('selected'));
          btn.classList.add('selected');
          this._triggerPopAnimation(btn);
          this.selections.audience = btn.dataset.value || '';
          this.updateLivePreview();
          this._renderStepRail();
        });
      });
    }

    const scopeGrid = document.getElementById('pbScopeGrid');
    if (scopeGrid) {
      scopeGrid.innerHTML = PAGE_SCOPES.map((sc) => `
        <button type="button" class="select-card" data-value="${escapeHtml(sc.value)}">
          <span class="check-mark"><i data-lucide="check"></i></span>
          <div class="card-title">${escapeHtml(sc.name)}</div>
          <div class="card-desc">${escapeHtml(sc.desc)}</div>
        </button>
      `).join('');

      scopeGrid.querySelectorAll('.select-card').forEach((btn) => {
        btn.addEventListener('click', () => {
          scopeGrid.querySelectorAll('.select-card').forEach((c) => c.classList.remove('selected'));
          btn.classList.add('selected');
          this._triggerPopAnimation(btn);
          this.selections.pageCount = btn.dataset.value || '';
          this.updateLivePreview();
          this._renderStepRail();
        });
      });
    }
  }

  _renderUiLibraryPicker() {
    const grid = document.getElementById('pbUiLibGrid');
    if (!grid || typeof this.callbacks.getLibraries !== 'function') return;

    const libs = this.callbacks.getLibraries() || [];
    const manager = this.callbacks.getUiLibraryManager?.();
    const activeId = this.callbacks.getActiveLibraryId?.() || null;

    const featured = libs.slice(0, 16);
    const items = [
      { id: '', name: 'From Scratch', desc: 'Pure Tailwind / CSS', swatch: '#64748B' },
      ...featured.map((lib) => {
        const count = manager && typeof manager.getVerifiedCount === 'function'
          ? manager.getVerifiedCount(lib)
          : (lib.elements?.length || 0);
        const swatch = lib.swatches?.[2] || lib.swatches?.[0] || '#F59E0B';
        const desc = `${count.toLocaleString()} verified`;
        return {
          id: lib.id,
          name: lib.name,
          desc,
          swatch,
        };
      }),
    ];

    grid.innerHTML = items.map((item) => {
      const isSelected = (item.id === '' && (!activeId || activeId === 'none')) || (item.id && item.id === activeId);
      return `
        <button type="button" class="pb-sync-chip${isSelected ? ' selected' : ''}" data-uilib-id="${escapeHtml(item.id)}">
          <span class="pb-sync-dot" style="background:${escapeHtml(item.swatch)}"></span>
          <span class="pb-sync-copy">
            <span class="pb-sync-name">${escapeHtml(item.name)}</span>
            <span class="pb-sync-meta tabular-nums">${escapeHtml(item.desc)}</span>
          </span>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('[data-uilib-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.uilibId || 'none';
        this.callbacks.setActiveLibrary?.(id);
        this._triggerPopAnimation(btn);
        this._renderUiLibraryPicker();
        this.updateLivePreview();
        this._renderStepRail();
      });
    });
  }

  _syncFeaturesFromUnifiedSections() {
    const enabled = Array.isArray(this.selections.enabledSections) ? this.selections.enabledSections : [];
    const nextFeatures = [];
    for (const id of enabled) {
      const cat = UNIFIED_SECTION_CATALOG.find((x) => x.id === id);
      if (cat?.featureValue && !nextFeatures.includes(cat.featureValue)) {
        nextFeatures.push(cat.featureValue);
      }
    }
    this.selections.features = nextFeatures;
  }

  _renderUnifiedSectionsEditor() {
    const host = document.getElementById('pbUnifiedSectionsGrid');
    if (!host) return;

    const enabled = Array.isArray(this.selections.enabledSections) ? this.selections.enabledSections : [];
    const configs = this.selections.sectionConfigs || {};

    host.innerHTML = UNIFIED_SECTION_CATALOG.map((item) => {
      const isOn = enabled.includes(item.id);
      const cfg = configs[item.id] || getDefaultSectionConfig(item.id);
      const hasConfig = Array.isArray(item.fields) && item.fields.length > 0;
      return `
        <div class="pb-usec-item${isOn ? ' selected' : ''}${hasConfig && isOn ? ' has-config' : ''}" data-usec-wrap="${escapeHtml(item.id)}">
          <button type="button" class="pb-usec-toggle" data-usec-id="${escapeHtml(item.id)}" aria-pressed="${isOn ? 'true' : 'false'}">
            <span class="feature-toggle"><i data-lucide="check"></i></span>
            <span class="pb-usec-copy">
              <span class="feature-label">${escapeHtml(item.shortLabel)}</span>
              ${hasConfig ? `<span class="pb-usec-hint">${isOn ? 'Configured below' : 'Configurable'}</span>` : ''}
            </span>
          </button>
          ${isOn && hasConfig ? `
            <div class="pb-usec-config">
              ${item.fields.map((f) => `
                <label class="pb-usec-field">
                  <span>${escapeHtml(f.label)}</span>
                  <input
                    type="text"
                    data-usec-config-id="${escapeHtml(item.id)}"
                    data-usec-field="${escapeHtml(f.key)}"
                    value="${escapeHtml(cfg[f.key] ?? f.defaultValue ?? '')}"
                    placeholder="${escapeHtml(f.placeholder || '')}"
                  >
                </label>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    host.querySelectorAll('[data-usec-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.usecId;
        if (!id) return;
        const list = Array.isArray(this.selections.enabledSections) ? this.selections.enabledSections.slice() : [];
        if (list.includes(id)) {
          this.selections.enabledSections = list.filter((x) => x !== id);
        } else {
          list.push(id);
          this.selections.enabledSections = list;
          if (!this.selections.sectionConfigs) this.selections.sectionConfigs = {};
          if (!this.selections.sectionConfigs[id]) {
            this.selections.sectionConfigs[id] = getDefaultSectionConfig(id);
          }
        }
        this._syncFeaturesFromUnifiedSections();
        this._renderUnifiedSectionsEditor();
        this.updateLivePreview();
        this._renderStepRail();
        requestAnimationFrame(() => this._updateScrollCue());
      });
    });

    host.querySelectorAll('[data-usec-config-id]').forEach((input) => {
      const updateCfg = () => {
        const secId = input.dataset.usecConfigId;
        const fieldKey = input.dataset.usecField;
        if (!secId || !fieldKey) return;
        if (!this.selections.sectionConfigs) this.selections.sectionConfigs = {};
        if (!this.selections.sectionConfigs[secId]) {
          this.selections.sectionConfigs[secId] = getDefaultSectionConfig(secId);
        }
        this.selections.sectionConfigs[secId][fieldKey] = input.value.trim();
        this.updateLivePreview();
      };
      input.addEventListener('input', updateCfg);
      input.addEventListener('change', updateCfg);
    });

    if (typeof window.lucide !== 'undefined') {
      try { window.lucide.createIcons({ root: host }); } catch {}
    }
  }

  _renderSkillsPicker() {
    const grid = document.getElementById('pbSkillsGrid');
    if (!grid || typeof this.callbacks.getSkills !== 'function') return;

    const skills = this.callbacks.getSkills() || [];
    const chosen = Array.isArray(this.selections.selectedSkills) ? this.selections.selectedSkills : [];

    grid.innerHTML = skills.map((sk) => {
      const isSelected = chosen.includes(sk.name);
      return `
        <button type="button" class="feature-card pb-skill-toggle${isSelected ? ' selected' : ''}" data-skill-name="${escapeHtml(sk.name)}" aria-pressed="${isSelected ? 'true' : 'false'}">
          <span class="feature-toggle"><i data-lucide="check"></i></span>
          <span class="pb-skill-text">
            <span class="feature-label">${escapeHtml(sk.name)}</span>
            <span class="pb-skill-sub">${escapeHtml((sk.description || '').slice(0, 62))}${(sk.description || '').length > 62 ? '…' : ''}</span>
          </span>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('[data-skill-name]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.skillName;
        if (!name) return;
        const next = Array.isArray(this.selections.selectedSkills) ? this.selections.selectedSkills.slice() : [];
        if (next.includes(name)) {
          this.selections.selectedSkills = next.filter((x) => x !== name);
        } else {
          next.push(name);
          this.selections.selectedSkills = next;
        }
        this._triggerPopAnimation(btn);
        this._renderSkillsPicker();
        this.updateLivePreview();
        this._renderStepRail();
      });
    });

    if (typeof window.lucide !== 'undefined') {
      try { window.lucide.createIcons({ root: grid }); } catch {}
    }
  }

  _renderCompatibilityBanner(validation) {
    const banner = document.getElementById('pbCompatBanner');
    if (!banner) return;

    const warnings = Array.isArray(validation?.warnings) ? validation.warnings : [];
    const visibleWarnings = this.currentStep >= 4 ? warnings : warnings.filter((w) => w.step === this.currentStep);

    if (!visibleWarnings.length) {
      banner.hidden = true;
      banner.innerHTML = '';
      return;
    }

    banner.hidden = false;
    banner.innerHTML = visibleWarnings.map((w, idx) => `
      <div class="pb-compat-item is-${escapeHtml(w.severity || 'warning')}">
        <div class="pb-compat-copy">
          <strong class="pb-compat-title">${escapeHtml(w.title)}</strong>
          <p class="pb-compat-msg">${escapeHtml(w.message)}</p>
        </div>
        ${w.fixLabel ? `<button type="button" class="pb-compat-fix-btn" data-compat-fix-idx="${idx}">${escapeHtml(w.fixLabel)}</button>` : ''}
      </div>
    `).join('');

    banner.querySelectorAll('[data-compat-fix-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const w = visibleWarnings[Number(btn.dataset.compatFixIdx)];
        if (w) this._applyCompatFix(w);
      });
    });
  }

  _applyCompatFix(warning) {
    if (!warning) return;
    switch (warning.fixAction) {
      case 'open-mix-match':
        this.selections.componentMode = 'mix-match';
        this.goToStep(5);
        this._renderComponentModeUI();
        this.showToast('Switched to Mix & Match — pick any slot to attach verbatim component code');
        break;
      case 'switch-category':
        if (warning.suggestedCategory) {
          this.selections.type = warning.suggestedCategory;
          this._hydrateDOMFromSelections();
          this.updateLivePreview();
          this._renderStepRail();
          this.showToast(`Category switched to ${warning.suggestedCategory}`);
        }
        break;
      case 'resolve-motion':
        if (warning.keepMotionId) {
          this.selections.motionProfiles = [warning.keepMotionId];
          this._syncMotionSelectionFields();
          this._hydrateDOMFromSelections();
          this.updateLivePreview();
          this._renderStepRail();
          this.showToast('Resolved conflicting motion profiles');
        }
        break;
      case 'set-technical-tone':
        this.selections.siteTone = 'Technical and concise';
        if (/corporate/i.test(String(this.selections.style || ''))) {
          this.selections.style = 'Dark and Modern';
        }
        this._hydrateDOMFromSelections();
        this.updateLivePreview();
        this._renderStepRail();
        this.showToast('Updated voice to Technical and concise');
        break;
      case 'set-bento-secondary':
        this.selections.secondaryLayout = 'Hairline-ruled columns elsewhere';
        this.selections.content = 'Card-based grid layout';
        this._hydrateDOMFromSelections();
        this.updateLivePreview();
        this._renderStepRail();
        this.showToast('Paired Bento architecture grid with hairline-ruled columns');
        break;
      default:
        break;
    }
  }

  _renderSavedTemplates() {
    const listEl = document.getElementById('pbSavedTemplatesList');
    const countEl = document.getElementById('pbTemplatesCount');
    if (!listEl) return;

    const templates = loadSavedPromptTemplates();
    if (countEl) countEl.textContent = String(templates.length);

    if (!templates.length) {
      listEl.innerHTML = `<div class="pb-templates-empty">Save any configuration for 1-click reuse.</div>`;
      return;
    }

    listEl.innerHTML = templates.map((tpl) => {
      const cat = tpl.selections?.type ? tpl.selections.type.split(' / ')[0] : 'Custom';
      return `
        <div class="pb-template-item" data-template-id="${escapeHtml(tpl.id)}">
          <button type="button" class="pb-template-load" data-action="load-template">
            <span class="pb-template-name">${escapeHtml(tpl.name)}</span>
            <span class="pb-template-meta">${escapeHtml(cat)}</span>
          </button>
          <button type="button" class="pb-template-del" data-action="delete-template" title="Delete ${escapeHtml(tpl.name)}" aria-label="Delete ${escapeHtml(tpl.name)}">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.pb-template-item').forEach((row) => {
      const id = row.dataset.templateId;
      row.querySelector('[data-action="load-template"]')?.addEventListener('click', () => {
        const tpl = loadSavedPromptTemplates().find((t) => t.id === id);
        if (!tpl) return;
        this.activeBlueprintId = '';
        this.selections = { ...createEmptySelections(), ...JSON.parse(JSON.stringify(tpl.selections)) };
        this._hydrateDOMFromSelections();
        this.updateLivePreview();
        this._renderStepRail();
        this.showToast(`Loaded template "${tpl.name}"`);
      });
      row.querySelector('[data-action="delete-template"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (deletePromptTemplate(id)) {
          this._renderSavedTemplates();
          this.showToast('Template deleted');
        }
      });
    });

    if (typeof window.lucide !== 'undefined') {
      try { window.lucide.createIcons({ root: listEl }); } catch {}
    }
  }

  _hydrateDOMFromSelections() {
    const s = this.selections;
    document.querySelectorAll('#pbBlueprintsGrid [data-blueprint-id]').forEach((el) => {
      el.classList.toggle('selected', el.dataset.blueprintId === this.activeBlueprintId);
    });
    document.querySelectorAll('#typeGrid .select-card').forEach((el) => {
      el.classList.toggle('selected', el.dataset.value === s.type);
    });
    document.querySelectorAll('#pbDesignMdGrid .pb-designmd-card').forEach((el) => {
      el.classList.toggle('selected', el.dataset.designmdId === s.designSystemId);
    });
    document.querySelectorAll('#styleGrid .select-card').forEach((el) => {
      el.classList.toggle('selected', !s.designSystemId && el.dataset.value === s.style);
    });
    document.querySelectorAll('#colorGrid .select-card').forEach((el) => {
      el.classList.toggle('selected', el.dataset.palette === s.paletteKey);
    });
    document.querySelectorAll('#pbFontGrid .pb-font-card').forEach((el) => {
      el.classList.toggle('selected', el.dataset.fontId === s.typographyId);
    });
    [
      ['#headerGrid', s.header],
      ['#heroGrid', s.hero],
      ['#contentGrid', s.content],
      ['#footerGrid', s.footer],
      ['#spacingGrid', s.spacing],
      ['#toneGrid', s.siteTone],
      ['#pbAudienceGrid', s.audience],
      ['#pbScopeGrid', s.pageCount],
      ['#techGrid', s.tech],
    ].forEach(([sel, val]) => {
      document.querySelectorAll(`${sel} .select-card`).forEach((el) => {
        el.classList.toggle('selected', Boolean(val) && el.dataset.value === val);
      });
    });
    const activeMotionIds = Array.isArray(s.motionProfiles) && s.motionProfiles.length
      ? s.motionProfiles
      : (s.motionProfileId ? [s.motionProfileId] : []);
    this.selections.motionProfiles = activeMotionIds.slice();
    this._syncMotionSelectionFields();
    document.querySelectorAll('#pbMotionGrid .select-card').forEach((el) => {
      const isSelected = activeMotionIds.includes(el.dataset.motionId);
      el.classList.toggle('selected', isSelected);
      el.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
    document.querySelectorAll('#pbInteractionGrid .select-card').forEach((el) => {
      el.classList.toggle('selected', el.dataset.interactionId === s.interactionStyleId);
    });
    // Hydrate unified sections from features if enabledSections is empty
    if (!Array.isArray(s.enabledSections) || s.enabledSections.length === 0) {
      const derived = [];
      for (const fVal of (s.features || [])) {
        const match = UNIFIED_SECTION_CATALOG.find((c) => c.featureValue === fVal);
        if (match && !derived.includes(match.id)) derived.push(match.id);
      }
      this.selections.enabledSections = derived;
    }
    this._syncFeaturesFromUnifiedSections();
    this._renderUnifiedSectionsEditor();

    document.querySelectorAll('#techFeatureGrid .feature-card').forEach((el) => {
      el.classList.toggle('selected', Array.isArray(s.techFeatures) && s.techFeatures.includes(el.dataset.value));
    });
    ['siteName', 'siteTagline', 'siteDescription', 'customSections', 'fontPref', 'doNotList'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = s[id] || '';
    });
    this._renderSecondaryLayoutControls();
    this._renderMotionLibraryControl();
    this._renderFreedomSlider();
    this._renderComponentModeUI();
    this._renderOutputAndDeliveryControls();
    this._renderSkillsPicker();
  }

  _stepSummaryText(stepNum) {
    const s = this.selections;
    switch (stepNum) {
      case 1: {
        if (this.activeBlueprintId) {
          return STARTER_BLUEPRINTS.find((b) => b.id === this.activeBlueprintId)?.name || 'Blueprint';
        }
        return 'Starter or scratch';
      }
      case 2: return s.type ? s.type.split(' / ')[0] : 'Pick category';
      case 3: {
        if (s.designSystemId) {
          return DESIGN_MD_PRESETS.find((d) => d.id === s.designSystemId)?.name.replace(' DESIGN.md', '') || 'DESIGN.md';
        }
        const pal = PALETTE_TOKENS[s.paletteKey]?.label || (s.customPalette ? 'Custom' : '');
        const font = TYPOGRAPHY_PAIRINGS.find((f) => f.id === s.typographyId)?.name.split(' + ')[0] || '';
        return [pal, font].filter(Boolean).join(' · ') || 'System, color & type';
      }
      case 4: {
        const mIds = Array.isArray(s.motionProfiles) && s.motionProfiles.length
          ? s.motionProfiles
          : (s.motionProfileId ? [s.motionProfileId] : []);
        const m = mIds.length > 1
          ? `${mIds.length} motions`
          : (MOTION_PROFILES.find((x) => x.id === mIds[0])?.name.split(' ')[0] || '');
        const heroStr = String(s.hero || '');
        const h = heroStr ? (heroStr.includes('Split') ? 'Split' : heroStr.includes('Minimal') ? 'Editorial' : heroStr.includes('Bento') ? 'Bento' : 'Hero') : '';
        return [h, m].filter(Boolean).join(' · ') || 'Grid & motion';
      }
      case 5: {
        const lvl = getFreedomLevelMeta(s.aiFreedomLevel);
        const slotCount = Object.keys(s.slotSelections || {}).length;
        if (!lvl.usesTemplates) return `L4 · Pure System`;
        if (slotCount > 0) return `L${lvl.level} · ${slotCount} slot${slotCount === 1 ? '' : 's'}`;
        return `L${lvl.level} · ${lvl.shortLabel}`;
      }
      case 6: {
        const sc = Array.isArray(s.selectedSkills) ? s.selectedSkills.length : 0;
        const fc = Math.max(
          Array.isArray(s.enabledSections) ? s.enabledSections.length : 0,
          Array.isArray(s.features) ? s.features.length : 0
        );
        if (s.siteName) {
          const parts = [s.siteName];
          if (fc) parts.push(`${fc} sec`);
          if (sc) parts.push(`${sc} skill${sc === 1 ? '' : 's'}`);
          return parts.join(' · ');
        }
        if (fc || sc) {
          return [fc ? `${fc} sections` : '', sc ? `${sc} skills` : ''].filter(Boolean).join(' · ');
        }
        return 'Copy, sections & stack';
      }
      case 7: return this.promptGenerated ? 'Ready to build' : 'Compile brief';
      default: return '';
    }
  }

  _isStepFilled(stepNum) {
    const s = this.selections;
    switch (stepNum) {
      case 1: return Boolean(this.activeBlueprintId);
      case 2: return Boolean(s.type);
      case 3: return Boolean(s.style || s.designSystemId || s.color || s.paletteKey || s.fontPref);
      case 4: return Boolean(s.header || s.hero || s.content || s.motionProfile || (s.motionProfiles?.length || 0) > 0);
      case 5: return Boolean(Object.keys(s.slotSelections || {}).length > 0 || s.aiFreedomLevel !== DEFAULT_AI_FREEDOM_LEVEL);
      case 6: return Boolean(s.siteName || s.siteDescription || s.audience || (s.enabledSections?.length || 0) > 0 || (s.features?.length || 0) > 0 || s.tech);
      case 7: return this.promptGenerated;
      default: return false;
    }
  }

  _renderStepRail() {
    const rail = document.getElementById('pbStepRail');
    if (!rail) return;

    rail.innerHTML = this.stepMeta.map((m) => {
      const active = m.step === this.currentStep;
      const filled = this._isStepFilled(m.step);
      const sub = this._stepSummaryText(m.step);
      return `
        <button type="button" class="pb-rail-step${active ? ' active' : ''}${filled ? ' filled' : ''}" data-rail-step="${m.step}" aria-current="${active ? 'step' : 'false'}">
          <span class="pb-rail-num tabular-nums">${filled && !active ? '<i data-lucide="check"></i>' : `0${m.step}`}</span>
          <span class="pb-rail-copy">
            <span class="pb-rail-name">${escapeHtml(m.name)}</span>
            <span class="pb-rail-sub">${escapeHtml(sub)}</span>
          </span>
        </button>
      `;
    }).join('');

    rail.querySelectorAll('[data-rail-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetStep = Number(btn.dataset.railStep);
        if (targetStep === 7) {
          this.generatePrompt();
        } else {
          this.goToStep(targetStep);
        }
      });
    });

    if (typeof window.lucide !== 'undefined') {
      try { window.lucide.createIcons({ root: rail }); } catch {}
    }
  }

  switchPreviewTab(tab) {
    this.previewTab = tab === 'spec' ? 'spec' : 'visual';
    const tabsWrap = document.getElementById('pbPreviewTabs');
    tabsWrap?.querySelectorAll('[data-pb-preview-tab]').forEach((btn) => {
      const isActive = btn.dataset.pbPreviewTab === this.previewTab;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const visualPane = document.getElementById('pbPreviewVisualPane');
    const specPane = document.getElementById('pbPreviewSpecPane');
    if (visualPane) visualPane.hidden = this.previewTab !== 'visual';
    if (specPane) specPane.hidden = this.previewTab !== 'spec';

    requestAnimationFrame(() => syncSlidingTabIndicator(tabsWrap));
  }

  _getStudioPromptContext() {
    const selectedSkills = Array.isArray(this.selections.selectedSkills) ? this.selections.selectedSkills : [];
    const activeLibId = this.callbacks.getActiveLibraryId?.() || null;
    const activeLib = (this.callbacks.getLibraries?.() || []).find((l) => l.id === activeLibId);
    return {
      activeSkills: selectedSkills,
      activeLibraryName: activeLib && activeLib.id !== 'none' ? activeLib.name : '',
    };
  }

  _resolvePreviewPalette() {
    if (this.selections.customPalette) return this.selections.customPalette;
    if (this.selections.paletteKey && PALETTE_TOKENS[this.selections.paletteKey]) {
      return PALETTE_TOKENS[this.selections.paletteKey];
    }
    return {
      label: 'No palette yet',
      bg: '#111214',
      surface: '#18191D',
      surface2: '#22242A',
      text: '#F4F4F5',
      muted: '#A1A1AA',
      accent: '#71717A',
      accentFg: '#FFFFFF',
      border: 'rgba(255, 255, 255, 0.10)',
      isDark: true,
    };
  }

  updateLivePreview() {
    const s = this.selections;
    const ctx = this._getStudioPromptContext();
    const compiled = compilePromptFromSelections(s, ctx);

    const tokEl = document.getElementById('pbTokenCount');
    if (tokEl) tokEl.textContent = `~${compiled.tokens.toLocaleString()} tok`;

    const pctEl = document.getElementById('pbCompletenessPct');
    const fillEl = document.getElementById('pbCompletenessFill');
    if (pctEl) pctEl.textContent = `${compiled.completenessPct}%`;
    if (fillEl) fillEl.style.width = `${compiled.completenessPct}%`;

    const specOut = document.getElementById('pbLiveSpecOutput');
    if (specOut) specOut.textContent = compiled.text;

    const mini = document.getElementById('pbMiniSite');
    if (mini) {
      const pal = this._resolvePreviewPalette();
      const fontPair = TYPOGRAPHY_PAIRINGS.find((p) => p.id === s.typographyId) || TYPOGRAPHY_PAIRINGS[0];

      mini.style.setProperty('--pv-bg', pal.bg);
      mini.style.setProperty('--pv-surface', pal.surface);
      mini.style.setProperty('--pv-surface2', pal.surface2 || pal.surface);
      mini.style.setProperty('--pv-text', pal.text);
      mini.style.setProperty('--pv-muted', pal.muted);
      mini.style.setProperty('--pv-accent', pal.accent);
      mini.style.setProperty('--pv-accent-fg', pal.onAccent || pal.accentFg || '#FFFFFF');
      mini.style.setProperty('--pv-border', pal.border);
      mini.style.setProperty('--pv-font-head', fontPair.headingCss);
      mini.style.setProperty('--pv-font-body', fontPair.bodyCss);

      const headerStr = String(s.header || '');
      const heroStr = String(s.hero || '');
      const contentStr = String(s.content || '');
      const spacingStr = String(s.spacing || '');

      const navMode = headerStr.includes('sidebar') ? 'sidebar'
        : headerStr.includes('Centered') ? 'centered'
        : headerStr.includes('Hamburger') ? 'minimal'
        : 'top';
      const heroMode = heroStr.includes('Split') || heroStr.includes('Asymmetric') ? 'split'
        : heroStr.includes('Minimal') ? 'editorial'
        : 'centered';
      const contentMode = contentStr.includes('Alternating') ? 'alternating'
        : contentStr.includes('dashboard') || contentStr.includes('Sticky') ? 'dashboard'
        : 'cards';
      const densityMode = spacingStr.includes('Compact') ? 'compact'
        : spacingStr.includes('Generous') ? 'airy'
        : 'balanced';

      mini.dataset.nav = navMode;
      mini.dataset.hero = heroMode;
      mini.dataset.content = contentMode;
      mini.dataset.density = densityMode;

      const brandEl = document.getElementById('pbMiniBrand');
      if (brandEl) brandEl.textContent = s.siteName || (s.type ? s.type.split(' / ')[0] : 'Your Brand');

      const headEl = document.getElementById('pbMiniHeadline');
      if (headEl) headEl.textContent = s.siteTagline || (s.type ? `Crafted ${s.type.split(' / ')[0]} experience` : 'Design with precision & clarity');

      const subEl = document.getElementById('pbMiniSub');
      if (subEl) {
        const desc = s.siteDescription || 'Live 3D visual preview adapts immediately as you dial in palettes, type, layout, and freedom.';
        subEl.textContent = desc.length > 92 ? `${desc.slice(0, 89)}…` : desc;
      }

      const ctaEl = document.getElementById('pbMiniCta');
      if (ctaEl) {
        ctaEl.textContent = s.type?.includes('E-Commerce') ? 'Shop Collection'
          : s.type?.includes('Portfolio') ? 'View Selected Work'
          : s.type?.includes('Restaurant') ? 'Reserve a Table'
          : 'Start Building';
      }
    }

    const summaryEl = document.getElementById('pbSummaryMeta');
    if (summaryEl) {
      const freedom = getFreedomLevelMeta(s.aiFreedomLevel);
      const parts = [
        s.type ? s.type.split(' / ')[0] : 'No category yet',
        PALETTE_TOKENS[s.paletteKey]?.label || (s.customPalette ? 'Custom' : 'No palette yet'),
        `L${freedom.level} ${freedom.shortLabel}`,
      ];
      summaryEl.textContent = parts.join(' · ');
    }

    const l1Notice = document.getElementById('pbL1NoSourceNotice');
    if (l1Notice) {
      l1Notice.hidden = !(compiled.validation?.l1AutoDowngraded);
    }

    this._renderCompatibilityBanner(compiled.validation);

    if (this.promptGenerated) {
      this._updateQualityMeter(compiled.completenessPct);
    }
  }

  _triggerPopAnimation(el) {
    if (!el || typeof el.classList === 'undefined') return;
    el.classList.remove('wf-select-pop');
    void el.offsetWidth;
    el.classList.add('wf-select-pop');
  }

  _enableCardKeyboard() {
    const modal = document.getElementById('promptBuilderModal');
    if (!modal || modal.dataset.kbReady) return;
    modal.dataset.kbReady = '1';

    modal.querySelectorAll('.select-card, .feature-card').forEach((card) => {
      if (card.tagName === 'BUTTON') return;
      if (!card.hasAttribute('tabindex')) card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault();
        card.click();
      });
    });
  }

  updateFooterNav() {
    const back = document.getElementById('wizardBackBtn');
    const skip = document.getElementById('wizardSkipBtn');
    const next = document.getElementById('wizardNextBtn');
    const step = this.currentStep;

    if (back) {
      const showBack = step > 1;
      back.hidden = !showBack;
      back.disabled = !showBack;
    }

    if (skip) {
      skip.hidden = step < 2 || step > 5;
    }

    if (next) {
      if (step >= 7) {
        next.hidden = true;
      } else {
        next.hidden = false;
        if (step === 6) {
          next.innerHTML = '<i data-lucide="wand-2"></i> Generate Prompt';
        } else {
          next.innerHTML = 'Next <i data-lucide="arrow-right"></i>';
        }
      }
    }

    const caption = document.getElementById('pbFooterCaption');
    if (caption) {
      const meta = this.stepMeta[step - 1];
      caption.textContent = `Step 0${step} of 0${this.totalSteps} · ${meta?.name || ''}`;
    }

    if (typeof window.lucide !== 'undefined') {
      try { window.lucide.createIcons({ root: document.getElementById('wizardFooter') }); } catch {}
    }
  }

  renderProgress() {
    const fill = document.getElementById('progressBarFill');
    if (fill) {
      fill.style.width = `${this.promptGenerated ? 100 : (this.currentStep / 7) * 100}%`;
    }
    this._renderStepRail();
    this.updateFooterNav();
  }

  showStep(step) {
    const dir = step >= this.prevStepNum ? 'step-enter-forward' : 'step-enter-backward';
    this.prevStepNum = step;

    document.querySelectorAll('.step-panel').forEach((panel) => {
      panel.classList.remove('active', 'step-enter-forward', 'step-enter-backward');
    });
    const target = document.querySelector(`.step-panel[data-step="${step}"]`);
    if (target) {
      target.classList.add('active', dir);
      const scrollHost = document.getElementById('pbCanvasScroll');
      if (scrollHost) scrollHost.scrollTop = 0;
    }

    if (step === 4) {
      this._renderSecondaryLayoutControls();
      this._renderMotionLibraryControl();
    }
    if (step === 5) {
      this._renderFreedomSlider();
      this._renderComponentModeUI();
      this._renderOutputAndDeliveryControls();
    }
    if (step === 6) {
      this._renderUnifiedSectionsEditor();
      this._renderSkillsPicker();
    }

    this.updateFooterNav();
    this.updateLivePreview();
    requestAnimationFrame(() => this._updateScrollCue());
    if (typeof window.lucide !== 'undefined') {
      try { window.lucide.createIcons({ root: document.getElementById('promptBuilderModal') }); } catch {}
    }
  }

  goToStep(step) {
    this.currentStep = step;
    if (step === 7 && this.promptGenerated) {
      this.generatePrompt();
    } else {
      this.showStep(step);
      this.renderProgress();
    }
  }

  nextStep() {
    if (this.currentStep < 7) {
      this.currentStep++;
      this.showStep(this.currentStep);
      this.renderProgress();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.showStep(this.currentStep);
      this.renderProgress();
    }
  }

  validateAndNext(step) {
    // Step 1 always allows advancing straight to Step 2 (Category) for custom builds
    if (step === 1) {
      this.nextStep();
      return;
    }
    this.nextStep();
  }

  selectCard(el, key) {
    if (!el) return;
    if (key === 'type') {
      document.querySelectorAll('#typeGrid .select-card').forEach((c) => c.classList.remove('selected'));
      this.activeBlueprintId = '';
      document.querySelectorAll('#pbBlueprintsGrid [data-blueprint-id]').forEach((c) => c.classList.remove('selected'));
    } else if (key === 'style') {
      document.querySelectorAll('#styleGrid .select-card').forEach((c) => c.classList.remove('selected'));
      document.querySelectorAll('#pbDesignMdGrid .pb-designmd-card').forEach((c) => c.classList.remove('selected'));
      this.selections.designSystemId = '';
    } else if (key === 'color') {
      document.querySelectorAll('#colorGrid .select-card').forEach((c) => c.classList.remove('selected'));
      this.selections.customPalette = null;
      if (el.dataset.palette) this.selections.paletteKey = el.dataset.palette;
    } else if (el.parentElement) {
      el.parentElement.querySelectorAll('.select-card').forEach((c) => c.classList.remove('selected'));
    }

    el.classList.add('selected');
    this._triggerPopAnimation(el);
    this.selections[key] = el.dataset.value || '';

    if (key === 'type') {
      document.getElementById('typeNudge')?.classList.remove('show');
      this.applySuggestions(this.selections[key]);
    }
    if (key === 'style') {
      this.updateColorRecommendations(this.selections[key]);
    }

    this.updateLivePreview();
    this._renderStepRail();
  }

  applySuggestions(type) {
    const suggs = this.smartSuggestions[type] || [];
    if (!suggs.length) return;
    const enabled = [];
    for (const fVal of suggs) {
      const cat = UNIFIED_SECTION_CATALOG.find((c) => c.featureValue === fVal);
      if (cat && !enabled.includes(cat.id)) {
        enabled.push(cat.id);
        if (!this.selections.sectionConfigs) this.selections.sectionConfigs = {};
        if (!this.selections.sectionConfigs[cat.id]) {
          this.selections.sectionConfigs[cat.id] = getDefaultSectionConfig(cat.id);
        }
      }
    }
    this.selections.enabledSections = enabled;
    this._syncFeaturesFromUnifiedSections();
    this._renderUnifiedSectionsEditor();
    this.showToast(`Suggested sections & features for ${type.split(' / ')[0]}`);
  }

  updateColorRecommendations(style) {
    document.querySelectorAll('#colorGrid .select-card').forEach((c) => c.classList.remove('recommended'));
    const key = Object.keys(this.styleColorMap).find((k) => style.includes(k));
    if (!key) return;
    const recommendedPalettes = this.styleColorMap[key];
    document.querySelectorAll('#colorGrid .select-card[data-palette]').forEach((c) => {
      if (recommendedPalettes.includes(c.dataset.palette)) c.classList.add('recommended');
    });
  }

  toggleFeature(el) {
    el.classList.toggle('selected');
    this._triggerPopAnimation(el);
    this.collectFeatures();
    this.updateLivePreview();
    this._renderStepRail();
  }

  collectFeatures() {
    this._syncFeaturesFromUnifiedSections();
    this.selections.techFeatures = [];
    document.querySelectorAll('#techFeatureGrid .feature-card.selected').forEach((el) => {
      if (el.dataset.value) this.selections.techFeatures.push(el.dataset.value);
    });
  }

  _syncTextInputs() {
    ['siteName', 'siteTagline', 'siteDescription', 'customSections', 'fontPref', 'doNotList'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) this.selections[id] = el.value.trim();
    });
  }

  syncColor(input, targetId) {
    if (/^#[0-9A-Fa-f]{6}$/.test(input.value)) {
      const target = document.getElementById(targetId);
      if (target) target.value = input.value;
    }
  }

  applyCustomColors() {
    document.querySelectorAll('#colorGrid .select-card').forEach((c) => c.classList.remove('selected'));
    const c1 = document.getElementById('customColor1')?.value || '#2563EB';
    const c2 = document.getElementById('customColor2')?.value || '#0EA5E9';
    const c3 = document.getElementById('customColor3')?.value || '#FFFFFF';
    const c4 = document.getElementById('customColor4')?.value || '#111827';
    const c5 = document.getElementById('customColor5')?.value || '#F1F5F9';

    this.selections.color = `Custom brand colors: primary ${c1}, accent ${c2}, background ${c3}, text ${c4}, secondary surface ${c5}`;
    this.selections.paletteKey = 'custom';
    this.selections.customPalette = {
      label: 'Custom Brand',
      bg: c3,
      surface: c5,
      surface2: c5,
      text: c4,
      muted: c4,
      accent: c1,
      accentFg: '#FFFFFF',
      border: 'rgba(128, 128, 128, 0.22)',
      isDark: false,
    };

    this.updateLivePreview();
    this._renderStepRail();
    this.showToast('Custom colors applied');
  }

  generatePrompt() {
    this._syncTextInputs();
    this.collectFeatures();

    const compiled = compilePromptFromSelections(this.selections, this._getStudioPromptContext());
    const outputEl = document.getElementById('promptOutput');
    if (outputEl) outputEl.textContent = compiled.text;

    this._updateQualityMeter(compiled.completenessPct);
    this.promptGenerated = true;
    this.currentStep = 7;
    this.showStep(7);
    this.renderProgress();
    this.updateLivePreview();

    const anchor = document.getElementById('wizardNextBtn') || document.getElementById('btnContinuePrompt');
    triggerPeakEndBurst(anchor);
  }

  calculateQuality() {
    const compiled = compilePromptFromSelections(this.selections, this._getStudioPromptContext());
    this._updateQualityMeter(compiled.completenessPct);
  }

  _updateQualityMeter(pct) {
    const fill = document.getElementById('qualityFill');
    const percent = document.getElementById('qualityPercent');
    if (!fill || !percent) return;
    fill.style.width = `${pct}%`;
    percent.textContent = `${pct}%`;
    if (pct < 40) {
      fill.style.background = 'var(--md-error)';
      percent.style.color = 'var(--md-error)';
    } else if (pct < 70) {
      fill.style.background = 'var(--md-warning)';
      percent.style.color = 'var(--md-warning)';
    } else {
      fill.style.background = '#F59E0B';
      percent.style.color = '#FBBF24';
    }
  }

  startOver() {
    this.promptGenerated = false;
    this.activeBlueprintId = '';
    this.activeSlotPickerId = '';
    this.selections = createEmptySelections();

    document.querySelectorAll('#promptBuilderModal .select-card.selected, #promptBuilderModal .feature-card.selected, #promptBuilderModal .pb-blueprint-card.selected').forEach((el) => {
      el.classList.remove('selected');
    });
    document.querySelectorAll('#promptBuilderModal .select-card.recommended').forEach((el) => {
      el.classList.remove('recommended');
    });
    ['siteName', 'siteTagline', 'siteDescription', 'customSections', 'fontPref'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const output = document.getElementById('promptOutput');
    if (output) {
      output.textContent = '';
      output.style.height = '380px';
    }
    this._hydrateDOMFromSelections();
    this.currentStep = 1;
    this.showStep(1);
    this.renderProgress();
    this.updateLivePreview();
    this.showToast('Prompt Studio cleared');
  }

  getPromptText() {
    const el = document.getElementById('promptOutput');
    const txt = el ? (el.innerText || el.textContent || '') : '';
    if (txt.trim()) return txt;
    return compilePromptFromSelections(this.selections, this._getStudioPromptContext()).text;
  }

  async copyPrompt() {
    const text = this.getPromptText();
    if (!text) return this.showToast('No prompt to copy');
    try {
      await navigator.clipboard.writeText(text);
      const btn = document.getElementById('copyBtn');
      if (btn) {
        btn.classList.add('copied');
        btn.innerHTML = '<i data-lucide="check" style="width:14px;height:14px"></i> Copied';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = '<i data-lucide="copy" style="width:14px;height:14px"></i> Copy';
          if (typeof window.lucide !== 'undefined') {
            try { window.lucide.createIcons({ root: btn }); } catch {}
          }
        }, 1800);
      }
      this.showToast('Prompt copied');
    } catch {
      this.showToast('Copy failed', true);
    }
  }

  downloadPrompt() {
    const text = this.getPromptText();
    if (!text) return this.showToast('No prompt to download');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const slug = (this.selections.siteName || this.selections.type || 'website')
      .split(' / ')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    link.download = `webforge-prompt-${slug || 'spec'}.txt`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 100);
    this.showToast('Prompt downloaded');
  }

  continueToChat() {
    const text = this.getPromptText().trim();
    if (!text) return this.showToast('Generate a prompt first');
    const btn = document.getElementById('btnContinuePrompt');
    triggerPeakEndBurst(btn);
    closeDialogFast(document.getElementById('promptBuilderModal'), {
      onClosed: () => this.callbacks.onContinueToChat?.(text),
    });
  }

  setPromptHeight(h) {
    const el = document.getElementById('promptOutput');
    if (el && this.promptHeights[h]) el.style.height = `${this.promptHeights[h]}px`;
    document.querySelectorAll('.resize-btn').forEach((btn) => btn.classList.remove('active'));
    document.querySelector(`.resize-btn-${h}`)?.classList.add('active');
  }

  showToast(msg, isError = false) {
    this.callbacks.onToast?.(msg, isError);
  }

  _setupResizeHandler() {
    const grip = document.getElementById('resizeBar');
    const output = document.getElementById('promptOutput');
    if (!grip || !output) return;
    let startY = 0;
    let startHeight = 0;
    let resizing = false;

    grip.addEventListener('mousedown', (e) => {
      if (e.target.closest('.resize-btns')) return;
      resizing = true;
      startY = e.clientY;
      startHeight = output.offsetHeight;
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      output.style.height = `${Math.max(150, startHeight + (e.clientY - startY))}px`;
      document.querySelectorAll('.resize-btn').forEach((b) => b.classList.remove('active'));
    });
    document.addEventListener('mouseup', () => {
      if (!resizing) return;
      resizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }
}
