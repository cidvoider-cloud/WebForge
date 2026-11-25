/**
 * WebForge Studio — Stylized Architectural SVG Wireframe Thumbnails for Website Categories
 *
 * Pure, zero-dependency SVG generators styled with CSS variables so they automatically
 * adapt cleanly to both Dark Obsidian and Light Paper studio themes.
 */

export const WEBSITE_CATEGORIES = Object.freeze([
  {
    group: 'Product, Commerce & Learning',
    items: [
      { value: 'SaaS / Landing Page', title: 'SaaS / Landing', desc: 'Product hero, Bento features & pricing', key: 'saas' },
      { value: 'E-Commerce / Online Store', title: 'E-Commerce', desc: 'Storefront catalog, filters & cart drawer', key: 'ecommerce' },
      { value: 'Education / Course', title: 'Education', desc: 'Course syllabus, lessons & progress', key: 'education' },
      { value: 'Event / Conference', title: 'Event', desc: 'Schedule, speakers & ticket passes', key: 'event' },
      { value: 'Non-Profit / Charity', title: 'Non-Profit', desc: 'Mission story, impact metrics & donate', key: 'nonprofit' },
      { value: 'Church / Religious Organization', title: 'Community', desc: 'Gatherings, sermons & local groups', key: 'community' },
    ],
  },
  {
    group: 'Services & Business',
    items: [
      { value: 'Business / Corporate', title: 'Business', desc: 'Corporate, agency & consulting', key: 'business' },
      { value: 'Restaurant / Cafe', title: 'Restaurant', desc: 'Menu, gallery & table booking', key: 'restaurant' },
      { value: 'Real Estate / Property', title: 'Real Estate', desc: 'Property listings, search & map', key: 'realestate' },
      { value: 'Health / Wellness', title: 'Health & Wellness', desc: 'Clinic, spa & booking calendar', key: 'health' },
      { value: 'Law / Legal Services', title: 'Law / Legal', desc: 'Practice areas, partners & counsel', key: 'law' },
      { value: 'Gym / Fitness Studio', title: 'Gym / Fitness', desc: 'Programs, classes & memberships', key: 'fitness' },
    ],
  },
  {
    group: 'Creative & Editorial',
    items: [
      { value: 'Portfolio / Personal', title: 'Portfolio', desc: 'Case studies, index & capabilities', key: 'portfolio' },
      { value: 'Photography / Gallery', title: 'Photography', desc: 'Masonry archive & lightbox showcase', key: 'photography' },
      { value: 'Blog / Magazine', title: 'Blog / Magazine', desc: 'Editorial columns, tags & reading flow', key: 'blog' },
      { value: 'Music / Band', title: 'Music / Artist', desc: 'Releases, player & tour dates', key: 'music' },
      { value: 'Wedding / Celebration', title: 'Wedding', desc: 'Story timeline, venue & RSVP', key: 'wedding' },
      { value: 'Travel / Tourism', title: 'Travel', desc: 'Destinations, guides & itineraries', key: 'travel' },
    ],
  },
]);

function frame(inner) {
  return `<svg class="pb-cat-svg" viewBox="0 0 160 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="0.5" y="0.5" width="159" height="87" rx="6.5" fill="var(--wf-wire-bg)" stroke="var(--wf-wire-border)"/>
    <path d="M1 13.5H159" stroke="var(--wf-wire-border)"/>
    <circle cx="8" cy="7" r="1.6" fill="var(--wf-wire-muted)" opacity="0.5"/>
    <circle cx="14" cy="7" r="1.6" fill="var(--wf-wire-muted)" opacity="0.35"/>
    <circle cx="20" cy="7" r="1.6" fill="var(--wf-wire-muted)" opacity="0.25"/>
    ${inner}
  </svg>`;
}

export function getCategoryWireframeSvg(key) {
  switch (key) {
    case 'saas':
      return frame(`
        <rect x="122" y="4.5" width="28" height="5" rx="2.5" fill="var(--wf-wire-accent)"/>
        <rect x="12" y="23" width="54" height="6" rx="2" fill="var(--wf-wire-ink)" opacity="0.88"/>
        <rect x="12" y="32" width="44" height="3.5" rx="1.5" fill="var(--wf-wire-muted)" opacity="0.5"/>
        <rect x="12" y="40" width="24" height="7" rx="3" fill="var(--wf-wire-accent)"/>
        <rect x="40" y="40" width="20" height="7" rx="3" stroke="var(--wf-wire-border)" fill="var(--wf-wire-surface)"/>
        <rect x="84" y="21" width="64" height="31" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <path d="M92 44L104 35L114 39L127 28L140 32" stroke="var(--wf-wire-accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="12" y="60" width="42" height="19" rx="3.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="59" y="60" width="42" height="19" rx="3.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="106" y="60" width="42" height="19" rx="3.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
      `);
    case 'ecommerce':
      return frame(`
        <rect x="136" y="4.5" width="14" height="5" rx="2.5" fill="var(--wf-wire-accent)"/>
        <rect x="12" y="20" width="136" height="18" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="19" y="26" width="46" height="5" rx="2" fill="var(--wf-wire-ink)" opacity="0.8"/>
        <rect x="114" y="25" width="26" height="8" rx="3" fill="var(--wf-wire-accent)"/>
        <rect x="12" y="44" width="42" height="36" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="16" y="48" width="34" height="18" rx="2.5" fill="var(--wf-wire-muted)" opacity="0.18"/>
        <rect x="16" y="70" width="20" height="3.5" rx="1.5" fill="var(--wf-wire-ink)" opacity="0.7"/>
        <rect x="40" y="70" width="10" height="3.5" rx="1.5" fill="var(--wf-wire-accent)"/>
        <rect x="59" y="44" width="42" height="36" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="63" y="48" width="34" height="18" rx="2.5" fill="var(--wf-wire-muted)" opacity="0.18"/>
        <rect x="63" y="70" width="22" height="3.5" rx="1.5" fill="var(--wf-wire-ink)" opacity="0.7"/>
        <rect x="106" y="44" width="42" height="36" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="110" y="48" width="34" height="18" rx="2.5" fill="var(--wf-wire-muted)" opacity="0.18"/>
        <rect x="110" y="70" width="22" height="3.5" rx="1.5" fill="var(--wf-wire-ink)" opacity="0.7"/>
      `);
    case 'education':
      return frame(`
        <rect x="10" y="20" width="38" height="60" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="15" y="26" width="26" height="4" rx="1.5" fill="var(--wf-wire-accent)"/>
        <rect x="15" y="35" width="28" height="3.5" rx="1.5" fill="var(--wf-wire-muted)" opacity="0.5"/>
        <rect x="15" y="43" width="24" height="3.5" rx="1.5" fill="var(--wf-wire-muted)" opacity="0.4"/>
        <rect x="15" y="51" width="26" height="3.5" rx="1.5" fill="var(--wf-wire-muted)" opacity="0.35"/>
        <rect x="54" y="20" width="96" height="38" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <polygon points="97,32 110,39 97,46" fill="var(--wf-wire-accent)"/>
        <rect x="54" y="64" width="96" height="16" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="61" y="70" width="54" height="4" rx="2" fill="var(--wf-wire-accent)"/>
      `);
    case 'event':
      return frame(`
        <rect x="34" y="20" width="92" height="6" rx="2" fill="var(--wf-wire-ink)" opacity="0.88"/>
        <rect x="54" y="29" width="52" height="4" rx="2" fill="var(--wf-wire-accent)"/>
        <circle cx="32" cy="50" r="9" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <circle cx="64" cy="50" r="9" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <circle cx="96" cy="50" r="9" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <circle cx="128" cy="50" r="9" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="16" y="66" width="128" height="13" rx="3.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="22" y="70.5" width="24" height="4" rx="1.5" fill="var(--wf-wire-accent)"/>
        <rect x="52" y="70.5" width="60" height="4" rx="1.5" fill="var(--wf-wire-muted)" opacity="0.5"/>
      `);
    case 'nonprofit':
      return frame(`
        <rect x="14" y="21" width="76" height="6" rx="2" fill="var(--wf-wire-ink)" opacity="0.85"/>
        <rect x="14" y="30" width="64" height="3.5" rx="1.5" fill="var(--wf-wire-muted)" opacity="0.48"/>
        <rect x="14" y="39" width="132" height="6" rx="3" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="14" y="39" width="94" height="6" rx="3" fill="var(--wf-wire-accent)"/>
        <rect x="14" y="52" width="40" height="27" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="60" y="52" width="40" height="27" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="106" y="52" width="40" height="27" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
      `);
    case 'community':
      return frame(`
        <rect x="50" y="21" width="60" height="5.5" rx="2" fill="var(--wf-wire-ink)" opacity="0.85"/>
        <rect x="38" y="30" width="84" height="3.5" rx="1.5" fill="var(--wf-wire-muted)" opacity="0.45"/>
        <rect x="62" y="38" width="36" height="7" rx="3.5" fill="var(--wf-wire-accent)"/>
        <rect x="14" y="52" width="63" height="27" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="83" y="52" width="63" height="27" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
      `);
    case 'business':
      return frame(`
        <rect x="14" y="22" width="58" height="6" rx="2" fill="var(--wf-wire-ink)" opacity="0.88"/>
        <rect x="14" y="31" width="48" height="3.5" rx="1.5" fill="var(--wf-wire-muted)" opacity="0.5"/>
        <rect x="14" y="40" width="26" height="7" rx="2.5" fill="var(--wf-wire-accent)"/>
        <rect x="86" y="20" width="60" height="30" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="14" y="58" width="41" height="21" rx="3.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="20" y="64" width="16" height="5" rx="1.5" fill="var(--wf-wire-accent)"/>
        <rect x="59.5" y="58" width="41" height="21" rx="3.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="65.5" y="64" width="16" height="5" rx="1.5" fill="var(--wf-wire-ink)" opacity="0.7"/>
        <rect x="105" y="58" width="41" height="21" rx="3.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="111" y="64" width="16" height="5" rx="1.5" fill="var(--wf-wire-ink)" opacity="0.7"/>
      `);
    case 'restaurant':
      return frame(`
        <rect x="56" y="20" width="48" height="5.5" rx="2" fill="var(--wf-wire-ink)" opacity="0.88"/>
        <path d="M48 30H112" stroke="var(--wf-wire-accent)" stroke-width="1.2"/>
        <rect x="14" y="38" width="62" height="41" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <circle cx="45" cy="58" r="12" stroke="var(--wf-wire-accent)" stroke-width="1.5" opacity="0.8"/>
        <rect x="84" y="38" width="62" height="41" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="91" y="46" width="34" height="3.5" rx="1.5" fill="var(--wf-wire-ink)" opacity="0.7"/>
        <rect x="91" y="54" width="44" height="3" rx="1.5" fill="var(--wf-wire-muted)" opacity="0.45"/>
        <rect x="91" y="62" width="38" height="3" rx="1.5" fill="var(--wf-wire-muted)" opacity="0.45"/>
        <rect x="91" y="69" width="28" height="5.5" rx="2.5" fill="var(--wf-wire-accent)"/>
      `);
    case 'realestate':
      return frame(`
        <rect x="12" y="19" width="136" height="11" rx="3" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="122" y="21.5" width="22" height="6" rx="2" fill="var(--wf-wire-accent)"/>
        <rect x="12" y="35" width="64" height="44" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <path d="M16 54L36 44L54 62L72 48" stroke="var(--wf-wire-muted)" stroke-width="1.2" opacity="0.5"/>
        <circle cx="36" cy="44" r="3" fill="var(--wf-wire-accent)"/>
        <circle cx="56" cy="60" r="3" fill="var(--wf-wire-accent)"/>
        <rect x="82" y="35" width="66" height="20" rx="3.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="82" y="59" width="66" height="20" rx="3.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
      `);
    case 'health':
      return frame(`
        <rect x="14" y="21" width="66" height="6" rx="2" fill="var(--wf-wire-ink)" opacity="0.85"/>
        <rect x="14" y="30" width="52" height="3.5" rx="1.5" fill="var(--wf-wire-muted)" opacity="0.45"/>
        <rect x="14" y="40" width="34" height="7" rx="3.5" fill="var(--wf-wire-accent)"/>
        <rect x="92" y="20" width="54" height="59" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="99" y="27" width="40" height="5" rx="2" fill="var(--wf-wire-ink)" opacity="0.7"/>
        <rect x="99" y="37" width="18" height="10" rx="2.5" fill="var(--wf-wire-accent)" opacity="0.85"/>
        <rect x="121" y="37" width="18" height="10" rx="2.5" stroke="var(--wf-wire-border)"/>
        <rect x="99" y="51" width="18" height="10" rx="2.5" stroke="var(--wf-wire-border)"/>
        <rect x="121" y="51" width="18" height="10" rx="2.5" stroke="var(--wf-wire-border)"/>
        <rect x="14" y="56" width="70" height="23" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
      `);
    case 'law':
      return frame(`
        <rect x="34" y="22" width="92" height="6" rx="1.5" fill="var(--wf-wire-ink)" opacity="0.88"/>
        <rect x="48" y="31" width="64" height="3.5" rx="1.5" fill="var(--wf-wire-muted)" opacity="0.48"/>
        <rect x="14" y="43" width="40" height="36" rx="2.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="20" y="49" width="18" height="3" fill="var(--wf-wire-accent)"/>
        <rect x="60" y="43" width="40" height="36" rx="2.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="66" y="49" width="18" height="3" fill="var(--wf-wire-accent)"/>
        <rect x="106" y="43" width="40" height="36" rx="2.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="112" y="49" width="18" height="3" fill="var(--wf-wire-accent)"/>
      `);
    case 'fitness':
      return frame(`
        <rect x="12" y="19" width="136" height="25" rx="3.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="20" y="25" width="64" height="6" rx="1.5" fill="var(--wf-wire-ink)" opacity="0.9"/>
        <rect x="112" y="27" width="28" height="9" rx="2.5" fill="var(--wf-wire-accent)"/>
        <rect x="12" y="50" width="31" height="29" rx="3" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="47" y="50" width="31" height="29" rx="3" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="82" y="50" width="31" height="29" rx="3" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="117" y="50" width="31" height="29" rx="3" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
      `);
    case 'portfolio':
      return frame(`
        <rect x="14" y="21" width="94" height="8" rx="2" fill="var(--wf-wire-ink)" opacity="0.9"/>
        <rect x="14" y="33" width="54" height="3.5" rx="1.5" fill="var(--wf-wire-accent)"/>
        <rect x="14" y="43" width="76" height="36" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="96" y="43" width="50" height="36" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
      `);
    case 'photography':
      return frame(`
        <rect x="12" y="20" width="42" height="36" rx="3" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="12" y="60" width="42" height="20" rx="3" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="59" y="20" width="42" height="22" rx="3" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="59" y="46" width="42" height="34" rx="3" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-accent)" opacity="0.85"/>
        <rect x="106" y="20" width="42" height="32" rx="3" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="106" y="56" width="42" height="24" rx="3" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
      `);
    case 'blog':
      return frame(`
        <rect x="14" y="20" width="84" height="34" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="20" y="39" width="58" height="5" rx="1.5" fill="var(--wf-wire-ink)" opacity="0.85"/>
        <rect x="14" y="60" width="84" height="19" rx="3.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="105" y="20" width="41" height="59" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="111" y="27" width="26" height="3.5" rx="1.5" fill="var(--wf-wire-accent)"/>
        <rect x="111" y="36" width="29" height="3" rx="1.5" fill="var(--wf-wire-muted)" opacity="0.5"/>
        <rect x="111" y="45" width="24" height="3" rx="1.5" fill="var(--wf-wire-muted)" opacity="0.45"/>
        <rect x="111" y="54" width="28" height="3" rx="1.5" fill="var(--wf-wire-muted)" opacity="0.4"/>
      `);
    case 'music':
      return frame(`
        <rect x="14" y="21" width="38" height="38" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-accent)"/>
        <circle cx="33" cy="40" r="10" stroke="var(--wf-wire-accent)" stroke-width="1.5"/>
        <circle cx="33" cy="40" r="2.5" fill="var(--wf-wire-accent)"/>
        <rect x="60" y="24" width="60" height="5.5" rx="2" fill="var(--wf-wire-ink)" opacity="0.85"/>
        <rect x="60" y="34" width="86" height="6" rx="2" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="60" y="45" width="86" height="6" rx="2" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="14" y="66" width="132" height="13" rx="3.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="22" y="71" width="66" height="3" rx="1.5" fill="var(--wf-wire-accent)"/>
      `);
    case 'wedding':
      return frame(`
        <rect x="24" y="20" width="112" height="44" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="52" y="30" width="56" height="5" rx="2" fill="var(--wf-wire-ink)" opacity="0.85"/>
        <path d="M62 41H98" stroke="var(--wf-wire-accent)" stroke-width="1.2"/>
        <rect x="64" y="48" width="32" height="7" rx="3.5" fill="var(--wf-wire-accent)"/>
        <rect x="34" y="70" width="92" height="9" rx="3" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
      `);
    case 'travel':
      return frame(`
        <rect x="12" y="19" width="136" height="28" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="20" y="27" width="68" height="5.5" rx="2" fill="var(--wf-wire-ink)" opacity="0.88"/>
        <rect x="20" y="36" width="92" height="6" rx="3" fill="var(--wf-wire-bg)" stroke="var(--wf-wire-border)"/>
        <rect x="116" y="36" width="24" height="6" rx="3" fill="var(--wf-wire-accent)"/>
        <rect x="12" y="53" width="42" height="26" rx="3.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="59" y="53" width="42" height="26" rx="3.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
        <rect x="106" y="53" width="42" height="26" rx="3.5" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
      `);
    default:
      return frame(`
        <rect x="14" y="22" width="68" height="6" rx="2" fill="var(--wf-wire-ink)" opacity="0.85"/>
        <rect x="14" y="33" width="132" height="45" rx="4" fill="var(--wf-wire-surface)" stroke="var(--wf-wire-border)"/>
      `);
  }
}
