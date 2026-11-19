/**
 * WebForge Studio — Flagship Starter 2: MAISON VÉRA (Minimalist Luxury Fashion)
 */

const MAIN_JSX = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(<App />);`;

const INDEX_CSS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@400;500;600&display=swap');

:root {
  --alabaster: #F6F4F0;
  --linen: #ECE8E0;
  --ink: #161412;
  --taupe: #736C64;
  --hairline: rgba(22, 20, 18, 0.12);
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; background: var(--alabaster); color: var(--ink); }
body {
  margin: 0;
  font-family: 'DM Sans', system-ui, sans-serif;
  background: var(--alabaster);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}
.serif-editorial {
  font-family: 'Cormorant Garamond', Georgia, serif;
}
.editorial-img {
  transition: transform 900ms cubic-bezier(0.22, 1, 0.36, 1);
}
.group:hover .editorial-img {
  transform: scale(1.035);
}`;

const DATA_JS = `export const assetUrl = (path) =>
  (typeof window !== 'undefined' && window.__WF_ORIGIN__ ? window.__WF_ORIGIN__ : '') + path;

export const COLLECTION = [
  {
    id: 'coat-01',
    code: 'MV — 01',
    name: 'Brera Belted Trench Coat',
    category: 'Outerwear',
    color: 'Obsidian Virgin Wool',
    price: 2450,
    fabric: '100% Double-Faced Biella Virgin Wool · Hand-finished horn buttons',
    origin: 'Cut & sewn in Via Solferino Atelier, Milan',
    image: '/assets/demos/vera-coat.jpg',
    description: 'Sculptural double-breasted silhouette cut with dropped shoulder seams and an elongated self-tie waist belt.',
  },
  {
    id: 'dress-02',
    code: 'MV — 02',
    name: 'Lumina Liquid-Silk Column',
    category: 'Evening',
    color: 'Champagne Ivory',
    price: 1890,
    fabric: '100% Heavyweight 40-Momme Como Mulberry Silk',
    origin: 'Bias-cut in Lake Como & Milan',
    image: '/assets/demos/vera-silk.jpg',
    description: 'Fluid floor-grazing evening column engineered on the true bias for weightless movement and quiet architectural drape.',
  },
  {
    id: 'knit-03',
    code: 'MV — 03',
    name: 'Altiplano Ribbed Cashmere Knit',
    category: 'Knitwear',
    color: 'Raw Oatmeal',
    price: 1280,
    fabric: '100% Unbleached 4-Ply Inner Mongolian Cashmere',
    origin: 'Loom-knitted in Umbria, Italy',
    image: '/assets/demos/vera-knit.jpg',
    description: 'Generously proportioned fisherman-rib turtleneck spun from undyed winter cashmere with articulated raglan sleeves.',
  },
  {
    id: 'blazer-04',
    code: 'MV — 04',
    name: 'Navigli Architectural Blazer',
    category: 'Tailoring',
    color: 'Warm Limestone Taupe',
    price: 1960,
    fabric: '92% Super 160s Merino Wool, 8% Mulberry Silk',
    origin: 'Half-canvas tailored in Milan',
    image: '/assets/demos/vera-blazer.jpg',
    description: 'Razor-clean peak lapel double-breasted jacket balanced by soft natural shoulders and horn hardware.',
  },
];

export const SALONS = [
  { city: 'Milan', address: 'Via Brera 28, 20121 Milano MI', hours: 'Tue–Sat · 10:00 – 19:00' },
  { city: 'Paris', address: '14 Rue Saint-Honoré, 75001 Paris', hours: 'Tue–Sat · 10:30 – 19:00' },
  { city: 'Tokyo', address: '5-7-21 Minami-Aoyama, Minato-ku', hours: 'Wed–Sun · 11:00 – 19:30' },
  { city: 'New York', address: '118 Mercer Street, SoHo, NY', hours: 'Tue–Sat · 11:00 – 18:30' },
];`;

const APP_JSX = `import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight, ArrowUpRight, Calendar, Check, Minus, Plus,
  ShoppingBag, X, MapPin, CheckCircle2,
} from 'lucide-react';
import { assetUrl, COLLECTION, SALONS } from './data';

const SIZES = ['XS', 'S', 'M', 'L'];
const CATEGORIES = ['All', 'Outerwear', 'Evening', 'Knitwear', 'Tailoring'];

export default function App() {
  const rootRef = useRef(null);
  const [category, setCategory] = useState('All');
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [selectedSize, setSelectedSize] = useState('S');
  const [bagOpen, setBagOpen] = useState(false);
  const [bag, setBag] = useState([
    { piece: COLLECTION[0], size: 'S', qty: 1 },
  ]);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const [salonModal, setSalonModal] = useState(false);
  const [salonCity, setSalonCity] = useState('Milan');
  const [salonGuest, setSalonGuest] = useState('');
  const [salonConfirmed, setSalonConfirmed] = useState(false);

  const filtered = category === 'All'
    ? COLLECTION
    : COLLECTION.filter((item) => item.category === category);

  const bagCount = bag.reduce((sum, entry) => sum + entry.qty, 0);
  const bagSubtotal = bag.reduce((sum, entry) => sum + entry.piece.price * entry.qty, 0);

  useEffect(() => {
    if (!gsap || typeof gsap.context !== 'function') return;
    if (ScrollTrigger && typeof gsap.registerPlugin === 'function') {
      gsap.registerPlugin(ScrollTrigger);
    }

    const ctx = gsap.context(() => {
      gsap.from('.vera-hero-reveal', {
        y: 24,
        opacity: 0,
        duration: 0.95,
        stagger: 0.12,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });

      gsap.utils.toArray('.vera-scroll-reveal').forEach((el) => {
        gsap.from(el, {
          y: 26,
          opacity: 0,
          duration: 0.85,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const addToBag = (piece, size) => {
    setOrderPlaced(false);
    setBag((prev) => {
      const idx = prev.findIndex((i) => i.piece.id === piece.id && i.size === size);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, { piece, size, qty: 1 }];
    });
    setSelectedPiece(null);
    setBagOpen(true);
  };

  const updateQty = (pieceId, size, delta) => {
    setBag((prev) =>
      prev
        .map((item) =>
          item.piece.id === pieceId && item.size === size
            ? { ...item, qty: item.qty + delta }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const handleBookSalon = (e) => {
    e.preventDefault();
    if (!salonGuest.trim()) return;
    setSalonConfirmed(true);
  };

  return (
    <div ref={rootRef} className="min-h-screen bg-[#F6F4F0] text-[#161412] selection:bg-[#161412] selection:text-[#F6F4F0]">
      {/* Minimalist Gallery Header */}
      <header className="sticky top-0 z-40 border-b border-[#161412]/10 bg-[#F6F4F0]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-12">
          <nav className="hidden items-center gap-8 text-[11px] font-medium uppercase tracking-[0.22em] text-[#736C64] md:flex">
            <a href="#collection" onClick={scrollTo('collection')} className="transition-colors hover:text-[#161412]">Collection</a>
            <a href="#atelier" onClick={scrollTo('atelier')} className="transition-colors hover:text-[#161412]">Atelier</a>
            <a href="#salons" onClick={scrollTo('salons')} className="transition-colors hover:text-[#161412]">Salons</a>
          </nav>

          <a href="#hero" onClick={scrollTo('hero')} className="serif-editorial text-2xl font-medium tracking-[0.22em] text-[#161412]">
            MAISON VÉRA
          </a>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => { setSalonConfirmed(false); setSalonModal(true); }}
              className="hidden text-[11px] font-medium uppercase tracking-[0.2em] text-[#736C64] transition-colors hover:text-[#161412] sm:inline-block"
            >
              Private Salon
            </button>
            <button
              type="button"
              onClick={() => setBagOpen(true)}
              className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#161412]"
            >
              <ShoppingBag className="h-4 w-4 stroke-[1.5]" />
              <span>Bag ({bagCount})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Full-Bleed Milanese Campaign Hero */}
      <section id="hero" className="relative min-h-[88svh] overflow-hidden bg-[#1D1A17]">
        <img
          src={assetUrl('/assets/demos/vera-hero.jpg')}
          alt="Maison Vera Autumn-Winter campaign under Milan travertine colonnade"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141210]/85 via-[#141210]/25 to-transparent" />

        <div className="relative mx-auto flex min-h-[88svh] max-w-7xl flex-col justify-end px-6 pb-16 pt-32 text-[#F6F4F0] md:px-12 md:pb-24">
          <p className="vera-hero-reveal text-[11px] font-medium uppercase tracking-[0.3em] text-[#E5DDD0]">
            Autumn / Winter · Capsule IV · Milano
          </p>
          <h1 className="vera-hero-reveal serif-editorial mt-4 max-w-3xl text-5xl font-normal leading-[0.98] tracking-[-0.01em] sm:text-7xl lg:text-8xl">
            Architecture in<br />
            <span className="italic font-normal">pure cashmere.</span>
          </h1>
          <div className="vera-hero-reveal mt-8 flex flex-wrap items-center gap-6">
            <a
              href="#collection"
              onClick={scrollTo('collection')}
              className="inline-flex items-center gap-3 border border-[#F6F4F0] bg-[#F6F4F0] px-7 py-3.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#161412] transition-colors hover:bg-transparent hover:text-[#F6F4F0]"
            >
              Explore Capsule IV
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => { setSalonConfirmed(false); setSalonModal(true); }}
              className="inline-flex items-center gap-2 border-b border-[#F6F4F0]/50 pb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[#F6F4F0]/90 transition-colors hover:border-[#F6F4F0]"
            >
              Book Private Fitting
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Editorial Collection Grid */}
      <section id="collection" className="mx-auto max-w-7xl px-6 py-24 md:px-12">
        <div className="flex flex-col justify-between gap-6 border-b border-[#161412]/12 pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#736C64]">Ready-to-Wear</p>
            <h2 className="serif-editorial mt-2 text-4xl font-normal tracking-tight md:text-5xl">
              The Permanent Wardrobe
            </h2>
          </div>

          <div className="flex flex-wrap gap-1.5 md:flex-nowrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={
                  'whitespace-nowrap px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] transition-colors ' +
                  (category === cat
                    ? 'bg-[#161412] text-[#F6F4F0]'
                    : 'border border-[#161412]/15 text-[#736C64] hover:border-[#161412] hover:text-[#161412]')
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((item) => (
            <article key={item.id} className="vera-scroll-reveal group flex flex-col">
              <button
                type="button"
                onClick={() => { setSelectedPiece(item); setSelectedSize('S'); }}
                className="relative aspect-[3/4] w-full overflow-hidden bg-[#ECE8E0] text-left"
              >
                <img
                  src={assetUrl(item.image)}
                  alt={item.name}
                  className="editorial-img h-full w-full object-cover object-top"
                />
                <span className="absolute bottom-3 left-3 bg-[#F6F4F0]/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#161412] backdrop-blur">
                  {item.code}
                </span>
                <span className="absolute bottom-3 right-3 bg-[#161412] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#F6F4F0] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  Quick View
                </span>
              </button>

              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="serif-editorial text-xl font-medium text-[#161412]">{item.name}</h3>
                  <p className="mt-0.5 text-xs text-[#736C64]">{item.color}</p>
                </div>
                <span className="text-sm font-medium text-[#161412]">€{item.price.toLocaleString()}</span>
              </div>

              <button
                type="button"
                onClick={() => { setSelectedPiece(item); setSelectedSize('S'); }}
                className="mt-4 border-t border-[#161412]/12 pt-3 text-left text-[11px] font-medium uppercase tracking-[0.2em] text-[#736C64] transition-colors hover:text-[#161412]"
              >
                Select Size &amp; Acquire →
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Milanese Craftsmanship Story */}
      <section id="atelier" className="border-y border-[#161412]/10 bg-[#ECE8E0]/60 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:px-12 lg:grid-cols-12">
          <div className="vera-scroll-reveal lg:col-span-7">
            <div className="overflow-hidden bg-[#DFD9CE]">
              <img
                src={assetUrl('/assets/demos/vera-atelier.jpg')}
                alt="Raw Mongolian cashmere bolts and brass shears on travertine table in Milan"
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
          </div>

          <div className="vera-scroll-reveal lg:col-span-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#736C64]">Provenance &amp; Craft</p>
            <h2 className="serif-editorial mt-3 text-4xl font-normal leading-[1.08] md:text-5xl">
              Nothing superfluous.<br />Everything enduring.
            </h2>
            <p className="mt-6 text-sm leading-7 text-[#5A544D]">
              Every Maison Véra garment begins with single-origin undyed Mongolian cashmere, Biella double-faced wool, and heavyweight Como silk. Cut in numbered editions of sixty pieces and hand-finished in our Via Brera atelier without external logos.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-6 border-t border-[#161412]/12 pt-6">
              <div>
                <div className="serif-editorial text-3xl text-[#161412]">60</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#736C64]">Numbered pieces per cut</div>
              </div>
              <div>
                <div className="serif-editorial text-3xl text-[#161412]">100%</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#736C64]">Traceable Italian mills</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Salons */}
      <section id="salons" className="mx-auto max-w-7xl px-6 py-24 md:px-12">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#736C64]">Flagship Spaces</p>
            <h2 className="serif-editorial mt-2 text-4xl font-normal">Private Salons</h2>
          </div>
          <button
            type="button"
            onClick={() => { setSalonConfirmed(false); setSalonModal(true); }}
            className="inline-flex w-fit items-center gap-2 border border-[#161412] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#161412] transition-colors hover:bg-[#161412] hover:text-[#F6F4F0]"
          >
            <Calendar className="h-3.5 w-3.5" />
            Request Appointment
          </button>
        </div>

        <div className="mt-10 grid gap-px border border-[#161412]/12 bg-[#161412]/12 sm:grid-cols-2 lg:grid-cols-4">
          {SALONS.map((s) => (
            <div key={s.city} className="bg-[#F6F4F0] p-7">
              <div className="flex items-center justify-between">
                <h3 className="serif-editorial text-2xl font-medium">{s.city}</h3>
                <MapPin className="h-4 w-4 stroke-[1.5] text-[#736C64]" />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#5A544D]">{s.address}</p>
              <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-[#736C64]">{s.hours}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#161412]/12 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-[11px] uppercase tracking-[0.2em] text-[#736C64] sm:flex-row md:px-12">
          <span className="serif-editorial text-base tracking-[0.22em] text-[#161412]">MAISON VÉRA</span>
          <span>Milano · Paris · Tokyo · New York</span>
        </div>
      </footer>

      {/* Quick View Piece Modal */}
      {selectedPiece && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#161412]/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="grid w-full max-w-3xl overflow-hidden bg-[#F6F4F0] shadow-2xl md:grid-cols-2">
            <div className="aspect-[3/4] bg-[#ECE8E0] md:aspect-auto">
              <img src={assetUrl(selectedPiece.image)} alt={selectedPiece.name} className="h-full w-full object-cover object-top" />
            </div>
            <div className="flex flex-col p-7">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.24em] text-[#736C64]">{selectedPiece.code} · {selectedPiece.category}</span>
                <button type="button" onClick={() => setSelectedPiece(null)} aria-label="Close" className="p-1 text-[#736C64] hover:text-[#161412]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <h3 className="serif-editorial mt-3 text-3xl font-normal text-[#161412]">{selectedPiece.name}</h3>
              <p className="mt-1 text-xs text-[#736C64]">{selectedPiece.color}</p>
              <div className="mt-4 text-lg font-medium text-[#161412]">€{selectedPiece.price.toLocaleString()}</div>
              <p className="mt-4 text-xs leading-6 text-[#5A544D]">{selectedPiece.description}</p>

              <div className="mt-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#736C64]">Select Size</div>
                <div className="mt-2.5 grid grid-cols-4 gap-2">
                  {SIZES.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={
                        'py-2.5 text-xs font-medium transition-colors ' +
                        (selectedSize === sz
                          ? 'bg-[#161412] text-[#F6F4F0]'
                          : 'border border-[#161412]/20 text-[#161412] hover:border-[#161412]')
                      }
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-1.5 border-t border-[#161412]/12 pt-4 text-[11px] text-[#736C64]">
                <div>{selectedPiece.fabric}</div>
                <div>{selectedPiece.origin}</div>
              </div>

              <button
                type="button"
                onClick={() => addToBag(selectedPiece, selectedSize)}
                className="mt-auto w-full bg-[#161412] py-3.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F6F4F0] transition-opacity hover:opacity-90"
              >
                Add to Atelier Bag — €{selectedPiece.price.toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Atelier Bag Drawer */}
      {bagOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#161412]/55 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex h-full w-full max-w-md flex-col bg-[#F6F4F0] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#161412]/12 px-6 py-5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">Atelier Bag ({bagCount})</span>
              <button type="button" onClick={() => setBagOpen(false)} aria-label="Close bag" className="p-1 text-[#736C64] hover:text-[#161412]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {orderPlaced ? (
                <div className="border border-[#161412]/15 bg-[#ECE8E0]/60 p-6 text-center">
                  <CheckCircle2 className="mx-auto h-7 w-7 stroke-[1.5] text-[#161412]" />
                  <h4 className="serif-editorial mt-3 text-2xl">Order Reserved</h4>
                  <p className="mt-2 text-xs leading-6 text-[#5A544D]">
                    Our Milan concierge has reserved your numbered pieces for white-glove courier dispatch.
                  </p>
                </div>
              ) : bag.length === 0 ? (
                <p className="py-12 text-center text-xs uppercase tracking-[0.2em] text-[#736C64]">Your bag is empty</p>
              ) : (
                <div className="space-y-5">
                  {bag.map(({ piece, size, qty }) => (
                    <div key={piece.id + size} className="flex gap-4 border-b border-[#161412]/10 pb-5">
                      <img src={assetUrl(piece.image)} alt={piece.name} className="h-24 w-20 object-cover object-top bg-[#ECE8E0]" />
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="serif-editorial text-lg leading-tight">{piece.name}</div>
                            <div className="mt-0.5 text-[11px] text-[#736C64]">{piece.color} · Size {size}</div>
                          </div>
                          <span className="text-xs font-medium">€{(piece.price * qty).toLocaleString()}</span>
                        </div>
                        <div className="mt-auto flex items-center gap-3 pt-2">
                          <button type="button" onClick={() => updateQty(piece.id, size, -1)} className="grid h-6 w-6 place-items-center border border-[#161412]/20 hover:border-[#161412]" aria-label="Decrease quantity">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-medium">{qty}</span>
                          <button type="button" onClick={() => updateQty(piece.id, size, 1)} className="grid h-6 w-6 place-items-center border border-[#161412]/20 hover:border-[#161412]" aria-label="Increase quantity">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!orderPlaced && bag.length > 0 && (
              <div className="border-t border-[#161412]/12 p-6">
                <div className="flex items-center justify-between text-xs text-[#736C64]">
                  <span>White-Glove Courier</span>
                  <span>Complimentary</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-base font-medium">
                  <span>Total</span>
                  <span>€{bagSubtotal.toLocaleString()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setOrderPlaced(true); setBag([]); }}
                  className="mt-5 w-full bg-[#161412] py-3.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F6F4F0] hover:opacity-90"
                >
                  Confirm Private Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Private Salon Appointment Modal */}
      {salonModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#161412]/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-[#F6F4F0] p-7 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#736C64]">Private Consultation</span>
              <button type="button" onClick={() => setSalonModal(false)} aria-label="Close" className="p-1 text-[#736C64] hover:text-[#161412]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <h3 className="serif-editorial mt-2 text-3xl font-normal">Reserve a Salon Fitting</h3>

            {salonConfirmed ? (
              <div className="mt-6 border border-[#161412]/15 bg-[#ECE8E0]/60 p-5 text-center">
                <Check className="mx-auto h-6 w-6 text-[#161412]" />
                <p className="mt-2 text-xs leading-6 text-[#5A544D]">
                  Thank you, <strong>{salonGuest}</strong>. Our <strong>{salonCity}</strong> salon director will confirm your private viewing shortly.
                </p>
                <button type="button" onClick={() => setSalonModal(false)} className="mt-4 w-full bg-[#161412] py-2.5 text-[11px] uppercase tracking-[0.2em] text-[#F6F4F0]">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookSalon} className="mt-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#736C64]">Select Salon</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {SALONS.map((s) => (
                      <button
                        key={s.city}
                        type="button"
                        onClick={() => setSalonCity(s.city)}
                        className={
                          'py-2 text-xs font-medium transition-colors ' +
                          (salonCity === s.city ? 'bg-[#161412] text-[#F6F4F0]' : 'border border-[#161412]/20 text-[#161412]')
                        }
                      >
                        {s.city}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#736C64]">Full Name</label>
                  <input
                    type="text"
                    required
                    value={salonGuest}
                    onChange={(e) => setSalonGuest(e.target.value)}
                    placeholder="Elena Rossi"
                    className="mt-1.5 w-full border border-[#161412]/20 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-[#161412]"
                  />
                </div>
                <button type="submit" className="w-full bg-[#161412] py-3.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F6F4F0]">
                  Request Private Viewing
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}`;

export const DEMO_MAISON_VERA = {
  id: 'demo-maison-vera',
  name: 'Maison Véra',
  icon: 'sparkles',
  accent: '#d6cfc2',
  tagline: 'Minimalist luxury Milanese fashion house',
  vfs: {
    'src/main.jsx': MAIN_JSX,
    'src/index.css': INDEX_CSS,
    'src/data.js': DATA_JS,
    'src/App.jsx': APP_JSX,
  },
};
