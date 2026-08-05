# WebForge AI

Client-side AI website builder. Describe what you want in chat; WebForge generates a multi-file React app, compiles it in the browser, and previews it live.

No backend. Your API keys and projects stay in the browser (`localStorage`).

## Features

- Chat-driven generation and edits
- Live sandboxed preview (Babel + Tailwind CDN)
- Multi-project workspace with export (ZIP / static HTML)
- Prompt Wizard for structured site briefs
- Providers: OpenRouter, LM Studio, Ollama, custom OpenAI-compatible APIs

## Quick start

**Requirements**
- A modern browser (Chrome, Edge, or Firefox)
- **Python 3.8+** *or* **Node.js 18+** for the local server
- Internet access the first time you use live preview (loads React, Tailwind, Babel, Lucide from CDNs)

There is **no `npm install`**. The app is static HTML/CSS/JS.

### Windows

Double-click or run:

```bat
start.bat
```

The launcher will:
1. Verify project files are present  
2. Detect Python or Node (installs Python via `winget` if neither exists)  
3. Check CDN reachability  
4. Start a local server on port 8000  
5. Open the app when ready  

### Any OS

```bash
python -m http.server 8000 --bind 127.0.0.1
# or
node tools/serve.mjs 8000
```

Then open [http://127.0.0.1:8000](http://127.0.0.1:8000).

Opening `index.html` via `file://` may break CDN scripts or the preview sandbox — use the local server.

## Configure AI

1. Click **Settings**
2. Choose a provider:
   - **OpenRouter** — paste an API key (`sk-or-v1-...`)
   - **LM Studio** — local server (default `http://localhost:1234`)
   - **Ollama** — local server (default `http://localhost:11434`)
   - **Custom** — any OpenAI-compatible base URL + key
3. Load models, pick one, save

Keys are stored only in your browser (`localStorage` key `wf_provider`). Clear site data to remove them.

## Project layout

```
├── index.html
├── start.bat
├── css/
│   ├── app.css
│   └── prompt-builder.css
├── js/
│   ├── providers.js
│   ├── skills.js
│   ├── prompt-builder.js
│   ├── preview.js
│   ├── demos.js            # Built-in flora demo projects
│   ├── app.js
│   └── check-wizard-footer.js
├── README.md
├── LICENSE
└── AI_DEVELOPER_GUIDE.md
```

Script load order in `index.html` (do not reorder):

1. `providers.js`
2. `skills.js`
3. `prompt-builder.js`
4. `preview.js`
5. `demos.js`
6. `app.js`

## Security notes

- API keys never leave your machine except to the provider you configure.
- Preview runs in a sandboxed iframe; treat generated code as untrusted.
- This app is for local / trusted use. Hosting it publicly still means each visitor’s keys live in *their* browser — do not inject your own keys into the source.

## Demo sites

On first load, WebForge seeds three flora-themed React demos you can open from the dashboard:

1. **Petal Pop** — cute neighborhood florist
2. **Atelier Botanica** — stylish botanical studio
3. **Wild Fern Co.** — flora nursery & garden market

They live in browser storage like any other project. Clearing site data re-seeds them.

## License

MIT — see [LICENSE](LICENSE).
