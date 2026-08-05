# WebForge AI — Architecture Guide

Static vanilla HTML/CSS/JS app. No build tools, no npm, no bundler. Serve with `python -m http.server 8000` or `start.bat`.

## What it is

Lovable-style AI website builder. Users chat with an AI to generate multi-file React apps. Code is compiled and previewed in a sandboxed iframe (Babel Standalone + Tailwind CDN). Everything runs client-side.

### User flow

```
Home hero (optional prompt) → Workspace
  → Chat left / live preview + code right
  → Prompt Wizard modal for structured briefs
  → AI streams VFS file blocks → parse → compile → preview
```

## Project structure

```
├── index.html
├── start.bat
├── css/
│   ├── app.css
│   └── prompt-builder.css
├── js/
│   ├── providers.js      # AIProvider
│   ├── skills.js         # SkillManager + BASE_SYSTEM_PROMPT
│   ├── prompt-builder.js # Prompt Wizard
│   ├── preview.js        # PreviewManager (Babel + iframe)
│   ├── demos.js          # Built-in demo VFS projects
│   ├── app.js            # Main controller
│   └── check-wizard-footer.js
├── README.md
├── LICENSE
└── AI_DEVELOPER_GUIDE.md
```

### Script load order (do not change)

```html
<script src="js/providers.js"></script>
<script src="js/skills.js"></script>
<script src="js/prompt-builder.js"></script>
<script src="js/preview.js"></script>
<script src="js/demos.js"></script>
<script src="js/app.js"></script>
```

- Global scope only — no ES modules, no `import`/`export`
- Do not add npm, webpack, vite, or bundlers

## Architecture

### Layout

```
body
└── .app
    ├── #homeView (landing)
    ├── .topbar + .main (workspace)
    │   ├── .chat
    │   └── .workspace (preview / code)
    └── dialogs (#promptBuilderModal, #settingsModal, …)
```

### Core modules

| Module | Role |
|--------|------|
| `AIProvider` | Chat completions against OpenRouter / LM Studio / Ollama / custom |
| `SkillManager` | Toggleable prompt skills + base system prompt |
| `PromptBuilder` | 7-step wizard → generated prompt → continue to chat |
| `PreviewManager` | VFS → Babel → sandboxed iframe; error reporting |
| `app.js` | Projects, VFS, chat streaming, export, UI wiring |

### Persistence (`localStorage`)

| Key | Contents |
|-----|----------|
| `wf_provider` | Provider config **including API key** |
| `wf_projects` | Project list metadata |
| `wf_vfs_*` | Per-project virtual filesystem |
| `wf_chat_*` | Per-project chat history |
| `wf_skills` | Enabled skills |
| `wf_vfs_history_*` | Version history snapshots |

Treat keys in `wf_provider` as secrets. Never commit real keys into source.

### VFS / AI output

The model returns file operations that `app.js` parses into the virtual filesystem, then `preview.js` compiles for the iframe. Prefer complete file blocks the parser already understands; do not invent a new response format without updating the parser.

## Rules for contributors

1. Prefer smallest change that fixes the issue
2. Reuse existing patterns in `css/` and `js/`
3. Keep the Prompt Wizard footer as a single `#wizardFooter` outside scrollable step panels
4. Run `node js/check-wizard-footer.js` after changing footer visibility rules
5. Do not reintroduce TemplateMo dumps, competitor prompt scrapes, or nested unrelated repos
