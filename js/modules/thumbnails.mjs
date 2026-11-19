/**
 * WebForge Studio — Lovable-Style Project Thumbnail Service
 *
 * Hybrid engine:
 * 1. Curated instant-load hero thumbnails for flagship starter projects.
 * 2. Auto-captured Canvas snapshots stored per project (`wf_thumb_<id>`) on save/build.
 * 3. Lazy scaled live mini-iframe fallback for any project without a cached snapshot.
 */

import { safeStorageGet, safeStorageSet } from './storage.mjs';

export const DEMO_THUMBNAIL_MAP = {
  'demo-kinetix-saas': '/assets/demos/saas-hero.jpg',
  'demo-maison-vera': '/assets/demos/vera-hero.jpg',
  'demo-valkyr-motors': '/assets/demos/valkyr-hero.jpg',
};

const MAX_THUMB_BYTES = 120000;

export function getProjectThumbnail(projectId) {
  if (!projectId) return null;
  const cached = safeStorageGet(`wf_thumb_${projectId}`, null);
  if (cached && (cached.startsWith('data:image/') || cached.startsWith('/assets/'))) {
    return cached;
  }
  return DEMO_THUMBNAIL_MAP[projectId] || null;
}

export function setProjectThumbnail(projectId, dataUrl) {
  if (!projectId || !dataUrl) return false;
  if (dataUrl.length > MAX_THUMB_BYTES) return false;
  return safeStorageSet(`wf_thumb_${projectId}`, dataUrl, projectId);
}

export function removeProjectThumbnail(projectId) {
  if (!projectId || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(`wf_thumb_${projectId}`);
  } catch {
    /* ignore */
  }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapLines(ctx, text, maxWidth, maxLines = 2) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

/**
 * Generates a crisp 640x400 JPEG thumbnail directly from the live same-origin preview iframe
 * (with zero external libraries and zero CORS canvas tainting).
 */
export async function capturePreviewThumbnail(iframe, projectMeta = {}) {
  if (typeof document === 'undefined' || !iframe) return null;
  try {
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win || !doc.body) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Extract actual computed palette & hero copy from rendered preview DOM
    const bodyStyle = win.getComputedStyle(doc.body);
    const rootChild = doc.getElementById('root')?.firstElementChild || doc.body;
    const rootStyle = win.getComputedStyle(rootChild);
    const bgColor = (rootStyle.backgroundColor && rootStyle.backgroundColor !== 'rgba(0, 0, 0, 0)')
      ? rootStyle.backgroundColor
      : (bodyStyle.backgroundColor && bodyStyle.backgroundColor !== 'rgba(0, 0, 0, 0)')
        ? bodyStyle.backgroundColor
        : '#090A0F';
    const fgColor = rootStyle.color || bodyStyle.color || '#FAFAFA';

    const h1 = doc.querySelector('h1, h2');
    const heroText = (h1?.textContent || projectMeta.name || 'WebForge Project').replace(/\s+/g, ' ').trim();
    const pEl = doc.querySelector('section p, main p, p');
    const subText = (pEl?.textContent || projectMeta.tagline || '').replace(/\s+/g, ' ').trim().slice(0, 110);

    const primaryBtn = doc.querySelector('section button, main button, header button, button');
    const btnStyle = primaryBtn ? win.getComputedStyle(primaryBtn) : null;
    const accentBg = (btnStyle?.backgroundColor && btnStyle.backgroundColor !== 'rgba(0, 0, 0, 0)')
      ? btnStyle.backgroundColor
      : (projectMeta.accent || '#FAFAFA');
    const accentFg = btnStyle?.color || '#090A0F';
    const btnLabel = (primaryBtn?.textContent || 'Explore').replace(/\s+/g, ' ').trim().slice(0, 22);

    const navBrand = (doc.querySelector('header a, header span, nav a')?.textContent || projectMeta.name || 'Studio')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 24);

    // 1. Background canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 640, 400);

    // 2. If the rendered site has a loaded same-origin hero image, paint it cleanly!
    const imgs = Array.from(doc.querySelectorAll('img')).filter(
      (img) => img.complete && img.naturalWidth > 120 && img.naturalHeight > 80
    );
    let drewHeroImg = false;
    if (imgs.length) {
      const heroImg = imgs[0];
      try {
        const iw = heroImg.naturalWidth;
        const ih = heroImg.naturalHeight;
        const scale = Math.max(640 / iw, 400 / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.drawImage(heroImg, (640 - dw) / 2, (400 - dh) / 2, dw, dh);
        // Subtle editorial contrast scrim
        const grad = ctx.createLinearGradient(0, 0, 0, 400);
        grad.addColorStop(0, 'rgba(0,0,0,0.42)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0.34)');
        grad.addColorStop(1, 'rgba(0,0,0,0.82)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 400);
        drewHeroImg = true;
      } catch {
        // Cross-origin image tainted check; fall back to clean graphic render
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, 640, 400);
      }
    }

    if (!drewHeroImg) {
      // Subtle atmospheric radial highlight using accent color
      const rad = ctx.createRadialGradient(520, 60, 10, 520, 60, 320);
      rad.addColorStop(0, 'rgba(255,255,255,0.09)');
      rad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, 640, 400);
    }

    const ink = drewHeroImg ? '#FAFAFA' : fgColor;

    // 3. Top bar chrome
    ctx.fillStyle = drewHeroImg ? 'rgba(255,255,255,0.12)' : 'rgba(127,127,127,0.16)';
    ctx.fillRect(0, 52, 640, 1);

    ctx.fillStyle = ink;
    ctx.font = '700 15px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(navBrand, 32, 32);

    // 4. Hero headline & subcopy
    ctx.fillStyle = ink;
    ctx.font = '700 32px "Plus Jakarta Sans", system-ui, sans-serif';
    const headlineLines = wrapLines(ctx, heroText, 520, 2);
    headlineLines.forEach((line, i) => {
      ctx.fillText(line, 32, 134 + i * 40);
    });

    if (subText) {
      ctx.globalAlpha = 0.78;
      ctx.font = '400 14px "DM Sans", system-ui, sans-serif';
      const subLines = wrapLines(ctx, subText, 480, 2);
      const startY = 134 + headlineLines.length * 40 + 14;
      subLines.forEach((line, i) => {
        ctx.fillText(line, 32, startY + i * 21);
      });
      ctx.globalAlpha = 1;
    }

    // 5. Primary CTA button silhouette
    const ctaY = 278;
    ctx.fillStyle = accentBg;
    drawRoundedRect(ctx, 32, ctaY, 138, 36, 6);
    ctx.fill();
    ctx.fillStyle = accentFg;
    ctx.font = '600 12px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(btnLabel, 48, ctaY + 22);

    // 6. Subtle bottom feature card strip silhouette
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = drewHeroImg ? 'rgba(255,255,255,0.09)' : 'rgba(127,127,127,0.12)';
      drawRoundedRect(ctx, 32 + i * 196, 338, 184, 44, 6);
      ctx.fill();
    }

    return canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    return null;
  }
}
