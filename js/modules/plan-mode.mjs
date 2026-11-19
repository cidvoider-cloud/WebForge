/**
 * WebForge Studio — Plan Mode Engine
 *
 * Pure helpers for WebForge's two-phase Plan Mode:
 *   1. Directs the AI to produce an editable, structured architecture plan (no code fences)
 *   2. Generates a rich editable draft plan when running offline / without a configured model
 *   3. Wraps the user's edited & approved plan into a build execution prompt
 *   4. Safely formats Markdown plans into clean semantic HTML for the in-chat Plan Card
 */

/**
 * Builds the system directive used when Plan Mode is toggled ON.
 * Explicitly instructs the LLM to propose an implementation plan only —
 * never emitting ### FILE: code blocks until the user clicks "Approve & Build".
 */
export function buildPlanModeSystemDirective(baseSystemPrompt = '') {
  const planRules = [
    '=== PLAN MODE ACTIVE (DO NOT WRITE CODE FILES YET) ===',
    'The user enabled Plan Mode to review and edit your blueprint before any code is generated.',
    'Respond ONLY with a concise, high-signal Markdown implementation plan using these exact headings:',
    '## Goal',
    '1-2 sentences summarizing what will be built and for whom.',
    '## Layout & Key Sections',
    '- Bullet list of the major views, navigation structure, and content hierarchy.',
    '## Visual System & Tokens',
    '- Palette (canvas, surface, primary accent, contrast posture), display/body fonts, and motion feel.',
    '## Interactive States & Flows',
    '- Key user interactions, forms, filters, modals, and empty/error states.',
    '## Planned Files',
    '- Bullet list of the React/CSS files to create or update with 1-line purpose each.',
    '',
    'CRITICAL RULES FOR PLAN MODE:',
    '- NEVER output ### FILE: blocks, fenced JSX/TSX/CSS code blocks, or raw source code.',
    '- Keep the plan crisp, scannable, and easy for the user to edit inline before clicking Approve & Build.',
  ].join('\n');

  return baseSystemPrompt
    ? `${baseSystemPrompt}\n\n${planRules}`
    : planRules;
}

/**
 * Builds a structured editable draft plan when no live LLM model/API key is
 * configured yet, so users can immediately inspect, customize, and save their plan.
 */
export function buildOfflineDraftPlan(userPrompt = '', activeUiLibName = '') {
  const cleanPrompt = String(userPrompt || '').trim() || 'Build a modern interactive web application';
  const uiNote = activeUiLibName && activeUiLibName !== 'Off'
    ? `Use the active **${activeUiLibName}** design system tokens and component patterns.`
    : 'Use a clean obsidian & warm amber-copper visual hierarchy with accessible light/dark surfaces.';

  return [
    '## Goal',
    `Design and build an interactive React web application for: "${cleanPrompt}".`,
    '',
    '## Layout & Key Sections',
    '- Top navigation header with brand mark, primary section links, and single clear primary CTA',
    '- Full-bleed hero section with focused headline, supporting copy, and interactive primary action',
    '- Core interactive workspace / feature showcase tailored to the prompt requirements',
    '- Responsive detail grid or interactive controls section with live state updates',
    '- Clean footer with secondary links and zero visual clutter',
    '',
    '## Visual System & Tokens',
    `- ${uiNote}`,
    '- Typography: Plus Jakarta Sans (display headings), DM Sans (UI copy), JetBrains Mono (tabular figures)',
    '- 60-30-10 color balance with WCAG AA contrast and smooth 180ms micro-interactions',
    '',
    '## Interactive States & Flows',
    '- Real client-side state transitions for navigation tabs, search/filtering, and primary actions',
    '- Explicit empty, loading, and validation feedback states',
    '- Full keyboard accessibility and responsive mobile layout reflow',
    '',
    '## Planned Files',
    '- `src/App.jsx` — Main application layout, state management, and interactive flows',
    '- `src/components/Header.jsx` — Single-row top navigation bar and primary CTA',
    '- `src/components/HeroSection.jsx` — Focused hero presentation and primary user action',
    '- `src/index.css` — Theme custom properties, typography, and motion utilities',
  ].join('\n');
}

/**
 * Packages the user's original request together with their reviewed/edited plan
 * when they click "Approve & Build".
 */
export function buildApprovedPlanExecutionPrompt(originalPrompt = '', approvedPlan = '') {
  const orig = String(originalPrompt || '').trim();
  const plan = String(approvedPlan || '').trim();
  return [
    'The user has reviewed and APPROVED the following implementation plan. Now execute the full build and output complete working files.',
    orig ? `Original User Request:\n${orig}` : '',
    `Approved Implementation Plan:\n${plan}`,
    'Implement every section, visual token, and interactive state described in the approved plan with complete, working handlers.',
  ].filter(Boolean).join('\n\n');
}

function defaultEscapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Converts a Markdown implementation plan into clean, XSS-safe semantic HTML
 * for rendering inside the in-chat Plan Card.
 */
export function formatPlanMarkdownToHtml(markdown = '', escapeFn = defaultEscapeHtml) {
  const esc = typeof escapeFn === 'function' ? escapeFn : defaultEscapeHtml;
  const formatInline = (text) => esc(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');

  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      closeList();
      html.push(`<h4 class="plan-md-h4">${formatInline(h3[1])}</h4>`);
      continue;
    }
    const h2 = line.match(/^#{1,2}\s+(.+)$/);
    if (h2) {
      closeList();
      html.push(`<h3 class="plan-md-h3">${formatInline(h2[1])}</h3>`);
      continue;
    }
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
    if (bullet) {
      if (!inList) {
        html.push('<ul class="plan-md-list">');
        inList = true;
      }
      html.push(`<li>${formatInline(bullet[1])}</li>`);
      continue;
    }
    closeList();
    html.push(`<p class="plan-md-p">${formatInline(line)}</p>`);
  }
  closeList();
  return html.join('\n') || '<p class="plan-md-p">Preparing plan…</p>';
}
