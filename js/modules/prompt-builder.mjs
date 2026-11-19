/**
 * WebForge Studio — 7-Step Prompt Builder Wizard
 */

export class PromptBuilder {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.totalSteps = 7;
    this.currentStep = 1;
    this.promptGenerated = false;
    this.selections = {
      type: '',
      style: '',
      color: '',
      header: '',
      hero: '',
      content: '',
      footer: '',
      spacing: '',
      animation: '',
      features: [],
      techFeatures: [],
      tech: '',
      siteName: '',
      siteTagline: '',
      siteDescription: '',
      siteTone: '',
      pageCount: '',
      customSections: '',
      fontPref: '',
    };

    this.stepNames = ['Type', 'Style', 'Colors', 'Layout', 'Content', 'Features', 'Prompt'];

    this.smartSuggestions = {
      'Business / Corporate': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Contact form with validation', 'FAQ accordion section', 'Social media icon links', 'Back to top button'],
      'Portfolio / Personal': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Scroll-triggered fade-in animations', 'Image lightbox gallery', 'Social media icon links', 'Back to top button'],
      'SaaS / Landing Page': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Scroll-triggered fade-in animations', 'Pricing table section', 'FAQ accordion section', 'Animated statistics counter section', 'Newsletter subscription form', 'Sticky call-to-action button'],
      'E-Commerce / Online Store': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Image or testimonial carousel/slider', 'Newsletter subscription form', 'Back to top button', 'Animated statistics counter section'],
      'Restaurant / Cafe': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Image or testimonial carousel/slider', 'Google Maps embed', 'Social media icon links', 'Parallax scrolling effect', 'Contact form with validation'],
      'Blog / Magazine': ['Responsive hamburger mobile menu', 'Dark / Light mode toggle', 'Smooth scroll navigation', 'Back to top button', 'Newsletter subscription form', 'Social media icon links'],
      'Photography / Gallery': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Image lightbox gallery', 'Parallax scrolling effect', 'Back to top button', 'Scroll-triggered fade-in animations'],
      'Education / Course': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'FAQ accordion section', 'Pricing table section', 'Contact form with validation', 'Animated statistics counter section', 'Back to top button'],
      'Health / Wellness': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Contact form with validation', 'Image or testimonial carousel/slider', 'Google Maps embed', 'Social media icon links', 'Scroll-triggered fade-in animations'],
      'Event / Conference': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Animated statistics counter section', 'Image or testimonial carousel/slider', 'Google Maps embed', 'Contact form with validation', 'Parallax scrolling effect'],
      'Real Estate / Property': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Image lightbox gallery', 'Contact form with validation', 'Google Maps embed', 'Image or testimonial carousel/slider', 'Back to top button'],
      'Non-Profit / Charity': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Animated statistics counter section', 'Contact form with validation', 'Newsletter subscription form', 'Social media icon links', 'Parallax scrolling effect'],
      'Law / Legal Services': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Contact form with validation', 'FAQ accordion section', 'Social media icon links', 'Back to top button'],
      'Gym / Fitness Studio': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Scroll-triggered fade-in animations', 'Image or testimonial carousel/slider', 'Pricing table section', 'Animated statistics counter section', 'Parallax scrolling effect', 'Social media icon links'],
      'Music / Band': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Scroll-triggered fade-in animations', 'Image lightbox gallery', 'Social media icon links', 'Parallax scrolling effect', 'Back to top button'],
      'Wedding / Celebration': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Image lightbox gallery', 'Parallax scrolling effect', 'Scroll-triggered fade-in animations', 'Back to top button', 'Contact form with validation'],
      'Travel / Tourism': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Image or testimonial carousel/slider', 'Image lightbox gallery', 'Google Maps embed', 'Scroll-triggered fade-in animations', 'Back to top button', 'Parallax scrolling effect'],
      'Church / Religious Organization': ['Responsive hamburger mobile menu', 'Smooth scroll navigation', 'Contact form with validation', 'Google Maps embed', 'Social media icon links', 'Newsletter subscription form', 'Back to top button'],
    };

    this.styleColorMap = {
      Minimalist: ['monochrome', 'nordic-slate', 'silver-lining'],
      Corporate: ['classic-blue', 'ocean-blue', 'monochrome'],
      Swiss: ['monochrome', 'classic-blue', 'nordic-slate'],
      Flat: ['classic-blue', 'modern-teal', 'forest-green'],
      Nordic: ['nordic-slate', 'silver-lining', 'pastel-dream'],
      Bento: ['monochrome', 'classic-blue', 'modern-teal'],
      Japanese: ['warm-neutral', 'mauve-serenity', 'nordic-slate'],
      Neomorphism: ['silver-lining', 'nordic-slate', 'soft-blush'],
      Luxury: ['charcoal-gold', 'mauve-serenity', 'ink-paper'],
      Dark: ['midnight', 'urban-dusk', 'deep-ocean'],
      Cyberpunk: ['neon-night', 'terminal-green', 'electric-orange'],
      Brutalist: ['monochrome', 'midnight', 'electric-orange'],
      Maximalist: ['sunset-rose', 'honey-orange', 'neon-night'],
      Gradient: ['pastel-dream', 'lavender', 'sunset-rose'],
      Playful: ['ice-cream', 'pastel-dream', 'honey-orange'],
      Editorial: ['ink-paper', 'charcoal-gold', 'monochrome'],
      Parallax: ['deep-ocean', 'urban-dusk', 'forest-green'],
      Terminal: ['terminal-green', 'midnight', 'deep-ocean'],
      Glassmorphism: ['deep-ocean', 'lavender', 'midnight'],
      Glasspunk: ['neon-night', 'lavender', 'deep-ocean'],
      Skeuomorphic: ['warm-neutral', 'graphite-copper', 'summer-fields'],
      'Art Deco': ['charcoal-gold', 'graphite-copper', 'midnight'],
      Boho: ['warm-neutral', 'summer-fields', 'honey-orange'],
      Industrial: ['graphite-copper', 'urban-dusk', 'warm-amber'],
      Vintage: ['warm-amber', 'warm-neutral', 'summer-fields'],
      Organic: ['greenery-moss', 'forest-green', 'summer-fields'],
      Retro: ['honey-orange', 'warm-amber', 'sunset-rose'],
    };

    this.promptHeights = { min: 200, mid: 420, max: 800 };
    this._setupResizeHandler();
    this._enableCardKeyboard();
  }

  _enableCardKeyboard() {
    const modal = document.getElementById('promptBuilderModal');
    if (!modal || modal.dataset.kbReady) return;
    modal.dataset.kbReady = '1';

    modal.querySelectorAll('.select-card, .feature-card').forEach((card) => {
      if (!card.hasAttribute('tabindex')) card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault();
        card.click();
      });
    });
  }

  updateFooterNav() {
    const back = document.getElementById('wizardBackBtn');
    const skip = document.getElementById('wizardSkipBtn');
    const next = document.getElementById('wizardNextBtn');
    const step = this.currentStep;

    if (back) {
      const showBack = step > 1;
      back.hidden = !showBack;
      back.disabled = !showBack;
    }

    if (skip) {
      skip.hidden = step < 2 || step > 5;
    }

    if (next) {
      if (step >= 7) {
        next.hidden = true;
      } else {
        next.hidden = false;
        if (step === 6) {
          next.innerHTML = '<i data-lucide="wand-2"></i> Generate Prompt';
        } else {
          next.innerHTML = 'Next <i data-lucide="arrow-right"></i>';
        }
      }
    }

    if (typeof window.lucide !== 'undefined') {
      try { window.lucide.createIcons({ root: document.getElementById('wizardFooter') }); } catch {}
    }
  }

  renderProgress() {
    const fill = document.getElementById('progressBarFill');
    if (fill) {
      fill.style.width = (this.promptGenerated ? 100 : (this.currentStep / 7) * 100) + '%';
    }

    const row = document.getElementById('progressRow');
    if (!row) return;

    row.innerHTML = '';
    this.stepNames.forEach((name, idx) => {
      const stepNum = idx + 1;
      const completed =
        stepNum < this.currentStep ||
        (this.currentStep === 7 && stepNum === 7) ||
        (this.promptGenerated && stepNum !== this.currentStep);
      const active = stepNum === this.currentStep;
      const reachable = stepNum <= this.currentStep || this.promptGenerated;

      const stepDiv = document.createElement('div');
      stepDiv.className = 'progress-step' + (active ? ' active' : '') + (completed ? ' completed' : '');
      stepDiv.setAttribute('role', 'button');
      stepDiv.tabIndex = reachable ? 0 : -1;
      stepDiv.setAttribute('aria-current', active ? 'step' : 'false');
      stepDiv.setAttribute('aria-label', `Step ${stepNum}: ${name}`);

      const go = () => {
        if (reachable) this.goToStep(stepNum);
      };
      stepDiv.onclick = go;
      stepDiv.onkeydown = (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          go();
        }
      };

      stepDiv.innerHTML =
        `<div class="step-dot">${completed ? '<i data-lucide="check" style="width:12px;height:12px"></i>' : stepNum}</div>` +
        `<div class="step-label">${name}</div>`;
      row.appendChild(stepDiv);

      if (idx < this.stepNames.length - 1) {
        const connector = document.createElement('div');
        connector.className = 'step-connector' + (stepNum < this.currentStep || this.promptGenerated ? ' active' : '');
        connector.setAttribute('aria-hidden', 'true');
        row.appendChild(connector);
      }
    });

    if (typeof window.lucide !== 'undefined') {
      try { window.lucide.createIcons({ root: row }); } catch {}
    }

    this.updateFooterNav();
  }

  showStep(step) {
    document.querySelectorAll('.step-panel').forEach((panel) => panel.classList.remove('active'));
    const target = document.querySelector(`.step-panel[data-step="${step}"]`);
    if (target) {
      target.classList.add('active');
      target.scrollTop = 0;
    }
    this.updateFooterNav();
    if (typeof window.lucide !== 'undefined') {
      try { window.lucide.createIcons({ root: document.getElementById('promptBuilderModal') }); } catch {}
    }
  }

  goToStep(step) {
    this.currentStep = step;
    if (step === 7 && this.promptGenerated) {
      this.generatePrompt();
    } else {
      this.showStep(step);
      this.renderProgress();
    }
  }

  nextStep() {
    if (this.currentStep < 7) {
      this.currentStep++;
      this.showStep(this.currentStep);
      this.renderProgress();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.showStep(this.currentStep);
      this.renderProgress();
    }
  }

  validateAndNext(step) {
    if (step === 1 && !this.selections.type) {
      const nudge = document.getElementById('typeNudge');
      if (nudge) {
        nudge.classList.add('show');
        setTimeout(() => nudge.classList.remove('show'), 3000);
      }
      return;
    }
    this.nextStep();
  }

  selectCard(el, key) {
    if (!el) return;
    if (key === 'type') {
      document.querySelectorAll('#typeGrid .select-card').forEach((c) => c.classList.remove('selected'));
    } else if (key === 'style') {
      document.querySelectorAll('#styleGrid .select-card').forEach((c) => c.classList.remove('selected'));
    } else if (key === 'color') {
      document.querySelectorAll('#colorGrid .select-card').forEach((c) => c.classList.remove('selected'));
    } else if (el.parentElement) {
      el.parentElement.querySelectorAll('.select-card').forEach((c) => c.classList.remove('selected'));
    }

    el.classList.add('selected');
    this.selections[key] = el.dataset.value || '';

    if (key === 'type') {
      document.getElementById('typeNudge')?.classList.remove('show');
      this.applySuggestions(this.selections[key]);
    }
    if (key === 'style') {
      this.updateColorRecommendations(this.selections[key]);
    }
  }

  applySuggestions(type) {
    const suggs = this.smartSuggestions[type] || [];
    if (!suggs.length) return;
    document.querySelectorAll('#featureGrid .feature-card').forEach((c) => {
      c.classList.toggle('selected', suggs.includes(c.dataset.value));
    });
    this.collectFeatures();
    this.showToast(`Features suggested for ${type.split(' / ')[0]}`);
  }

  updateColorRecommendations(style) {
    document.querySelectorAll('#colorGrid .select-card').forEach((c) => c.classList.remove('recommended'));
    const key = Object.keys(this.styleColorMap).find((k) => style.includes(k));
    if (!key) return;
    const recommendedPalettes = this.styleColorMap[key];
    document.querySelectorAll('#colorGrid .select-card[data-palette]').forEach((c) => {
      if (recommendedPalettes.includes(c.dataset.palette)) c.classList.add('recommended');
    });
  }

  toggleFeature(el) {
    el.classList.toggle('selected');
    this.collectFeatures();
  }

  collectFeatures() {
    this.selections.features = [];
    this.selections.techFeatures = [];
    document.querySelectorAll('#featureGrid .feature-card.selected').forEach((el) => {
      if (el.dataset.value) this.selections.features.push(el.dataset.value);
    });
    document.querySelectorAll('#techFeatureGrid .feature-card.selected').forEach((el) => {
      if (el.dataset.value) this.selections.techFeatures.push(el.dataset.value);
    });
  }

  syncColor(input, targetId) {
    if (/^#[0-9A-Fa-f]{6}$/.test(input.value)) {
      const target = document.getElementById(targetId);
      if (target) target.value = input.value;
    }
  }

  applyCustomColors() {
    document.querySelectorAll('#colorGrid .select-card').forEach((c) => c.classList.remove('selected'));
    const c1 = document.getElementById('customColor1')?.value || '';
    const c2 = document.getElementById('customColor2')?.value || '';
    const c3 = document.getElementById('customColor3')?.value || '';
    const c4 = document.getElementById('customColor4')?.value || '';
    const c5 = document.getElementById('customColor5')?.value || '';
    this.selections.color = `Custom colors: primary ${c1}, accent ${c2}, background ${c3}, text ${c4}, secondary ${c5}`;
    this.showToast('Custom colors applied');
  }

  generatePrompt() {
    this.selections.siteName = (document.getElementById('siteName')?.value || '').trim();
    this.selections.siteTagline = (document.getElementById('siteTagline')?.value || '').trim();
    this.selections.siteDescription = (document.getElementById('siteDescription')?.value || '').trim();
    this.selections.customSections = (document.getElementById('customSections')?.value || '').trim();
    this.selections.fontPref = (document.getElementById('fontPref')?.value || '').trim();
    this.collectFeatures();

    const lines = [
      `Build a complete, production-ready ${this.selections.pageCount || 'single page'} ${this.selections.type || 'website'} from scratch.`,
    ];

    if (this.selections.siteName) {
      let siteLine = `The website is for "${this.selections.siteName}"`;
      if (this.selections.siteTagline) siteLine += ` - tagline: "${this.selections.siteTagline}"`;
      lines.push(`${siteLine}.`);
    }

    if (this.selections.siteDescription) {
      lines.push(`About: ${this.selections.siteDescription}`);
    }

    if (this.selections.tech) {
      lines.push(`\nTECHNOLOGY:\nUse ${this.selections.tech}. Write clean, well-structured, production-quality code.`);
    }

    const design = [];
    if (this.selections.style) design.push(`Style: ${this.selections.style}`);
    if (this.selections.color) design.push(`Colors: ${this.selections.color}`);
    if (this.selections.siteTone) design.push(`Tone & Voice: ${this.selections.siteTone}`);
    if (this.selections.fontPref) design.push(`Typography: ${this.selections.fontPref}`);
    if (design.length) lines.push(`\nDESIGN DIRECTION:\n${design.join('\n')}`);

    const layout = [];
    if (this.selections.header) layout.push(`Navigation: ${this.selections.header}`);
    if (this.selections.hero) layout.push(`Hero Section: ${this.selections.hero}`);
    if (this.selections.content) layout.push(`Content Layout: ${this.selections.content}`);
    if (this.selections.footer) layout.push(`Footer: ${this.selections.footer}`);
    if (this.selections.spacing) layout.push(`Section Spacing: ${this.selections.spacing}`);
    if (this.selections.animation) layout.push(`Scroll Animation: ${this.selections.animation}`);
    if (layout.length) lines.push(`\nLAYOUT STRUCTURE:\n${layout.join('\n')}`);

    if (this.selections.customSections) {
      lines.push(`\nSECTIONS TO INCLUDE:\n${this.selections.customSections}`);
    }
    if (this.selections.features.length) {
      lines.push(`\nINTERACTIVE FEATURES:\n- ${this.selections.features.join('\n- ')}`);
    }
    if (this.selections.techFeatures.length) {
      lines.push(`\nTECHNICAL REQUIREMENTS:\n- ${this.selections.techFeatures.join('\n- ')}`);
    }

    lines.push(
      '\nIMPORTANT GUIDELINES:',
      '- Make the website fully responsive across desktop, tablet, and mobile',
      '- Use smooth transitions and micro-interactions for a polished feel',
      '- Write realistic domain copy instead of generic lorem ipsum',
      '- Ensure consistent spacing, alignment, and visual hierarchy throughout',
      '- Provide complete, ready-to-use code'
    );

    const outputEl = document.getElementById('promptOutput');
    if (outputEl) outputEl.textContent = lines.join('\n');
    this.calculateQuality();
    this.promptGenerated = true;
    this.currentStep = 7;
    this.showStep(7);
    this.renderProgress();
  }

  calculateQuality() {
    let score = 0;
    const keys = [
      'type', 'style', 'color', 'header', 'hero', 'content',
      'footer', 'spacing', 'animation', 'tech', 'siteName', 'siteDescription', 'siteTone',
    ];
    for (const k of keys) if (this.selections[k]) score++;
    if (this.selections.features.length) score++;

    const pct = Math.round((score / 14) * 100);
    const fill = document.getElementById('qualityFill');
    const percent = document.getElementById('qualityPercent');
    if (fill && percent) {
      fill.style.width = `${pct}%`;
      percent.textContent = `${pct}%`;
      if (pct < 40) {
        fill.style.background = 'var(--md-error)';
        percent.style.color = 'var(--md-error)';
      } else if (pct < 70) {
        fill.style.background = 'var(--md-warning)';
        percent.style.color = 'var(--md-warning)';
      } else {
        fill.style.background = 'var(--md-primary)';
        percent.style.color = 'var(--md-primary)';
      }
    }
  }

  startOver() {
    this.promptGenerated = false;
    Object.keys(this.selections).forEach((k) => {
      this.selections[k] = Array.isArray(this.selections[k]) ? [] : '';
    });
    document.querySelectorAll('#promptBuilderModal .select-card.selected, #promptBuilderModal .feature-card.selected').forEach((el) => {
      el.classList.remove('selected');
    });
    document.querySelectorAll('#promptBuilderModal .select-card.recommended').forEach((el) => {
      el.classList.remove('recommended');
    });
    ['siteName', 'siteTagline', 'siteDescription', 'customSections', 'fontPref'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const output = document.getElementById('promptOutput');
    if (output) {
      output.textContent = '';
      output.style.height = '420px';
    }
    this.currentStep = 1;
    this.showStep(1);
    this.renderProgress();
    this.showToast('Wizard cleared');
  }

  getPromptText() {
    const el = document.getElementById('promptOutput');
    return el ? (el.innerText || el.textContent || '') : '';
  }

  async copyPrompt() {
    const text = this.getPromptText();
    if (!text) return this.showToast('No prompt to copy');
    try {
      await navigator.clipboard.writeText(text);
      const btn = document.getElementById('copyBtn');
      if (btn) {
        btn.classList.add('copied');
        btn.innerHTML = '<i data-lucide="check" style="width:14px;height:14px"></i> Copied';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = '<i data-lucide="copy" style="width:14px;height:14px"></i> Copy';
          if (typeof window.lucide !== 'undefined') {
            try { window.lucide.createIcons({ root: btn }); } catch {}
          }
        }, 1800);
      }
      this.showToast('Prompt copied');
    } catch {
      this.showToast('Copy failed', true);
    }
  }

  downloadPrompt() {
    const text = this.getPromptText();
    if (!text) return this.showToast('No prompt to download');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const slug = (this.selections.type || 'website').split(' / ')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.download = `webforge-prompt-${slug}.txt`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 100);
    this.showToast('Prompt downloaded');
  }

  continueToChat() {
    const text = this.getPromptText().trim();
    if (!text) return this.showToast('Generate a prompt first');
    document.getElementById('promptBuilderModal')?.close();
    this.callbacks.onContinueToChat?.(text);
  }

  setPromptHeight(h) {
    const el = document.getElementById('promptOutput');
    if (el && this.promptHeights[h]) el.style.height = `${this.promptHeights[h]}px`;
    document.querySelectorAll('.resize-btn').forEach((btn) => btn.classList.remove('active'));
    document.querySelector(`.resize-btn-${h}`)?.classList.add('active');
  }

  showToast(msg, isError = false) {
    this.callbacks.onToast?.(msg, isError);
  }

  _setupResizeHandler() {
    const grip = document.getElementById('resizeBar');
    const output = document.getElementById('promptOutput');
    if (!grip || !output) return;
    let startY = 0;
    let startHeight = 0;
    let resizing = false;

    grip.addEventListener('mousedown', (e) => {
      if (e.target.closest('.resize-btns')) return;
      resizing = true;
      startY = e.clientY;
      startHeight = output.offsetHeight;
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      output.style.height = `${Math.max(150, startHeight + (e.clientY - startY))}px`;
      document.querySelectorAll('.resize-btn').forEach((b) => b.classList.remove('active'));
    });
    document.addEventListener('mouseup', () => {
      if (!resizing) return;
      resizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }
}
