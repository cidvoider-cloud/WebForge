/**
 * WebForge Studio — Built & Verified Flagship Storefront:
 * Sola Ceramic Studio (Editorial Kyoto Stoneware Storefront)
 */

const MAIN_JSX = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(<App />);`;

const INDEX_CSS = `:root {
  --sola-bg: #f7f4ef;
  --sola-surface: #ffffff;
  --sola-warm: #efe9df;
  --sola-ink: #1c1917;
  --sola-muted: #6b6259;
  --sola-accent: #c85a32;
  --sola-accent-hover: #a64623;
  --sola-border: #e5ddd1;
}

* {
  box-sizing: border-box;
}

html, body, #root {
  margin: 0;
  padding: 0;
  min-height: 100%;
  background: var(--sola-bg);
  color: var(--sola-ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  scroll-behavior: smooth;
}

.font-serif-editorial {
  font-family: Georgia, "Times New Roman", serif;
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}

.sola-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--sola-ink);
  color: #ffffff;
  border: 1px solid var(--sola-ink);
  border-radius: 999px;
  padding: 11px 22px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  text-decoration: none;
  transition: transform 150ms cubic-bezier(0.22, 1, 0.36, 1), background 160ms ease, border-color 160ms ease;
}

.sola-btn-primary:hover {
  background: var(--sola-accent);
  border-color: var(--sola-accent);
  transform: translateY(-1px);
}

.sola-btn-primary:active {
  transform: scale(0.97);
}

.sola-btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
}

.sola-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--sola-border);
  background: transparent;
  color: var(--sola-muted);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease, transform 140ms ease;
}

.sola-pill:hover {
  border-color: var(--sola-ink);
  color: var(--sola-ink);
}

.sola-pill.active {
  background: var(--sola-ink);
  color: #ffffff;
  border-color: var(--sola-ink);
}

.sola-card {
  background: var(--sola-surface);
  border: 1px solid var(--sola-border);
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 240ms ease, border-color 200ms ease;
}

.sola-card:hover {
  transform: translateY(-4px);
  border-color: #d6c9b8;
  box-shadow: 0 18px 36px rgba(28, 25, 23, 0.08);
}

.sola-search {
  border: 1px solid var(--sola-border);
  background: var(--sola-surface);
  color: var(--sola-ink);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 13px;
  min-width: 210px;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.sola-search:focus {
  border-color: var(--sola-accent);
  box-shadow: 0 0 0 3px rgba(200, 90, 50, 0.14);
}

.sola-hero-photo {
  width: 100%;
  height: 100%;
  min-height: 360px;
  object-fit: cover;
  display: block;
  transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
}

.sola-hero-frame:hover .sola-hero-photo {
  transform: scale(1.03);
}`;

const DATA_JS = `export const assetUrl = (path) =>
  (typeof window !== 'undefined' && window.__WF_ORIGIN__ ? window.__WF_ORIGIN__ : '') + path;

export const HERO_IMAGE = '/assets/demos/sola-hero.jpg';

export const FREE_SHIPPING_THRESHOLD = 120;

export const PRODUCTS = [
  {
    id: 'p1',
    sku: 'SL-1401',
    name: 'Kyoto Pour-Over Dripper',
    category: 'Coffee',
    glaze: 'Speckled Iron Sand',
    price: 68,
    accent: '#c85a32',
    shape: 'dripper',
    dimensions: '11.8 cm Ø × 9.4 cm H',
    clay: 'Coarse Shigaraki Iron Clay',
    firing: '1,280°C Wood-Ash Reduction',
    notes: 'Spiral interior ribs regulate bloom extraction while thick stoneware walls retain thermal stability across a 3-minute pour.'
  },
  {
    id: 'p2',
    sku: 'SL-1402',
    name: 'Kanso Espresso Duo',
    category: 'Coffee',
    glaze: 'Warm Oat Matte',
    price: 54,
    accent: '#8d6e53',
    shape: 'cup',
    dimensions: '6.8 cm Ø × 6.2 cm H (90 ml)',
    clay: 'Washed Bizen Stoneware',
    firing: '1,260°C Satin Reduction',
    notes: 'Set of two handle-balanced demitasse cups with an unglazed raw clay foot ring that warms comfortably in the palm.'
  },
  {
    id: 'p3',
    sku: 'SL-1403',
    name: 'Aomori Ramen Bowl',
    category: 'Tableware',
    glaze: 'Kiln Ash Charcoal',
    price: 76,
    accent: '#4a453f',
    shape: 'bowl',
    dimensions: '20.5 cm Ø × 9.0 cm H',
    clay: 'Dark Manganese Stoneware',
    firing: '1,280°C Natural Ash Drift',
    notes: 'Deep architectural profile with subtle throwing rings and a flared lip designed for broth aromatics and daily table service.'
  },
  {
    id: 'p4',
    sku: 'SL-1404',
    name: 'Sora Ikebana Vessel',
    category: 'Vases',
    glaze: 'Raw Terracotta Clay',
    price: 112,
    accent: '#b86b4b',
    shape: 'vase',
    dimensions: '13.5 cm Ø × 24.0 cm H',
    clay: 'Unrefined Red Tokoname Clay',
    firing: '1,240°C Slow Oxidation',
    notes: 'Hand-pulled tapered neck made to hold a single quince branch or dried meadow grass without a frog pin.'
  },
  {
    id: 'p5',
    sku: 'SL-1405',
    name: 'Arashiyama Matcha Chawan',
    category: 'Coffee',
    glaze: 'Moss Feldspar Mist',
    price: 84,
    accent: '#5d6b58',
    shape: 'bowl',
    dimensions: '12.4 cm Ø × 7.8 cm H',
    clay: 'Blended Kyoto Buff Clay',
    firing: '1,275°C Wood-Kiln Middle Shelf',
    notes: 'Wide bamboo-whisk floor paired with a gently undulating hand-trimmed rim for quiet morning tea rituals.'
  },
  {
    id: 'p6',
    sku: 'SL-1406',
    name: 'Nara Serving Platter',
    category: 'Tableware',
    glaze: 'Alabaster Chalk',
    price: 94,
    accent: '#9c8b78',
    shape: 'platter',
    dimensions: '31.0 cm Ø × 2.8 cm H',
    clay: 'High-Grog Architectural Clay',
    firing: '1,280°C Reduction',
    notes: 'Low-rimmed centerpiece platter slab-built and wheel-finished for seasonal figs, sourdough, and shared family dishes.'
  }
];

export const KILN_STATS = [
  { label: 'Firing Peak', value: '1,280°C', note: '48-hour wood-ash reduction' },
  { label: 'Batch Size', value: '60 pcs', note: 'Hand-stamped & numbered' },
  { label: 'Lead-Free', value: '100%', note: 'In-house mineral glazes' }
];`;

const NAVBAR_JSX = `import React from 'react';

export function Navbar({ cartCount, onOpenCart }) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 30,
      background: 'rgba(247, 244, 239, 0.94)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #e5ddd1'
    }}>
      <div
        data-shipping-banner="true"
        style={{
          background: '#1c1917',
          color: '#f7f4ef',
          textAlign: 'center',
          fontSize: 12,
          letterSpacing: '0.04em',
          padding: '8px 16px',
          fontWeight: 500
        }}
      >
        Complimentary studio shipping on orders over $120 — Hand-packed in Kyoto
      </div>
      <div style={{
        maxWidth: 1160,
        margin: '0 auto',
        padding: '15px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#1c1917' }}>
          <span style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: '#c85a32',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: 'Georgia, serif',
            fontWeight: 700,
            fontSize: 14
          }}>S</span>
          <span className="font-serif-editorial" style={{ fontSize: 21, letterSpacing: '-0.015em', fontWeight: 600 }}>
            Sola Ceramic Studio
          </span>
        </a>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 13, color: '#6b6259' }}>
          <a href="#collection" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500 }}>Collection</a>
          <a href="#craft" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500 }}>Kiln Notes</a>
          <a href="#dispatch" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500 }}>Release List</a>
          <button
            id="solaCartTrigger"
            type="button"
            onClick={onOpenCart}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#1c1917',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <span>Bag</span>
            <span className="tabular-nums" style={{
              background: '#c85a32',
              color: '#fff',
              borderRadius: 999,
              minWidth: 20,
              height: 20,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              padding: '0 6px'
            }}>{cartCount}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}`;

const CART_DRAWER_JSX = `import React, { useState } from 'react';
import { FREE_SHIPPING_THRESHOLD } from '../data';

export function CartDrawer({ open, items, onClose, onUpdateQty, onClearCart }) {
  const [checkedOut, setCheckedOut] = useState(false);
  if (!open) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

  const handleReserve = () => {
    setCheckedOut(true);
    setTimeout(() => {
      onClearCart();
    }, 1800);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(28, 25, 23, 0.48)',
        display: 'flex',
        justifyContent: 'flex-end'
      }}
      onClick={() => { setCheckedOut(false); onClose(); }}
    >
      <aside
        aria-label="Your Studio Bag"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          height: '100%',
          background: '#f7f4ef',
          borderLeft: '1px solid #e5ddd1',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflowY: 'auto'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid #e5ddd1' }}>
            <h2 className="font-serif-editorial" style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Your Studio Bag</h2>
            <button
              type="button"
              onClick={() => { setCheckedOut(false); onClose(); }}
              style={{ background: 'transparent', border: '1px solid #e5ddd1', borderRadius: 999, padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: '#1c1917' }}
            >
              Close
            </button>
          </div>

          <div style={{ marginTop: 16, background: '#efe9df', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 12, color: '#1c1917', fontWeight: 500, marginBottom: 8 }}>
              {remaining === 0
                ? 'Unlocked: Complimentary Kyoto cedar-shaving shipping'
                : 'Add $' + remaining.toFixed(2) + ' more for complimentary studio shipping'}
            </div>
            <div style={{ height: 5, background: '#ddd3c4', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: progressPct + '%', background: '#c85a32', borderRadius: 999, transition: 'width 260ms ease' }} />
            </div>
          </div>

          {items.length === 0 ? (
            <p style={{ color: '#6b6259', marginTop: 32, fontSize: 14, lineHeight: 1.6 }}>
              Your bag is empty. Select a small-batch stoneware piece from the studio collection.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
              {items.map((item) => (
                <div key={item.id} style={{
                  background: '#ffffff',
                  border: '1px solid #e5ddd1',
                  borderRadius: 14,
                  padding: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1c1917' }}>{item.name}</div>
                    <div style={{ color: '#6b6259', fontSize: 12, marginTop: 2 }}>{item.glaze} · {'$' + item.price.toFixed(2)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      aria-label={'Decrease quantity of ' + item.name}
                      onClick={() => onUpdateQty(item.id, -1)}
                      style={{ width: 28, height: 28, borderRadius: 999, border: '1px solid #e5ddd1', background: '#f7f4ef', cursor: 'pointer', fontWeight: 600 }}
                    >-</button>
                    <span className="tabular-nums" style={{ fontSize: 13, fontWeight: 600, minWidth: 18, textAlign: 'center' }}>{item.qty}</span>
                    <button
                      type="button"
                      aria-label={'Increase quantity of ' + item.name}
                      onClick={() => onUpdateQty(item.id, 1)}
                      style={{ width: 28, height: 28, borderRadius: 999, border: '1px solid #e5ddd1', background: '#f7f4ef', cursor: 'pointer', fontWeight: 600 }}
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #e5ddd1', paddingTop: 18, marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#6b6259' }}>
            <span>Shipping</span>
            <span>{remaining === 0 && subtotal > 0 ? 'Complimentary' : '$14.00'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 16, fontWeight: 600 }}>
            <span>Subtotal</span>
            <span className="tabular-nums">{'$' + subtotal.toFixed(2)}</span>
          </div>
          {checkedOut ? (
            <div style={{ background: '#e7f3ea', color: '#1d5e2c', padding: 13, borderRadius: 12, fontSize: 13, textAlign: 'center', fontWeight: 600 }}>
              Kiln batch reservation confirmed — check your studio receipt.
            </div>
          ) : (
            <button
              type="button"
              disabled={items.length === 0}
              onClick={handleReserve}
              className="sola-btn-primary"
              style={{ width: '100%' }}
            >
              {items.length === 1 ? 'Reserve Piece' : 'Reserve Pieces'}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}`;

const APP_JSX = `import React, { useEffect, useRef, useState } from 'react';
import { Navbar } from './components/Navbar';
import { CartDrawer } from './components/CartDrawer';
import { assetUrl, HERO_IMAGE, KILN_STATS, PRODUCTS } from './data';

function VesselIllustration({ accent, shape }) {
  return (
    <div style={{
      height: 196,
      background: 'linear-gradient(155deg, #efe9df 0%, #e4dacb 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      <svg width="124" height="124" viewBox="0 0 120 120" aria-hidden="true">
        <ellipse cx="60" cy="100" rx="34" ry="8" fill="rgba(28,25,23,0.12)" />
        {shape === 'dripper' && (
          <>
            <path d="M32 36 L88 36 L70 84 L50 84 Z" fill={accent} />
            <rect x="42" y="84" width="36" height="10" rx="5" fill="#1c1917" />
          </>
        )}
        {shape === 'cup' && (
          <>
            <path d="M36 42 H76 V76 C76 89 67 96 56 96 C45 96 36 89 36 76 Z" fill={accent} />
            <path d="M76 50 H86 C92 50 94 64 86 68 H76" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" />
          </>
        )}
        {shape === 'bowl' && (
          <path d="M22 52 H98 C96 82 79 96 60 96 C41 96 24 82 22 52 Z" fill={accent} />
        )}
        {shape === 'vase' && (
          <path d="M48 24 H72 L68 44 C82 54 86 78 76 95 H44 C34 78 38 54 52 44 Z" fill={accent} />
        )}
        {shape === 'platter' && (
          <>
            <ellipse cx="60" cy="70" rx="44" ry="14" fill={accent} />
            <ellipse cx="60" cy="67" rx="34" ry="9" fill="rgba(247,244,239,0.28)" />
          </>
        )}
      </svg>
    </div>
  );
}

export default function App() {
  const rootRef = useRef(null);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickView, setQuickView] = useState(null);
  const [addedId, setAddedId] = useState('');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const gsap = window.gsap;
    if (!gsap || !rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.sola-reveal', {
        y: 18,
        opacity: 0,
        duration: 0.65,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'transform,opacity'
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const visibleProducts = PRODUCTS.filter((p) => {
    const matchCat = category === 'All' || p.category === category;
    const q = query.trim().toLowerCase();
    const matchQuery = !q || p.name.toLowerCase().includes(q) || p.glaze.toLowerCase().includes(q);
    return matchCat && matchQuery;
  });

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setAddedId(product.id);
    setTimeout(() => setAddedId((cur) => (cur === product.id ? '' : cur)), 900);
  };

  const updateQty = (id, delta) => {
    setCart((prev) => prev
      .map((item) => item.id === id ? { ...item, qty: item.qty + delta } : item)
      .filter((item) => item.qty > 0));
  };

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const handleDispatchSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;
    setSubscribed(true);
    setEmail('');
  };

  return (
    <div id="top" ref={rootRef} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar cartCount={cartCount} onOpenCart={() => setDrawerOpen(true)} />

      <main style={{ flex: 1, maxWidth: 1160, width: '100%', margin: '0 auto', padding: '44px 24px 80px' }}>
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 40,
          alignItems: 'center',
          paddingBottom: 52,
          borderBottom: '1px solid #e5ddd1'
        }}>
          <div className="sola-reveal">
            <span style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#c85a32',
              fontWeight: 700
            }}>Autumn Firing · Edition 14</span>
            <h1 className="font-serif-editorial" style={{
              fontSize: 'clamp(36px, 4.6vw, 56px)',
              lineHeight: 1.06,
              letterSpacing: '-0.02em',
              margin: '14px 0 18px',
              fontWeight: 500
            }}>
              Small-batch stoneware thrown for daily rituals.
            </h1>
            <p style={{ color: '#6b6259', fontSize: 16, lineHeight: 1.68, maxWidth: 490, margin: '0 0 26px' }}>
              Wheel-thrown in Shigaraki clay and wood-fired over 48 hours. Each vessel carries quiet variations in mineral ash and glaze depth.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <a href="#collection" className="sola-btn-primary">Explore Collection</a>
              <button type="button" className="sola-pill" onClick={() => setDrawerOpen(true)}>
                View Studio Bag ({cartCount})
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 16,
              marginTop: 34,
              paddingTop: 22,
              borderTop: '1px solid #e5ddd1'
            }}>
              {KILN_STATS.map((stat) => (
                <div key={stat.label}>
                  <div className="font-serif-editorial tabular-nums" style={{ fontSize: 22, fontWeight: 600, color: '#1c1917' }}>{stat.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#c85a32', marginTop: 2 }}>{stat.label}</div>
                  <div style={{ fontSize: 11, color: '#6b6259', marginTop: 2 }}>{stat.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="sola-reveal sola-hero-frame"
            style={{
              background: '#efe9df',
              border: '1px solid #e5ddd1',
              borderRadius: 22,
              overflow: 'hidden',
              boxShadow: '0 24px 50px rgba(28, 25, 23, 0.08)'
            }}
          >
            <img
              src={assetUrl(HERO_IMAGE)}
              alt="Sola Ceramic Studio handcrafted stoneware collection in morning light"
              className="sola-hero-photo"
            />
            <div style={{
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
              color: '#6b6259',
              background: '#f7f4ef',
              borderTop: '1px solid #e5ddd1'
            }}>
              <span>Hand-numbered kiln batch · Kyoto Atelier</span>
              <span style={{ color: '#c85a32', fontWeight: 600 }}>Ships in cedar shavings</span>
            </div>
          </div>
        </section>

        <section id="collection" style={{ paddingTop: 48 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 28
          }}>
            <div>
              <h2 className="font-serif-editorial" style={{ margin: 0, fontSize: 30, fontWeight: 500 }}>Studio Collection</h2>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b6259' }}>
                Showing {visibleProducts.length} of {PRODUCTS.length} numbered stoneware pieces
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search vessel or glaze..."
                aria-label="Search ceramic pieces"
                className="sola-search"
              />
              {['All', 'Coffee', 'Tableware', 'Vases'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  data-filter-cat={cat}
                  onClick={() => setCategory(cat)}
                  className={'sola-pill ' + (category === cat ? 'active' : '')}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: 22
          }}>
            {visibleProducts.map((product) => {
              const isJustAdded = addedId === product.id;
              return (
                <article key={product.id} className="sola-card" data-product-card={product.id}>
                  <VesselIllustration accent={product.accent} shape={product.shape} />
                  <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b6259' }}>
                        <span>{product.category} · {product.glaze}</span>
                        <span className="tabular-nums">{product.sku}</span>
                      </div>
                      <h3 className="font-serif-editorial" style={{ margin: '8px 0 8px', fontSize: 21, fontWeight: 500 }}>
                        {product.name}
                      </h3>
                      <p style={{ margin: '0 0 18px', fontSize: 13, color: '#6b6259', lineHeight: 1.55 }}>
                        {product.notes}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 12, borderTop: '1px solid #f0e9df' }}>
                      <span className="tabular-nums" style={{ fontWeight: 600, fontSize: 16 }}>{'$' + product.price.toFixed(2)}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => setQuickView(product)}
                          className="sola-pill"
                          style={{ padding: '7px 12px', fontSize: 12 }}
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          data-add-id={product.id}
                          onClick={() => addToCart(product)}
                          className="sola-btn-primary"
                          style={{ padding: '7px 14px', fontSize: 12, background: isJustAdded ? '#2e6a40' : undefined, borderColor: isJustAdded ? '#2e6a40' : undefined }}
                        >
                          {isJustAdded ? 'Added' : 'Add to Bag'}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="craft" style={{
          marginTop: 64,
          background: '#1c1917',
          color: '#f7f4ef',
          borderRadius: 22,
          padding: '38px 40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 28,
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#e2a38b', fontWeight: 700 }}>
              Kiln Craftsmanship
            </div>
            <h3 className="font-serif-editorial" style={{ margin: '10px 0 10px', fontSize: 28, fontWeight: 500, lineHeight: 1.2 }}>
              Fired at 1,280°C for heirloom density
            </h3>
            <p style={{ margin: 0, color: '#c4bab0', fontSize: 14, lineHeight: 1.65 }}>
              Every vessel is wedged from raw Shigaraki iron clay, trimmed leather-hard, and glazed in mineral suspensions blended in-house—dishwasher-safe and built to patina gracefully over decades.
            </p>
          </div>

          <div id="dispatch" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Kiln Release Dispatch</div>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: '#c4bab0', lineHeight: 1.5 }}>
              Receive early access 24 hours before Edition 15 unloads from the kiln.
            </p>
            {subscribed ? (
              <div style={{ background: 'rgba(134, 211, 159, 0.16)', color: '#a7f3c0', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500 }}>
                You are on the Edition 15 preview list.
              </div>
            ) : (
              <form onSubmit={handleDispatchSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@studio.com"
                  aria-label="Email address for kiln release alerts"
                  style={{
                    flex: 1,
                    minWidth: 160,
                    padding: '10px 14px',
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.25)',
                    color: '#ffffff',
                    fontSize: 13,
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: '#c85a32',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 999,
                    padding: '10px 18px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Notify Me
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      {quickView && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 65,
            background: 'rgba(28, 25, 23, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
          onClick={() => setQuickView(null)}
        >
          <div
            role="dialog"
            aria-label={quickView.name}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 500,
              background: '#f7f4ef',
              borderRadius: 20,
              border: '1px solid #e5ddd1',
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(0,0,0,0.25)'
            }}
          >
            <VesselIllustration accent={quickView.accent} shape={quickView.shape} />
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c85a32', fontWeight: 700 }}>
                    {quickView.category} · {quickView.sku}
                  </div>
                  <h3 className="font-serif-editorial" style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 500 }}>{quickView.name}</h3>
                </div>
                <span className="tabular-nums" style={{ fontSize: 18, fontWeight: 600 }}>{'$' + quickView.price.toFixed(2)}</span>
              </div>
              <p style={{ color: '#6b6259', fontSize: 14, lineHeight: 1.6, margin: '14px 0 18px' }}>{quickView.notes}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#efe9df', padding: 14, borderRadius: 12, fontSize: 12 }}>
                <div><strong style={{ display: 'block', color: '#1c1917' }}>Dimensions</strong><span style={{ color: '#6b6259' }}>{quickView.dimensions}</span></div>
                <div><strong style={{ display: 'block', color: '#1c1917' }}>Clay Body</strong><span style={{ color: '#6b6259' }}>{quickView.clay}</span></div>
                <div><strong style={{ display: 'block', color: '#1c1917' }}>Glaze Finish</strong><span style={{ color: '#6b6259' }}>{quickView.glaze}</span></div>
                <div><strong style={{ display: 'block', color: '#1c1917' }}>Firing Profile</strong><span style={{ color: '#6b6259' }}>{quickView.firing}</span></div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" className="sola-pill" onClick={() => setQuickView(null)}>Close</button>
                <button
                  type="button"
                  className="sola-btn-primary"
                  onClick={() => {
                    addToCart(quickView);
                    setQuickView(null);
                    setDrawerOpen(true);
                  }}
                >
                  Add to Bag & View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CartDrawer
        open={drawerOpen}
        items={cart}
        onClose={() => setDrawerOpen(false)}
        onUpdateQty={updateQty}
        onClearCart={() => setCart([])}
      />
    </div>
  );
}`;

export const DEMO_SOLA_CERAMIC = {
  id: 'demo-sola-ceramic',
  name: 'Sola Ceramic Studio',
  icon: 'shopping-bag',
  accent: '#c85a32',
  tagline: 'Editorial Kyoto stoneware storefront — built & verified in WebForge',
  vfs: {
    'src/main.jsx': MAIN_JSX,
    'src/index.css': INDEX_CSS,
    'src/data.js': DATA_JS,
    'src/components/Navbar.jsx': NAVBAR_JSX,
    'src/components/CartDrawer.jsx': CART_DRAWER_JSX,
    'src/App.jsx': APP_JSX,
  },
};
