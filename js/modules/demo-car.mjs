/**
 * WebForge Studio — Flagship Starter 3: VALKYR AUTOMOBILI — APEX GT-R (Hypercar Atelier)
 */

const MAIN_JSX = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(<App />);`;

const INDEX_CSS = `@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap');

:root {
  --carbon: #060709;
  --gunmetal: #101216;
  --titanium: #1A1D24;
  --copper: #E05A2B;
  --platinum: #F4F5F7;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; background: var(--carbon); color: var(--platinum); }
body {
  margin: 0;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  background: var(--carbon);
  color: var(--platinum);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
.display-auto { font-family: 'Syne', sans-serif; }
.mono-telemetry { font-family: 'JetBrains Mono', ui-monospace, monospace; }

.carbon-grid {
  background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 26px 26px;
}`;

const DATA_JS = `export const assetUrl = (path) =>
  (typeof window !== 'undefined' && window.__WF_ORIGIN__ ? window.__WF_ORIGIN__ : '') + path;

export const DRIVE_MODES = {
  gt: {
    id: 'gt',
    label: 'Grand Tour',
    subtitle: 'Whisper-quiet tri-motor torque vectoring & compliant magnetic damping.',
    power: 920,
    torque: 1180,
    downforce: 340,
    rideHeight: 112,
    aeroAngle: 4,
    zeroToHundred: '2.40s',
  },
  corsa: {
    id: 'corsa',
    label: 'Corsa',
    subtitle: 'Flat-plane V8 hybrid synthesis with rear-axle active steering engaged.',
    power: 1240,
    torque: 1460,
    downforce: 680,
    rideHeight: 88,
    aeroAngle: 16,
    zeroToHundred: '2.12s',
  },
  vmax: {
    id: 'vmax',
    label: 'Track V-Max',
    subtitle: 'Full 1,420 HP overboost, DRS carbon wing sweep & carbon-ceramic thermal lock.',
    power: 1420,
    torque: 1650,
    downforce: 960,
    rideHeight: 68,
    aeroAngle: 28,
    zeroToHundred: '1.98s',
  },
};

export const PAINT_FINISHES = [
  {
    id: 'titanium',
    name: 'Nordic Liquid Titanium',
    price: 0,
    swatch: '#9FA6B2',
    filter: 'brightness(1) contrast(1.04) saturate(1)',
    tag: 'Signature Satin',
  },
  {
    id: 'obsidian',
    name: 'Exposed Obsidian Carbon',
    price: 28000,
    swatch: '#1B1E24',
    filter: 'brightness(0.68) contrast(1.22) saturate(0.8)',
    tag: 'Clear-Coat Weave',
  },
  {
    id: 'copper',
    name: 'Monza Burnished Copper',
    price: 19500,
    swatch: '#A64628',
    filter: 'sepia(0.45) hue-rotate(-18deg) saturate(1.45) brightness(0.92)',
    tag: 'Atelier Metallic',
  },
  {
    id: 'glacier',
    name: 'Arctic Silver Pearl',
    price: 12000,
    swatch: '#DDE3EC',
    filter: 'brightness(1.16) contrast(1.02) saturate(0.72)',
    tag: 'Triple-Layer Pearl',
  },
];

export const WHEELS = [
  { id: 'aero', name: '21" Forged Titanium Spoke', price: 0, weight: '-4.2 kg unsprung' },
  { id: 'carbon', name: '21" Hollow Monocoque Carbon', price: 24000, weight: '-11.8 kg unsprung' },
  { id: 'centerlock', name: '22" Center-Lock Track Forged', price: 16500, weight: 'Magnesium hub' },
];

export const INTERIORS = [
  { id: 'cognac', name: 'Charcoal Alcantara & Saddle Cognac', price: 0 },
  { id: 'obsidian', name: 'Full Track Nero Alcantara + Carbon', price: 9500 },
  { id: 'chalk', name: 'Nordic Chalk Aniline & Brushed Titanium', price: 14000 },
];

export const ENGINEERING_TABS = [
  {
    id: 'aero',
    title: 'Active Carbon Aero',
    metric: '960 kg @ 250 km/h',
    image: '/assets/demos/valkyr-aero.jpg',
    copy: 'Hydraulically actuated twin-plane carbon rear wing and underbody Venturi tunnels adjust 120 times per second to balance cornering grip with 388 km/h straight-line efficiency.',
    bullets: [
      'CNC-machined Inconel & blue-tempered titanium central exhaust',
      '0.24 Cd low-drag DRS profile on long straights',
      'Air-brake pitch stabilization under 2.4G deceleration',
    ],
  },
  {
    id: 'cockpit',
    title: 'Driver-Centric Cockpit',
    metric: '1,290 kg Dry Weight',
    image: '/assets/demos/valkyr-cockpit.jpg',
    copy: 'Zero distraction screens. Sculpted carbon-tub bucket seats trimmed in vegetable-tanned Italian cognac hide and charcoal Alcantara frame a single floating glass telemetry blade.',
    bullets: [
      'Bespoke molded carbon seat shells fitted via 3D body scan',
      'Solid billet titanium shift paddles & tactile rotary drive dial',
      'Integrated track lap telemetry & G-force HUD',
    ],
  },
  {
    id: 'chassis',
    title: 'Carbon Monocoque GT',
    metric: '68,000 Nm/deg',
    image: '/assets/demos/valkyr-profile.jpg',
    copy: 'An autoclave-cured pre-preg carbon safety cell houses a 4.0L twin-turbo flat-plane V8 paired with three axial-flux electric motors for instantaneous 1,420 HP torque vectoring.',
    bullets: [
      'Tri-motor front axle torque vectoring with regen braking',
      '800V solid-state buffer battery delivering repeatable track laps',
      '420mm carbon-ceramic rotors with 6-piston forged copper calipers',
    ],
  },
];

export const BASE_PRICE = 485000;`;

const APP_JSX = `import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight, ArrowUpRight, Award, Calendar, Check, CheckCircle2,
  Compass, Flame, Gauge, Shield, Sliders, Wind, X, Zap,
} from 'lucide-react';
import {
  assetUrl, DRIVE_MODES, PAINT_FINISHES, WHEELS, INTERIORS,
  ENGINEERING_TABS, BASE_PRICE,
} from './data';

export default function App() {
  const rootRef = useRef(null);
  const telemetryRef = useRef(null);

  const [driveMode, setDriveMode] = useState('vmax');
  const [paint, setPaint] = useState(PAINT_FINISHES[0]);
  const [wheel, setWheel] = useState(WHEELS[0]);
  const [interior, setInterior] = useState(INTERIORS[0]);
  const [engTab, setEngTab] = useState('aero');

  const [allocModal, setAllocModal] = useState(false);
  const [allocName, setAllocName] = useState('');
  const [allocEmail, setAllocEmail] = useState('');
  const [allocCircuit, setAllocCircuit] = useState('Monaco Atelier');
  const [allocDone, setAllocDone] = useState(false);

  const mode = DRIVE_MODES[driveMode];
  const activeEng = ENGINEERING_TABS.find((t) => t.id === engTab) || ENGINEERING_TABS[0];
  const totalPrice = BASE_PRICE + paint.price + wheel.price + interior.price;

  useEffect(() => {
    if (!gsap || typeof gsap.context !== 'function') return;
    if (ScrollTrigger && typeof gsap.registerPlugin === 'function') {
      gsap.registerPlugin(ScrollTrigger);
    }

    const ctx = gsap.context(() => {
      gsap.from('.vk-hero-el', {
        y: 26,
        opacity: 0,
        duration: 0.85,
        stagger: 0.1,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });

      gsap.utils.toArray('.vk-reveal').forEach((el) => {
        gsap.from(el, {
          y: 28,
          opacity: 0,
          duration: 0.78,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!telemetryRef.current || !gsap?.fromTo) return;
    gsap.fromTo(
      telemetryRef.current.querySelectorAll('.tele-val'),
      { y: 8, opacity: 0.35 },
      { y: 0, opacity: 1, duration: 0.38, stagger: 0.04, ease: 'power2.out', clearProps: 'transform,opacity' }
    );
  }, [driveMode]);

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAllocSubmit = (e) => {
    e.preventDefault();
    if (!allocName.trim() || !allocEmail.trim()) return;
    setAllocDone(true);
  };

  return (
    <div ref={rootRef} className="min-h-screen bg-[#060709] text-[#F4F5F7] selection:bg-[#E05A2B]/35 selection:text-white">
      {/* Precision Top Bar */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#060709]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10">
          <a href="#top" onClick={scrollTo('top')} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rotate-45 bg-[#E05A2B]" />
            <span className="display-auto text-base font-extrabold tracking-[0.26em] text-white">VALKYR</span>
          </a>

          <nav className="hidden items-center gap-8 text-xs font-medium uppercase tracking-[0.18em] text-zinc-400 md:flex">
            <a href="#telemetry" onClick={scrollTo('telemetry')} className="transition-colors hover:text-white">Telemetry</a>
            <a href="#configurator" onClick={scrollTo('configurator')} className="transition-colors hover:text-white">Atelier</a>
            <a href="#engineering" onClick={scrollTo('engineering')} className="transition-colors hover:text-white">Engineering</a>
          </nav>

          <button
            type="button"
            onClick={() => { setAllocDone(false); setAllocModal(true); }}
            className="inline-flex items-center gap-2 rounded-sm bg-[#E05A2B] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Reserve Build Slot
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Full-Bleed Hypercar Hero */}
      <section id="top" className="relative min-h-[92svh] overflow-hidden bg-[#060709]">
        <img
          src={assetUrl('/assets/demos/valkyr-hero.jpg')}
          alt="Valkyr Apex GT-R Matte Carbon Hypercar at dusk"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060709] via-[#060709]/35 to-[#060709]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060709]/85 via-transparent to-transparent" />

        <div className="relative mx-auto flex min-h-[92svh] max-w-7xl flex-col justify-end px-6 pb-16 pt-28 md:px-10 md:pb-20">
          <div className="vk-hero-el mono-telemetry flex items-center gap-3 text-xs uppercase tracking-[0.26em] text-[#E05A2B]">
            <span>CHASSIS 001 / 099</span>
            <span className="h-px w-10 bg-[#E05A2B]/60" />
            <span>MODENA · GOTHENBURG</span>
          </div>

          <h1 className="vk-hero-el display-auto mt-4 max-w-4xl text-5xl font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-white sm:text-7xl lg:text-8xl">
            APEX GT-R.<br />
            <span className="text-zinc-400">SCULPTED VELOCITY.</span>
          </h1>

          <p className="vk-hero-el mt-6 max-w-xl text-base leading-relaxed text-zinc-300">
            1,420 HP tri-motor hybrid V8 wrapped in a 1,290 kg autoclave carbon monocoque. Engineered for Alpine grand touring and sub-two-second circuit launches.
          </p>

          <div className="vk-hero-el mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#configurator"
              onClick={scrollTo('configurator')}
              className="inline-flex items-center gap-2.5 bg-white px-6 py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-[#060709] transition-colors hover:bg-zinc-200"
            >
              Configure Your Chassis
              <ArrowRight className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() => { setAllocDone(false); setAllocModal(true); }}
              className="inline-flex items-center gap-2 border border-white/25 bg-white/[0.04] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur transition-colors hover:border-white/50 hover:bg-white/10"
            >
              Request Private Track Drive
            </button>
          </div>

          {/* Hero Spec Telemetry Bar */}
          <div className="vk-hero-el mt-14 grid grid-cols-2 gap-6 border-t border-white/15 pt-7 sm:grid-cols-4">
            <div>
              <div className="mono-telemetry text-3xl font-bold text-white">1.98<span className="text-base text-[#E05A2B]">s</span></div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400">0 – 100 km/h</div>
            </div>
            <div>
              <div className="mono-telemetry text-3xl font-bold text-white">1,420<span className="text-base text-[#E05A2B]"> HP</span></div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400">Hybrid V8 + Tri-Motor</div>
            </div>
            <div>
              <div className="mono-telemetry text-3xl font-bold text-white">388<span className="text-base text-[#E05A2B]"> km/h</span></div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400">V-Max Velocity</div>
            </div>
            <div>
              <div className="mono-telemetry text-3xl font-bold text-white">99<span className="text-base text-[#E05A2B]"> units</span></div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400">Numbered Global Series</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Drive Mode Telemetry Lab */}
      <section id="telemetry" className="border-t border-white/[0.08] bg-[#0B0D11] py-24 carbon-grid">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="mono-telemetry text-xs uppercase tracking-[0.24em] text-[#E05A2B]">Active Dynamics</p>
              <h2 className="display-auto mt-2 text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
                Three Personalities. One Chassis.
              </h2>
            </div>

            <div className="inline-flex border border-white/15 bg-[#060709] p-1">
              {Object.values(DRIVE_MODES).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setDriveMode(m.id)}
                  className={
                    'px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] transition-all ' +
                    (driveMode === m.id
                      ? 'bg-[#E05A2B] text-white'
                      : 'text-zinc-400 hover:text-white')
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div ref={telemetryRef} className="vk-reveal mt-10 border border-white/10 bg-[#080A0D] p-7 md:p-9">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
              <div>
                <span className="mono-telemetry text-xs uppercase tracking-[0.2em] text-[#E05A2B]">Active Calibration · {mode.label}</span>
                <p className="mt-1.5 text-sm text-zinc-300">{mode.subtitle}</p>
              </div>
              <div className="mono-telemetry border border-white/15 px-3.5 py-2 text-xs text-zinc-300">
                0–100 KM/H: <strong className="text-white">{mode.zeroToHundred}</strong>
              </div>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Peak Output', val: mode.power.toLocaleString() + ' HP', pct: (mode.power / 1420) * 100 },
                { label: 'Peak Torque', val: mode.torque.toLocaleString() + ' Nm', pct: (mode.torque / 1650) * 100 },
                { label: 'Aero Downforce', val: mode.downforce + ' kg', pct: (mode.downforce / 960) * 100 },
                { label: 'Rear Wing Pitch', val: mode.aeroAngle + '° · ' + mode.rideHeight + 'mm', pct: (mode.aeroAngle / 28) * 100 },
              ].map((stat) => (
                <div key={stat.label} className="border border-white/[0.07] bg-[#0D1015] p-5">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{stat.label}</div>
                  <div className="tele-val mono-telemetry mt-2 text-2xl font-bold text-white">{stat.val}</div>
                  <div className="mt-4 h-1.5 w-full overflow-hidden bg-white/10">
                    <div
                      className="h-full bg-[#E05A2B] transition-all duration-500"
                      style={{ width: Math.round(stat.pct) + '%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Bespoke Atelier Configurator */}
      <section id="configurator" className="border-t border-white/[0.08] bg-[#060709] py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mono-telemetry text-xs uppercase tracking-[0.24em] text-[#E05A2B]">Bespoke Atelier</p>
              <h2 className="display-auto mt-2 text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
                Commission Your Apex GT-R
              </h2>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Configured Estimate</div>
              <div className="mono-telemetry text-3xl font-extrabold text-white">€{totalPrice.toLocaleString()}</div>
            </div>
          </div>

          <div className="vk-reveal mt-10 grid items-start gap-6 md:grid-cols-12">
            {/* Live Studio Stage */}
            <div className="md:col-span-6">
              <div className="relative overflow-hidden border border-white/10 bg-[#0A0C10]">
                <img
                  src={assetUrl('/assets/demos/valkyr-profile.jpg')}
                  alt={'Valkyr Apex GT-R in ' + paint.name}
                  className="aspect-[16/10] w-full object-cover transition-all duration-500"
                  style={{ filter: paint.filter }}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#0A0C10] px-5 py-4 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-3.5 rounded-full border border-white/30" style={{ background: paint.swatch }} />
                    <span className="font-semibold text-white">{paint.name}</span>
                    <span className="text-zinc-500">· {paint.tag}</span>
                  </div>
                  <span className="mono-telemetry text-zinc-400">{wheel.name}</span>
                </div>
              </div>
            </div>

            {/* Interactive Options Panel */}
            <div className="flex flex-col gap-5 border border-white/10 bg-[#0B0D11] p-5 md:col-span-6">
              {/* Paint Swatches */}
              <div>
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-zinc-400">
                  <span>01 · Exterior Finish</span>
                  <span className="mono-telemetry text-white">{paint.price ? '+€' + paint.price.toLocaleString() : 'Included'}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  {PAINT_FINISHES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPaint(p)}
                      className={
                        'flex items-center gap-2.5 border px-3 py-2.5 text-left text-xs transition-all ' +
                        (paint.id === p.id
                          ? 'border-[#E05A2B] bg-white/[0.06] text-white'
                          : 'border-white/10 text-zinc-400 hover:border-white/25 hover:text-white')
                      }
                    >
                      <span className="h-4 w-4 shrink-0 rounded-full border border-white/30" style={{ background: p.swatch }} />
                      <span className="truncate font-medium">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Wheels */}
              <div>
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-zinc-400">
                  <span>02 · Forged Wheels</span>
                  <span className="mono-telemetry text-white">{wheel.price ? '+€' + wheel.price.toLocaleString() : 'Included'}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {WHEELS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setWheel(w)}
                      className={
                        'flex w-full items-center justify-between border px-3.5 py-2.5 text-left text-xs transition-all ' +
                        (wheel.id === w.id
                          ? 'border-[#E05A2B] bg-white/[0.06] text-white'
                          : 'border-white/10 text-zinc-400 hover:border-white/25 hover:text-white')
                      }
                    >
                      <div>
                        <div className="font-semibold">{w.name}</div>
                        <div className="text-[11px] text-zinc-500">{w.weight}</div>
                      </div>
                      <span className="mono-telemetry text-[11px]">{w.price ? '+€' + w.price.toLocaleString() : 'Std'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interior */}
              <div>
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-zinc-400">
                  <span>03 · Cabin Trim</span>
                  <span className="mono-telemetry text-white">{interior.price ? '+€' + interior.price.toLocaleString() : 'Included'}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {INTERIORS.map((tr) => (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => setInterior(tr)}
                      className={
                        'flex w-full items-center justify-between border px-3.5 py-2.5 text-left text-xs transition-all ' +
                        (interior.id === tr.id
                          ? 'border-[#E05A2B] bg-white/[0.06] text-white'
                          : 'border-white/10 text-zinc-400 hover:border-white/25 hover:text-white')
                      }
                    >
                      <span className="font-medium">{tr.name}</span>
                      <span className="mono-telemetry text-[11px]">{tr.price ? '+€' + tr.price.toLocaleString() : 'Std'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setAllocDone(false); setAllocModal(true); }}
                className="mt-auto inline-flex w-full items-center justify-center gap-2 bg-[#E05A2B] py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-white transition-all hover:brightness-110"
              >
                Lock Specification · €{totalPrice.toLocaleString()}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Engineering Deep-Dive Tabs */}
      <section id="engineering" className="border-t border-white/[0.08] bg-[#0B0D11] py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="mono-telemetry text-xs uppercase tracking-[0.24em] text-[#E05A2B]">Mechanical Sculpture</p>
              <h2 className="display-auto mt-2 text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
                Obsessive Craft Down to Every Bolt.
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {ENGINEERING_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setEngTab(t.id)}
                  className={
                    'px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] transition-all ' +
                    (engTab === t.id
                      ? 'bg-white text-[#060709]'
                      : 'border border-white/15 text-zinc-400 hover:border-white/35 hover:text-white')
                  }
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>

          <div className="vk-reveal mt-10 grid items-center gap-8 border border-white/10 bg-[#07090C] p-6 lg:grid-cols-12 lg:p-8">
            <div className="overflow-hidden lg:col-span-7">
              <img
                src={assetUrl(activeEng.image)}
                alt={activeEng.title}
                className="aspect-[16/10] w-full object-cover"
              />
            </div>

            <div className="lg:col-span-5">
              <div className="mono-telemetry inline-block border border-[#E05A2B]/40 bg-[#E05A2B]/10 px-3 py-1 text-xs font-semibold text-[#E05A2B]">
                {activeEng.metric}
              </div>
              <h3 className="display-auto mt-4 text-3xl font-bold uppercase text-white">{activeEng.title}</h3>
              <p className="mt-4 text-sm leading-7 text-zinc-400">{activeEng.copy}</p>

              <ul className="mt-6 space-y-3 border-t border-white/10 pt-6 text-sm text-zinc-200">
                {activeEng.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#E05A2B]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#060709] py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-xs uppercase tracking-[0.18em] text-zinc-500 sm:flex-row md:px-10">
          <div className="flex items-center gap-2.5 text-white">
            <span className="h-2 w-2 rotate-45 bg-[#E05A2B]" />
            <span className="display-auto font-bold tracking-[0.24em]">VALKYR AUTOMOBILI</span>
          </div>
          <span className="mono-telemetry">HAND-BUILT IN MODENA &amp; GOTHENBURG · LIMITED TO 99 UNITS</span>
        </div>
      </footer>

      {/* Build Allocation Reservation Modal */}
      {allocModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md border border-white/15 bg-[#0C0E13] p-7 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="mono-telemetry text-[11px] uppercase tracking-[0.2em] text-[#E05A2B]">Private Build Allocation</span>
              <button type="button" onClick={() => setAllocModal(false)} aria-label="Close" className="p-1 text-zinc-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <h3 className="display-auto mt-2 text-2xl font-bold uppercase text-white">Reserve Apex GT-R</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Spec: {paint.name} · {wheel.name} · €{totalPrice.toLocaleString()}
            </p>

            {allocDone ? (
              <div className="mt-6 border border-[#E05A2B]/35 bg-[#E05A2B]/10 p-5 text-center">
                <CheckCircle2 className="mx-auto h-7 w-7 text-[#E05A2B]" />
                <h4 className="mt-3 text-base font-bold text-white">Dossier #VK-047 Registered</h4>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
                  Our <strong>{allocCircuit}</strong> specialist has logged your specification for <strong>{allocName}</strong> and will arrange your private track session.
                </p>
                <button
                  type="button"
                  onClick={() => setAllocModal(false)}
                  className="mt-5 w-full bg-white py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#060709]"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleAllocSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.16em] text-zinc-400">Client Name</label>
                  <input
                    type="text"
                    required
                    value={allocName}
                    onChange={(e) => setAllocName(e.target.value)}
                    placeholder="Henrik Lindqvist"
                    className="mt-1.5 w-full border border-white/15 bg-[#060709] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#E05A2B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.16em] text-zinc-400">Private Email</label>
                  <input
                    type="email"
                    required
                    value={allocEmail}
                    onChange={(e) => setAllocEmail(e.target.value)}
                    placeholder="client@atelier.com"
                    className="mt-1.5 w-full border border-white/15 bg-[#060709] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#E05A2B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.16em] text-zinc-400">Preferred Circuit / Atelier</label>
                  <select
                    value={allocCircuit}
                    onChange={(e) => setAllocCircuit(e.target.value)}
                    className="mt-1.5 w-full border border-white/15 bg-[#060709] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#E05A2B]"
                  >
                    <option>Monaco Atelier</option>
                    <option>Modena Test Circuit</option>
                    <option>Gothenburg Proving Ground</option>
                    <option>Monterey Private Lounge</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#E05A2B] py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-white hover:brightness-110"
                >
                  Request Build Slot
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}`;

export const DEMO_VALKYR_CAR = {
  id: 'demo-valkyr-motors',
  name: 'Valkyr Automobili',
  icon: 'gauge',
  accent: '#e05a2b',
  tagline: 'Bespoke hypercar atelier & configurator',
  vfs: {
    'src/main.jsx': MAIN_JSX,
    'src/index.css': INDEX_CSS,
    'src/data.js': DATA_JS,
    'src/App.jsx': APP_JSX,
  },
};
