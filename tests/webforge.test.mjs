import test from 'node:test';
import assert from 'node:assert/strict';

// Lightweight localStorage polyfill for Node test environment
const store = new Map();
globalThis.localStorage = {
  get length() {
    return store.size;
  },
  key(i) {
    return Array.from(store.keys())[i] ?? null;
  },
  getItem(k) {
    return store.has(k) ? store.get(k) : null;
  },
  setItem(k, v) {
    store.set(String(k), String(v));
  },
  removeItem(k) {
    store.delete(k);
  },
  clear() {
    store.clear();
  },
};

const { AIProvider } = await import('../js/modules/providers.mjs');
const { SkillManager, DEFAULT_BASE_SYSTEM_PROMPT } = await import('../js/modules/skills.mjs');
const {
  splitReasoningContent,
  sanitizeVfsPath,
  parseStructuredFileOps,
  applyStructuredFileOps,
  extractMarkdownFileBlocks,
  getParsedFilePaths,
  parseStreamedVFS,
  detectActiveWritingFile,
} = await import('../js/modules/stream-parser.mjs');
const { computeLineDiff, computeFileSetDiff } = await import('../js/modules/diff.mjs');
const {
  estimateContextBudget,
  classifyRequestMode,
  buildFileContext,
  buildChatMessageContent,
  collectStaticProjectIssues,
} = await import('../js/modules/context-budget.mjs');
const {
  listCheckpoints,
  createCheckpoint,
  getCheckpoint,
  deleteCheckpoint,
} = await import('../js/modules/checkpoints.mjs');
const { createZipBlob, buildProjectExportFiles } = await import('../js/modules/zip-export.mjs');
const { escapeHtml } = await import('../js/modules/storage.mjs');
const {
  unwrapDuckDuckGoUrl,
  parseDuckDuckGoHtml,
  parseDuckDuckGoLite,
  dedupeSearchResults,
  parseGitHubSkillTarget,
  extractFrontmatter,
  rankRepoSkillPaths,
} = await import('../tools/search-engine.mjs');
const {
  extractSearchQuery,
  shouldAutoRunWebSearch,
  formatSearchResultsForPrompt,
} = await import('../js/modules/web-search.mjs');
const {
  shouldUseSubAgents,
  buildSubAgentPlan,
  isConcurrencyOrProviderRejection,
  runSubAgents,
} = await import('../js/modules/sub-agents.mjs');
const { parseGitHubInput, extractSkillFrontmatter } = await import('../js/modules/skills.mjs');

test('AIProvider respects temperature=0, topP, contextWindow, and resets stale models on provider change', () => {
  localStorage.clear();
  const p = new AIProvider();
  p.configure({ type: 'openrouter', model: 'anthropic/claude-3.5-sonnet', temperature: 0, topP: 0.85, contextWindow: 65536 });
  assert.equal(p.temperature, 0);
  assert.equal(p.topP, 0.85);
  assert.equal(p.contextWindow, 65536);
  assert.equal(p.model, 'anthropic/claude-3.5-sonnet');

  p.configure({ type: 'ollama' });
  assert.equal(p.type, 'ollama');
  assert.equal(p.model, '');
  assert.deepEqual(p.models, []);
  assert.match(p._formatConnectionError(new TypeError('Failed to fetch')), /OLLAMA_ORIGINS/);
});

test('AIProvider.parseSseLine & _readStream separate content and reasoning deltas', async () => {
  localStorage.clear();
  const p = new AIProvider();
  const rLine = p.parseSseLine('data: {"choices":[{"delta":{"reasoning_content":"Inspecting props"}}]}');
  assert.deepEqual(rLine, { contentDelta: '', reasoningDelta: 'Inspecting props' });

  const cLine = p.parseSseLine('data: {"choices":[{"delta":{"content":"export default function App(){}"}}]}');
  assert.deepEqual(cLine, { contentDelta: 'export default function App(){}', reasoningDelta: '' });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode('data: {"choices":[{"delta":{"thinking":"Plan step 1"}}]}\n'));
      controller.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"### FILE: src/App.jsx\\n"}}]}\n'));
      controller.enqueue(enc.encode('data: [DONE]\n'));
      controller.close();
    },
  });

  let observedReasoning = '';
  const result = await p._readStream(stream, (_chunk, _full, reasoning) => {
    observedReasoning = reasoning;
  });
  assert.equal(result, '### FILE: src/App.jsx\n');
  assert.equal(observedReasoning, 'Plan step 1');
});

test('SkillManager manages base instructions, project overrides, toggles, and stats', () => {
  localStorage.clear();
  const sm = new SkillManager();
  assert.ok(sm.getSystemPrompt().includes('You are WebForge'));

  sm.setBaseInstructions('Custom base prompt');
  assert.equal(sm.baseInstructions, 'Custom base prompt');
  const merged = sm.getSystemPrompt('Use cobalt blue palette');
  assert.ok(merged.includes('Custom base prompt'));
  assert.ok(merged.includes('# Project-Specific Instructions\nUse cobalt blue palette'));

  const stats = sm.getCompiledStats('Use cobalt blue palette');
  assert.ok(stats.totalTokens > stats.baseTokens);
  assert.equal(stats.activeCount, sm.getActiveCount());

  const custom = sm.importFromText('Strict A11y', 'Accessibility rules', 'Always set aria-label.');
  assert.ok(sm.skills.some((s) => s.id === custom.id));
  assert.equal(sm.delete(custom.id), true);
  assert.equal(sm.resetBaseInstructions(), DEFAULT_BASE_SYSTEM_PROMPT);
});

test('splitReasoningContent handles closed and unclosed streaming think tags', () => {
  const closed = splitReasoningContent('<think>\nstep 1\nstep 2\n</think>\n### FILE: src/App.jsx\n```jsx\ncode\n```');
  assert.equal(closed.isThinking, false);
  assert.equal(closed.reasoning, 'step 1\nstep 2');
  assert.match(closed.content, /^### FILE: src\/App\.jsx/);

  const streaming = splitReasoningContent('<reasoning>Still planning...');
  assert.equal(streaming.isThinking, true);
  assert.equal(streaming.reasoning, 'Still planning...');
  assert.equal(streaming.content, '');
});

test('stream-parser extracts fenced markdown blocks with nested backticks, <wf-*> ops, and ignores think blocks', () => {
  const raw = [
    '<think>',
    '### FILE: should-not-parse.js',
    '```js',
    'ignored()',
    '```',
    '</think>',
    '',
    '### FILE: README.md',
    '```markdown',
    '# Title',
    '```bash',
    'npm run dev',
    '```',
    '```',
    '',
    '<wf-write path="src/util.js">',
    'export const ok = true;',
    '</wf-write>',
    '<wf-delete path="src/old.js" />',
  ].join('\n');

  const md = extractMarkdownFileBlocks(raw, { includePartial: false });
  assert.equal(md.length, 1);
  assert.equal(md[0].path, 'README.md');
  assert.ok(md[0].content.includes('npm run dev'));

  const vfs = parseStreamedVFS(raw, { 'src/old.js': 'legacy' }, { includePartial: false });
  applyStructuredFileOps(vfs, raw);
  assert.equal(vfs['should-not-parse.js'], undefined);
  assert.equal(vfs['src/util.js'], 'export const ok = true;');
  assert.equal(vfs['src/old.js'], undefined);

  assert.equal(sanitizeVfsPath('../etc/passwd'), '');
  assert.equal(sanitizeVfsPath('./src/App.jsx'), 'src/App.jsx');
  assert.equal(detectActiveWritingFile(raw), 'src/util.js');
  assert.ok(getParsedFilePaths(raw, { includePartial: false }).includes('README.md'));
});

test('computeLineDiff and computeFileSetDiff compute exact line additions, removals, and file statuses', () => {
  const same = computeLineDiff('a\nb', 'a\nb');
  assert.equal(same.isIdentical, true);
  assert.deepEqual(same.stats, { added: 0, removed: 0, unchanged: 2 });

  const changed = computeLineDiff('line1\nline2\nline3', 'line1\nline2-edited\nline3\nline4');
  assert.equal(changed.isIdentical, false);
  assert.deepEqual(changed.stats, { added: 2, removed: 1, unchanged: 2 });

  const setDiff = computeFileSetDiff(
    { 'src/App.jsx': 'a\nb', 'src/Old.jsx': 'gone' },
    { 'src/App.jsx': 'a\nc', 'src/New.jsx': 'hello\nworld' }
  );
  assert.equal(setDiff.length, 3);
  assert.deepEqual(
    setDiff.map((d) => [d.path, d.status, d.added, d.removed]),
    [
      ['src/App.jsx', 'modified', 1, 1],
      ['src/New.jsx', 'added', 2, 0],
      ['src/Old.jsx', 'deleted', 0, 1],
    ]
  );
});

test('context-budget estimates tokens, prioritizes pinned files, builds multimodal payloads, and runs static checks', () => {
  const budget = estimateContextBudget({
    systemPrompt: 'a'.repeat(380),
    userPrompt: 'b'.repeat(380),
    attachments: [{ id: '1', dataUrl: 'data:image/png;base64,AAA' }],
    contextWindow: 2048,
  });
  assert.equal(budget.breakdown.system, 100);
  assert.equal(budget.breakdown.prompt, 100);
  assert.equal(budget.breakdown.images, 765);
  assert.equal(budget.level, 'ok');

  const high = estimateContextBudget({ userPrompt: 'x'.repeat(7600), contextWindow: 2048 });
  assert.equal(high.level, 'critical');

  const vfs = {
    'src/App.jsx': 'app',
    'src/components/A.jsx': 'a',
    'src/components/B.jsx': 'b',
    'src/components/C.jsx': 'c',
    'src/components/D.jsx': 'd',
    'src/SecretTheme.css': 'pinned-css',
  };
  const ctx = buildFileContext({
    vfs,
    message: 'update button',
    mode: 'EDIT',
    activeFilePath: 'src/App.jsx',
    pinnedFiles: ['src/SecretTheme.css'],
  });
  assert.equal(ctx.includedPaths[0], 'src/SecretTheme.css');

  const multi = buildChatMessageContent('Match mockup', [{ name: 'm.png', dataUrl: 'data:image/png;base64,XYZ' }]);
  assert.ok(Array.isArray(multi));
  assert.equal(multi[0].type, 'text');
  assert.equal(multi[1].type, 'image_url');

  assert.equal(classifyRequestMode('Please fix compile crash', true, []), 'DEBUG');
  assert.equal(classifyRequestMode('Why does Tailwind work like this?', true, []), 'DISCUSS');

  const issues = collectStaticProjectIssues({
    'src/App.tsx': "import Missing from '@/components/Nope'; export default function App(){}",
  });
  assert.equal(issues.length, 1);
  assert.match(issues[0], /Broken import in src\/App\.tsx/);
});

test('checkpoints store snapshots, compute changedPaths, retrieve, and delete cleanly', () => {
  localStorage.clear();
  const cp1 = createCheckpoint({
    projectId: 'p1',
    label: 'Initial',
    files: { 'src/App.jsx': 'v1' },
    type: 'manual',
  });
  assert.ok(cp1.id.startsWith('cp-'));
  const cp2 = createCheckpoint({
    projectId: 'p1',
    label: 'Added Hero',
    files: { 'src/App.jsx': 'v2', 'src/Hero.jsx': 'hero' },
    prevFiles: cp1.files,
    type: 'auto',
  });
  assert.deepEqual(cp2.changedPaths, ['src/App.jsx', 'src/Hero.jsx']);
  assert.equal(listCheckpoints('p1').length, 2);
  assert.equal(getCheckpoint('p1', cp1.id).files['src/App.jsx'], 'v1');
  assert.equal(deleteCheckpoint('p1', cp2.id), true);
  assert.equal(listCheckpoints('p1').length, 1);
});

test('zip-export builds valid PK zip headers & project boilerplate', () => {
  const { safeSlug, files } = buildProjectExportFiles('Cobalt Studio App', {
    'src/App.jsx': 'export default function App() { return null; }',
  }, '<!DOCTYPE html></html>');
  assert.equal(safeSlug, 'cobalt-studio-app');
  assert.ok(files.some((f) => f.name === 'package.json'));
  assert.ok(files.some((f) => f.name === 'vite.config.js'));
  assert.ok(files.some((f) => f.name === 'dist/index.html'));
  const blob = createZipBlob(files);
  assert.ok(blob.size > 200);
  assert.equal(escapeHtml('<script>"test"</script>'), '&lt;script&gt;&quot;test&quot;&lt;/script&gt;');
});

test('search-engine parses DuckDuckGo HTML/Lite, unwraps redirects, and ranks GitHub SKILL.md paths', () => {
  const unwrapped = unwrapDuckDuckGoUrl('//duckduckgo.com/l/?uddg=https%3A%2F%2Ftailwindcss.com%2Fdocs&rut=abc');
  assert.equal(unwrapped, 'https://tailwindcss.com/docs');

  const htmlSample = `
    <div class="result">
      <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Freact.dev%2F">React &amp; Docs</a>
      <a class="result__snippet">The library for web and native UIs.</a>
    </div>
  `;
  const parsed = parseDuckDuckGoHtml(htmlSample, 5);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].title, 'React & Docs');
  assert.equal(parsed[0].url, 'https://react.dev/');

  const liteSample = `<a class="result-link" href="https://vitejs.dev/">Vite</a><td class="result-snippet">Fast build tool</td>`;
  const liteParsed = parseDuckDuckGoLite(liteSample, 5);
  assert.equal(liteParsed.length, 1);
  assert.equal(liteParsed[0].url, 'https://vitejs.dev/');

  const deduped = dedupeSearchResults([
    { title: 'One', url: 'https://example.com/' },
    { title: 'Dup', url: 'https://example.com' },
  ]);
  assert.equal(deduped.length, 1);

  assert.deepEqual(parseGitHubSkillTarget('https://github.com/dietrichgebert/ponytail'), {
    owner: 'dietrichgebert',
    repo: 'ponytail',
    branch: '',
    filePath: '',
    kind: 'repo',
  });
  assert.deepEqual(parseGitHubSkillTarget('dietrichgebert/ponytail'), {
    owner: 'dietrichgebert',
    repo: 'ponytail',
    branch: '',
    filePath: '',
    kind: 'repo',
  });

  const fm = extractFrontmatter('---\nname: ponytail\ndescription: >\n  Lazy senior developer.\n  Smallest complete change.\n---\n# Body\nRules');
  assert.equal(fm.meta.name, 'ponytail');
  assert.equal(fm.meta.description, 'Lazy senior developer. Smallest complete change.');
  assert.match(fm.body, /^# Body/);

  const ranked = rankRepoSkillPaths([
    'README.md',
    '.cursor/rules/ponytail.mdc',
    'skills/ponytail/SKILL.md',
    '.openclaw/skills/ponytail/SKILL.md',
    '.openclaw/skills/ponytail-review/SKILL.md',
  ]);
  assert.deepEqual(ranked, [
    'skills/ponytail/SKILL.md',
    '.openclaw/skills/ponytail-review/SKILL.md',
  ]);
});

test('web-search extracts clean queries, honors /search command, and formats grounding context', () => {
  assert.equal(extractSearchQuery('/search Tailwind CSS v4 release notes'), 'Tailwind CSS v4 release notes');
  assert.equal(extractSearchQuery('Please build a modern website for Kyoto specialty coffee roasters'), 'Kyoto specialty coffee roasters');
  assert.equal(shouldAutoRunWebSearch({ enabled: false, userMessage: '/search vite 6' }), true);
  assert.equal(shouldAutoRunWebSearch({ enabled: true, userMessage: 'DEBUG MODE: fix crash' }), false);

  const formatted = formatSearchResultsForPrompt({
    query: 'Tailwind CSS',
    engine: 'DuckDuckGo',
    results: [{ title: 'Tailwind CSS', url: 'https://tailwindcss.com', snippet: 'Utility-first CSS', source: 'DuckDuckGo' }],
  });
  assert.ok(formatted.includes('LIVE WEB SEARCH CONTEXT'));
  assert.ok(formatted.includes('https://tailwindcss.com'));
});

test('sub-agents run in parallel when supported and automatically fall back to sequential one-by-one on concurrency rejection', async () => {
  assert.equal(shouldUseSubAgents({ mode: 'BUILD', userMessage: 'Build an architectural studio site', enabled: true }), true);
  assert.equal(shouldUseSubAgents({ mode: 'DISCUSS', userMessage: 'What is React?', enabled: true }), false);
  assert.equal(buildSubAgentPlan({ userMessage: 'Studio site', isHtml: false }).length, 3);
  assert.equal(buildSubAgentPlan({ userMessage: 'Studio site', isHtml: true }).length, 2);
  assert.equal(isConcurrencyOrProviderRejection(new Error('HTTP 429 Too Many Requests')), true);

  // Scenario 1: Parallel success
  let activeParallel = 0;
  let peakParallel = 0;
  const parallelProvider = {
    async generate(_sys, prompt) {
      activeParallel += 1;
      peakParallel = Math.max(peakParallel, activeParallel);
      await new Promise((r) => setTimeout(r, 15));
      activeParallel -= 1;
      if (prompt.includes('Design System Sub-Agent')) {
        return '### FILE: src/index.css\n```css\nbody { margin: 0; }\n```';
      }
      if (prompt.includes('Sections & Content Sub-Agent')) {
        return '### FILE: src/components/ShowcaseSections.jsx\n```jsx\nexport const SITE_DATA = {}; export function FeatureShowcase(){return null;} export function DetailsSection(){return null;} export function SiteFooter(){return null;}\n```';
      }
      return '### FILE: src/App.jsx\n```jsx\nexport default function App(){ return <main>Hi</main>; }\n```\n### FILE: src/main.jsx\n```jsx\nimport App from "./App";\n```';
    },
  };

  const okRes = await runSubAgents({
    provider: parallelProvider,
    systemPrompt: 'sys',
    userMessage: 'Build a coffee roastery website',
  });
  assert.equal(okRes.ok, true);
  assert.equal(okRes.mode, 'parallel');
  assert.ok(peakParallel >= 2, `Expected parallel execution, peak was ${peakParallel}`);
  assert.ok(okRes.files['src/index.css']);
  assert.ok(okRes.files['src/components/ShowcaseSections.jsx']);
  assert.ok(okRes.files['src/App.jsx']);

  // Scenario 2: Single-slot provider rejects concurrent calls with 429 -> must automatically fall back one-by-one
  let inflight = 0;
  let fallbackTriggered = false;
  const singleSlotProvider = {
    async generate(_sys, prompt) {
      if (inflight > 0) {
        throw new Error('429 Too Many Requests: only 1 concurrent slot allowed');
      }
      inflight += 1;
      await new Promise((r) => setTimeout(r, 10));
      inflight -= 1;
      if (prompt.includes('Design System Sub-Agent')) {
        return '### FILE: src/index.css\n```css\nbody { color: #111; }\n```';
      }
      if (prompt.includes('Sections & Content Sub-Agent')) {
        return '### FILE: src/components/ShowcaseSections.jsx\n```jsx\nexport const SITE_DATA = {}; export function FeatureShowcase(){return null;} export function DetailsSection(){return null;} export function SiteFooter(){return null;}\n```';
      }
      return '### FILE: src/App.jsx\n```jsx\nexport default function App(){ return <div>Fallback OK</div>; }\n```\n### FILE: src/main.jsx\n```jsx\nimport App from "./App";\n```';
    },
  };

  const fbRes = await runSubAgents({
    provider: singleSlotProvider,
    systemPrompt: 'sys',
    userMessage: 'Build an architectural firm site',
    onFallback: () => {
      fallbackTriggered = true;
    },
  });
  assert.equal(fbRes.ok, true);
  assert.equal(fbRes.mode, 'sequential-fallback');
  assert.equal(fallbackTriggered, true);
  assert.ok(fbRes.files['src/index.css']);
  assert.ok(fbRes.files['src/components/ShowcaseSections.jsx']);
  assert.ok(fbRes.files['src/App.jsx']);
});

test('SkillManager includes official Ponytail skill by default and supports GitHub multi-skill import', () => {
  localStorage.clear();
  const sm = new SkillManager();
  const ponytail = sm.skills.find((s) => s.id === 'ponytail');
  assert.ok(ponytail, 'Ponytail skill should be built in');
  assert.equal(ponytail.enabled, true);
  assert.match(ponytail.source, /DietrichGebert\/ponytail/i);
  assert.ok(sm.getSystemPrompt().includes('/ponytail lite|full|ultra'));

  assert.equal(parseGitHubInput('https://github.com/dietrichgebert/ponytail/blob/main/.openclaw/skills/ponytail/SKILL.md').kind, 'file');
  assert.equal(extractSkillFrontmatter('---\nname: ponytail-review\n---\nReview checklist').meta.name, 'ponytail-review');

  const added = sm.importDiscoveredSkill({
    slug: 'dietrichgebert-ponytail-review',
    name: 'Ponytail Review',
    description: 'Audit diffs for bloat',
    author: 'dietrichgebert',
    source: 'https://github.com/dietrichgebert/ponytail',
    prompt: '# Ponytail Review\nCheck every line.',
  });
  assert.equal(added.updated, false);
  const updated = sm.importDiscoveredSkill({
    slug: 'dietrichgebert-ponytail-review',
    name: 'Ponytail Review',
    description: 'Updated description',
    prompt: '# Ponytail Review v2',
  });
  assert.equal(updated.updated, true);
});

test('Flagship demo projects replace legacy starter demos, preserve user projects, and reference existing visual assets', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { STORAGE_KEYS } = await import('../js/modules/storage.mjs');
  const { DEMO_PROJECTS, LEGACY_DEMO_IDS, seedDemoProjects, DEMO_SEED_VERSION } = await import('../js/modules/demos.mjs');

  assert.equal(DEMO_PROJECTS.length, 3);
  assert.deepEqual(
    DEMO_PROJECTS.map((d) => d.id),
    ['demo-kinetix-saas', 'demo-maison-vera', 'demo-valkyr-motors']
  );

  // Seed legacy demos + a custom user project in localStorage
  localStorage.clear();
  localStorage.setItem(STORAGE_KEYS.DEMOS_SEEDED, 'flora-v1');
  localStorage.setItem(STORAGE_KEYS.LAST_PROJECT, 'demo-petal-pop');
  localStorage.setItem(
    STORAGE_KEYS.PROJECTS,
    JSON.stringify([
      { id: 'demo-petal-pop', name: 'Petal Pop', demo: true },
      { id: 'demo-atelier-botanica', name: 'Atelier Botanica', demo: true },
      { id: 'demo-wild-fern', name: 'Wild Fern Co.', demo: true },
      { id: 'user-custom-1', name: 'My Custom App', demo: false },
    ])
  );
  LEGACY_DEMO_IDS.forEach((id) => localStorage.setItem('wf_vfs_' + id, '{"src/App.jsx":"old"}'));

  seedDemoProjects();

  assert.equal(localStorage.getItem(STORAGE_KEYS.DEMOS_SEEDED), DEMO_SEED_VERSION);
  assert.equal(localStorage.getItem(STORAGE_KEYS.LAST_PROJECT), null);

  const storedProjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS));
  const storedIds = storedProjects.map((p) => p.id);
  assert.ok(storedIds.includes('user-custom-1'), 'Custom user project must be preserved');
  assert.ok(storedIds.includes('demo-kinetix-saas'));
  assert.ok(storedIds.includes('demo-maison-vera'));
  assert.ok(storedIds.includes('demo-valkyr-motors'));
  for (const legacyId of LEGACY_DEMO_IDS) {
    assert.ok(!storedIds.includes(legacyId), `Legacy demo ${legacyId} should be removed`);
    assert.equal(localStorage.getItem('wf_vfs_' + legacyId), null);
  }

  // Verify every demo has modular 4-file VFS, GSAP usage, and valid local image paths
  const rootDir = process.cwd();
  for (const demo of DEMO_PROJECTS) {
    assert.ok(demo.vfs['src/main.jsx'], `${demo.id} missing src/main.jsx`);
    assert.ok(demo.vfs['src/index.css'], `${demo.id} missing src/index.css`);
    assert.ok(demo.vfs['src/data.js'], `${demo.id} missing src/data.js`);
    assert.ok(demo.vfs['src/App.jsx'], `${demo.id} missing src/App.jsx`);
    assert.ok(demo.vfs['src/App.jsx'].includes('gsap'), `${demo.id} should use gsap`);

    // Ensure no accidental literal \${ escapes remain in JSX
    assert.ok(!demo.vfs['src/App.jsx'].includes('${'), `${demo.id} src/App.jsx contains unescaped template syntax`);

    const combinedSource = Object.values(demo.vfs).join('\n');
    const assetMatches = [...combinedSource.matchAll(/\/assets\/demos\/[a-z0-9\-_.]+\.(jpg|png|webp)/gi)];
    assert.ok(assetMatches.length >= 1, `${demo.id} should reference at least 1 bespoke demo image`);
    for (const match of assetMatches) {
      const rel = match[0].replace(/^\//, '');
      const absPath = path.join(rootDir, rel);
      assert.ok(fs.existsSync(absPath), `Missing image asset on disk for ${demo.id}: ${rel}`);
    }
  }
});

test('checkpoints persist beforeFiles snapshot for exact pre-edit rollback', () => {
  localStorage.clear();
  const before = { 'src/App.jsx': 'const color = "blue";', 'src/index.css': 'body { color: #111; }' };
  const after = { 'src/App.jsx': 'const color = "red";', 'src/index.css': 'body { color: #f00; }' };
  const cp = createCheckpoint({
    projectId: 'p-revert',
    label: 'Manual edit: App.jsx',
    files: after,
    prevFiles: before,
    type: 'manual',
  });
  const loaded = getCheckpoint('p-revert', cp.id);
  assert.ok(loaded.beforeFiles, 'Checkpoint must preserve beforeFiles for inline chat revert');
  assert.equal(loaded.beforeFiles['src/App.jsx'], 'const color = "blue";');
  assert.equal(loaded.files['src/App.jsx'], 'const color = "red";');
});

test('UILibraryManager ships 7 built-in packs (including 21st.dev), bundles kits, builds prompt guides, and supports custom CRUD + JSON I/O', async () => {
  localStorage.clear();
  const {
    UILibraryManager,
    BUILT_IN_UI_LIBRARIES,
    UI_ELEMENT_CATEGORIES,
    extractElementFromProjectFile,
  } = await import('../js/modules/ui-library.mjs');

  assert.equal(BUILT_IN_UI_LIBRARIES.length, 7);
  assert.equal(UI_ELEMENT_CATEGORIES.length, 12);
  assert.deepEqual(
    BUILT_IN_UI_LIBRARIES.map((l) => l.id),
    ['saas-modern', 'pixel-retro', 'minimal-luxury', 'neo-brutalist', 'glassmorphism', 'enterprise-m3', '21st-dev']
  );

  for (const pack of BUILT_IN_UI_LIBRARIES) {
    if (pack.id === '21st-dev') {
      assert.ok(pack.elements.length >= 2, '21st-dev must include Glass Folder Cards and Showcase');
    } else {
      assert.equal(pack.elements.length, 12, `${pack.id} must cover all 12 core UI categories`);
    }
    assert.ok(pack.tokensCss.includes('--wf-bg'), `${pack.id} missing CSS tokens`);
    assert.ok(pack.kitCode.includes('export function Button'), `${pack.id} missing React kit`);
  }

  const mgr = new UILibraryManager();
  assert.equal(mgr.getActiveLibrary().id, 'saas-modern');

  mgr.setActiveLibrary('pixel-retro');
  const guide = mgr.buildPromptGuide();
  assert.ok(guide.includes('Pixel / Retro 8-bit'));
  assert.ok(guide.includes('src/components/ui.jsx'));
  assert.ok(guide.includes('Silkscreen'));

  // Bundle into existing VFS without clobbering user CSS
  const { nextVfs, addedPaths } = mgr.applyLibraryToVfs({
    'src/App.jsx': 'export default function App(){ return null; }',
    'src/index.css': 'body { padding: 0; }',
  });
  assert.ok(addedPaths.includes('src/components/ui.jsx'));
  assert.ok(addedPaths.includes('src/styles/ui-tokens.css'));
  assert.ok(nextVfs['src/index.css'].includes("@import './styles/ui-tokens.css';"));
  assert.ok(nextVfs['src/index.css'].includes('body { padding: 0; }'));

  // 21st.dev pack bundles Glass Folder Cards TSX & documents @/components/ui/glass-folder-cards for AI
  mgr.setActiveLibrary('21st-dev');
  const twentyFirst = mgr.getActiveLibrary();
  assert.equal(twentyFirst.name, '21st.dev');
  const glassFolderEl = twentyFirst.elements.find((e) => e.id === '21st-glass-folder-cards');
  assert.ok(glassFolderEl, '21st.dev pack should include Glass Folder Cards');
  assert.equal(glassFolderEl.targetPath, 'src/components/ui/glass-folder-cards.tsx');
  assert.ok(glassFolderEl.code.includes('export default function GlassFolder'));
  assert.ok(!glassFolderEl.code.includes('Uint8ClampedArray<ArrayBuffer>'), 'Must stay compatible with Babel 7.23 TS parser');
  assert.ok(glassFolderEl.previewHtml.includes('gfPreviewPrimary'));
  assert.ok(glassFolderEl.previewScript.includes('gfAddBtn'));

  const bundled21 = mgr.applyLibraryToVfs({ 'src/App.jsx': 'export default function App(){ return null; }' }, '21st-dev');
  assert.ok(bundled21.addedPaths.includes('src/components/ui/glass-folder-cards.tsx'));
  assert.ok(bundled21.nextVfs['src/components/ui/glass-folder-cards.tsx'].includes('export const ART_PRESETS'));

  const guide21 = mgr.buildPromptGuide('21st-dev');
  assert.ok(guide21.includes('21st.dev'));
  assert.ok(guide21.includes('@/components/ui/glass-folder-cards'));
  assert.ok(guide21.includes('GlassFolder'));

  // Adding an element to a built-in pack creates a custom companion pack
  const { library: customComp, element: addedEl } = mgr.addElementToLibrary('pixel-retro', {
    name: 'Arcade Health Bar',
    category: 'alerts',
    description: '8-bit HP meter',
    code: 'export function HealthBar() { return <div className="wf-ui-alert">HP 100/100</div>; }',
  });
  assert.equal(customComp.isBuiltIn, false);
  assert.equal(customComp.name, 'Pixel / Retro 8-bit (Custom)');
  assert.equal(customComp.elements[0].id, addedEl.id);

  // Extract element from an active project file
  const extracted = extractElementFromProjectFile(
    'src/components/PricingTierCard.jsx',
    'export function PricingTierCard() { return <section>Pro $29</section>; }'
  );
  assert.equal(extracted.name, 'Pricing Tier Card');
  assert.equal(extracted.category, 'pricing');

  // Portable JSON export & import round-trip
  const exportedJson = mgr.exportLibraryJson(customComp.id);
  const reimported = mgr.importLibraryJson(exportedJson);
  assert.equal(reimported.name, customComp.name);
  assert.equal(reimported.elements.length, customComp.elements.length);
  assert.equal(mgr.deleteCustomLibrary(reimported.id), true);
});

test('GitHub UI component discovery helpers & project thumbnail cache work cleanly', async () => {
  localStorage.clear();
  const { inferUIComponentCategory, rankRepoUIComponentPaths } = await import('../tools/search-engine.mjs');
  const { DEMO_THUMBNAIL_MAP, getProjectThumbnail, setProjectThumbnail, removeProjectThumbnail } = await import('../js/modules/thumbnails.mjs');

  assert.equal(inferUIComponentCategory('components/ui/button.tsx'), 'buttons');
  assert.equal(inferUIComponentCategory('src/components/PricingTable.jsx'), 'pricing');
  assert.equal(inferUIComponentCategory('src/ui/DialogModal.tsx'), 'modals');

  const ranked = rankRepoUIComponentPaths([
    'README.md',
    'src/components/ui/button.tsx',
    'src/components/ui/button.test.tsx',
    'src/components/ui/card.jsx',
    'src/utils/math.js',
  ]);
  assert.deepEqual(ranked, ['src/components/ui/card.jsx', 'src/components/ui/button.tsx']);

  // Thumbnails: demo fallback + custom dataUrl override + cleanup
  assert.equal(getProjectThumbnail('demo-kinetix-saas'), DEMO_THUMBNAIL_MAP['demo-kinetix-saas']);
  assert.equal(getProjectThumbnail('user-proj-1'), null);
  assert.equal(setProjectThumbnail('user-proj-1', 'data:image/jpeg;base64,/9j/4AAQ'), true);
  assert.equal(getProjectThumbnail('user-proj-1'), 'data:image/jpeg;base64,/9j/4AAQ');
  removeProjectThumbnail('user-proj-1');
  assert.equal(getProjectThumbnail('user-proj-1'), null);
});

test('AI template queue store persists, validates, updates, deletes, and builds import summaries cleanly', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const {
    readAiQueueFile,
    addAiTemplateItem,
    updateAiTemplateItem,
    deleteAiTemplateItem,
    clearImportedAiTemplateItems,
  } = await import('../tools/ai-queue-store.mjs');
  const { UILibraryManager } = await import('../js/modules/ui-library.mjs');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-ai-queue-'));
  const queueFile = path.join(tmpDir, 'ui-library-ai-queue.json');

  try {
    assert.deepEqual(readAiQueueFile(queueFile), []);
    assert.throws(() => addAiTemplateItem(queueFile, { name: '', prompt: 'code' }), /name is required/i);
    assert.throws(() => addAiTemplateItem(queueFile, { name: 'Dock', prompt: '   ' }), /prompt is required/i);

    const added1 = addAiTemplateItem(queueFile, {
      name: 'Magnetic Dock',
      targetLibrary: '21st.dev',
      prompt: 'Copy-paste MagneticDock.tsx into components/ui',
    });
    assert.equal(added1.item.status, 'pending');
    assert.equal(added1.item.targetLibrary, '21st.dev');
    assert.equal(readAiQueueFile(queueFile).length, 1);

    const added2 = addAiTemplateItem(queueFile, {
      name: 'Aurora Button',
      targetLibrary: 'SaaS Modern',
      prompt: 'export function AuroraButton() {}',
    });
    assert.equal(added2.templates.length, 2);

    const updated = updateAiTemplateItem(queueFile, added1.item.id, {
      name: 'Magnetic Floating Dock',
      status: 'imported',
    });
    assert.equal(updated.item.name, 'Magnetic Floating Dock');
    assert.equal(updated.item.status, 'imported');

    const cleared = clearImportedAiTemplateItems(queueFile);
    assert.equal(cleared.removedCount, 1);
    assert.equal(cleared.templates.length, 1);
    assert.equal(cleared.templates[0].id, added2.item.id);

    const removed = deleteAiTemplateItem(queueFile, added2.item.id);
    assert.equal(removed.deleted, true);
    assert.deepEqual(readAiQueueFile(queueFile), []);

    // Offline client fallback & summary prompt formatting
    localStorage.clear();
    const prevFetch = globalThis.fetch;
    globalThis.fetch = undefined;
    try {
      const mgr = new UILibraryManager();
      const res = await mgr.addAiTemplate({
        name: 'Liquid Tabs',
        targetLibrary: '21st.dev',
        prompt: 'Paste liquid-tabs.tsx',
      });
      assert.equal(res.persistedToWorkspace, false);
      assert.equal(mgr.getPendingAiTemplatesCount(), 1);
      const summary = mgr.buildAiImportSummaryPrompt();
      assert.ok(summary.includes('Liquid Tabs'));
      assert.ok(summary.includes('21st.dev'));
      assert.ok(summary.includes('Paste liquid-tabs.tsx'));
      await mgr.deleteAiTemplate(res.item.id);
      assert.equal(mgr.getPendingAiTemplatesCount(), 0);
    } finally {
      globalThis.fetch = prevFetch;
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});




