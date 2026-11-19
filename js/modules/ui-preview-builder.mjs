/**
 * WebForge Studio — Animated Interactive Fullscreen UI Preview Builder
 *
 * Pure module that constructs self-contained, animated, interactive HTML documents
 * for the Fullscreen UI Component Previewer across all library types:
 *   1. Built-in & custom style packs (previewHtml + tokensCss + previewScript)
 *   2. Awesome Components (6,345+ Tailwind v4/shadcn/Aceternity renderedHtml snapshots)
 *   3. Code-only React JSX/TSX custom components (live Babel + React runtime)
 */

function escapeScriptSafe(str) {
  return String(str || '').replace(/<\/script>/gi, '<\\/script>');
}

function escapeHtmlAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Unwraps Next.js image proxy URLs — both relative (`/_next/image?url=...`)
 * and full-origin (`https://example.com/_next/image?url=...`) — back to their
 * real remote image URLs, and upgrades insecure `http://` image URLs to `https://`.
 */
export function unwrapNextImageUrls(html = '') {
  let out = String(html || '').replace(
    /(?:https?:\/\/[^"'\s>\/]+)?\/_next\/image\?([^"'\s>)]+)/gi,
    (full, queryStr) => {
      try {
        const normalized = queryStr.replace(/&amp;/g, '&');
        const params = new URLSearchParams(normalized);
        const target = params.get('url');
        if (target && /^https?:\/\//i.test(target)) {
          return target.replace(/^http:\/\//i, 'https://');
        }
      } catch {
        // Keep original on malformed query
      }
      return full;
    }
  );
  // Promote lazy data-src when src is missing or a 1x1 transparent gif placeholder
  out = out.replace(
    /<img\b([^>]*?)\bsrc=["'](?:data:image\/gif;base64,[^"']*|)["']([^>]*?)\bdata-src=["']([^"']+)["']([^>]*)>/gi,
    '<img$1src="$3"$2$4>'
  );
  out = out.replace(
    /<img\b([^>]*?)\bdata-src=["']([^"']+)["']([^>]*?)\bsrc=["'](?:data:image\/gif;base64,[^"']*|)["']([^>]*)>/gi,
    '<img$1src="$2"$3$4>'
  );
  // Strip stale srcset referencing /_next/image or relative paths so unwrapped src wins
  out = out.replace(/\s+srcset=["'][^"']*(?:\/_next\/image|placeholder\.svg)[^"']*["']/gi, '');
  out = out.replace(/(<img\b[^>]*\bsrc=["'])http:\/\//gi, '$1https://');
  return out;
}

/**
 * Peels off redundant outer BuilderStudio screenshot harness divs such as:
 *   <div class="w-screen min-h-screen flex justify-center items-center">...</div>
 * Uses balanced <div> depth tracking so sibling divs are never broken.
 */
export function unwrapBuilderHarnessDivs(rawHtml = '') {
  let html = String(rawHtml || '').trim();
  let strippedLabBg = false;
  for (let pass = 0; pass < 5; pass++) {
    // Strip leading 21st.dev / Aceternity dot-grid harness backdrop: <div class="absolute lab-bg ...">...</div>
    const labBgMatch = html.match(/^<div\b[^>]*\bclass=["'][^"']*\blab-bg\b[^"']*["'][^>]*>/i);
    if (labBgMatch) {
      const divRe = /<\/?div\b[^>]*>/gi;
      let d = 0;
      let endIdx = -1;
      let m;
      while ((m = divRe.exec(html)) !== null) {
        if (/^<\/div/i.test(m[0])) {
          d -= 1;
          if (d === 0) {
            endIdx = divRe.lastIndex;
            break;
          }
        } else if (!/\/>\s*$/.test(m[0])) {
          d += 1;
        }
      }
      if (endIdx > 0) {
        html = html.slice(endIdx).trim();
        strippedLabBg = true;
        continue;
      }
    }

    const openMatch = html.match(/^<div\b([^>]*)>/i);
    if (!openMatch || !/<\/div>\s*$/i.test(html)) break;

    const attrs = openMatch[1] || '';
    const clsMatch = attrs.match(/\bclass=["']([^"']*)["']/i);
    const idMatch = attrs.match(/\bid=["']([^"']*)["']/i);
    const cls = clsMatch ? clsMatch[1] : '';
    const idVal = idMatch ? idMatch[1] : '';

    const isRootId = /^(?:root|__next)$/i.test(idVal);
    const isViewportHarness =
      /\b(?:w-screen|min-h-screen|h-screen)\b/.test(cls) &&
      /\bflex\b/.test(cls) &&
      /\bjustify-center\b/.test(cls) &&
      /\bitems-center\b/.test(cls) &&
      !/\b(?:border|shadow|rounded|grid|card|bg-gradient|bg-linear|from-|via-|to-|overflow-hidden|bg-black|bg-zinc|bg-slate|bg-neutral)\b/.test(cls);
    const isLabBgInnerWrapper =
      strippedLabBg &&
      /^flex\s+w-full\s+justify-center\s+relative$/i.test(cls.trim());

    if (!isRootId && !isViewportHarness && !isLabBgInnerWrapper) break;

    const tagRe = /<\/?div\b[^>]*>/gi;
    let depth = 0;
    let closesEarly = false;
    let match;
    while ((match = tagRe.exec(html)) !== null) {
      const token = match[0];
      if (/^<\/div/i.test(token)) {
        depth -= 1;
        if (depth === 0 && tagRe.lastIndex < html.trimEnd().length) {
          closesEarly = true;
          break;
        }
      } else if (!/\/>\s*$/.test(token)) {
        depth += 1;
      }
    }

    if (closesEarly || depth !== 0) break;

    html = html
      .slice(openMatch[0].length)
      .replace(/<\/div>\s*$/i, '')
      .trim();
    if (isLabBgInnerWrapper) strippedLabBg = false;
  }
  return html;
}

/**
 * Sanitizes an Awesome Components rendered.html snapshot:
 *  - Handles both fragment snapshots and full `<!DOCTYPE html><html>...` documents
 *  - Preserves safe inline `<style>` tags while stripping scripts & broken `/_next/` links
 *  - Unwraps redundant BuilderStudio outer viewport harness divs
 *  - Unwraps `/_next/image?url=...` proxy URLs (both relative and full-origin)
 *  - Adds `referrerpolicy="no-referrer"` on `<img>` tags so external CDNs never block them
 *  - Maps remaining component-internal `h-screen`/`h-[100vh]` to `h-[640px]` (NOT `min-h-0`)
 *    so full-bleed gradients, auroras, and hero sections keep their intended canvas height!
 */
export function sanitizeAwesomeRenderedHtml(rawHtml = '') {
  let html = String(rawHtml || '').trim();
  const preservedStyles = [];

  html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, cssBody) => {
    const cleanCss = String(cssBody || '')
      .replace(/@import\s+url\((['"]?)\/_next\/[^)]*\)\s*;?/gi, '')
      .trim();
    if (cleanCss) preservedStyles.push(cleanCss);
    return '';
  });

  html = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '');

  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    html = bodyMatch[1].trim();
  } else {
    html = html
      .replace(/<!doctype\b[^>]*>/gi, '')
      .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, '')
      .trim();
  }

  html = unwrapBuilderHarnessDivs(html);
  html = unwrapNextImageUrls(html);

  // Add referrerpolicy="no-referrer" to external images so Unsplash/CDNs don't reject srcdoc frames
  html = html.replace(/<img\b(?![^>]*\breferrerpolicy=)/gi, '<img referrerpolicy="no-referrer"');

  // Normalize w-screen to w-full, and preserve full-bleed component heights (640px) so
  // gradient/aurora/shader backgrounds never collapse to 0px!
  html = html
    .replace(/\bw-screen\b/g, 'w-full')
    .replace(/\bmin-w-screen\b/g, 'min-w-0 w-full')
    .replace(/\bh-screen\b/g, 'h-[640px]')
    .replace(/\bh-dvh\b/g, 'h-[640px]')
    .replace(/\bh-\[100v?h\]/g, 'h-[640px]')
    .replace(/\bmin-h-screen\b/g, 'min-h-[600px]')
    .replace(/\bmin-h-dvh\b/g, 'min-h-[600px]')
    .replace(/\bmin-h-\[100v?h\]/g, 'min-h-[600px]')
    // Prevent iframe compositor stalls on heavy Aceternity filters while preserving identical visuals
    .replace(/\bafter:\[background-attachment:fixed\]/g, 'after:[background-attachment:scroll]')
    .replace(/\[background-attachment:fixed\]/g, '[background-attachment:scroll]')
    .replace(/\[filter:url\(#blurMe\)_blur\(40px\)\]/g, 'blur-2xl')
    .replace(/(<feGaussianBlur\b[^>]*\bstdDeviation=["'])(\d+(?:\.\d+)?)(["'])/gi, (_, pre, val, post) => {
      const n = parseFloat(val);
      return `${pre}${n > 65 ? 65 : val}${post}`;
    });

  return {
    bodyHtml: html,
    extraCss: preservedStyles.join('\n'),
  };
}

/**
 * Detects pure <canvas> / WebGL / Three.js / audio-visualizer snapshots where
 * `wundercorp/awesome-components` only saved an empty <canvas> element with no
 * JavaScript drawing code and no real HTML UI content.
 */
export function isCanvasOnlySnapshot(rawHtml = '') {
  const html = String(rawHtml || '');
  if (!/<canvas\b/i.test(html)) return false;
  if (/<(?:button|input|textarea|select|form|nav|h1|h2|h3|table|a)\b/i.test(html)) return false;
  const visibleText = html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return visibleText.length < 18;
}

/**
 * Detects whether a component snapshot intentionally targets a dark background
 * (e.g. bg-black, bg-[#0a0a0c], bg-zinc-950, bg-slate-900, or pure canvas).
 */
export function isDarkSurfaceSnapshot(rawHtml = '') {
  const html = String(rawHtml || '');
  if (isCanvasOnlySnapshot(html)) return true;
  if (/aria-label=["'][^"']*iphone mockup/i.test(html)) return true;
  return /\b(?:bg-black(?![\/])|bg-black\/(?:[7-9]\d|100)|bg-black\/\[0?\.[7-9]\d*\]|bg-zinc-9(?:00|50)|bg-slate-9(?:00|50)|bg-neutral-9(?:00|50)|bg-gray-9(?:00|50)|bg-stone-9(?:00|50)|bg-\[#0[0-9a-f]{2,7}\]|bg-\[#1[0-9a-f]{2,7}\])\b/i.test(html)
    || /--gradient-background-start|--glow-color|--shiny-cta|background-color\s*:\s*(?:#0|#1|rgb\(\s*[0-2]\d?\s*,)/i.test(html);
}

/**
 * Detects whether a component is a mobile-only or phone mockup component
 * (so the previewer can auto-select Mobile framing or rescue `md:hidden` roots).
 */
export function isMobileComponentSnapshot(rawHtml = '', name = '') {
  const html = String(rawHtml || '');
  const title = String(name || '');
  if (/\b(?:iphone|mobile\s+(?:menu|nav|bar|drawer|sheet|tab)|phone\s+mockup)\b/i.test(title)) {
    return true;
  }
  if (/aria-label=["'][^"']*(?:iphone|phone|mobile)\s+mockup/i.test(html)) {
    return true;
  }
  // Root or top-level container hidden on desktop breakpoints (`md:hidden` / `lg:hidden`) without a desktop counterpart
  const hasMobileHidden = /\b(?:sm|md|lg):hidden\b/.test(html);
  const hasDesktopShown = /\bhidden\b/.test(html) && /\b(?:sm|md|lg|xl):(?:flex|block|grid|inline-flex)\b/.test(html);
  return hasMobileHidden && !hasDesktopShown;
}

/**
 * Detects whether a snapshot uses semantic `primary`/`brand` accent utilities
 * typical of landing pages where monochrome `--primary` would wash out accents.
 */
export function needsVibrantPrimaryAccent(rawHtml = '') {
  const html = String(rawHtml || '');
  const usesPrimaryToken = /\b(?:from-primary|via-primary|to-primary|bg-primary(?:\/\d+)?|text-primary(?:\/\d+)?|border-primary|ring-primary|bg-brand|text-brand|from-brand)\b/.test(html);
  if (!usesPrimaryToken) return false;
  // If the component already defines its own vibrant Tailwind brand hue, keep its author palette intact
  const hasExplicitBrandHue = /\b(?:bg|from|to)-(?:blue|indigo|violet|purple|emerald|teal|cyan|amber|orange|rose|pink|red|sky|lime|fuchsia)-(?:400|500|600)\b/.test(html);
  return !hasExplicitBrandHue;
}

/**
 * Interactive micro-behavior, Shadow-DOM custom element hydration, broken-image
 * fallback, authentic <canvas> handling, collapsed media/fan-carousel layout rescue,
 * Framer Motion opacity:0 unfreezing, and non-destructive entrance animation script.
 */
function buildInteractiveRuntimeScript({ hasCustomScript = false, animate = true, screenshotUrl = '', canvasOnly = false } = {}) {
  const safeShotUrl = JSON.stringify(String(screenshotUrl || ''));
  return `
<script>
(function () {
  var WF_SCREENSHOT_URL = ${safeShotUrl};
  var WF_CANVAS_ONLY = ${canvasOnly ? 'true' : 'false'};
  var toastTimer = null;
  function showPreviewToast(msg) {
    var el = document.getElementById('wfPreviewToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  // Context-aware rich SVG artwork fallback for missing/blocked remote images,
  // placeholder.svg files, and broken CSS background-image URLs.
  function buildContextualFallbackUri(hint, width, height) {
    var raw = String(hint || '').trim();
    var lower = raw.toLowerCase();
    var w = Math.max(120, Math.min(1200, Math.round(width || 800)));
    var h = Math.max(80, Math.min(900, Math.round(height || 520)));
    var label = raw.replace(/[<>&"']/g, '').slice(0, 26);

    // 1. Small avatar / user portrait
    if (/avatar|user|profile|author|person|face|portrait|headshot|ceo|founder/.test(lower) || (w <= 120 && h <= 120 && Math.abs(w - h) < 28)) {
      var initials = (label.replace(/[^a-zA-Z\\s]/g, '').trim().split(/\\s+/).map(function (p) { return p[0] || ''; }).join('').slice(0, 2) || 'WF').toUpperCase();
      var avSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">'
        + '<defs><linearGradient id="ag" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs>'
        + '<rect width="160" height="160" fill="url(#ag)"/>'
        + '<circle cx="80" cy="60" r="28" fill="rgba(255,255,255,0.22)"/>'
        + '<path d="M32 146c6-28 28-44 48-44s42 16 48 44" fill="rgba(255,255,255,0.2)"/>'
        + '<text x="80" y="92" text-anchor="middle" fill="#ffffff" font-family="Inter,system-ui,sans-serif" font-size="42" font-weight="700">' + initials + '</text>'
        + '</svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(avSvg);
    }

    // 2. Brand logo / partner mark (only when alt/hint explicitly indicates a logo or partner mark)
    if (/logo|brand|partner|sponsor|client/.test(lower)) {
      var brandTxt = (label || 'ACME STUDIO').slice(0, 14);
      var logoSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 96">'
        + '<rect width="280" height="96" rx="14" fill="#18181b" fill-opacity="0.72"/>'
        + '<rect x="24" y="28" width="40" height="40" rx="10" fill="#6366f1"/>'
        + '<path d="M36 48l8 8 12-16" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
        + '<text x="80" y="56" fill="#f4f4f5" font-family="Inter,system-ui,sans-serif" font-size="22" font-weight="700" letter-spacing="-0.4">' + brandTxt + '</text>'
        + '</svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(logoSvg);
    }

    // 3. Dashboard / App UI / Product / Editorial artwork (clean pure-vector UI, zero clipped text)
    var palettes = [
      ['#0f172a', '#1e3a8a', '#38bdf8', '#818cf8'],
      ['#18181b', '#3b0764', '#c084fc', '#f472b6'],
      ['#0c1220', '#064e3b', '#34d399', '#38bdf8'],
      ['#1c1917', '#7c2d12', '#fb923c', '#fbbf24']
    ];
    var seed = 0;
    for (var s = 0; s < raw.length; s++) seed = (seed * 31 + raw.charCodeAt(s)) % 997;
    var pal = palettes[seed % palettes.length];
    var cardSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid slice">'
      + '<defs>'
      + '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="' + pal[0] + '"/><stop offset="55%" stop-color="' + pal[1] + '"/><stop offset="100%" stop-color="' + pal[0] + '"/></linearGradient>'
      + '<linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="' + pal[2] + '"/><stop offset="100%" stop-color="' + pal[3] + '"/></linearGradient>'
      + '</defs>'
      + '<rect width="800" height="520" fill="url(#bg)"/>'
      + '<circle cx="660" cy="110" r="180" fill="' + pal[2] + '" fill-opacity="0.18"/>'
      + '<circle cx="160" cy="430" r="190" fill="' + pal[3] + '" fill-opacity="0.16"/>'
      + '<rect x="72" y="64" width="656" height="392" rx="22" fill="rgba(15,23,42,0.62)" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/>'
      + '<circle cx="106" cy="96" r="6" fill="#fb7185"/><circle cx="128" cy="96" r="6" fill="#fbbf24"/><circle cx="150" cy="96" r="6" fill="#34d399"/>'
      + '<rect x="106" y="132" width="220" height="16" rx="8" fill="rgba(255,255,255,0.82)"/>'
      + '<rect x="106" y="160" width="150" height="10" rx="5" fill="rgba(255,255,255,0.28)"/>'
      + '<rect x="106" y="198" width="276" height="118" rx="14" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.10)"/>'
      + '<path d="M126 290 C175 245, 225 275, 276 232 C312 204, 342 224, 362 212" fill="none" stroke="url(#bar)" stroke-width="4" stroke-linecap="round"/>'
      + '<circle cx="276" cy="232" r="5.5" fill="' + pal[2] + '"/><circle cx="362" cy="212" r="5.5" fill="' + pal[3] + '"/>'
      + '<rect x="406" y="198" width="286" height="118" rx="14" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.10)"/>'
      + '<rect x="430" y="226" width="140" height="12" rx="6" fill="url(#bar)" fill-opacity="0.9"/>'
      + '<rect x="430" y="252" width="220" height="8" rx="4" fill="rgba(255,255,255,0.22)"/>'
      + '<rect x="430" y="272" width="180" height="8" rx="4" fill="rgba(255,255,255,0.16)"/>'
      + '<rect x="106" y="336" width="586" height="86" rx="14" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.09)"/>'
      + '<rect x="128" y="358" width="160" height="42" rx="10" fill="' + pal[2] + '" fill-opacity="0.18"/>'
      + '<rect x="304" y="358" width="160" height="42" rx="10" fill="' + pal[3] + '" fill-opacity="0.16"/>'
      + '<rect x="480" y="358" width="190" height="42" rx="10" fill="rgba(255,255,255,0.06)"/>'
      + '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cardSvg);
  }

  function isLikelyBrokenSrc(src) {
    if (!src) return true;
    var s = String(src).trim();
    if (!s || s === '#' || s.indexOf('data:image/gif;base64,R0lGOD') === 0) return true;
    if (/placeholder\\.svg/i.test(s)) return true;
    if (/^\\/(?!\\/)/.test(s)) return true;
    return false;
  }

  function wireImageFallbacks() {
    // 1. Heal <img> tags (missing, relative, placeholder.svg, or network-blocked)
    var imgs = document.querySelectorAll('#wfStageRoot img');
    Array.prototype.forEach.call(imgs, function (img) {
      function applyFallback() {
        if (img.dataset.wfFallbackApplied) return;
        img.dataset.wfFallbackApplied = '1';
        img.removeAttribute('srcset');
        var rect = img.getBoundingClientRect();
        var hint = img.getAttribute('alt') || img.getAttribute('title') || img.className || 'Visual Preview';
        img.src = buildContextualFallbackUri(hint, rect.width || img.width, rect.height || img.height);
        if (!img.style.objectFit) img.style.objectFit = 'cover';
      }
      img.addEventListener('error', applyFallback);
      var rawSrc = img.getAttribute('src') || '';
      if (isLikelyBrokenSrc(rawSrc) || (img.complete && img.naturalWidth === 0)) {
        applyFallback();
      }
    });

    // 2. Heal CSS background-image: url(...) slots (e.g. broken Fey/Next static media mockups)
    var bgNodes = document.querySelectorAll('#wfStageRoot [style*="background-image"], #wfStageRoot [style*="background:"]');
    Array.prototype.forEach.call(bgNodes, function (node) {
      var bg = node.style.backgroundImage || '';
      var urlMatch = bg.match(/url\\(["']?([^"')]+)["']?\\)/i);
      if (!urlMatch || !urlMatch[1]) return;
      var url = urlMatch[1].trim();
      if (url.indexOf('data:') === 0) return;

      function replaceBg() {
        if (node.dataset.wfBgFallbackApplied) return;
        node.dataset.wfBgFallbackApplied = '1';
        var rect = node.getBoundingClientRect();
        var hint = node.getAttribute('aria-label') || node.getAttribute('title') || 'Showcase Visual';
        node.style.backgroundImage = 'url("' + buildContextualFallbackUri(hint, rect.width, rect.height) + '")';
        node.style.backgroundSize = 'cover';
        node.style.backgroundPosition = 'center';
      }

      if (isLikelyBrokenSrc(url)) {
        replaceBg();
        return;
      }
      var probe = new Image();
      probe.referrerPolicy = 'no-referrer';
      probe.onerror = replaceBg;
      probe.src = url;
    });
  }

  // Handle empty <canvas> snapshots authentically:
  // - Pure <canvas> components (e.g. Siri Wave, Globe, Fluid Sim) where GitHub only stored
  //   an empty <canvas> tag WITHOUT JS drawing code render the real original reference image
  //   inside the canvas's exact box instead of a misleading generic blob.
  // - Hybrid DOM + <canvas> heroes (e.g. Hero Shader with real HTML nav/text/buttons on top)
  //   render a live animated procedural shader / wireframe backdrop without clobbering explicit sizing.
  function hydrateEmptyCanvases() {
    var canvases = document.querySelectorAll('#wfStageRoot canvas');
    if (!canvases.length) return;

    if (WF_CANVAS_ONLY && WF_SCREENSHOT_URL) {
      var primaryCanvas = canvases[0];
      var wrapper = primaryCanvas.parentElement || document.getElementById('wfStageRoot');
      var existingW = primaryCanvas.style.width || (primaryCanvas.getAttribute('width') ? primaryCanvas.getAttribute('width') + 'px' : '');
      var existingH = primaryCanvas.style.height || (primaryCanvas.getAttribute('height') ? primaryCanvas.getAttribute('height') + 'px' : '');
      var frame = document.createElement('div');
      frame.className = primaryCanvas.className || 'rounded-[20px] bg-black overflow-hidden';
      frame.style.position = 'relative';
      frame.style.display = 'flex';
      frame.style.alignItems = 'center';
      frame.style.justifyContent = 'center';
      frame.style.overflow = 'hidden';
      frame.style.width = existingW || 'min(520px, 90vw)';
      frame.style.height = existingH || '380px';
      frame.style.maxWidth = '100%';
      frame.style.background = '#000';
      var img = document.createElement('img');
      img.src = WF_SCREENSHOT_URL;
      img.alt = 'Original component reference capture';
      img.referrerPolicy = 'no-referrer';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      img.style.display = 'block';
      img.style.transition = 'transform 500ms cubic-bezier(0.22,1,0.36,1)';
      frame.appendChild(img);
      primaryCanvas.replaceWith(frame);

      var note = document.createElement('div');
      note.textContent = 'Canvas / WebGL capture — GitHub snapshot omits JS runtime code. Click "Build with AI" to generate the live animated version.';
      note.style.marginTop = '16px';
      note.style.padding = '7px 14px';
      note.style.borderRadius = '999px';
      note.style.fontSize = '12px';
      note.style.lineHeight = '1.4';
      note.style.color = 'rgba(226,232,240,0.82)';
      note.style.background = 'rgba(15,23,42,0.78)';
      note.style.border = '1px solid rgba(148,163,184,0.22)';
      note.style.textAlign = 'center';
      note.style.maxWidth = '560px';
      if (wrapper && wrapper.parentElement) {
        wrapper.style.flexDirection = 'column';
        wrapper.appendChild(note);
      }
      return;
    }

    Array.prototype.forEach.call(canvases, function (canvas, cIdx) {
      var parent = canvas.parentElement;
      var isWireframe = parent && parent.getAttribute('wireframe') === 'true';
      var bgAttr = (parent && parent.getAttribute('backgroundcolor')) || '';
      var hasExplicitSize = Boolean(canvas.style.width || canvas.style.height);
      if (!hasExplicitSize) {
        canvas.style.width = '100%';
        canvas.style.height = '100%';
      }
      canvas.style.display = 'block';

      if (isWireframe) {
        var wCtx = canvas.getContext('2d');
        if (!wCtx) return;
        canvas.width = 640;
        canvas.height = 400;
        wCtx.clearRect(0, 0, 640, 400);
        wCtx.strokeStyle = 'rgba(255,255,255,0.08)';
        wCtx.lineWidth = 1;
        for (var x = 0; x <= 640; x += 32) {
          wCtx.beginPath(); wCtx.moveTo(x, 0); wCtx.lineTo(x, 400); wCtx.stroke();
        }
        for (var y = 0; y <= 400; y += 32) {
          wCtx.beginPath(); wCtx.moveTo(0, y); wCtx.lineTo(640, y); wCtx.stroke();
        }
        return;
      }

      var ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = 640;
      canvas.height = 400;

      var baseBg = (bgAttr && bgAttr !== 'transparent') ? bgAttr : '#07080f';
      var orbs = [
        { cx: 0.25, cy: 0.35, r: 240, color: 'rgba(124, 58, 237, 0.58)', sx: 0.00055, sy: 0.00042, phase: cIdx * 1.4 },
        { cx: 0.72, cy: 0.30, r: 260, color: 'rgba(56, 189, 248, 0.45)', sx: 0.00041, sy: 0.00051, phase: 2.1 },
        { cx: 0.52, cy: 0.75, r: 250, color: 'rgba(236, 72, 153, 0.42)', sx: 0.00048, sy: 0.00037, phase: 4.0 },
        { cx: 0.18, cy: 0.78, r: 210, color: 'rgba(99, 102, 241, 0.48)', sx: 0.00036, sy: 0.00046, phase: 5.2 }
      ];

      var lastDraw = 0;
      function drawShader(ts) {
        if (ts - lastDraw < 40) {
          requestAnimationFrame(drawShader);
          return;
        }
        lastDraw = ts;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = baseBg;
        ctx.fillRect(0, 0, 640, 400);
        ctx.globalCompositeOperation = 'screen';
        for (var i = 0; i < orbs.length; i++) {
          var o = orbs[i];
          var ox = (o.cx + Math.sin(ts * o.sx + o.phase) * 0.18) * 640;
          var oy = (o.cy + Math.cos(ts * o.sy + o.phase) * 0.16) * 400;
          var grad = ctx.createRadialGradient(ox, oy, 10, ox, oy, o.r);
          grad.addColorStop(0, o.color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(ox, oy, o.r, 0, Math.PI * 2);
          ctx.fill();
        }
        requestAnimationFrame(drawShader);
      }
      requestAnimationFrame(drawShader);
    });
  }

  // Rescue image containers whose custom external CSS module classes (e.g. .fan-layout / .fan-card)
  // were not saved in rendered.html, causing images inside absolute/inset-0 wrappers to collapse to 0x0.
  var wfFanDeck = null;
  function rotateFanDeck(delta) {
    if (!wfFanDeck || !wfFanDeck.cards.length) return false;
    var n = wfFanDeck.cards.length;
    wfFanDeck.offset = (wfFanDeck.offset + delta + n) % n;
    for (var i = 0; i < n; i++) {
      var slot = wfFanDeck.slots[(i - wfFanDeck.offset + n) % n];
      var card = wfFanDeck.cards[i];
      card.style.transform = slot.transform;
      card.style.zIndex = slot.zIndex;
      card.style.opacity = slot.opacity;
      card.style.pointerEvents = slot.opacity === '0' ? 'none' : 'auto';
    }
    if (wfFanDeck.dots && wfFanDeck.dots.length === n) {
      var activeIdx = (wfFanDeck.initialCenter + wfFanDeck.offset) % n;
      for (var d = 0; d < n; d++) {
        var dot = wfFanDeck.dots[d];
        var isActive = d === activeIdx;
        dot.style.transform = isActive ? 'scale(1.35)' : 'scale(1)';
        dot.style.opacity = isActive ? '1' : '0.35';
        dot.style.backgroundColor = isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))';
      }
    }
    return true;
  }

  function healCollapsedMediaContainers() {
    var stage = document.getElementById('wfStageRoot');
    if (!stage) return;

    // 1. Detect fan / stacked card decks whose external CSS (.fan-card, .fan-layout, etc.) collapsed them to 0x0
    var transformedCards = Array.prototype.filter.call(
      stage.querySelectorAll('div[style*="transform"]'),
      function (el) {
        if (!el.querySelector('img')) return false;
        var tf = el.style.transform || '';
        return /translate|rotate|scale/.test(tf);
      }
    );

    if (transformedCards.length >= 3) {
      var deckParent = transformedCards[0].parentElement;
      var sameParentCards = transformedCards.filter(function (c) { return c.parentElement === deckParent; });
      if (sameParentCards.length >= 3) {
        var firstRect = sameParentCards[0].getBoundingClientRect();
        if (firstRect.width < 24 || firstRect.height < 24) {
          deckParent.style.position = 'relative';
          deckParent.style.width = '100%';
          deckParent.style.minHeight = '480px';
          deckParent.style.display = 'flex';
          deckParent.style.alignItems = 'center';
          deckParent.style.justifyContent = 'center';
          deckParent.style.overflow = 'visible';

          var slots = [];
          var initialCenter = 0;
          var bestZ = -1;
          sameParentCards.forEach(function (card, idx) {
            var zNum = parseInt(card.style.zIndex || '0', 10) || 0;
            if (zNum > bestZ) { bestZ = zNum; initialCenter = idx; }
            slots.push({
              transform: card.style.transform || '',
              zIndex: card.style.zIndex || '1',
              opacity: card.style.opacity || '1'
            });
            card.style.position = 'absolute';
            card.style.width = '260px';
            card.style.height = '390px';
            card.style.borderRadius = '20px';
            card.style.overflow = 'hidden';
            card.style.boxShadow = '0 22px 52px rgba(0, 0, 0, 0.34)';
            card.style.transition = 'transform 460ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease';
            card.style.cursor = 'pointer';
            card.style.pointerEvents = card.style.opacity === '0' ? 'none' : 'auto';
            card.addEventListener('click', function () {
              var n = sameParentCards.length;
              var curCenter = (wfFanDeck.initialCenter + wfFanDeck.offset) % n;
              if (idx !== curCenter) {
                var diff = (idx - curCenter + n) % n;
                rotateFanDeck(diff <= n / 2 ? diff : diff - n);
              }
            });
          });

          // Find matching dot indicators if present
          var section = deckParent.closest('section') || stage;
          var dotCandidates = section.querySelectorAll('span.rounded-full');
          var dots = dotCandidates.length === sameParentCards.length ? Array.prototype.slice.call(dotCandidates) : [];
          dots.forEach(function (dot, dIdx) {
            dot.style.cursor = 'pointer';
            dot.addEventListener('click', function () {
              var n = sameParentCards.length;
              var curCenter = (wfFanDeck.initialCenter + wfFanDeck.offset) % n;
              var diff = (dIdx - curCenter + n) % n;
              if (diff !== 0) rotateFanDeck(diff <= n / 2 ? diff : diff - n);
            });
          });

          wfFanDeck = { cards: sameParentCards, slots: slots, offset: 0, initialCenter: initialCenter, dots: dots };
        }
      }
    }

    // 2. Rescue any other non-hidden <img> collapsed to 0x0 due to missing external CSS classes
    var imgs = stage.querySelectorAll('img');
    Array.prototype.forEach.call(imgs, function (img) {
      var rect = img.getBoundingClientRect();
      if (rect.width >= 12 && rect.height >= 12) return;
      var ancestor = img.parentElement;
      for (var step = 0; step < 4 && ancestor && ancestor !== stage; step++) {
        var cs = getComputedStyle(ancestor);
        if (cs.display === 'none' || cs.opacity === '0' || ancestor.style.opacity === '0') return;
        var ar = ancestor.getBoundingClientRect();
        if (ar.width < 12 || ar.height < 12) {
          if (ar.width < 12) ancestor.style.minWidth = '240px';
          if (ar.height < 12) ancestor.style.minHeight = '260px';
          if (cs.position === 'static') ancestor.style.position = 'relative';
          ancestor.style.overflow = ancestor.style.overflow || 'hidden';
          ancestor.style.borderRadius = ancestor.style.borderRadius || '14px';
        }
        ancestor = ancestor.parentElement;
      }
    });
  }

  // Hydrate empty Shadow-DOM custom elements (e.g. <number-flow-react>) stripped during static capture
  function hydrateShadowCustomElements() {
    var flows = document.querySelectorAll('number-flow-react');
    if (!flows.length) return;
    var defaultPrices = ['$8.99', '$12.99', '$24.99', '$49.00', '$99.00'];
    var priceIdx = 0;
    Array.prototype.forEach.call(flows, function (el) {
      if ((el.textContent || '').trim()) return;
      var parentText = (el.parentElement && el.parentElement.parentElement ? el.parentElement.parentElement.textContent : '') || '';
      var isCounter = Boolean(el.closest('div') && el.closest('div').querySelectorAll('button').length >= 2);
      if (isCounter) {
        var rowText = (el.closest('[class*="justify-between"]') || el.parentElement.parentElement || document.body).textContent || '';
        var numMatch = rowText.match(/\\b(\\d+)\\s+(?:users?|seats?|items?|members?)\\b/i);
        el.textContent = numMatch ? numMatch[1] : '3';
        el.dataset.wfCounterValue = el.textContent;
      } else if (/month|year|plan|billing|price|pro|plus|standard|advanced|enterprise/i.test(parentText)) {
        el.textContent = defaultPrices[priceIdx % defaultPrices.length];
        el.dataset.wfMonthly = el.textContent;
        priceIdx += 1;
      } else {
        el.textContent = '1,248';
      }
      el.style.display = 'inline-block';
      el.style.fontVariantNumeric = 'tabular-nums';
    });
  }

  // Unfreeze Framer Motion / scroll-reveal elements captured at inline style="opacity: 0"
  // while preserving intentionally hidden off-deck carousel slides (z-index: 0 with visible siblings).
  function unfreezeHiddenScrollElements() {
    var stage = document.getElementById('wfStageRoot');
    if (!stage) return;
    var nodes = stage.querySelectorAll('[style*="opacity"]');
    var idx = 0;
    Array.prototype.forEach.call(nodes, function (node) {
      if (node.closest('#wfPreviewToast')) return;
      if (node.style.opacity !== '0') return;
      // Preserve off-deck carousel slides when sibling cards in the same deck are visible
      if (node.parentElement) {
        var hasVisibleSibling = Array.prototype.some.call(node.parentElement.children, function (sib) {
          return sib !== node && sib.style && sib.style.opacity === '1' && sib.style.transform;
        });
        if (hasVisibleSibling && (node.style.zIndex === '0' || (node.style.transform || '').indexOf('scale(0.') !== -1)) {
          return;
        }
      }
      var cls = String(node.className || '');
      if (/\\b(?:sr-only|hidden|pointer-events-none)\\b/.test(cls) && !node.querySelector('h1,h2,h3,h4,p,img,svg,button')) return;
      var delay = Math.min(idx * 70, 500);
      idx += 1;
      node.style.transition = 'opacity 520ms cubic-bezier(0.22, 1, 0.36, 1) ' + delay + 'ms, transform 520ms cubic-bezier(0.22, 1, 0.36, 1) ' + delay + 'ms';
      requestAnimationFrame(function () {
        node.style.opacity = '1';
        if (node.style.transform && /translate|scale/.test(node.style.transform)) {
          node.style.transform = 'none';
        }
      });
    });
  }

  // Non-destructive entrance animation: skips elements with custom inline transforms
  // and cleans up animation classes on animationend so 3D / Framer transforms never get clobbered.
  function runEntranceAnimation() {
    var stage = document.getElementById('wfStageRoot');
    if (!stage) return;
    var targets = stage.querySelectorAll('section, article, header, nav, footer, form, table, .wf-ui-card, .wf-ui-hero, .wf-ui-pricing, .wf-ui-navbar, .wf-ui-table, .wf-ui-modal, .wf-ui-alert, .wf-ui-accordion, .wf-ui-tabs, .wf-ui-footer');
    var list = Array.prototype.slice.call(targets).filter(function (node) {
      if (node.offsetParent === null || node.closest('#wfPreviewToast')) return false;
      var inlineTf = (node.style && node.style.transform || '').trim();
      if (inlineTf && inlineTf !== 'none') return false;
      return true;
    }).slice(0, 16);
    if (!list.length) {
      list = [stage];
    }
    list.forEach(function (node, idx) {
      node.classList.remove('wf-anim-in');
      node.style.animationDelay = '';
      void node.offsetWidth;
      node.style.animationDelay = Math.min(idx * 50, 360) + 'ms';
      node.classList.add('wf-anim-in');
      node.addEventListener('animationend', function onEnd() {
        node.classList.remove('wf-anim-in');
        node.style.animationDelay = '';
        node.removeEventListener('animationend', onEnd);
      });
    });
  }

  function applyTheme(theme) {
    var isDark = theme !== 'light';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.setAttribute('data-preview-theme', isDark ? 'dark' : 'light');
    document.body.classList.toggle('wf-preview-light', !isDark);
    document.body.classList.toggle('wf-preview-dark', isDark);
  }

  window.addEventListener('message', function (e) {
    var data = e && e.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'wf-replay-animation') {
      runEntranceAnimation();
    } else if (data.type === 'wf-set-theme') {
      applyTheme(data.theme);
    }
  });

  // Hydrate missing glowing-border / spotlight / rainbow / shiny button variables
  // and bind subtle pointer-tracking spotlight coordinates for hover-glow buttons.
  function hydrateGlowEffects() {
    var stage = document.getElementById('wfStageRoot');
    if (!stage) return;
    var nodes = stage.querySelectorAll('button, a, [class*="glow"], [class*="shimmer"], [class*="shiny"], [class*="rainbow"], [class*="beam"], [class*="border-gradient"]');
    Array.prototype.forEach.call(nodes, function (el) {
      var cls = String(el.className || '');
      var inlineStyle = String(el.getAttribute('style') || '');
      var hay = cls + ' ' + inlineStyle;

      if (/--glow-color|glow-button|glowing/i.test(hay) && !el.style.getPropertyValue('--glow-color')) {
        el.style.setProperty('--glow-color', '#60a5fa');
        el.style.setProperty('--glow-color-via', 'rgba(96, 165, 250, 0.28)');
        el.style.setProperty('--glow-color-to', 'rgba(59, 130, 246, 0.05)');
      }
      if (/button-border|border-gradient|bg-gradient-to-r.*via-primary|shimmer|beam/i.test(hay)) {
        if (!el.style.boxShadow) {
          el.style.boxShadow = '0 0 0 1px rgba(129, 140, 248, 0.45), 0 0 22px -4px rgba(99, 102, 241, 0.45)';
        }
      }
      if (/glow|spotlight|hover|shine/i.test(hay)) {
        el.addEventListener('mousemove', function (ev) {
          var r = el.getBoundingClientRect();
          var x = ev.clientX - r.left;
          var y = ev.clientY - r.top;
          el.style.setProperty('--x', x + 'px');
          el.style.setProperty('--y', y + 'px');
          el.style.setProperty('--mouse-x', x + 'px');
          el.style.setProperty('--mouse-y', y + 'px');
        });
      }
    });
  }

  // Rescue mobile-only components hidden by desktop breakpoint utilities (md:hidden / lg:hidden),
  // scale tall fixed-pixel phone mockups (e.g. 417x876 iPhone bezel) to fit cleanly,
  // and hydrate completely blank phone screen slots so phone UIs never appear empty white.
  function rescueMobileAndPhoneViews() {
    var stage = document.getElementById('wfStageRoot');
    if (!stage) return;

    // 1. Un-hide mobile-only root wrappers if everything inside stage collapsed to 0px height
    var stageRect = stage.getBoundingClientRect();
    var hiddenMobileNodes = stage.querySelectorAll('.md\\\\:hidden, .lg\\\\:hidden, .sm\\\\:hidden');
    if (stageRect.height < 28 && hiddenMobileNodes.length) {
      Array.prototype.forEach.call(hiddenMobileNodes, function (node) {
        if (getComputedStyle(node).display === 'none') {
          node.style.display = 'flex';
          node.style.width = '100%';
          node.style.maxWidth = '420px';
          node.style.margin = '0 auto';
        }
      });
    }

    // 2. Hydrate empty iPhone / device mockup screens & scale tall bezels to viewport
    var phoneBezels = stage.querySelectorAll('[aria-label*="iPhone" i], [aria-label*="phone" i], [aria-label*="mockup" i]');
    Array.prototype.forEach.call(phoneBezels, function (bezel) {
      var rect = bezel.getBoundingClientRect();
      // Hydrate empty inner screen viewport (common in scottclayton3d/iphone-mockup default)
      var emptyScreen = Array.prototype.find.call(bezel.querySelectorAll('div'), function (d) {
        var st = d.getAttribute('style') || '';
        return /inset:\\s*59px\\s+0px\\s+34px/i.test(st) && d.children.length === 0 && !(d.textContent || '').trim();
      });
      if (emptyScreen && !emptyScreen.dataset.wfHydrated) {
        emptyScreen.dataset.wfHydrated = '1';
        var parentScreen = emptyScreen.parentElement;
        var hasWallpaper = parentScreen && Array.prototype.some.call(parentScreen.children, function (c) {
          return /background-image:\\s*url/i.test(c.getAttribute('style') || '');
        });
        if (parentScreen && !hasWallpaper) {
          parentScreen.style.background = 'radial-gradient(120% 80% at 50% 10%, #1d4ed8 0%, #0f172a 55%, #020617 100%)';
        }
        emptyScreen.innerHTML = ''
          + '<div style="padding:20px 22px;color:#f8fafc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;height:100%;gap:16px;">'
          + '  <div style="text-align:center;margin-top:10px;">'
          + '    <div style="font-size:13px;opacity:0.75;font-weight:500;">Thursday, Nov 19</div>'
          + '    <div style="font-size:64px;font-weight:700;letter-spacing:-0.04em;line-height:1.02;margin-top:4px;">9:41</div>'
          + '  </div>'
          + '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;">'
          + '    <div style="padding:14px;border-radius:20px;background:rgba(255,255,255,0.12);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.16);">'
          + '      <div style="font-size:11px;opacity:0.72;">Activity</div>'
          + '      <div style="font-size:22px;font-weight:700;margin-top:6px;">8,420</div>'
          + '      <div style="font-size:11px;color:#93c5fd;margin-top:2px;">steps today</div>'
          + '    </div>'
          + '    <div style="padding:14px;border-radius:20px;background:rgba(255,255,255,0.12);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.16);">'
          + '      <div style="font-size:11px;opacity:0.72;">Focus</div>'
          + '      <div style="font-size:22px;font-weight:700;margin-top:6px;">2h 15m</div>'
          + '      <div style="font-size:11px;color:#fcd34d;margin-top:2px;">deep work</div>'
          + '    </div>'
          + '  </div>'
          + '  <div style="padding:16px;border-radius:22px;background:rgba(15,23,42,0.58);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.14);">'
          + '    <div style="display:flex;justify-content:space-between;align-items:center;">'
          + '      <span style="font-size:13px;font-weight:600;">Design Review</span>'
          + '      <span style="font-size:11px;opacity:0.65;">10:30 AM</span>'
          + '    </div>'
          + '    <div style="font-size:12px;opacity:0.75;margin-top:6px;line-height:1.4;">Mobile UI preview hydrated inside device frame.</div>'
          + '  </div>'
          + '  <div style="margin-top:auto;padding:12px 16px;border-radius:24px;background:rgba(255,255,255,0.14);backdrop-filter:blur(16px);display:flex;justify-content:space-around;">'
          + '    <button type="button" style="width:44px;height:44px;border-radius:14px;border:none;background:#3b82f6;color:#fff;font-weight:700;cursor:pointer;">A</button>'
          + '    <button type="button" style="width:44px;height:44px;border-radius:14px;border:none;background:#10b981;color:#fff;font-weight:700;cursor:pointer;">M</button>'
          + '    <button type="button" style="width:44px;height:44px;border-radius:14px;border:none;background:#f59e0b;color:#fff;font-weight:700;cursor:pointer;">P</button>'
          + '    <button type="button" style="width:44px;height:44px;border-radius:14px;border:none;background:#8b5cf6;color:#fff;font-weight:700;cursor:pointer;">S</button>'
          + '  </div>'
          + '</div>';
      }

      // Auto-scale oversized fixed-height phone frames so the full device fits cleanly in the stage
      var availH = Math.max(420, window.innerHeight - 64);
      if (rect.height > availH && rect.height > 620) {
        var scale = Math.max(0.55, Math.min(0.95, availH / rect.height));
        var outer = bezel.parentElement || bezel;
        outer.style.transformOrigin = 'center center';
        outer.style.transform = 'scale(' + scale.toFixed(3) + ')';
        outer.style.margin = '0 auto';
      }
    });
  }

  // Safe interactive handlers for static HTML / Tailwind snapshots
  ${hasCustomScript ? '// Element provides custom previewScript; keep host interaction minimal.' : `
  function findOptionGroup(el) {
    var parent = el.parentElement;
    if (!parent) return null;
    // Direct siblings: <div class="flex"><button/><button/></div> or <nav><a/><a/></nav>
    var direct = Array.prototype.filter.call(parent.children, function (c) {
      return c.tagName === 'BUTTON' || c.tagName === 'A';
    });
    if (direct.length >= 2) return direct;
    // List items: <ul><li><a>...</a></li><li><a>...</a></li></ul>
    if (parent.tagName === 'LI' && parent.parentElement) {
      var listItems = Array.prototype.map.call(parent.parentElement.children, function (li) {
        return li.querySelector('a, button');
      }).filter(Boolean);
      if (listItems.length >= 2) return listItems;
    }
    return null;
  }

  function transferActiveOptionState(target, group) {
    if (!group || group.length < 2) return false;
    var activeClasses = ['bg-background', 'bg-accent', 'bg-muted', 'bg-primary', 'bg-secondary', 'bg-white', 'bg-neutral-100', 'bg-zinc-800', 'shadow-sm', 'shadow', 'font-semibold'];
    var prevActive = group.find(function (item) {
      return item !== target && (
        item.getAttribute('aria-selected') === 'true' ||
        item.getAttribute('aria-current') === 'page' ||
        item.dataset.state === 'active' ||
        item.classList.contains('active')
      );
    });

    group.forEach(function (sib) {
      var isTarget = sib === target;
      sib.setAttribute('aria-selected', String(isTarget));
      if (sib.tagName === 'A') {
        if (isTarget) sib.setAttribute('aria-current', 'page');
        else sib.removeAttribute('aria-current');
      }
      if (sib.dataset && sib.dataset.state) sib.dataset.state = isTarget ? 'active' : 'inactive';
      sib.classList.toggle('active', isTarget);
      sib.classList.toggle('wf-nav-active', isTarget);

      if (prevActive) {
        activeClasses.forEach(function (cls) {
          if (prevActive.classList.contains(cls) && !target.classList.contains(cls)) {
            if (isTarget) sib.classList.add(cls);
            else if (sib === prevActive) sib.classList.remove(cls);
          }
        });
      }

      var headingSpan = sib.querySelector('span[class*="text-2xl"], span[class*="text-3xl"], h3, h4');
      if (headingSpan) {
        headingSpan.style.color = isTarget ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))';
      }
      var bar = sib.querySelector('[class*="origin-top"], [class*="bg-foreground"]');
      if (bar) {
        bar.style.transition = 'height 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease';
        bar.style.height = isTarget ? '100%' : '0%';
        bar.style.opacity = isTarget ? '1' : '0';
      }
    });

    // Move any sliding indicator pill inside the shared nav container
    var navWrap = target.closest('nav, [role="tablist"], header') || target.parentElement;
    if (navWrap) {
      var slider = navWrap.querySelector('[data-wf-slider], .wf-nav-slider');
      if (slider) {
        var nr = navWrap.getBoundingClientRect();
        var tr = target.getBoundingClientRect();
        slider.style.transform = 'translateX(' + Math.round(tr.left - nr.left) + 'px)';
        slider.style.width = Math.round(tr.width) + 'px';
      }
    }

    // Switch matching [role="tabpanel"] if present
    var idx = group.indexOf(target);
    var section = target.closest('section, main, [role="tablist"]')?.parentElement || target.closest('section') || document.getElementById('wfStageRoot');
    if (section) {
      var panels = section.querySelectorAll('[role="tabpanel"]');
      if (panels.length >= 2 && idx >= 0 && idx < panels.length) {
        panels.forEach(function (p, pi) {
          p.hidden = pi !== idx;
          p.style.display = pi === idx ? '' : 'none';
          if (p.dataset) p.dataset.state = pi === idx ? 'active' : 'inactive';
        });
      }
      var mediaImg = section.querySelector('img');
      if (mediaImg && !target.closest('header, nav')) {
        mediaImg.classList.remove('wf-anim-in');
        void mediaImg.offsetWidth;
        mediaImg.classList.add('wf-anim-in');
      }
    }
    return true;
  }

  function activateSiblingTabButton(btn) {
    var group = findOptionGroup(btn);
    return group ? transferActiveOptionState(btn, group) : false;
  }

  function closeOpenPreviewPopovers(exceptEl) {
    var openMenus = document.querySelectorAll('.wf-preview-dropdown');
    Array.prototype.forEach.call(openMenus, function (m) {
      if (m !== exceptEl) m.remove();
    });
  }

  function toggleHeaderDropdown(trigger) {
    var existing = trigger.parentElement && trigger.parentElement.querySelector('.wf-preview-dropdown');
    if (existing) {
      existing.remove();
      trigger.setAttribute('aria-expanded', 'false');
      return true;
    }
    closeOpenPreviewPopovers(null);
    var label = (trigger.textContent || 'Menu').trim().replace(/\\s+/g, ' ').slice(0, 26);
    var menu = document.createElement('div');
    menu.className = 'wf-preview-dropdown';
    menu.innerHTML = ''
      + '<div class="wf-pd-head">' + label + '</div>'
      + '<button type="button" class="wf-pd-item">Overview &amp; Highlights</button>'
      + '<button type="button" class="wf-pd-item">Documentation &amp; API</button>'
      + '<button type="button" class="wf-pd-item">Templates &amp; Examples</button>';
    var parent = trigger.parentElement || document.body;
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    parent.appendChild(menu);
    trigger.setAttribute('aria-expanded', 'true');
    menu.addEventListener('click', function (ev) {
      var item = ev.target.closest('.wf-pd-item');
      if (item) {
        ev.stopPropagation();
        showPreviewToast(label + ' → ' + item.textContent.trim());
        menu.remove();
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
    return true;
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.wf-preview-dropdown')) {
      closeOpenPreviewPopovers(null);
    }

    var link = e.target.closest('a[href]');
    if (link) {
      e.preventDefault();
      var linkGroup = findOptionGroup(link);
      if (linkGroup && (link.closest('header, nav, [role="navigation"], ul') || linkGroup.length >= 2)) {
        transferActiveOptionState(link, linkGroup);
      }
      var label = (link.textContent || link.getAttribute('href') || 'link').trim().replace(/\\s+/g, ' ').slice(0, 36);
      showPreviewToast('Selected: ' + label);
      return;
    }

    var tab = e.target.closest('[role="tab"], .wf-ui-tab');
    if (tab) {
      activateSiblingTabButton(tab);
      showPreviewToast('Tab: ' + (tab.textContent || 'Selected').trim().replace(/\\s+/g, ' ').slice(0, 32));
      return;
    }

    var accBtn = e.target.closest('.wf-ui-acc-head, [data-accordion-trigger], [aria-expanded]');
    if (accBtn && !accBtn.matches('[role="tab"]') && !accBtn.closest('header, nav')) {
      var nextExpanded = accBtn.getAttribute('aria-expanded') !== 'true';
      accBtn.setAttribute('aria-expanded', String(nextExpanded));
      var item = accBtn.closest('.wf-ui-acc-item, [data-state]');
      if (item) {
        item.classList.toggle('open', nextExpanded);
        if (item.dataset) item.dataset.state = nextExpanded ? 'open' : 'closed';
      }
      return;
    }

    var btn = e.target.closest('button');
    if (btn && !btn.disabled) {
      var stepperGroup = btn.parentElement;
      var flowCounter = stepperGroup && stepperGroup.querySelector('number-flow-react[data-wf-counter-value]');
      if (flowCounter) {
        var btns = Array.prototype.slice.call(stepperGroup.querySelectorAll('button'));
        var idx = btns.indexOf(btn);
        var cur = parseInt(flowCounter.textContent || '3', 10) || 1;
        var next = idx === 0 ? Math.max(1, cur - 1) : cur + 1;
        flowCounter.textContent = String(next);
        flowCounter.dataset.wfCounterValue = String(next);
        showPreviewToast('Count: ' + next);
        return;
      }

      var aria = (btn.getAttribute('aria-label') || '').toLowerCase();
      if (aria === 'previous' || aria === 'next' || aria.indexOf('prev') !== -1 || aria.indexOf('next') !== -1) {
        var dir = aria.indexOf('prev') !== -1 ? -1 : 1;
        if (wfFanDeck && rotateFanDeck(dir)) {
          showPreviewToast(dir > 0 ? 'Next card' : 'Previous card');
          return;
        }
        var section = btn.closest('section') || document.getElementById('wfStageRoot');
        var tabGroups = section ? section.querySelectorAll('div') : [];
        for (var g = 0; g < tabGroups.length; g++) {
          var childBtns = Array.prototype.filter.call(tabGroups[g].children, function (c) { return c.tagName === 'BUTTON' && c !== btn; });
          if (childBtns.length >= 2) {
            var curIdx = childBtns.findIndex(function (b) { return b.classList.contains('active') || b.getAttribute('aria-selected') === 'true'; });
            if (curIdx === -1) curIdx = 0;
            var nextIdx = (curIdx + dir + childBtns.length) % childBtns.length;
            activateSiblingTabButton(childBtns[nextIdx]);
            showPreviewToast((dir > 0 ? 'Next: ' : 'Previous: ') + (childBtns[nextIdx].textContent || '').trim().slice(0, 28));
            return;
          }
        }
      }

      // Header / Navbar dropdown trigger (explicit aria-haspopup/aria-expanded or chevron/caret SVG — NOT icon+label mobile dock tabs!)
      var inNav = Boolean(btn.closest('header, nav, [role="navigation"]'));
      var isDockTab = btn.classList.contains('menu__item') || Boolean(btn.closest('.menu'));
      var btnSvg = btn.querySelector('svg');
      var hasChevronCue = Boolean(
        btnSvg && /chevron|caret|arrow-down/i.test(String(btnSvg.getAttribute('class') || ''))
      );
      var hasDropdownCue = Boolean(
        !isDockTab && (
          btn.getAttribute('aria-haspopup') ||
          (inNav && (btn.hasAttribute('aria-expanded') || hasChevronCue))
        )
      );
      if (hasDropdownCue) {
        var navGroup = findOptionGroup(btn);
        if (navGroup) transferActiveOptionState(btn, navGroup);
        toggleHeaderDropdown(btn);
        return;
      }

      // Mobile hamburger menu toggle inside header/nav
      if (inNav && /menu|toggle|nav|open/i.test(aria || btn.className || '') && !(btn.textContent || '').trim()) {
        toggleHeaderDropdown(btn);
        return;
      }

      // Any multi-option button group (horizontal OR vertical: headers, segmented controls, pricing toggles, tabs)
      var btnGroup = findOptionGroup(btn);
      if (btnGroup && btnGroup.length >= 2) {
        transferActiveOptionState(btn, btnGroup);
        var optName = (btn.textContent || btn.getAttribute('aria-label') || 'Selected').trim().replace(/\\s+/g, ' ').slice(0, 32);
        if (optName) showPreviewToast('Selected: ' + optName);
        return;
      }

      btn.classList.remove('wf-btn-pulse');
      void btn.offsetWidth;
      btn.classList.add('wf-btn-pulse');
      if (btn.getAttribute('role') === 'switch' || btn.getAttribute('role') === 'checkbox') {
        var checked = btn.getAttribute('aria-checked') !== 'true';
        btn.setAttribute('aria-checked', String(checked));
        if (btn.dataset) btn.dataset.state = checked ? 'checked' : 'unchecked';
        showPreviewToast(checked ? 'Enabled' : 'Disabled');
        return;
      }
      var text = (btn.textContent || btn.getAttribute('aria-label') || 'Action').trim().replace(/\\s+/g, ' ').slice(0, 34);
      if (text) showPreviewToast('Triggered: ' + text);
    }
  });

  document.addEventListener('submit', function (e) {
    e.preventDefault();
    showPreviewToast('Form submitted (interactive preview)');
  });
  `}

  function boot() {
    wireImageFallbacks();
    hydrateEmptyCanvases();
    hydrateShadowCustomElements();
    hydrateGlowEffects();
    unfreezeHiddenScrollElements();
    rescueMobileAndPhoneViews();
    setTimeout(healCollapsedMediaContainers, 160);
    setTimeout(rescueMobileAndPhoneViews, 220);
    setTimeout(healCollapsedMediaContainers, 650);
    if (${animate ? 'true' : 'false'}) {
      setTimeout(runEntranceAnimation, 40);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
</script>`;
}

const SHARED_ANIMATION_CSS = `
  @keyframes wfRevealUp {
    0% {
      opacity: 0;
      transform: translateY(12px) scale(0.99);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  @keyframes wfBtnPulse {
    0% { transform: scale(1); }
    40% { transform: scale(0.96); }
    100% { transform: scale(1); }
  }
  .wf-anim-in {
    animation: wfRevealUp 420ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  }
  .wf-btn-pulse {
    animation: wfBtnPulse 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  #wfPreviewToast {
    position: fixed;
    bottom: 18px;
    left: 50%;
    transform: translate(-50%, 10px);
    padding: 7px 14px;
    border-radius: 999px;
    background: rgba(15, 16, 20, 0.92);
    color: #fafafa;
    border: 1px solid rgba(255, 255, 255, 0.14);
    font-family: Inter, system-ui, sans-serif;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.01em;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
    opacity: 0;
    pointer-events: none;
    transition: opacity 180ms ease, transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
    z-index: 99999;
  }
  #wfPreviewToast.show {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  .wf-nav-active {
    position: relative;
    color: hsl(var(--foreground)) !important;
    box-shadow: inset 0 -2px 0 hsl(var(--primary));
  }
  .wf-preview-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    min-width: 210px;
    padding: 6px;
    border-radius: 12px;
    background: hsl(var(--popover));
    color: hsl(var(--popover-foreground));
    border: 1px solid hsl(var(--border));
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 9999;
    animation: wfRevealUp 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .wf-pd-head {
    padding: 6px 10px 4px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: hsl(var(--muted-foreground));
  }
  .wf-pd-item {
    border: none;
    background: transparent;
    color: inherit;
    text-align: left;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }
  .wf-pd-item:hover {
    background: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
  }
  @media (prefers-reduced-motion: reduce) {
    .wf-anim-in, .wf-btn-pulse { animation: none !important; }
  }
`;

/**
 * Tailwind CSS v4 Browser CDN + full shadcn/ui v2 `@theme inline` +
 * `@custom-variant dark` + Aceternity / MagicUI / Radix keyframe animations.
 */
export const TAILWIND_V4_CDN_HEAD = `
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
<style type="text/tailwindcss">
  @custom-variant dark (&:where(.dark, .dark *));

  @theme inline {
    --color-background: hsl(var(--background));
    --color-foreground: hsl(var(--foreground));
    --color-card: hsl(var(--card));
    --color-card-foreground: hsl(var(--card-foreground));
    --color-popover: hsl(var(--popover));
    --color-popover-foreground: hsl(var(--popover-foreground));
    --color-primary: hsl(var(--primary));
    --color-primary-foreground: hsl(var(--primary-foreground));
    --color-secondary: hsl(var(--secondary));
    --color-secondary-foreground: hsl(var(--secondary-foreground));
    --color-muted: hsl(var(--muted));
    --color-muted-foreground: hsl(var(--muted-foreground));
    --color-accent: hsl(var(--accent));
    --color-accent-foreground: hsl(var(--accent-foreground));
    --color-destructive: hsl(var(--destructive));
    --color-destructive-foreground: hsl(var(--destructive-foreground));
    --color-border: hsl(var(--border));
    --color-input: hsl(var(--input));
    --color-ring: hsl(var(--ring));
    --color-sidebar: hsl(var(--sidebar-background));
    --color-sidebar-foreground: hsl(var(--sidebar-foreground));
    --color-sidebar-primary: hsl(var(--sidebar-primary));
    --color-sidebar-primary-foreground: hsl(var(--sidebar-primary-foreground));
    --color-sidebar-accent: hsl(var(--sidebar-accent));
    --color-sidebar-accent-foreground: hsl(var(--sidebar-accent-foreground));
    --color-sidebar-border: hsl(var(--sidebar-border));
    --color-sidebar-ring: hsl(var(--sidebar-ring));
    --color-brand: hsl(var(--brand));
    --color-brand-foreground: hsl(var(--brand-foreground));
    --color-chart-1: hsl(var(--chart-1));
    --color-chart-2: hsl(var(--chart-2));
    --color-chart-3: hsl(var(--chart-3));
    --color-chart-4: hsl(var(--chart-4));
    --color-chart-5: hsl(var(--chart-5));
    --color-1: hsl(var(--color-1));
    --color-2: hsl(var(--color-2));
    --color-3: hsl(var(--color-3));
    --color-4: hsl(var(--color-4));
    --color-5: hsl(var(--color-5));
    --radius-sm: calc(var(--radius) - 4px);
    --radius-md: calc(var(--radius) - 2px);
    --radius-lg: var(--radius);
    --radius-xl: calc(var(--radius) + 4px);
    --font-sans: Inter, system-ui, -apple-system, sans-serif;
    --font-mono: "JetBrains Mono", ui-monospace, monospace;
    --font-geistMono: "JetBrains Mono", ui-monospace, monospace;
  }

  @theme {
    --animate-accordion-down: accordion-down 0.2s ease-out;
    --animate-accordion-up: accordion-up 0.2s ease-out;
    --animate-marquee: marquee var(--duration, 40s) linear infinite;
    --animate-marquee-vertical: marquee-vertical var(--duration, 40s) linear infinite;
    --animate-shimmer: shimmer 8s infinite;
    --animate-shimmer-slide: shimmer-slide var(--speed, 3s) ease-in-out infinite alternate;
    --animate-spin-around: spin-around calc(var(--speed, 3s) * 2) infinite linear;
    --animate-rainbow: rainbow var(--speed, 2s) infinite linear;
    --animate-spotlight: spotlight 2s ease 0.5s 1 forwards;
    --animate-meteor: meteor 5s linear infinite;
    --animate-aurora: aurora 60s linear infinite;
    --animate-gradient: gradient 8s linear infinite;
    --animate-border-beam: border-beam calc(var(--duration, 15) * 1s) infinite linear;
    --animate-ripple: ripple var(--duration, 2s) ease calc(var(--i, 0) * 0.2s) infinite;
    --animate-orbit: orbit calc(var(--duration, 20) * 1s) linear infinite;
    --animate-shine: shine var(--duration, 14s) infinite linear;
    --animate-slide-up-fade: slide-up-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    --animate-fade-in: fade-in 0.4s ease-out forwards;
    --animate-first: moveVertical 30s ease infinite;
    --animate-second: moveInCircle 20s reverse infinite;
    --animate-third: moveInCircle 40s linear infinite;
    --animate-fourth: moveHorizontal 40s ease infinite;
    --animate-fifth: moveInCircle 20s ease infinite;

    @keyframes accordion-down {
      from { height: 0; }
      to { height: var(--radix-accordion-content-height, auto); }
    }
    @keyframes accordion-up {
      from { height: var(--radix-accordion-content-height, auto); }
      to { height: 0; }
    }
    @keyframes marquee {
      from { transform: translateX(0); }
      to { transform: translateX(calc(-100% - var(--gap, 1rem))); }
    }
    @keyframes marquee-vertical {
      from { transform: translateY(0); }
      to { transform: translateY(calc(-100% - var(--gap, 1rem))); }
    }
    @keyframes shimmer {
      0%, 90%, 100% { background-position: calc(-100% - var(--shimmer-width, 100px)) 0; }
      30%, 60% { background-position: calc(100% + var(--shimmer-width, 100px)) 0; }
    }
    @keyframes shimmer-slide {
      to { transform: translate(calc(100cqw - 100%), 0); }
    }
    @keyframes spin-around {
      0% { transform: translateZ(0) rotate(0); }
      15%, 35% { transform: translateZ(0) rotate(90deg); }
      65%, 85% { transform: translateZ(0) rotate(270deg); }
      100% { transform: translateZ(0) rotate(360deg); }
    }
    @keyframes rainbow {
      0% { background-position: 0%; }
      100% { background-position: 200%; }
    }
    @keyframes spotlight {
      0% { opacity: 0; transform: translate(-72%, -62%) scale(0.5); }
      100% { opacity: 1; transform: translate(-50%, -40%) scale(1); }
    }
    @keyframes meteor {
      0% { transform: rotate(215deg) translateX(0); opacity: 1; }
      70% { opacity: 1; }
      100% { transform: rotate(215deg) translateX(-500px); opacity: 0; }
    }
    @keyframes aurora {
      from { background-position: 50% 50%, 50% 50%; }
      to { background-position: 350% 50%, 350% 50%; }
    }
    @keyframes gradient {
      to { background-position: var(--bg-size, 300%) 0; }
    }
    @keyframes border-beam {
      100% { offset-distance: 100%; }
    }
    @keyframes ripple {
      0%, 100% { transform: translate(-50%, -50%) scale(1); }
      50% { transform: translate(-50%, -50%) scale(0.9); }
    }
    @keyframes orbit {
      0% { transform: rotate(0deg) translateY(calc(var(--radius, 80) * 1px)) rotate(0deg); }
      100% { transform: rotate(360deg) translateY(calc(var(--radius, 80) * 1px)) rotate(-360deg); }
    }
    @keyframes shine {
      0% { background-position: 0% 0%; }
      50% { background-position: 100% 100%; }
      100% { background-position: 0% 0%; }
    }
    @keyframes slide-up-fade {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes moveHorizontal {
      0% { transform: translateX(-50%) translateY(-10%); }
      50% { transform: translateX(50%) translateY(10%); }
      100% { transform: translateX(-50%) translateY(-10%); }
    }
    @keyframes moveInCircle {
      0% { transform: rotate(0deg); }
      50% { transform: rotate(180deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes moveVertical {
      0% { transform: translateY(-50%); }
      50% { transform: translateY(50%); }
      100% { transform: translateY(-50%); }
    }
  }
</style>`;

// Backwards-compatible alias for preview.mjs
export const SHADCN_TAILWIND_CONFIG_SCRIPT = TAILWIND_V4_CDN_HEAD;

export const SHADCN_THEME_VARS_CSS = `
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.75rem;
    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
    --brand: 221.2 83.2% 53.3%;
    --brand-foreground: 210 40% 98%;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;

    /* MagicUI / BadtzUI / Shiny / Shimmer / Glow Button Custom Properties */
    --glow-color: #60a5fa;
    --glow-color-via: rgba(96, 165, 250, 0.28);
    --glow-color-to: rgba(59, 130, 246, 0.04);
    --color-1: 0 100% 63%;
    --color-2: 270 100% 63%;
    --color-3: 210 100% 63%;
    --color-4: 195 100% 63%;
    --color-5: 90 100% 63%;
    --shiny-cta-bg: #000000;
    --shiny-cta-bg-subtle: #1a1818;
    --shiny-cta-fg: #ffffff;
    --shiny-cta-highlight: #3b82f6;
    --shiny-cta-highlight-subtle: #8484ff;
    --shimmer-color: #ffffff;
    --spread: 90deg;
    --speed: 3s;
    --cut: 0.05em;
    --bg: #09090b;
    --border-width: 1.5px;
    --color-from: #ffaa40;
    --color-to: #9c40ff;

    /* Aceternity UI addVariablesForColors & background-gradient-animation defaults */
    --white: #ffffff;
    --black: #000000;
    --transparent: transparent;
    --blue-200: #bfdbfe; --blue-300: #93c5fd; --blue-400: #60a5fa; --blue-500: #3b82f6; --blue-600: #2563eb;
    --indigo-200: #c7d2fe; --indigo-300: #a5b4fc; --indigo-400: #818cf8; --indigo-500: #6366f1; --indigo-600: #4f46e5;
    --violet-200: #ddd6fe; --violet-300: #c4b5fd; --violet-400: #a78bfa; --violet-500: #8b5cf6; --violet-600: #7c3aed;
    --purple-300: #d8b4fe; --purple-400: #c084fc; --purple-500: #a855f7; --purple-600: #9333ea;
    --pink-300: #f9a8d4; --pink-400: #f472b6; --pink-500: #ec4899;
    --rose-400: #fb7185; --rose-500: #f43f5e;
    --sky-300: #7dd3fc; --sky-400: #38bdf8; --sky-500: #0ea5e9;
    --cyan-300: #67e8f9; --cyan-400: #22d3ee; --cyan-500: #06b6d4;
    --teal-400: #2dd4bf; --teal-500: #14b8a6;
    --emerald-400: #34d399; --emerald-500: #10b981;
    --amber-400: #fbbf24; --amber-500: #f59e0b;
    --orange-400: #fb923c; --orange-500: #f97316;
    --slate-800: #1e293b; --slate-900: #0f172a; --slate-950: #020617;
    --zinc-800: #27272a; --zinc-900: #18181b; --zinc-950: #09090b;
    --neutral-800: #262626; --neutral-900: #171717; --neutral-950: #0a0a0a;

    --gradient-background-start: rgb(108, 0, 162);
    --gradient-background-end: rgb(0, 17, 82);
    --first-color: 18, 113, 255;
    --second-color: 221, 74, 255;
    --third-color: 100, 220, 255;
    --fourth-color: 200, 50, 50;
    --fifth-color: 180, 180, 50;
    --pointer-color: 140, 100, 255;
    --size: 80%;
    --blending-value: hard-light;
  }
  @property --gradient-angle {
    syntax: "<angle>";
    initial-value: 0deg;
    inherits: false;
  }
  @property --gradient-angle-offset {
    syntax: "<angle>";
    initial-value: 0deg;
    inherits: false;
  }
  @property --gradient-percent {
    syntax: "<percentage>";
    initial-value: 5%;
    inherits: false;
  }
  @property --gradient-shine {
    syntax: "<color>";
    initial-value: white;
    inherits: false;
  }
  @property --angle {
    syntax: "<angle>";
    initial-value: 0deg;
    inherits: false;
  }
  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 6%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 6%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
    --brand: 217.2 91.2% 59.8%;
    --brand-foreground: 210 40% 98%;
    --sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 224.3 76.3% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 217.2 91.2% 59.8%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
  /* Shiny CTA / Glowing border keyframes when omitted from rendered.html */
  @keyframes gradient-angle {
    to { --gradient-angle: 360deg; }
  }
  .shiny-cta {
    --animation: gradient-angle linear infinite;
    --duration: 3s;
    position: relative;
    overflow: hidden;
    color: var(--shiny-cta-fg);
    background: linear-gradient(var(--shiny-cta-bg), var(--shiny-cta-bg)) padding-box,
      conic-gradient(from calc(var(--gradient-angle) - var(--gradient-angle-offset)),
        transparent, var(--shiny-cta-highlight) var(--gradient-percent),
        var(--gradient-shine) calc(var(--gradient-percent) * 2),
        var(--shiny-cta-highlight) calc(var(--gradient-percent) * 3),
        transparent calc(var(--gradient-percent) * 4)) border-box;
    border: 1.5px solid transparent;
    box-shadow: inset 0 0 0 1px var(--shiny-cta-bg-subtle), 0 0 24px -6px rgba(59, 130, 246, 0.55);
    animation: var(--animation) var(--duration);
  }
  /* Aceternity architectural grid & dot pattern utilities */
  [class*="bg-grid-white"] {
    background-image: linear-gradient(to right, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  [class*="bg-grid-black"] {
    background-image: linear-gradient(to right, rgba(0, 0, 0, 0.06) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(0, 0, 0, 0.06) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  [class*="bg-dot-white"] {
    background-image: radial-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px);
    background-size: 16px 16px;
  }
  [class*="bg-dot-black"] {
    background-image: radial-gradient(rgba(0, 0, 0, 0.14) 1px, transparent 1px);
    background-size: 16px 16px;
  }
  /* Floating Mobile Dock defaults (e.g. modern-mobile-menu when upstream omits CSS module) */
  nav.menu, .menu {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 22px;
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    box-shadow: 0 12px 32px -8px rgba(15, 23, 42, 0.14);
  }
  .menu__item {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 8px 12px;
    border: none;
    border-radius: 14px;
    background: transparent;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    transition: color 200ms ease, background-color 200ms ease, transform 160ms ease;
  }
  .menu__item:hover {
    color: hsl(var(--foreground));
    background: hsl(var(--muted) / 0.6);
  }
  .menu__item.active,
  .menu__item.wf-nav-active {
    color: var(--component-active-color, #0d9488);
    background: hsl(var(--muted) / 0.45);
  }
  .menu__item .menu__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .menu__item .menu__icon svg {
    width: 20px;
    height: 20px;
  }
  .menu__item .menu__text {
    display: none;
    font-size: 13px;
    font-weight: 600;
    text-transform: capitalize;
    white-space: nowrap;
  }
  .menu__item.active .menu__text,
  .menu__item.wf-nav-active .menu__text {
    display: inline-block;
    border-bottom: 2px solid var(--component-active-color, #0d9488);
    padding-bottom: 2px;
  }
`;

/**
 * Builds an animated, interactive HTML document for the Fullscreen UI Previewer.
 */
export function buildInteractivePreviewSrcdoc({ lib = null, element = null, theme = 'dark', animate = true } = {}) {
  const safeEl = element || {};
  const isDark = theme !== 'light';
  const htmlClass = isDark ? 'dark' : '';
  const bodyThemeClass = isDark ? 'wf-preview-dark' : 'wf-preview-light';

  // Mode 1: Awesome Components (rendered Tailwind v4/shadcn/Aceternity HTML snapshot)
  if (safeEl.renderedHtml) {
    const { bodyHtml, extraCss } = sanitizeAwesomeRenderedHtml(safeEl.renderedHtml);
    const promptCss = String(safeEl.promptCss || '').trim();
    const canvasOnly = isCanvasOnlySnapshot(bodyHtml);
    const fullBleedSurface = canvasOnly || /\b(?:min-h-\[600px\]|h-\[640px\])\b/.test(bodyHtml);
    const vibrantAccentOverride = (needsVibrantPrimaryAccent(bodyHtml) && !/--primary\s*:/i.test(promptCss) && !/--primary\s*:/i.test(extraCss))
      ? `
  :root {
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --accent: 217 91% 95%;
    --accent-foreground: 222 47% 11%;
    --ring: 221.2 83.2% 53.3%;
  }
  .dark {
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --accent: 217 33% 17%;
    --accent-foreground: 210 40% 98%;
    --ring: 224.3 76.3% 48%;
  }`
      : '';
    return `<!DOCTYPE html>
<html lang="en" class="${htmlClass}" data-preview-theme="${isDark ? 'dark' : 'light'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap">
${TAILWIND_V4_CDN_HEAD}
<style>
  ${SHADCN_THEME_VARS_CSS}
  ${vibrantAccentOverride}
  *, *::before, *::after { box-sizing: border-box; border-color: hsl(var(--border)); }
  html { height: 100%; margin: 0; padding: 0; }
  body {
    margin: 0;
    min-height: 100%;
    overflow-x: hidden;
    font-family: Inter, system-ui, -apple-system, sans-serif;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    transition: background-color 200ms ease, color 200ms ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: ${fullBleedSurface ? '0' : '32px 24px'};
  }
  #wfStageRoot {
    margin: auto 0;
    width: 100%;
    max-width: ${fullBleedSurface ? '100%' : '1200px'};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  #wfStageRoot > main { width: 100%; }
  #wfStageRoot button, #wfStageRoot a {
    transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms ease, box-shadow 180ms ease;
  }
  #wfStageRoot button:hover { opacity: 0.94; }
  ${promptCss}
  ${extraCss}
  ${SHARED_ANIMATION_CSS}
</style>
</head>
<body class="${bodyThemeClass}">
  <div id="wfStageRoot">${bodyHtml}</div>
  <div id="wfPreviewToast" role="status" aria-live="polite"></div>
  ${buildInteractiveRuntimeScript({ hasCustomScript: false, animate, screenshotUrl: safeEl.screenshotUrl || '', canvasOnly })}
</body>
</html>`;
  }

  // Mode 2: Built-in / 21st.dev / Custom HTML preview element
  if (safeEl.previewHtml) {
    const fontsLink = lib?.fontsUrl
      ? `<link rel="stylesheet" href="${escapeHtmlAttr(lib.fontsUrl)}">`
      : '';
    const tokensCss = lib?.tokensCss || '';
    const extraCss = safeEl.previewCss || '';
    const customScript = safeEl.previewScript
      ? `<script>${escapeScriptSafe(safeEl.previewScript)}</script>`
      : '';
    const stageMaxWidth = safeEl.previewScript ? '820px' : '640px';

    return `<!DOCTYPE html>
<html lang="en" class="${htmlClass}" data-preview-theme="${isDark ? 'dark' : 'light'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${fontsLink}
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html { height: 100%; margin: 0; padding: 0; }
  body {
    margin: 0;
    min-height: 100%;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 36px 28px;
    background: var(--wf-bg, #090A0F);
    transition: background-color 220ms ease, color 220ms ease;
  }
  body.wf-preview-light {
    background: #F4F5F7;
  }
  #wfStageRoot {
    margin: auto 0;
    width: 100%;
    max-width: ${stageMaxWidth};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
  }
  ${safeEl.previewScript ? '' : '#wfStageRoot > * { width: 100%; }'}
  .wf-ui-card, .wf-ui-btn, .wf-ui-pricing, .wf-ui-hero {
    transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms ease, border-color 180ms ease;
  }
  .wf-ui-btn:hover { transform: translateY(-1px); }
  .wf-ui-btn:active { transform: translateY(0) scale(0.98); }
  ${tokensCss}
  ${extraCss}
  ${SHARED_ANIMATION_CSS}
</style>
</head>
<body class="wf-ui-scope ${bodyThemeClass}">
  <div id="wfStageRoot">${safeEl.previewHtml}</div>
  <div id="wfPreviewToast" role="status" aria-live="polite"></div>
  ${customScript}
  ${buildInteractiveRuntimeScript({ hasCustomScript: Boolean(safeEl.previewScript), animate })}
</body>
</html>`;
  }

  // Mode 3: Code-only React JSX/TSX element (live Babel + React + Lucide + Tailwind v4 sandbox)
  const rawCode = String(safeEl.code || '').trim();
  const safeCodeJson = JSON.stringify(rawCode).replace(/<\/script>/gi, '<\\/script>');
  const fallbackName = escapeHtmlAttr(safeEl.name || 'UI Component');

  return `<!DOCTYPE html>
<html lang="en" class="${htmlClass}" data-preview-theme="${isDark ? 'dark' : 'light'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap">
${TAILWIND_V4_CDN_HEAD}
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone@7.24.7/babel.min.js"></script>
<style>
  ${SHADCN_THEME_VARS_CSS}
  ${lib?.tokensCss || ''}
  *, *::before, *::after { box-sizing: border-box; border-color: hsl(var(--border)); }
  html { height: 100%; margin: 0; padding: 0; }
  body {
    margin: 0;
    min-height: 100%;
    font-family: Inter, system-ui, sans-serif;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 24px;
  }
  #wfStageRoot { margin: auto 0; width: 100%; max-width: 960px; display: flex; justify-content: center; }
  ${SHARED_ANIMATION_CSS}
</style>
</head>
<body class="wf-ui-scope ${bodyThemeClass}">
  <div id="wfStageRoot"></div>
  <div id="wfPreviewToast" role="status" aria-live="polite"></div>
  <script>
    (function () {
      var raw = ${safeCodeJson};
      var mount = document.getElementById('wfStageRoot');
      function cn() {
        return Array.prototype.slice.call(arguments).filter(Boolean).join(' ');
      }
      try {
        var stripped = raw
          .replace(/^\\s*import\\s+[\\s\\S]*?from\\s+['"][^'"]+['"];?\\s*$/gm, '')
          .replace(/^\\s*import\\s+['"][^'"]+['"];?\\s*$/gm, '')
          .replace(/export\\s+default\\s+function\\s+([A-Za-z0-9_]+)/g, 'function $1; window.__WF_EXPORT__ = $1; function $1')
          .replace(/export\\s+default\\s+/g, 'window.__WF_EXPORT__ = ')
          .replace(/export\\s+(function|const|class)\\s+/g, '$1 ');
        var nameMatch = raw.match(/export\\s+(?:default\\s+)?function\\s+([A-Za-z0-9_]+)/) || raw.match(/export\\s+const\\s+([A-Za-z0-9_]+)/);
        var exportTail = nameMatch ? '\\nif (!window.__WF_EXPORT__ && typeof ' + nameMatch[1] + ' === "function") window.__WF_EXPORT__ = ' + nameMatch[1] + ';' : '';
        var compiled = Babel.transform(stripped + exportTail, { presets: ['react', 'typescript'], filename: 'preview.tsx' }).code;
        var fn = new Function('React', 'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'cn', compiled);
        fn(React, React.useState, React.useEffect, React.useRef, React.useMemo, React.useCallback, cn);
        var Comp = window.__WF_EXPORT__;
        if (typeof Comp === 'function') {
          ReactDOM.createRoot(mount).render(React.createElement(Comp));
        } else {
          mount.innerHTML = '<div class="p-6 rounded-xl border border-border bg-card text-sm text-muted-foreground">Live preview rendered for ${fallbackName} — switch to Code or Split view to inspect source.</div>';
        }
      } catch (err) {
        mount.innerHTML = '<div class="p-6 rounded-xl border border-border bg-card text-sm text-muted-foreground">Switch to <strong>Code</strong> or <strong>Split</strong> view to inspect <strong>${fallbackName}</strong>.</div>';
      }
    })();
  </script>
  ${buildInteractiveRuntimeScript({ hasCustomScript: false, animate })}
</body>
</html>`;
}
