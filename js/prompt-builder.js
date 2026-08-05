/**
 * WebForge - Prompt Builder
 * 7-step wizard that builds a detailed site prompt from user selections.
 */

class PromptBuilder {
  constructor() {
    window.promptBuilder = this;
    this.totalSteps = 7;
    this.currentStep = 1;
    this.promptGenerated = false;
    this.selections = {
      type: "",
      style: "",
      color: "",
      header: "",
      hero: "",
      content: "",
      footer: "",
      spacing: "",
      animation: "",
      features: [],
      techFeatures: [],
      tech: "",
      siteName: "",
      siteTagline: "",
      siteDescription: "",
      siteTone: "",
      pageCount: "",
      customSections: "",
      fontPref: "",
    };
    
    this.stepNames = [
      "Type",
      "Style",
      "Colors",
      "Layout",
      "Content",
      "Features",
      "Prompt",
    ];

    this.smartSuggestions = {
      "Business / Corporate": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "Contact form with validation",
        "FAQ accordion section",
        "Social media icon links",
        "Back to top button",
      ],
      "Portfolio / Personal": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "Scroll-triggered fade-in animations",
        "Image lightbox gallery",
        "Social media icon links",
        "Back to top button",
      ],
      "SaaS / Landing Page": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "Scroll-triggered fade-in animations",
        "Pricing table section",
        "FAQ accordion section",
        "Animated statistics counter section",
        "Newsletter subscription form",
        "Sticky call-to-action button",
      ],
      "E-Commerce / Online Store": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "Image or testimonial carousel/slider",
        "Newsletter subscription form",
        "Back to top button",
        "Animated statistics counter section",
      ],
      "Restaurant / Cafe": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "Image or testimonial carousel/slider",
        "Google Maps embed",
        "Social media icon links",
        "Parallax scrolling effect",
        "Contact form with validation",
      ],
      "Blog / Magazine": [
        "Responsive hamburger mobile menu",
        "Dark / Light mode toggle",
        "Smooth scroll navigation",
        "Back to top button",
        "Newsletter subscription form",
        "Social media icon links",
      ],
      "Photography / Gallery": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "Image lightbox gallery",
        "Parallax scrolling effect",
        "Back to top button",
        "Scroll-triggered fade-in animations",
      ],
      "Education / Course": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "FAQ accordion section",
        "Pricing table section",
        "Contact form with validation",
        "Animated statistics counter section",
        "Back to top button",
      ],
      "Health / Wellness": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "Contact form with validation",
        "Image or testimonial carousel/slider",
        "Google Maps embed",
        "Social media icon links",
        "Scroll-triggered fade-in animations",
      ],
      "Event / Conference": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "Animated statistics counter section",
        "Image or testimonial carousel/slider",
        "Google Maps embed",
        "Contact form with validation",
        "Parallax scrolling effect",
      ],
      "Real Estate / Property": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "Image lightbox gallery",
        "Contact form with validation",
        "Google Maps embed",
        "Image or testimonial carousel/slider",
        "Back to top button",
      ],
      "Non-Profit / Charity": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "Animated statistics counter section",
        "Contact form with validation",
        "Newsletter subscription form",
        "Social media icon links",
        "Parallax scrolling effect",
      ],
      "Law / Legal Services": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "Contact form with validation",
        "FAQ accordion section",
        "Social media icon links",
        "Back to top button",
      ],
      "Gym / Fitness Studio": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "Scroll-triggered fade-in animations",
        "Image or testimonial carousel/slider",
        "Pricing table section",
        "Animated statistics counter section",
        "Parallax scrolling effect",
        "Social media icon links",
      ],
      "Music / Band": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "Scroll-triggered fade-in animations",
        "Image lightbox gallery",
        "Social media icon links",
        "Parallax scrolling effect",
        "Back to top button",
      ],
      "Wedding / Celebration": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "Image lightbox gallery",
        "Parallax scrolling effect",
        "Scroll-triggered fade-in animations",
        "Back to top button",
        "Contact form with validation",
      ],
      "Travel / Tourism": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "Image or testimonial carousel/slider",
        "Image lightbox gallery",
        "Google Maps embed",
        "Scroll-triggered fade-in animations",
        "Back to top button",
        "Parallax scrolling effect",
      ],
      "Church / Religious Organization": [
        "Responsive hamburger mobile menu",
        "Smooth scroll navigation",
        "Contact form with validation",
        "Google Maps embed",
        "Social media icon links",
        "Newsletter subscription form",
        "Back to top button",
      ],
    };

    this.styleColorMap = {
      Minimalist: ["monochrome", "nordic-slate", "silver-lining"],
      Corporate: ["classic-blue", "ocean-blue", "monochrome"],
      Swiss: ["monochrome", "classic-blue", "nordic-slate"],
      Flat: ["classic-blue", "modern-teal", "forest-green"],
      Nordic: ["nordic-slate", "silver-lining", "pastel-dream"],
      Bento: ["monochrome", "classic-blue", "modern-teal"],
      Japanese: ["warm-neutral", "mauve-serenity", "nordic-slate"],
      Neomorphism: ["silver-lining", "nordic-slate", "soft-blush"],
      Luxury: ["charcoal-gold", "mauve-serenity", "ink-paper"],
      Dark: ["midnight", "urban-dusk", "deep-ocean"],
      Cyberpunk: ["neon-night", "terminal-green", "electric-orange"],
      Brutalist: ["monochrome", "midnight", "electric-orange"],
      Maximalist: ["sunset-rose", "honey-orange", "neon-night"],
      Gradient: ["pastel-dream", "lavender", "sunset-rose"],
      Playful: ["ice-cream", "pastel-dream", "honey-orange"],
      Editorial: ["ink-paper", "charcoal-gold", "monochrome"],
      Parallax: ["deep-ocean", "urban-dusk", "forest-green"],
      Terminal: ["terminal-green", "midnight", "deep-ocean"],
      Glassmorphism: ["deep-ocean", "lavender", "midnight"],
      Glasspunk: ["neon-night", "lavender", "deep-ocean"],
      Skeuomorphic: ["warm-neutral", "graphite-copper", "summer-fields"],
      "Art Deco": ["charcoal-gold", "graphite-copper", "midnight"],
      Boho: ["warm-neutral", "summer-fields", "honey-orange"],
      Industrial: ["graphite-copper", "urban-dusk", "warm-amber"],
      Vintage: ["warm-amber", "warm-neutral", "summer-fields"],
      Organic: ["greenery-moss", "forest-green", "summer-fields"],
      Retro: ["honey-orange", "warm-amber", "sunset-rose"],
    };

    this.promptHeights = { min: 200, mid: 420, max: 800 };
    this._footerWired = false;
    this._setupResizeHandler();
    this._wireFooter();
    this._enableCardKeyboard();
  }

  _enableCardKeyboard() {
    const modal = document.getElementById("promptBuilderModal");
    if (!modal || modal.dataset.kbReady) return;
    modal.dataset.kbReady = "1";

    modal.querySelectorAll(".select-card, .feature-card").forEach((card) => {
      if (!card.hasAttribute("tabindex")) card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.addEventListener("keydown", (ev) => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        ev.preventDefault();
        card.click();
      });
    });
  }

  _wireFooter() {
    if (this._footerWired) return;
    // Visibility only — clicks use onclick / wizardFooterNext to avoid double-firing
    this._footerWired = true;
  }

  updateFooterNav() {
    this._wireFooter();
    const back = document.getElementById("wizardBackBtn");
    const skip = document.getElementById("wizardSkipBtn");
    const next = document.getElementById("wizardNextBtn");
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

    if (typeof lucide !== "undefined") {
      try { lucide.createIcons(); } catch (e) {}
    }
  }

  renderProgress() {
    const fill = document.getElementById("progressBarFill");
    if (fill) {
      fill.style.width = (this.promptGenerated ? 100 : (this.currentStep / 7) * 100) + "%";
    }

    const row = document.getElementById("progressRow");
    if (!row) return;

    row.innerHTML = "";
    this.stepNames.forEach((name, idx) => {
      const stepNum = idx + 1;
      const completed =
        stepNum < this.currentStep ||
        (this.currentStep === 7 && stepNum === 7) ||
        (this.promptGenerated && stepNum !== this.currentStep);
      const active = stepNum === this.currentStep;
      const reachable = stepNum <= this.currentStep || this.promptGenerated;

      const stepDiv = document.createElement("div");
      stepDiv.className =
        "progress-step" +
        (active ? " active" : "") +
        (completed ? " completed" : "");
      stepDiv.setAttribute("role", "button");
      stepDiv.tabIndex = reachable ? 0 : -1;
      stepDiv.setAttribute("aria-current", active ? "step" : "false");
      stepDiv.setAttribute("aria-label", `Step ${stepNum}: ${name}`);

      const go = () => {
        if (reachable) this.goToStep(stepNum);
      };
      stepDiv.onclick = go;
      stepDiv.onkeydown = (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          go();
        }
      };

      stepDiv.innerHTML =
        `<div class="step-dot">${completed ? '<i data-lucide="check" style="width:12px;height:12px"></i>' : stepNum}</div>` +
        `<div class="step-label">${name}</div>`;
      row.appendChild(stepDiv);

      if (idx < this.stepNames.length - 1) {
        const connector = document.createElement("div");
        connector.className =
          "step-connector" +
          (stepNum < this.currentStep || this.promptGenerated ? " active" : "");
        connector.setAttribute("aria-hidden", "true");
        row.appendChild(connector);
      }
    });

    if (typeof lucide !== "undefined") {
      try { lucide.createIcons(); } catch (e) {}
    }

    this.updateFooterNav();
  }

  showStep(e) {
    document.querySelectorAll(".step-panel").forEach((panel) => panel.classList.remove("active"));
    const t = document.querySelector('.step-panel[data-step="' + e + '"]');
    if (t) {
      t.classList.add("active");
      t.style.animation = "none";
      t.offsetHeight; // force reflow
      t.style.animation = "";
      t.scrollTop = 0;
    }
    this.updateFooterNav();
    if (typeof lucide !== "undefined") {
      try { lucide.createIcons(); } catch (err) {}
    }
  }

  goToStep(e) {
    this.currentStep = e;
    if (e === 7 && this.promptGenerated) {
      this.generatePrompt();
    } else {
      this.showStep(e);
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
      const nudge = document.getElementById("typeNudge");
      if (nudge) {
        nudge.classList.add("show");
        setTimeout(() => nudge.classList.remove("show"), 3000);
      }
      return;
    }
    this.nextStep();
  }

  selectCard(el, key) {
    // Clear selection from other cards in the same step
    if (key === "type") {
      document.querySelectorAll("#typeGrid .select-card").forEach(c => c.classList.remove("selected"));
    } else if (key === "style") {
      document.querySelectorAll("#styleGrid .select-card").forEach(c => c.classList.remove("selected"));
    } else if (key === "color") {
      document.querySelectorAll("#colorGrid .select-card").forEach(c => c.classList.remove("selected"));
    } else if (el.parentElement) {
      el.parentElement.querySelectorAll(".select-card").forEach(c => c.classList.remove("selected"));
    }

    el.classList.add("selected");
    this.selections[key] = el.dataset.value;

    if (key === "type") {
      const nudge = document.getElementById("typeNudge");
      if (nudge) nudge.classList.remove("show");
      this.applySuggestions(el.dataset.value);
    }
    if (key === "style") {
      this.updateColorRecommendations(el.dataset.value);
    }
  }

  applySuggestions(type) {
    const suggs = this.smartSuggestions[type] || [];
    if (suggs.length) {
      document.querySelectorAll("#featureGrid .feature-card").forEach(c => c.classList.remove("selected"));
      document.querySelectorAll("#featureGrid .feature-card").forEach(c => {
        if (suggs.includes(c.dataset.value)) {
          c.classList.add("selected");
        }
      });
      this.collectFeatures();
      this.showToast("Features auto-suggested for " + type.split(" / ")[0] + "!");
    }
  }

  updateColorRecommendations(style) {
    document.querySelectorAll("#colorGrid .select-card").forEach(c => c.classList.remove("recommended"));
    const key = Object.keys(this.styleColorMap).find(k => style.includes(k));
    if (!key) return;
    const recommendedPalettes = this.styleColorMap[key];
    document.querySelectorAll("#colorGrid .select-card[data-palette]").forEach(c => {
      if (recommendedPalettes.includes(c.dataset.palette)) {
        c.classList.add("recommended");
      }
    });
  }

  toggleFeature(el) {
    el.classList.toggle("selected");
    this.collectFeatures();
  }

  collectFeatures() {
    this.selections.features = [];
    this.selections.techFeatures = [];
    document.querySelectorAll("#featureGrid .feature-card.selected").forEach(el => {
      this.selections.features.push(el.dataset.value);
    });
    document.querySelectorAll("#techFeatureGrid .feature-card.selected").forEach(el => {
      this.selections.techFeatures.push(el.dataset.value);
    });
  }

  syncColor(input, targetId) {
    if (/^#[0-9A-Fa-f]{6}$/.test(input.value)) {
      const target = document.getElementById(targetId);
      if (target) target.value = input.value;
    }
  }

  applyCustomColors() {
    document.querySelectorAll("#colorGrid .select-card").forEach(c => c.classList.remove("selected"));
    const c1 = document.getElementById("customColor1")?.value || "";
    const c2 = document.getElementById("customColor2")?.value || "";
    const c3 = document.getElementById("customColor3")?.value || "";
    const c4 = document.getElementById("customColor4")?.value || "";
    const c5 = document.getElementById("customColor5")?.value || "";
    
    this.selections.color = `Custom colors: primary ${c1}, accent ${c2}, background ${c3}, text ${c4}, secondary ${c5}`;
    this.showToast("Custom colors applied!");
  }

  generatePrompt() {
    this.selections.siteName = (document.getElementById("siteName")?.value || "").trim();
    this.selections.siteTagline = (document.getElementById("siteTagline")?.value || "").trim();
    this.selections.siteDescription = (document.getElementById("siteDescription")?.value || "").trim();
    this.selections.customSections = (document.getElementById("customSections")?.value || "").trim();
    this.selections.fontPref = (document.getElementById("fontPref")?.value || "").trim();
    this.collectFeatures();

    let e = [];
    e.push(
      "Build a complete, production-ready " +
        (this.selections.pageCount || "single page") +
        " " +
        (this.selections.type || "website") +
        " from scratch."
    );

    if (this.selections.siteName) {
      let t = 'The website is for "' + this.selections.siteName + '"';
      if (this.selections.siteTagline) {
        t += ' - tagline: "' + this.selections.siteTagline + '"';
      }
      t += ".";
      e.push(t);
    }

    if (this.selections.siteDescription) {
      e.push("About: " + this.selections.siteDescription);
    }

    if (this.selections.tech) {
      e.push(
        "\nTECHNOLOGY:\nUse " +
          this.selections.tech +
          ". Write clean, well-structured, production-quality code."
      );
    }

    let t = [];
    if (this.selections.style) t.push("Style: " + this.selections.style);
    if (this.selections.color) t.push("Colors: " + this.selections.color);
    if (this.selections.siteTone) t.push("Tone & Voice: " + this.selections.siteTone);
    if (this.selections.fontPref) t.push("Typography: " + this.selections.fontPref);
    if (t.length) e.push("\nDESIGN DIRECTION:\n" + t.join("\n"));

    let o = [];
    if (this.selections.header) o.push("Navigation: " + this.selections.header);
    if (this.selections.hero) o.push("Hero Section: " + this.selections.hero);
    if (this.selections.content) o.push("Content Layout: " + this.selections.content);
    if (this.selections.footer) o.push("Footer: " + this.selections.footer);
    if (this.selections.spacing) o.push("Section Spacing: " + this.selections.spacing);
    if (this.selections.animation) o.push("Scroll Animation: " + this.selections.animation);
    if (o.length) e.push("\nLAYOUT STRUCTURE:\n" + o.join("\n"));

    if (this.selections.customSections) {
      e.push("\nSECTIONS TO INCLUDE:\n" + this.selections.customSections);
    }

    if (this.selections.features.length) {
      e.push(
        "\nINTERACTIVE FEATURES:\nInclude the following:\n- " +
          this.selections.features.join("\n- ")
      );
    }

    if (this.selections.techFeatures.length) {
      e.push(
        "\nTECHNICAL REQUIREMENTS:\n- " + this.selections.techFeatures.join("\n- ")
      );
    }

    e.push("\nIMPORTANT GUIDELINES:");
    e.push("- Make the website fully responsive across desktop, tablet, and mobile");
    e.push("- Use smooth transitions and micro-interactions for a polished feel");
    e.push("- Use placeholder images (via picsum.photos or placehold.co) where needed");
    e.push("- Write realistic placeholder text instead of generic lorem ipsum");
    e.push("- Ensure consistent spacing, alignment, and visual hierarchy throughout");
    e.push("- Provide the complete, ready-to-use code");

    const outputEl = document.getElementById("promptOutput");
    if (outputEl) {
      outputEl.textContent = e.join("\n");
    }
    this.calculateQuality();
    this.promptGenerated = true;
    this.currentStep = 7;
    this.showStep(7);
    this.renderProgress();
  }

  calculateQuality() {
    let e = 0;
    if (this.selections.type) e++;
    if (this.selections.style) e++;
    if (this.selections.color) e++;
    if (this.selections.header) e++;
    if (this.selections.hero) e++;
    if (this.selections.content) e++;
    if (this.selections.footer) e++;
    if (this.selections.spacing) e++;
    if (this.selections.animation) e++;
    if (this.selections.features.length) e++;
    if (this.selections.tech) e++;
    if (this.selections.siteName) e++;
    if (this.selections.siteDescription) e++;
    if (this.selections.siteTone) e++;
    
    const t = Math.round((e / 14) * 100);
    const fill = document.getElementById("qualityFill");
    const percent = document.getElementById("qualityPercent");
    if (fill && percent) {
      fill.style.width = t + "%";
      percent.textContent = t + "%";
      if (t < 40) {
        fill.style.background = "#d4543a";
        percent.style.color = "#d4543a";
      } else if (t < 70) {
        fill.style.background = "#b8885a";
        percent.style.color = "#9a7040";
      } else {
        fill.style.background = "var(--primary)";
        percent.style.color = "var(--primary)";
      }
    }
  }

  startOver() {
    this.promptGenerated = false;
    Object.keys(this.selections).forEach(k => {
      this.selections[k] = Array.isArray(this.selections[k]) ? [] : "";
    });

    document.querySelectorAll(".select-card.selected, .feature-card.selected").forEach(el => {
      el.classList.remove("selected");
    });
    document.querySelectorAll(".select-card.recommended").forEach(el => {
      el.classList.remove("recommended");
    });

    ['siteName', 'siteTagline', 'siteDescription', 'customSections', 'fontPref'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    const output = document.getElementById("promptOutput");
    if (output) {
      output.textContent = "";
      output.style.height = "420px";
    }

    document.querySelectorAll(".resize-btn").forEach(btn => btn.classList.remove("active"));
    const midBtn = document.querySelector(".resize-btn-mid");
    if (midBtn) midBtn.classList.add("active");

    this.currentStep = 1;
    this.showStep(1);
    this.renderProgress();
    this.showToast("All selections cleared. Starting fresh!");
  }

  getPromptText() {
    const el = document.getElementById("promptOutput");
    return el ? (el.innerText || el.textContent || "") : "";
  }
  copyPrompt() {
    const text = this.getPromptText();
    if (text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => this.copySuccess())
          .catch(() => this.fallbackCopy(text));
      } else {
        this.fallbackCopy(text);
      }
    } else {
      this.showToast("No prompt to copy!");
    }
  }

  fallbackCopy(text) {
    const t = document.createElement("textarea");
    t.value = text;
    t.style.position = "fixed";
    t.style.left = "-9999px";
    t.style.top = "-9999px";
    document.body.appendChild(t);
    t.focus();
    t.select();
    try {
      document.execCommand("copy");
      this.copySuccess();
    } catch (e) {
      this.showToast("Copy failed - please copy manually");
    }
    document.body.removeChild(t);
  }

  copySuccess() {
    const btn = document.getElementById("copyBtn");
    if (btn) {
      btn.classList.add("copied");
      btn.innerHTML = '<i data-lucide="check" style="width:14px;height:14px"></i> Copied!';
      if (typeof lucide !== 'undefined') { try { lucide.createIcons({ root: btn }); } catch (e) {} }
      this.showToast("Prompt copied to clipboard!");
      setTimeout(() => {
        btn.classList.remove("copied");
        btn.innerHTML = '<i data-lucide="copy" style="width:14px;height:14px"></i> Copy';
        if (typeof lucide !== 'undefined') { try { lucide.createIcons({ root: btn }); } catch (e) {} }
      }, 2000);
    }
  }

  downloadPrompt() {
    const text = this.getPromptText();
    if (text) {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const typeStr = (this.selections.type || "website")
        .split(" / ")[0]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      link.download = "ai-prompt-" + typeStr + ".txt";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      this.showToast("Prompt downloaded!");
    } else {
      this.showToast("No prompt to download!");
    }
  }

  useOpenDesignExperiment() {
    const prompt = `Build an experimental Open Design-style web artifact from scratch.

OPEN DESIGN MODE:
Use the nexu-io/open-design workflow as inspiration. Treat the result as a local-first design artifact, not a generic landing page.

ARTIFACT GOAL:
Create a polished, critique-ready prototype that could live inside a design studio. It should feel like a real artifact produced from a compact DESIGN.md brand contract.

DESIGN CONTRACT:
- Define a clear audience, brand tone, visual language, and interaction style inside the implementation.
- Use design tokens for color, type scale, spacing, surfaces, borders, and motion.
- Build reusable sections/components with consistent rhythm and hierarchy.

ARTIFACT TYPE:
Default to a single-page responsive prototype. If the prompt implies data, create a live dashboard/artifact. If it implies storytelling, create a deck-like narrative page. If it implies brand exploration, include image/visual direction blocks.

UX REQUIREMENTS:
- Strong first viewport with brand signal, clear CTA, and visible next section.
- Responsive desktop/tablet/mobile behavior.
- Smooth but restrained micro-interactions.
- Empty, hover, focus, and active states where relevant.
- Realistic copy, no lorem ipsum.

OUTPUT RULES:
- Generate complete, ready-to-run code for every changed file.
- Never use placeholders, comments for brevity, skipped sections, or partial snippets.
- Preserve existing working code on follow-up edits and patch only what is needed.`;

    const outputEl = document.getElementById("promptOutput");
    if (outputEl) outputEl.textContent = prompt;
    this.promptGenerated = true;
    this.currentStep = 7;
    this.showStep(7);
    this.renderProgress();
    this.calculateQuality();
    this.showToast("Open Design experiment ready");
  }

  continueToChat() {
    const text = this.getPromptText();
    if (!text) {
      this.showToast("No prompt to send to chat!");
      return;
    }
    const input = document.getElementById("chatInput");
    if (input) {
      input.value = text;
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 160) + "px";
      input.focus();
    }
    document.getElementById("promptBuilderModal")?.close();
    this.showToast("Prompt copied to composer!");
  }

  setPromptHeight(h) {
    const el = document.getElementById("promptOutput");
    if (el && this.promptHeights[h]) {
      el.style.height = this.promptHeights[h] + "px";
    }
    document.querySelectorAll(".resize-btn").forEach(btn => btn.classList.remove("active"));
    const activeBtn = document.querySelector(".resize-btn-" + h);
    if (activeBtn) activeBtn.classList.add("active");
  }

  showToast(msg) {
    const t = document.getElementById("toast");
    if (t) {
      t.textContent = msg;
      t.style.borderColor = 'var(--primary)';
      t.classList.add("show");
      setTimeout(() => t.classList.remove("show"), 2500);
    }
  }

  _setupResizeHandler() {
    // Add load wrapper to run when DOM is ready
    document.addEventListener("DOMContentLoaded", () => {
      const grip = document.getElementById("resizeBar");
      const output = document.getElementById("promptOutput");
      if (!grip || !output) return;
      
      let startY, startHeight, resizing = false;
      
      grip.addEventListener("mousedown", (e) => {
        if (e.target.closest(".resize-btns")) return;
        resizing = true;
        startY = e.clientY;
        startHeight = output.offsetHeight;
        document.body.style.cursor = "ns-resize";
        document.body.style.userSelect = "none";
        e.preventDefault();
      });

      document.addEventListener("mousemove", (e) => {
        if (!resizing) return;
        const newH = Math.max(150, startHeight + (e.clientY - startY));
        output.style.height = newH + "px";
        document.querySelectorAll(".resize-btn").forEach(btn => btn.classList.remove("active"));
      });

      document.addEventListener("mouseup", () => {
        if (resizing) {
          resizing = false;
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        }
      });
    });
  }
}

window.PromptBuilder = PromptBuilder;

// Global routing wrappers for promptBuilderModal HTML click events
function openPromptBuilderModal() {
  const modal = document.getElementById("promptBuilderModal");
  if (modal) {
    modal.showModal();
    if (window.promptBuilder) {
      window.promptBuilder.startOver();
    }
  }
}
function selectCard(el, key) { if (window.promptBuilder) promptBuilder.selectCard(el, key); }
function toggleFeature(el) { if (window.promptBuilder) promptBuilder.toggleFeature(el); }
function applyCustomColors() { if (window.promptBuilder) promptBuilder.applyCustomColors(); }
function validateAndNext(step) { if (window.promptBuilder) promptBuilder.validateAndNext(step); }
function nextStep() { if (window.promptBuilder) promptBuilder.nextStep(); }
function prevStep() { if (window.promptBuilder) promptBuilder.prevStep(); }
function wizardFooterNext() {
  if (!window.promptBuilder) return;
  const step = promptBuilder.currentStep;
  if (step === 1) promptBuilder.validateAndNext(1);
  else if (step === 6) promptBuilder.generatePrompt();
  else if (step < 7) promptBuilder.nextStep();
}
function startOver() { if (window.promptBuilder) promptBuilder.startOver(); }
function goToStep(step) { if (window.promptBuilder) promptBuilder.goToStep(step); }
function generatePrompt() { if (window.promptBuilder) promptBuilder.generatePrompt(); }
function continueToChat() { if (window.promptBuilder) promptBuilder.continueToChat(); }
function syncColor(input, targetId) { if (window.promptBuilder) promptBuilder.syncColor(input, targetId); }
function copyPrompt() { if (window.promptBuilder) window.promptBuilder.copyPrompt(); }
function downloadPrompt() { if (window.promptBuilder) window.promptBuilder.downloadPrompt(); }
function setPromptHeight(h) { if (window.promptBuilder) window.promptBuilder.setPromptHeight(h); }

function useOpenDesignExperiment() { if (window.promptBuilder) window.promptBuilder.useOpenDesignExperiment(); }




window.openPromptBuilderModal = openPromptBuilderModal;
window.selectCard = selectCard;
window.toggleFeature = toggleFeature;
window.applyCustomColors = applyCustomColors;
window.validateAndNext = validateAndNext;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.wizardFooterNext = wizardFooterNext;
window.startOver = startOver;
window.goToStep = goToStep;
window.generatePrompt = generatePrompt;
window.continueToChat = continueToChat;
window.syncColor = syncColor;
window.copyPrompt = copyPrompt;
window.downloadPrompt = downloadPrompt;
window.setPromptHeight = setPromptHeight;
window.useOpenDesignExperiment = useOpenDesignExperiment;
