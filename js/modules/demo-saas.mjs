/**
 * WebForge Studio — Flagship Starter 1: Kinetix (GSAP-Animated Technical SaaS)
 */

const MAIN_JSX = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(<App />);`;

const INDEX_CSS = `@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

:root {
  --bg: #060709;
  --surface: #0D0F12;
  --surface-2: #14171C;
  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.16);
  --emerald: #10B981;
  --sky: #38BDF8;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; background: var(--bg); color: #F4F5F7; }
body {
  margin: 0;
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: #F4F5F7;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
.font-mono-code { font-family: 'JetBrains Mono', ui-monospace, monospace; }

.grid-bg {
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 64px 64px;
}

.kinetix-beam {
  background: radial-gradient(60% 50% at 50% 0%, rgba(16, 185, 129, 0.14) 0%, rgba(56, 189, 248, 0.06) 45%, rgba(6, 7, 9, 0) 100%);
}

.card-glass {
  background: linear-gradient(180deg, rgba(20, 23, 28, 0.88) 0%, rgba(11, 13, 16, 0.94) 100%);
  border: 1px solid var(--border);
  backdrop-filter: blur(14px);
}

.card-glass:hover {
  border-color: rgba(255, 255, 255, 0.16);
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.85); }
}
.live-dot { animation: pulseDot 2s ease-in-out infinite; }`;

const DATA_JS = `export const assetUrl = (path) =>
  (typeof window !== 'undefined' && window.__WF_ORIGIN__ ? window.__WF_ORIGIN__ : '') + path;

export const PIPELINES = {
  deploy: {
    id: 'deploy',
    label: 'Zero-Downtime Deploy',
    command: 'kinetix ship --env production --canary 15%',
    latency: '42 ms',
    throughput: '18.4k req/s',
    uptime: '99.998%',
    nodes: [
      { id: 'n1', name: 'Git Webhook', status: 'Verified SHA', ms: '4ms' },
      { id: 'n2', name: 'Edge Build Graph', status: 'Cached 94%', ms: '19ms' },
      { id: 'n3', name: 'Canary Guard', status: '0.00% err', ms: '11ms' },
      { id: 'n4', name: 'Global Mesh', status: '38 PoPs live', ms: '8ms' },
    ],
    logs: [
      '[09:41:02.114] edge.graph  → resolved 142 workspace modules (cache hit 94%)',
      '[09:41:02.309] canary.eval → p99 latency 38ms · error delta 0.000%',
      '[09:41:02.418] mesh.sync   → promoted build #8492 across 38 edge regions',
      '[09:41:02.441] audit.sign  → Ed25519 attestation archived to ledger',
    ],
  },
  incident: {
    id: 'incident',
    label: 'Autonomous Triage',
    command: 'kinetix guard --isolate latency-spike --rollback auto',
    latency: '19 ms',
    throughput: '412k spans/s',
    uptime: '100.00%',
    nodes: [
      { id: 'n1', name: 'Trace Ingest', status: 'Anomaly p99', ms: '2ms' },
      { id: 'n2', name: 'Root Cause Graph', status: 'DB pool lock', ms: '7ms' },
      { id: 'n3', name: 'Traffic Shift', status: 'Drained eu-2', ms: '6ms' },
      { id: 'n4', name: 'Auto PR Patch', status: 'PR #4109 open', ms: '4ms' },
    ],
    logs: [
      '[09:42:11.008] trace.watch → detected +240ms lock wait on replica eu-west-2',
      '[09:42:11.015] mesh.route  → shifted 100% read traffic to warm pool eu-central-1',
      '[09:42:11.022] synth.check → verified checkout SLA restored (31ms p99)',
      '[09:42:11.027] git.bot     → opened PR #4109 with connection-pool cap patch',
    ],
  },
  revenue: {
    id: 'revenue',
    label: 'Metered Billing Sync',
    command: 'kinetix ledger --reconcile stripe --window 60s',
    latency: '27 ms',
    throughput: '94k events/s',
    uptime: '99.999%',
    nodes: [
      { id: 'n1', name: 'Usage Stream', status: 'Idempotent', ms: '3ms' },
      { id: 'n2', name: 'Entitlement Engine', status: 'Sub-ms cache', ms: '5ms' },
      { id: 'n3', name: 'Invoice Ledger', status: 'Double-entry', ms: '12ms' },
      { id: 'n4', name: 'ERP & Stripe', status: 'Reconciled', ms: '7ms' },
    ],
    logs: [
      '[09:44:50.102] meter.in    → ingested 94,180 token & compute usage events',
      '[09:44:50.107] quota.guard → updated 12,408 tenant entitlements at edge',
      '[09:44:50.119] ledger.post → zero-drift double-entry batch committed',
      '[09:44:50.129] webhook.out → synced live MRR snapshot ($4.82M ARR)',
    ],
  },
};

export const METRICS = [
  { label: 'Global Edge Latency', value: 18, suffix: 'ms', detail: 'Median p50 across 38 regions' },
  { label: 'Faster Ship Velocity', value: 4.6, suffix: 'x', detail: 'Incremental build graph caching' },
  { label: 'Automated Recovery', value: 99.99, suffix: '%', detail: 'Zero-touch canary rollback SLA' },
  { label: 'Events Orchestrated', value: 2.4, suffix: 'B', detail: 'Daily deterministic executions' },
];

export const PRICING_TIERS = [
  {
    name: 'Starter',
    tagline: 'For lean engineering teams shipping daily.',
    monthly: 49,
    annual: 39,
    cta: 'Start free trial',
    highlight: false,
    features: [
      'Up to 15 team seats & 10M workflow events',
      'Instant canary deploys across 12 regions',
      'Live trace explorer with 14-day retention',
      'GitHub & Slack incident webhooks',
    ],
  },
  {
    name: 'Scale',
    tagline: 'Full autonomous orchestration for high-growth SaaS.',
    monthly: 189,
    annual: 149,
    cta: 'Deploy Scale workspace',
    highlight: true,
    features: [
      'Unlimited seats & 250M deterministic events',
      '38-region edge mesh with autonomous rollback',
      'Real-time metered billing & quota ledger',
      'SOC 2 Type II audit logs & SAML SSO',
    ],
  },
  {
    name: 'Enterprise',
    tagline: 'Dedicated VPC isolation & custom SLAs.',
    monthly: 640,
    annual: 510,
    cta: 'Book architecture review',
    highlight: false,
    features: [
      'Single-tenant BYOC (AWS, GCP, Azure)',
      'Custom hardware enclave signing & HIPAA BAA',
      'Dedicated forward-deployed solutions engineer',
      '99.999% contractual uptime guarantee',
    ],
  },
];

export const FAQS = [
  {
    q: 'How does Kinetix integrate with our existing AWS, GCP, or Vercel stack?',
    a: 'Drop in our lightweight SDK or connect your GitHub repository in under 90 seconds. Kinetix orchestrates builds, traffic shifting, and metered usage without forcing you to rewrite infrastructure.',
  },
  {
    q: 'What happens if a canary deployment triggers elevated error rates?',
    a: 'Kinetix continuously evaluates p99 latency, HTTP 5xx ratios, and synthetic checkout checks every 500ms. If a threshold drifts, edge routing reverts in under 150ms automatically.',
  },
  {
    q: 'Can we run Kinetix inside our own private cloud VPC?',
    a: 'Yes. Enterprise workspaces deploy the entire control plane and telemetry ledger inside your own AWS, GCP, or bare-metal Kubernetes cluster with zero data egress.',
  },
  {
    q: 'Is metered usage billing accurate to the millisecond?',
    a: 'Every event is deduplicated with cryptographic idempotency keys and recorded into a double-entry ledger, eliminating revenue leakage and manual month-end reconciliation.',
  },
];`;

const APP_JSX = `import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Activity, ArrowRight, ArrowUpRight, Check, ChevronDown, Cpu,
  GitBranch, Globe, Layers, Lock, Play, Server, Shield, Sparkles,
  Terminal, Workflow, X, Zap, CheckCircle2,
} from 'lucide-react';
import { assetUrl, PIPELINES, METRICS, PRICING_TIERS, FAQS } from './data';

export default function App() {
  const rootRef = useRef(null);
  const pipelineCardRef = useRef(null);

  const [activePipe, setActivePipe] = useState('deploy');
  const [simRunning, setSimRunning] = useState(false);
  const [simStep, setSimStep] = useState(3);
  const [annual, setAnnual] = useState(true);
  const [teamSeats, setTeamSeats] = useState(45);
  const [openFaq, setOpenFaq] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Scale');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const pipe = PIPELINES[activePipe];
  const monthlyHoursSaved = Math.round(teamSeats * 6.4);
  const annualSavings = Math.round(monthlyHoursSaved * 115 * 12);

  useEffect(() => {
    if (!gsap || typeof gsap.context !== 'function') return;
    if (ScrollTrigger && typeof gsap.registerPlugin === 'function') {
      gsap.registerPlugin(ScrollTrigger);
    }

    const ctx = gsap.context(() => {
      // Hero kinetic entrance
      gsap.from('.hero-stagger', {
        y: 26,
        opacity: 0,
        duration: 0.78,
        stagger: 0.09,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });

      // Ambient floating prism sculpture
      gsap.to('.hero-sculpture', {
        y: -10,
        duration: 3.6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Scroll-triggered reveal blocks
      gsap.utils.toArray('.reveal-card').forEach((el) => {
        gsap.from(el, {
          y: 28,
          opacity: 0,
          duration: 0.72,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            once: true,
          },
        });
      });

      // Animated KPI count-up on scroll
      gsap.utils.toArray('.kpi-num').forEach((el) => {
        const target = parseFloat(el.dataset.target || '0');
        const decimals = String(el.dataset.target || '').includes('.') ? (String(el.dataset.target).split('.')[1] || '').length : 0;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 1.4,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          onUpdate: () => {
            el.textContent = decimals > 0 ? obj.val.toFixed(decimals) : Math.round(obj.val).toLocaleString();
          },
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  // Subtle GSAP transition whenever pipeline tab changes
  useEffect(() => {
    if (!pipelineCardRef.current || !gsap?.fromTo) return;
    gsap.fromTo(
      pipelineCardRef.current.querySelectorAll('.pipe-node, .pipe-log'),
      { y: 10, opacity: 0.25 },
      { y: 0, opacity: 1, duration: 0.42, stagger: 0.05, ease: 'power2.out', clearProps: 'transform,opacity' }
    );
  }, [activePipe]);

  const runLiveSimulation = () => {
    if (simRunning) return;
    setSimRunning(true);
    setSimStep(0);
    [1, 2, 3].forEach((step, idx) => {
      setTimeout(() => {
        setSimStep(step);
        if (step === 3) setSimRunning(false);
      }, (idx + 1) * 420);
    });
  };

  const scrollToSection = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const openDemoModal = (plan = 'Scale') => {
    setSelectedPlan(plan);
    setSubmitted(false);
    setModalOpen(true);
  };

  const handleSubmitAccess = (e) => {
    e.preventDefault();
    if (!formEmail.trim()) return;
    setSubmitted(true);
  };

  return (
    <div ref={rootRef} className="min-h-screen bg-[#060709] text-[#F4F5F7] selection:bg-emerald-400/25 selection:text-emerald-200">
      {/* Top Floating Nav */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#060709]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="#top" onClick={scrollToSection('top')} className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-white">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#060709]">
              <Layers className="h-4 w-4" />
            </span>
            <span>Kinetix</span>
            <span className="font-mono-code text-[11px] font-medium text-emerald-400">v4.2</span>
          </a>

          <nav className="hidden items-center gap-7 text-[13px] font-medium text-zinc-400 md:flex">
            <a href="#engine" onClick={scrollToSection('engine')} className="transition-colors hover:text-white">Engine</a>
            <a href="#architecture" onClick={scrollToSection('architecture')} className="transition-colors hover:text-white">Architecture</a>
            <a href="#roi" onClick={scrollToSection('roi')} className="transition-colors hover:text-white">Velocity</a>
            <a href="#pricing" onClick={scrollToSection('pricing')} className="transition-colors hover:text-white">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openDemoModal('Enterprise')}
              className="hidden text-[13px] font-medium text-zinc-300 transition-colors hover:text-white sm:inline-block"
            >
              Book demo
            </button>
            <button
              type="button"
              onClick={() => openDemoModal('Scale')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[13px] font-semibold text-[#060709] transition-all hover:bg-zinc-200 active:scale-[0.98]"
            >
              Start building
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="relative overflow-hidden grid-bg">
        <div className="pointer-events-none absolute inset-0 kinetix-beam" />
        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-12 md:pt-16">
          <div className="grid items-center gap-10 md:grid-cols-12">
            <div className="md:col-span-7">
              <div className="hero-stagger mb-5 inline-flex items-center gap-2.5 rounded-md border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-1.5 text-xs font-medium text-emerald-300">
                <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" />
                <span>Edge Mesh 4.2 · 38 global PoPs now online</span>
              </div>

              <h1 className="hero-stagger text-4xl font-extrabold leading-[1.04] tracking-[-0.035em] text-white md:text-5xl xl:text-6xl">
                Ship autonomous cloud systems at zero drag.
              </h1>

              <p className="hero-stagger mt-5 max-w-xl text-base leading-relaxed text-zinc-400">
                Kinetix unifies deterministic deployments, real-time anomaly rollback, and sub-millisecond usage metering inside one programmable control plane.
              </p>

              <div className="hero-stagger mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openDemoModal('Scale')}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#060709] shadow-lg shadow-white/5 transition-all hover:bg-zinc-200 active:scale-[0.98]"
                >
                  Deploy your workspace
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#engine"
                  onClick={scrollToSection('engine')}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/25 hover:bg-white/[0.07]"
                >
                  <Play className="h-3.5 w-3.5 text-emerald-400" />
                  Run live simulator
                </a>
              </div>

              <div className="hero-stagger mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.08] pt-5 text-xs text-zinc-500">
                <span className="font-mono-code uppercase tracking-widest text-zinc-400">Trusted by infra teams at</span>
                <span className="font-semibold tracking-tight text-zinc-300">Linearity</span>
                <span className="font-semibold tracking-tight text-zinc-300">Vektor Labs</span>
                <span className="font-semibold tracking-tight text-zinc-300">Northstar AI</span>
                <span className="font-semibold tracking-tight text-zinc-300">Helios Cloud</span>
              </div>
            </div>

            <div className="md:col-span-5">
              <div className="hero-stagger hero-sculpture relative overflow-hidden rounded-2xl border border-white/10 bg-[#0A0C10] p-2 shadow-2xl shadow-emerald-500/[0.06]">
                <img
                  src={assetUrl('/assets/demos/saas-hero.jpg')}
                  alt="Kinetix 3D optical compute prism architecture"
                  className="aspect-[16/11] w-full rounded-xl object-cover"
                />
                <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl border border-white/[0.06] bg-[#060709]/90 p-3 font-mono-code text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Mesh p99</div>
                    <div className="mt-0.5 font-semibold text-emerald-400">18.4 ms</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Canary</div>
                    <div className="mt-0.5 font-semibold text-white">0.00% err</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Status</div>
                    <div className="mt-0.5 flex items-center gap-1.5 font-semibold text-sky-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                      Synced
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {METRICS.map((m) => (
              <div key={m.label} className="reveal-card card-glass rounded-xl p-5">
                <div className="font-mono-code text-3xl font-bold tracking-tight text-white">
                  <span className="kpi-num" data-target={m.value}>{m.value}</span>
                  <span className="text-emerald-400">{m.suffix}</span>
                </div>
                <div className="mt-1.5 text-sm font-semibold text-zinc-200">{m.label}</div>
                <div className="mt-0.5 text-xs text-zinc-500">{m.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Live Pipeline Simulator */}
      <section id="engine" className="border-t border-white/[0.07] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="font-mono-code text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Interactive Runtime</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Observe every packet. Automate every recovery.
              </h2>
            </div>

            <div className="inline-flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-[#0D0F12] p-1">
              {Object.values(PIPELINES).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setActivePipe(item.id); setSimStep(3); }}
                  className={
                    'rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ' +
                    (activePipe === item.id
                      ? 'bg-white text-[#060709]'
                      : 'text-zinc-400 hover:text-white')
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div ref={pipelineCardRef} className="reveal-card card-glass mt-8 overflow-hidden rounded-2xl">
            {/* Simulator Command Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] bg-[#090B0E] px-5 py-3.5">
              <div className="flex items-center gap-3 font-mono-code text-xs text-zinc-300">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span>$ {pipe.command}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden items-center gap-4 font-mono-code text-xs text-zinc-400 sm:flex">
                  <span>Latency <strong className="text-white">{pipe.latency}</strong></span>
                  <span>Rate <strong className="text-white">{pipe.throughput}</strong></span>
                  <span>SLA <strong className="text-emerald-400">{pipe.uptime}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={runLiveSimulation}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
                >
                  <Zap className="h-3.5 w-3.5" />
                  {simRunning ? 'Executing…' : 'Replay Trace'}
                </button>
              </div>
            </div>

            {/* 4-Stage Execution Graph */}
            <div className="grid gap-4 p-6 md:grid-cols-4">
              {pipe.nodes.map((node, idx) => {
                const done = idx <= simStep;
                const active = simRunning && idx === simStep;
                return (
                  <div
                    key={node.id}
                    className={
                      'pipe-node relative rounded-xl border p-4 transition-all ' +
                      (active
                        ? 'border-emerald-400 bg-emerald-500/10'
                        : done
                          ? 'border-white/15 bg-[#12151B]'
                          : 'border-white/[0.05] bg-[#0B0D10] opacity-45')
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono-code text-[11px] text-zinc-500">0{idx + 1}</span>
                      <span className="font-mono-code text-[11px] text-emerald-400">{node.ms}</span>
                    </div>
                    <div className="mt-2.5 text-sm font-bold text-white">{node.name}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
                      <CheckCircle2 className={'h-3.5 w-3.5 ' + (done ? 'text-emerald-400' : 'text-zinc-600')} />
                      <span>{node.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Streaming Execution Log */}
            <div className="border-t border-white/[0.08] bg-[#050608] px-6 py-4 font-mono-code text-xs leading-6 text-zinc-400">
              {pipe.logs.map((line, idx) => (
                <div
                  key={line}
                  className={
                    'pipe-log flex items-center gap-2 transition-opacity ' +
                    (idx <= simStep ? 'opacity-100' : 'opacity-20')
                  }
                >
                  <span className="text-emerald-400">›</span>
                  <span className="truncate">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bento Architecture Section */}
      <section id="architecture" className="border-t border-white/[0.07] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="font-mono-code text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Core Platform</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Built like an aerospace flight computer.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-6">
            <div className="reveal-card card-glass rounded-2xl p-6 md:col-span-4">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-emerald-400">
                  <Workflow className="h-5 w-5" />
                </span>
                <span className="font-mono-code text-xs text-zinc-500">DETERMINISTIC DAG</span>
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">Content-addressed build graphs</h3>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
                Every commit hashes down to the AST leaf. Unchanged packages hydrate in 19ms across CI runners and edge workers without redundant container rebuilds.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/[0.07] pt-5 font-mono-code text-xs">
                <div><div className="text-zinc-500">Cache Ratio</div><div className="mt-1 text-base font-bold text-white">94.2%</div></div>
                <div><div className="text-zinc-500">Cold Start</div><div className="mt-1 text-base font-bold text-emerald-400">0.8 ms</div></div>
                <div><div className="text-zinc-500">Isolation</div><div className="mt-1 text-base font-bold text-white">V8 MicroVM</div></div>
              </div>
            </div>

            <div className="reveal-card card-glass rounded-2xl p-6 md:col-span-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-sky-400">
                <Shield className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-xl font-bold text-white">Zero-trust enclaves</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Signed Ed25519 build attestations, ephemeral secret injection, and SOC 2 Type II compliance out of the box.
              </p>
            </div>

            <div className="reveal-card card-glass rounded-2xl p-6 md:col-span-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-emerald-400">
                <Globe className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-xl font-bold text-white">Anycast Edge Mesh</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Automatic regional failover across 38 global PoPs with sub-20ms median routing and live synthetic probes.
              </p>
            </div>

            <div className="reveal-card card-glass rounded-2xl p-6 md:col-span-4">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white">
                  <Activity className="h-5 w-5" />
                </span>
                <span className="font-mono-code text-xs text-emerald-400">ZERO-DRIFT LEDGER</span>
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">Real-time usage metering &amp; quota enforcement</h3>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
                Meter AI tokens, compute seconds, and API seats directly at the edge proxy. Sync reconciled invoices to Stripe and NetSuite automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Velocity & ROI Calculator */}
      <section id="roi" className="border-t border-white/[0.07] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="reveal-card card-glass grid items-center gap-10 rounded-2xl p-8 md:grid-cols-12 md:p-10">
            <div className="md:col-span-7">
              <p className="font-mono-code text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Velocity Estimator</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
                Calculate engineering hours reclaimed.
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Slide to match your active engineering headcount to estimate monthly CI/ops time saved with Kinetix.
              </p>

              <div className="mt-7">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Engineering team size</span>
                  <span className="font-mono-code text-base font-bold text-white">{teamSeats} engineers</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={250}
                  step={5}
                  value={teamSeats}
                  onChange={(e) => setTeamSeats(Number(e.target.value))}
                  aria-label="Engineering team size"
                  className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-emerald-400"
                />
                <div className="mt-2 flex justify-between font-mono-code text-[11px] text-zinc-500">
                  <span>5 seats</span>
                  <span>125 seats</span>
                  <span>250 seats</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 rounded-xl border border-white/10 bg-[#07090C] p-6 md:col-span-5">
              <div>
                <div className="font-mono-code text-xs uppercase tracking-wider text-zinc-500">Reclaimed Capacity / Mo</div>
                <div className="mt-1 font-mono-code text-3xl font-extrabold text-emerald-400">{monthlyHoursSaved.toLocaleString()} hrs</div>
              </div>
              <div className="h-px bg-white/[0.08]" />
              <div>
                <div className="font-mono-code text-xs uppercase tracking-wider text-zinc-500">Estimated Annual Savings</div>
                <div className="mt-1 font-mono-code text-3xl font-extrabold text-white">{'$'}{annualSavings.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="border-t border-white/[0.07] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="font-mono-code text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Transparent Pricing</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Predictable scale, zero surprise overages.
              </h2>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0D0F12] p-1">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ' + (!annual ? 'bg-white text-[#060709]' : 'text-zinc-400 hover:text-white')}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ' + (annual ? 'bg-white text-[#060709]' : 'text-zinc-400 hover:text-white')}
              >
                Annual · Save 20%
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {PRICING_TIERS.map((tier) => {
              const price = annual ? tier.annual : tier.monthly;
              return (
                <article
                  key={tier.name}
                  className={
                    'reveal-card flex flex-col rounded-2xl border p-7 transition-all ' +
                    (tier.highlight
                      ? 'border-emerald-400/50 bg-gradient-to-b from-emerald-500/[0.08] to-[#0B0D11]'
                      : 'card-glass')
                  }
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                    {tier.highlight && (
                      <span className="font-mono-code rounded-md border border-emerald-400/35 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                        POPULAR
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">{tier.tagline}</p>

                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="font-mono-code text-4xl font-extrabold text-white">{'$'}{price}</span>
                    <span className="text-xs text-zinc-500">/ workspace / mo</span>
                  </div>

                  <ul className="mt-6 flex-1 space-y-3 border-t border-white/[0.08] pt-6 text-sm text-zinc-300">
                    {tier.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => openDemoModal(tier.name)}
                    className={
                      'mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-all active:scale-[0.99] ' +
                      (tier.highlight
                        ? 'bg-white text-[#060709] hover:bg-zinc-200'
                        : 'border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.1]')
                    }
                  >
                    {tier.cta}
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="border-t border-white/[0.07] py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-white md:text-3xl">
            Architecture &amp; security questions
          </h2>
          <div className="mt-8 divide-y divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-[#0B0D10]">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-sm font-semibold text-white transition-colors hover:bg-white/[0.02]"
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={'h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ' + (isOpen ? 'rotate-180 text-emerald-400' : '')} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm leading-relaxed text-zinc-400">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.07] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-xs text-zinc-500 sm:flex-row">
          <div className="flex items-center gap-2 font-semibold text-zinc-300">
            <Layers className="h-4 w-4 text-emerald-400" />
            <span>Kinetix Systems Inc.</span>
          </div>
          <div className="font-mono-code">ALL SYSTEMS OPERATIONAL · 38 EDGE REGIONS · SOC 2 TYPE II</div>
        </div>
      </footer>

      {/* Workspace Provisioning Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0D0F13] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>Provision {selectedPlan} Workspace</span>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close modal" className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {submitted ? (
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                <h3 className="mt-3 text-base font-bold text-white">Workspace invite queued</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                  Your {selectedPlan} control plane credentials have been prepared for <strong>{formEmail}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="mt-5 w-full rounded-lg bg-white py-2.5 text-xs font-bold text-[#060709]"
                >
                  Return to Kinetix
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitAccess} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Work email</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#07090C] px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Organization</label>
                  <input
                    type="text"
                    required
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="Acme Systems"
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#07090C] px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-bold text-[#060709] transition-colors hover:bg-zinc-200"
                >
                  Create {selectedPlan} environment
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}`;

export const DEMO_KINETIX_SAAS = {
  id: 'demo-kinetix-saas',
  name: 'Kinetix Cloud',
  icon: 'layers',
  accent: '#10b981',
  tagline: 'GSAP-animated autonomous cloud SaaS',
  vfs: {
    'src/main.jsx': MAIN_JSX,
    'src/index.css': INDEX_CSS,
    'src/data.js': DATA_JS,
    'src/App.jsx': APP_JSX,
  },
};
