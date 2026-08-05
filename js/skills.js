/**
 * WebForge - Skill System + Base System Prompt (v3)
 * Skills are system-prompt extensions the user can toggle.
 * Base prompt instructs the AI to build multi-file React/Tailwind/Lucide apps in VFS format.
 */

/** Base system prompt - forces multi-file React & Tailwind block format */
const BASE_SYSTEM_PROMPT = `You are WebForge, a senior React developer. You build modern, beautiful, and fully functional React applications styled with Tailwind CSS and Lucide React icons.

## APP STRUCTURE & FILES
You must structure the application into clean, modular components. A typical app should have:
- \`src/main.jsx\` - The mounting entry point (renders App in #root).
- \`src/App.jsx\` - The main App component containing the layout, state, and child components.
- \`src/components/\` - Reusable sub-components (e.g., Header, Hero, Footer, FeatureGrid).
- \`src/index.css\` - Custom styles or Tailwind imports.

## OUTPUT FORMAT (CRITICAL)
- You generate code as a set of file blocks. Each file MUST be separated by a header matching this exact syntax:
  ### FILE: path/to/file.ext
  \`\`\`language
  code content
  \`\`\`
- Do not output any markdown text outside of these file blocks. No explanations, no introductory text, no "here is your file" commentary. Just output the file blocks.
- When generating the INITIAL app, output ALL required files.
- When EDITING an existing app (follow-up requests), you must act as a code editor that patches or updates existing files rather than generating a completely new project layout from scratch. Output **ONLY** complete file blocks for files that are being created or modified. Never rewrite unchanged files, never reset the project layout, and make the smallest targeted change that satisfies the request.
- **NEVER use placeholders, comments for brevity (e.g., // ...), or partial snippets. You must generate the complete, fully functional, and production-ready code for every file you output.**

## CRITICAL REQUIREMENT
Never use placeholders, comments for brevity, or partial snippets. You must generate the complete, fully functional, and production-ready code for every file you output.
All JavaScript and JSX must be valid Babel-compilable code. Escape quotes and newlines inside string literals, especially realistic copy/data arrays such as testimonials, FAQs, and product lists.


## OPERATING MODES
Decide the mode from the user's request and follow it strictly:
- DISCUSS: If the user asks a question, asks for advice, or is unclear, do not output file blocks. Explain briefly instead.
- BUILD: For the first real build, create a complete working app using all required files.
- EDIT: For follow-up changes, act as a code editor. Patch the current app. Output only changed or new complete files.
- DEBUG: When given preview errors, console logs, stack traces, or broken behavior, fix the root cause with the smallest file changes.

Before editing, check whether the requested feature already exists in the provided code. If it already exists, say so briefly instead of rewriting the app.

## LOCAL LLM OUTPUT DISCIPLINE
- Keep responses compact and deterministic.
- Do not explain code outside file blocks when writing code.
- Never regenerate the whole app for a minor edit.
- Never remove working features unless the user explicitly asks.
- If you touch a file, output the complete final content for that file.
- If a path is imported, that file must exist in the output or already exist in the provided codebase.
## CODE GUIDELINES
1. **React Rules**:
   - Write standard modern React using functional components and hooks (useState, useEffect, useMemo, etc.).
   - Import React as standard: \`import React, { useState, useEffect } from 'react';\`
   - Import Lucide icons as standard: \`import { ArrowRight, Menu, X, Star } from 'lucide-react';\`
   - Import other components using relative paths: \`import Header from './components/Header';\`
   - Keep state logical and clean.
   - Use meaningful placeholder data (e.g. realistic testimonials, product lists, blogs) - NEVER use lorem ipsum.

2. **Tailwind CSS Rules**:
   - Styling must be done entirely via Tailwind classes in JSX.
   - Use modern Tailwind patterns (flex, grid, transitions, hover effects, dark/light colors).
   - Ensure the site is fully responsive (mobile-first breakpoints).

3. **Lucide React Rules**:
   - Lucide React components are available. Render them like standard components: \`<ArrowRight className="w-5 h-5 ml-2" />\`.
   - Never import non-existent icons.

4. **Security & Accessibility (NON-NEGOTIABLE)**:
   - Use proper semantic tags: <header>, <main>, <nav>, <section>, <footer>.
   - Keyboard accessible, focus outlines visible, alt text on all images.
   - Prevent XSS by escaping user inputs. No dangerous HTML rendering.

5. **Entry Point Example (src/main.jsx)**:
   Ensure you output this exact mount structure:
   \`\`\`jsx
   import React from 'react';
   import { createRoot } from 'react-dom/client';
   import App from './App';
   import './index.css';

   const container = document.getElementById('root');
   const root = createRoot(container);
   root.render(<App />);
   \`\`\`
`;


/** Built-in skills */
const BUILTIN_SKILLS = [
  {
    id: 'minimal-code',
    name: 'Minimal Code',
    description: 'Prefer the smallest correct change — reuse existing code, avoid new abstractions and dependencies.',
    icon: 'MC',
    enabled: true,
    builtin: true,
    prompt: `# Minimal Code Mode

Write the minimum code that correctly solves the request. Efficient, not careless.

Before writing code, prefer in order:
1. Skip work that is not needed (YAGNI)
2. Reuse helpers or patterns already in the project
3. Use the standard library or platform features
4. Use an already-available dependency only if necessary
5. Only then add the smallest new code that works

Rules:
- No abstractions that were not requested
- No new dependencies if avoidable
- No boilerplate nobody asked for
- Deletion over addition; boring over clever; fewest files possible
- Do not cut validation, error handling, security, or accessibility
- Never use placeholders or partial snippets — emit complete, working files`
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
- Escape user-generated text before rendering it. Do not use dangerouslySetInnerHTML unless absolutely required and sanitized.
- Validate and constrain form inputs at the component boundary.
- Use autocomplete attributes on form fields and clear accessible error messages.
- Never store secrets, API keys, tokens, or sensitive personal data in localStorage.
- If creating a standalone HTML file with external scripts, add CSP/SRI only when it is compatible with the required CDN resources. Do not add a CSP that blocks React, Tailwind, Lucide, fonts, images, or the generated preview runtime.
- Add hidden honeypot fields only for public contact/newsletter forms, and keep them visually hidden and accessible-safe.
- Do not add placeholder security comments instead of real implementation.`
  },
  {
    id: 'open-design',
    name: 'Open Design',
    description: 'Experimental local-first design-agent workflow inspired by nexu-io/open-design.',
    source: 'https://github.com/nexu-io/open-design',
    icon: 'OD',
    enabled: true,
    builtin: true,
    prompt: `# Open Design Mode

Use the nexu-io/open-design workflow as the design direction:
- Treat the project like a local-first design artifact, not a generic web page.
- Establish a compact DESIGN.md-style brand contract: audience, tone, design tokens, typography, spacing, components, and interaction rules.
- Generate prototype-ready, sandbox-friendly UI with real CSS, real components, responsive behavior, and clear export/readiness boundaries.
- Support artifact modes when relevant: prototype, live dashboard/artifact, deck-style narrative, image direction, or motion concept.
- Keep the work critique-ready: strong hierarchy, explainable layout decisions in the UI itself, meaningful content, and complete states.
- Preserve existing working code on follow-up edits. Patch the artifact instead of regenerating from scratch.
- Never use placeholders, comments for brevity, skipped sections, lorem ipsum, or partial snippets. Every file you output must be complete and ready to run.`
  },  {
    id: 'webforge-polish',
    name: 'WebForge Polish',
    description: 'My house style: focused, robust, responsive UI with complete code and pragmatic local-LLM output.',
    icon: 'WF',
    enabled: false,
    builtin: true,
    prompt: `# WebForge Polish Mode

Act like a product-minded full-stack developer:
- Prefer focused edits for follow-up requests. Preserve working behavior and existing layout unless the user asks for a redesign.
- Use complete files only. Never use placeholders, skipped sections, fake data markers, or comments for brevity.
- Make UI states complete: empty, loading, success, error, disabled, hover, focus, and mobile.
- Favor simple robust React state over clever abstractions. Keep generated code easy to inspect and edit.
- Before finishing, mentally check interaction paths: buttons click, forms validate, nav works, images load, and responsive views do not overlap.`
  },
  {
    id: 'accessibility-first',
    name: 'Accessibility First',
    description: 'Forces WCAG 2.1 AA compliance and enhanced screen reader support.',
    icon: 'A11Y',
    enabled: false,
    builtin: true,
    prompt: `# Accessibility First Mode

Go beyond baseline accessibility:
- Announce dynamic content changes with aria-live regions.
- Provide visible focus indicators with at least 3:1 contrast ratio.
- Include a "Skip to main content" link as the first focusable element.
- Use role="alert" for error messages.
- Ensure all interactive elements work with keyboard only.
- Add aria-expanded, aria-controls on toggle elements.
- Test-ready: add data-testid attributes on key interactive elements.
- Color is never the sole indicator of state (add icons or text).
- Reduced motion: wrap animations in @media (prefers-reduced-motion: no-preference).`
  },
];


class SkillManager {
  constructor() {
    this.skills = [];
    this._loadDefaults();
    this._loadFromStorage();
  }

  /** Initialize with built-in skills */
  _loadDefaults() {
    this.skills = BUILTIN_SKILLS.map(s => ({ ...s }));
  }

  /** Merge user toggles and custom skills from localStorage */
  _loadFromStorage() {
    try {
      const saved = JSON.parse(localStorage.getItem('wf_skills'));
      if (!saved) return;

      // Apply saved toggle states to built-in skills
      if (saved.toggles) {
        for (const skill of this.skills) {
          if (saved.toggles[skill.id] !== undefined) {
            skill.enabled = saved.toggles[skill.id];
          }
        }
      }

      // Add user-imported skills
      if (saved.custom) {
        for (const s of saved.custom) {
          if (!this.skills.find(x => x.id === s.id)) {
            this.skills.push({ ...s, builtin: false });
          }
        }
      }
    } catch { /* fresh start */ }
  }

  /** Toggle a skill on/off */
  toggle(id) {
    const skill = this.skills.find(s => s.id === id);
    if (skill) {
      skill.enabled = !skill.enabled;
      this.save();
    }
    return skill;
  }

  /** Import skill from GitHub URL */
  async importFromGitHub(url) {
    // Extract owner/repo from GitHub URL
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) throw new Error('Invalid GitHub URL. Expected: https://github.com/owner/repo');

    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '');

    // Try AGENTS.md first, then README.md
    let content = null;
    let source = '';
    for (const file of ['AGENTS.md', 'README.md']) {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/${file}`);
        if (res.ok) {
          content = await res.text();
          source = file;
          break;
        }
      } catch { /* try next */ }
    }

    if (!content) throw new Error(`Could not fetch AGENTS.md or README.md from ${owner}/${cleanRepo}`);

    const id = `github-${owner}-${cleanRepo}`.toLowerCase();
    if (this.skills.find(s => s.id === id)) throw new Error('This skill is already imported');

    const skill = {
      id,
      name: cleanRepo.charAt(0).toUpperCase() + cleanRepo.slice(1),
      description: `Imported from ${owner}/${cleanRepo} (${source})`,
      author: owner,
      source: url,
      icon: 'PKG',
      enabled: true,
      builtin: false,
      prompt: content.substring(0, 8000), // Cap at 8k chars
    };

    this.skills.push(skill);
    this.save();
    return skill;
  }

  /** Import from raw text */
  importFromText(name, description, promptText) {
    const id = 'custom-' + Date.now();
    const skill = {
      id, name, description,
      icon: 'TXT', enabled: true, builtin: false,
      prompt: promptText.substring(0, 8000),
    };
    this.skills.push(skill);
    this.save();
    return skill;
  }

  /** Delete a user-imported skill */
  delete(id) {
    const idx = this.skills.findIndex(s => s.id === id && !s.builtin);
    if (idx >= 0) {
      this.skills.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  /** Get combined system prompt: base + all enabled skills */
  getSystemPrompt() {
    const skillsPrompt = this.skills
      .filter(s => s.enabled)
      .map(s => s.prompt)
      .join('\n\n---\n\n');

    return skillsPrompt
      ? `${BASE_SYSTEM_PROMPT}\n\n---\n\n${skillsPrompt}`
      : BASE_SYSTEM_PROMPT;
  }

  /** Get list of active skill names (for UI display) */
  getActiveCount() {
    return this.skills.filter(s => s.enabled).length;
  }

  /** Persist to localStorage */
  save() {
    const toggles = {};
    const custom = [];
    for (const s of this.skills) {
      toggles[s.id] = s.enabled;
      if (!s.builtin) custom.push(s);
    }
    localStorage.setItem('wf_skills', JSON.stringify({ toggles, custom }));
  }
}



