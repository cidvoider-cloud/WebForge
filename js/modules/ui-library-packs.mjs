/**
 * WebForge Studio — Built-in UI Component Library Style Packs
 *
 * Ships 6 distinct, production-grade design systems across all 12 core
 * website & app UI building blocks, complete with scoped live previews,
 * CSS design tokens, and a zero-dependency React kit (`src/components/ui.jsx`).
 */

import { TWENTY_FIRST_DEV_RAW_PACK } from './ui-library-21st.mjs';
import {
  HIDE_OTHER_SOURCES,
  HARD_DELETE,
  KEEP_INDEXED_LIBRARY_IDS,
  PREVIEW_KIT_MANIFEST,
} from './ui-library-schema.mjs';

const PINNED_INDEXED_COMMITS = {
  'awesome-components': '87e9f787c81c',
  'kokonut-ui': '7e4bd770ca3f',
  hyperui: '0be87b52222f',
  'watermelon-ui': 'registry-v4-2026-11-21',
  'shadcn-ui': '055aa6b7837b',
};

export const UI_ELEMENT_CATEGORIES = [
  { id: 'buttons', label: 'Buttons' },
  { id: 'navbar', label: 'Navbar' },
  { id: 'hero', label: 'Hero' },
  { id: 'cards', label: 'Cards' },
  { id: 'forms', label: 'Forms' },
  { id: 'tabs', label: 'Tabs' },
  { id: 'modals', label: 'Modals' },
  { id: 'tables', label: 'Tables & KPIs' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'accordion', label: 'Accordion' },
  { id: 'footer', label: 'Footer' },
];

/**
 * Generates the 12 core element definitions (live preview HTML + copyable JSX)
 * for any theme pack using its shared `.wf-ui-*` token classes.
 */
function buildStandardElements(pack) {
  const brand = pack.sampleBrand || 'Acme';
  return [
    {
      id: `${pack.id}-buttons`,
      category: 'buttons',
      name: 'Action Buttons',
      description: 'Primary, secondary, ghost, and destructive actions styled with this library’s geometry and motion.',
      previewHtml: `
        <div class="wf-ui-row">
          <button type="button" class="wf-ui-btn wf-ui-btn-primary">Deploy Now</button>
          <button type="button" class="wf-ui-btn wf-ui-btn-secondary">Documentation</button>
          <button type="button" class="wf-ui-btn wf-ui-btn-ghost">Cancel</button>
        </div>`,
      code: `import { Button } from './components/ui';

export function ActionRow() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">Deploy Now</Button>
      <Button variant="secondary">Documentation</Button>
      <Button variant="ghost">Cancel</Button>
    </div>
  );
}`,
    },
    {
      id: `${pack.id}-navbar`,
      category: 'navbar',
      name: 'Navigation Bar',
      description: 'Three-zone single-line top bar with brand wordmark, navigation links, and one primary CTA.',
      previewHtml: `
        <header class="wf-ui-nav">
          <span class="wf-ui-brand">${brand}</span>
          <nav class="wf-ui-nav-links">
            <span>Product</span>
            <span>Pricing</span>
            <span>Docs</span>
          </nav>
          <button type="button" class="wf-ui-btn wf-ui-btn-primary wf-ui-btn-sm">Get Started</button>
        </header>`,
      code: `import { Navbar } from './components/ui';

export function TopHeader() {
  return (
    <Navbar
      brand="${brand}"
      links={[
        { label: 'Product', href: '#product' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Docs', href: '#docs' },
      ]}
      ctaLabel="Get Started"
      onCtaClick={() => {}}
    />
  );
}`,
    },
    {
      id: `${pack.id}-hero`,
      category: 'hero',
      name: 'Hero Header',
      description: 'Focal headline lockup with clear reading hierarchy, subcopy, and primary/secondary actions.',
      previewHtml: `
        <div class="wf-ui-hero">
          <div class="wf-ui-kicker">${pack.sampleKicker || 'Release 2.0'}</div>
          <h3 class="wf-ui-hero-title">${pack.sampleHeadline || 'Build with unmistakable craft.'}</h3>
          <p class="wf-ui-muted">Composable primitives styled from shared design tokens.</p>
          <div class="wf-ui-row" style="margin-top:10px">
            <button type="button" class="wf-ui-btn wf-ui-btn-primary wf-ui-btn-sm">Start Building</button>
            <button type="button" class="wf-ui-btn wf-ui-btn-secondary wf-ui-btn-sm">Live Demo</button>
          </div>
        </div>`,
      code: `import { HeroShell } from './components/ui';

export function LandingHero() {
  return (
    <HeroShell
      kicker="${pack.sampleKicker || 'Release 2.0'}"
      title="${pack.sampleHeadline || 'Build with unmistakable craft.'}"
      subtitle="Composable primitives styled from shared design tokens."
      primaryAction={{ label: 'Start Building', onClick: () => {} }}
      secondaryAction={{ label: 'Live Demo', onClick: () => {} }}
    />
  );
}`,
    },
    {
      id: `${pack.id}-cards`,
      category: 'cards',
      name: 'Feature Card',
      description: 'Single-elevation content container with crisp title, quiet unboxed metadata, and action link.',
      previewHtml: `
        <article class="wf-ui-card">
          <div class="wf-ui-meta">Architecture · Updated today</div>
          <h4 class="wf-ui-card-title">Edge Compute Mesh</h4>
          <p class="wf-ui-muted">Zero-cold-start workers replicated across 38 global regions.</p>
        </article>`,
      code: `import { Card } from './components/ui';

export function FeatureCard() {
  return (
    <Card
      meta="Architecture · Updated today"
      title="Edge Compute Mesh"
      description="Zero-cold-start workers replicated across 38 global regions."
    />
  );
}`,
    },
    {
      id: `${pack.id}-forms`,
      category: 'forms',
      name: 'Form Input & Field',
      description: 'Accessible labeled input with focus ring, helper hint, and inline submit button.',
      previewHtml: `
        <div class="wf-ui-form">
          <label class="wf-ui-label">Work Email</label>
          <div class="wf-ui-row">
            <input type="email" class="wf-ui-input" value="alex@studio.io" readonly aria-label="Work Email">
            <button type="button" class="wf-ui-btn wf-ui-btn-primary wf-ui-btn-sm">Join</button>
          </div>
        </div>`,
      code: `import { Input, Button } from './components/ui';

export function WaitlistForm() {
  return (
    <form className="flex flex-col gap-3 max-w-md">
      <Input label="Work Email" type="email" placeholder="alex@studio.io" />
      <Button type="submit" variant="primary">Join Waitlist</Button>
    </form>
  );
}`,
    },
    {
      id: `${pack.id}-tabs`,
      category: 'tabs',
      name: 'Segmented Tabs',
      description: 'Keyboard-accessible segmented view switcher with clear active contrast.',
      previewHtml: `
        <div class="wf-ui-tabs" role="tablist">
          <button type="button" class="wf-ui-tab active">Overview</button>
          <button type="button" class="wf-ui-tab">Metrics</button>
          <button type="button" class="wf-ui-tab">Settings</button>
        </div>`,
      code: `import { Tabs } from './components/ui';

export function ViewTabs({ value, onChange }) {
  return (
    <Tabs
      value={value}
      onChange={onChange}
      items={[
        { id: 'overview', label: 'Overview' },
        { id: 'metrics', label: 'Metrics' },
        { id: 'settings', label: 'Settings' },
      ]}
    />
  );
}`,
    },
    {
      id: `${pack.id}-modals`,
      category: 'modals',
      name: 'Dialog / Modal',
      description: 'Focused confirmation dialog with header, concise copy, and cancel/confirm footer.',
      previewHtml: `
        <div class="wf-ui-modal-preview">
          <div class="wf-ui-card-title">Publish Production Build?</div>
          <p class="wf-ui-muted" style="margin:4px 0 10px">Changes will roll out to all active edge nodes.</p>
          <div class="wf-ui-row" style="justify-content:flex-end">
            <button type="button" class="wf-ui-btn wf-ui-btn-ghost wf-ui-btn-sm">Cancel</button>
            <button type="button" class="wf-ui-btn wf-ui-btn-primary wf-ui-btn-sm">Publish</button>
          </div>
        </div>`,
      code: `import { Modal } from './components/ui';

export function PublishDialog({ open, onClose, onConfirm }) {
  return (
    <Modal
      open={open}
      title="Publish Production Build?"
      description="Changes will roll out to all active edge nodes."
      confirmLabel="Publish"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}`,
    },
    {
      id: `${pack.id}-tables`,
      category: 'tables',
      name: 'Data Table & KPI Tile',
      description: 'Tabular-numeral metric strip and compact structured rows for dashboards and consoles.',
      previewHtml: `
        <div class="wf-ui-table-wrap">
          <div class="wf-ui-kpi-row">
            <div><span class="wf-ui-meta">Latency</span><strong class="wf-ui-kpi-val">18 ms</strong></div>
            <div><span class="wf-ui-meta">Uptime</span><strong class="wf-ui-kpi-val">99.98%</strong></div>
          </div>
          <table class="wf-ui-table">
            <thead><tr><th>Service</th><th style="text-align:right">Status</th></tr></thead>
            <tbody>
              <tr><td>API Gateway</td><td style="text-align:right">Healthy</td></tr>
              <tr><td>Worker Mesh</td><td style="text-align:right">Active</td></tr>
            </tbody>
          </table>
        </div>`,
      code: `import { MetricTile, DataTable } from './components/ui';

export function TelemetryPanel() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <MetricTile label="Median Latency" value="18 ms" delta="-12% this week" />
        <MetricTile label="Global Uptime" value="99.98%" delta="30-day SLA" />
      </div>
      <DataTable
        columns={['Service', 'Region', 'Status']}
        rows={[
          ['API Gateway', 'us-east-1', 'Healthy'],
          ['Worker Mesh', 'eu-central-1', 'Active'],
        ]}
      />
    </div>
  );
}`,
    },
    {
      id: `${pack.id}-pricing`,
      category: 'pricing',
      name: 'Pricing Tier Card',
      description: 'Structured plan card with clear billing cadence, tabular price, feature list, and CTA.',
      previewHtml: `
        <div class="wf-ui-card">
          <div class="wf-ui-meta">Scale Plan · Most Popular</div>
          <div class="wf-ui-price"><strong>$49</strong><span>/ month</span></div>
          <div class="wf-ui-muted" style="margin:6px 0 10px">Unlimited previews · Priority builds · SSO</div>
          <button type="button" class="wf-ui-btn wf-ui-btn-primary wf-ui-btn-sm" style="width:100%">Choose Scale</button>
        </div>`,
      code: `import { PricingCard } from './components/ui';

export function ScaleTier() {
  return (
    <PricingCard
      name="Scale"
      price="$49"
      cadence="/ month"
      highlighted
      features={['Unlimited live previews', 'Priority build queue', 'SAML SSO & audit logs']}
      ctaLabel="Choose Scale"
      onSelect={() => {}}
    />
  );
}`,
    },
    {
      id: `${pack.id}-alerts`,
      category: 'alerts',
      name: 'Semantic Alert Banner',
      description: 'Status callout pairing explicit icon + text label (never color alone) for success or warnings.',
      previewHtml: `
        <div class="wf-ui-alert">
          <strong>Build Verified</strong>
          <span>All 14 automated checks passed with zero runtime warnings.</span>
        </div>`,
      code: `import { AlertBanner } from './components/ui';

export function BuildNotice() {
  return (
    <AlertBanner
      tone="success"
      title="Build Verified"
      message="All 14 automated checks passed with zero runtime warnings."
    />
  );
}`,
    },
    {
      id: `${pack.id}-accordion`,
      category: 'accordion',
      name: 'Disclosure / FAQ Accordion',
      description: 'Expandable question-and-answer stack with crisp dividers and clean typography.',
      previewHtml: `
        <div class="wf-ui-accordion">
          <div class="wf-ui-acc-item open">
            <div class="wf-ui-acc-head"><span>Can I export standalone code?</span><span>−</span></div>
            <div class="wf-ui-acc-body">Yes—export a clean Vite React ZIP or standalone HTML anytime.</div>
          </div>
          <div class="wf-ui-acc-item">
            <div class="wf-ui-acc-head"><span>Works offline with Ollama?</span><span>+</span></div>
          </div>
        </div>`,
      code: `import { Accordion } from './components/ui';

export function FaqList() {
  return (
    <Accordion
      items={[
        { q: 'Can I export standalone code?', a: 'Yes—export a clean Vite React ZIP anytime.' },
        { q: 'Does it work with local LLMs?', a: 'Runs natively with Ollama, LM Studio, or OpenRouter.' },
      ]}
    />
  );
}`,
    },
    {
      id: `${pack.id}-footer`,
      category: 'footer',
      name: 'Site Footer',
      description: 'Quiet closing band with brand mark, structured navigation columns, and copyright.',
      previewHtml: `
        <footer class="wf-ui-footer">
          <span class="wf-ui-brand">${brand}</span>
          <span class="wf-ui-meta">Privacy · Terms · Status · © 2026</span>
        </footer>`,
      code: `import { SiteFooter } from './components/ui';

export function AppFooter() {
  return (
    <SiteFooter
      brand="${brand}"
      links={['Product', 'Docs', 'Privacy', 'Terms']}
      copyright="© 2026 ${brand}. All rights reserved."
    />
  );
}`,
    },
  ];
}

/**
 * Generates the standalone zero-dependency React kit (`src/components/ui.jsx`)
 * backed by the library's `src/styles/ui-tokens.css` classes.
 */
export function buildReactKitModule(pack) {
  return `/**
 * ${pack.name} — WebForge UI Kit
 * Auto-bundled React primitives powered by ./styles/ui-tokens.css
 */
import React, { useState } from 'react';

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const variantCls =
    variant === 'secondary'
      ? 'wf-ui-btn-secondary'
      : variant === 'ghost'
        ? 'wf-ui-btn-ghost'
        : 'wf-ui-btn-primary';
  const sizeCls = size === 'sm' ? 'wf-ui-btn-sm' : '';
  return (
    <button
      type={props.type || 'button'}
      className={\`wf-ui-btn \${variantCls} \${sizeCls} \${className}\`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function Navbar({ brand = 'Studio', links = [], ctaLabel = 'Get Started', onCtaClick }) {
  return (
    <header className="wf-ui-nav">
      <a href="#top" className="wf-ui-brand" style={{ textDecoration: 'none' }}>{brand}</a>
      <nav className="wf-ui-nav-links" aria-label="Primary">
        {links.map((link) => (
          <a key={link.label} href={link.href || '#'} style={{ color: 'inherit', textDecoration: 'none' }}>
            {link.label}
          </a>
        ))}
      </nav>
      {ctaLabel && (
        <Button variant="primary" size="sm" onClick={onCtaClick}>{ctaLabel}</Button>
      )}
    </header>
  );
}

export function HeroShell({ kicker, title, subtitle, primaryAction, secondaryAction, children }) {
  return (
    <section className="wf-ui-hero" style={{ padding: '48px 28px' }}>
      {kicker && <div className="wf-ui-kicker">{kicker}</div>}
      <h1 className="wf-ui-hero-title" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>{title}</h1>
      {subtitle && <p className="wf-ui-muted" style={{ maxWidth: '58ch', marginTop: 12 }}>{subtitle}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="wf-ui-row" style={{ marginTop: 22 }}>
          {primaryAction && (
            <Button variant="primary" onClick={primaryAction.onClick}>{primaryAction.label}</Button>
          )}
          {secondaryAction && (
            <Button variant="secondary" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ meta, title, description, className = '', children }) {
  return (
    <article className={\`wf-ui-card \${className}\`.trim()}>
      {meta && <div className="wf-ui-meta">{meta}</div>}
      {title && <h3 className="wf-ui-card-title">{title}</h3>}
      {description && <p className="wf-ui-muted">{description}</p>}
      {children}
    </article>
  );
}

export function Input({ label, id, className = '', ...props }) {
  const inputId = id || (label ? 'field-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined);
  return (
    <div className="wf-ui-form">
      {label && <label htmlFor={inputId} className="wf-ui-label">{label}</label>}
      <input id={inputId} className={\`wf-ui-input \${className}\`.trim()} {...props} />
    </div>
  );
}

export function Tabs({ items = [], value, onChange }) {
  return (
    <div className="wf-ui-tabs" role="tablist">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={\`wf-ui-tab \${active ? 'active' : ''}\`}
            onClick={() => onChange?.(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onClose, onConfirm, children }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center',
        background: 'rgba(0,0,0,0.6)', padding: 16, backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="wf-ui-modal-preview" style={{ width: '100%', maxWidth: 460, padding: 24 }}>
        <div className="wf-ui-card-title" style={{ fontSize: '1.15rem' }}>{title}</div>
        {description && <p className="wf-ui-muted" style={{ marginTop: 8 }}>{description}</p>}
        {children}
        <div className="wf-ui-row" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>{cancelLabel}</Button>
          {onConfirm && <Button variant="primary" size="sm" onClick={onConfirm}>{confirmLabel}</Button>}
        </div>
      </div>
    </div>
  );
}

export function MetricTile({ label, value, delta }) {
  return (
    <div className="wf-ui-card">
      <div className="wf-ui-meta">{label}</div>
      <div className="wf-ui-kpi-val" style={{ fontSize: '1.6rem', marginTop: 4 }}>{value}</div>
      {delta && <div className="wf-ui-muted" style={{ marginTop: 4 }}>{delta}</div>}
    </div>
  );
}

export function DataTable({ columns = [], rows = [] }) {
  return (
    <div className="wf-ui-table-wrap">
      <table className="wf-ui-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={col} style={idx === columns.length - 1 ? { textAlign: 'right' } : undefined}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} style={cIdx === row.length - 1 ? { textAlign: 'right' } : undefined}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PricingCard({ name, price, cadence = '/ mo', highlighted = false, features = [], ctaLabel = 'Select Plan', onSelect }) {
  return (
    <article className="wf-ui-card" style={highlighted ? { outline: '2px solid var(--wf-accent)' } : undefined}>
      <div className="wf-ui-meta">{name}{highlighted ? ' · Recommended' : ''}</div>
      <div className="wf-ui-price"><strong>{price}</strong><span>{cadence}</span></div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 16px', display: 'grid', gap: 6 }}>
        {features.map((f) => <li key={f} className="wf-ui-muted">✓ {f}</li>)}
      </ul>
      <Button variant={highlighted ? 'primary' : 'secondary'} style={{ width: '100%' }} onClick={onSelect}>
        {ctaLabel}
      </Button>
    </article>
  );
}

export function AlertBanner({ title, message }) {
  return (
    <div className="wf-ui-alert" role="status">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}

export function Accordion({ items = [] }) {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <div className="wf-ui-accordion">
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={item.q} className={\`wf-ui-acc-item \${isOpen ? 'open' : ''}\`}>
            <button
              type="button"
              className="wf-ui-acc-head"
              style={{ width: '100%', background: 'none', border: 0, color: 'inherit', cursor: 'pointer', textAlign: 'left' }}
              onClick={() => setOpenIndex(isOpen ? -1 : idx)}
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <span>{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && <div className="wf-ui-acc-body">{item.a}</div>}
          </div>
        );
      })}
    </div>
  );
}

export function SiteFooter({ brand = 'Studio', links = [], copyright = '' }) {
  return (
    <footer className="wf-ui-footer">
      <span className="wf-ui-brand">{brand}</span>
      <span className="wf-ui-meta">{links.join(' · ')}{copyright ? \` · \${copyright}\` : ''}</span>
    </footer>
  );
}
`;
}

/**
 * Shared layout base CSS that every style pack layers its theme variables & rules onto.
 */
export const SHARED_UI_BASE_CSS = `
.wf-ui-scope {
  font-family: var(--wf-font-body);
  color: var(--wf-fg);
  background: var(--wf-bg);
  line-height: 1.5;
}
.wf-ui-scope *, .wf-ui-scope *::before, .wf-ui-scope *::after { box-sizing: border-box; }
.wf-ui-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.wf-ui-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  font-family: var(--wf-font-display); font-weight: var(--wf-btn-weight, 600);
  font-size: var(--wf-btn-size, 12px); letter-spacing: var(--wf-btn-track, 0em);
  text-transform: var(--wf-btn-transform, none);
  padding: 8px 14px; border-radius: var(--wf-radius);
  border: var(--wf-border-width, 1px) solid transparent;
  cursor: pointer; white-space: nowrap; transition: transform 140ms ease, background 140ms ease, box-shadow 140ms ease;
}
.wf-ui-btn-sm { padding: 6px 11px; font-size: var(--wf-btn-size-sm, 11px); }
.wf-ui-btn-primary {
  background: var(--wf-accent); color: var(--wf-accent-fg);
  border-color: var(--wf-accent-border, var(--wf-accent));
  box-shadow: var(--wf-shadow-btn, none);
}
.wf-ui-btn-primary:hover { transform: var(--wf-hover-lift, translateY(-1px)); }
.wf-ui-btn-secondary {
  background: var(--wf-surface); color: var(--wf-fg);
  border-color: var(--wf-border);
  box-shadow: var(--wf-shadow-sm, none);
}
.wf-ui-btn-ghost { background: transparent; color: var(--wf-muted); border-color: transparent; }
.wf-ui-btn-ghost:hover { color: var(--wf-fg); background: var(--wf-hover-bg, rgba(127,127,127,0.1)); }
.wf-ui-nav {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 14px; background: var(--wf-surface);
  border: var(--wf-border-width, 1px) solid var(--wf-border);
  border-radius: var(--wf-radius); box-shadow: var(--wf-shadow-sm, none);
}
.wf-ui-brand {
  font-family: var(--wf-font-display); font-weight: 700; font-size: var(--wf-brand-size, 13px);
  letter-spacing: var(--wf-brand-track, -0.02em); color: var(--wf-fg); white-space: nowrap;
}
.wf-ui-nav-links { display: flex; gap: 12px; font-size: 11px; color: var(--wf-muted); white-space: nowrap; }
.wf-ui-hero {
  padding: 16px; background: var(--wf-hero-bg, var(--wf-surface));
  border: var(--wf-border-width, 1px) solid var(--wf-border);
  border-radius: var(--wf-radius); box-shadow: var(--wf-shadow-card, none);
}
.wf-ui-kicker {
  font-family: var(--wf-font-mono); font-size: 10px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--wf-accent-text, var(--wf-accent)); margin-bottom: 6px;
}
.wf-ui-hero-title {
  margin: 0 0 6px; font-family: var(--wf-font-display); font-size: var(--wf-hero-size, 18px);
  line-height: 1.15; font-weight: var(--wf-display-weight, 700); color: var(--wf-fg);
}
.wf-ui-card, .wf-ui-modal-preview {
  padding: 14px; background: var(--wf-surface);
  border: var(--wf-border-width, 1px) solid var(--wf-border);
  border-radius: var(--wf-radius); box-shadow: var(--wf-shadow-card, none);
}
.wf-ui-card-title {
  margin: 4px 0; font-family: var(--wf-font-display); font-size: 14px;
  font-weight: var(--wf-display-weight, 600); color: var(--wf-fg);
}
.wf-ui-meta {
  font-family: var(--wf-font-mono); font-size: 10px; color: var(--wf-muted);
  letter-spacing: 0.04em;
}
.wf-ui-muted { margin: 0; font-size: 11.5px; color: var(--wf-muted); }
.wf-ui-form { display: flex; flex-direction: column; gap: 6px; }
.wf-ui-label { font-size: 11px; font-weight: 600; color: var(--wf-fg); }
.wf-ui-input {
  flex: 1; min-width: 0; padding: 7px 10px; font-size: 12px; font-family: var(--wf-font-body);
  color: var(--wf-fg); background: var(--wf-input-bg, var(--wf-bg));
  border: var(--wf-border-width, 1px) solid var(--wf-border); border-radius: var(--wf-radius);
  outline: none;
}
.wf-ui-input:focus { border-color: var(--wf-accent); }
.wf-ui-tabs {
  display: inline-flex; gap: 4px; padding: 4px; background: var(--wf-surface);
  border: var(--wf-border-width, 1px) solid var(--wf-border); border-radius: var(--wf-radius);
}
.wf-ui-tab {
  padding: 5px 10px; font-size: 11px; font-family: var(--wf-font-display); font-weight: 600;
  color: var(--wf-muted); background: transparent; border: 0; border-radius: calc(var(--wf-radius) * 0.7);
  cursor: pointer;
}
.wf-ui-tab.active { background: var(--wf-accent); color: var(--wf-accent-fg); }
.wf-ui-table-wrap {
  background: var(--wf-surface); border: var(--wf-border-width, 1px) solid var(--wf-border);
  border-radius: var(--wf-radius); overflow: hidden; box-shadow: var(--wf-shadow-card, none);
}
.wf-ui-kpi-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px 12px;
  border-bottom: var(--wf-border-width, 1px) solid var(--wf-border);
}
.wf-ui-kpi-val { display: block; font-family: var(--wf-font-mono); font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--wf-fg); }
.wf-ui-table { width: 100%; border-collapse: collapse; font-size: 11.5px; font-variant-numeric: tabular-nums; }
.wf-ui-table th, .wf-ui-table td { padding: 7px 12px; text-align: left; border-bottom: 1px solid var(--wf-border); }
.wf-ui-table tr:last-child td { border-bottom: 0; }
.wf-ui-table th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--wf-muted); }
.wf-ui-price { display: flex; align-items: baseline; gap: 4px; margin-top: 6px; font-family: var(--wf-font-mono); }
.wf-ui-price strong { font-size: 22px; font-weight: 800; color: var(--wf-fg); }
.wf-ui-price span { font-size: 11px; color: var(--wf-muted); }
.wf-ui-alert {
  display: flex; flex-direction: column; gap: 3px; padding: 11px 13px;
  background: var(--wf-alert-bg, var(--wf-surface));
  border: var(--wf-border-width, 1px) solid var(--wf-alert-border, var(--wf-border));
  border-radius: var(--wf-radius); font-size: 11.5px; color: var(--wf-fg);
}
.wf-ui-alert strong { font-family: var(--wf-font-display); font-size: 12px; color: var(--wf-accent-text, var(--wf-accent)); }
.wf-ui-accordion {
  border: var(--wf-border-width, 1px) solid var(--wf-border);
  border-radius: var(--wf-radius); background: var(--wf-surface); overflow: hidden;
}
.wf-ui-acc-item { border-bottom: 1px solid var(--wf-border); }
.wf-ui-acc-item:last-child { border-bottom: 0; }
.wf-ui-acc-head { display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; font-size: 11.5px; font-weight: 600; color: var(--wf-fg); }
.wf-ui-acc-body { padding: 0 12px 10px; font-size: 11px; color: var(--wf-muted); }
.wf-ui-footer {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;
  padding: 11px 14px; background: var(--wf-surface);
  border: var(--wf-border-width, 1px) solid var(--wf-border); border-radius: var(--wf-radius);
}
`;

const RAW_PACKS = [
  {
    id: 'saas-modern',
    name: 'SaaS Modern',
    tagline: 'Obsidian dark surfaces, hairline 1px borders, emerald precision & tabular telemetry.',
    sampleBrand: 'Kinetix',
    sampleKicker: 'Cloud Control Plane',
    sampleHeadline: 'Ship autonomous systems.',
    fontsLabel: 'Plus Jakarta Sans + JetBrains Mono',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap',
    swatches: ['#090A0F', '#12151C', '#10B981', '#FAFAFA'],
    aiRules: [
      'Deep obsidian dark canvas (#090A0F) with subtle 1px rgba(255,255,255,0.10) borders.',
      'Sharp 8px border radius, crisp high-contrast white primary CTAs or emerald (#10B981) accents.',
      'Tabular JetBrains Mono numerals for all metrics, pricing, and latency readouts.',
    ],
    tokensCss: `
:root, .wf-ui-scope {
  --wf-bg: #090A0F;
  --wf-surface: #11131A;
  --wf-hero-bg: radial-gradient(circle at 80% 0%, rgba(16,185,129,0.14), transparent 55%), #11131A;
  --wf-fg: #F4F4F5;
  --wf-muted: #94A3B8;
  --wf-border: rgba(255,255,255,0.12);
  --wf-border-width: 1px;
  --wf-accent: #FAFAFA;
  --wf-accent-fg: #090A0F;
  --wf-accent-text: #34D399;
  --wf-alert-bg: rgba(16,185,129,0.08);
  --wf-alert-border: rgba(52,211,153,0.3);
  --wf-radius: 8px;
  --wf-font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --wf-font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
  --wf-font-mono: 'JetBrains Mono', monospace;
  --wf-shadow-card: 0 8px 24px rgba(0,0,0,0.35);
}
`,
  },
  {
    id: 'pixel-retro',
    name: 'Pixel / Retro 8-bit',
    tagline: 'Crisp 0px pixel corners, stepped 2px ink borders, hard offset shadows & arcade type.',
    sampleBrand: 'BITFORGE',
    sampleKicker: 'STAGE 01 · READY',
    sampleHeadline: 'PRESS START TO BUILD.',
    fontsLabel: 'Silkscreen + VT323',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=VT323&display=swap',
    swatches: ['#1A1626', '#262138', '#FFCC00', '#38BDF8'],
    aiRules: [
      'Strictly 0px border-radius everywhere—never round buttons, cards, or inputs.',
      'Use crisp 2px solid pixel outlines and hard non-blurred offset shadows (4px 4px 0 #090710).',
      'Set buttons, headings, and navigation in Silkscreen uppercase arcade typography and body in crisp monospace/VT323.',
      'On button hover/active, shift translate(2px, 2px) with reduced offset shadow for authentic tactile arcade feedback.',
    ],
    tokensCss: `
:root, .wf-ui-scope {
  --wf-bg: #1A1626;
  --wf-surface: #252038;
  --wf-hero-bg: repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 4px), #252038;
  --wf-input-bg: #120F1C;
  --wf-fg: #FEFCE8;
  --wf-muted: #B8B0D4;
  --wf-border: #8B7FC7;
  --wf-border-width: 2px;
  --wf-accent: #FFCC00;
  --wf-accent-fg: #141020;
  --wf-accent-border: #141020;
  --wf-accent-text: #FFCC00;
  --wf-alert-bg: #1F2D3D;
  --wf-alert-border: #38BDF8;
  --wf-radius: 0px;
  --wf-font-display: 'Silkscreen', monospace;
  --wf-font-body: 'VT323', monospace;
  --wf-font-mono: 'Silkscreen', monospace;
  --wf-btn-size: 10px;
  --wf-btn-size-sm: 9px;
  --wf-btn-transform: uppercase;
  --wf-brand-size: 11px;
  --wf-hero-size: 15px;
  --wf-shadow-btn: 3px 3px 0 #0B0814;
  --wf-shadow-sm: 3px 3px 0 #0B0814;
  --wf-shadow-card: 4px 4px 0 #0B0814;
  --wf-hover-lift: translate(1px, 1px);
}
.wf-ui-scope .wf-ui-muted,
.wf-ui-scope .wf-ui-input,
.wf-ui-scope .wf-ui-table { font-size: 15px; line-height: 1.3; }
`,
  },
  {
    id: 'minimal-luxury',
    name: 'Minimal Luxury',
    tagline: 'Warm alabaster canvas, editorial serif headings, 0px gallery frames & quiet poise.',
    sampleBrand: 'MAISON VÉRA',
    sampleKicker: 'Capsule IV · Milano',
    sampleHeadline: 'Architecture in pure wool.',
    fontsLabel: 'Cormorant Garamond + DM Sans',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap',
    swatches: ['#F6F4F0', '#ECE8E0', '#161412', '#8A7E72'],
    aiRules: [
      'Warm alabaster background (#F6F4F0) with deep espresso charcoal ink (#161412) and zero neon accents.',
      'Strictly 0px border-radius with hairline 1px rgba(22,20,18,0.14) editorial rules and generous whitespace.',
      'Pair Cormorant Garamond regular/medium display headings with uppercase wide-tracked DM Sans action controls.',
    ],
    tokensCss: `
:root, .wf-ui-scope {
  --wf-bg: #F6F4F0;
  --wf-surface: #FAF8F5;
  --wf-hero-bg: #EFECE6;
  --wf-input-bg: #FFFFFF;
  --wf-fg: #161412;
  --wf-muted: #6E675F;
  --wf-border: rgba(22,20,18,0.16);
  --wf-border-width: 1px;
  --wf-accent: #161412;
  --wf-accent-fg: #F6F4F0;
  --wf-accent-text: #161412;
  --wf-alert-bg: #ECE8E0;
  --wf-alert-border: rgba(22,20,18,0.22);
  --wf-radius: 0px;
  --wf-font-display: 'Cormorant Garamond', Georgia, serif;
  --wf-font-body: 'DM Sans', system-ui, sans-serif;
  --wf-font-mono: 'DM Sans', system-ui, sans-serif;
  --wf-display-weight: 500;
  --wf-btn-weight: 500;
  --wf-btn-transform: uppercase;
  --wf-btn-track: 0.16em;
  --wf-btn-size: 10px;
  --wf-btn-size-sm: 9.5px;
  --wf-brand-track: 0.22em;
  --wf-hero-size: 22px;
}
`,
  },
  {
    id: 'neo-brutalist',
    name: 'Neo-Brutalist',
    tagline: 'Thick 2.5px ink borders, electric yellow blocks, hard 4px shadows & bold type.',
    sampleBrand: 'STAMP',
    sampleKicker: 'ISSUE 09 · LOUD',
    sampleHeadline: 'Design that refuses to blend in.',
    fontsLabel: 'Bricolage Grotesque + IBM Plex Mono',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap',
    swatches: ['#FAF6EE', '#FFE500', '#2B59FF', '#111111'],
    aiRules: [
      'Bone paper canvas (#FAF6EE) with solid 2.5px #111111 borders and hard 4px 4px 0 #111111 shadows.',
      'High-impact electric yellow (#FFE500) primary actions paired with crisp black text and bold Bricolage Grotesque display headings.',
      'Zero blurred gradients or soft pastels—use decisive geometric blocks and strong contrast.',
    ],
    tokensCss: `
:root, .wf-ui-scope {
  --wf-bg: #FAF6EE;
  --wf-surface: #FFFFFF;
  --wf-hero-bg: #FFF9CC;
  --wf-input-bg: #FFFFFF;
  --wf-fg: #111111;
  --wf-muted: #4A4A4A;
  --wf-border: #111111;
  --wf-border-width: 2px;
  --wf-accent: #FFE500;
  --wf-accent-fg: #111111;
  --wf-accent-border: #111111;
  --wf-accent-text: #2B59FF;
  --wf-alert-bg: #E0EAFF;
  --wf-alert-border: #111111;
  --wf-radius: 4px;
  --wf-font-display: 'Bricolage Grotesque', system-ui, sans-serif;
  --wf-font-body: 'Bricolage Grotesque', system-ui, sans-serif;
  --wf-font-mono: 'IBM Plex Mono', monospace;
  --wf-display-weight: 800;
  --wf-btn-weight: 700;
  --wf-shadow-btn: 3px 3px 0 #111111;
  --wf-shadow-sm: 3px 3px 0 #111111;
  --wf-shadow-card: 4px 4px 0 #111111;
  --wf-hover-lift: translate(-1px, -1px);
}
`,
  },
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    tagline: 'Frosted translucent planes, specular edges & soft luminous atmospheric depth.',
    sampleBrand: 'Aether',
    sampleKicker: 'Spatial Interface',
    sampleHeadline: 'Light, depth, and clarity.',
    fontsLabel: 'Outfit + Plus Jakarta Sans',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap',
    swatches: ['#0B1020', '#1B2542', '#60A5FA', '#E2E8F0'],
    aiRules: [
      'Deep atmospheric indigo backdrop with translucent frosted panels (rgba(255,255,255,0.08) + backdrop-filter: blur(18px)).',
      'Luminous 1px specular border highlights (rgba(255,255,255,0.20)) and smooth 14px rounded surfaces.',
      'Maintain strict 4.5:1 text readability on every frosted layer using bright crisp typography (#F8FAFC).',
    ],
    tokensCss: `
:root, .wf-ui-scope {
  --wf-bg: radial-gradient(circle at 15% 10%, rgba(96,165,250,0.28), transparent 45%), radial-gradient(circle at 85% 90%, rgba(167,139,250,0.24), transparent 45%), #0B1020;
  --wf-surface: rgba(255,255,255,0.08);
  --wf-hero-bg: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04));
  --wf-input-bg: rgba(11,16,32,0.55);
  --wf-fg: #F8FAFC;
  --wf-muted: #CBD5E1;
  --wf-border: rgba(255,255,255,0.2);
  --wf-border-width: 1px;
  --wf-accent: rgba(255,255,255,0.92);
  --wf-accent-fg: #0B1020;
  --wf-accent-text: #93C5FD;
  --wf-alert-bg: rgba(96,165,250,0.16);
  --wf-alert-border: rgba(147,197,253,0.4);
  --wf-radius: 14px;
  --wf-font-display: 'Outfit', system-ui, sans-serif;
  --wf-font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
  --wf-font-mono: 'JetBrains Mono', monospace;
  --wf-shadow-card: 0 12px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2);
}
.wf-ui-scope .wf-ui-card,
.wf-ui-scope .wf-ui-nav,
.wf-ui-scope .wf-ui-hero,
.wf-ui-scope .wf-ui-modal-preview,
.wf-ui-scope .wf-ui-table-wrap,
.wf-ui-scope .wf-ui-accordion,
.wf-ui-scope .wf-ui-footer { backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
`,
  },
  {
    id: 'enterprise-m3',
    name: 'Enterprise M3',
    tagline: 'Structured Material 3 light surfaces, cobalt blue actions & compact tabular grids.',
    sampleBrand: 'Meridian',
    sampleKicker: 'Operations Console',
    sampleHeadline: 'Clarity across every workflow.',
    fontsLabel: 'Manrope + JetBrains Mono',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600&family=Manrope:wght@500;600;700;800&display=swap',
    swatches: ['#F8FAFC', '#FFFFFF', '#2563EB', '#0F172A'],
    aiRules: [
      'Clean cool-slate Material 3 light canvas (#F8FAFC) with crisp #FFFFFF elevated surfaces and 1px #E2E8F0 borders.',
      'Cobalt blue (#2563EB) reserved strictly for primary actions, active tabs, and focus rings (60-30-10 color balance).',
      'Compact 40px data rows with right-aligned tabular-nums metrics and clear semantic text statuses.',
    ],
    tokensCss: `
:root, .wf-ui-scope {
  --wf-bg: #F8FAFC;
  --wf-surface: #FFFFFF;
  --wf-hero-bg: linear-gradient(180deg, #FFFFFF 0%, #EFF6FF 100%);
  --wf-input-bg: #FFFFFF;
  --wf-fg: #0F172A;
  --wf-muted: #475569;
  --wf-border: #DCE3EE;
  --wf-border-width: 1px;
  --wf-accent: #2563EB;
  --wf-accent-fg: #FFFFFF;
  --wf-accent-text: #1D4ED8;
  --wf-alert-bg: #EFF6FF;
  --wf-alert-border: #BFDBFE;
  --wf-radius: 10px;
  --wf-font-display: 'Manrope', system-ui, sans-serif;
  --wf-font-body: 'Manrope', system-ui, sans-serif;
  --wf-font-mono: 'JetBrains Mono', monospace;
  --wf-shadow-card: 0 1px 3px rgba(15,23,42,0.06);
}
`,
  },
  TWENTY_FIRST_DEV_RAW_PACK,
  {
    id: 'awesome-components',
    name: 'Awesome Components',
    tagline: 'Open-source React & Tailwind UI components from wundercorp/awesome-components — searchable by name, category & author.',
    sampleBrand: 'Awesome UI',
    sampleKicker: 'Verified Components',
    sampleHeadline: 'Every UI pattern, ready to drop in.',
    fontsLabel: 'Inter + JetBrains Mono (Tailwind / shadcn)',
    fontsUrl: '',
    swatches: ['#09090B', '#18181B', '#38BDF8', '#FAFAFA'],
    isRemoteCatalog: true,
    catalogCount: 6345,
    source: 'github.com/wundercorp/awesome-components',
    sourceUrl: 'https://github.com/wundercorp/awesome-components',
    aiRules: [
      'Compose sections using the Tailwind + shadcn semantic utility palette (bg-background, text-foreground, bg-card, bg-muted, text-muted-foreground, bg-primary, text-primary-foreground, border-border).',
      'Preserve the refined spacing, crisp 1px borders, micro-interactions, and responsive structure of matched Awesome Components.',
      'Keep every inserted Awesome Component cleanly modular inside src/components/ and compose them cohesively in src/App.jsx.',
    ],
    tokensCss: `
:root, .wf-ui-scope {
  --wf-bg: #09090B;
  --wf-surface: #111114;
  --wf-hero-bg: linear-gradient(180deg, #111114 0%, #09090B 100%);
  --wf-input-bg: #111114;
  --wf-fg: #FAFAFA;
  --wf-muted: #A1A1AA;
  --wf-border: rgba(255,255,255,0.12);
  --wf-border-width: 1px;
  --wf-accent: #FAFAFA;
  --wf-accent-fg: #09090B;
  --wf-accent-text: #38BDF8;
  --wf-alert-bg: rgba(56,189,248,0.10);
  --wf-alert-border: rgba(56,189,248,0.32);
  --wf-radius: 10px;
  --wf-font-display: 'Inter', system-ui, sans-serif;
  --wf-font-body: 'Inter', system-ui, sans-serif;
  --wf-font-mono: 'JetBrains Mono', monospace;
  --wf-shadow-card: 0 12px 30px -12px rgba(0,0,0,0.45);
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 5.5%;
  --card-foreground: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --border: 240 3.7% 18%;
}
.bg-background { background-color: var(--wf-bg, #09090B); }
.text-foreground { color: var(--wf-fg, #FAFAFA); }
.bg-card { background-color: var(--wf-surface, #111114); }
.text-card-foreground { color: var(--wf-fg, #FAFAFA); }
.bg-muted { background-color: rgba(255,255,255,0.06); }
.text-muted-foreground { color: var(--wf-muted, #A1A1AA); }
.bg-primary { background-color: var(--wf-accent, #FAFAFA); }
.text-primary-foreground { color: var(--wf-accent-fg, #09090B); }
.border-border { border-color: var(--wf-border, rgba(255,255,255,0.12)); }
`,
    customElements: [],
  },
  {
    id: 'kokonut-ui',
    name: 'Kokonut UI',
    tagline: 'Motion-first React & Tailwind components from kokonut-labs/kokonutui — AI interfaces, animated cards, drawers & shaders.',
    sampleBrand: 'Kokonut UI',
    sampleKicker: 'Verified Components',
    sampleHeadline: 'Fluid motion & AI-native UI blocks.',
    fontsLabel: 'Inter + JetBrains Mono (Tailwind / Motion)',
    fontsUrl: '',
    swatches: ['#09090B', '#18181B', '#FB7185', '#FAFAFA'],
    isRemoteCatalog: true,
    catalogType: 'tsx',
    catalogCount: 121,
    source: 'github.com/kokonut-labs/kokonutui',
    sourceUrl: 'https://github.com/kokonut-labs/kokonutui',
    aiRules: [
      'Use Kokonut UI motion-first Tailwind & shadcn conventions with refined micro-interactions, crisp hairline borders, and balanced dark/light contrast.',
      'Compose AI interfaces (prompt inputs, agent lanes, diff views, context meters) and animated surface cards cleanly in modular components.',
      'Use Lucide icons and smooth spring-like transitions without cluttered glow overload.',
    ],
    tokensCss: `
:root, .wf-ui-scope {
  --wf-bg: #09090B;
  --wf-surface: #121216;
  --wf-hero-bg: linear-gradient(180deg, #16141A 0%, #09090B 100%);
  --wf-input-bg: #121216;
  --wf-fg: #FAFAFA;
  --wf-muted: #A1A1AA;
  --wf-border: rgba(255,255,255,0.11);
  --wf-border-width: 1px;
  --wf-accent: #FB7185;
  --wf-accent-fg: #09090B;
  --wf-accent-text: #FDA4AF;
  --wf-alert-bg: rgba(251,113,133,0.12);
  --wf-alert-border: rgba(251,113,133,0.34);
  --wf-radius: 12px;
  --wf-font-display: 'Inter', system-ui, sans-serif;
  --wf-font-body: 'Inter', system-ui, sans-serif;
  --wf-font-mono: 'JetBrains Mono', monospace;
  --wf-shadow-card: 0 12px 30px -12px rgba(0,0,0,0.45);
}
`,
    customElements: [],
  },
  {
    id: 'hyperui',
    name: 'HyperUI',
    tagline: 'Paired Light & Dark pure Tailwind CSS HTML blocks from markmead/hyperui — Application UI, Marketing & Neobrutalism.',
    sampleBrand: 'HyperUI',
    sampleKicker: 'Verified Components',
    sampleHeadline: 'Zero-dependency Tailwind CSS blocks.',
    fontsLabel: 'Inter + System Sans (Pure Tailwind CSS)',
    fontsUrl: '',
    swatches: ['#0F172A', '#1E293B', '#6366F1', '#F8FAFC'],
    isRemoteCatalog: true,
    catalogType: 'html',
    catalogCount: 326,
    source: 'github.com/markmead/hyperui',
    sourceUrl: 'https://github.com/markmead/hyperui',
    aiRules: [
      'Write semantic, accessible HTML & Tailwind CSS markup matching HyperUI conventions with native dark: utility variants.',
      'Keep layouts clean, responsive, and dependency-free using pure Tailwind utility classes across Application UI, Marketing, and Neobrutalism sections.',
      'Ensure keyboard focus rings, clear contrast ratios, and structured visual hierarchy on every section.',
    ],
    tokensCss: `
:root, .wf-ui-scope {
  --wf-bg: #0F172A;
  --wf-surface: #1E293B;
  --wf-hero-bg: linear-gradient(180deg, #1E293B 0%, #0F172A 100%);
  --wf-input-bg: #1E293B;
  --wf-fg: #F8FAFC;
  --wf-muted: #94A3B8;
  --wf-border: rgba(148,163,184,0.2);
  --wf-border-width: 1px;
  --wf-accent: #6366F1;
  --wf-accent-fg: #FFFFFF;
  --wf-accent-text: #818CF8;
  --wf-alert-bg: rgba(99,102,241,0.12);
  --wf-alert-border: rgba(99,102,241,0.34);
  --wf-radius: 8px;
  --wf-font-display: 'Inter', system-ui, sans-serif;
  --wf-font-body: 'Inter', system-ui, sans-serif;
  --wf-font-mono: 'JetBrains Mono', monospace;
  --wf-shadow-card: 0 10px 24px -10px rgba(15,23,42,0.45);
}
`,
    customElements: [],
  },
  {
    id: 'watermelon-ui',
    name: 'Watermelon UI',
    tagline: 'Official ui.watermelon.sh library: Animated UI, Components, Blocks, Dashboards, and Templates.',
    sampleBrand: 'Watermelon UI',
    sampleKicker: 'Verified Components',
    sampleHeadline: 'Animated UI, Components, Blocks, Dashboards, and Templates.',
    fontsLabel: 'Inter + JetBrains Mono (React 19 · Motion · Tailwind v4)',
    fontsUrl: '',
    swatches: ['#0A0B0D', '#14161A', '#10B981', '#F43F5E'],
    isRemoteCatalog: true,
    catalogType: 'tsx',
    catalogCount: 849,
    source: 'ui.watermelon.sh',
    sourceUrl: 'https://ui.watermelon.sh',
    aiRules: [
      'Follow Watermelon UI tactile craft: crisp 1px hairlines, subtle top-edge sheen, spring-physics disclosure transitions, and generous breathing room.',
      'Compose interactive widgets (inline disclosures, activity cards, adaptive controls, command bars, stacked menus) with clean state transitions and tabular-nums.',
      'Keep metadata quiet and unboxed; reserve accent color strictly for focal triggers and active states.',
    ],
    tokensCss: `
:root, .wf-ui-scope {
  --wf-bg: #0A0B0D;
  --wf-surface: #131519;
  --wf-hero-bg: linear-gradient(180deg, #16191F 0%, #0A0B0D 100%);
  --wf-input-bg: #131519;
  --wf-fg: #F5F6F8;
  --wf-muted: #98A0AD;
  --wf-border: rgba(255,255,255,0.10);
  --wf-border-width: 1px;
  --wf-accent: #10B981;
  --wf-accent-fg: #041A12;
  --wf-accent-text: #34D399;
  --wf-alert-bg: rgba(16,185,129,0.12);
  --wf-alert-border: rgba(16,185,129,0.34);
  --wf-radius: 12px;
  --wf-font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --wf-font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
  --wf-font-mono: 'JetBrains Mono', monospace;
  --wf-shadow-card: 0 14px 32px -14px rgba(0,0,0,0.55);
}
`,
    customElements: [],
  },
  {
    id: 'shadcn-ui',
    name: 'shadcn/ui',
    tagline: 'Official shadcn/ui v4 primitives, interactive examples & multi-file layout blocks from shadcn-ui/ui.',
    sampleBrand: 'shadcn/ui',
    sampleKicker: 'Verified Components',
    sampleHeadline: 'Accessible, composable React primitives.',
    fontsLabel: 'Inter + JetBrains Mono (Radix / Tailwind v4)',
    fontsUrl: '',
    swatches: ['#09090B', '#18181B', '#E4E4E7', '#FAFAFA'],
    isRemoteCatalog: true,
    catalogType: 'tsx',
    catalogCount: 275,
    source: 'github.com/shadcn-ui/ui',
    sourceUrl: 'https://github.com/shadcn-ui/ui',
    aiRules: [
      'Follow official shadcn/ui v4 semantic CSS variable tokens (--background, --foreground, --card, --primary, --secondary, --muted, --accent, --destructive, --border, --ring).',
      'Build accessible, keyboard-navigable Radix-style primitives composed with cn() and class-variance-authority variants.',
      'Prefer restrained monochrome zinc palettes, crisp 1px borders, subtle ring focus states, and clean typographic hierarchy.',
    ],
    tokensCss: `
:root, .wf-ui-scope {
  --wf-bg: #09090B;
  --wf-surface: #111114;
  --wf-hero-bg: linear-gradient(180deg, #141418 0%, #09090B 100%);
  --wf-input-bg: #111114;
  --wf-fg: #FAFAFA;
  --wf-muted: #A1A1AA;
  --wf-border: rgba(255,255,255,0.12);
  --wf-border-width: 1px;
  --wf-accent: #FAFAFA;
  --wf-accent-fg: #09090B;
  --wf-accent-text: #E4E4E7;
  --wf-alert-bg: rgba(255,255,255,0.06);
  --wf-alert-border: rgba(255,255,255,0.18);
  --wf-radius: 10px;
  --wf-font-display: 'Inter', system-ui, sans-serif;
  --wf-font-body: 'Inter', system-ui, sans-serif;
  --wf-font-mono: 'JetBrains Mono', monospace;
  --wf-shadow-card: 0 12px 28px -12px rgba(0,0,0,0.45);
}
`,
    customElements: [],
  },
  {
    id: 'designmd-linear',
    name: 'Linear (DESIGN.md)',
    tagline: 'Ultra-minimal dark obsidian precision from VoltAgent/awesome-design-md — crisp 1px hairlines, tight tracking, and electric indigo focus.',
    sampleBrand: 'Linear',
    sampleKicker: 'DESIGN.md · Issue Tracking',
    sampleHeadline: 'Purpose-built for modern product teams.',
    fontsLabel: 'Plus Jakarta Sans + JetBrains Mono (DESIGN.md)',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
    swatches: ['#08090A', '#111214', '#5E6AD2', '#F7F8F8'],
    isDesignMdPreset: true,
    source: 'github.com/VoltAgent/awesome-design-md',
    sourceUrl: 'https://github.com/VoltAgent/awesome-design-md',
    aiRules: [
      'DESIGN.md (Linear): Canvas #08090A, elevated cards #111214, hairline borders rgba(255,255,255,0.08), primary text #F7F8F8, muted #8A8F98, single focal accent #5E6AD2.',
      'Typography: Tight display tracking (-0.03em), restrained weights (500/600), monospace tabular-nums for issue IDs, shortcuts, and timestamps.',
      'Layout & Motion: Dense keyboard-first hierarchy, single elevation depth, crisp 1px separators, snappy <200ms hover/focus transitions, zero decorative glow bloat.',
    ],
    tokensCss: `
:root, .wf-ui-scope {
  --wf-bg: #08090A;
  --wf-surface: #111214;
  --wf-hero-bg: linear-gradient(180deg, #141519 0%, #08090A 100%);
  --wf-input-bg: #111214;
  --wf-fg: #F7F8F8;
  --wf-muted: #8A8F98;
  --wf-border: rgba(255,255,255,0.09);
  --wf-border-width: 1px;
  --wf-accent: #5E6AD2;
  --wf-accent-fg: #FFFFFF;
  --wf-accent-text: #828FFF;
  --wf-alert-bg: rgba(94,106,210,0.14);
  --wf-alert-border: rgba(94,106,210,0.34);
  --wf-radius: 8px;
  --wf-font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --wf-font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
  --wf-font-mono: 'JetBrains Mono', monospace;
  --wf-shadow-card: 0 12px 32px -12px rgba(0,0,0,0.65);
}
`,
  },
  {
    id: 'designmd-stripe',
    name: 'Stripe (DESIGN.md)',
    tagline: 'Editorial fintech clarity from VoltAgent/awesome-design-md — crisp white canvas, deep slate ink (#0A2540), and vibrant blurple (#635BFF) CTAs.',
    sampleBrand: 'Stripe',
    sampleKicker: 'DESIGN.md · Financial Infrastructure',
    sampleHeadline: 'Financial infrastructure to grow revenue.',
    fontsLabel: 'Plus Jakarta Sans + JetBrains Mono (DESIGN.md)',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
    swatches: ['#FFFFFF', '#F6F9FC', '#635BFF', '#0A2540'],
    isDesignMdPreset: true,
    source: 'github.com/VoltAgent/awesome-design-md',
    sourceUrl: 'https://github.com/VoltAgent/awesome-design-md',
    aiRules: [
      'DESIGN.md (Stripe): Crisp white #FFFFFF canvas alternating with cool surface #F6F9FC, deep navy ink #0A2540, slate body #425466, and electric blurple #635BFF primary actions.',
      'Typography & Rhythm: Confident architectural display type (-0.03em), generous vertical whitespace, structured editorial columns, and tabular numerals on every currency or KPI value.',
      'Elevation: Soft multi-layered ambient card shadows (0 12px 28px rgba(10,37,64,0.08)) paired with crisp 1px borders—never heavy dark drop shadows on light surfaces.',
    ],
    tokensCss: `
:root, .wf-ui-scope {
  --wf-bg: #F6F9FC;
  --wf-surface: #FFFFFF;
  --wf-hero-bg: linear-gradient(180deg, #FFFFFF 0%, #F6F9FC 100%);
  --wf-input-bg: #FFFFFF;
  --wf-fg: #0A2540;
  --wf-muted: #425466;
  --wf-border: rgba(10,37,64,0.11);
  --wf-border-width: 1px;
  --wf-accent: #635BFF;
  --wf-accent-fg: #FFFFFF;
  --wf-accent-text: #635BFF;
  --wf-alert-bg: rgba(99,91,255,0.09);
  --wf-alert-border: rgba(99,91,255,0.28);
  --wf-radius: 10px;
  --wf-font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --wf-font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
  --wf-font-mono: 'JetBrains Mono', monospace;
  --wf-shadow-card: 0 12px 28px -10px rgba(10,37,64,0.12);
}
`,
  },
  {
    id: 'designmd-vercel',
    name: 'Vercel (DESIGN.md)',
    tagline: 'Stark monochrome developer precision from VoltAgent/awesome-design-md — pure black canvas, crisp hairline grids, and zero-fluff contrast.',
    sampleBrand: 'Vercel',
    sampleKicker: 'DESIGN.md · Cloud Platform',
    sampleHeadline: 'Develop. Preview. Ship.',
    fontsLabel: 'DM Sans + JetBrains Mono (DESIGN.md)',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
    swatches: ['#000000', '#0A0A0A', '#FAFAFA', '#888888'],
    isDesignMdPreset: true,
    source: 'github.com/VoltAgent/awesome-design-md',
    sourceUrl: 'https://github.com/VoltAgent/awesome-design-md',
    aiRules: [
      'DESIGN.md (Vercel): Stark #000000 canvas, #0A0A0A panels, crisp 1px #262626 grid hairlines, high-contrast #FAFAFA primary buttons with #000000 ink, muted text #888888.',
      'Geometry: Tight 6px–8px border radii, architectural grid alignment with exposed hairline dividers, zero ornamental gradients or heavy box shadows.',
      'Typography: Crisp geometric sans (-0.035em hero headlines) paired with JetBrains Mono for CLI commands, deployment URLs, and build timings.',
    ],
    tokensCss: `
:root, .wf-ui-scope {
  --wf-bg: #000000;
  --wf-surface: #0A0A0A;
  --wf-hero-bg: linear-gradient(180deg, #0D0D0D 0%, #000000 100%);
  --wf-input-bg: #0A0A0A;
  --wf-fg: #FAFAFA;
  --wf-muted: #888888;
  --wf-border: rgba(255,255,255,0.14);
  --wf-border-width: 1px;
  --wf-accent: #FAFAFA;
  --wf-accent-fg: #000000;
  --wf-accent-text: #FAFAFA;
  --wf-alert-bg: rgba(255,255,255,0.06);
  --wf-alert-border: rgba(255,255,255,0.22);
  --wf-radius: 6px;
  --wf-font-display: 'DM Sans', system-ui, sans-serif;
  --wf-font-body: 'DM Sans', system-ui, sans-serif;
  --wf-font-mono: 'JetBrains Mono', monospace;
  --wf-shadow-card: none;
}
`,
  },
  {
    id: 'designmd-raycast',
    name: 'Raycast (DESIGN.md)',
    tagline: 'Command-first macOS launcher aesthetic from VoltAgent/awesome-design-md — carbon glass ladder, tight radii, and vibrant crimson-coral focus.',
    sampleBrand: 'Raycast',
    sampleKicker: 'DESIGN.md · Productivity Launcher',
    sampleHeadline: 'Your shortcut to everything.',
    fontsLabel: 'Manrope + JetBrains Mono (DESIGN.md)',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
    swatches: ['#0C0D10', '#16181D', '#FF6363', '#F5F6FA'],
    isDesignMdPreset: true,
    source: 'github.com/VoltAgent/awesome-design-md',
    sourceUrl: 'https://github.com/VoltAgent/awesome-design-md',
    aiRules: [
      'DESIGN.md (Raycast): Deep carbon canvas #0C0D10, subtle glass surface ladder (#16181D -> #1F2229), razor 1px top highlights, primary text #F5F6FA, crimson-coral focal accent #FF6363.',
      'Interaction Craft: Keyboard-shortcut hints (kbd badges in monospace), snappy instant command search lists, subtle inner-top highlights, compact 10px–12px corners.',
      'Restraint: Reserve crimson-coral strictly for the single primary action and active highlights; keep 90% of chrome in calm charcoal neutrals.',
    ],
    tokensCss: `
:root, .wf-ui-scope {
  --wf-bg: #0C0D10;
  --wf-surface: #16181D;
  --wf-hero-bg: linear-gradient(180deg, #1A1C24 0%, #0C0D10 100%);
  --wf-input-bg: #16181D;
  --wf-fg: #F5F6FA;
  --wf-muted: #98A0B3;
  --wf-border: rgba(255,255,255,0.1);
  --wf-border-width: 1px;
  --wf-accent: #FF6363;
  --wf-accent-fg: #0C0D10;
  --wf-accent-text: #FF8282;
  --wf-alert-bg: rgba(255,99,99,0.12);
  --wf-alert-border: rgba(255,99,99,0.34);
  --wf-radius: 10px;
  --wf-font-display: 'Manrope', system-ui, sans-serif;
  --wf-font-body: 'Manrope', system-ui, sans-serif;
  --wf-font-mono: 'JetBrains Mono', monospace;
  --wf-shadow-card: 0 16px 36px -14px rgba(0,0,0,0.65);
}
`,
  },
  {
    id: 'designmd-supabase',
    name: 'Supabase (DESIGN.md)',
    tagline: 'Developer database studio system from VoltAgent/awesome-design-md — deep graphite surfaces, emerald (#3ECF8E) triggers, and tabular clarity.',
    sampleBrand: 'Supabase',
    sampleKicker: 'DESIGN.md · Postgres Platform',
    sampleHeadline: 'Build in a weekend. Scale to millions.',
    fontsLabel: 'Outfit + JetBrains Mono (DESIGN.md)',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
    swatches: ['#121212', '#1C1C1C', '#3ECF8E', '#EDEDED'],
    isDesignMdPreset: true,
    source: 'github.com/VoltAgent/awesome-design-md',
    sourceUrl: 'https://github.com/VoltAgent/awesome-design-md',
    aiRules: [
      'DESIGN.md (Supabase): Deep graphite background #121212, elevated panels #1C1C1C, crisp borders #2E2E2E, foreground #EDEDED, muted #8E8E8E, signature emerald #3ECF8E primary actions.',
      'Developer Ergonomics: Clean code blocks, schema/table grids with tabular-nums, sharp 8px radius, high-contrast emerald active states paired with dark #0A1410 button text.',
      'Layout Discipline: Single-elevation panels separated by 1px borders and breathing whitespace; no distracting neon blurs.',
    ],
    tokensCss: `
:root, .wf-ui-scope {
  --wf-bg: #121212;
  --wf-surface: #1C1C1C;
  --wf-hero-bg: linear-gradient(180deg, #19211D 0%, #121212 100%);
  --wf-input-bg: #1C1C1C;
  --wf-fg: #EDEDED;
  --wf-muted: #9A9A9A;
  --wf-border: rgba(255,255,255,0.11);
  --wf-border-width: 1px;
  --wf-accent: #3ECF8E;
  --wf-accent-fg: #09130E;
  --wf-accent-text: #3ECF8E;
  --wf-alert-bg: rgba(62,207,142,0.12);
  --wf-alert-border: rgba(62,207,142,0.34);
  --wf-radius: 8px;
  --wf-font-display: 'Outfit', system-ui, sans-serif;
  --wf-font-body: 'Outfit', system-ui, sans-serif;
  --wf-font-mono: 'JetBrains Mono', monospace;
  --wf-shadow-card: 0 12px 28px -12px rgba(0,0,0,0.55);
}
`,
  },
];

export const BUILT_IN_UI_LIBRARIES = RAW_PACKS
  .filter((pack) => {
    if (HIDE_OTHER_SOURCES && HARD_DELETE) {
      return KEEP_INDEXED_LIBRARY_IDS.includes(pack.id);
    }
    return true;
  })
  .map((pack) => {
    const isKeptIndexed = KEEP_INDEXED_LIBRARY_IDS.includes(pack.id);
    const archived = HIDE_OTHER_SOURCES ? !isKeptIndexed : false;
    const fullTokensCss = `${pack.fontsUrl ? `@import url('${pack.fontsUrl}');\n` : ''}${SHARED_UI_BASE_CSS}\n${pack.tokensCss}`;
    return {
      ...pack,
      isBuiltIn: true,
      archived,
      manifestSource: isKeptIndexed ? 'indexed' : 'custom',
      framework: pack.catalogType === 'html' ? 'html' : (pack.id === 'awesome-components' ? 'mixed' : 'react'),
      tailwindVersion: PREVIEW_KIT_MANIFEST.tailwindVersion,
      pinnedCommit: PINNED_INDEXED_COMMITS[pack.id] || '',
      source: pack.source || 'built-in',
      tokensCss: fullTokensCss,
      kitCode: buildReactKitModule(pack),
      elements: Array.isArray(pack.customElements) ? pack.customElements : buildStandardElements(pack),
    };
  });
