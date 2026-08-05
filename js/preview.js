/**
 * WebForge AI â€” Lovable-Style Live Preview (v3)
 * Handles in-browser Babel compilation of React + Tailwind + Lucide React in VFS project files.
 */

class PreviewManager {
  constructor() {
    this.iframe = document.getElementById('previewFrame');
    this.frameWrap = document.getElementById('previewFrameWrap');
    this.loader = document.getElementById('previewLoader');
    this.loaderTitle = document.getElementById('loaderTitle');
    this.loaderMsg = document.getElementById('loaderMessage');
    this.tooltip = document.getElementById('elementTooltip');
    this.currentDevice = 'desktop';
    this.currentFiles = {};
    this.consoleMessages = [];
    this._streamTimer = null;
    this._pendingFiles = null;
    
    // Auto hide loader when iframe finishes loading
    this.iframe.addEventListener('load', () => this.hideLoader());

    this._setupDeviceButtons();
    this._setupMessageListener();
  }

  /** Update preview with virtual file system (VFS) files */
  update(files) {
    this.currentFiles = files;
    
    const template = files['index.html']
      ? this._getHtmlWebsiteTemplate(files)
      : this._getRunnerTemplate(files);
    
    this.iframe.srcdoc = template;
  }

  /** Throttled VFS update for streaming generator */
  streamUpdate(files) {
    this._pendingFiles = { ...files };
    if (this._streamTimer) return;
    this._streamTimer = setTimeout(() => {
      this._streamTimer = null;
      if (this._pendingFiles) {
        this.update(this._pendingFiles);
        this._pendingFiles = null;
      }
    }, 500);
  }

  /** Flush pending VFS stream updates */
  flushStream() {
    clearTimeout(this._streamTimer);
    this._streamTimer = null;
    if (this._pendingFiles) {
      this.update(this._pendingFiles);
      this._pendingFiles = null;
    }
  }

  /** Toggle compiler loading overlay */
  showLoader(title, message) {
    if (this.loader) {
      this.loaderTitle.textContent = title || 'Compiling App...';
      this.loaderMsg.textContent = message || 'Resolving dependencies...';
      this.loader.classList.remove('hidden');
    }
  }

  hideLoader() {
    if (this.loader) {
      this.loader.classList.add('hidden');
    }
  }

  /** Set device preview frame width */
  setDevice(device) {
    if (!this.frameWrap) return;
    const nextDevice = ['desktop', 'tablet', 'mobile'].includes(device) ? device : 'desktop';
    this.currentDevice = nextDevice;
    this.frameWrap.classList.remove('tablet', 'mobile');
    if (nextDevice !== 'desktop') this.frameWrap.classList.add(nextDevice);
    document.querySelectorAll('.device-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.device === nextDevice);
    });
  }

  /** Refresh current preview run */
  refresh() {
    this.update(this.currentFiles);
  }

  /** Open compiled HTML page in a new window */
  openInNewTab() {
    // Generate standalone runner package
    const blob = new Blob([this.getStandaloneTemplate(this.currentFiles)], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  }

  /** Listen for element selections and compiler events in the iframe */
  _setupMessageListener() {
    this.activeErrors = [];

    window.addEventListener('message', (e) => {
      if (e.data?.type === 'element-selected') {
        this._showTooltip(e.data);
      } else if (e.data?.type === 'preview-console') {
        this.addConsoleMessage(e.data);
      } else if (e.data?.type === 'preview-error') {
        this.hideLoader();
        this.addError(e.data.error || {
          title: e.data.title || 'Preview Error',
          message: e.data.message || 'Unknown preview error',
          stack: e.data.stack || ''
        });
      } else if (e.data?.type === 'preview-success') {
        this.hideLoader();
        this.clearErrors();
      }
    });

    // Hide tooltip when clicking outside the preview frame
    document.addEventListener('click', (e) => {
      if (this.tooltip && !this.tooltip.contains(e.target) && e.target !== this.iframe) {
        this.tooltip.classList.remove('visible');
      }
    });
  }

  addConsoleMessage(entry) {
    this.consoleMessages.push({
      level: entry.level || 'log',
      message: entry.message || '',
      source: entry.source || 'preview'
    });
    if (this.consoleMessages.length > 30) this.consoleMessages.shift();
  }

  getDebugContext() {
    const errors = (this.activeErrors || []).map(err => `[${err.title || 'Error'}]\n${err.message || ''}\n${err.stack || ''}`).join('\n\n');
    const logs = (this.consoleMessages || []).slice(-12).map(log => `[${log.level}] ${log.message}`).join('\n');
    return [
      errors ? `Preview errors:\n${errors}` : '',
      logs ? `Recent console logs:\n${logs}` : ''
    ].filter(Boolean).join('\n\n');
  }

  addError(error) {
    console.error('[WebForge Live Preview Error Log]', error);
    if (this.activeErrors.some(e => e.message === error.message)) return;
    this.activeErrors.push(error);
    this.renderErrorIndicator();
  }

  clearErrors() {
    this.activeErrors = [];
    this.renderErrorIndicator();
  }

  renderErrorIndicator() {
    const btn = document.getElementById('btnAutoFix');
    if (!btn) return;
    if (this.activeErrors.length > 0) {
      btn.innerHTML = `<i data-lucide="sparkles"></i> Auto-Fix (${this.activeErrors.length})`;
      btn.classList.remove('hidden');
      if (typeof lucide !== 'undefined') {
        try { lucide.createIcons(); } catch {}
      }
    } else {
      btn.classList.add('hidden');
    }
  }

  /** Show element action inspector floating above preview */
  _showTooltip(data) {
    if (!this.tooltip) return;
    const label = data.tag + (data.id ? `#${data.id}` : '') + (data.classes ? `.${data.classes.split(' ')[0]}` : '');
    this.tooltip.querySelector('.tooltip-label').textContent = label;
    this.tooltip.dataset.tag = data.tag;
    this.tooltip.dataset.classes = data.classes;
    this.tooltip.dataset.id = data.id;

    // Calculate positioning relative to the iframe container viewport
    const iframeRect = this.iframe.getBoundingClientRect();
    const top = iframeRect.top + (data.rect?.top || 0) - 40;
    const left = iframeRect.left + (data.rect?.left || 0);

    this.tooltip.style.top = Math.max(60, top) + 'px';
    this.tooltip.style.left = Math.min(left, window.innerWidth - 320) + 'px';
    this.tooltip.classList.add('visible');
  }

  /** Get context string for AI edits based on selected element */
  getSelectedElementContext() {
    if (!this.tooltip || !this.tooltip.classList.contains('visible')) return '';
    const tag = this.tooltip.dataset.tag || '';
    const classes = this.tooltip.dataset.classes || '';
    const id = this.tooltip.dataset.id || '';
    
    let description = `<${tag}`;
    if (id) description += ` id="${id}"`;
    if (classes) description += ` class="${classes}"`;
    description += `>`;
    
    return `[Context: The user has clicked on the element \`${description}\` in the preview. Target changes specifically to this component/element.]`;
  }

  _setupDeviceButtons() {
    document.querySelectorAll('.device-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setDevice(btn.dataset.device));
    });
  }

  getStandaloneTemplate(files) {
    return files['index.html']
      ? this._getHtmlWebsiteTemplate(files, { inspector: false })
      : this._getRunnerTemplate(files, { inspector: false });
  }

  /** Build self-contained HTML page containing Babel compiler, Tailwind, React, and code tree */
  _getRunnerTemplate(files, opts = {}) {
    const inspectorEnabled = opts.inspector !== false;
    const jsonString = JSON.stringify(files);
    // Base64 encode to prevent double-escaping / string termination issues in the iframe script tag
    const base64Files = btoa(unescape(encodeURIComponent(jsonString)));

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18.2.0/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.development.js" crossorigin></script>
  <script>window.react = window.React;</script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js" crossorigin></script>
  <script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.js"></script>
  <script src="https://unpkg.com/lucide-react@0.300.0/dist/umd/lucide-react.min.js"></script>
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

      function renderError(title, message, stack) {
        try {
          window.parent.postMessage({
            type: 'preview-error',
            error: { title: title, message: message, stack: stack || '' }
          }, '*');
        } catch (e) {}

        document.getElementById('root').innerHTML = \`
          <div style="padding: 24px; color: #b91c1c; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; margin: 16px; font-family: monospace; white-space: pre-wrap; font-size: 13px; line-height: 1.6;">
            <h3 style="margin-top: 0; font-size: 16px; font-weight: 700; color: #ef4444; display: flex; align-items: center; gap: 8px;"><span>⚠️</span> \${title}</h3>
            <p>\${message}</p>
          </div>
        \`;
      }

      window.addEventListener('error', function(e) {
        renderError('Runtime Error', e.message + ' (at ' + e.filename + ':' + e.lineno + ':' + e.colno + ')', e.error?.stack);
      });
      window.addEventListener('unhandledrejection', function(e) {
        renderError('Promise Rejection', e.reason?.message || String(e.reason), e.reason?.stack);
      });      const originalConsole = { log: console.log, warn: console.warn, error: console.error };
      ['log', 'warn', 'error'].forEach(function(level) {
        console[level] = function() {
          try {
            const message = Array.from(arguments).map(function(arg) {
              if (typeof arg === 'string') return arg;
              try { return JSON.stringify(arg); } catch (e) { return String(arg); }
            }).join(' ');
            window.parent.postMessage({ type: 'preview-console', level: level, message: message, source: 'runner' }, '*');
          } catch (e) {}
          return originalConsole[level].apply(console, arguments);
        };
      });

      document.addEventListener('error', function(e) {
        const target = e.target;
        if (!target || target === window) return;
        const src = target.src || target.href || '';
        if (src) renderError('Resource Load Error', target.tagName.toLowerCase() + ' failed to load: ' + src, '');
      }, true);


      // Transpile React / JSX modules using Babel
      for (const path in files) {
        if (path.endsWith('.js') || path.endsWith('.jsx')) {
          try {
            const compiled = Babel.transform(files[path], {
              presets: ['react', 'env']
            }).code;
            modules[path] = { code: compiled };
          } catch (err) {
            renderError('Babel Compilation Error in ' + path, err.message, err.stack);
            return;
          }
        }
      }

      // Resolve module relative imports inside VFS
      function resolvePath(currentPath, importPath) {
        if (!importPath.startsWith('.')) return importPath;
        const parts = currentPath.split('/');
        parts.pop(); // remove current file name
        const importParts = importPath.split('/');
        for (const part of importParts) {
          if (part === '.') continue;
          if (part === '..') parts.pop();
          else parts.push(part);
        }
        const resolved = parts.join('/');
        
        // Try extensions
        if (files[resolved]) return resolved;
        if (files[resolved + '.jsx']) return resolved + '.jsx';
        if (files[resolved + '.js']) return resolved + '.js';
        if (files[resolved + '/index.jsx']) return resolved + '/index.jsx';
        if (files[resolved + '/index.js']) return resolved + '/index.js';
        
        // Fallbacks without 'src/' prefix
        const sub = resolved.startsWith('src/') ? resolved.substring(4) : resolved;
        if (files[sub]) return sub;
        if (files[sub + '.jsx']) return sub + '.jsx';
        if (files[sub + '.js']) return sub + '.js';

        return resolved;
      }

      // Custom module require handler
      function customRequire(currentPath) {
        return function(importPath) {
          if (importPath === 'react') return window.React;
          if (importPath === 'react-dom' || importPath === 'react-dom/client') {
            return {
              createRoot: (el) => ({
                render: (component) => {
                  const root = ReactDOM.createRoot(el);
                  root.render(component);
                }
              })
            };
          }
          if (importPath === 'lucide-react') return window.LucideReact;

          const resolved = resolvePath(currentPath, importPath);
          if (cache[resolved]) return cache[resolved].exports;
          
          // Inject and return empty exports for CSS imports
          if (resolved.endsWith('.css')) {
            const cssContent = files[resolved] || '';
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
        // Find entry file
        const entry = files['src/main.jsx'] ? 'src/main.jsx' :
                      files['src/index.jsx'] ? 'src/index.jsx' :
                      files['src/App.jsx'] ? 'src/App.jsx' : null;

        if (!entry) {
          renderError('Entry Point Missing', 'Could not locate App entry mounting file (e.g. src/main.jsx or src/App.jsx)');
          return;
        }

        const req = customRequire(entry);
        req('./' + entry.split('/').pop());

        try {
          window.parent.postMessage({ type: 'preview-success' }, '*');
        } catch (e) {}

        // Injected element interaction listener
        if (${inspectorEnabled}) {
        document.addEventListener('mouseover', function(e) {
          if (e.target === document.body || e.target === document.documentElement || e.target.id === 'root') return;
          e.target.style.outline = '2px solid rgba(59, 130, 246, 0.4)';
        });
        document.addEventListener('mouseout', function(e) {
          if (e.target === document.body || e.target === document.documentElement || e.target.id === 'root') return;
          e.target.style.outline = '';
        });
        document.addEventListener('click', function(e) {
          const r = e.target.getBoundingClientRect();
          window.parent.postMessage({
            type: 'element-selected',
            tag: e.target.tagName.toLowerCase(),
            classes: (typeof e.target.className === 'string' ? e.target.className : '').trim(),
            id: e.target.id || '',
            rect: { top: r.top, left: r.left, width: r.width, height: r.height }
          }, '*');
        }, true);
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
    
    // Inject the communication / inspector scripts
    const inspectorScript = `
<script>
  (function() {
    try {
      window.parent.postMessage({ type: 'preview-success' }, '*');
    } catch (e) {}    const originalConsole = { log: console.log, warn: console.warn, error: console.error };
    ['log', 'warn', 'error'].forEach(function(level) {
      console[level] = function() {
        try {
          const message = Array.from(arguments).map(function(arg) {
            if (typeof arg === 'string') return arg;
            try { return JSON.stringify(arg); } catch (e) { return String(arg); }
          }).join(' ');
          window.parent.postMessage({ type: 'preview-console', level: level, message: message, source: 'html' }, '*');
        } catch (e) {}
        return originalConsole[level].apply(console, arguments);
      };
    });


    document.addEventListener('mouseover', function(e) {
      if (e.target === document.body || e.target === document.documentElement) return;
      e.target.style.outline = '2px solid rgba(59, 130, 246, 0.4)';
    });
    document.addEventListener('mouseout', function(e) {
      if (e.target === document.body || e.target === document.documentElement) return;
      e.target.style.outline = '';
    });
    document.addEventListener('click', function(e) {
      const r = e.target.getBoundingClientRect();
      window.parent.postMessage({
        type: 'element-selected',
        tag: e.target.tagName.toLowerCase(),
        classes: (typeof e.target.className === 'string' ? e.target.className : '').trim(),
        id: e.target.id || '',
        rect: { top: r.top, left: r.left, width: r.width, height: r.height }
      }, '*');
    }, true);
    
    // Capture runtime errors
    window.addEventListener('error', function(err) {
      window.parent.postMessage({
        type: 'preview-error',
        title: 'Runtime Error',
        message: err.message,
        stack: err.error ? err.error.stack : ''
      }, '*');
    });
    window.addEventListener('unhandledrejection', function(err) {
      window.parent.postMessage({
        type: 'preview-error',
        title: 'Unhandled Promise Rejection',
        message: err.reason ? err.reason.message || String(err.reason) : 'Unknown Promise Rejection'
      }, '*');
    });
    document.addEventListener('error', function(err) {
      const target = err.target;
      if (!target || target === window) return;
      const src = target.src || target.href || '';
      if (src) {
        window.parent.postMessage({
          type: 'preview-error',
          title: 'Resource Load Error',
          message: target.tagName.toLowerCase() + ' failed to load: ' + src
        }, '*');
      }
    }, true);
  })();
</script>
`;

    if (inspectorEnabled) {
      if (html.includes('</body>')) {
        html = html.replace('</body>', inspectorScript + '</body>');
      } else {
        html += inspectorScript;
      }
    }

    // Replace link stylesheets with inline style tags from VFS
    html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, (match) => {
      const hrefMatch = match.match(/href=["']([^"']+)["']/i);
      if (hrefMatch) {
        const href = hrefMatch[1];
        const cleanPath = href.replace(/^\.\//, '');
        if (files[cleanPath]) {
          return `<style data-vfs-path="${cleanPath}">${files[cleanPath]}</style>`;
        }
      }
      return match;
    });

    // Replace script tags with inline script tags from VFS
    html = html.replace(/<script[^>]+src=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (match, src) => {
      const cleanPath = src.replace(/^\.\//, '');
      if (files[cleanPath]) {
        return `<script data-vfs-path="${cleanPath}">${files[cleanPath]}</script>`;
      }
      return match;
    });

    return html;
  }
}

