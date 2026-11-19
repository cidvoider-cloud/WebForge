/**
 * WebForge Studio — System Instructions & Skills Manager
 * Includes built-in Ponytail skill (DietrichGebert/ponytail) and smart one-paste
 * GitHub repository skill discovery (SKILL.md, .cursor/rules, AGENTS.md, CLAUDE.md, README.md).
 */

import { safeStorageGet, safeStorageJsonGet, safeStorageSet, STORAGE_KEYS } from './storage.mjs';
import { estimateTokens } from './context-budget.mjs';

export const DEFAULT_BASE_SYSTEM_PROMPT = `You are WebForge, a senior React developer. You build modern, beautiful, and fully functional React applications styled with Tailwind CSS and Lucide React icons.

## APP STRUCTURE & FILES
By default, build a clean, modular React application:
- \`src/main.jsx\` - The mounting entry point (renders App in #root).
- \`src/App.jsx\` - The main App component containing the layout, state, and child components.
- \`src/components/\` - Reusable sub-components (e.g., Header, Hero, Footer, FeatureGrid).
- \`src/index.css\` - Custom styles or Tailwind imports.

If the user explicitly asks for a plain HTML/CSS/JS (or Bootstrap) site without React, output \`index.html\` (plus optional \`styles.css\` and \`script.js\`) instead.

## OUTPUT FORMAT (CRITICAL)
- You generate code as a set of file blocks. Each file MUST be separated by a header matching this exact syntax:
  ### FILE: path/to/file.ext
  \`\`\`language
  code content
  \`\`\`
- Do not output any markdown text outside of these file blocks. No explanations, no introductory text, no "here is your file" commentary. Just output the file blocks.
- When generating the INITIAL app, output ALL required files.
- When EDITING an existing app (follow-up requests), act as a code editor that patches or updates existing files rather than generating a completely new project layout from scratch. Output **ONLY** complete file blocks for files that are being created or modified.
- **NEVER use placeholders, comments for brevity (e.g., // ...), or partial snippets. You must generate the complete, fully functional, and production-ready code for every file you output.**

## CRITICAL REQUIREMENT
All JavaScript, TypeScript, and JSX must be valid Babel-compilable code. Escape quotes and newlines inside string literals, especially realistic copy/data arrays such as testimonials, FAQs, and product lists.

## OPERATING MODES
Decide the mode from the user's request and follow it strictly:
- DISCUSS: If the user asks a question, asks for advice, or is unclear, do not output file blocks. Explain briefly instead.
- BUILD: For the first real build, create a complete working app using all required files.
- EDIT: For follow-up changes, patch the current app. Output only changed or new complete files.
- DEBUG: When given preview errors, console logs, stack traces, or broken behavior, fix the root cause with the smallest file changes.

## CODE GUIDELINES
1. Write standard modern React using functional components and hooks (useState, useEffect, useMemo).
2. Import Lucide icons as standard: \`import { ArrowRight, Menu, X, Star } from 'lucide-react';\`.
3. Import other components using relative or \`@/\` paths.
4. Use meaningful, realistic domain copy (no lorem ipsum).
5. Use semantic HTML (<header>, <main>, <nav>, <section>, <footer>), keyboard accessibility, and alt attributes.`;

export const BUILTIN_SKILLS = [
  {
    id: 'ponytail',
    name: 'Ponytail',
    description: 'Lazy senior dev mode: the smallest complete change that fully solves the task without over-engineering.',
    author: 'DietrichGebert',
    source: 'https://github.com/DietrichGebert/ponytail',
    icon: 'PT',
    enabled: true,
    builtin: true,
    prompt: `# Ponytail (github.com/DietrichGebert/ponytail)

You are a lazy senior developer. The best code is the code never written. You solve the whole problem with the least new code. End your reply with one or two lines: what you skipped or did not check, and any risk the user must know.
Switch level on request: \`/ponytail lite|full|ultra\`.

## Before you write
Read the task and the code it touches. List every place your change must reach: callers, tests, fixtures, config, exports. Check what your change could break for users: data it would destroy or expose, callers that stop working. That is scope. Extra features are not.

## The smallest complete change
Take the first option that fully works:
1. Does it need to exist? Skip features, options and flexibility nobody asked for, and name them in one line. A vague request ("build me X") gets the smallest version that does the core job.
2. Already in this codebase (a helper, component, service, pattern)? Use it the way the surrounding code does.
3. Standard library or a platform feature? Use it, unless the project has its own. A house component beats a native widget.
4. An installed dependency? Use it. Never add a dependency for a few lines.
5. Can it be one line a reader gets at a glance? One line.
6. Otherwise: the minimum code that works.

- Be lazy about the solution, never about the change itself: finish every part the task needs, including the callers, tests and fixtures your change breaks.
- No abstraction, wrapper, type conversion, option, config, boilerplate or "for later" code nobody asked for. Deletion beats addition. Keep the structure the codebase already has.
- The shortest working diff wins, once you know everything it must touch.
- Comment only the why the code cannot show, in one line.
- Bug fix: check every caller of the function you touch, then fix the root cause once in the shared code.
- Between options of equal size, take the one that is correct on edge cases.
- Never cut: validation at trust boundaries, error handling that prevents data loss, security, accessibility, or anything the user asked for.

## Levels
- lite: Build what was asked. Name the smaller option in one line and let the user pick.
- full: The rules above. Default.
- ultra: Also question the request: before building, push back on any part the need does not justify.`,
  },
  {
    id: 'minimal-code',
    name: 'Minimal Code',
    description: 'Prefer the smallest correct change — reuse existing code, avoid new abstractions and dependencies.',
    icon: 'MC',
    enabled: false,
    builtin: true,
    prompt: `# Minimal Code Mode

Write the minimum code that correctly solves the request. Efficient, not careless.

Before writing code, prefer in order:
1. Skip work that is not needed (YAGNI)
2. Reuse helpers or patterns already in the project
3. Use standard library or platform features
4. Never use placeholders or partial snippets — emit complete, working files`,
  },
  {
    id: 'security-hardened',
    name: 'Security Hardened',
    description: 'Extra emphasis on XSS prevention, safe forms, input handling, and secure patterns.',
    icon: 'SH',
    enabled: true,
    builtin: true,
    prompt: `# Security Hardened Mode

Apply extra security diligence without breaking the browser preview:
- Escape user-generated text before rendering it. Avoid dangerouslySetInnerHTML unless sanitized.
- Validate and constrain form inputs at the component boundary.
- Never store secrets or sensitive credentials in localStorage.`,
  },
  {
    id: 'open-design',
    name: 'Open Design',
    description: 'Design-first workflow creating cohesive design tokens, typography, and structured layouts.',
    source: 'https://github.com/nexu-io/open-design',
    icon: 'OD',
    enabled: true,
    builtin: true,
    prompt: `# Open Design Mode

Treat the project like a high-craft design artifact:
- Establish clear design tokens for color, typography, spacing, surfaces, borders, and motion.
- Generate responsive, interactive UI with complete empty, hover, focus, and loading states.
- Preserve existing working code on follow-up edits instead of rewriting everything.`,
  },
  {
    id: 'webforge-polish',
    name: 'WebForge Polish',
    description: 'Focused, robust, responsive UI with complete states and local-LLM-friendly diffs.',
    icon: 'WF',
    enabled: false,
    builtin: true,
    prompt: `# WebForge Polish Mode

Act like a product-minded full-stack developer:
- Prefer focused edits for follow-up requests.
- Make UI states complete: empty, loading, success, error, disabled, hover, focus, and mobile.
- Favor simple, inspectable React state over complex abstractions.`,
  },
  {
    id: 'accessibility-first',
    name: 'Accessibility First',
    description: 'Forces WCAG 2.1 AA compliance, ARIA live regions, focus rings, and keyboard support.',
    icon: 'A11Y',
    enabled: false,
    builtin: true,
    prompt: `# Accessibility First Mode

Go beyond baseline accessibility:
- Announce dynamic content changes with aria-live regions and role="alert" for errors.
- Provide visible focus-visible indicators with strong contrast.
- Ensure every interactive element works with keyboard navigation.`,
  },
];

export function parseGitHubInput(rawInput = '') {
  const input = String(rawInput || '').trim();
  if (!input) return null;

  const rawMatch = input.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i);
  if (rawMatch) {
    return { owner: rawMatch[1], repo: rawMatch[2].replace(/\.git$/i, ''), branch: rawMatch[3], filePath: rawMatch[4], kind: 'file' };
  }
  const blobMatch = input.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/(blob|tree)\/([^/]+)\/(.+?)(?:[?#].*)?$/i);
  if (blobMatch) {
    return {
      owner: blobMatch[1],
      repo: blobMatch[2].replace(/\.git$/i, ''),
      branch: blobMatch[4],
      filePath: blobMatch[5].replace(/\/+$/, ''),
      kind: blobMatch[3].toLowerCase() === 'blob' ? 'file' : 'dir',
    };
  }
  const repoMatch = input.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/?#]+)(?:[/?#].*)?$/i);
  if (repoMatch) {
    return { owner: repoMatch[1], repo: repoMatch[2].replace(/\.git$/i, ''), branch: '', filePath: '', kind: 'repo' };
  }
  const shortMatch = input.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/i, ''), branch: '', filePath: '', kind: 'repo' };
  }
  return null;
}

export function extractSkillFrontmatter(markdown = '') {
  const text = String(markdown || '');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!fm) return { meta: {}, body: text.trim() };
  const meta = {};
  const lines = fm[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1].toLowerCase();
    const rawVal = kv[2].trim();
    if (/^[>|][-+]?$/.test(rawVal)) {
      const blockLines = [];
      while (i + 1 < lines.length && (/^\s+/.test(lines[i + 1]) || lines[i + 1].trim() === '')) {
        i += 1;
        blockLines.push(lines[i].trim());
      }
      meta[key] = blockLines.filter(Boolean).join(' ').trim();
    } else {
      meta[key] = rawVal.replace(/^["']|["']$/g, '').trim();
    }
  }
  return { meta, body: text.slice(fm[0].length).trim() };
}

export class SkillManager {
  constructor() {
    this.skills = [];
    this.baseInstructions = safeStorageGet(STORAGE_KEYS.SYSTEM_BASE, '') || DEFAULT_BASE_SYSTEM_PROMPT;
    this._loadDefaults();
    this._loadFromStorage();
  }

  _loadDefaults() {
    this.skills = BUILTIN_SKILLS.map((s) => ({ ...s }));
  }

  _loadFromStorage() {
    const saved = safeStorageJsonGet(STORAGE_KEYS.SKILLS, null);
    if (!saved) return;

    if (saved.toggles) {
      for (const skill of this.skills) {
        if (saved.toggles[skill.id] !== undefined) {
          skill.enabled = saved.toggles[skill.id];
        }
      }
    }

    if (Array.isArray(saved.custom)) {
      for (const s of saved.custom) {
        if (!this.skills.find((x) => x.id === s.id)) {
          this.skills.push({ ...s, builtin: false });
        }
      }
    }
  }

  setBaseInstructions(text) {
    const cleaned = String(text || '').trim();
    this.baseInstructions = cleaned || DEFAULT_BASE_SYSTEM_PROMPT;
    safeStorageSet(STORAGE_KEYS.SYSTEM_BASE, this.baseInstructions);
  }

  resetBaseInstructions() {
    this.baseInstructions = DEFAULT_BASE_SYSTEM_PROMPT;
    safeStorageSet(STORAGE_KEYS.SYSTEM_BASE, this.baseInstructions);
    return this.baseInstructions;
  }

  toggle(id) {
    const skill = this.skills.find((s) => s.id === id);
    if (skill) {
      skill.enabled = !skill.enabled;
      this.save();
    }
    return skill;
  }

  /**
   * Discover all SKILL.md / rule files inside any pasted GitHub repository URL or owner/repo shorthand.
   * Uses local /api/github-skills first, with direct GitHub API + raw fallback.
   */
  async inspectGitHubRepo(input) {
    const target = parseGitHubInput(input);
    if (!target) {
      throw new Error('Paste a GitHub repo URL (e.g. https://github.com/owner/repo) or owner/repo.');
    }

    // 1) Try local server discovery endpoint (no CORS issues, full recursive tree scan)
    try {
      const res = await fetch(`/api/github-skills?url=${encodeURIComponent(input)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.skills) && data.skills.length) {
          return data;
        }
      }
    } catch {
      // Fall through to direct GitHub fetch
    }

    // 2) Direct browser fallback via GitHub public API & raw.githubusercontent.com
    const { owner, repo } = target;
    let branch = target.branch || 'main';
    let candidatePaths = [];

    if (target.kind === 'file' && target.filePath) {
      candidatePaths = [target.filePath];
    } else {
      for (const br of [...new Set([target.branch || 'main', 'master'])]) {
        try {
          const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${br}?recursive=1`);
          if (treeRes.ok) {
            const data = await treeRes.json();
            const allBlobs = (data.tree || []).filter((n) => n.type === 'blob').map((n) => n.path);
            const skillMds = allBlobs.filter((p) => /(?:^|\/)skill\.md$/i.test(p));
            const others = allBlobs.filter((p) => /(?:^|\/)(?:agents|claude|system)\.md$|\.cursor\/rules\/.+\.(?:mdc|md)$/i.test(p));
            candidatePaths = skillMds.length ? skillMds.slice(0, 12) : others.length ? others.slice(0, 8) : ['README.md'];
            branch = br;
            break;
          }
        } catch {
          // Try next branch
        }
      }
      if (!candidatePaths.length) {
        candidatePaths = ['SKILL.md', 'AGENTS.md', 'CLAUDE.md', 'README.md'];
      }
    }

    const skills = [];
    for (const filePath of candidatePaths) {
      try {
        const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`);
        if (!rawRes.ok) continue;
        const text = await rawRes.text();
        const { meta, body } = extractSkillFrontmatter(text);
        const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim() || '';
        const folder = filePath.split('/').slice(-2, -1)[0] || repo;
        const base = filePath.split('/').pop().replace(/\.(md|mdc)$/i, '');
        const rawName = meta.name || heading || (/^(skill|readme|agents|claude)$/i.test(base) ? folder : base);
        const name = rawName.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        skills.push({
          path: filePath,
          branch,
          name,
          slug: `${owner}-${repo}-${meta.name || folder || base}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
          description: meta.description || `Imported from ${owner}/${repo} (${filePath})`,
          author: owner,
          source: `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`,
          prompt: body.slice(0, 12000),
        });
      } catch {
        // Skip unreadable candidate
      }
    }

    if (!skills.length) {
      throw new Error(`Could not find SKILL.md, AGENTS.md, or README.md in ${owner}/${repo}`);
    }
    return { owner, repo, branch, skills };
  }

  importDiscoveredSkill(item) {
    if (!item?.prompt) throw new Error('Invalid skill payload');
    const id = `github-${item.slug || item.name || Date.now()}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const existing = this.skills.find((s) => s.id === id);
    if (existing) {
      existing.enabled = true;
      existing.prompt = String(item.prompt).slice(0, 12000);
      existing.description = item.description || existing.description;
      this.save();
      return { skill: existing, updated: true };
    }
    const skill = {
      id,
      name: item.name || 'Imported Skill',
      description: item.description || 'Imported from GitHub',
      author: item.author || '',
      source: item.source || '',
      icon: 'GH',
      enabled: true,
      builtin: false,
      prompt: String(item.prompt).slice(0, 12000),
    };
    this.skills.push(skill);
    this.save();
    return { skill, updated: false };
  }

  async importFromGitHub(url) {
    const discovered = await this.inspectGitHubRepo(url);
    if (discovered.skills.length === 1) {
      const { skill } = this.importDiscoveredSkill(discovered.skills[0]);
      return { imported: [skill], discovered };
    }
    // When multiple skills exist, return discovered list so UI can offer 1-click selective or bulk import
    return { imported: [], discovered };
  }

  importFromText(name, description, promptText) {
    const id = 'custom-' + Date.now();
    const skill = {
      id,
      name,
      description,
      icon: 'TXT',
      enabled: true,
      builtin: false,
      prompt: String(promptText || '').substring(0, 12000),
    };
    this.skills.push(skill);
    this.save();
    return skill;
  }

  delete(id) {
    const idx = this.skills.findIndex((s) => s.id === id && !s.builtin);
    if (idx >= 0) {
      this.skills.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  getSystemPrompt(projectInstructions = '') {
    const activeSkills = this.skills.filter((s) => s.enabled).map((s) => s.prompt);
    const parts = [this.baseInstructions || DEFAULT_BASE_SYSTEM_PROMPT];
    if (String(projectInstructions || '').trim()) {
      parts.push(`# Project-Specific Instructions\n${String(projectInstructions).trim()}`);
    }
    if (activeSkills.length) {
      parts.push(...activeSkills);
    }
    return parts.join('\n\n---\n\n');
  }

  getCompiledStats(projectInstructions = '') {
    const full = this.getSystemPrompt(projectInstructions);
    return {
      totalTokens: estimateTokens(full),
      baseTokens: estimateTokens(this.baseInstructions),
      projectTokens: estimateTokens(projectInstructions),
      activeCount: this.getActiveCount(),
    };
  }

  getActiveCount() {
    return this.skills.filter((s) => s.enabled).length;
  }

  save() {
    const toggles = {};
    const custom = [];
    for (const s of this.skills) {
      toggles[s.id] = s.enabled;
      if (!s.builtin) custom.push(s);
    }
    safeStorageSet(STORAGE_KEYS.SKILLS, JSON.stringify({ toggles, custom }));
  }
}
