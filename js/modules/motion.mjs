/**
 * WebForge Studio — 20 Principles of UX & Motion Runtime Helpers
 *
 * Implements origin-aware transform positioning (Principle 11), rubber-band
 * edge resistance (Principle 13), capped stagger scheduling (Principle 3),
 * interruptible asymmetric open/close dialog choreography (Principles 17, 18),
 * and frequency-of-use instant mode (Principle 20).
 */

export const MOTION_TIMINGS = Object.freeze({
  PRESS_MS: 85,
  FAST_CLOSE_MS: 120,
  STANDARD_OPEN_MS: 220,
  PALETTE_OPEN_MS: 85,
  STAGGER_STEP_MS: 36,
  STAGGER_MAX_MS: 320,
  DOHERTY_BUDGET_MS: 100,
});

/**
 * Principle 13 — Rubber banding:
 * Stretch with diminishing resistance past an edge instead of hitting a hard wall.
 * Formula: offset = (1 - 1 / (|drag| * factor / size + 1)) * size * sign(drag)
 */
export function computeRubberBandOffset(drag = 0, size = 320, factor = 0.55) {
  const d = Number(drag) || 0;
  const s = Math.max(1, Number(size) || 320);
  const f = Math.max(0.05, Number(factor) || 0.55);
  if (d === 0) return 0;
  const absDrag = Math.abs(d);
  const mag = (1 - 1 / ((absDrag * f) / s + 1)) * s;
  return Number((mag * Math.sign(d)).toFixed(2));
}

/**
 * Principle 3 — Stagger cascade:
 * Returns per-item delay in milliseconds, capped so long lists stay snappy.
 */
export function computeStaggerDelayMs(index = 0, { stepMs = MOTION_TIMINGS.STAGGER_STEP_MS, maxTotalMs = MOTION_TIMINGS.STAGGER_MAX_MS } = {}) {
  const idx = Math.max(0, Math.floor(Number(index) || 0));
  const step = Math.max(0, Number(stepMs) || 0);
  const cap = Math.max(0, Number(maxTotalMs) || 0);
  return Math.min(idx * step, cap);
}

/**
 * Principle 11 — Origin awareness:
 * Computes a CSS `transform-origin` string relative to `panelRect` anchored
 * to the center of `triggerRect`, clamped cleanly to the panel perimeter.
 */
export function computeTriggerTransformOrigin(triggerRect, panelRect) {
  if (!triggerRect || !panelRect || !panelRect.width || !panelRect.height) {
    return 'center center';
  }
  const trigCx = triggerRect.left + triggerRect.width / 2;
  const trigCy = triggerRect.top + triggerRect.height / 2;
  const rawX = trigCx - panelRect.left;
  const rawY = trigCy - panelRect.top;
  const clampedX = Math.max(12, Math.min(panelRect.width - 12, rawX));
  const clampedY = Math.max(12, Math.min(panelRect.height - 12, rawY));
  return `${Math.round(clampedX)}px ${Math.round(clampedY)}px`;
}

/**
 * Check user's prefers-reduced-motion preference safely (works in Node tests too).
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

const dialogCloseTimers = new WeakMap();

/**
 * Principles 11, 17, 18, 20 — Open a <dialog> with origin-aware entry and
 * interruptible cancelation of any in-flight close animation.
 */
export function openDialogWithOrigin(dialogEl, triggerEl = null, { instant = false } = {}) {
  if (!dialogEl) return;

  // Cancel any in-flight fast-close timer (Principle 17: Interruptible motion)
  const pendingTimer = dialogCloseTimers.get(dialogEl);
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    dialogCloseTimers.delete(dialogEl);
  }
  dialogEl.classList.remove('wf-dialog-closing');

  const triggerRect = triggerEl && typeof triggerEl.getBoundingClientRect === 'function'
    ? triggerEl.getBoundingClientRect()
    : null;

  if (!dialogEl.open && typeof dialogEl.showModal === 'function') {
    dialogEl.showModal();
  }

  if (instant || prefersReducedMotion()) {
    dialogEl.style.transformOrigin = 'center center';
    dialogEl.classList.add('wf-dialog-open');
    return;
  }

  if (triggerRect && typeof dialogEl.getBoundingClientRect === 'function') {
    const panelRect = dialogEl.getBoundingClientRect();
    dialogEl.style.transformOrigin = computeTriggerTransformOrigin(triggerRect, panelRect);
  } else {
    dialogEl.style.transformOrigin = 'center center';
  }

  // Trigger transition cleanly on next frame
  dialogEl.classList.remove('wf-dialog-open');
  requestAnimationFrame(() => {
    dialogEl.classList.add('wf-dialog-open');
  });
}

/**
 * Principle 18 — Fast closing:
 * Closes a <dialog> faster than it opened (~120ms ease-in), while remaining
 * interruptible if reopened mid-exit.
 */
export function closeDialogFast(dialogEl, { closeMs = MOTION_TIMINGS.FAST_CLOSE_MS, onClosed = null } = {}) {
  if (!dialogEl || !dialogEl.open) return;

  const existingTimer = dialogCloseTimers.get(dialogEl);
  if (existingTimer) {
    clearTimeout(existingTimer);
    dialogCloseTimers.delete(dialogEl);
  }

  if (prefersReducedMotion() || dialogEl.classList.contains('palette-dialog')) {
    dialogEl.classList.remove('wf-dialog-open', 'wf-dialog-closing');
    dialogEl.close();
    if (typeof onClosed === 'function') onClosed();
    return;
  }

  dialogEl.classList.remove('wf-dialog-open');
  dialogEl.classList.add('wf-dialog-closing');

  const timer = setTimeout(() => {
    dialogCloseTimers.delete(dialogEl);
    dialogEl.classList.remove('wf-dialog-closing');
    if (dialogEl.open) dialogEl.close();
    if (typeof onClosed === 'function') onClosed();
  }, closeMs);

  dialogCloseTimers.set(dialogEl, timer);
}

/**
 * Principle 11 — Set origin-aware transform-origin on an anchored popover
 * based on whether it opens upward or downward relative to its trigger.
 */
export function applyPopoverOrigin(popoverEl, triggerEl) {
  if (!popoverEl || !triggerEl) return;
  const isUp = popoverEl.classList.contains('popover-up');
  const trigRect = triggerEl.getBoundingClientRect?.();
  const popRect = popoverEl.getBoundingClientRect?.();
  if (trigRect && popRect && popRect.width > 0) {
    const x = Math.max(14, Math.min(popRect.width - 14, trigRect.left + trigRect.width / 2 - popRect.left));
    popoverEl.style.transformOrigin = `${Math.round(x)}px ${isUp ? '100%' : '0%'}`;
  } else {
    popoverEl.style.transformOrigin = isUp ? '20px 100%' : '20px 0%';
  }
}

/**
 * Principle 13 — Attach subtle rubber-band vertical edge pull on touch/pointer
 * scroll containers so hitting the top/bottom feels elastic instead of rigid.
 */
export function attachRubberBandScroll(containerEl) {
  if (!containerEl || containerEl.dataset.wfRubberBound) return;
  containerEl.dataset.wfRubberBound = '1';

  let startY = 0;
  let pulling = false;
  let currentOffset = 0;

  containerEl.addEventListener('touchstart', (e) => {
    if (prefersReducedMotion() || e.touches.length !== 1) return;
    startY = e.touches[0].clientY;
    pulling = true;
    currentOffset = 0;
    containerEl.style.transition = '';
  }, { passive: true });

  containerEl.addEventListener('touchmove', (e) => {
    if (!pulling || prefersReducedMotion() || e.touches.length !== 1) return;
    const dy = e.touches[0].clientY - startY;
    const atTop = containerEl.scrollTop <= 0 && dy > 0;
    const atBottom = containerEl.scrollTop + containerEl.clientHeight >= containerEl.scrollHeight - 1 && dy < 0;
    if (atTop || atBottom) {
      currentOffset = computeRubberBandOffset(dy, Math.max(240, containerEl.clientHeight), 0.35);
      containerEl.style.transform = `translate3d(0, ${currentOffset}px, 0)`;
    }
  }, { passive: true });

  const release = () => {
    if (!pulling) return;
    pulling = false;
    if (currentOffset !== 0) {
      containerEl.style.transition = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
      containerEl.style.transform = 'translate3d(0, 0, 0)';
      setTimeout(() => {
        containerEl.style.transition = '';
        containerEl.style.transform = '';
      }, 270);
      currentOffset = 0;
    }
  };

  containerEl.addEventListener('touchend', release, { passive: true });
  containerEl.addEventListener('touchcancel', release, { passive: true });
}

/**
 * Principles 6 & 10 — Moving in arcs + Solid drawing in 3D:
 * Pure math computing subtle pointer-driven 3D rotation and specular highlight
 * coordinates clamped cleanly to [-maxTilt, +maxTilt] degrees.
 */
export function computeCardTilt(clientX, clientY, rect, maxTilt = 5.5) {
  if (!rect || !rect.width || !rect.height) {
    return { rotateX: 0, rotateY: 0, glowX: 50, glowY: 50 };
  }
  const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const relY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
  const rotateY = Number(((relX - 0.5) * 2 * maxTilt).toFixed(2));
  const rotateX = Number(((0.5 - relY) * 2 * maxTilt).toFixed(2));
  return {
    rotateX,
    rotateY,
    glowX: Math.round(relX * 100),
    glowY: Math.round(relY * 100),
  };
}

/**
 * Attach lightweight rAF-throttled 3D perspective tilt + specular sheen to a card.
 * Respects prefers-reduced-motion and skips coarse touch pointers.
 */
export function attachInteractiveCardTilt(cardEl, { maxTilt = 5 } = {}) {
  if (!cardEl || cardEl.dataset.wfTiltBound) return;
  cardEl.dataset.wfTiltBound = '1';

  let rafId = 0;

  cardEl.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || prefersReducedMotion()) return;
    if (rafId) cancelAnimationFrame(rafId);
    const { clientX, clientY } = e;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      const rect = cardEl.getBoundingClientRect();
      const { rotateX, rotateY, glowX, glowY } = computeCardTilt(clientX, clientY, rect, maxTilt);
      cardEl.style.setProperty('--wf-tilt-x', `${rotateX}deg`);
      cardEl.style.setProperty('--wf-tilt-y', `${rotateY}deg`);
      cardEl.style.setProperty('--wf-glow-x', `${glowX}%`);
      cardEl.style.setProperty('--wf-glow-y', `${glowY}%`);
      cardEl.classList.add('wf-tilting');
    });
  });

  const resetTilt = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    cardEl.classList.remove('wf-tilting');
    cardEl.style.setProperty('--wf-tilt-x', '0deg');
    cardEl.style.setProperty('--wf-tilt-y', '0deg');
  };

  cardEl.addEventListener('pointerleave', resetTilt);
  cardEl.addEventListener('pointercancel', resetTilt);
}

/**
 * Principles 4 & 7 — Follow-through + Secondary action:
 * Positions and glides a shared `.wf-tab-glider` pill behind the currently active
 * segmented tab inside `containerEl` using compositor transforms.
 */
export function syncSlidingTabIndicator(containerEl, activeSelector = '.active') {
  if (!containerEl || typeof containerEl.querySelector !== 'function') return;
  const activeTab = containerEl.querySelector(activeSelector);
  let glider = containerEl.querySelector(':scope > .wf-tab-glider');

  if (!activeTab) {
    if (glider) glider.style.opacity = '0';
    return;
  }

  if (!glider) {
    glider = document.createElement('span');
    glider.className = 'wf-tab-glider';
    glider.setAttribute('aria-hidden', 'true');
    containerEl.insertBefore(glider, containerEl.firstChild);
  }

  const cRect = containerEl.getBoundingClientRect();
  const tRect = activeTab.getBoundingClientRect();
  if (!cRect.width || !tRect.width) return;

  const offsetX = Math.round(tRect.left - cRect.left);
  const offsetY = Math.round(tRect.top - cRect.top);
  glider.style.opacity = '1';
  glider.style.width = `${Math.round(tRect.width)}px`;
  glider.style.height = `${Math.round(tRect.height)}px`;
  glider.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
}

/**
 * Principle 19 — Peak-End Rule:
 * Emits a crisp 8-particle radial micro-spark flourish around a milestone button
 * (Prompt Generated, Build Launched, Template Saved). Auto-cleans after 540ms.
 */
export function triggerPeakEndBurst(anchorEl) {
  if (!anchorEl || prefersReducedMotion() || typeof document === 'undefined') return;
  const rect = anchorEl.getBoundingClientRect?.();
  if (!rect || !rect.width) return;

  const host = document.createElement('div');
  host.className = 'wf-spark-burst';
  host.setAttribute('aria-hidden', 'true');
  host.style.left = `${Math.round(rect.left + rect.width / 2)}px`;
  host.style.top = `${Math.round(rect.top + rect.height / 2)}px`;

  const count = 8;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 2 === 0 ? 0.15 : -0.1);
    const dist = 24 + (i % 3) * 8;
    const dx = Math.round(Math.cos(angle) * dist);
    const dy = Math.round(Math.sin(angle) * dist);
    const dot = document.createElement('span');
    dot.className = 'wf-spark-dot';
    dot.style.setProperty('--dx', `${dx}px`);
    dot.style.setProperty('--dy', `${dy}px`);
    dot.style.setProperty('--delay', `${(i % 3) * 24}ms`);
    host.appendChild(dot);
  }

  document.body.appendChild(host);
  setTimeout(() => host.remove(), 560);
}

