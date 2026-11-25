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
  computeTokenRingMetrics,
  createActivityTurnState,
  addOrUpdateActivityStep,
  finalizeActivityTurn,
  buildActivitySummary,
  serializeTurnActivity,
  hydrateTurnActivity,
} = await import('../js/modules/agent-activity.mjs');
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

  assert.equal(DEMO_PROJECTS.length, 4);
  assert.deepEqual(
    DEMO_PROJECTS.map((d) => d.id),
    ['demo-kinetix-saas', 'demo-maison-vera', 'demo-valkyr-motors', 'demo-sola-ceramic']
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
  assert.ok(storedIds.includes('demo-sola-ceramic'));
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

test('UILibraryManager ships 17 built-in packs (including Watermelon UI, 21st.dev, Awesome Components, Kokonut UI, HyperUI, shadcn/ui & 5 DESIGN.md presets), bundles kits, builds prompt guides, and supports custom CRUD + JSON I/O', async () => {
  localStorage.clear();
  const {
    UILibraryManager,
    BUILT_IN_UI_LIBRARIES,
    UI_ELEMENT_CATEGORIES,
    extractElementFromProjectFile,
  } = await import('../js/modules/ui-library.mjs');

  assert.equal(BUILT_IN_UI_LIBRARIES.length, 17);
  assert.equal(UI_ELEMENT_CATEGORIES.length, 12);
  assert.deepEqual(
    BUILT_IN_UI_LIBRARIES.map((l) => l.id),
    [
      'saas-modern',
      'pixel-retro',
      'minimal-luxury',
      'neo-brutalist',
      'glassmorphism',
      'enterprise-m3',
      '21st-dev',
      'awesome-components',
      'kokonut-ui',
      'hyperui',
      'watermelon-ui',
      'shadcn-ui',
      'designmd-linear',
      'designmd-stripe',
      'designmd-vercel',
      'designmd-raycast',
      'designmd-supabase',
    ]
  );

  for (const pack of BUILT_IN_UI_LIBRARIES) {
    if (pack.id === '21st-dev') {
      assert.ok(pack.elements.length >= 2, '21st-dev must include Glass Folder Cards and Showcase');
    } else if (pack.id === 'watermelon-ui') {
      assert.equal(pack.isRemoteCatalog, true, 'watermelon-ui must be a remote catalog pack');
      assert.equal(pack.catalogCount, 849, 'watermelon-ui must expose 849 real official ui.watermelon.sh items');
    } else if (pack.id === 'awesome-components') {
      assert.equal(pack.isRemoteCatalog, true, 'awesome-components must be a remote catalog pack');
      assert.equal(pack.catalogCount, 6345, 'awesome-components must expose 6,345 verified working components');
    } else if (pack.id === 'kokonut-ui') {
      assert.equal(pack.isRemoteCatalog, true, 'kokonut-ui must be a remote catalog pack');
      assert.equal(pack.catalogCount, 121, 'kokonut-ui must expose 121 indexed components');
    } else if (pack.id === 'hyperui') {
      assert.equal(pack.isRemoteCatalog, true, 'hyperui must be a remote catalog pack');
      assert.equal(pack.catalogCount, 326, 'hyperui must expose 326 indexed paired Light/Dark components');
    } else if (pack.id === 'shadcn-ui') {
      assert.equal(pack.isRemoteCatalog, true, 'shadcn-ui must be a remote catalog pack');
      assert.equal(pack.catalogCount, 275, 'shadcn-ui must expose 275 indexed official v4 components & blocks');
    } else {
      assert.equal(pack.elements.length, 12, `${pack.id} must cover all 12 core UI categories`);
    }
    assert.ok(pack.tokensCss.includes('--wf-bg'), `${pack.id} missing CSS tokens`);
    assert.ok(pack.kitCode.includes('export function Button'), `${pack.id} missing React kit`);
  }

  const mgr = new UILibraryManager();
  assert.equal(mgr.getActiveLibrary().id, 'watermelon-ui');

  // Archived built-in packs remain resolvable via getLibrary() so existing projects keep working
  const pixelRetro = mgr.getLibrary('pixel-retro');
  assert.equal(pixelRetro?.archived, true);
  assert.ok(mgr.buildPromptGuide('pixel-retro').includes('Pixel / Retro 8-bit'));
  assert.ok(mgr.buildPromptGuide('pixel-retro').includes('src/components/ui.jsx'));
  assert.ok(mgr.buildPromptGuide('pixel-retro').includes('Silkscreen'));

  // Bundle into existing VFS without clobbering user CSS
  const { nextVfs, addedPaths } = mgr.applyLibraryToVfs({
    'src/App.jsx': 'export default function App(){ return null; }',
    'src/index.css': 'body { padding: 0; }',
  });
  assert.ok(addedPaths.includes('src/components/ui.jsx'));
  assert.ok(addedPaths.includes('src/styles/ui-tokens.css'));
  assert.ok(nextVfs['src/index.css'].includes("@import './styles/ui-tokens.css';"));
  assert.ok(nextVfs['src/index.css'].includes('body { padding: 0; }'));

  // Archived 21st.dev pack stays resolvable for existing projects (soft-hide only, HARD_DELETE = false)
  const twentyFirst = mgr.getLibrary('21st-dev');
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

test('Awesome Components catalog loads 6,345 verified items (excluding broken upstream error scrapes), searches, paginates, computes counts, and converts HTML snapshots to React JSX', async () => {
  const path = await import('node:path');
  const {
    AWESOME_INDEX_REL_PATH,
    loadAwesomeCatalog,
    searchAwesomeCatalog,
    computeCategoryCounts,
    htmlSnapshotToReactComponent,
    isBrokenRenderedHtml,
  } = await import('../tools/awesome-components.mjs');

  const indexPath = path.join(process.cwd(), AWESOME_INDEX_REL_PATH);
  const catalog = loadAwesomeCatalog(indexPath);
  assert.equal(catalog.length, 6345, 'Must index all 6,345 verified working components from wundercorp/awesome-components');
  assert.equal(catalog.some((c) => c.id === '0-9/0xurvish/expandable-gallery/default'), false, 'Broken upstream error-page scrape must be excluded');
  assert.equal(catalog.some((c) => c.id === '0-9/0xurvish/bucket/default'), false, 'Empty 0-byte scrape must be excluded');
  assert.equal(catalog.some((c) => c.id === '0-9/0xurvish/dynamic-toolbar/default'), true, 'Valid working component must be kept');

  assert.equal(isBrokenRenderedHtml('<html><body>Something went wrong — The page failed to render</body></html>'), true);
  assert.equal(isBrokenRenderedHtml('<div id="root"></div>'), true);
  assert.equal(isBrokenRenderedHtml('<div id="root"><button class="px-4 py-2">Click</button></div>'), false);
  assert.equal(
    isBrokenRenderedHtml('<div aria-label="iPhone mockup (14-pro)" style="width: 417px; height: 876px; border-radius: 68px; background: #111;"></div>'),
    false,
    'Pure-CSS visual frames like iPhone Mockup must NOT be flagged as broken'
  );

  const counts = computeCategoryCounts(catalog);
  assert.equal(counts.all, 6345);
  const summed = Object.entries(counts)
    .filter(([k]) => k !== 'all')
    .reduce((acc, [, v]) => acc + v, 0);
  assert.equal(summed, 6345, 'Category counts must sum exactly to 6,345');

  const bento = searchAwesomeCatalog(catalog, { q: 'bento', category: 'all', page: 1, limit: 24 });
  assert.ok(bento.total > 10, `Expected >10 bento components, got ${bento.total}`);
  assert.equal(bento.items.length, Math.min(24, bento.total));
  assert.ok(bento.items[0].screenshotUrl.startsWith('https://raw.githubusercontent.com/wundercorp/awesome-components/main/components/'));

  const loginForms = searchAwesomeCatalog(catalog, { q: 'login', category: 'forms', page: 1, limit: 12 });
  assert.ok(loginForms.total > 5, 'Expected login components in forms category');
  assert.ok(loginForms.items.every((item) => item.category === 'forms'));

  const page2 = searchAwesomeCatalog(catalog, { q: '', category: 'all', page: 2, limit: 24 });
  assert.equal(page2.page, 2);
  assert.equal(page2.items.length, 24);
  assert.notEqual(page2.items[0].id, catalog[0].id);

  const jsx = htmlSnapshotToReactComponent(
    'Bento Grid Card',
    '<!DOCTYPE html><html><head><link rel="stylesheet" href="/_next/static/css/dead.css"></head><body><div id="root"><div class="w-screen min-h-screen flex justify-center items-center"><section class="p-4 bg-card" style="background-color: #111; border-radius: 12px"><img src="https://www.thiings.co/_next/image?url=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1&amp;w=640&amp;q=75" alt="Demo"><img src="https://images.unsplash.com/photo-2?q=80&amp;w=1200" alt="Hero"><label for="em">Email</label><input id="em" type="email" readonly><svg viewbox="0 0 24 24"><path stroke-width="2" fill-rule="evenodd" d="M0 0"></path></svg><number-flow-react></number-flow-react><p>Price: {42}</p></section></div></div></body></html>'
  );
  assert.ok(jsx.includes('export function BentoGridCard()'));
  assert.ok(!jsx.includes('<!DOCTYPE') && !jsx.includes('/_next/static/css/dead.css'), 'Should extract clean body from full HTML docs');
  assert.ok(!jsx.includes('w-screen') && !jsx.includes('min-h-screen'), 'Should unwrap BuilderStudio outer viewport harness divs');
  assert.ok(jsx.includes('https://images.unsplash.com/photo-1'), 'Should unwrap full-origin /_next/image proxy URLs');
  assert.ok(jsx.includes('https://images.unsplash.com/photo-2?q=80&w=1200'), 'Should decode &amp; in JSX image src URLs');
  assert.ok(jsx.split('\n').length >= 15, 'Generated JSX should be formatted across indented lines instead of minified onto one line');
  assert.ok(jsx.includes('className="p-4 bg-card"'));
  assert.ok(jsx.includes('htmlFor="em"'));
  assert.ok(jsx.includes('readOnly'));
  assert.ok(jsx.includes('style={{ backgroundColor: "#111", borderRadius: "12px" }}'));
  assert.ok(jsx.includes('strokeWidth="2"'));
  assert.ok(jsx.includes('fillRule="evenodd"'));
  assert.ok(jsx.includes('viewBox="0 0 24 24"'));
  assert.ok(jsx.includes('<input id="em" type="email" readOnly />'));
  assert.ok(jsx.includes('&#123;42&#125;'));
});

test('buildInteractivePreviewSrcdoc generates high-fidelity Tailwind v4/shadcn, built-in, and JSX previews', async () => {
  const {
    buildInteractivePreviewSrcdoc,
    sanitizeAwesomeRenderedHtml,
    unwrapNextImageUrls,
    isCanvasOnlySnapshot,
    isDarkSurfaceSnapshot,
  } = await import('../js/modules/ui-preview-builder.mjs');

  assert.equal(
    unwrapNextImageUrls('<img src="https://www.thiings.co/_next/image?url=https%3A%2F%2Fcdn.example.com%2Fpic.jpg&amp;w=800&amp;q=75">'),
    '<img src="https://cdn.example.com/pic.jpg">'
  );

  // Canvas-only & dark-surface detection (e.g. Siri Wave vs Hero Shader vs light Card)
  const siriWaveHtml = '<div class="flex min-h-screen w-full items-center justify-center bg-[#0a0a0c] p-8"><canvas class="block rounded-[20px] bg-black" width="270" height="270" style="width: 360px; height: 360px;"></canvas></div>';
  assert.equal(isCanvasOnlySnapshot(siriWaveHtml), true, 'Pure <canvas> snapshot like Siri Wave must be detected');
  assert.equal(isDarkSurfaceSnapshot(siriWaveHtml), true, 'Dark canvas snapshot must trigger dark preview stage');
  assert.equal(isCanvasOnlySnapshot('<div><canvas></canvas><h1>Beautiful Design</h1><button>Start</button></div>'), false, 'Hybrid DOM + canvas hero must NOT be classified as canvas-only');
  assert.equal(isDarkSurfaceSnapshot('<section class="bg-white text-black bg-black/5"><button>Light</button></section>'), false, 'Low-opacity bg-black/5 button tint must not trigger dark mode');

  const siriDoc = buildInteractivePreviewSrcdoc({
    lib: { id: 'awesome-components', name: 'Awesome Components' },
    element: {
      name: 'Siri Wave',
      renderedHtml: siriWaveHtml,
      screenshotUrl: 'https://raw.githubusercontent.com/wundercorp/awesome-components/main/components/0-9/40973894/siri-wave/default/screenshot.png',
    },
    theme: 'dark',
    animate: true,
  });
  assert.ok(siriDoc.includes('var WF_CANVAS_ONLY = true;'), 'Pure canvas preview must enable authentic reference canvas mode');
  assert.ok(siriDoc.includes('siri-wave/default/screenshot.png'), 'Pure canvas preview must embed its original reference screenshot URL');
  // Parse inline runtime <script> to guarantee zero JS syntax/regex-escape errors inside preview iframes
  const inlineScripts = [...siriDoc.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  assert.ok(inlineScripts.length >= 1, 'Preview must emit inline interactive runtime script');
  for (const scriptBody of inlineScripts) {
    new Function(scriptBody);
  }

  // 1. Awesome Components full HTML document + Tailwind v4 / opacity / Shadow-DOM hydration / image fallback / full-bleed height / collapsed fan-deck rescue
  const fullDocHtml = `<!DOCTYPE html><html><head><link rel="stylesheet" href="/_next/static/css/abc.css"><style>.custom-glow { opacity: 1; }</style></head><body><div id="root"><div class="w-screen min-h-screen flex justify-center items-center"><section class="h-screen w-screen bg-primary/10 border-foreground/10 rounded-4xl bg-linear-to-t from-black/20"><canvas width="1200" height="800"></canvas><img src="/_next/image?url=https%3A%2F%2Fimages.unsplash.com%2Fhero.jpg&w=800"><number-flow-react></number-flow-react><button>Explore</button></section></div></div></body></html>`;
  const sanitized = sanitizeAwesomeRenderedHtml(fullDocHtml);
  assert.ok(!sanitized.bodyHtml.includes('<!DOCTYPE') && !sanitized.bodyHtml.includes('/_next/static/css'), 'Must strip full-doc wrapper and dead _next links');
  assert.ok(!sanitized.bodyHtml.includes('w-screen'), 'Must peel BuilderStudio outer viewport harness');
  assert.ok(sanitized.bodyHtml.includes('h-[640px]'), 'Must preserve full-bleed component height instead of collapsing h-screen to 0px');
  assert.ok(sanitized.bodyHtml.includes('https://images.unsplash.com/hero.jpg'), 'Must unwrap _next/image URLs');
  assert.ok(sanitized.bodyHtml.includes('referrerpolicy="no-referrer"'), 'Must add no-referrer to external images');
  assert.ok(sanitized.extraCss.includes('.custom-glow'), 'Must preserve safe inline <style> rules');

  const awesomeDoc = buildInteractivePreviewSrcdoc({
    lib: { id: 'awesome-components', name: 'Awesome Components' },
    element: {
      name: 'Vertical Tabs',
      renderedHtml: fullDocHtml,
    },
    theme: 'light',
    animate: true,
  });
  assert.ok(awesomeDoc.includes('/vendor/preview-kit/tailwind-browser.js'), 'Must use local vendored Tailwind CSS v4 Preview Kit');
  assert.ok(!awesomeDoc.includes('cdn.jsdelivr.net') && !awesomeDoc.includes('unpkg.com') && !awesomeDoc.includes('fonts.googleapis.com'), 'Must have zero external CDN requests');
  assert.ok(awesomeDoc.includes('@custom-variant dark'), 'Must configure Tailwind v4 class-based dark mode');
  assert.ok(awesomeDoc.includes('--color-primary: hsl(var(--primary));'), 'Must map shadcn colors into Tailwind v4 @theme inline');
  assert.ok(awesomeDoc.includes('--blue-500: #3b82f6;'), 'Must expose Aceternity UI color variables for Aurora/Gradient backgrounds');
  assert.ok(awesomeDoc.includes('--gradient-background-start:'), 'Must provide default CSS vars for Background Gradient Animation');
  assert.ok(awesomeDoc.includes('--animate-first:'), 'Must include Aceternity gradient orb animations');
  assert.ok(awesomeDoc.includes('bg-grid-white'), 'Must include grid/dot background utilities');
  assert.ok(awesomeDoc.includes('wireImageFallbacks'), 'Must include broken-image SVG fallback handler');
  assert.ok(awesomeDoc.includes('unfreezeHiddenScrollElements'), 'Must unfreeze Framer Motion opacity:0 elements');
  assert.ok(awesomeDoc.includes('hydrateShadowCustomElements'), 'Must hydrate empty <number-flow-react> elements');
  assert.ok(awesomeDoc.includes('hydrateEmptyCanvases'), 'Must handle empty WebGL/shader <canvas> elements');
  assert.ok(awesomeDoc.includes('healCollapsedMediaContainers'), 'Must rescue 0x0 image containers whose external CSS classes were omitted');
  assert.ok(awesomeDoc.includes('rotateFanDeck'), 'Must wire live prev/next rotation for rescued fan card carousels');
  assert.ok(awesomeDoc.includes('data-preview-theme="light"'));
  assert.ok(awesomeDoc.includes('wf-replay-animation'));
  assert.ok(awesomeDoc.includes('wf-set-theme'));

  // 2. Built-in / 21st.dev previewHtml + previewScript (offline, zero external fonts)
  const builtinDoc = buildInteractivePreviewSrcdoc({
    lib: { id: '21st-dev', name: '21st.dev', tokensCss: ':root { --wf-bg: #000; }', fontsUrl: 'https://fonts.googleapis.com/css2?family=Inter' },
    element: {
      name: 'Glass Folder Cards',
      previewHtml: '<div class="gf-demo"><button id="gfAdd">Add</button></div>',
      previewCss: '.gf-demo { display: flex; }',
      previewScript: 'console.log("folder-ready");',
    },
    theme: 'dark',
    animate: true,
  });
  assert.ok(!builtinDoc.includes('fonts.googleapis.com'), 'Offline Preview Kit must strip external Google Fonts');
  assert.ok(builtinDoc.includes('data-lib="21st-dev"'), 'Preview must scope library tokens via data-lib');
  assert.ok(builtinDoc.includes('folder-ready'));
  assert.ok(builtinDoc.includes('@keyframes wfRevealUp'));

  // 3. Code-only React JSX component fallback (offline vendored React + Babel)
  const jsxDoc = buildInteractivePreviewSrcdoc({
    lib: { id: 'custom-1', name: 'Custom Pack', tokensCss: '' },
    element: {
      name: 'Status Pill',
      code: 'export function StatusPill() { return <span className="text-xs">Live</span>; }',
    },
    theme: 'dark',
  });
  assert.ok(jsxDoc.includes('/vendor/preview-kit/babel.min.js'));
  assert.ok(jsxDoc.includes('/vendor/preview-kit/react.production.min.js'));
  assert.ok(!jsxDoc.includes('unpkg.com'));
  assert.ok(jsxDoc.includes('StatusPill'));
});

test('Plan Mode engine builds system directives, offline draft plans, approval prompts, and XSS-safe Markdown HTML', async () => {
  const {
    buildPlanModeSystemDirective,
    buildOfflineDraftPlan,
    buildApprovedPlanExecutionPrompt,
    formatPlanMarkdownToHtml,
  } = await import('../js/modules/plan-mode.mjs');

  const directive = buildPlanModeSystemDirective('Base WebForge Prompt');
  assert.ok(directive.includes('Base WebForge Prompt'));
  assert.ok(directive.includes('PLAN MODE ACTIVE'));
  assert.ok(directive.includes('NEVER output ### FILE: blocks'));

  const draft = buildOfflineDraftPlan('Minimalist coffee roastery storefront', 'Minimal Luxury');
  assert.ok(draft.includes('## Goal'));
  assert.ok(draft.includes('Minimalist coffee roastery storefront'));
  assert.ok(draft.includes('Minimal Luxury'));
  assert.ok(draft.includes('## Planned Files'));

  const execPrompt = buildApprovedPlanExecutionPrompt('Coffee storefront', '## Goal\nShip storefront');
  assert.ok(execPrompt.includes('APPROVED'));
  assert.ok(execPrompt.includes('Coffee storefront'));
  assert.ok(execPrompt.includes('Ship storefront'));

  const renderedHtml = formatPlanMarkdownToHtml('## Goal\nBuild **fast** `App.jsx` <script>alert(1)</script>\n- Item *one*');
  assert.ok(renderedHtml.includes('<h3 class="plan-md-h3">Goal</h3>'));
  assert.ok(renderedHtml.includes('<strong>fast</strong>'));
  assert.ok(renderedHtml.includes('<code>App.jsx</code>'));
  assert.ok(!renderedHtml.includes('<script>alert(1)</script>'), 'Must escape raw script tags');
  assert.ok(renderedHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(renderedHtml.includes('<li>Item <em>one</em></li>'));
});

test('Awesome Components 5-category fidelity helpers extract prompt.md CSS, heal media/glow/accents/mobile frames, and emit valid preview JS', async () => {
  const { extractStyleHintsFromPrompt } = await import('../tools/awesome-components.mjs');
  const {
    buildInteractivePreviewSrcdoc,
    unwrapNextImageUrls,
    isMobileComponentSnapshot,
    needsVibrantPrimaryAccent,
  } = await import('../js/modules/ui-preview-builder.mjs');

  // 1. prompt.md CSS extraction
  const samplePromptMd = [
    '# Glowing Button',
    '```css',
    '@property --gradient-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }',
    ':root { --glow-color: #f59e0b; --brand: 38 92% 50%; }',
    '@keyframes pulse-border { 0% { opacity: 0.6; } 100% { opacity: 1; } }',
    '```',
  ].join('\n');
  const extractedCss = extractStyleHintsFromPrompt(samplePromptMd);
  assert.ok(extractedCss.includes('@property --gradient-angle'));
  assert.ok(extractedCss.includes('--glow-color: #f59e0b'));
  assert.ok(extractedCss.includes('@keyframes pulse-border'));

  // 2. Unwrapping CSS background-image /_next/image & promoting data-src over 1x1 GIF
  const unwrappedBg = unwrapNextImageUrls(
    '<div style="background-image: url(\'/_next/image?url=https%3A%2F%2Fcdn.test%2Fbg.png&amp;w=1200\')"></div><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-src="https://cdn.test/real.jpg" srcset="/_next/image?url=foo 1x">'
  );
  assert.ok(unwrappedBg.includes('https://cdn.test/bg.png'), 'Should unwrap CSS url() _next/image');
  assert.ok(unwrappedBg.includes('src="https://cdn.test/real.jpg"'), 'Should promote data-src over 1x1 blank GIF');
  assert.ok(!unwrappedBg.includes('srcset='), 'Should strip broken srcset attributes');

  // 3. Mobile / phone snapshot detection
  assert.equal(
    isMobileComponentSnapshot('<div class="md:hidden fixed bottom-0"><nav>Home</nav></div>', 'Bottom Nav'),
    true,
    'Desktop-hidden md:hidden root must trigger mobile viewport'
  );
  assert.equal(
    isMobileComponentSnapshot('<div style="width: 417px; height: 876px;"><div style="inset: 59px 0px 34px;"></div></div>', 'iPhone Mockup'),
    true,
    'iPhone Mockup must trigger mobile viewport'
  );
  assert.equal(
    isMobileComponentSnapshot('<header class="w-full max-w-7xl flex"><nav class="lg:flex hidden"><a>Home</a></nav><div class="lg:hidden">Drawer</div></header>', 'Resizable Navbar'),
    false,
    'Desktop navbar with lg:flex hidden (any class order) and lg:hidden mobile drawer must stay desktop'
  );

  // 4. Vibrant landing-page accent detection
  assert.equal(
    needsVibrantPrimaryAccent('<section class="bg-primary text-primary-foreground"><a class="from-primary to-primary/60">Start</a></section>'),
    true
  );
  assert.equal(
    needsVibrantPrimaryAccent('<section class="bg-emerald-500 text-white"><button class="bg-primary">Go</button></section>'),
    false,
    'Components that already specify explicit brand Tailwind hues should keep their own palette'
  );

  // 5. Full preview generation with promptCss + glow + mobile + header nav runtime validation
  const previewDoc = buildInteractivePreviewSrcdoc({
    lib: { id: 'awesome-components', name: 'Awesome Components' },
    element: {
      name: 'Glowing Landing Header',
      renderedHtml: '<header class="w-full flex"><nav class="flex gap-4"><a href="#features">Features</a><a href="#pricing">Pricing</a></nav><button class="bg-primary shiny-cta" style="--glow-color:#f59e0b">Launch</button></header>',
      promptCss: extractedCss,
    },
    theme: 'dark',
    animate: true,
  });
  assert.ok(previewDoc.includes('--glow-color: #f59e0b'), 'Must inject extracted promptCss');
  assert.ok(previewDoc.includes('hydrateGlowEffects'), 'Must include glow hydration runtime');
  assert.ok(previewDoc.includes('rescueMobileAndPhoneViews'), 'Must include mobile/phone rescue runtime');
  assert.ok(previewDoc.includes('findOptionGroup'), 'Must include multi-option header/nav click handler');
  assert.ok(previewDoc.includes('toggleHeaderDropdown'), 'Must include header dropdown toggle handler');

  // Verify every emitted inline <script> parses cleanly in JS engine
  const scripts = [...previewDoc.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  assert.ok(scripts.length >= 1);
  for (const s of scripts) {
    new Function(s);
  }
});

test('GitHub catalogs engine loads Kokonut UI (121), HyperUI (326), and shadcn/ui (275) disk indexes with accurate search, category counts, and variant pairing', async () => {
  const {
    REMOTE_CATALOG_CONFIGS,
    loadRemoteCatalog,
    searchRemoteCatalog,
  } = await import('../tools/github-catalogs.mjs');
  const { computeCategoryCounts } = await import('../tools/awesome-components.mjs');

  const rootDir = process.cwd();
  assert.deepEqual(Object.keys(REMOTE_CATALOG_CONFIGS).sort(), ['hyperui', 'kokonut-ui', 'shadcn-ui', 'watermelon-ui']);

  // 1. Kokonut UI
  const kokonut = loadRemoteCatalog('kokonut-ui', rootDir);
  assert.equal(kokonut.length, 121, 'Kokonut UI index must contain 121 components');
  const kokonutCounts = computeCategoryCounts(kokonut);
  assert.equal(kokonutCounts.all, 121);
  const kokonutSearch = searchRemoteCatalog(kokonut, { q: 'button', category: 'all', page: 1, limit: 24 });
  assert.ok(kokonutSearch.total >= 5, `Expected >=5 button components in Kokonut UI, got ${kokonutSearch.total}`);
  assert.ok(kokonutSearch.items[0].sourcePath.endsWith('.tsx'));

  // 2. HyperUI (paired Light/Dark HTML)
  const hyperui = loadRemoteCatalog('hyperui', rootDir);
  assert.equal(hyperui.length, 326, 'HyperUI index must contain 326 paired Light/Dark components');
  const pairedWithDark = hyperui.filter((item) => Boolean(item.darkSourcePath));
  assert.ok(pairedWithDark.length >= 200, `Expected >=200 HyperUI components with paired dark HTML variants, got ${pairedWithDark.length}`);
  const hyperSearch = searchRemoteCatalog(hyperui, { q: 'pricing', category: 'all', page: 1, limit: 12 });
  assert.ok(hyperSearch.total >= 2, 'Expected HyperUI pricing components');
  assert.equal(hyperSearch.items[0].catalogType, 'html');

  // 3. shadcn/ui (primitives paired with interactive demos + multi-file blocks + examples)
  const shadcn = loadRemoteCatalog('shadcn-ui', rootDir);
  assert.equal(shadcn.length, 275, 'shadcn/ui index must contain 275 official v4 components, blocks & examples');
  const accordion = shadcn.find((item) => item.slug === 'accordion');
  assert.ok(accordion, 'shadcn/ui must include core Accordion primitive');
  assert.ok(accordion.demoSourcePath && accordion.demoSourcePath.includes('accordion-demo.tsx'), 'Accordion primitive must be paired with its interactive demo');
  const blocks = shadcn.filter((item) => item.collection === 'Layout Block');
  assert.ok(blocks.length >= 20, `Expected >=20 multi-file shadcn blocks, got ${blocks.length}`);
  const page2 = searchRemoteCatalog(shadcn, { q: '', category: 'all', page: 2, limit: 24 });
  assert.equal(page2.page, 2);
  assert.equal(page2.items.length, 24);
  assert.notEqual(page2.items[0].id, shadcn[0].id);
});

test('AI Instructions queue non-destructively syncs local & workspace templates, parses bulk Markdown/JSON inputs, and imports directly into the UI Library', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const {
    mergeAiTemplateLists,
    syncAiTemplateItems,
    readAiQueueFile,
  } = await import('../tools/ai-queue-store.mjs');
  const {
    UILibraryManager,
    mergeClientAiTemplates,
    extractCodeFromAiPrompt,
    parseBulkAiTemplatesInput,
  } = await import('../js/modules/ui-library.mjs');

  // 1. Non-destructive server/client merge (empty server MUST NOT wipe local templates)
  const localItem = {
    id: 'ai-tpl-local-1',
    name: 'Magnetic Pricing Card',
    targetLibrary: 'Custom',
    prompt: '```tsx\nexport default function MagneticPricingCard() { return <div>$29</div>; }\n```',
    status: 'pending',
    createdAt: Date.now() - 1000,
    updatedAt: Date.now(),
  };
  const merged = mergeAiTemplateLists([localItem], []);
  assert.equal(merged.templates.length, 1);
  assert.equal(merged.recoveredCount, 1);
  assert.equal(merged.templates[0].id, 'ai-tpl-local-1');
  const clientMerged = mergeClientAiTemplates([localItem], []);
  assert.equal(clientMerged.templates.length, 1);
  assert.equal(clientMerged.recoveredCount, 1);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-ai-sync-'));
  const queueFile = path.join(tmpDir, 'ui-library-ai-queue.json');
  try {
    const synced = syncAiTemplateItems(queueFile, [localItem]);
    assert.equal(synced.recoveredCount, 1);
    assert.equal(readAiQueueFile(queueFile).length, 1);
    assert.equal(readAiQueueFile(queueFile)[0].name, 'Magnetic Pricing Card');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // 2. Code extraction (TSX vs HTML) & bulk Markdown/JSON parser
  const extractedTsx = extractCodeFromAiPrompt(localItem.prompt);
  assert.equal(extractedTsx.isHtml, false);
  assert.ok(extractedTsx.code.includes('MagneticPricingCard'));

  const extractedHtml = extractCodeFromAiPrompt('```html\n<section class="p-6 bg-white"><h2>Hello</h2></section>\n```');
  assert.equal(extractedHtml.isHtml, true);
  assert.ok(extractedHtml.renderedHtml.includes('<section'));

  const bulkMd = parseBulkAiTemplatesInput(`
## Neon CTA Button
\`\`\`tsx
export default function NeonCta() { return <button className="px-4 py-2">Go</button>; }
\`\`\`

## Simple Banner
\`\`\`html
<div class="p-4 bg-amber-500 text-black">Launch Live</div>
\`\`\`
  `);
  assert.equal(bulkMd.length, 2);
  assert.equal(bulkMd[0].name, 'Neon CTA Button');
  assert.equal(bulkMd[1].name, 'Simple Banner');

  const bulkJson = parseBulkAiTemplatesInput(JSON.stringify([
    { name: 'Glass Toast', targetLibrary: '21st.dev', prompt: 'export default function GlassToast(){ return <div>Saved</div>; }' },
  ]));
  assert.equal(bulkJson.length, 1);
  assert.equal(bulkJson[0].targetLibrary, '21st.dev');

  // 3. Direct import from AI Instructions into UI Library (offline safe)
  localStorage.clear();
  const prevFetch = globalThis.fetch;
  globalThis.fetch = undefined;
  try {
    const mgr = new UILibraryManager();
    const { item } = await mgr.addAiTemplate({
      name: 'Spotlight Banner',
      targetLibrary: 'Custom',
      prompt: '```html\n<div class="rounded-xl bg-zinc-900 p-6 text-white">Spotlight Ready</div>\n```',
    });
    const imported = await mgr.importAiTemplateToLibrary(item.id);
    assert.equal(imported.element.name, 'Spotlight Banner');
    assert.ok(imported.element.renderedHtml.includes('Spotlight Ready'));
    assert.equal(mgr.aiTemplates.find((t) => t.id === item.id).status, 'imported');
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test('Preview builder emits valid JS for HyperUI paired Light/Dark HTML and Mode 3 TSX sandbox (Kokonut UI & shadcn/ui)', async () => {
  const { buildInteractivePreviewSrcdoc } = await import('../js/modules/ui-preview-builder.mjs');

  // 1. HyperUI paired Light + Dark HTML
  const hyperDoc = buildInteractivePreviewSrcdoc({
    lib: { id: 'hyperui', name: 'HyperUI' },
    element: {
      name: 'Hero Split CTA',
      renderedHtml: '<section class="bg-white text-slate-900"><h1>Light Hero</h1></section>',
      darkRenderedHtml: '<section class="bg-slate-950 text-white"><h1>Dark Hero</h1></section>',
    },
    theme: 'dark',
    animate: true,
  });
  assert.ok(hyperDoc.includes('Dark Hero'), 'Dark mode must initially render paired dark HyperUI markup');
  assert.ok(hyperDoc.includes('Light Hero'), 'HyperUI preview must embed light variant markup for instant theme swap');
  const hyperScripts = [...hyperDoc.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  assert.ok(hyperScripts.length >= 1);
  for (const s of hyperScripts) {
    new Function(s);
  }

  // 2. Mode 3 TSX Sandbox (Kokonut UI & shadcn/ui with extraFiles + demoCode)
  const tsxDoc = buildInteractivePreviewSrcdoc({
    lib: { id: 'shadcn-ui', name: 'shadcn/ui' },
    element: {
      name: 'Accordion',
      sourcePath: 'apps/v4/registry/new-york-v4/ui/accordion.tsx',
      code: `
        import * as React from "react";
        import * as AccordionPrimitive from "@radix-ui/react-accordion";
        export const Accordion = AccordionPrimitive.Root;
        export const AccordionItem = AccordionPrimitive.Item;
        export const AccordionTrigger = AccordionPrimitive.Trigger;
        export const AccordionContent = AccordionPrimitive.Content;
      `,
      demoCode: `
        import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
        export default function AccordionDemo() {
          return (
            <Accordion type="single" collapsible defaultValue="item-1">
              <AccordionItem value="item-1">
                <AccordionTrigger>Is it accessible?</AccordionTrigger>
                <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        }
      `,
    },
    theme: 'dark',
  });
  assert.ok(tsxDoc.includes('/vendor/preview-kit/babel.min.js'), 'Mode 3 TSX sandbox must load local vendored Babel Standalone');
  assert.ok(tsxDoc.includes('/vendor/preview-kit/tailwind-browser.js'), 'Mode 3 TSX sandbox must load local vendored Tailwind CSS v4');
  assert.ok(!tsxDoc.includes('cdn.jsdelivr.net') && !tsxDoc.includes('unpkg.com'), 'Mode 3 TSX sandbox must make zero external CDN calls');
  assert.ok(tsxDoc.includes('resolveModule'), 'Mode 3 TSX sandbox must include module shim resolver');
  assert.ok(tsxDoc.includes('PreviewErrorBoundary'), 'Mode 3 TSX sandbox must include React ErrorBoundary');
  assert.ok(tsxDoc.includes('AccordionDemo'), 'Mode 3 TSX sandbox must prioritize demoCode for live interactive render');

  // Verify every emitted inline <script> inside the TSX sandbox parses cleanly with zero syntax/escape bugs!
  const tsxScripts = [...tsxDoc.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  assert.ok(tsxScripts.length >= 1);
  for (const s of tsxScripts) {
    new Function(s);
  }

  // 3. compactCard miniature grid preview mode (scrollbar-free live card thumbnails)
  const compactDoc = buildInteractivePreviewSrcdoc({
    lib: { id: 'hyperui', name: 'HyperUI' },
    element: {
      name: 'Compact Card',
      renderedHtml: '<div class="p-4 bg-white">Card</div>',
      darkRenderedHtml: '<div class="p-4 bg-slate-900 text-white">Dark Card</div>',
    },
    theme: 'dark',
    animate: false,
    compactCard: true,
  });
  assert.ok(compactDoc.includes('overflow: hidden;'), 'compactCard mode must prevent inner scrollbars on miniature cards');
  assert.ok(!compactDoc.includes('id="wfPreviewToast"'), 'compactCard mode must omit fullscreen toast overlay');

  // 4. Bare 'cn' import & MotionValue React child unwrapping inside TSX sandbox
  assert.ok(tsxDoc.includes("spec === 'cn'"), 'TSX sandbox must resolve bare "cn" module imports');
  assert.ok(tsxDoc.includes('sanitizeMotionChild'), 'TSX sandbox must unwrap MotionValue objects before passing to React.createElement');
  assert.ok(tsxDoc.includes('safeCreateElement'), 'TSX sandbox must inject MotionValue-safe React.createElement');
});

test('agent-activity computes SVG token ring geometry, thresholds, and Lovable turn serialization', () => {
  const zero = computeTokenRingMetrics(0, 32768);
  assert.equal(zero.percent, 0);
  assert.equal(zero.level, 'ok');
  assert.equal(zero.strokeDashoffset, zero.circumference);

  const low = computeTokenRingMetrics(1863, 32768);
  assert.equal(low.percent, 6);
  assert.equal(low.level, 'ok');
  assert.ok(low.strokeDashoffset < low.circumference, 'Non-zero token usage should render a visible ring arc');
  assert.ok(low.detailLabel.includes('32,768 tok'));

  const warn = computeTokenRingMetrics(23000, 32768);
  assert.equal(warn.level, 'warn');

  const crit = computeTokenRingMetrics(29500, 32768);
  assert.equal(crit.level, 'critical');

  const turn = createActivityTurnState({
    turnId: 'turn-test-1',
    mode: 'BUILD',
    prompt: 'Add interactive pricing toggle',
    startedAt: 1700000000000,
  });
  assert.equal(turn.status, 'running');
  assert.equal(turn.steps.length, 1);

  addOrUpdateActivityStep(turn, { key: 'write:App.jsx', label: 'Writing', codeLabel: 'src/App.jsx', status: 'active' });
  addOrUpdateActivityStep(turn, { key: 'write:styles.css', label: 'Writing', codeLabel: 'src/styles.css', status: 'active' });
  assert.equal(turn.steps[1].status, 'done', 'Activating a new step marks the prior active step as done');
  assert.equal(turn.steps[2].status, 'active');

  const runningSummary = buildActivitySummary(turn);
  assert.match(runningSummary.subtitle, /Inspect/);

  finalizeActivityTurn(turn, {
    status: 'done',
    elapsedSec: '4.2',
    tokens: 1420,
    files: [{ path: 'src/App.jsx', added: 24, removed: 3 }],
    checkpointId: 'cp-1',
    hasBeforeFiles: true,
  });
  assert.equal(turn.status, 'done');
  assert.equal(turn.headline, 'Edited 1 file');
  assert.equal(turn.steps[2].status, 'done');

  const encoded = serializeTurnActivity(turn);
  const hydrated = hydrateTurnActivity(encoded);
  assert.equal(hydrated.turnId, 'turn-test-1');
  assert.equal(hydrated.files.length, 1);
  assert.equal(hydrated.checkpointId, 'cp-1');
  assert.equal(hydrateTurnActivity('not-valid-%'), null);
});

test('Newly imported 5 GitHub repository skills and 20-principle UX & Motion skill have expected defaults and prompts', () => {
  localStorage.clear();
  // Simulate existing user storage with only legacy toggles saved
  localStorage.setItem('wf_skills', JSON.stringify({ toggles: { ponytail: false }, custom: [] }));
  const sm = new SkillManager();

  const byId = new Map(sm.skills.map((s) => [s.id, s]));
  assert.equal(byId.get('ponytail')?.enabled, false, 'Preserves existing user toggle customizations');
  assert.equal(byId.get('ux-motion')?.enabled, true);
  assert.equal(byId.get('impeccable')?.enabled, true);
  assert.equal(byId.get('web-design-guidelines')?.enabled, true);
  assert.equal(byId.get('awesome-design-md')?.enabled, false);
  assert.equal(byId.get('chrome-devtools-perf')?.enabled, false);
  assert.equal(byId.get('img2threejs')?.enabled, false);

  assert.equal(byId.get('impeccable')?.source, 'https://github.com/pbakaus/impeccable');
  assert.equal(byId.get('web-design-guidelines')?.source, 'https://github.com/vercel-labs/agent-skills');
  assert.equal(byId.get('awesome-design-md')?.source, 'https://github.com/VoltAgent/awesome-design-md');
  assert.equal(byId.get('chrome-devtools-perf')?.source, 'https://github.com/ChromeDevTools/chrome-devtools-mcp');
  assert.equal(byId.get('img2threejs')?.source, 'https://github.com/img2threejs/img2threejs');

  const uxPrompt = byId.get('ux-motion')?.prompt || '';
  assert.ok(uxPrompt.includes('## 1. Squash and stretch'));
  assert.ok(uxPrompt.includes('## 11. Origin awareness'));
  assert.ok(uxPrompt.includes('## 17. Interruptible motion'));
  assert.ok(uxPrompt.includes('## 18. Fast closing'));
  assert.ok(uxPrompt.includes('## 20. Frequency of use'));
  assert.ok(uxPrompt.includes('## Quick checks before you ship'));

  const compiled = sm.getSystemPrompt();
  assert.ok(compiled.includes('UX & Motion — 20 Principles'));
  assert.ok(compiled.includes('pbakaus/impeccable'));
  assert.ok(compiled.includes('vercel-labs/agent-skills'));
});

test('DESIGN.md presets from VoltAgent/awesome-design-md register with live elements and AI rules', async () => {
  localStorage.clear();
  const { UILibraryManager } = await import('../js/modules/ui-library.mjs');
  const mgr = new UILibraryManager();
  const presets = mgr.getAllLibraries().filter((l) => l.isDesignMdPreset);
  assert.equal(presets.length, 5);
  assert.deepEqual(
    presets.map((p) => p.id),
    ['designmd-linear', 'designmd-stripe', 'designmd-vercel', 'designmd-raycast', 'designmd-supabase']
  );
  for (const preset of presets) {
    assert.equal(preset.source, 'github.com/VoltAgent/awesome-design-md');
    assert.equal(preset.elements.length, 12);
    assert.ok(preset.tokensCss.includes('--wf-accent'));
    assert.ok(Array.isArray(preset.aiRules) && preset.aiRules.length >= 3);
  }
  // Soft-hidden DESIGN.md presets remain resolvable via getLibrary() for existing projects, while setActiveLibrary safely falls back to watermelon-ui
  assert.equal(mgr.getLibrary('designmd-linear')?.archived, true);
  mgr.setActiveLibrary('designmd-linear');
  assert.equal(mgr.getActiveLibrary()?.id, 'watermelon-ui');
});

test('motion.mjs implements rubber banding, capped stagger delays, and origin-aware transform anchoring', async () => {
  const {
    computeRubberBandOffset,
    computeStaggerDelayMs,
    computeTriggerTransformOrigin,
    MOTION_TIMINGS,
  } = await import('../js/modules/motion.mjs');

  assert.equal(computeRubberBandOffset(0, 320), 0);
  const pullSmall = computeRubberBandOffset(40, 320, 0.55);
  const pullLarge = computeRubberBandOffset(400, 320, 0.55);
  assert.ok(pullSmall > 0 && pullSmall < 40, 'Rubber band resists pull immediately');
  assert.ok(pullLarge > pullSmall && pullLarge < 320, 'Rubber band asymptotically approaches container size');
  assert.equal(computeRubberBandOffset(-40, 320, 0.55), -pullSmall, 'Symmetric for negative drag');

  assert.equal(computeStaggerDelayMs(0), 0);
  assert.equal(computeStaggerDelayMs(3, { stepMs: 40, maxTotalMs: 280 }), 120);
  assert.equal(computeStaggerDelayMs(20, { stepMs: 40, maxTotalMs: 280 }), 280, 'Caps stagger to prevent sluggish lists');

  const origin = computeTriggerTransformOrigin(
    { left: 100, top: 80, width: 40, height: 40 },
    { left: 80, top: 60, width: 400, height: 300 }
  );
  assert.equal(origin, '40px 40px');
  assert.ok(MOTION_TIMINGS.FAST_CLOSE_MS < MOTION_TIMINGS.STANDARD_OPEN_MS, 'Fast closing must be shorter than opening');
  assert.ok(MOTION_TIMINGS.PRESS_MS <= MOTION_TIMINGS.DOHERTY_BUDGET_MS, 'Press feedback stays within 100ms Doherty budget');
});

test('computeCardTilt computes clamped 3D perspective angles and specular sheen coordinates', async () => {
  const { computeCardTilt } = await import('../js/modules/motion.mjs');
  const rect = { left: 100, top: 200, width: 200, height: 100 };

  // Center pointer -> neutral 0 deg tilt, 50/50 glow
  const center = computeCardTilt(200, 250, rect, 5);
  assert.deepEqual(center, { rotateX: 0, rotateY: 0, glowX: 50, glowY: 50 });

  // Top-right corner -> positive rotateX (tilts top toward viewer) and positive rotateY
  const topRight = computeCardTilt(300, 200, rect, 5);
  assert.equal(topRight.rotateX, 5);
  assert.equal(topRight.rotateY, 5);
  assert.equal(topRight.glowX, 100);
  assert.equal(topRight.glowY, 0);

  // Far out-of-bounds pointer still clamps cleanly to [-maxTilt, +maxTilt]
  const clamped = computeCardTilt(-999, 999, rect, 4.5);
  assert.equal(clamped.rotateX, -4.5);
  assert.equal(clamped.rotateY, -4.5);
  assert.equal(clamped.glowX, 0);
  assert.equal(clamped.glowY, 100);
});

test('Prompt Studio starter blueprints, prompt compiler, and saved templates CRUD work end-to-end', async () => {
  localStorage.clear();
  const {
    STARTER_BLUEPRINTS,
    DESIGN_MD_PRESETS,
    TYPOGRAPHY_PAIRINGS,
    MOTION_PROFILES,
    INTERACTION_STYLES,
    compilePromptFromSelections,
    loadSavedPromptTemplates,
    savePromptTemplate,
    deletePromptTemplate,
  } = await import('../js/modules/prompt-builder.mjs');

  assert.equal(STARTER_BLUEPRINTS.length, 6);
  assert.equal(DESIGN_MD_PRESETS.length, 5);
  assert.ok(TYPOGRAPHY_PAIRINGS.length >= 5);
  assert.ok(MOTION_PROFILES.length >= 4);
  assert.ok(INTERACTION_STYLES.length >= 4);

  const saasBp = STARTER_BLUEPRINTS.find((b) => b.id === 'saas-launchpad');
  assert.ok(saasBp, 'SaaS Launchpad blueprint must exist');

  const compiled = compilePromptFromSelections(saasBp.selections, {
    activeLibraryName: 'Kokonut UI',
    activeSkills: ['UX & Motion — 20 Principles', 'Impeccable Design Craft'],
  });
  assert.ok(compiled.text.includes('Kinetix Cloud'));
  assert.ok(compiled.text.includes('Linear DESIGN.md'));
  assert.ok(compiled.text.includes('Kokonut UI'));
  assert.ok(compiled.text.includes('UX & Motion — 20 Principles'));
  assert.ok(compiled.text.includes('Audience: Developers & Engineers'));
  assert.ok(compiled.tokens > 80);
  assert.ok(compiled.completenessPct >= 90);

  // Saved templates CRUD
  assert.deepEqual(loadSavedPromptTemplates(), []);
  const saved = savePromptTemplate('My Dark SaaS', saasBp.selections);
  assert.ok(saved && saved.id);
  assert.equal(loadSavedPromptTemplates().length, 1);
  assert.equal(loadSavedPromptTemplates()[0].name, 'My Dark SaaS');

  // Re-saving same name replaces cleanly instead of duplicating
  const updated = savePromptTemplate('my dark saas', { ...saasBp.selections, siteName: 'Kinetix v2' });
  assert.equal(loadSavedPromptTemplates().length, 1);
  assert.equal(loadSavedPromptTemplates()[0].selections.siteName, 'Kinetix v2');

  // Delete template
  assert.equal(deletePromptTemplate(updated.id), true);
  assert.deepEqual(loadSavedPromptTemplates(), []);
});

test('section-swap engine exposes Core 6 slots, 4 AI Freedom levels, DOM slot inference, cross-library matching, and surgical swap prompts', async () => {
  const {
    CORE_SECTION_SLOTS,
    AI_FREEDOM_LEVELS,
    DEFAULT_AI_FREEDOM_LEVEL,
    getFreedomLevelMeta,
    inferSlotFromElement,
    collectLocalSlotCandidates,
    buildFreedomPromptDirective,
    formatSlotSelectionsForPrompt,
    buildSectionSwapPrompt,
  } = await import('../js/modules/section-swap.mjs');
  const { BUILT_IN_UI_LIBRARIES } = await import('../js/modules/ui-library.mjs');

  assert.equal(CORE_SECTION_SLOTS.length, 6);
  assert.deepEqual(
    CORE_SECTION_SLOTS.map((s) => s.id),
    ['navbar', 'hero', 'features', 'cards', 'cta', 'footer']
  );

  assert.equal(AI_FREEDOM_LEVELS.length, 4);
  assert.equal(DEFAULT_AI_FREEDOM_LEVEL, 2);
  assert.equal(getFreedomLevelMeta(1).id, 'strict');
  assert.equal(getFreedomLevelMeta(1).usesTemplates, true);
  assert.equal(getFreedomLevelMeta(4).id, 'max');
  assert.equal(getFreedomLevelMeta(4).usesTemplates, false);

  // DOM-to-slot inference for Inspect Click -> Swap from Library
  assert.equal(inferSlotFromElement({ tag: 'nav', classes: 'site-nav sticky top-0' }), 'navbar');
  assert.equal(inferSlotFromElement({ tag: 'header', classes: 'topbar flex' }), 'navbar');
  assert.equal(inferSlotFromElement({ tag: 'header', classes: 'hero-banner' }), 'hero');
  assert.equal(inferSlotFromElement({ tag: 'h1', text: 'Ship faster with Kinetix' }), 'hero');
  assert.equal(inferSlotFromElement({ tag: 'section', id: 'features-bento', classes: 'bento-grid' }), 'features');
  assert.equal(inferSlotFromElement({ tag: 'article', classes: 'pricing-card' }), 'cards');
  assert.equal(inferSlotFromElement({ tag: 'section', classes: 'newsletter-cta' }), 'cta');
  assert.equal(inferSlotFromElement({ tag: 'footer', classes: 'site-footer' }), 'footer');
  assert.equal(inferSlotFromElement({ tag: 'div', classes: 'misc-wrapper' }), 'custom');

  // Cross-library local matching returns relevant ranked hits
  const navbarHits = collectLocalSlotCandidates(BUILT_IN_UI_LIBRARIES, { slot: 'navbar', libraryFilter: 'all' });
  assert.ok(navbarHits.length >= 4, 'Should match navbar components across built-in libraries');
  const footerHits = collectLocalSlotCandidates(BUILT_IN_UI_LIBRARIES, { slot: 'footer', libraryFilter: 'all' });
  assert.ok(footerHits.length >= 4, 'Should match footer components across built-in libraries');

  // Freedom directives
  const d1 = buildFreedomPromptDirective(1, { hasSlotPicks: true });
  assert.ok(d1.includes('STRICT BLUEPRINT'));
  assert.ok(d1.includes('copy-paste'));
  const d4 = buildFreedomPromptDirective(4);
  assert.ok(d4.includes('PURE DESIGN SYSTEM ONLY'));

  // Mix & Match prompt formatting respects freedom levels
  const sampleSlots = {
    navbar: {
      id: 'hyper-nav-1',
      libraryId: 'hyperui',
      libraryName: 'HyperUI',
      name: 'Sticky Split Navbar',
      code: '<header class="sticky top-0"><nav>Brand</nav></header>',
      description: 'Responsive sticky top navbar',
    },
    footer: {
      id: 'awesome-foot-1',
      libraryId: 'awesome-components',
      libraryName: 'Awesome Components',
      name: 'Minimal 4-Column Footer',
      code: '<footer class="border-t py-12">Links</footer>',
      description: 'Clean directory footer',
    },
  };

  const formattedStrict = formatSlotSelectionsForPrompt(sampleSlots, 1);
  assert.ok(formattedStrict.includes('NAVBAR SLOT — "Sticky Split Navbar" (from HyperUI)'));
  assert.ok(formattedStrict.includes('FOOTER SLOT — "Minimal 4-Column Footer" (from Awesome Components)'));
  assert.ok(formattedStrict.includes('<header class="sticky top-0">'), 'Level 1 must embed verbatim code');

  const formattedCreative = formatSlotSelectionsForPrompt(sampleSlots, 3);
  assert.ok(formattedCreative.includes('Sticky Split Navbar'));
  assert.ok(!formattedCreative.includes('<header class="sticky top-0">'), 'Level 3 should summarize rather than force code');

  assert.equal(formatSlotSelectionsForPrompt(sampleSlots, 4), '', 'Level 4 Pure Design System must omit all template snippets');

  // Surgical section swap prompt compiler
  const swapStrict = buildSectionSwapPrompt({
    targetSlot: 'hero',
    targetLabel: 'Hero section',
    domContext: 'TARGET ELEMENT IN CURRENT PREVIEW: <section class="hero-section"> ("Build faster")',
    candidate: {
      name: 'Aurora Spotlight Hero',
      libraryName: 'Kokonut UI',
      code: 'export function AuroraHero() { return <section>Aurora</section>; }',
    },
    adherence: 'strict',
    customNotes: 'Keep the primary CTA button emerald',
  });
  assert.ok(swapStrict.includes('SURGICAL SECTION SWAP'));
  assert.ok(swapStrict.includes('STRICT COPY-PASTE'));
  assert.ok(swapStrict.includes('TARGET ELEMENT IN CURRENT PREVIEW'));
  assert.ok(swapStrict.includes('Aurora Spotlight Hero'));
  assert.ok(swapStrict.includes('Keep the primary CTA button emerald'));
  assert.ok(swapStrict.includes('export function AuroraHero()'));

  const swapAdapt = buildSectionSwapPrompt({
    targetSlot: 'footer',
    candidate: {
      name: 'Enterprise Directory Footer',
      libraryName: 'HyperUI',
      code: '<footer>Enterprise</footer>',
    },
    adherence: 'adapt',
  });
  assert.ok(swapAdapt.includes('ADAPT TO PROJECT THEME'));
  assert.ok(swapAdapt.includes('Enterprise Directory Footer'));
});

test('pb-wireframes renders crisp SVG architectural thumbnails for all 18 website categories', async () => {
  const { WEBSITE_CATEGORIES, getCategoryWireframeSvg } = await import('../js/modules/pb-wireframes.mjs');

  assert.equal(WEBSITE_CATEGORIES.length, 3);
  const allItems = WEBSITE_CATEGORIES.flatMap((g) => g.items);
  assert.equal(allItems.length, 18);

  for (const item of allItems) {
    const svg = getCategoryWireframeSvg(item.key);
    assert.ok(svg.startsWith('<svg '), `Category "${item.key}" must return a valid <svg> wireframe`);
    assert.ok(svg.includes('</svg>'), `Category "${item.key}" SVG must close cleanly`);
    assert.ok(svg.includes('viewBox="0 0 160 88"'), `Category "${item.key}" SVG must use standard 160x88 viewBox`);
  }

  // Fallback for unknown category key
  const fallback = getCategoryWireframeSvg('non-existent-category');
  assert.ok(fallback.startsWith('<svg '));
});

test('Prompt Studio expanded palettes (14), typography (10), animated motion profiles (6), and Mix & Match AI Freedom compilation work cleanly', async () => {
  const {
    CURATED_PALETTE_KEYS,
    PALETTE_TOKENS,
    TYPOGRAPHY_PAIRINGS,
    MOTION_PROFILES,
    createEmptySelections,
    compilePromptFromSelections,
  } = await import('../js/modules/prompt-builder.mjs');

  assert.equal(CURATED_PALETTE_KEYS.length, 14, 'Should offer 14 curated palettes');
  for (const key of CURATED_PALETTE_KEYS) {
    assert.ok(PALETTE_TOKENS[key], `Missing PALETTE_TOKENS entry for ${key}`);
  }

  assert.equal(TYPOGRAPHY_PAIRINGS.length, 10, 'Should offer 10 typography pairings');
  assert.equal(MOTION_PROFILES.length, 6, 'Should offer 6 motion profiles');
  for (const mp of MOTION_PROFILES) {
    assert.ok(mp.previewKind, `Motion profile ${mp.id} must define previewKind for live animated stage`);
  }

  const baseSel = createEmptySelections();
  assert.equal(baseSel.aiFreedomLevel, 2);
  assert.equal(baseSel.componentMode, 'library');

  // Mix & Match at Level 1 (Strict Blueprint) embeds verbatim slot code + Strict directive
  const mixStrict = compilePromptFromSelections(
    {
      ...baseSel,
      type: 'SaaS Landing Page',
      aesthetic: 'Minimalist & Industrial',
      paletteKey: 'industrial-steel',
      typography: 'bricolage-manrope',
      motionProfile: 'elastic-tactile',
      siteName: 'ForgeGrid',
      aiFreedomLevel: 1,
      componentMode: 'mix',
      slotSelections: {
        navbar: {
          id: 'h-nav',
          libraryId: 'hyperui',
          libraryName: 'HyperUI',
          name: 'Glass Top Header',
          code: '<header class="bg-black text-white">ForgeGrid</header>',
        },
        footer: {
          id: 'a-foot',
          libraryId: 'awesome-components',
          libraryName: 'Awesome Components',
          name: 'Compact Grid Footer',
          code: '<footer class="py-10">ForgeGrid Footer</footer>',
        },
      },
    },
    { activeLibraryName: 'HyperUI', activeSkills: ['UX & Motion — 20 Principles'] }
  );
  assert.ok(mixStrict.text.includes('AI FREEDOM LEVEL 1 — STRICT BLUEPRINT'));
  assert.ok(mixStrict.text.includes('MIX & MATCH SECTION BLUEPRINTS (2 SELECTED SLOTS)'));
  assert.ok(mixStrict.text.includes('Glass Top Header'));
  assert.ok(mixStrict.text.includes('<header class="bg-black text-white">ForgeGrid</header>'));
  assert.ok(mixStrict.text.includes('Compact Grid Footer'));

  // Level 4 (Max Creativity — Pure Design System) omits both active library and Mix & Match templates!
  const pureSystem = compilePromptFromSelections(
    {
      ...baseSel,
      type: 'Portfolio / Agency',
      aesthetic: 'Editorial & Swiss',
      paletteKey: 'swiss-paper',
      typography: 'fraunces-jakarta',
      siteName: 'Studio Vesper',
      aiFreedomLevel: 4,
      componentMode: 'mix',
      slotSelections: {
        navbar: {
          id: 'h-nav',
          libraryId: 'hyperui',
          libraryName: 'HyperUI',
          name: 'Glass Top Header',
          code: '<header>Should be omitted</header>',
        },
      },
    },
    { activeLibraryName: 'HyperUI', activeSkills: [] }
  );
  assert.ok(pureSystem.text.includes('AI FREEDOM LEVEL 4 — MAX CREATIVITY (PURE DESIGN SYSTEM ONLY)'));
  assert.ok(!pureSystem.text.includes('UI Component Library: HyperUI'), 'Level 4 must omit active UI library reference');
  assert.ok(!pureSystem.text.includes('Should be omitted'), 'Level 4 must omit Mix & Match template code');
});

test('Watermelon UI catalog loads all 849 real runtime items, searches, and computes category counts', async () => {
  const { loadRemoteCatalog, searchRemoteCatalog } = await import('../tools/github-catalogs.mjs');
  const { computeCategoryCounts } = await import('../tools/awesome-components.mjs');
  const catalog = loadRemoteCatalog('watermelon-ui', process.cwd());
  assert.equal(catalog.length, 849, 'Watermelon UI catalog must expose all 849 official ui.watermelon.sh items');

  const counts = computeCategoryCounts(catalog);
  assert.equal(counts.all, 849);
  const summed = Object.entries(counts)
    .filter(([k]) => k !== 'all')
    .reduce((acc, [, v]) => acc + v, 0);
  assert.equal(summed, 849, 'Watermelon category counts must sum to 849');

  const cards = searchRemoteCatalog(catalog, { q: 'card', category: 'all', page: 1, limit: 24 }, 'watermelon-ui');
  assert.ok(cards.total > 20, `Expected >20 Watermelon UI card components, got ${cards.total}`);
  assert.equal(cards.items.length, Math.min(24, cards.total));
  assert.ok(
    cards.items.every((it) => it.previewRuntime === 'watermelon-vite' && typeof it.previewUrl === 'string' && it.previewUrl.includes('/vendor/watermelon-runtime/wf-preview.html')),
    'Every Watermelon UI item must point to the local Watermelon Vite preview runtime'
  );
});

test('Prompt Studio supports multi-select motionProfiles[] and chat component attachment formatting', async () => {
  const { createEmptySelections, compilePromptFromSelections } = await import('../js/modules/prompt-builder.mjs');
  const { formatAttachedComponentsForPrompt } = await import('../js/modules/section-swap.mjs');

  const sel = createEmptySelections();
  const compiled = compilePromptFromSelections({
    ...sel,
    type: 'SaaS Landing Page',
    aesthetic: 'Minimalist & Industrial',
    paletteKey: 'obsidian-amber',
    typography: 'inter-mono',
    motionProfiles: ['expressive-20', 'kinetic-stagger'],
    siteName: 'KineticForge',
  });
  assert.ok(compiled.text.includes('Profile: Expressive + Kinetic Stagger Cascade'), 'Must emit concrete combined motion profiles');
  assert.ok(compiled.text.includes('scale(0.97)'), 'Must expand Expressive into concrete press scale rule');
  assert.ok(compiled.text.includes('36ms'), 'Must expand stagger timing into concrete ms rule');

  assert.equal(formatAttachedComponentsForPrompt([]), '');
  const formatted = formatAttachedComponentsForPrompt([
    {
      name: 'Fluid Tabs',
      libraryName: 'Watermelon UI',
      category: 'navigation',
      description: 'Spring-animated indicator tabs',
      code: 'export function FluidTabs() { return <nav>Tabs</nav>; }',
    },
    {
      name: 'Hero Split',
      libraryName: 'HyperUI',
      category: 'hero',
      code: '<section class="py-16">Hero</section>',
    },
  ]);
  assert.ok(formatted.includes('ATTACHED UI COMPONENTS (2 USER-SELECTED REFERENCES):'));
  assert.ok(formatted.includes('"Fluid Tabs" (from Watermelon UI'));
  assert.ok(formatted.includes('```tsx'));
  assert.ok(formatted.includes('"Hero Split" (from HyperUI'));
  assert.ok(formatted.includes('```html'));
});

test('Hardened URL and GitHub parsers reject spoofed hosts, path traversal, and unsafe protocols', () => {
  assert.equal(unwrapDuckDuckGoUrl('//duckduckgo.com/l/?uddg=javascript%3Aalert(1)'), '');
  assert.equal(unwrapDuckDuckGoUrl('javascript:alert(1)'), '');
  assert.equal(unwrapDuckDuckGoUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(unwrapDuckDuckGoUrl('https://ui.watermelon.sh/cli'), 'https://ui.watermelon.sh/cli');

  assert.equal(parseGitHubSkillTarget('https://evil.com/github.com/owner/repo'), null);
  assert.equal(parseGitHubSkillTarget('https://github.com/owner/repo/blob/main/../../etc/passwd'), null);
  assert.equal(parseGitHubSkillTarget('../bad/repo'), null);
  assert.deepEqual(parseGitHubSkillTarget('https://github.com/watermelontools/watermelon-ui'), {
    owner: 'watermelontools',
    repo: 'watermelon-ui',
    branch: '',
    filePath: '',
    kind: 'repo',
  });
});

test('Watermelon UI 5-collection official catalog filters by collection/subCategory/blockCategory and resolves offline consolidated details', async () => {
  const {
    WATERMELON_COLLECTIONS,
    WATERMELON_BLOCK_CATEGORIES,
    computeWatermelonCounts,
    prioritizeBlocksFirst,
    mapAssemblerBlocksToSlots,
    buildPageAssemblerBlueprint,
    buildWatermelonPromptBlueprint,
    buildWatermelonStarterVfs,
  } = await import('../js/modules/watermelon-ecosystem.mjs');
  const {
    loadRemoteCatalog,
    searchRemoteCatalog,
    fetchRemoteComponentDetail,
  } = await import('../tools/github-catalogs.mjs');

  assert.equal(WATERMELON_COLLECTIONS.length, 6, 'Must expose All + 5 official Watermelon collections (Animated, Components, Blocks, Dashboards, Templates)');
  assert.deepEqual(
    WATERMELON_COLLECTIONS.map((c) => c.id),
    ['all', 'animated', 'components', 'blocks', 'dashboards', 'templates']
  );
  assert.equal(WATERMELON_BLOCK_CATEGORIES.length, 23, 'Must expose All Blocks + 22 canonical Block categories');

  const items = loadRemoteCatalog('watermelon-ui', process.cwd());
  assert.equal(items.length, 849, `Expected 849 real Watermelon items, got ${items.length}`);

  const { collectionCounts, blockCategoryCounts } = computeWatermelonCounts(items);
  assert.equal(collectionCounts.all, 849);
  assert.equal(collectionCounts.animated, 131);
  assert.equal(collectionCounts.components, 516);
  assert.equal(collectionCounts.blocks, 189);
  assert.equal(collectionCounts.dashboards, 12);
  assert.equal(collectionCounts.templates, 1);
  assert.ok(blockCategoryCounts.hero >= 10, `Expected >=10 hero blocks, got ${blockCategoryCounts.hero}`);
  assert.ok(blockCategoryCounts.footer >= 5, `Expected >=5 footer blocks, got ${blockCategoryCounts.footer}`);

  // Collection, subCategory & block category filtering via searchRemoteCatalog
  const dashRes = searchRemoteCatalog(items, { collection: 'dashboards', page: 1, limit: 30 }, 'watermelon-ui');
  assert.equal(dashRes.total, 12);
  assert.ok(dashRes.items.every((it) => it.wfCollection === 'dashboards' && it.previewRuntime === 'watermelon-vite'));
  assert.equal(dashRes.collectionCounts.dashboards, 12);

  const tplRes = searchRemoteCatalog(items, { collection: 'templates', page: 1, limit: 10 }, 'watermelon-ui');
  assert.equal(tplRes.total, 1);
  assert.equal(tplRes.items[0].wfCollection, 'templates');

  const compRes = searchRemoteCatalog(items, { collection: 'components', page: 1, limit: 24 }, 'watermelon-ui');
  assert.equal(compRes.total, 516);
  assert.ok(compRes.subCategoryCounts && Object.keys(compRes.subCategoryCounts).length > 5, 'Components must expose subCategoryCounts');
  const firstSub = Object.keys(compRes.subCategoryCounts).find((k) => k !== 'all');
  const subFiltered = searchRemoteCatalog(items, { collection: 'components', subCategory: firstSub, page: 1, limit: 24 }, 'watermelon-ui');
  assert.equal(subFiltered.total, compRes.subCategoryCounts[firstSub]);
  assert.ok(subFiltered.items.every((it) => it.subCategory === firstSub));

  const heroBlocksRes = searchRemoteCatalog(items, { collection: 'blocks', blockCategory: 'hero', page: 1, limit: 24 }, 'watermelon-ui');
  assert.ok(heroBlocksRes.total >= 10);
  assert.ok(heroBlocksRes.items.every((it) => it.wfCollection === 'blocks' && it.blockCategory === 'hero'));

  // Blocks First ranking
  const mixed = [
    { id: 'c1', name: 'Button', wfCollection: 'components', libraryId: 'watermelon-ui' },
    { id: 'a1', name: 'Motion Dock', wfCollection: 'animated', libraryId: 'watermelon-ui' },
    { id: 'b1', name: 'Hero Split Block', wfCollection: 'blocks', libraryId: 'watermelon-ui' },
  ];
  const ranked = prioritizeBlocksFirst(mixed);
  assert.equal(ranked[0].id, 'b1', 'Blocks must be ranked first ahead of primitives and animated items');

  // Offline consolidated detail resolution from data/watermelon-ui-details.json
  const animItem = items.find((it) => it.wfCollection === 'animated');
  const animDetail = await fetchRemoteComponentDetail('watermelon-ui', animItem, process.cwd());
  assert.equal(animDetail.id, animItem.id);
  assert.ok((animDetail.code || '').length > 50, 'Consolidated details must include full TSX source code');
  assert.ok((animDetail.prompt || '').length > 40, 'Consolidated details must include AI prompt');

  // Page Assembler slot mapping & prompt blueprint formatting
  const sampleBlocks = [
    { id: 'nav-1', name: 'Navbar Glass', blockCategory: 'navigation', category: 'navigation', code: 'export function Nav() { return <header />; }' },
    { id: 'hero-1', name: 'Hero Split', blockCategory: 'hero', category: 'hero', code: 'export function Hero() { return <section />; }' },
    { id: 'footer-1', name: 'Footer 01', blockCategory: 'footer', category: 'footer', code: 'export function Footer() { return <footer />; }' },
  ];
  const mappedSlots = mapAssemblerBlocksToSlots(sampleBlocks);
  assert.equal(mappedSlots.navbar.name, 'Navbar Glass');
  assert.equal(mappedSlots.hero.name, 'Hero Split');
  assert.equal(mappedSlots.footer.name, 'Footer 01');

  const blueprint = buildPageAssemblerBlueprint(sampleBlocks);
  assert.ok(blueprint.includes('Watermelon UI Page Blueprint (3 Ordered Blocks)'));
  assert.ok(blueprint.includes('## 1. [NAVIGATION] Navbar Glass'));
  assert.ok(blueprint.includes('## 2. [HERO] Hero Split'));
  assert.ok(blueprint.includes('## 3. [FOOTER] Footer 01'));

  // Dashboard starter VFS + Prompt Studio blueprint
  const sampleDash = dashRes.items[0];
  const dashVfs = buildWatermelonStarterVfs(sampleDash);
  assert.ok(dashVfs['src/main.jsx'] && dashVfs['src/App.jsx'] && dashVfs['src/index.css'], 'Starter VFS must contain src/main.jsx, src/App.jsx, and src/index.css');
  assert.ok(dashVfs['src/App.jsx'].includes('export default function App'));

  const dashBp = buildWatermelonPromptBlueprint(sampleDash);
  assert.equal(dashBp.category, 'Watermelon Dashboard');
  assert.ok(dashBp.selections.siteName.length > 0);
});

test('39. TSX Sandbox: synthesizeTsxSampleProps prevents undefined prop crashes (AaveSwapComponent) & all UI dependency shims compile cleanly', async () => {
  const { synthesizeTsxSampleProps, buildTsxSandboxScript } = await import('../js/modules/ui-tsx-sandbox.mjs');

  const aaveSwapTsx = `
    import React from "react";
    export interface TokenConfig {
      name: string;
      symbol: string;
      priceUSD: number;
      max?: number;
      logo: string;
    }
    export interface AaveSwapComponentProps {
      from: TokenConfig;
      to: TokenConfig;
      onSwap?: (fromAmount: number, toAmount: number) => void;
    }
    export function AaveSwapComponent({ from, to, onSwap }: AaveSwapComponentProps) {
      return <div>{from.symbol} {from.priceUSD} -&gt; {to.symbol} {to.priceUSD}</div>;
    }
  `;

  const synth = synthesizeTsxSampleProps(aaveSwapTsx);
  assert.ok(synth.props.from, 'Must synthesize required "from" TokenConfig prop');
  assert.ok(synth.props.to, 'Must synthesize required "to" TokenConfig prop');
  assert.equal(typeof synth.props.from.priceUSD, 'number');
  assert.ok(synth.props.from.priceUSD > 0, 'from.priceUSD must be positive');
  assert.equal(typeof synth.props.to.priceUSD, 'number');
  assert.ok(synth.props.to.priceUSD > 0, 'to.priceUSD must be positive');
  assert.notEqual(synth.props.from.symbol, synth.props.to.symbol, 'from and to tokens should be distinct presets');
  assert.ok(String(synth.props.from.logo).startsWith('data:image/svg+xml'), 'logo must be an inline SVG data URI');
  assert.ok(synth.callbackNames.includes('onSwap'), 'Must detect callback prop onSwap');

  // Verify default prop values are NOT overwritten
  const withDefaultTsx = `
    interface CardProps { title?: string; items: { id: string; label: string }[]; }
    export function MyWidget({ title = "Custom Default", items }: CardProps) {
      return <div>{title} {items.length}</div>;
    }
  `;
  const synth2 = synthesizeTsxSampleProps(withDefaultTsx);
  assert.equal('title' in synth2.props, false, 'Must preserve component default prop value for title');
  assert.ok(Array.isArray(synth2.props.items) && synth2.props.items.length === 3, 'Must synthesize 3-item typed array');

  // Verify generated sandbox script is syntactically valid JS and embeds all critical dependency shims
  const scriptHtml = buildTsxSandboxScript({
    code: aaveSwapTsx,
    sourcePath: 'components/aave-swap.tsx',
    name: 'Aave Swap Component',
  });
  const jsBody = scriptHtml.replace(/^<script>\s*/, '').replace(/\s*<\/script>$/, '');
  assert.doesNotThrow(() => new Function(jsBody), 'Generated sandbox script must be syntactically valid JS');

  const requiredShims = [
    'radix-ui',
    '@base-ui/react',
    'recharts',
    'react-use-measure',
    'zod',
    'react-hook-form',
    'useSidebar',
    '@dnd-kit/core',
    'date-fns',
    'react-day-picker',
    '@aliimam/icons',
    'resolveRelativePath',
    'buildInitialProps',
  ];
  for (const token of requiredShims) {
    assert.ok(jsBody.includes(token), `Sandbox script must include shim/support for ${token}`);
  }
});

test('Prompt Studio Audit Fixes: WCAG AA contrast on all 19 presets, compatibility matrix, conflict-free motion, 10 slots, and 12-section Master Prompt compiler', async () => {
  const {
    PALETTE_TOKENS,
    createEmptySelections,
    compilePromptFromSelections,
  } = await import('../js/modules/prompt-builder.mjs');
  const {
    DEFAULT_TECH_FEATURES,
    DEFAULT_DO_NOT_LIST,
    UNIFIED_SECTION_CATALOG,
    auditPaletteContrast,
    resolveMotionProfileToggle,
    validatePromptSelections,
  } = await import('../js/modules/prompt-validator.mjs');
  const { MIX_MATCH_SECTION_SLOTS } = await import('../js/modules/section-swap.mjs');

  // 1. Every single one of the 19 palettes + its paired lightTokens/darkTokens must pass WCAG AA (>= 4.5:1)
  const paletteEntries = Object.entries(PALETTE_TOKENS);
  assert.equal(paletteEntries.length, 19, 'Expected 19 palette presets (14 curated + 5 DESIGN.md)');
  for (const [key, pal] of paletteEntries) {
    const audit = auditPaletteContrast(pal);
    assert.equal(
      audit.passes,
      true,
      `Palette "${key}" failed WCAG AA contrast: ${audit.failures.join(', ')}`
    );
    const paired = pal.lightTokens || pal.darkTokens;
    assert.ok(paired, `Palette "${key}" must define paired lightTokens or darkTokens for Dark/Light toggle`);
    const pairedAudit = auditPaletteContrast(paired);
    assert.equal(
      pairedAudit.passes,
      true,
      `Paired theme tokens for "${key}" failed WCAG AA contrast: ${pairedAudit.failures.join(', ')}`
    );
  }

  // 2. Clean empty defaults: no hidden Obsidian Amber leak, no hidden skills, Code Standards ON by default
  const empty = createEmptySelections();
  assert.equal(empty.paletteKey, '', 'Empty selections must not default to obsidian-amber');
  assert.deepEqual(empty.selectedSkills, [], 'Empty selections must not have hidden active skills');
  assert.deepEqual(empty.techFeatures, [...DEFAULT_TECH_FEATURES], 'WCAG AA, Semantic HTML5, CSS Vars must be ON by default');
  assert.equal(empty.doNotList, DEFAULT_DO_NOT_LIST);
  assert.equal(empty.motionLibrary, 'css-only');
  assert.equal(empty.outputFormat, 'single-file');
  assert.equal(empty.deliveryMode, 'full-one-shot');

  // 3. Expanded 10 Mix & Match slots include Benchmark, Pricing, Proof, FAQ
  assert.equal(MIX_MATCH_SECTION_SLOTS.length, 10);
  const slotIds = MIX_MATCH_SECTION_SLOTS.map((s) => s.id);
  for (const needed of ['navbar', 'hero', 'features', 'cards', 'benchmark', 'pricing', 'proof', 'faq', 'cta', 'footer']) {
    assert.ok(slotIds.includes(needed), `MIX_MATCH_SECTION_SLOTS must include "${needed}"`);
  }

  // 4. Motion conflict resolution prevents contradictory picks
  const m1 = resolveMotionProfileToggle(['expressive-20'], 'refined-minimal');
  assert.deepEqual(m1.nextIds, ['refined-minimal']);
  assert.ok(m1.conflictNote.includes('incompatible'));

  const m2 = resolveMotionProfileToggle(['expressive-20', 'kinetic-stagger'], 'zero-motion');
  assert.deepEqual(m2.nextIds, ['zero-motion']);
  assert.ok(m2.conflictNote.includes('replaces'));

  const m3 = resolveMotionProfileToggle(['expressive-20'], 'kinetic-stagger');
  assert.deepEqual(m3.nextIds, ['expressive-20', 'kinetic-stagger']);
  assert.equal(m3.conflictNote, '');

  // 5. Compatibility Matrix catches all cross-step conflicts
  const conflictVal = validatePromptSelections({
    ...empty,
    type: 'E-Commerce / Online Store',
    designSystemId: 'designmd-linear',
    paletteKey: 'designmd-linear',
    style: 'Corporate and Professional',
    content: 'Editorial broadsheet multi-column grid with hairline rules',
    motionProfiles: ['expressive-20', 'refined-minimal'],
    aiFreedomLevel: 1,
    slotSelections: {},
    siteName: 'Kinetix Cloud',
    siteTagline: 'Deploy edge workflows in under 200ms',
    siteDescription: 'Zero-config edge orchestration, live telemetry, instant rollbacks for developers',
    audience: 'Developers & Engineers',
    enabledSections: ['bento-arch'],
  });

  const warnIds = conflictVal.warnings.map((w) => w.id);
  assert.equal(conflictVal.l1AutoDowngraded, true);
  assert.ok(warnIds.includes('l1-no-source'), 'Must flag L1 Strict without component source');
  assert.ok(warnIds.includes('category-brief-mismatch'), 'Must flag E-Commerce vs developer SaaS brief');
  assert.ok(warnIds.includes('motion-conflict'), 'Must flag Expressive + Refined motion conflict');
  assert.ok(warnIds.includes('corporate-dev-mismatch'), 'Must flag Corporate + Developer/Linear mismatch');
  assert.ok(warnIds.includes('layout-bento-conflict'), 'Must flag Bento section vs Broadsheet rhythm without secondary layout');
  const catWarn = conflictVal.warnings.find((w) => w.id === 'category-brief-mismatch');
  assert.equal(catWarn.suggestedCategory, 'SaaS / Landing Page');

  // 6. Master Prompt Compiler emits all 12 structured sections + L1 auto-downgrade + Light tokens + deduplicated configs
  const master = compilePromptFromSelections(
    {
      ...empty,
      type: 'SaaS / Landing Page',
      designSystemId: 'designmd-linear',
      paletteKey: 'designmd-linear',
      typographyId: 'inter-mono',
      fontPref: 'Inter for UI and headings, JetBrains Mono for code and metrics',
      header: 'Fixed top navigation bar',
      hero: 'Full-screen hero with centered headline',
      content: 'Card-based grid layout',
      secondaryLayout: 'Hairline-ruled columns elsewhere',
      spacing: 'Balanced modern spacing (80-96px section rhythm)',
      footer: 'Multi-column footer with navigation and contact',
      motionLibrary: 'css-only',
      motionProfiles: ['expressive-20'],
      aiFreedomLevel: 1,
      slotSelections: {},
      outputFormat: 'single-file',
      deliveryMode: 'phased',
      siteName: 'Kinetix Cloud',
      siteTagline: 'Deploy edge workflows in under 200ms',
      siteDescription: 'Zero-config edge orchestration, live telemetry, instant rollbacks',
      audience: 'Developers & Engineers',
      siteTone: 'Technical and concise',
      enabledSections: ['benchmark', 'bento-arch', 'pricing', 'proof', 'faq', 'newsletter', 'dark-light'],
      features: ['Dark / Light mode toggle', 'Pricing table section', 'FAQ accordion section', 'Newsletter subscription form'],
      sectionConfigs: {
        benchmark: {
          rows: '6 rows',
          sampleData: 'Kinetix Edge p50 118ms / p99 187ms; Typical container 640ms / 1.9s',
          filterChips: 'us-east, eu-west, ap-south + workflow search',
        },
        pricing: {
          tiers: 'Free $0 / Team $29 per seat per month / Enterprise custom',
          billingToggle: 'Monthly/annual toggle with a sliding indicator',
        },
        faq: {
          count: '6 items',
          a11y: 'Accessible accordion (button + aria-expanded)',
        },
        newsletter: {
          behavior: 'Client email validation, inline error and success text, no network call, labelled "demo"',
        },
      },
      customSections: 'Pricing, FAQ, Live Status Map',
    },
    { activeLibraryName: 'Kokonut UI', activeSkills: [] }
  );

  for (const heading of [
    'ROLE',
    'BRAND',
    'RESOLUTION RULES',
    'FREEDOM LEVEL',
    'DESIGN TOKENS',
    'LAYOUT',
    'MOTION',
    'SECTIONS AND DATA',
    'ENGINEERING',
    'DO NOT',
    'DELIVERY',
    'SELF-CHECK',
  ]) {
    assert.ok(master.text.includes(heading), `Master prompt must contain "${heading}" section`);
  }

  // L1 auto-downgrade guardrail when no component source is attached
  assert.ok(master.text.includes('style reference'), 'L1 without source must downgrade to style reference');
  assert.ok(!master.text.includes('copy-paste their exact HTML'), 'L1 without source must not instruct verbatim copy-paste');

  // Contrast-checked Linear tokens + paired Light theme tokens
  assert.ok(master.text.includes('--accent-text #8B93E8'), 'Must include text-safe Linear accent-text token');
  assert.ok(master.text.includes('Paired light theme (:root[data-theme="light"]):'), 'Dark/Light toggle must emit paired Light theme token set');

  // Concrete motion specs, zero vague phrases
  assert.ok(master.text.includes('scale(0.97)'), 'Must emit concrete press rule');
  assert.ok(master.text.includes('prefers-reduced-motion: reduce'), 'Must emit reduced-motion rule');
  assert.ok(!master.text.includes('zero clutter'), 'Must not leak vague phrase "zero clutter"');

  // Deduplicated sections & expanded configs (Pricing & FAQ must NOT duplicate from customSections)
  assert.ok(master.text.includes('Kinetix Edge p50 118ms / p99 187ms'));
  assert.ok(master.text.includes('Free $0 / Team $29 per seat per month / Enterprise custom'));
  assert.ok(master.text.includes('Live Status Map'), 'Non-duplicate custom section must be preserved');
  assert.equal((master.text.match(/Pricing:/g) || []).length, 1, 'Pricing must appear once without duplication');

  // Phased delivery mode for <30B models
  assert.ok(master.text.includes('Mode: PHASED'));
  assert.ok(UNIFIED_SECTION_CATALOG.length >= 10);
});

test('Restraint Design skill is enabled by default and WebForge chrome respects Three-Tier hard limits', async () => {
  localStorage.clear();
  const sm = new SkillManager();
  const restraint = sm.skills.find((s) => s.id === 'restraint-design');
  assert.ok(restraint, 'restraint-design built-in skill must exist');
  assert.equal(restraint.enabled, true, 'restraint-design skill must be enabled by default');
  const compiled = sm.getSystemPrompt();
  assert.ok(compiled.includes('THE THREE TIERS') || compiled.includes('The Three Tiers'));
  assert.ok(compiled.includes('Hard Limits'));

  const fsMod = await import('node:fs');
  const pathMod = await import('node:path');
  const html = fsMod.readFileSync(pathMod.resolve('index.html'), 'utf8');
  // Home sidebar nav has at most 5 links
  const homeNavMatch = html.match(/<nav class="home-nav">([\s\S]*?)<\/nav>/);
  assert.ok(homeNavMatch);
  const homeNavCount = (homeNavMatch[1].match(/class="home-nav-item/g) || []).length;
  assert.ok(homeNavCount <= 5, `Home nav must have <= 5 links, got ${homeNavCount}`);

  // No duplicate Home UI Library pill or duplicate New Project button
  assert.ok(!html.includes('id="btnHeroUiCatalog"'));
  assert.ok(!html.includes('id="btnHomeQuickUiLib"'));
  assert.ok(html.includes('id="btnNewProjectHome"'), 'New project lives pinned in sidebar footer');
  assert.ok(!html.includes('id="btnNewProjectHomeGrid"'), 'No duplicate New project button in projects grid header');

  // Status indicator starts empty and hidden (never "Ready" or "Idle")
  assert.ok(html.includes('id="statusInfo"') && !html.includes('id="statusInfo">Ready<'));

  // Tier 3 overflow menus preserve all controls without deleting any feature
  assert.ok(html.includes('id="topbarMoreMenu"'));
  assert.ok(html.includes('id="btnCommandPalette"'));
  assert.ok(html.includes('id="btnOpenSettings"'));
  assert.ok(html.includes('id="wsToolbarMoreMenu"'));
  assert.ok(html.includes('id="previewDeviceBtns"'));
  assert.ok(html.includes('id="btnRefreshPreview"'));
  assert.ok(html.includes('id="btnNewTabPreview"'));
  assert.ok(html.includes('id="btnExportHtml"'));
});

test('Full-page Cherry Studio Settings replaces modals, exports all 11 shared primitives, enforces nav limits, and preserves storage keys', async () => {
  localStorage.clear();
  const fsMod = await import('node:fs');
  const pathMod = await import('node:path');
  const html = fsMod.readFileSync(pathMod.resolve('index.html'), 'utf8');
  const settingsCss = fsMod.readFileSync(pathMod.resolve('css/settings.css'), 'utf8');

  // 1. Legacy modals and decorative bridge completely removed; full-page container + popover present
  assert.ok(!html.includes('id="settingsModal"'), 'Old settingsModal must be completely removed');
  assert.ok(!html.includes('id="systemDrawerModal"'), 'Old systemDrawerModal must be completely removed');
  assert.ok(!html.includes('id="skillPromptModal"'), 'Old skillPromptModal must be completely removed');
  assert.ok(!html.includes('id="wfAiConnectBridge"'), 'Decorative connection diagram must be removed');
  assert.ok(!html.includes('data-theme-toggle'), 'Theme toggle must live only in Settings > Appearance');
  assert.ok(html.includes('id="settingsView"'), 'Full-page settingsView container must exist');
  assert.ok(html.includes('id="homeModelPopover"'), 'Top-right model chip quick-switch popover must exist');
  assert.ok(html.includes('id="btnHomeManageProviders"'), 'Manage providers link must exist in model popover');

  // 2. Zero hardcoded hex colors in settings.css
  assert.equal(/#[0-9a-fA-F]{3,8}\b/.test(settingsCss), false, 'css/settings.css must use CSS tokens only (zero hex values)');

  // 3. Shared primitives & navigation data
  const settingsMod = await import('../src/components/settings/index.mjs');
  for (const name of [
    'SettingsLayout',
    'SettingsNav',
    'SettingsPage',
    'SettingsCard',
    'SettingsRow',
    'ListPane',
    'ListItem',
    'Switch',
    'ModelSelect',
    'SecretInput',
    'EmptyState',
    'SettingsController',
  ]) {
    assert.equal(typeof settingsMod[name], 'function', `Expected ${name} to be exported from src/components/settings/index.mjs`);
  }

  const {
    SETTINGS_NAV_GROUPS,
    resolveSettingsRoute,
    filterNavGroups,
    groupModelsByFamily,
  } = await import('../src/components/settings/settings-data.mjs');

  assert.equal(SETTINGS_NAV_GROUPS.length, 4, 'Must have 4 nav groups (Models, Build, Preferences, System)');
  for (const group of SETTINGS_NAV_GROUPS) {
    assert.ok(group.items.length <= 6, `Nav group ${group.label} exceeds 6 item limit`);
  }
  assert.equal(resolveSettingsRoute('/settings/model-provider'), 'model-provider');
  assert.equal(resolveSettingsRoute('/settings/skills'), 'skills');
  assert.equal(resolveSettingsRoute('/settings/unknown-page'), 'model-provider');
  const filtered = filterNavGroups(SETTINGS_NAV_GROUPS, 'appearance');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].items[0].id, 'appearance');

  // 4. Model family grouping & capability inference
  const { inferModelCapabilities } = await import('../js/modules/providers.mjs');
  const caps = inferModelCapabilities({ id: 'openai/o3-mini', name: 'OpenAI o3-mini' });
  assert.equal(caps.reasoning, true);
  const grouped = groupModelsByFamily([
    { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet' },
    { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  ]);
  assert.ok(grouped.some((g) => g.label === 'Anthropic' && g.models.length === 2));
  assert.ok(grouped.some((g) => g.label === 'Google' && g.models.length === 1));

  // 5. Multi-provider persistence in unchanged wf_provider storage key
  const provider = new AIProvider();
  const custom = provider.addCustomProvider({ name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', apiKey: 'gsk_test' });
  assert.ok(custom.id);
  provider.addManualModel(custom.id, { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', contextLength: 131072 });
  provider.setRoleModel('build', 'llama-3.3-70b-versatile', custom.id);
  provider.setRoleModel('quick', 'llama-3.3-70b-versatile', custom.id);

  // Verify reloaded provider reads identical wf_provider key cleanly
  const rawStored = JSON.parse(localStorage.getItem('wf_provider'));
  assert.equal(rawStored.type, custom.id);
  assert.equal(rawStored.model, 'llama-3.3-70b-versatile');
  const reloaded = new AIProvider();
  assert.equal(reloaded.type, custom.id);
  assert.equal(reloaded.model, 'llama-3.3-70b-versatile');
  assert.equal(reloaded.getAllAvailableModels().some((m) => m.id === 'llama-3.3-70b-versatile'), true);

  // 6. Skill inline prompt autosave preserves wf_skills
  const sm = new SkillManager();
  const addedSkill = sm.importFromText('Clean Code', 'Keep files crisp', 'Write clean modular code.');
  const updatedSkill = sm.updateSkill(addedSkill.id, { prompt: 'Updated modular rule.' });
  assert.equal(updatedSkill?.prompt, 'Updated modular rule.');
  const reloadedSm = new SkillManager();
  assert.equal(reloadedSm.skills.find((s) => s.id === addedSkill.id)?.prompt, 'Updated modular rule.');
});

test('UI Component Library Studio cleanup, offline Preview Kit, normalizer, verification cache, safe attach, export, and manifest schema (Steps 1-7)', async () => {
  localStorage.clear();
  const fsMod = await import('node:fs');
  const osMod = await import('node:os');
  const pathMod = await import('node:path');

  const {
    WATERMELON_ONLY_MODE,
    HIDE_OTHER_SOURCES,
    HARD_DELETE,
    KEEP_INDEXED_LIBRARY_IDS,
    PREFERRED_FALLBACK_LIBRARY_ID,
    VERIFICATION_STATUS,
    FAILURE_REASON_CODES,
    PREVIEW_KIT_MANIFEST,
    resolveLockedPackageVersion,
    createLibraryManifest,
  } = await import('../js/modules/ui-library-schema.mjs');
  const { UILibraryManager } = await import('../js/modules/ui-library.mjs');
  const { normalizeComponentRecord, applyNormalizationAutoFix } = await import('../js/modules/ui-normalizer.mjs');
  const {
    getPreviewKitStatus,
    loadVerificationCache,
    saveVerificationCache,
    getCachedVerification,
    setCachedVerification,
    filterCatalogByVerification,
  } = await import('../tools/preview-kit-store.mjs');
  const { formatAttachedComponentsForPrompt } = await import('../js/modules/section-swap.mjs');
  const { buildProjectExportFiles } = await import('../js/modules/zip-export.mjs');

  // Step 1: Switches & visible library cleanup + soft-hide auto-fallback (Watermelon UI exclusive focus)
  assert.equal(WATERMELON_ONLY_MODE, true);
  assert.equal(HIDE_OTHER_SOURCES, true);
  assert.equal(HARD_DELETE, false);
  assert.equal(PREFERRED_FALLBACK_LIBRARY_ID, 'watermelon-ui');
  assert.deepEqual(KEEP_INDEXED_LIBRARY_IDS, [
    'awesome-components',
    'kokonut-ui',
    'hyperui',
    'watermelon-ui',
    'shadcn-ui',
  ]);

  localStorage.setItem('wf_active_ui_library', 'designmd-linear');
  const mgr = new UILibraryManager();
  const visible = mgr.getVisibleLibraries();
  assert.deepEqual(
    visible.map((l) => l.id),
    ['watermelon-ui'],
    'Visible libraries must expose only watermelon-ui when WATERMELON_ONLY_MODE is enabled'
  );
  assert.equal(mgr.activeLibraryId, PREFERRED_FALLBACK_LIBRARY_ID, 'Hidden active library must auto-fallback to watermelon-ui');
  const fallbackNotice = mgr.consumeActiveLibraryFallbackNotice();
  assert.ok(fallbackNotice && fallbackNotice.nextId === 'watermelon-ui', 'Must emit one fallback notice toast');
  assert.equal(mgr.consumeActiveLibraryFallbackNotice(), null, 'Fallback notice must be consumed once');
  assert.ok(mgr.getLibrary('saas-modern'), 'Soft-hidden libraries must stay resolvable for existing projects');
  assert.ok(mgr.getLibrary('shadcn-ui'), 'Soft-hidden indexed libraries must stay resolvable for existing projects');

  // Step 2: Vendored local Preview Kit + Watermelon Vite runtime health check
  const kitStatus = getPreviewKitStatus(process.cwd());
  assert.equal(kitStatus.ok, true, `Local Preview Kit must be healthy: missing=${kitStatus.missingAssets}, corrupted=${kitStatus.corruptedAssets}`);
  assert.equal(kitStatus.watermelonRuntimeReady, true, 'Watermelon Vite runtime bundle must be present');
  assert.equal(kitStatus.tailwindVersion, 4);
  assert.ok(kitStatus.assets.length >= 4);
  assert.equal(resolveLockedPackageVersion('lucide-react'), PREVIEW_KIT_MANIFEST.packages['lucide-react']);

  // Step 3: Import-time normalization (Next.js shims, alias rewriting, default export, pinned deps, NEXT_ONLY/MISSING_DEP)
  const normOk = normalizeComponentRecord({
    id: 'test-card',
    name: 'Hero Card',
    category: 'cards',
    code: `"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
export function HeroCard() {
  return <div className={cn("p-4")}><Link href="/go">Go <ArrowRight /></Link><Image src="/x.png" width={40} height={40} alt="x" /></div>;
}`,
  }, { libraryId: 'kokonut-ui' });

  assert.equal(normOk.status, VERIFICATION_STATUS.VERIFIED);
  assert.ok(!normOk.code.includes('"use client"'));
  assert.ok(normOk.code.includes('export default HeroCard;'));
  assert.equal(normOk.manifest.dependencies['lucide-react'], PREVIEW_KIT_MANIFEST.packages['lucide-react']);
  assert.ok(normOk.hash && normOk.hash.length >= 8);

  const normNextOnly = normalizeComponentRecord({
    id: 'next-server',
    name: 'Server Headers',
    code: `import { cookies } from "next/headers"; export default function ServerOnly() { return <div />; }`,
  }, { libraryId: 'shadcn-ui' });
  assert.equal(normNextOnly.status, VERIFICATION_STATUS.FAILED);
  assert.equal(normNextOnly.reasonCode, FAILURE_REASON_CODES.NEXT_ONLY);

  const normMissing = normalizeComponentRecord({
    id: 'exotic-pkg',
    name: 'Exotic Widget',
    code: `import Foo from "@exotic/nonexistent-lib"; export default function Exotic() { return <Foo />; }`,
  }, { libraryId: 'watermelon-ui' });
  assert.equal(normMissing.status, VERIFICATION_STATUS.FAILED);
  assert.equal(normMissing.reasonCode, FAILURE_REASON_CODES.MISSING_DEP);

  const retried = applyNormalizationAutoFix(normOk, 2, { reasonCode: FAILURE_REASON_CODES.NEEDS_PROPS });
  assert.ok(retried && retried.sampleProps && retried.sampleProps.title, 'Auto-fix retry 2 must synthesize fallback sample props');

  // Step 4: Hash-keyed verification cache & verified-only catalog filtering
  const tmpDir = fsMod.mkdtempSync(pathMod.join(osMod.tmpdir(), 'wf-vcache-'));
  try {
    const cache = loadVerificationCache(tmpDir);
    cache.kitLockHash = 'lock-v1';
    setCachedVerification(cache, 'shadcn-ui', 'btn-1', {
      name: 'Button',
      status: VERIFICATION_STATUS.VERIFIED,
      hash: 'h1',
    });
    setCachedVerification(cache, 'shadcn-ui', 'bad-1', {
      name: 'Broken',
      status: VERIFICATION_STATUS.FAILED,
      reasonCode: FAILURE_REASON_CODES.RUNTIME_ERROR,
      reasonMessage: 'ReferenceError: x is not defined',
      hash: 'h2',
    });
    saveVerificationCache(tmpDir, cache);
    const reloaded = loadVerificationCache(tmpDir);
    assert.ok(getCachedVerification(reloaded, 'shadcn-ui', 'btn-1', 'h1', 'lock-v1'));
    assert.equal(getCachedVerification(reloaded, 'shadcn-ui', 'btn-1', 'h1-changed', 'lock-v1'), null, 'Hash change must invalidate cache');
    assert.equal(getCachedVerification(reloaded, 'shadcn-ui', 'btn-1', 'h1', 'lock-v2'), null, 'Lockfile hash change must invalidate cache');

    const catalogItems = [{ id: 'btn-1', name: 'Button' }, { id: 'bad-1', name: 'Broken' }, { id: 'unverified-1', name: 'New' }];
    const verifiedOnly = filterCatalogByVerification(catalogItems, 'shadcn-ui', reloaded);
    assert.deepEqual(verifiedOnly.map((i) => i.id), ['btn-1']);
    const failedOnly = filterCatalogByVerification(catalogItems, 'shadcn-ui', reloaded, { onlyFailed: true });
    assert.deepEqual(failedOnly.map((i) => i.id), ['bad-1']);
    assert.equal(failedOnly[0].reasonCode, FAILURE_REASON_CODES.RUNTIME_ERROR);
  } finally {
    fsMod.rmSync(tmpDir, { recursive: true, force: true });
  }

  // Step 6: Safe Attach to Chat (blocks failed) + Export ZIP pinned deps & Tailwind v4
  const attachPrompt = formatAttachedComponentsForPrompt([
    {
      name: 'Good Card',
      libraryId: 'shadcn-ui',
      libraryName: 'shadcn/ui',
      category: 'cards',
      verificationStatus: VERIFICATION_STATUS.VERIFIED,
      code: normOk.code,
      manifest: normOk.manifest,
      usageNotes: normOk.usageNotes,
    },
    {
      name: 'Failed Card',
      libraryId: 'shadcn-ui',
      libraryName: 'shadcn/ui',
      verificationStatus: VERIFICATION_STATUS.FAILED,
      code: 'broken()',
    },
  ]);
  assert.ok(attachPrompt.includes('Good Card'));
  assert.ok(attachPrompt.includes('libraryId: shadcn-ui'));
  assert.ok(attachPrompt.includes(`"lucide-react": "${PREVIEW_KIT_MANIFEST.packages['lucide-react']}"`));
  assert.ok(!attachPrompt.includes('Failed Card'), 'Failed components must be blocked from Attach to Chat prompt');

  const { files: exportFilesArr } = buildProjectExportFiles(
    'Demo Export',
    {
      'src/App.jsx': `import { motion } from "framer-motion"; export default function App() { return <motion.div>Hi</motion.div>; }`,
    },
    '',
    {
      attachedManifests: [
        {
          libraryId: 'kokonut-ui',
          dependencies: { 'lucide-react': PREVIEW_KIT_MANIFEST.packages['lucide-react'] },
          css: '@keyframes wfPulse { from { opacity: 0.5; } to { opacity: 1; } }',
        },
      ],
    }
  );
  const exportFiles = Object.fromEntries(exportFilesArr.map((f) => [f.name, f.content]));
  const exportedPkg = JSON.parse(exportFiles['package.json']);
  assert.equal(exportedPkg.dependencies['lucide-react'], PREVIEW_KIT_MANIFEST.packages['lucide-react']);
  assert.equal(exportedPkg.dependencies['framer-motion'], PREVIEW_KIT_MANIFEST.packages['framer-motion']);
  assert.equal(exportedPkg.devDependencies['tailwindcss'], PREVIEW_KIT_MANIFEST.packages['tailwindcss']);
  assert.equal(exportedPkg.devDependencies['@tailwindcss/vite'], PREVIEW_KIT_MANIFEST.packages['@tailwindcss/vite']);
  assert.ok(!exportFiles['index.html'].includes('cdn.tailwindcss.com'), 'Exported index.html must not rely on external Tailwind CDN');
  assert.ok(exportFiles['src/index.css'].includes('@import "tailwindcss";'));
  assert.ok(exportFiles['src/index.css'].includes('@keyframes wfPulse'));

  // Step 7: Unified Library Manifest Schema
  const manifest = mgr.getLibraryManifest('shadcn-ui');
  assert.equal(manifest.id, 'shadcn-ui');
  assert.equal(manifest.source, 'indexed');
  assert.equal(manifest.tailwindVersion, 4);
  assert.ok(Array.isArray(manifest.deps) && Array.isArray(manifest.components));
  const customManifest = createLibraryManifest({ id: 'my-anim', name: 'My Animations', source: 'custom', deps: ['motion'] });
  assert.equal(customManifest.source, 'custom');
  assert.deepEqual(customManifest.deps, ['motion']);
});

test('start.bat & preflight-check verify workspace files, auto-repair missing Preview Kit & cache, and emit a dedicated ERRORS section on failure', async () => {
  const fsMod = await import('node:fs');
  const pathMod = await import('node:path');
  const osMod = await import('node:os');
  const cryptoMod = await import('node:crypto');
  const {
    checkCoreAppFiles,
    checkAndRepairAppDependencies,
    checkAndRepairPreviewKit,
    checkAndRepairWatermelonLibrary,
    formatPreflightReport,
    runPreflight,
  } = await import('../tools/preflight-check.mjs');

  const workspaceRoot = pathMod.resolve(process.cwd());

  // 1. Live workspace passes all non-network checks cleanly
  const liveReport = await runPreflight({
    rootDir: workspaceRoot,
    repair: false,
    skipNetwork: true,
  });
  assert.equal(liveReport.ok, true, `Expected live workspace preflight to pass, got errors: ${JSON.stringify(liveReport.errors)}`);
  assert.equal(liveReport.coreFiles.ok, true);
  assert.equal(liveReport.dependencies.ok, true);
  assert.equal(liveReport.previewKit.ok, true);
  assert.equal(liveReport.watermelon.ok, true);
  assert.equal(liveReport.watermelon.indexCount, 849);
  assert.equal(liveReport.watermelon.runtimeOk, true);
  const okText = formatPreflightReport(liveReport);
  assert.ok(okText.includes('ERRORS (0)'), 'Passing report must display ERRORS (0) section');

  // 2. Verify start.bat wires preflight-check --repair, Node auto-install, and dedicated ERRORS SECTION
  const batSrc = fsMod.readFileSync(pathMod.join(workspaceRoot, 'start.bat'), 'utf8');
  assert.ok(batSrc.includes('tools\\preflight-check.mjs'), 'start.bat must run tools\\preflight-check.mjs');
  assert.ok(batSrc.includes('OpenJS.NodeJS.LTS'), 'start.bat must attempt Node.js LTS auto-install via winget');
  assert.ok(batSrc.includes(':error_section'), 'start.bat must have a dedicated :error_section');
  assert.ok(batSrc.includes('ERRORS SECTION'), 'start.bat must print an explicit ERRORS SECTION header');
  assert.ok(batSrc.includes('logs\\startup-errors.log'), 'start.bat must reference logs\\startup-errors.log');

  // 3. Synthetic failure + auto-repair tests inside an isolated temp directory
  const tmpDir = fsMod.mkdtempSync(pathMod.join(osMod.tmpdir(), 'wf-preflight-'));
  try {
    // 3a. Missing core app files -> ERR_APP_FILES_MISSING
    const coreMissing = checkCoreAppFiles(tmpDir);
    assert.equal(coreMissing.ok, false);
    assert.equal(coreMissing.errors[0].code, 'ERR_APP_FILES_MISSING');

    // 3b. Missing Preview Kit asset -> auto-downloads & SHA-256 verifies via mocked fetchImpl
    const fakePayload = Buffer.from('// verified-mock-react-bundle\nwindow.React = {};\n' + '/* pad */'.repeat(260), 'utf8');
    const fakeSha = cryptoMod.createHash('sha256').update(fakePayload).digest('hex');
    const fakeLucide = Buffer.from('/* lucide */' + 'x'.repeat(12000), 'utf8');

    fsMod.mkdirSync(pathMod.join(tmpDir, 'vendor/preview-kit'), { recursive: true });
    fsMod.writeFileSync(
      pathMod.join(tmpDir, 'vendor/preview-kit/lock.json'),
      JSON.stringify({
        runtimeAssets: {
          react: { version: '18.3.1', path: '/vendor/preview-kit/react.production.min.js', sha256: fakeSha },
        },
      }),
      'utf8'
    );

    const kitRepaired = await checkAndRepairPreviewKit(tmpDir, {
      repair: true,
      fetchImpl: async (url) => ({
        ok: true,
        status: 200,
        async arrayBuffer() {
          const buf = String(url).includes('lucide') ? fakeLucide : fakePayload;
          return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        },
      }),
    });
    assert.equal(kitRepaired.ok, true, `Expected Preview Kit auto-repair to succeed, got: ${JSON.stringify(kitRepaired.errors)}`);
    assert.ok(kitRepaired.fixed.some((msg) => msg.includes('react.production.min.js')));
    assert.ok(kitRepaired.fixed.some((msg) => msg.includes('lucide.min.js')));

    // 3c. Corrupted Preview Kit file when download fails -> ERR_PREVIEW_KIT_DOWNLOAD
    fsMod.writeFileSync(pathMod.join(tmpDir, 'vendor/preview-kit/react.production.min.js'), 'corrupted!', 'utf8');
    const kitFailed = await checkAndRepairPreviewKit(tmpDir, {
      repair: true,
      fetchImpl: async () => {
        throw new Error('Network unreachable');
      },
    });
    assert.equal(kitFailed.ok, false);
    assert.equal(kitFailed.errors[0].code, 'ERR_PREVIEW_KIT_DOWNLOAD');

    // 3d. Corrupted Watermelon details JSON & missing runtime -> specific error codes
    fsMod.mkdirSync(pathMod.join(tmpDir, 'data'), { recursive: true });
    fsMod.writeFileSync(pathMod.join(tmpDir, 'data/watermelon-ui-index.json'), JSON.stringify({ items: [{ id: 'a' }] }), 'utf8');
    fsMod.writeFileSync(pathMod.join(tmpDir, 'data/watermelon-ui-details.json'), '{truncated-json', 'utf8');
    const wmBroken = checkAndRepairWatermelonLibrary(tmpDir, { repair: false });
    assert.equal(wmBroken.ok, false);
    assert.ok(wmBroken.errors.some((e) => e.code === 'ERR_WATERMELON_DETAILS_CORRUPT'));
    assert.ok(wmBroken.errors.some((e) => e.code === 'ERR_WATERMELON_RUNTIME_MISSING'));

    // 3e. Missing verification cache auto-rebuilds via runCommand
    fsMod.writeFileSync(pathMod.join(tmpDir, 'data/watermelon-ui-details.json'), JSON.stringify({ details: { a: {} } }), 'utf8');
    fsMod.mkdirSync(pathMod.join(tmpDir, 'vendor/watermelon-runtime/assets'), { recursive: true });
    fsMod.mkdirSync(pathMod.join(tmpDir, 'vendor/watermelon-runtime/brand'), { recursive: true });
    fsMod.mkdirSync(pathMod.join(tmpDir, 'vendor/watermelon-runtime/content'), { recursive: true });
    fsMod.mkdirSync(pathMod.join(tmpDir, 'vendor/watermelon-runtime/products'), { recursive: true });
    fsMod.writeFileSync(pathMod.join(tmpDir, 'vendor/watermelon-runtime/wf-preview.html'), '<script src="./assets/preview-main.js"></script>', 'utf8');
    fsMod.writeFileSync(pathMod.join(tmpDir, 'vendor/watermelon-runtime/assets/preview-main.js'), 'console.log("ok");', 'utf8');
    fsMod.mkdirSync(pathMod.join(tmpDir, 'tools'), { recursive: true });
    fsMod.writeFileSync(pathMod.join(tmpDir, 'tools/verify-watermelon-runtime.mjs'), '// mock verifier', 'utf8');

    const wmRepaired = checkAndRepairWatermelonLibrary(tmpDir, {
      repair: true,
      runCommand: () => {
        fsMod.writeFileSync(
          pathMod.join(tmpDir, 'data/verification-cache.json'),
          JSON.stringify({ entries: { 'watermelon-ui::a': { status: 'verified' } } }),
          'utf8'
        );
        return { status: 0, stdout: 'ok', stderr: '' };
      },
    });
    assert.equal(wmRepaired.ok, true, `Expected Watermelon cache rebuild to succeed, got: ${JSON.stringify(wmRepaired.errors)}`);
    assert.ok(wmRepaired.fixed.some((msg) => msg.includes('verification-cache.json')));

    // 3f. Dedicated ERRORS section formatting includes code, Problem, Details, Tried, Fix
    const errReportText = formatPreflightReport({
      ok: false,
      coreFiles: coreMissing,
      dependencies: checkAndRepairAppDependencies(tmpDir, { repair: false }),
      previewKit: kitFailed,
      watermelon: wmBroken,
      network: { online: false, warning: null },
      fixed: [],
      warnings: [],
      errors: [...coreMissing.errors, ...kitFailed.errors, ...wmBroken.errors],
    });
    assert.ok(errReportText.includes('ERRORS ('), 'Failed report must include ERRORS (N) header');
    assert.ok(errReportText.includes('ERR_APP_FILES_MISSING'));
    assert.ok(errReportText.includes('ERR_PREVIEW_KIT_DOWNLOAD'));
    assert.ok(errReportText.includes('ERR_WATERMELON_DETAILS_CORRUPT'));
    assert.ok(errReportText.includes('Problem :'));
    assert.ok(errReportText.includes('Fix     :'));
  } finally {
    fsMod.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Model provider catalog pins Strata first among Local Runtimes and includes 50+ Cherry Studio providers with multi-protocol Strata wire builders and SSE parsers', async () => {
  const {
    PROVIDER_PRESETS,
    PROVIDER_GROUPS,
    PROVIDER_PROTOCOLS,
    resolveProviderEndpoint,
    AIProvider,
  } = await import('../js/modules/providers.mjs');

  const presetIds = Object.keys(PROVIDER_PRESETS);
  assert.ok(presetIds.length >= 50, `Expected at least 50 built-in providers, got ${presetIds.length}`);
  assert.equal(PROVIDER_GROUPS[0].id, 'local', 'Local runtimes group must be pinned first');

  const localIds = presetIds.filter((id) => PROVIDER_PRESETS[id].group === 'local');
  assert.equal(localIds[0], 'strata', 'Strata must be pinned #1 in Local Runtimes');
  assert.equal(PROVIDER_PRESETS.strata.baseUrl, 'http://127.0.0.1:8080/v1');
  assert.deepEqual(
    PROVIDER_PRESETS.strata.supportedProtocols,
    ['openai-chat', 'anthropic-messages', 'openai-responses'],
    'Strata must support OpenAI Chat, Anthropic Messages, and OpenAI Responses protocols'
  );

  for (const requiredId of [
    'strata', 'lmstudio', 'ollama', 'unsloth-studio', 'litellm', 'omlx', 'rapid-mlx', 'gpustack', 'comfyui',
    'openrouter', 'anthropic', 'openai', 'gemini', 'deepseek', 'grok', 'claude-code', 'openai-codex',
    'github-copilot', 'azure-openai', 'vertexai', 'bedrock', 'nvidia', 'cerebras', 'huggingface',
    'siliconflow', 'aihubmix', 'bigmodel', 'moonshot', 'qwen-cloud', 'doubao', 'minimax', 'custom',
  ]) {
    assert.ok(PROVIDER_PRESETS[requiredId], `Missing expected Cherry Studio / local provider preset: ${requiredId}`);
  }

  assert.equal(
    resolveProviderEndpoint('http://127.0.0.1:8080/v1', 'openai-chat', 'chat'),
    'http://127.0.0.1:8080/v1/chat/completions'
  );
  assert.equal(
    resolveProviderEndpoint('http://127.0.0.1:8080/v1', 'anthropic-messages', 'chat'),
    'http://127.0.0.1:8080/v1/messages'
  );
  assert.equal(
    resolveProviderEndpoint('http://127.0.0.1:8080/v1', 'openai-responses', 'chat'),
    'http://127.0.0.1:8080/v1/responses'
  );
  assert.equal(
    resolveProviderEndpoint('http://127.0.0.1:8080', 'anthropic-messages', 'models'),
    'http://127.0.0.1:8080/v1/models'
  );

  const provider = new AIProvider();
  provider.updateProvider('strata', { enabled: true, apiKey: 'strata-test-key' });
  provider.activateProvider('strata');

  // 1) OpenAI Chat Completions
  provider.updateProvider('strata', { protocol: 'openai-chat' });
  const oaiReq = provider.buildChatRequest('You are concise.', 'Say hi.', [], { model: 'qwen3-coder-30b' });
  assert.equal(oaiReq.url, 'http://127.0.0.1:8080/v1/chat/completions');
  assert.equal(oaiReq.headers.Authorization, 'Bearer strata-test-key');
  assert.equal(oaiReq.body.messages.length, 2);
  const oaiChunk = provider.parseSseLine(
    'data: {"choices":[{"delta":{"content":"Hello ","reasoning_content":"Think"}}]}',
    'openai-chat'
  );
  assert.deepEqual(oaiChunk, { contentDelta: 'Hello ', reasoningDelta: 'Think' });

  // 2) Anthropic Messages
  provider.updateProvider('strata', { protocol: 'anthropic-messages' });
  const antReq = provider.buildChatRequest('You are concise.', 'Say hi.', [], { model: 'strata-moe-70b' });
  assert.equal(antReq.url, 'http://127.0.0.1:8080/v1/messages');
  assert.equal(antReq.headers['x-api-key'], 'strata-test-key');
  assert.equal(antReq.headers['anthropic-version'], '2023-06-01');
  assert.equal(antReq.body.system, 'You are concise.');
  assert.equal(antReq.body.messages.length, 1);
  const antText = provider.parseSseLine(
    'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"World"}}',
    'anthropic-messages'
  );
  assert.deepEqual(antText, { contentDelta: 'World', reasoningDelta: '' });
  const antThink = provider.parseSseLine(
    'data: {"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"Plan"}}',
    'anthropic-messages'
  );
  assert.deepEqual(antThink, { contentDelta: '', reasoningDelta: 'Plan' });

  // 3) OpenAI Responses
  provider.updateProvider('strata', { protocol: 'openai-responses' });
  const respReq = provider.buildChatRequest('You are concise.', 'Say hi.', [], { model: 'gpt-5-codex' });
  assert.equal(respReq.url, 'http://127.0.0.1:8080/v1/responses');
  assert.equal(respReq.body.instructions, 'You are concise.');
  assert.ok(Array.isArray(respReq.body.input) && respReq.body.input.length === 1);
  const respText = provider.parseSseLine(
    'data: {"type":"response.output_text.delta","delta":"Done!"}',
    'openai-responses'
  );
  assert.deepEqual(respText, { contentDelta: 'Done!', reasoningDelta: '' });

  assert.ok(PROVIDER_PROTOCOLS['openai-chat'] && PROVIDER_PROTOCOLS['anthropic-messages'] && PROVIDER_PROTOCOLS['openai-responses']);
});

test('Kubai Icons engine renders layered animated SVGs, provider marks, and ships as an enabled built-in AI Skill', async () => {
  const {
    KUBAI_ICON_NAMES,
    renderKubaiIcon,
    renderProviderMark,
    KUBAI_ICONS_SKILL_PROMPT,
  } = await import('../js/modules/kubai-icons.mjs');
  const { SkillManager } = await import('../js/modules/skills.mjs');

  assert.ok(KUBAI_ICON_NAMES.length >= 20, `Expected >=20 Kubai icons, got ${KUBAI_ICON_NAMES.length}`);

  const navSvg = renderKubaiIcon('model-provider', { size: 18 });
  assert.ok(navSvg.includes('class="kb-icon '), 'Must render .kb-icon wrapper');
  assert.ok(navSvg.includes('kb-back') && navSvg.includes('kb-front') && navSvg.includes('kb-accent'), 'Must include layered animation hooks');
  assert.ok(navSvg.includes('viewBox="0 0 24 24"'));

  const strataMark = renderProviderMark({ id: 'strata', name: 'Strata', group: 'local' });
  assert.ok(strataMark.includes('data-kubai-rendered="strata"'), 'Strata must use dedicated Kubai layered icon mark');

  const monoMark = renderProviderMark({ id: 'siliconflow', name: 'SiliconFlow', group: 'regional', logoCode: 'SF', brandTone: 'violet' });
  assert.ok(monoMark.includes('kb-mono-mark') && monoMark.includes('SF'), 'Regional provider should render tonal Kubai mono mark');

  const sm = new SkillManager();
  const kubaiSkill = sm.skills.find((s) => s.id === 'kubai-icons');
  assert.ok(kubaiSkill, 'Built-in Kubai Icons skill must be registered in SkillManager');
  assert.equal(kubaiSkill.enabled, true, 'Kubai Icons skill should be enabled by default');
  assert.ok(kubaiSkill.prompt.includes('.kb-back') && KUBAI_ICONS_SKILL_PROMPT.includes('kubai087/kubai-icons'));
});



