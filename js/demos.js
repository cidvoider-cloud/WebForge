/**
 * WebForge — Built-in demo projects (flora / cute / stylish)
 * Seeded into localStorage once so the home dashboard isn't empty.
 */

const DEMO_SEED_KEY = 'wf_demos_seeded';
const DEMO_SEED_VERSION = 'flora-v1';

const DEMO_MAIN = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);`;

/** 1 — Cute florist */
const DEMO_PETAL_POP = {
  id: 'demo-petal-pop',
  name: 'Petal Pop',
  icon: 'flower-2',
  accent: '#f472b6',
  tagline: 'Cute neighborhood florist',
  vfs: {
    'src/main.jsx': DEMO_MAIN,
    'src/index.css': `@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@500;700;800&family=Quicksand:wght@500;600;700&display=swap');

:root {
  --ink: #3d2c3a;
  --blush: #ffd6e7;
  --petal: #ff8fb8;
  --mint: #b8f0d8;
  --cream: #fff8fb;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: 'Nunito', system-ui, sans-serif;
  color: var(--ink);
  background: var(--cream);
}
.brand-font { font-family: 'Quicksand', sans-serif; }
@keyframes floaty {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-up { animation: fadeUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) both; }
.floaty { animation: floaty 4s ease-in-out infinite; }`,
    'src/App.jsx': `import React, { useState } from 'react';
import { Flower2, Heart, ShoppingBag, Sparkles, ArrowRight } from 'lucide-react';

const bouquets = [
  { name: 'Cherry Kiss', note: 'Peonies + blush roses', price: '$48', emoji: '🌸' },
  { name: 'Sunny Puff', note: 'Daisies + ranunculus', price: '$36', emoji: '🌼' },
  { name: 'Mint Crush', note: 'Eucalyptus + tulips', price: '$42', emoji: '🌷' },
];

export default function App() {
  const [liked, setLiked] = useState(false);

  return (
    <div className="min-h-screen bg-[#fff8fb] text-[#3d2c3a]">
      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 py-5 md:px-10">
        <div className="brand-font flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ff8fb8] text-white shadow-md shadow-pink-200">
            <Flower2 className="h-4 w-4" />
          </span>
          Petal Pop
        </div>
        <button
          type="button"
          onClick={() => setLiked((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-bold shadow-sm backdrop-blur transition-transform duration-150 active:scale-[0.98]"
        >
          <Heart className={'h-4 w-4 ' + (liked ? 'fill-[#ff8fb8] text-[#ff8fb8]' : 'text-[#ff8fb8]')} />
          {liked ? 'Saved' : 'Save shop'}
        </button>
      </header>

      <section className="relative min-h-[100svh] overflow-hidden bg-gradient-to-br from-[#ffd6e7] via-[#fff8fb] to-[#b8f0d8]">
        <div className="pointer-events-none absolute -right-16 top-24 h-64 w-64 rounded-full bg-[#ff8fb8]/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-10 h-56 w-56 rounded-full bg-[#b8f0d8]/50 blur-3xl" />
        <div className="relative mx-auto flex min-h-[100svh] max-w-5xl flex-col justify-center px-6 pb-16 pt-28 md:px-10">
          <p className="fade-up mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[#ff8fb8]">Cute neighborhood florist</p>
          <h1 className="brand-font fade-up max-w-2xl text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl" style={{ animationDelay: '60ms' }}>
            Little blooms,<br />big smiles.
          </h1>
          <p className="fade-up mt-5 max-w-md text-lg text-[#3d2c3a]/75" style={{ animationDelay: '120ms' }}>
            Hand-tied bouquets, soft pastels, and same-day surprise drops for people you adore.
          </p>
          <div className="fade-up mt-8 flex flex-wrap gap-3" style={{ animationDelay: '180ms' }}>
            <a href="#menu" className="inline-flex items-center gap-2 rounded-full bg-[#ff8fb8] px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-pink-200 transition-transform duration-150 hover:brightness-105 active:scale-[0.98]">
              Shop bouquets <ArrowRight className="h-4 w-4" />
            </a>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-5 py-3 text-sm font-bold backdrop-blur">
              <Sparkles className="h-4 w-4 text-[#ff8fb8]" /> Free ribbon bows
            </span>
          </div>
          <div className="floaty absolute bottom-10 right-8 hidden text-6xl md:block" aria-hidden>💐</div>
        </div>
      </section>

      <section id="menu" className="mx-auto max-w-5xl px-6 py-16 md:px-10">
        <h2 className="brand-font text-3xl font-extrabold tracking-tight">Today&apos;s sweet picks</h2>
        <p className="mt-2 text-[#3d2c3a]/65">Three tiny collections, refreshed every morning.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {bouquets.map((b) => (
            <article key={b.name} className="rounded-[1.25rem] border border-[#ffd6e7] bg-white p-5 shadow-sm transition-transform duration-150 hover:-translate-y-1">
              <div className="mb-3 text-3xl">{b.emoji}</div>
              <h3 className="brand-font text-lg font-bold">{b.name}</h3>
              <p className="mt-1 text-sm text-[#3d2c3a]/60">{b.note}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-extrabold text-[#ff8fb8]">{b.price}</span>
                <button type="button" className="inline-flex items-center gap-1 rounded-full bg-[#fff0f6] px-3 py-1.5 text-xs font-bold text-[#ff8fb8] transition-transform duration-150 active:scale-[0.98]">
                  <ShoppingBag className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#ffd6e7] px-6 py-8 text-center text-sm text-[#3d2c3a]/55 md:px-10">
        Petal Pop · WebForge demo · Made with petals &amp; patience
      </footer>
    </div>
  );
}`
  }
};

/** 2 — Stylish botanical atelier */
const DEMO_ATELIER = {
  id: 'demo-atelier-botanica',
  name: 'Atelier Botanica',
  icon: 'leaf',
  accent: '#1f6f5b',
  tagline: 'Stylish botanical studio',
  vfs: {
    'src/main.jsx': DEMO_MAIN,
    'src/index.css': `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap');

:root {
  --forest: #14352c;
  --moss: #1f6f5b;
  --sage: #d7e6dc;
  --paper: #f3f6f2;
  --gold: #c4a574;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Manrope', system-ui, sans-serif;
  color: var(--forest);
  background: var(--paper);
}
.display {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-weight: 600;
  letter-spacing: -0.02em;
}
@keyframes rise {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.rise { animation: rise 0.55s cubic-bezier(0.4, 0, 0.2, 1) both; }`,
    'src/App.jsx': `import React from 'react';
import { Leaf, ArrowUpRight, Calendar, MapPin } from 'lucide-react';

const services = [
  { title: 'Seasonal install', copy: 'Living compositions for lobbies, tables, and quiet corners.' },
  { title: 'Private atelier', copy: 'One-on-one styling sessions with foraged greens and rare stems.' },
  { title: 'Editorial sets', copy: 'Botanical direction for campaigns, dinners, and film stills.' },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[#f3f6f2] text-[#14352c]">
      <nav className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="display flex items-center gap-3 text-2xl tracking-tight">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-[#1f6f5b]/35 bg-[#14352c] text-[#d7e6dc]">
            <Leaf className="h-4 w-4" />
          </span>
          Atelier Botanica
        </div>
        <a href="#book" className="hidden items-center gap-2 text-sm font-semibold tracking-wide text-[#1f6f5b] md:inline-flex">
          Book a consult <ArrowUpRight className="h-4 w-4" />
        </a>
      </nav>

      <section className="relative min-h-[100svh] overflow-hidden bg-[#14352c] text-[#f3f6f2]">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(31,111,91,0.55), transparent 42%), radial-gradient(circle at 80% 60%, rgba(196,165,116,0.25), transparent 40%), linear-gradient(160deg, #0f2922 0%, #14352c 48%, #1a4639 100%)',
          }}
        />
        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-16 pt-32 md:px-12 md:pb-24">
          <p className="rise mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#c4a574]">Botanical studio</p>
          <h1 className="display rise max-w-3xl text-5xl leading-[0.95] md:text-7xl lg:text-8xl" style={{ animationDelay: '80ms' }}>
            Quiet luxury,<br />grown green.
          </h1>
          <p className="rise mt-6 max-w-lg text-base leading-relaxed text-[#d7e6dc]/85 md:text-lg" style={{ animationDelay: '140ms' }}>
            A studio for considered plant design — sculptural foliage, soft light, and rooms that feel freshly alive.
          </p>
          <div className="rise mt-10 flex flex-wrap gap-4" style={{ animationDelay: '200ms' }}>
            <a href="#work" className="rounded-full bg-[#d7e6dc] px-6 py-3 text-sm font-bold text-[#14352c] transition-opacity duration-150 hover:opacity-90">
              View work
            </a>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm text-[#d7e6dc]/80">
              <MapPin className="h-4 w-4 text-[#c4a574]" /> Studio visits by appointment
            </span>
          </div>
        </div>
      </section>

      <section id="work" className="mx-auto max-w-6xl px-6 py-20 md:px-12">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <h2 className="display text-4xl md:text-5xl">Services</h2>
            <p className="mt-2 max-w-md text-[#14352c]/65">Styled for spaces that prefer whisper over shout.</p>
          </div>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-[#14352c]/10 bg-[#14352c]/10 md:grid-cols-3">
          {services.map((s) => (
            <article key={s.title} className="bg-[#f3f6f2] p-8 transition-colors duration-200 hover:bg-[#e8f0ea]">
              <h3 className="display text-2xl">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#14352c]/65">{s.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="book" className="border-t border-[#14352c]/10 bg-[#14352c] px-6 py-16 text-[#f3f6f2] md:px-12">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <h2 className="display text-4xl">Begin a project</h2>
            <p className="mt-2 text-[#d7e6dc]/75">Tell us about the room. We&apos;ll bring the forest indoors.</p>
          </div>
          <button type="button" className="inline-flex items-center gap-2 rounded-full bg-[#c4a574] px-6 py-3 text-sm font-bold text-[#14352c] transition-transform duration-150 active:scale-[0.98]">
            <Calendar className="h-4 w-4" /> Reserve a slot
          </button>
        </div>
      </section>
    </div>
  );
}`
  }
};

/** 3 — Flora nursery / garden market */
const DEMO_WILD_FERN = {
  id: 'demo-wild-fern',
  name: 'Wild Fern Co.',
  icon: 'sprout',
  accent: '#3f7d4e',
  tagline: 'Flora nursery & garden market',
  vfs: {
    'src/main.jsx': DEMO_MAIN,
    'src/index.css': `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=DM+Sans:wght@400;500;700&display=swap');

:root {
  --soil: #1c2418;
  --leaf: #3f7d4e;
  --lime: #c6e27a;
  --fog: #eef3e6;
  --clay: #8b5e3c;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'DM Sans', system-ui, sans-serif;
  color: var(--soil);
  background: var(--fog);
}
.serif {
  font-family: 'Fraunces', Georgia, serif;
}
@keyframes softIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.soft-in { animation: softIn 0.45s cubic-bezier(0.4, 0, 0.2, 1) both; }
.leaf-pattern {
  background-image:
    radial-gradient(circle at 10% 20%, rgba(63,125,78,0.12), transparent 28%),
    radial-gradient(circle at 90% 10%, rgba(198,226,122,0.35), transparent 26%),
    linear-gradient(180deg, #eef3e6 0%, #e2ebd4 100%);
}`,
    'src/App.jsx': `import React, { useState } from 'react';
import { Sprout, Droplets, Sun, Wind, ArrowRight } from 'lucide-react';

const plants = [
  { name: 'Maidenhair', light: 'Bright indirect', water: 'Keep moist', tag: 'Airy' },
  { name: 'Fiddle Leaf', light: 'East window', water: 'Weekly sip', tag: 'Statement' },
  { name: 'String of Pearls', light: 'Soft sun', water: 'Dry between', tag: 'Trailing' },
  { name: 'Calathea', light: 'Shade-tolerant', water: 'Mist often', tag: 'Patterned' },
];

export default function App() {
  const [active, setActive] = useState(0);

  return (
    <div className="min-h-screen bg-[#eef3e6] text-[#1c2418]">
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5 md:px-10">
        <div className="serif flex items-center gap-2 text-2xl font-bold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#3f7d4e] text-[#c6e27a]">
            <Sprout className="h-4 w-4" />
          </span>
          Wild Fern Co.
        </div>
        <a href="#plants" className="rounded-full border border-[#1c2418]/15 bg-white/60 px-4 py-2 text-sm font-semibold backdrop-blur transition-opacity duration-150 hover:opacity-80">
          Browse flora
        </a>
      </header>

      <section className="leaf-pattern relative min-h-[100svh] overflow-hidden">
        <div className="relative mx-auto flex min-h-[100svh] max-w-5xl flex-col justify-center px-6 pb-20 pt-28 md:px-10">
          <p className="soft-in mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-[#3f7d4e]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#3f7d4e]">
            <Wind className="h-3.5 w-3.5" /> Open-air nursery
          </p>
          <h1 className="serif soft-in max-w-3xl text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl" style={{ animationDelay: '70ms' }}>
            Bring the garden<br />home with you.
          </h1>
          <p className="soft-in mt-5 max-w-lg text-lg text-[#1c2418]/70" style={{ animationDelay: '130ms' }}>
            Healthy houseplants, honest care notes, and a weekend market that smells like rain and soil.
          </p>
          <div className="soft-in mt-8 flex flex-wrap gap-3" style={{ animationDelay: '190ms' }}>
            <a href="#plants" className="inline-flex items-center gap-2 rounded-full bg-[#3f7d4e] px-6 py-3 text-sm font-bold text-white transition-transform duration-150 active:scale-[0.98]">
              Meet the plants <ArrowRight className="h-4 w-4" />
            </a>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-5 py-3 text-sm font-semibold text-[#1c2418]/75 backdrop-blur">
              <Sun className="h-4 w-4 text-[#8b5e3c]" /> Sat–Sun market stalls
            </span>
          </div>
        </div>
      </section>

      <section id="plants" className="mx-auto max-w-5xl px-6 py-16 md:px-10">
        <h2 className="serif text-4xl font-bold tracking-tight">This week&apos;s flora</h2>
        <p className="mt-2 text-[#1c2418]/65">Tap a plant for a quick care glance.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {plants.map((p, i) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setActive(i)}
              className={
                'rounded-2xl border p-5 text-left transition-all duration-150 active:scale-[0.99] ' +
                (active === i
                  ? 'border-[#3f7d4e] bg-[#3f7d4e] text-white shadow-lg shadow-green-900/10'
                  : 'border-[#1c2418]/10 bg-white hover:border-[#3f7d4e]/40')
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={'text-xs font-bold uppercase tracking-wider ' + (active === i ? 'text-[#c6e27a]' : 'text-[#3f7d4e]')}>{p.tag}</p>
                  <h3 className="serif mt-1 text-2xl font-bold">{p.name}</h3>
                </div>
                <Droplets className={'h-5 w-5 shrink-0 ' + (active === i ? 'text-[#c6e27a]' : 'text-[#3f7d4e]')} />
              </div>
              <div className={'mt-4 flex gap-4 text-sm ' + (active === i ? 'text-white/85' : 'text-[#1c2418]/65')}>
                <span>{p.light}</span>
                <span>·</span>
                <span>{p.water}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#1c2418]/10 px-6 py-8 text-center text-sm text-[#1c2418]/55 md:px-10">
        Wild Fern Co. · WebForge flora demo · Water when the top inch is dry
      </footer>
    </div>
  );
}`
  }
};

const DEMO_PROJECTS = [DEMO_PETAL_POP, DEMO_ATELIER, DEMO_WILD_FERN];

function seedDemoProjects() {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(DEMO_SEED_KEY) === DEMO_SEED_VERSION) return;

  let list = [];
  try {
    list = JSON.parse(localStorage.getItem('wf_projects')) || [];
  } catch {
    list = [];
  }

  const now = Date.now();
  DEMO_PROJECTS.forEach((demo, i) => {
    const existing = list.find((p) => p.id === demo.id);
    if (!existing) {
      list.push({
        id: demo.id,
        name: demo.name,
        createdAt: now - (DEMO_PROJECTS.length - i) * 60000,
        updatedAt: now - (DEMO_PROJECTS.length - i) * 60000,
        demo: true,
        icon: demo.icon,
        accent: demo.accent,
        tagline: demo.tagline,
      });
    }
    localStorage.setItem('wf_vfs_' + demo.id, JSON.stringify(demo.vfs));
  });

  localStorage.setItem('wf_projects', JSON.stringify(list));
  localStorage.setItem(DEMO_SEED_KEY, DEMO_SEED_VERSION);
}

window.DEMO_PROJECTS = DEMO_PROJECTS;
window.seedDemoProjects = seedDemoProjects;
