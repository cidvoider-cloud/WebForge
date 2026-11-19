/**
 * WebForge Studio — Line Diff Engine
 * Deterministic Myers/LCS line-level diff and VFS comparison helpers.
 */

export function computeLineDiff(oldText = '', newText = '') {
  const a = String(oldText ?? '').replace(/\r\n/g, '\n').split('\n');
  const b = String(newText ?? '').replace(/\r\n/g, '\n').split('\n');

  // Trim identical prefix and suffix to keep LCS fast
  let prefix = 0;
  const minLen = Math.min(a.length, b.length);
  while (prefix < minLen && a[prefix] === b[prefix]) {
    prefix++;
  }

  let suffix = 0;
  while (
    suffix < minLen - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix++;
  }

  const midA = a.slice(prefix, a.length - suffix);
  const midB = b.slice(prefix, b.length - suffix);

  const ops = [];
  for (let i = 0; i < prefix; i++) {
    ops.push({ type: 'equal', oldLine: i + 1, newLine: i + 1, text: a[i] });
  }

  // Use exact LCS when middle section fits comfortably in memory; otherwise linear fallback
  if (midA.length * midB.length <= 250000) {
    const m = midA.length;
    const n = midB.length;
    const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        if (midA[i] === midB[j]) {
          dp[i][j] = dp[i + 1][j + 1] + 1;
        } else {
          dp[i][j] = dp[i + 1][j] >= dp[i][j + 1] ? dp[i + 1][j] : dp[i][j + 1];
        }
      }
    }

    let i = 0;
    let j = 0;
    let oldLine = prefix + 1;
    let newLine = prefix + 1;
    while (i < m && j < n) {
      if (midA[i] === midB[j]) {
        ops.push({ type: 'equal', oldLine, newLine, text: midA[i] });
        i++;
        j++;
        oldLine++;
        newLine++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        ops.push({ type: 'remove', oldLine, newLine: null, text: midA[i] });
        i++;
        oldLine++;
      } else {
        ops.push({ type: 'add', oldLine: null, newLine, text: midB[j] });
        j++;
        newLine++;
      }
    }
    while (i < m) {
      ops.push({ type: 'remove', oldLine, newLine: null, text: midA[i] });
      i++;
      oldLine++;
    }
    while (j < n) {
      ops.push({ type: 'add', oldLine: null, newLine, text: midB[j] });
      j++;
      newLine++;
    }
  } else {
    let oldLine = prefix + 1;
    let newLine = prefix + 1;
    for (const line of midA) {
      ops.push({ type: 'remove', oldLine: oldLine++, newLine: null, text: line });
    }
    for (const line of midB) {
      ops.push({ type: 'add', oldLine: null, newLine: newLine++, text: line });
    }
  }

  for (let k = 0; k < suffix; k++) {
    const oldLine = a.length - suffix + k + 1;
    const newLine = b.length - suffix + k + 1;
    ops.push({ type: 'equal', oldLine, newLine, text: a[a.length - suffix + k] });
  }

  let added = 0;
  let removed = 0;
  let unchanged = 0;
  for (const op of ops) {
    if (op.type === 'add') added++;
    else if (op.type === 'remove') removed++;
    else unchanged++;
  }

  return {
    ops,
    stats: { added, removed, unchanged },
    isIdentical: added === 0 && removed === 0,
  };
}

export function computeFileSetDiff(baseVfs = {}, nextVfs = {}) {
  const allPaths = Array.from(new Set([...Object.keys(baseVfs || {}), ...Object.keys(nextVfs || {})])).sort();
  const diffs = [];

  for (const path of allPaths) {
    const hasBase = Object.prototype.hasOwnProperty.call(baseVfs || {}, path);
    const hasNext = Object.prototype.hasOwnProperty.call(nextVfs || {}, path);
    const oldContent = hasBase ? baseVfs[path] : '';
    const newContent = hasNext ? nextVfs[path] : '';

    if (!hasBase && hasNext) {
      const lineCount = newContent ? newContent.replace(/\r\n/g, '\n').split('\n').length : 0;
      diffs.push({
        path,
        status: 'added',
        added: lineCount,
        removed: 0,
        oldContent: '',
        newContent,
      });
    } else if (hasBase && !hasNext) {
      const lineCount = oldContent ? oldContent.replace(/\r\n/g, '\n').split('\n').length : 0;
      diffs.push({
        path,
        status: 'deleted',
        added: 0,
        removed: lineCount,
        oldContent,
        newContent: '',
      });
    } else if (oldContent !== newContent) {
      const res = computeLineDiff(oldContent, newContent);
      diffs.push({
        path,
        status: 'modified',
        added: res.stats.added,
        removed: res.stats.removed,
        oldContent,
        newContent,
      });
    }
  }

  return diffs;
}
