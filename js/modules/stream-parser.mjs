/**
 * WebForge Studio — Stream, Reasoning & VFS File Parser
 * Separates <think> / reasoning traces from code output and parses fenced & <wf-*> ops.
 */

export function normalizeGeneratedFileContent(content) {
  return String(content || '').replace(/^\r?\n/, '').replace(/\r?\n$/, '');
}

export function sanitizeVfsPath(path) {
  let clean = String(path || '')
    .trim()
    .replace(/^[`'"]+|[`'"]+$/g, '')
    .replace(/^\*\*|\*\*$/g, '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '');
  if (!clean || clean.startsWith('/') || clean.includes('..') || /[<>:"|?*]/.test(clean)) return '';
  return clean;
}

export function stripOptionalFence(content) {
  const text = String(content).replace(/^\r?\n/, '').replace(/\r?\n$/, '');
  const match = text.match(/^```[^\n]*\n([\s\S]*?)\n```\s*$/);
  return match ? match[1] : text;
}

/**
 * Separates embedded <think>...</think> or <reasoning>...</reasoning> blocks from streamed text.
 * Supports unclosed blocks while actively streaming.
 */
export function splitReasoningContent(rawText) {
  const text = String(rawText || '');
  const thinkingParts = [];
  let cleaned = '';
  let cursor = 0;
  let isThinking = false;

  const openRe = /<(think|reasoning)\b[^>]*>/gi;
  let match;
  while ((match = openRe.exec(text)) !== null) {
    if (match.index < cursor) continue;
    cleaned += text.slice(cursor, match.index);
    const tagName = match[1].toLowerCase();
    const closeRe = new RegExp(`</${tagName}>`, 'i');
    const afterOpen = match.index + match[0].length;
    const rest = text.slice(afterOpen);
    const closeMatch = closeRe.exec(rest);

    if (closeMatch) {
      const thought = rest.slice(0, closeMatch.index).trim();
      if (thought) thinkingParts.push(thought);
      cursor = afterOpen + closeMatch.index + closeMatch[0].length;
      openRe.lastIndex = cursor;
    } else {
      const partialThought = rest.trim();
      if (partialThought) thinkingParts.push(partialThought);
      isThinking = true;
      cursor = text.length;
      break;
    }
  }

  if (cursor < text.length) {
    cleaned += text.slice(cursor);
  }

  return {
    reasoning: thinkingParts.join('\n\n'),
    content: cleaned.trimStart(),
    isThinking,
  };
}

export function parseStructuredFileOps(rawText, opts = {}) {
  const includePartial = opts.includePartial !== false;
  const codeText = splitReasoningContent(rawText).content;
  const ops = { writes: {}, deletes: [], renames: [] };

  const writeRe = /<wf-write\s+path=["']([^"']+)["']\s*>([\s\S]*?)<\/wf-write>/gi;
  let match;
  while ((match = writeRe.exec(codeText)) !== null) {
    const path = sanitizeVfsPath(match[1]);
    if (!path) continue;
    ops.writes[path] = normalizeGeneratedFileContent(stripOptionalFence(match[2]));
  }

  if (includePartial) {
    const partialRe = /<wf-write\s+path=["']([^"']+)["']\s*>([\s\S]*)$/i;
    const partial = codeText.match(partialRe);
    if (partial && !codeText.slice(partial.index).includes('</wf-write>')) {
      const path = sanitizeVfsPath(partial[1]);
      if (path) ops.writes[path] = normalizeGeneratedFileContent(stripOptionalFence(partial[2]));
    }
  }

  const deleteRe = /<wf-delete\s+path=["']([^"']+)["']\s*\/?>(?:<\/wf-delete>)?/gi;
  while ((match = deleteRe.exec(codeText)) !== null) {
    const path = sanitizeVfsPath(match[1]);
    if (path) ops.deletes.push(path);
  }

  const renameRe = /<wf-rename\s+from=["']([^"']+)["']\s+to=["']([^"']+)["']\s*\/?>(?:<\/wf-rename>)?/gi;
  while ((match = renameRe.exec(codeText)) !== null) {
    const from = sanitizeVfsPath(match[1]);
    const to = sanitizeVfsPath(match[2]);
    if (from && to) ops.renames.push({ from, to });
  }

  return ops;
}

export function applyStructuredFileOps(vfs, rawText) {
  const ops = parseStructuredFileOps(rawText, { includePartial: false });
  for (const [path, content] of Object.entries(ops.writes)) {
    vfs[path] = content;
  }
  for (const { from, to } of ops.renames) {
    if (vfs[from] !== undefined && vfs[to] === undefined) vfs[to] = vfs[from];
    delete vfs[from];
  }
  for (const path of ops.deletes) {
    delete vfs[path];
  }
  return vfs;
}

export function extractMarkdownFileBlocks(rawText, opts = {}) {
  const includePartial = opts.includePartial !== false;
  const codeText = splitReasoningContent(rawText).content;
  const normalized = String(codeText || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const headerMatch = lines[i].match(/^###\s*FILE:\s*(.+?)\s*$/);
    if (!headerMatch) {
      i++;
      continue;
    }
    const path = sanitizeVfsPath(headerMatch[1]);
    i++;

    let openIdx = -1;
    let nextHeaderIdx = lines.length;
    for (let j = i; j < lines.length; j++) {
      if (/^###\s*FILE:\s*/.test(lines[j])) {
        nextHeaderIdx = j;
        break;
      }
      if (/^\s*```/.test(lines[j])) {
        openIdx = j;
        break;
      }
    }
    if (openIdx === -1 || !path) {
      i = nextHeaderIdx;
      continue;
    }

    let sectionEndIdx = lines.length;
    for (let j = openIdx + 1; j < lines.length; j++) {
      if (/^###\s*FILE:\s*/.test(lines[j])) {
        sectionEndIdx = j;
        break;
      }
    }

    let closeIdx = -1;
    for (let j = sectionEndIdx - 1; j > openIdx; j--) {
      if (/^\s*```\s*$/.test(lines[j])) {
        closeIdx = j;
        break;
      }
    }

    if (closeIdx !== -1) {
      blocks.push({
        path,
        content: normalizeGeneratedFileContent(lines.slice(openIdx + 1, closeIdx).join('\n')),
        complete: true,
      });
    } else if (includePartial) {
      blocks.push({
        path,
        content: normalizeGeneratedFileContent(lines.slice(openIdx + 1, sectionEndIdx).join('\n')),
        complete: false,
      });
    }
    i = sectionEndIdx;
  }

  return blocks;
}

export function getParsedFilePaths(rawText, opts = {}) {
  const structured = parseStructuredFileOps(rawText, opts);
  const paths = [
    ...Object.keys(structured.writes),
    ...structured.deletes,
    ...structured.renames.map((r) => `${r.from} -> ${r.to}`),
  ];
  const mdBlocks = extractMarkdownFileBlocks(rawText, opts);
  for (const b of mdBlocks) paths.push(b.path);
  return [...new Set(paths)];
}

export function parseStreamedVFS(rawText, currentVfs = {}, opts = {}) {
  const newVfs = { ...currentVfs };
  const structured = parseStructuredFileOps(rawText, opts);
  Object.assign(newVfs, structured.writes);
  const mdBlocks = extractMarkdownFileBlocks(rawText, opts);
  for (const b of mdBlocks) {
    newVfs[b.path] = b.content;
  }
  return newVfs;
}

export function detectActiveWritingFile(text) {
  const src = splitReasoningContent(text).content;
  let lastPath = null;
  let lastIndex = -1;

  const mdRe = /(?:^|\n)###\s*FILE:\s*([^\n]+)/g;
  let m;
  while ((m = mdRe.exec(src)) !== null) {
    if (m.index >= lastIndex) {
      const p = sanitizeVfsPath(m[1]);
      if (p) {
        lastIndex = m.index;
        lastPath = p;
      }
    }
  }

  const wfRe = /<wf-write\s+path=["']([^"']+)["']\s*>/gi;
  while ((m = wfRe.exec(src)) !== null) {
    if (m.index >= lastIndex) {
      const p = sanitizeVfsPath(m[1]);
      if (p) {
        lastIndex = m.index;
        lastPath = p;
      }
    }
  }

  return lastPath;
}
