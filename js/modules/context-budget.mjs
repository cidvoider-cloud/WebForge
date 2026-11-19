/**
 * WebForge Studio — Context Budgeter, Multimodal Formatter & Static Analyzer
 */

export function estimateTokens(text = '') {
  const len = String(text || '').length;
  if (!len) return 0;
  return Math.ceil(len / 3.8);
}

export function estimateContextBudget({
  systemPrompt = '',
  history = [],
  vfsContext = '',
  userPrompt = '',
  attachments = [],
  contextWindow = 32768,
} = {}) {
  const systemTokens = estimateTokens(systemPrompt);
  const historyTokens = (history || []).reduce((sum, m) => sum + estimateTokens(typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '')), 0);
  const filesTokens = estimateTokens(vfsContext);
  const promptTokens = estimateTokens(userPrompt);
  const imageTokens = (attachments || []).length * 765;
  const total = systemTokens + historyTokens + filesTokens + promptTokens + imageTokens;
  const limit = Math.max(2048, Number(contextWindow) || 32768);
  const ratio = Math.min(1, total / limit);

  return {
    total,
    limit,
    percent: Math.round((total / limit) * 100),
    ratio,
    level: ratio >= 0.9 ? 'critical' : ratio >= 0.7 ? 'warn' : 'ok',
    breakdown: {
      system: systemTokens,
      history: historyTokens,
      files: filesTokens,
      prompt: promptTokens,
      images: imageTokens,
    },
  };
}

export function isHtmlVfs(vfs = {}) {
  return !!(
    vfs &&
    vfs['index.html'] &&
    !vfs['src/App.jsx'] &&
    !vfs['src/App.tsx'] &&
    !vfs['src/main.jsx'] &&
    !vfs['src/main.tsx']
  );
}

export function classifyRequestMode(message, hasUserAskedBefore, activeErrors = []) {
  if (activeErrors.length || /\b(error|bug|broken|fix|not working|crash|compile|babel|runtime)\b/i.test(message)) {
    return 'DEBUG';
  }
  if (!hasUserAskedBefore) return 'BUILD';
  if (/\b(add|change|update|remove|delete|fix|make|create|build|implement|replace|edit)\b/i.test(message)) {
    return 'EDIT';
  }
  return 'DISCUSS';
}

export function buildModeInstructions(mode) {
  const common = 'Never use placeholders, comments for brevity, or partial snippets. Never rewrite unchanged files. Keep imports valid.';
  if (mode === 'BUILD') {
    return `Mode: BUILD. Create the full initial app from the provided boilerplate. Output all required files. ${common}`;
  }
  if (mode === 'DEBUG') {
    return `Mode: DEBUG. Fix the root cause using the smallest targeted patch. Prefer existing files and output only complete changed/new files. ${common}`;
  }
  if (mode === 'EDIT') {
    return `Mode: EDIT. Act as a careful code editor. Make the smallest targeted patch. Output only complete changed/new files. Do not regenerate the whole app or reset layout. ${common}`;
  }
  return `Mode: DISCUSS. If no code change is clearly needed, answer briefly without file blocks. If a code change is needed, use EDIT rules. ${common}`;
}

export function formatFileContext(entries) {
  return entries.map(([path, code]) => `### FILE: ${path}\n\`\`\`\n${code}\n\`\`\``).join('\n\n');
}

export function buildFileContext({ vfs = {}, message = '', mode = 'BUILD', activeFilePath = '', pinnedFiles = [] } = {}) {
  const entries = Object.entries(vfs);
  const pinnedSet = new Set((pinnedFiles || []).filter((p) => vfs[p] !== undefined));

  if (mode === 'BUILD' || entries.length <= 5) {
    // Keep pinned files first so local models see them near the top of context
    const sorted = [...entries].sort(([a], [b]) => {
      const pa = pinnedSet.has(a) ? 0 : 1;
      const pb = pinnedSet.has(b) ? 0 : 1;
      return pa - pb;
    });
    return {
      contextText: formatFileContext(sorted),
      includedPaths: sorted.map(([p]) => p),
    };
  }

  const important = new Set([...pinnedSet]);
  [activeFilePath, 'src/App.jsx', 'src/App.tsx', 'src/main.jsx', 'src/main.tsx', 'src/index.css', 'index.html'].forEach((p) => {
    if (p && vfs[p] !== undefined) important.add(p);
  });

  const terms = new Set(String(message).toLowerCase().match(/[a-z0-9_-]{3,}/g) || []);
  for (const path of Object.keys(vfs)) {
    const haystack = path.toLowerCase();
    for (const term of terms) {
      if (haystack.includes(term)) important.add(path);
    }
  }

  const selected = entries
    .filter(([path]) => important.has(path))
    .sort(([a], [b]) => (pinnedSet.has(a) ? 0 : 1) - (pinnedSet.has(b) ? 0 : 1));
  const chosen = selected.length ? selected : entries.slice(0, 5);
  return {
    contextText: formatFileContext(chosen),
    includedPaths: chosen.map(([p]) => p),
  };
}

export function buildChatMessageContent(text, attachments = []) {
  const cleanText = String(text || '');
  const imgs = (attachments || []).filter((a) => a && a.dataUrl);
  if (!imgs.length) return cleanText;
  return [
    { type: 'text', text: cleanText },
    ...imgs.map((img) => ({
      type: 'image_url',
      image_url: { url: img.dataUrl },
    })),
  ];
}

export function resolveVfsImport(fromPath, spec) {
  if (String(spec).startsWith('@/')) {
    return 'src/' + String(spec).slice(2);
  }
  const parts = String(fromPath || '').split('/');
  parts.pop();
  const segs = String(spec).split('/');
  for (const seg of segs) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

export function collectStaticProjectIssues(vfs = {}) {
  const issues = [];
  if (isHtmlVfs(vfs)) {
    if (!vfs['index.html']) issues.push('Missing required file: index.html');
    return issues;
  }

  if (!vfs['src/App.jsx'] && !vfs['src/App.tsx']) issues.push('Missing required file: src/App.jsx');
  if (!vfs['src/main.jsx'] && !vfs['src/main.tsx'] && !vfs['src/App.jsx'] && !vfs['src/App.tsx']) {
    issues.push('Missing required file: src/main.jsx');
  }

  const importRe = /import\s+(?:[\s\S]*?)\s+from\s+['"]((?:\.|@\/)[^'"]+)['"]/g;
  const exists = (resolved) => {
    const candidates = [
      resolved,
      resolved + '.tsx',
      resolved + '.ts',
      resolved + '.jsx',
      resolved + '.js',
      resolved + '.json',
      resolved + '.css',
      resolved + '/index.tsx',
      resolved + '/index.ts',
      resolved + '/index.jsx',
      resolved + '/index.js',
    ];
    return candidates.some((c) => vfs[c] !== undefined);
  };

  for (const [path, code] of Object.entries(vfs)) {
    if (!/\.(jsx?|tsx?)$/i.test(path)) continue;
    let match;
    const src = String(code || '');
    importRe.lastIndex = 0;
    while ((match = importRe.exec(src)) !== null) {
      const resolved = resolveVfsImport(path, match[1]);
      if (resolved && !exists(resolved)) {
        issues.push(`Broken import in ${path}: "${match[1]}" (file not found)`);
      }
    }
  }
  return [...new Set(issues)].slice(0, 12);
}
