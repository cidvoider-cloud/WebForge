/**
 * WebForge Studio — Live Sandbox Preview Manager
 * Compiles React/JSX/TS/TSX + Tailwind + Lucide React in-browser and captures
 * runtime errors, console logs, fetch network requests, and DOM element inspection.
 */

import { isHtmlVfs } from './context-budget.mjs';

export class PreviewManager {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.iframe = document.getElementById('previewFrame');
    this.frameWrap = document.getElementById('previewFrameWrap');
    this.loader = document.getElementById('previewLoader');
    this.loaderTitle = document.getElementById('loaderTitle');
    this.loaderMsg = document.getElementById('loaderMessage');
    this.tooltip = document.getElementById('elementTooltip');

    this.currentDevice = 'desktop';
    this.currentFiles = {};
    this.consoleMessages = [];
    this.activeErrors = [];
    this.networkRequests = [];
    this.inspectMode = false;
    this.selectedElement = null;
    this._streamTimer = null;
    this._pendingFiles = null;

    if (this.iframe) {
      this.iframe.addEventListener('load', () => {
        this.hideLoader();
        this._syncInspectModeToFrame();
      });
    }

    this._setupDeviceButtons();
    this._setupMessageListener();
  }

  toggleInspectMode(force) {
    this.inspectMode = typeof force === 'boolean' ? force : !this.inspectMode;
    const btn = document.getElementById('btnInspectPreview');
    if (btn) {
      btn.classList.toggle('active', this.inspectMode);
      btn.setAttribute('aria-pressed', this.inspectMode ? 'true' : 'false');
    }
    if (!this.inspectMode && this.tooltip) {
      this.tooltip.classList.remove('visible');
    }
    this._syncInspectModeToFrame();
    return this.inspectMode;
  }

  _syncInspectModeToFrame() {
    try {
      this.iframe?.contentWindow?.postMessage({
        type: 'set-inspect-mode',
        enabled: !!this.inspectMode,
      }, '*');
    } catch {
      // Cross-origin or unloaded iframe
    }
  }

  buildPreviewHtml(files) {
    const safeFiles = files || {};
    return isHtmlVfs(safeFiles)
      ? this._getHtmlWebsiteTemplate(safeFiles)
      : this._getRunnerTemplate(safeFiles);
  }

  update(files) {
    this.currentFiles = files || {};
    this.activeErrors = [];
    this.renderErrorIndicator();

    if (!this.iframe) return;
    this.iframe.srcdoc = this.buildPreviewHtml(this.currentFiles);
  }

  streamUpdate(files) {
    this._pendingFiles = { ...files };
    if (this._streamTimer) return;
    this._streamTimer = setTimeout(() => {
      this._streamTimer = null;
      if (this._pendingFiles) {
        this.update(this._pendingFiles);
        this._pendingFiles = null;
      }
    }, 550);
  }

  flushStream() {
    clearTimeout(this._streamTimer);
    this._streamTimer = null;
    if (this._pendingFiles) {
      this.update(this._pendingFiles);
      this._pendingFiles = null;
    }
  }

  showLoader(title, message) {
    if (!this.loader) return;
    if (this.loaderTitle) this.loaderTitle.textContent = title || 'Compiling app…';
    if (this.loaderMsg) this.loaderMsg.textContent = message || 'Resolving modules…';
    this.loader.classList.remove('hidden');
  }

  hideLoader() {
    this.loader?.classList.add('hidden');
  }

  setDevice(device) {
    const nextDevice = ['desktop', 'tablet', 'mobile'].includes(device) ? device : 'desktop';
    this.currentDevice = nextDevice;
    if (this.frameWrap) {
      this.frameWrap.classList.remove('tablet', 'mobile');
      if (nextDevice !== 'desktop') this.frameWrap.classList.add(nextDevice);
    }
    document.querySelectorAll('.device-btn').forEach((btn) => {
      const isActive = btn.dataset.device === nextDevice;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  refresh() {
    this.update(this.currentFiles);
  }

  openInNewTab() {
    const blob = new Blob([this.getStandaloneTemplate(this.currentFiles)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  _setupMessageListener() {
    window.addEventListener('message', (e) => {
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'element-selected') {
        this._showTooltip(data);
        this.callbacks.onSelectElement?.(this.selectedElement);
      } else if (data.type === 'preview-console') {
        this.addConsoleMessage(data);
      } else if (data.type === 'preview-network') {
        this.addNetworkRequest(data);
      } else if (data.type === 'preview-error') {
        this.hideLoader();
        this.addError(data.error || {
          title: data.title || 'Preview Error',
          message: data.message || 'Unknown preview error',
          stack: data.stack || '',
        });
      } else if (data.type === 'preview-success') {
        this.hideLoader();
        this.clearErrors();
        this.callbacks.onSuccess?.();
      }
    });

    document.addEventListener('click', (e) => {
      if (this.tooltip && !this.tooltip.contains(e.target) && e.target !== this.iframe) {
        this.tooltip.classList.remove('visible');
      }
    });
  }

  addConsoleMessage(entry) {
    const item = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      level: entry.level || 'log',
      message: String(entry.message || ''),
      source: entry.source || 'preview',
      ts: Date.now(),
    };
    this.consoleMessages.push(item);
    if (this.consoleMessages.length > 100) this.consoleMessages.shift();
    this.callbacks.onConsole?.(this.consoleMessages);
  }

  clearConsole() {
    this.consoleMessages = [];
    this.callbacks.onConsole?.(this.consoleMessages);
  }

  addNetworkRequest(entry) {
    const item = {
      id: entry.id || Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      method: entry.method || 'GET',
      url: String(entry.url || ''),
      status: entry.status ?? 0,
      ok: !!entry.ok,
      durationMs: Number(entry.durationMs) || 0,
      error: entry.error || '',
      ts: Date.now(),
    };
    this.networkRequests.unshift(item);
    if (this.networkRequests.length > 60) this.networkRequests.pop();
    this.callbacks.onNetwork?.(this.networkRequests);
  }

  clearNetwork() {
    this.networkRequests = [];
    this.callbacks.onNetwork?.(this.networkRequests);
  }

  getDebugContext() {
    const errors = (this.activeErrors || [])
      .map((err) => `[${err.title || 'Error'}]\n${err.message || ''}\n${err.stack || ''}`)
      .join('\n\n');
    const logs = (this.consoleMessages || [])
      .slice(-14)
      .map((log) => `[${log.level}] ${log.message}`)
      .join('\n');
    return [
      errors ? `Preview errors:\n${errors}` : '',
      logs ? `Recent console logs:\n${logs}` : '',
    ].filter(Boolean).join('\n\n');
  }

  addError(error) {
    if (!error) return;
    if (!this.activeErrors.some((e) => e.message === error.message && e.title === error.title)) {
      this.activeErrors.push({
        title: error.title || 'Preview Error',
        message: error.message || 'Unknown error',
        stack: error.stack || '',
        ts: Date.now(),
      });
    }
    this.renderErrorIndicator();
    this.callbacks.onError?.(this.activeErrors);
  }

  clearErrors() {
    this.activeErrors = [];
    this.renderErrorIndicator();
    this.callbacks.onError?.(this.activeErrors);
  }

  renderErrorIndicator() {
    const btn = document.getElementById('btnAutoFix');
    const count = this.activeErrors.length;
    if (btn) {
      btn.classList.toggle('has-errors', count > 0);
      const label = btn.querySelector('.btn-label');
      if (label) {
        label.textContent = count > 0 ? `Auto-Fix (${count})` : 'Verify & Fix';
      } else {
        btn.innerHTML = `<i data-lucide="wrench"></i><span class="btn-label">${count > 0 ? `Auto-Fix (${count})` : 'Verify &amp; Fix'}</span>`;
        if (typeof window.lucide !== 'undefined') {
          try { window.lucide.createIcons({ root: btn }); } catch {}
        }
      }
    }
  }

  _showTooltip(data) {
    if (!this.tooltip || !this.iframe) return;
    const classes = String(data.classes || '').trim();
    const firstClass = classes ? '.' + classes.split(/\s+/)[0] : '';
    const label = (data.tag || 'div') + (data.id ? `#${data.id}` : '') + firstClass;
    this.selectedElement = {
      tag: data.tag || 'div',
      classes,
      id: data.id || '',
      text: String(data.text || '').trim().slice(0, 80),
      label,
    };

    const labelEl = this.tooltip.querySelector('.tooltip-label');
    if (labelEl) labelEl.textContent = label;
    this.tooltip.dataset.tag = this.selectedElement.tag;
    this.tooltip.dataset.classes = this.selectedElement.classes;
    this.tooltip.dataset.id = this.selectedElement.id;

    const iframeRect = this.iframe.getBoundingClientRect();
    const elemTop = iframeRect.top + (data.rect?.top || 0);
    const elemBottom = iframeRect.top + (data.rect?.bottom ?? ((data.rect?.top || 0) + (data.rect?.height || 0)));
    const minTop = iframeRect.top + 8;
    const maxTop = Math.max(minTop, window.innerHeight - 58);
    const aboveTop = elemTop - 48;
    const targetTop = aboveTop >= minTop ? aboveTop : elemBottom + 8;

    this.tooltip.style.top = Math.min(Math.max(minTop, targetTop), maxTop) + 'px';
    this.tooltip.style.left = Math.max(iframeRect.left + 8, Math.min(iframeRect.left + (data.rect?.left || 0), window.innerWidth - 290)) + 'px';
    this.tooltip.classList.add('visible');
  }

  clearSelectedElement() {
    this.selectedElement = null;
    this.tooltip?.classList.remove('visible');
    document.getElementById('selectedElementChip')?.classList.add('hidden');
  }

  getSelectedElementContext() {
    const sel = this.selectedElement;
    if (!sel) return '';
    let description = `<${sel.tag}`;
    if (sel.id) description += ` id="${sel.id}"`;
    if (sel.classes) description += ` class="${sel.classes}"`;
    description += `>`;
    if (sel.text) description += ` (text: "${sel.text}")`;
    return `[Context: The user selected the element \`${description}\` in the preview. Target changes specifically to this component/element.]`;
  }

  _setupDeviceButtons() {
    document.querySelectorAll('.device-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.setDevice(btn.dataset.device));
    });
  }

  getStandaloneTemplate(files) {
    return isHtmlVfs(files)
      ? this._getHtmlWebsiteTemplate(files, { inspector: false })
      : this._getRunnerTemplate(files, { inspector: false });
  }

  _buildSharedRuntimeBridge(inspectorEnabled, initialInspect) {
    return `
      window.__wfInspectMode = ${initialInspect ? 'true' : 'false'};
      const originalConsole = { log: console.log, warn: console.warn, error: console.error };
      ['log', 'warn', 'error'].forEach(function(level) {
        console[level] = function() {
          try {
            const message = Array.from(arguments).map(function(arg) {
              if (typeof arg === 'string') return arg;
              if (arg instanceof Error) return arg.message;
              try { return JSON.stringify(arg); } catch (e) { return String(arg); }
            }).join(' ');
            window.parent.postMessage({ type: 'preview-console', level: level, message: message, source: 'sandbox' }, '*');
          } catch (e) {}
          return originalConsole[level].apply(console, arguments);
        };
      });

      if (typeof window.fetch === 'function') {
        const origFetch = window.fetch.bind(window);
        window.fetch = async function(input, init) {
          const started = performance.now();
          const url = typeof input === 'string' ? input : (input && input.url) || '';
          const method = (init && init.method) || (input && input.method) || 'GET';
          try {
            const res = await origFetch(input, init);
            window.parent.postMessage({
              type: 'preview-network',
              method: String(method).toUpperCase(),
              url: String(url),
              status: res.status,
              ok: res.ok,
              durationMs: Math.round(performance.now() - started)
            }, '*');
            return res;
          } catch (err) {
            window.parent.postMessage({
              type: 'preview-network',
              method: String(method).toUpperCase(),
              url: String(url),
              status: 0,
              ok: false,
              error: err && err.message ? err.message : 'Network failure',
              durationMs: Math.round(performance.now() - started)
            }, '*');
            throw err;
          }
        };
      }

      if (${inspectorEnabled}) {
        window.addEventListener('message', function(ev) {
          if (ev.data && ev.data.type === 'set-inspect-mode') {
            window.__wfInspectMode = !!ev.data.enabled;
            document.body.style.cursor = window.__wfInspectMode ? 'crosshair' : '';
          }
        });
        document.addEventListener('mouseover', function(e) {
          if (!window.__wfInspectMode && !e.shiftKey) return;
          if (e.target === document.body || e.target === document.documentElement || e.target.id === 'root') return;
          if (e.target.dataset.wfPrevOutline === undefined) {
            e.target.dataset.wfPrevOutline = e.target.style.outline || '';
          }
          e.target.style.outline = '2px solid #2563EB';
        });
        document.addEventListener('mouseout', function(e) {
          if (e.target.dataset && e.target.dataset.wfPrevOutline !== undefined) {
            e.target.style.outline = e.target.dataset.wfPrevOutline;
            delete e.target.dataset.wfPrevOutline;
          }
        });
        document.addEventListener('click', function(e) {
          if (!window.__wfInspectMode && !e.shiftKey) return;
          e.preventDefault();
          e.stopPropagation();
          const r = e.target.getBoundingClientRect();
          window.parent.postMessage({
            type: 'element-selected',
            tag: e.target.tagName.toLowerCase(),
            classes: (typeof e.target.className === 'string' ? e.target.className : '').trim(),
            id: e.target.id || '',
            text: (e.target.innerText || e.target.textContent || '').trim().slice(0, 80),
            rect: { top: r.top, bottom: r.bottom, left: r.left, width: r.width, height: r.height }
          }, '*');
        }, true);
      }
    `;
  }

  _getRunnerTemplate(files, opts = {}) {
    const inspectorEnabled = opts.inspector !== false;
    const jsonString = JSON.stringify(files);
    const base64Files = btoa(unescape(encodeURIComponent(jsonString)));
    const bridge = this._buildSharedRuntimeBridge(inspectorEnabled, this.inspectMode);
    const appOrigin =
      typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
        ? window.location.origin
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18.2.0/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.development.js" crossorigin></script>
  <script>window.react = window.React; window.__WF_ORIGIN__ = ${JSON.stringify(appOrigin)};</script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js" crossorigin></script>
  <script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.js"></script>
  <script src="https://unpkg.com/lucide-react@0.460.0/dist/umd/lucide-react.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" crossorigin></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" crossorigin></script>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #fff; min-height: 100vh; }
    #root { min-height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.projectFiles = JSON.parse(decodeURIComponent(escape(atob("${base64Files}"))));
  </script>
  <script>
    (function() {
      const files = window.projectFiles || {};
      const modules = {};
      const cache = {};
      let hadError = false;

      ${bridge}

      function escapeHtmlLocal(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }

      function renderError(title, message, stack) {
        hadError = true;
        try {
          window.parent.postMessage({
            type: 'preview-error',
            error: { title: title, message: message, stack: stack || '' }
          }, '*');
        } catch (e) {}

        document.getElementById('root').innerHTML = \`
          <div style="padding: 20px; color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; margin: 16px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; font-size: 13px; line-height: 1.6;">
            <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #dc2626;">\${escapeHtmlLocal(title)}</h3>
            <p style="margin: 0;">\${escapeHtmlLocal(message)}</p>
          </div>
        \`;
      }

      window.addEventListener('error', function(e) {
        renderError('Runtime Error', e.message + ' (at ' + e.filename + ':' + e.lineno + ':' + e.colno + ')', e.error?.stack);
      });
      window.addEventListener('unhandledrejection', function(e) {
        renderError('Promise Rejection', e.reason?.message || String(e.reason), e.reason?.stack);
      });

      document.addEventListener('error', function(e) {
        const target = e.target;
        if (!target || target === window) return;
        const src = target.src || target.href || '';
        if (src) renderError('Resource Load Error', target.tagName.toLowerCase() + ' failed to load: ' + src, '');
      }, true);

      const rawLucide = window.LucideReact || {};
      const FallbackIcon = function(props) {
        return window.React.createElement('svg', Object.assign({
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        }, props), window.React.createElement('circle', { cx: 12, cy: 12, r: 9 }));
      };
      const safeLucide = typeof Proxy !== 'undefined'
        ? new Proxy(rawLucide, {
            get(target, prop) {
              if (prop in target) return target[prop];
              if (typeof prop === 'string' && /^[A-Z]/.test(prop)) {
                console.warn('[WebForge] Unknown lucide-react icon "' + prop + '" — using fallback icon.');
                return FallbackIcon;
              }
              return undefined;
            }
          })
        : rawLucide;

      class PreviewErrorBoundary extends window.React.Component {
        constructor(props) {
          super(props);
          this.state = { error: null };
        }
        static getDerivedStateFromError(error) {
          return { error };
        }
        componentDidCatch(error, info) {
          renderError(
            'React Render Error',
            error?.message || String(error),
            (error?.stack || '') + (info?.componentStack || '')
          );
        }
        render() {
          if (this.state.error) return null;
          return this.props.children;
        }
      }

      for (const path in files) {
        if (/\\.(jsx?|tsx?)$/i.test(path)) {
          try {
            const isTs = /\\.tsx?$/i.test(path);
            const presets = isTs ? ['react', 'env', 'typescript'] : ['react', 'env'];
            const compiled = Babel.transform(files[path], {
              filename: path,
              presets: presets
            }).code;
            modules[path] = { code: compiled };
          } catch (err) {
            renderError('Babel Compilation Error in ' + path, err.message, err.stack);
            return;
          }
        }
      }

      function resolvePath(currentPath, importPath) {
        if (importPath.startsWith('@/')) {
          const rest = importPath.slice(2);
          const candidates = [
            'src/' + rest, 'src/' + rest + '.tsx', 'src/' + rest + '.ts',
            'src/' + rest + '.jsx', 'src/' + rest + '.js', 'src/' + rest + '.json',
            'src/' + rest + '.css', 'src/' + rest + '/index.tsx', 'src/' + rest + '/index.ts',
            'src/' + rest + '/index.jsx', 'src/' + rest + '/index.js',
            rest, rest + '.jsx', rest + '.js', rest + '.tsx', rest + '.ts'
          ];
          for (const c of candidates) {
            if (files[c] !== undefined) return c;
          }
          return 'src/' + rest;
        }
        if (!importPath.startsWith('.')) return importPath;
        const parts = currentPath.split('/');
        parts.pop();
        const importParts = importPath.split('/');
        for (const part of importParts) {
          if (part === '.') continue;
          if (part === '..') parts.pop();
          else parts.push(part);
        }
        const resolved = parts.join('/');

        const exts = ['', '.tsx', '.ts', '.jsx', '.js', '.json', '.css', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];
        for (const ext of exts) {
          if (files[resolved + ext] !== undefined) return resolved + ext;
        }

        const sub = resolved.startsWith('src/') ? resolved.substring(4) : resolved;
        for (const ext of exts) {
          if (files[sub + ext] !== undefined) return sub + ext;
        }

        return resolved;
      }

      function customRequire(currentPath) {
        return function(importPath) {
          if (importPath === 'react') return window.React;
          if (importPath === 'react-dom' || importPath === 'react-dom/client') {
            return {
              createRoot: (el) => ({
                render: (component) => {
                  const root = window.ReactDOM.createRoot(el);
                  root.render(window.React.createElement(PreviewErrorBoundary, null, component));
                }
              })
            };
          }
          if (importPath === 'lucide-react') return safeLucide;
          if (importPath === 'gsap') {
            const g = window.gsap || {
              registerPlugin() {},
              context(fn) { try { fn?.(); } catch {} return { revert() {} }; },
              from() {}, to() {}, fromTo() {}, set() {}, timeline() { return { from() { return this; }, to() { return this; }, fromTo() { return this; }, kill() {} }; },
            };
            return { __esModule: true, default: g, gsap: g };
          }
          if (importPath === 'gsap/ScrollTrigger') {
            const st = window.ScrollTrigger || { refresh() {}, getAll() { return []; } };
            return { __esModule: true, default: st, ScrollTrigger: st };
          }

          const resolved = resolvePath(currentPath, importPath);
          if (cache[resolved]) return cache[resolved].exports;

          if (resolved.endsWith('.json') && files[resolved] !== undefined) {
            const parsed = JSON.parse(files[resolved]);
            cache[resolved] = { exports: parsed };
            return parsed;
          }

          if (resolved.endsWith('.css')) {
            const inlineLocalCss = (cssPath, seen = new Set()) => {
              if (seen.has(cssPath)) return '';
              seen.add(cssPath);
              const raw = files[cssPath] || '';
              return raw.replace(/@import\\s+(?:url\\()?['"](\\.\\.?\\/[^'"]+)['"]\\)?\\s*;?/g, (m, rel) => {
                const target = resolvePath(cssPath, rel);
                return files[target] !== undefined ? inlineLocalCss(target, seen) : '';
              });
            };
            const cssContent = inlineLocalCss(resolved);
            const styleId = 'style-' + resolved.replace(/[^a-z0-9]/gi, '-');
            let styleEl = document.getElementById(styleId);
            if (!styleEl) {
              styleEl = document.createElement('style');
              styleEl.id = styleId;
              document.head.appendChild(styleEl);
            }
            styleEl.textContent = cssContent;
            return {};
          }

          if (!modules[resolved]) {
            throw new Error('Module not found: "' + importPath + '" (resolved to "' + resolved + '")');
          }

          const module = { exports: {} };
          cache[resolved] = module;

          try {
            const runFn = new Function('require', 'module', 'exports', modules[resolved].code);
            runFn(customRequire(resolved), module, module.exports);
          } catch (err) {
            renderError('Runtime Execution Error in ' + resolved, err.stack || err.message);
            throw err;
          }

          return module.exports;
        };
      }

      try {
        const entryCandidates = ['src/main.tsx', 'src/main.jsx', 'src/index.tsx', 'src/index.jsx', 'src/App.tsx', 'src/App.jsx'];
        const entry = entryCandidates.find(p => !!files[p]) || null;

        if (!entry) {
          renderError('Entry Point Missing', 'Could not locate App entry mounting file (e.g. src/main.jsx or src/App.jsx)');
          return;
        }

        const req = customRequire(entry);
        const mod = req('./' + entry.split('/').pop());
        if ((entry === 'src/App.jsx' || entry === 'src/App.tsx') && mod && (mod.default || typeof mod === 'function')) {
          const Comp = mod.default || mod;
          const root = window.ReactDOM.createRoot(document.getElementById('root'));
          root.render(window.React.createElement(PreviewErrorBoundary, null, window.React.createElement(Comp)));
        }

        if (!hadError) {
          try { window.parent.postMessage({ type: 'preview-success' }, '*'); } catch (e) {}
        }
      } catch (err) {
        console.error(err);
        renderError('Bootstrap Error', err.stack || err.message);
      }
    })();
  </script>
</body>
</html>`;
  }

  _getHtmlWebsiteTemplate(files, opts = {}) {
    let html = files['index.html'] || '';
    const inspectorEnabled = opts.inspector !== false;
    const bridge = this._buildSharedRuntimeBridge(inspectorEnabled, this.inspectMode);

    const inspectorScript = `
<script>
  (function() {
    let hadError = false;
    ${bridge}
    window.addEventListener('error', function(err) {
      hadError = true;
      window.parent.postMessage({
        type: 'preview-error',
        error: { title: 'Runtime Error', message: err.message, stack: err.error ? err.error.stack : '' }
      }, '*');
    });
    window.addEventListener('unhandledrejection', function(err) {
      hadError = true;
      window.parent.postMessage({
        type: 'preview-error',
        error: {
          title: 'Unhandled Promise Rejection',
          message: err.reason ? err.reason.message || String(err.reason) : 'Unknown Promise Rejection',
          stack: err.reason?.stack || ''
        }
      }, '*');
    });
    document.addEventListener('error', function(err) {
      const target = err.target;
      if (!target || target === window) return;
      const src = target.src || target.href || '';
      if (src) {
        hadError = true;
        window.parent.postMessage({
          type: 'preview-error',
          error: { title: 'Resource Load Error', message: target.tagName.toLowerCase() + ' failed to load: ' + src, stack: '' }
        }, '*');
      }
    }, true);
    window.addEventListener('load', function() {
      if (!hadError) {
        try { window.parent.postMessage({ type: 'preview-success' }, '*'); } catch (e) {}
      }
    });
  })();
</script>`;

    html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, (match) => {
      const hrefMatch = match.match(/href=["']([^"']+)["']/i);
      if (hrefMatch) {
        const cleanPath = hrefMatch[1].replace(/^\.\//, '');
        if (files[cleanPath]) return `<style data-vfs-path="${cleanPath}">${files[cleanPath]}</style>`;
      }
      return match;
    });

    html = html.replace(/<script[^>]+src=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (match, src) => {
      const cleanPath = src.replace(/^\.\//, '');
      if (files[cleanPath]) return `<script data-vfs-path="${cleanPath}">${files[cleanPath]}</script>`;
      return match;
    });

    if (inspectorEnabled) {
      if (html.includes('</body>')) html = html.replace('</body>', inspectorScript + '</body>');
      else html += inspectorScript;
    }

    return html;
  }
}
