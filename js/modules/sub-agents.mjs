/**
 * WebForge Studio — Parallel Sub-Agents Orchestrator
 * Splits full website builds across specialized concurrent sub-agents
 * (Design & Styles, Sections & Data, App Shell & Entry) and automatically
 * falls back to sequential one-by-one execution if the provider/model
 * rejects concurrency, rate-limits, or returns incomplete files.
 */

import { splitReasoningContent, parseStreamedVFS, getParsedFilePaths } from './stream-parser.mjs';

export function shouldUseSubAgents({ mode, userMessage, existingFiles = {}, enabled = true, isResume = false }) {
  if (!enabled || isResume) return false;
  if (mode === 'DISCUSS' || mode === 'DEBUG') return false;
  const msg = String(userMessage || '').trim();
  if (!msg) return false;

  // Always attempt sub-agents for fresh website builds
  if (mode === 'BUILD') return true;

  // Also trigger when the user explicitly requests a full rebuild / multi-page / multi-agent build
  if (/\b(build|create|redesign|rebuild|generate)\b.*\b(website|site|landing page|dashboard|store|portfolio|app)\b/i.test(msg)) {
    const fileCount = Object.keys(existingFiles || {}).length;
    return fileCount <= 3 || /\b(from scratch|complete redesign|full rebuild|sub-?agent|parallel)\b/i.test(msg);
  }
  return false;
}

export function buildSubAgentPlan({ userMessage, isHtml = false }) {
  if (isHtml) {
    return [
      {
        id: 'styles-agent',
        role: 'Design & CSS Agent',
        targetFiles: ['styles.css'],
        summary: 'Craft design tokens, typography, gradients, layout grid, and responsive styles in styles.css',
        instruction: [
          'You are the Design & CSS Sub-Agent working in parallel with the HTML & Script Sub-Agent.',
          'Output ONLY `### FILE: styles.css` containing complete, cohesive, responsive CSS (custom properties, clean typography, hover/focus states, mobile breakpoints).',
          `User website request:\n${userMessage}`,
        ].join('\n\n'),
      },
      {
        id: 'markup-agent',
        role: 'HTML & Logic Agent',
        targetFiles: ['index.html', 'script.js'],
        summary: 'Build semantic markup in index.html (linking styles.css & script.js) and interactive behavior in script.js',
        instruction: [
          'You are the HTML & Logic Sub-Agent working in parallel with the Design & CSS Sub-Agent.',
          'Output ONLY `### FILE: index.html` (which links `<link rel="stylesheet" href="styles.css">` and `<script src="script.js" defer></script>`) and `### FILE: script.js`.',
          'Use clean semantic HTML and rich, realistic domain content.',
          `User website request:\n${userMessage}`,
        ].join('\n\n'),
      },
    ];
  }

  const sharedContract = [
    'SHARED MULTI-AGENT ARCHITECTURE CONTRACT (follow strictly so parallel files integrate cleanly):',
    '- `src/index.css` defines base styles, font imports, subtle animations, and custom utility classes.',
    '- `src/components/ShowcaseSections.jsx` exports named React components: `export function FeatureShowcase({ items, onSelect })`, `export function DetailsSection()`, and `export function SiteFooter()`, plus `export const SITE_DATA = { ... }`.',
    '- `src/App.jsx` imports `{ FeatureShowcase, DetailsSection, SiteFooter, SITE_DATA } from "./components/ShowcaseSections"` (handling props cleanly) and renders the full interactive Header, Hero, interactive state/controls, FeatureShowcase, DetailsSection, and SiteFooter.',
    '- `src/main.jsx` mounts `<App />` into `#root` and imports `./index.css`.',
    '- Use only standard React hooks (`useState`, `useEffect`, `useMemo`) and `lucide-react` icons. Never import nonexistent files.',
  ].join('\n');

  return [
    {
      id: 'design-agent',
      role: 'Design System Agent',
      targetFiles: ['src/index.css'],
      summary: 'Design tokens, typography pairing, ambient background accents, and keyframes in src/index.css',
      instruction: [
        'You are the Design System Sub-Agent running in parallel.',
        sharedContract,
        'YOUR OWNERSHIP: Output ONLY `### FILE: src/index.css`.',
        'Include clean typography rules, smooth scrolling, subtle ambient surface gradients, custom scrollbar styling, and crisp micro-interaction classes.',
        `User website request:\n${userMessage}`,
      ].join('\n\n'),
    },
    {
      id: 'sections-agent',
      role: 'Sections & Content Agent',
      targetFiles: ['src/components/ShowcaseSections.jsx'],
      summary: 'Modular domain sections, interactive cards, and realistic copy in src/components/ShowcaseSections.jsx',
      instruction: [
        'You are the Sections & Content Sub-Agent running in parallel.',
        sharedContract,
        'YOUR OWNERSHIP: Output ONLY `### FILE: src/components/ShowcaseSections.jsx`.',
        'Export named `SITE_DATA`, `FeatureShowcase`, `DetailsSection`, and `SiteFooter`. Make all props optional with safe defaults so it never throws even if called with no props.',
        'Use rich, authentic domain copy (no lorem ipsum) and Tailwind CSS + lucide-react icons.',
        `User website request:\n${userMessage}`,
      ].join('\n\n'),
    },
    {
      id: 'app-agent',
      role: 'App Shell & Logic Agent',
      targetFiles: ['src/App.jsx', 'src/main.jsx'],
      summary: 'Navigation, hero experience, interactive filters/modals, and entry wiring in src/App.jsx & src/main.jsx',
      instruction: [
        'You are the App Shell & Logic Sub-Agent running in parallel.',
        sharedContract,
        'YOUR OWNERSHIP: Output ONLY `### FILE: src/App.jsx` and `### FILE: src/main.jsx`.',
        'In `src/App.jsx`, import `{ FeatureShowcase, DetailsSection, SiteFooter, SITE_DATA } from "./components/ShowcaseSections"` and compose a complete, cohesive, responsive application with real interactive state.',
        `User website request:\n${userMessage}`,
      ].join('\n\n'),
    },
  ];
}

export function isConcurrencyOrProviderRejection(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return /429|rate limit|too many requests|concurrent|slot|busy|503|502|504|overloaded|failed to fetch|network|timeout/i.test(msg);
}

async function executeSingleSubAgent({ task, provider, systemPrompt, attachments, webContext, signal, onUpdate }) {
  const startedAt = Date.now();
  onUpdate?.({ id: task.id, status: 'running', startedAt, activeFile: task.targetFiles[0] || '', files: [] });

  const promptParts = [
    webContext || '',
    task.instruction,
    'Output ONLY complete `### FILE: path` fenced code blocks for your assigned files. No extra markdown commentary.',
  ].filter(Boolean);

  const payload = attachments?.length
    ? [{ type: 'text', text: promptParts.join('\n\n') }, ...attachments.map((img) => ({ type: 'image_url', image_url: { url: img.dataUrl } }))]
    : promptParts.join('\n\n');

  let reasoning = '';
  const raw = await provider.generate(
    systemPrompt,
    payload,
    (_chunk, full, sseReasoning) => {
      const split = splitReasoningContent(full);
      reasoning = [sseReasoning, split.reasoning].filter(Boolean).join('\n\n').trim();
      const parsedPaths = getParsedFilePaths(split.content, { includePartial: true });
      onUpdate?.({
        id: task.id,
        status: 'running',
        chars: full.length,
        elapsedSec: ((Date.now() - startedAt) / 1000).toFixed(1),
        activeFile: parsedPaths[parsedPaths.length - 1] || task.targetFiles[0] || '',
        files: parsedPaths,
      });
    },
    [],
    { signal }
  );

  const split = splitReasoningContent(raw);
  const parsedFiles = parseStreamedVFS(split.content, {}, { includePartial: false });
  const fileList = Object.keys(parsedFiles);

  if (!fileList.length) {
    throw new Error(`Sub-agent "${task.role}" did not emit complete file blocks.`);
  }

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  onUpdate?.({
    id: task.id,
    status: 'done',
    elapsedSec,
    files: fileList,
    chars: raw.length,
  });

  return {
    id: task.id,
    role: task.role,
    files: parsedFiles,
    fileList,
    reasoning: [reasoning, split.reasoning].filter(Boolean).join('\n\n').trim(),
    chars: raw.length,
    elapsedSec,
  };
}

/**
 * Attempt to execute all planned sub-agents simultaneously.
 * If concurrency fails (429, local single-slot LLM, network rejection, or incomplete output),
 * automatically runs any failed/remaining sub-agents one-by-one sequentially.
 */
export async function runSubAgents({
  provider,
  systemPrompt,
  userMessage,
  attachments = [],
  webContext = '',
  isHtml = false,
  onPlan,
  onAgentUpdate,
  onFallback,
  signal,
}) {
  const plan = buildSubAgentPlan({ userMessage, isHtml });
  onPlan?.(plan);

  const mergedFiles = {};
  const reasoningParts = [];
  let totalChars = 0;
  let mode = 'parallel';
  let fallbackReason = '';

  const results = await Promise.allSettled(
    plan.map((task) =>
      executeSingleSubAgent({
        task,
        provider,
        systemPrompt,
        attachments,
        webContext,
        signal,
        onUpdate: onAgentUpdate,
      })
    )
  );

  const failedTasks = [];
  let firstErrorMsg = '';

  results.forEach((res, idx) => {
    const task = plan[idx];
    if (res.status === 'fulfilled') {
      Object.assign(mergedFiles, res.value.files);
      totalChars += res.value.chars || 0;
      if (res.value.reasoning) {
        reasoningParts.push(`[${task.role}]\n${res.value.reasoning}`);
      }
    } else {
      if (res.reason?.name === 'AbortError' || signal?.aborted) {
        throw res.reason;
      }
      if (!firstErrorMsg) firstErrorMsg = res.reason?.message || 'Parallel execution rejected by provider';
      failedTasks.push(task);
      onAgentUpdate?.({
        id: task.id,
        status: 'retrying',
        error: res.reason?.message || 'Retrying sequentially…',
      });
    }
  });

  // Automatic graceful fallback: run failed tasks one-by-one sequentially
  if (failedTasks.length > 0) {
    mode = 'sequential-fallback';
    fallbackReason = isConcurrencyOrProviderRejection(firstErrorMsg)
      ? `Provider rejected parallel calls (${firstErrorMsg.slice(0, 90)}) — switched to sequential one-by-one execution.`
      : `Parallel step needed retry (${firstErrorMsg.slice(0, 90)}) — running remaining agents one by one.`;

    onFallback?.({ mode, reason: fallbackReason, remaining: failedTasks.map((t) => t.role) });

    for (const task of failedTasks) {
      if (signal?.aborted) {
        const abortErr = new Error('Aborted');
        abortErr.name = 'AbortError';
        throw abortErr;
      }
      try {
        const seqRes = await executeSingleSubAgent({
          task,
          provider,
          systemPrompt,
          attachments,
          webContext,
          signal,
          onUpdate: onAgentUpdate,
        });
        Object.assign(mergedFiles, seqRes.files);
        totalChars += seqRes.chars || 0;
        if (seqRes.reasoning) {
          reasoningParts.push(`[${task.role} · sequential]\n${seqRes.reasoning}`);
        }
      } catch (seqErr) {
        if (seqErr?.name === 'AbortError' || signal?.aborted) throw seqErr;
        onAgentUpdate?.({
          id: task.id,
          status: 'failed',
          error: seqErr?.message || 'Sub-agent failed',
        });
      }
    }
  }

  // Validate that an entry file was produced; otherwise tell caller to fall back to single-agent build
  const hasEntry = isHtml
    ? Boolean(mergedFiles['index.html'])
    : Boolean(mergedFiles['src/App.jsx'] || mergedFiles['src/App.tsx']);

  if (!hasEntry) {
    return {
      ok: false,
      mode: 'single-fallback',
      files: mergedFiles,
      plan,
      reasoning: reasoningParts.join('\n\n'),
      totalChars,
      fallbackReason: fallbackReason || 'Sub-agents did not produce a complete entry file — switching to single-agent build.',
    };
  }

  return {
    ok: true,
    mode,
    files: mergedFiles,
    plan,
    reasoning: reasoningParts.join('\n\n'),
    totalChars,
    fallbackReason,
  };
}
