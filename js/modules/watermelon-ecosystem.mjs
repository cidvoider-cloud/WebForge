/**
 * WebForge Studio — Watermelon UI Six-Collection Ecosystem Engine
 *
 * Pure, DOM-free module (shared by server catalog engine, client UI Library Studio,
 * Prompt Studio Step 1 & Mix & Match, Section Swapper, Skill Manager, and unit tests).
 *
 * Covers all 6 Watermelon UI collections:
 *   1. Animated   — motion-powered micro-interactions, docks, disclosures, widgets
 *   2. Components — core shadcn/Radix UI primitives
 *   3. Blocks     — 22 full-width page-section categories (Hero, Footer, Auth, Bento, Pricing, etc.)
 *   4. Dashboards — full multi-panel application dashboards (Agndex, Astrix, Bionis, Capitalio, etc.)
 *   5. Templates  — complete multi-section full-page templates (Landing 01, Real Estate, etc.)
 *   6. Resources  — curated Watermelon UI recipes & CLI/MCP/llms.txt patterns toggleable as AI Skills
 */

export const WATERMELON_COLLECTIONS = Object.freeze([
  { id: 'all', label: 'All', icon: 'layers', desc: 'Complete ui.watermelon.sh catalog' },
  { id: 'animated', label: 'Animated', icon: 'sparkles', desc: 'Motion-powered interactive UI & micro-interactions' },
  { id: 'components', label: 'Components', icon: 'component', desc: 'Core Radix, Base UI & shadcn primitives' },
  { id: 'blocks', label: 'Blocks', icon: 'layout-template', desc: '22 modular page-section block categories' },
  { id: 'dashboards', label: 'Dashboards', icon: 'layout-dashboard', desc: 'Complete interactive dashboard layouts & app shells' },
  { id: 'templates', label: 'Templates', icon: 'panels-top-left', desc: 'Full-page multi-section website starters' },
]);

export const WATERMELON_BLOCK_CATEGORIES = Object.freeze([
  { id: 'all', label: 'All Blocks', slot: '' },
  { id: 'hero', label: 'Hero', slot: 'hero' },
  { id: 'navigation', label: 'Navigation', slot: 'navbar' },
  { id: 'feature', label: 'Feature', slot: 'features' },
  { id: 'bento', label: 'Bento', slot: 'features' },
  { id: 'pricing', label: 'Pricing', slot: 'cards' },
  { id: 'testimonials', label: 'Testimonials', slot: 'cards' },
  { id: 'stats', label: 'Stats', slot: 'cards' },
  { id: 'cta', label: 'CTA', slot: 'cta' },
  { id: 'faq', label: 'FAQ', slot: 'features' },
  { id: 'footer', label: 'Footer', slot: 'footer' },
  { id: 'auth', label: 'Auth', slot: 'cards' },
  { id: 'announcement', label: 'Announcement', slot: 'navbar' },
  { id: 'blog', label: 'Blog', slot: 'cards' },
  { id: 'career', label: 'Career', slot: 'cards' },
  { id: 'contact', label: 'Contact', slot: 'cta' },
  { id: 'error', label: 'Error', slot: 'hero' },
  { id: 'file-upload', label: 'File Upload', slot: 'cards' },
  { id: 'integrations', label: 'Integrations', slot: 'features' },
  { id: 'newsletter', label: 'Newsletter', slot: 'cta' },
  { id: 'notification', label: 'Notification', slot: 'cards' },
  { id: 'team', label: 'Team', slot: 'cards' },
  { id: 'widget', label: 'Widget', slot: 'cards' },
]);

const BLOCK_SLUG_PATTERNS = [
  ['announcement', /^announcement(?:[-_]|$)/i],
  ['auth', /^(?:auth|login|signin|sign-in|signup|sign-up)(?:[-_]|$)/i],
  ['bento', /^bento(?:[-_]|$)/i],
  ['blog', /^blog(?:[-_]|$)/i],
  ['career', /^career(?:s)?(?:[-_]|$)/i],
  ['contact', /^contact(?:[-_]|$)/i],
  ['cta', /^cta(?:[-_]|$)/i],
  ['error', /^(?:error|not-found|404)(?:[-_]|$)/i],
  ['faq', /^faq(?:[-_]|$)/i],
  ['feature', /^feature(?:s)?(?:[-_]|$)/i],
  ['file-upload', /^file-upload(?:[-_]|$)/i],
  ['footer', /^footer(?:[-_]|$)/i],
  ['hero', /^hero(?:[-_\d]|$)/i],
  ['integrations', /^integration(?:s)?(?:[-_]|$)/i],
  ['navigation', /^(?:navigation|navbar|nav-bar|header)(?:[-_]|$)/i],
  ['newsletter', /^newsletter(?:[-_]|$)/i],
  ['notification', /^notification(?:s)?(?:[-_]|$)/i],
  ['pricing', /^pricing(?:[-_]|$)/i],
  ['stats', /^stat(?:s)?(?:[-_]|$)/i],
  ['team', /^team(?:[-_]|$)/i],
  ['testimonials', /^testimonial(?:s)?(?:[-_]|$)/i],
  ['widget', /^widget(?:[-_]|$)/i],
];

const CORE_PRIMITIVE_PREFIXES = new Set([
  'accordion',
  'alert',
  'alert-dialog',
  'aspect-ratio',
  'avatar',
  'badge',
  'breadcrumb',
  'button',
  'button-group',
  'calendar',
  'card',
  'carousel',
  'checkbox',
  'collapsible',
  'combobox',
  'command',
  'context-menu',
  'data-table',
  'date-picker',
  'dialog',
  'drawer',
  'dropdown-menu',
  'form',
  'hover-card',
  'input',
  'input-mask',
  'input-otp',
  'kbd',
  'label',
  'menubar',
  'navigation-menu',
  'pagination',
  'popover',
  'progress',
  'radio-group',
  'radiogroup',
  'resizable',
  'scroll-area',
  'select',
  'separator',
  'sheet',
  'skeleton',
  'slider',
  'sonner',
  'spinner',
  'switch',
  'table',
  'tabs',
  'textarea',
  'toast',
  'toggle',
  'toggle-group',
  'tooltip',
]);

/**
 * Curated Watermelon UI Developer Resources & Engineering Recipes.
 * Each resource can be toggled ON/OFF directly as an active AI Skill inside WebForge.
 */
export const WATERMELON_RESOURCES = Object.freeze([
  {
    id: 'watermelon/resource-motion-physics',
    catalogId: 'watermelon-ui',
    slug: 'resource-motion-physics',
    name: 'Watermelon Motion & Spring Physics',
    category: 'tabs',
    collection: 'Resources',
    wfCollection: 'resources',
    blockCategory: '',
    resourceKind: 'Motion Recipe',
    previewMode: 'recipe-doc',
    skillId: 'wm-res-motion-physics',
    description: 'Spring-based disclosures, shared-element layoutId tabs, origin-aware popovers, and <240ms compositor motion.',
    authorName: 'Watermelon UI',
    catalogType: 'tsx',
    repoUrl: 'https://ui.watermelon.sh/docs/animated',
    dependencies: ['motion', 'lucide-react'],
    skillPrompt: `# Watermelon UI Resource — Motion & Spring Physics
Apply Watermelon UI's tactile motion grammar to interactive controls:
- Use crisp spring transitions (stiffness ~380-460, damping ~30-36) or cubic-bezier(0.22, 1, 0.36, 1) under 240ms.
- Pair active segmented tabs and nav bars with gliding active indicators rather than abrupt border jumps.
- Animate disclosures, inline trays, and expandable cards smoothly with opacity + transform (never animate layout-thrashing width/left).
- Add subtle tactile press compression (active:scale-[0.98]) on primary triggers and respect prefers-reduced-motion.`,
  },
  {
    id: 'watermelon/resource-block-rhythm',
    catalogId: 'watermelon-ui',
    slug: 'resource-block-rhythm',
    name: 'Section-by-Section Block Composition',
    category: 'hero',
    collection: 'Resources',
    wfCollection: 'resources',
    blockCategory: '',
    resourceKind: 'Layout System',
    previewMode: 'recipe-doc',
    skillId: 'wm-res-block-rhythm',
    description: 'Cohesive full-page section architecture: Navbar -> Hero -> Bento/Features -> Social Proof -> Pricing -> FAQ -> Footer.',
    authorName: 'Watermelon UI',
    catalogType: 'tsx',
    repoUrl: 'https://ui.watermelon.sh/blocks',
    dependencies: ['tailwindcss', 'lucide-react'],
    skillPrompt: `# Watermelon UI Resource — Section-by-Section Block Composition
Structure marketing and product websites using Watermelon UI's modular block rhythm:
- Maintain a consistent max-w-6xl or max-w-7xl container rhythm with 80px-112px vertical padding between major blocks.
- Alternate visual density across consecutive sections (e.g. airy centered or split Hero -> structured Bento grid -> quiet Logo/Stats strip -> crisp 3-tier Pricing -> collapsible FAQ -> clean multi-column Footer).
- Share one surface palette, border radius scale, and heading hierarchy across every block so mixed sections feel unified.
- Avoid static pill badges on passive metadata; use quiet inline typography with middot separators.`,
  },
  {
    id: 'watermelon/resource-dashboard-shell',
    catalogId: 'watermelon-ui',
    slug: 'resource-dashboard-shell',
    name: 'Dashboard App Shell & Data Viz Kit',
    category: 'tables',
    collection: 'Resources',
    wfCollection: 'resources',
    blockCategory: '',
    resourceKind: 'Dashboard Blueprint',
    previewMode: 'recipe-doc',
    skillId: 'wm-res-dashboard-shell',
    description: 'Collapsible 248px sidebar shell, sticky breadcrumb header, tabular-nums KPI strip, interactive filters & charts.',
    authorName: 'Watermelon UI',
    catalogType: 'tsx',
    repoUrl: 'https://ui.watermelon.sh/dashboards',
    dependencies: ['lucide-react', 'recharts'],
    skillPrompt: `# Watermelon UI Resource — Dashboard App Shell & Data Visualization
Follow Watermelon UI's dashboard architecture (Agndex, Capitalio, Medesk, Bionis patterns):
- Build a fixed 240px-260px left navigation rail (collapsible to a drawer on mobile) + sticky 56px top bar with breadcrumbs, search trigger, and at most 1-2 primary actions.
- Enforce tabular-nums (font-variant-numeric: tabular-nums) on every KPI counter, currency, percentage, and table column.
- Use single-elevation flat panels with 1px neutral hairline borders (never nested cards inside cards).
- Include live client-side search/filter controls, sortable data rows (36-44px height), interactive timeframe switches, and clean empty states.`,
  },
  {
    id: 'watermelon/resource-radix-a11y',
    catalogId: 'watermelon-ui',
    slug: 'resource-radix-a11y',
    name: 'Accessible Radix Primitives & Forms',
    category: 'forms',
    collection: 'Resources',
    wfCollection: 'resources',
    blockCategory: '',
    resourceKind: 'Accessibility Guide',
    previewMode: 'recipe-doc',
    skillId: 'wm-res-radix-a11y',
    description: 'Keyboard-navigable dialogs, accordions, comboboxes, OTP inputs, and inline form validation following WAI-ARIA.',
    authorName: 'Watermelon UI',
    catalogType: 'tsx',
    repoUrl: 'https://ui.watermelon.sh/components',
    dependencies: ['@radix-ui/react-dialog', 'lucide-react'],
    skillPrompt: `# Watermelon UI Resource — Accessible Radix Primitives & Forms
Build every interactive primitive with production accessibility:
- Use semantic <button type="button">, <nav>, <main>, <dialog>, and linked <label htmlFor> elements.
- Support Escape to close overlays/drawers, arrow keys for tabs/menus, and visible focus-visible rings on every control.
- Provide inline contextual validation messages beneath invalid inputs and clear disabled/loading states on submit buttons.
- Keep touch targets at least 40-44px tall with generous click padding.`,
  },
  {
    id: 'watermelon/resource-cli-registry',
    catalogId: 'watermelon-ui',
    slug: 'resource-cli-registry',
    name: 'Watermelon CLI & Registry Pattern',
    category: 'cards',
    collection: 'Resources',
    wfCollection: 'resources',
    blockCategory: '',
    resourceKind: 'CLI & Registry',
    previewMode: 'recipe-doc',
    skillId: 'wm-res-cli-registry',
    description: 'Clean modular component imports (src/components/watermelon-ui/*), cn() utility hygiene, and zero-bloat dependencies.',
    authorName: 'Watermelon UI',
    catalogType: 'tsx',
    repoUrl: 'https://ui.watermelon.sh/cli',
    dependencies: ['clsx', 'tailwind-merge', 'lucide-react'],
    skillPrompt: `# Watermelon UI Resource — CLI & Registry Architecture
Organize generated components following Watermelon UI's registry conventions:
- Keep reusable UI primitives cleanly split in src/components/ with explicit, minimal props and sensible defaults.
- Compose Tailwind utility classes cleanly without conflicting margins or duplicate responsive overrides.
- Avoid unnecessary external runtime packages when clean React state + Tailwind CSS + Lucide icons achieve the same result smoothly.`,
  },
  {
    id: 'watermelon/resource-llms-tokens',
    catalogId: 'watermelon-ui',
    slug: 'resource-llms-tokens',
    name: 'Watermelon llms.txt & Design Token Spec',
    category: 'cards',
    collection: 'Resources',
    wfCollection: 'resources',
    blockCategory: '',
    resourceKind: 'AI Context Spec',
    previewMode: 'recipe-doc',
    skillId: 'wm-res-llms-tokens',
    description: 'Compact semantic CSS token contract (--background, --surface, --border, --primary) tuned for 9B-12B local LLMs.',
    authorName: 'Watermelon UI',
    catalogType: 'tsx',
    repoUrl: 'https://ui.watermelon.sh/llms.txt',
    dependencies: ['tailwindcss'],
    skillPrompt: `# Watermelon UI Resource — llms.txt & Design Token Discipline
Apply a disciplined semantic token system tuned for crisp, consistent outputs:
- Follow a strict 60-30-10 balance: 60% calm canvas (--bg), 30% elevated structural surfaces (--surface), 10% concentrated focal accent (--accent).
- Define crisp 1px border hairlines and 2-3 surface elevation steps; avoid muddy neon glows or rainbow gradients.
- Pair Plus Jakarta Sans / Outfit / Manrope display headings with clean body copy and JetBrains Mono for technical labels and metrics.`,
  },
  {
    id: 'watermelon/resource-mcp-workflow',
    catalogId: 'watermelon-ui',
    slug: 'resource-mcp-workflow',
    name: 'Watermelon MCP & Component Remixing',
    category: 'modals',
    collection: 'Resources',
    wfCollection: 'resources',
    blockCategory: '',
    resourceKind: 'MCP Workflow',
    previewMode: 'recipe-doc',
    skillId: 'wm-res-mcp-workflow',
    description: 'How to adapt attached Watermelon components into existing projects cleanly while preserving brand tokens and state.',
    authorName: 'Watermelon UI',
    catalogType: 'tsx',
    repoUrl: 'https://ui.watermelon.sh/docs/mcp',
    dependencies: ['lucide-react'],
    skillPrompt: `# Watermelon UI Resource — Component Remixing & Surgical Integration
When integrating an attached Watermelon UI component or assembled Block blueprint:
- Preserve the component's core layout geometry, visual hierarchy, and interaction mechanics.
- Harmonize colors, typography, and spacing to match the active project's theme tokens so newly inserted components look native.
- Wire real interactive state (tabs, drawers, filters, modals, counters) and replace placeholder copy with authentic domain content.`,
  },
]);

/**
 * Curated Full-Page Templates that complement the real registry templates (landing-01, luminia-luxe-realestate).
 */
export const WATERMELON_CURATED_TEMPLATES = Object.freeze([
  {
    id: 'watermelon/template-saas-launch',
    catalogId: 'watermelon-ui',
    slug: 'template-saas-launch',
    name: 'SaaS Launchpad Template',
    category: 'hero',
    collection: 'Templates',
    wfCollection: 'templates',
    blockCategory: '',
    previewMode: 'structural-card',
    starterDomain: 'saas',
    description: 'Complete multi-section SaaS marketing starter: floating nav, split hero, Bento grid, 3-tier pricing, FAQ & footer.',
    authorName: 'Watermelon UI',
    catalogType: 'tsx',
    repoUrl: 'https://ui.watermelon.sh/templates',
    dependencies: ['lucide-react', 'motion'],
    sections: ['Navigation', 'Split Hero', 'Metrics Strip', 'Bento Features', 'Pricing Tiers', 'FAQ Accordion', 'Site Footer'],
    swatches: ['#090A0D', '#14171D', '#10B981', '#F8FAFC'],
  },
  {
    id: 'watermelon/template-ai-studio',
    catalogId: 'watermelon-ui',
    slug: 'template-ai-studio',
    name: 'AI Product Studio Template',
    category: 'hero',
    collection: 'Templates',
    wfCollection: 'templates',
    blockCategory: '',
    previewMode: 'structural-card',
    starterDomain: 'ai-product',
    description: 'Interactive AI product landing template with live prompt playground preview, workflow steps, benchmarks & waitlist CTA.',
    authorName: 'Watermelon UI',
    catalogType: 'tsx',
    repoUrl: 'https://ui.watermelon.sh/templates',
    dependencies: ['lucide-react', 'motion'],
    sections: ['Header Nav', 'Interactive Prompt Hero', 'Workflow Showcase', 'Latency Benchmarks', 'Testimonials', 'CTA Banner', 'Footer'],
    swatches: ['#0A0B10', '#141620', '#6366F1', '#F8FAFC'],
  },
  {
    id: 'watermelon/template-agency-editorial',
    catalogId: 'watermelon-ui',
    slug: 'template-agency-editorial',
    name: 'Editorial Studio Template',
    category: 'hero',
    collection: 'Templates',
    wfCollection: 'templates',
    blockCategory: '',
    previewMode: 'structural-card',
    starterDomain: 'agency',
    description: 'Warm archival agency & portfolio template with asymmetric hero, filterable case studies, studio ethos & booking drawer.',
    authorName: 'Watermelon UI',
    catalogType: 'tsx',
    repoUrl: 'https://ui.watermelon.sh/templates',
    dependencies: ['lucide-react'],
    sections: ['Minimal Nav', 'Editorial Hero', 'Selected Works Index', 'Capabilities', 'Client Notes', 'Contact Inquiry', 'Footer'],
    swatches: ['#F7F5F0', '#FFFFFF', '#B45309', '#18181B'],
  },
]);

/**
 * Curated metadata for featured Watermelon Dashboards (matches ui.watermelon.sh/dashboards).
 */
const DASHBOARD_DOMAIN_META = {
  'agndex-dashboard': { domain: 'AI Agent & API Keys Console', accent: '#10B981', palette: 'dark', kpis: [['Active Agents', '24', '+12%'], ['API Calls (24h)', '1.42M', '+18.4%'], ['Median Latency', '118ms', '-14ms'], ['Success Rate', '99.94%', '+0.08%']], nav: ['Overview', 'Agents', 'API Keys', 'Usage Logs', 'Guardrails', 'Settings'] },
  'astrix-dashboard': { domain: 'Security & Classification Ops', accent: '#6366F1', palette: 'dark', kpis: [['Scanned Assets', '48,920', '+6.2%'], ['Policy Matches', '312', '-9%'], ['Open Alerts', '7', '-3'], ['Compliance', '98.6%', '+1.1%']], nav: ['Overview', 'Classifications', 'Policies', 'Incidents', 'Audit Trail', 'Settings'] },
  'bionis-dashboard': { domain: 'Biotech & Clinical Telemetry', accent: '#06B6D4', palette: 'dark', kpis: [['Active Trials', '18', '+2'], ['Samples Logged', '12,480', '+9.4%'], ['Lab Utilization', '86.2%', '+3.1%'], ['QA Pass Rate', '99.2%', '+0.4%']], nav: ['Dashboard', 'Protocols', 'Cohorts', 'Biomarkers', 'Lab Reports', 'Team'] },
  'capitalio-dashboard': { domain: 'Treasury & Revenue Analytics', accent: '#10B981', palette: 'dark', kpis: [['Net ARR', '$2.84M', '+22.4%'], ['Cash Runway', '28 mo', '+3 mo'], ['Gross Margin', '84.1%', '+1.8%'], ['Net Burn', '$64.2K', '-8.5%']], nav: ['Overview', 'Analytics', 'Cash Flow', 'Invoices', 'Cards', 'Treasury'] },
  'demostack-dashboard': { domain: 'Interactive Demo Analytics', accent: '#F59E0B', palette: 'dark', kpis: [['Live Demos', '142', '+19%'], ['Buyer Views', '9,840', '+31%'], ['Avg. Engagement', '4m 18s', '+42s'], ['Pipeline Lift', '$610K', '+14%']], nav: ['Overview', 'Sandboxes', 'Tours', 'Engagement', 'Accounts', 'Integrations'] },
  'gridline-dashboard': { domain: 'Infrastructure & Grid Monitor', accent: '#3B82F6', palette: 'dark', kpis: [['Active Nodes', '384', '+16'], ['Throughput', '42.8 GB/s', '+11%'], ['Error Budget', '99.98%', 'Nominal'], ['Regions Online', '12 / 12', 'Healthy']], nav: ['Overview', 'Clusters', 'Deployments', 'Metrics', 'Alerts', 'Topology'] },
  'jobtracker-dashboard': { domain: 'Hiring Pipeline & ATS Tracker', accent: '#EC4899', palette: 'dark', kpis: [['Open Roles', '14', '+3'], ['Active Candidates', '286', '+24'], ['Interviews (Wk)', '31', '+8'], ['Offer Accept', '88%', '+4%']], nav: ['Pipeline', 'Candidates', 'Roles', 'Interviews', 'Scorecards', 'Analytics'] },
  'library-dashboard': { domain: 'Digital Media & Archive Hub', accent: '#8B5CF6', palette: 'dark', kpis: [['Catalog Items', '18,420', '+410'], ['Active Loans', '1,294', '+7.2%'], ['Member Check-ins', '642', '+15%'], ['Hold Queue', '58', '-12']], nav: ['Circulation', 'Catalog', 'Members', 'Reservations', 'Acquisitions', 'Reports'] },
  'medesk-dashboard': { domain: 'Clinic & Patient Operations', accent: '#14B8A6', palette: 'light', kpis: [['Today Visits', '64', '+6'], ['Avg. Wait Time', '9 min', '-3 min'], ['Active Patients', '3,812', '+4.8%'], ['Satisfaction', '4.92/5', '+0.1']], nav: ['Schedule', 'Patients', 'Encounters', 'Billing', 'Lab Orders', 'Staff'] },
  'portfolio-dashboard': { domain: 'Multi-Asset Investment Tracker', accent: '#22C55E', palette: 'dark', kpis: [['Total Balance', '$418,920', '+14.8%'], ['Day Change', '+$3,840', '+0.92%'], ['Dividend Yield', '3.45%', '+0.12%'], ['Cash Reserve', '$42,100', '10.1%']], nav: ['Holdings', 'Performance', 'Allocation', 'Watchlist', 'Dividends', 'Tax Lots'] },
  'tallie-dashboard': { domain: 'Expense & Receipt Operations', accent: '#F97316', palette: 'light', kpis: [['Monthly Spend', '$48,320', '-4.2%'], ['Pending Review', '19', '-6'], ['Auto-Matched', '94.6%', '+2.1%'], ['Reimbursed', '$39,140', 'On time']], nav: ['Expenses', 'Approvals', 'Receipts', 'Corporate Cards', 'Budgets', 'Exports'] },
  'web3-dashboard': { domain: 'On-Chain Portfolio & DeFi Desk', accent: '#A855F7', palette: 'dark', kpis: [['Total Vault TVL', '$1.92M', '+9.6%'], ['24h Yield', '+$1,482', '+5.4%'], ['Gas Estimate', '14 gwei', 'Low'], ['Active Positions', '11', '+2']], nav: ['Portfolio', 'Swaps', 'Liquidity', 'Staking', 'Governance', 'Activity'] },
};

/**
 * Classifies any Watermelon UI catalog entry into one of the 6 canonical collections:
 *   'animated' | 'components' | 'blocks' | 'dashboards' | 'templates' | 'resources'
 */
export function classifyWatermelonItem(item = {}) {
  const slug = String(item.slug || '').toLowerCase().trim();
  const sourcePath = String(item.sourcePath || '').toLowerCase();
  const existingWf = String(item.wfCollection || '').toLowerCase();
  const deps = Array.isArray(item.dependencies) ? item.dependencies.map((d) => String(d).toLowerCase()) : [];

  if (item.previewRuntime === 'watermelon-vite' && existingWf) {
    return {
      wfCollection: existingWf,
      blockCategory: item.blockCategory || (existingWf === 'blocks' ? item.subCategory || '' : ''),
      previewMode: 'watermelon-vite',
    };
  }

  if (existingWf && (WATERMELON_COLLECTIONS.some((c) => c.id === existingWf && c.id !== 'all') || existingWf === 'resources')) {
    return {
      wfCollection: existingWf,
      blockCategory: item.blockCategory || '',
      previewMode: item.previewMode || (existingWf === 'resources' ? 'recipe-doc' : (existingWf === 'dashboards' || existingWf === 'templates') ? 'structural-card' : 'live-lazy'),
    };
  }

  // 1. Resources
  if (slug.startsWith('resource-') || String(item.collection || '').toLowerCase() === 'resources') {
    return { wfCollection: 'resources', blockCategory: '', previewMode: 'recipe-doc' };
  }

  // 2. Dashboards (all src/components/dashboards/* and *-dashboard slugs)
  if (sourcePath.includes('components/dashboards/') || /dashboard$/i.test(slug)) {
    return { wfCollection: 'dashboards', blockCategory: '', previewMode: 'structural-card' };
  }

  // 3. Templates (src/components/templates/*, src/components/pages/*, landing-*, template-*)
  if (
    sourcePath.includes('components/templates/') ||
    sourcePath.includes('components/pages/') ||
    /^landing[-_]\d+/.test(slug) ||
    slug.startsWith('template-') ||
    slug.includes('realestate')
  ) {
    return { wfCollection: 'templates', blockCategory: '', previewMode: 'structural-card' };
  }

  // 4. Blocks (src/components/blocks/* OR any of the 22 canonical block slug families)
  for (const [blockCat, rx] of BLOCK_SLUG_PATTERNS) {
    if (rx.test(slug)) {
      return { wfCollection: 'blocks', blockCategory: blockCat, previewMode: 'live-lazy' };
    }
  }
  if (sourcePath.includes('components/blocks/')) {
    return { wfCollection: 'blocks', blockCategory: 'feature', previewMode: 'live-lazy' };
  }

  // 5. Components vs Animated
  const basePrefix = slug.replace(/[-_]\d+[a-z]*$/, '');
  const hasMotionDep = deps.some((d) => d === 'motion' || d.includes('framer-motion') || d.includes('number-flow'));
  const isBaseVariant = sourcePath.includes('base-variants/');
  const isPrimitivePrefix = CORE_PRIMITIVE_PREFIXES.has(basePrefix) || CORE_PRIMITIVE_PREFIXES.has(slug);

  if (hasMotionDep || (!isPrimitivePrefix && !isBaseVariant && sourcePath.startsWith('components/watermelon/'))) {
    return { wfCollection: 'animated', blockCategory: '', previewMode: 'live-lazy' };
  }

  if (isPrimitivePrefix || isBaseVariant || sourcePath.includes('watermelon-ui/')) {
    return { wfCollection: 'components', blockCategory: '', previewMode: 'live-lazy' };
  }

  return { wfCollection: 'animated', blockCategory: '', previewMode: 'live-lazy' };
}

/**
 * Enriches a Watermelon UI catalog list with canonical 6-collection metadata,
 * plus appends curated Templates and Resources if not already present.
 */
export function enrichWatermelonCatalogItems(rawItems = []) {
  const list = Array.isArray(rawItems) ? rawItems : [];
  const hasRealViteCatalog = list.some((it) => it?.previewRuntime === 'watermelon-vite');
  const byId = new Map();
  const enriched = [];

  for (const raw of list) {
    if (!raw || !raw.id) continue;
    const meta = classifyWatermelonItem(raw);
    const colLabel = WATERMELON_COLLECTIONS.find((c) => c.id === meta.wfCollection)?.label || raw.collection || 'Animated';
    const dashMeta = DASHBOARD_DOMAIN_META[raw.slug] || null;
    const next = {
      ...raw,
      wfCollection: meta.wfCollection,
      collection: colLabel,
      blockCategory: meta.blockCategory,
      subCategory: raw.subCategory || meta.blockCategory || '',
      previewMode: meta.previewMode,
      ...(dashMeta
        ? {
            description: raw.description && !/component from watermelon ui/i.test(raw.description)
              ? raw.description
              : `${dashMeta.domain} · Multi-panel dashboard with navigation shell, KPI strip, charts & data table`,
            dashboardMeta: dashMeta,
          }
        : {}),
    };
    byId.set(next.id, next);
    enriched.push(next);
  }

  // Only append legacy synthetic templates/resources when operating on legacy non-Vite fixtures
  if (!hasRealViteCatalog) {
    for (const tpl of WATERMELON_CURATED_TEMPLATES) {
      if (!byId.has(tpl.id)) {
        byId.set(tpl.id, tpl);
        enriched.push(tpl);
      }
    }

    for (const res of WATERMELON_RESOURCES) {
      if (!byId.has(res.id)) {
        byId.set(res.id, res);
        enriched.push(res);
      }
    }
  }

  return enriched;
}

/**
 * Computes exact tabular counts for all 6 collections + all 22 block categories.
 */
export function computeWatermelonCounts(items = []) {
  const collectionCounts = { all: 0 };
  for (const c of WATERMELON_COLLECTIONS) {
    if (c.id !== 'all') collectionCounts[c.id] = 0;
  }
  const blockCategoryCounts = { all: 0 };
  for (const b of WATERMELON_BLOCK_CATEGORIES) {
    if (b.id !== 'all') blockCategoryCounts[b.id] = 0;
  }

  for (const item of Array.isArray(items) ? items : []) {
    const col = item.wfCollection || classifyWatermelonItem(item).wfCollection;
    collectionCounts.all += 1;
    if (collectionCounts[col] !== undefined) collectionCounts[col] += 1;

    if (col === 'blocks') {
      blockCategoryCounts.all += 1;
      const bcat = item.blockCategory || classifyWatermelonItem(item).blockCategory;
      if (bcat && blockCategoryCounts[bcat] !== undefined) {
        blockCategoryCounts[bcat] += 1;
      }
    }
  }

  return { collectionCounts, blockCategoryCounts };
}

/**
 * Stably prioritizes full-width Blocks ahead of small primitives for Mix & Match and Section Swapper.
 */
export function prioritizeBlocksFirst(candidates = []) {
  if (!Array.isArray(candidates) || candidates.length <= 1) return Array.isArray(candidates) ? candidates : [];
  const rank = (cand) => {
    const wfCol = String(cand?.rawElement?.wfCollection || cand?.wfCollection || '').toLowerCase();
    const col = String(cand?.rawElement?.collection || cand?.collection || '').toLowerCase();
    if (wfCol === 'blocks' || col === 'blocks' || col === 'layout block') return 0;
    if (cand?.libraryId === 'hyperui') return 1;
    if (wfCol === 'templates' || wfCol === 'dashboards') return 2;
    if (wfCol === 'animated' || col === 'motion ui' || col === 'ai interfaces') return 3;
    return 4;
  };
  return candidates
    .map((item, idx) => ({ item, idx, r: rank(item) }))
    .sort((a, b) => a.r - b.r || a.idx - b.idx)
    .map((entry) => entry.item);
}

/**
 * Maps a Mix & Match slot id ('navbar', 'hero', 'features', 'cards', 'cta', 'footer')
 * to the matching Watermelon Block category filter.
 */
export function getWatermelonBlockCategoryForSlot(slotId = '') {
  const map = {
    navbar: 'navigation',
    hero: 'hero',
    features: 'feature',
    cards: 'pricing',
    cta: 'cta',
    footer: 'footer',
  };
  return map[String(slotId || '').toLowerCase()] || 'all';
}

/**
 * Maps a Watermelon Block category back into one of Prompt Studio's 6 Mix & Match slots.
 */
export function mapBlockCategoryToSlot(blockCategory = '', fallbackCategory = '') {
  const found = WATERMELON_BLOCK_CATEGORIES.find((b) => b.id === String(blockCategory || '').toLowerCase());
  if (found && found.slot) return found.slot;
  const hay = String(fallbackCategory || '').toLowerCase();
  if (hay === 'navbar' || hay === 'navigation') return 'navbar';
  if (hay === 'hero') return 'hero';
  if (hay === 'footer') return 'footer';
  if (hay === 'pricing' || hay === 'cards' || hay === 'tables') return 'cards';
  if (hay === 'buttons' || hay === 'forms' || hay === 'alerts') return 'cta';
  return 'features';
}

/**
 * Maps ordered Page Assembler blocks into Prompt Studio Step 5 Mix & Match slot assignments.
 */
export function mapAssemblerBlocksToSlots(blocks = []) {
  const slots = {};
  for (const blk of Array.isArray(blocks) ? blocks : []) {
    if (!blk || !blk.name) continue;
    const targetSlot = blk.slotId || mapBlockCategoryToSlot(blk.blockCategory, blk.category);
    if (!slots[targetSlot]) {
      slots[targetSlot] = {
        id: String(blk.id || blk.slug || blk.name),
        libraryId: 'watermelon-ui',
        libraryName: 'Watermelon UI',
        librarySwatch: '#10B981',
        name: String(blk.name),
        category: String(blk.blockCategory || blk.category || targetSlot),
        description: String(blk.description || '').trim(),
        code: String(blk.code || '').trim(),
      };
    }
  }
  return slots;
}

/**
 * Formats an ordered list of assembled Watermelon Blocks into a compact,
 * token-budgeted section-by-section blueprint optimized for 9B–12B local LLMs.
 */
export function buildPageAssemblerBlueprint(blocks = []) {
  const list = Array.isArray(blocks) ? blocks.filter((b) => b && b.name) : [];
  if (!list.length) return '';

  const lines = [
    `# Watermelon UI Page Blueprint (${list.length} Ordered Block${list.length === 1 ? '' : 's'})`,
    `Assemble a cohesive, responsive React + Tailwind CSS website following this exact top-to-bottom section sequence. Harmonize palette, typography, and spacing across every section:`,
    '',
  ];

  list.forEach((blk, idx) => {
    const sectionLabel = blk.blockCategory ? blk.blockCategory.toUpperCase() : (blk.category || 'SECTION').toUpperCase();
    lines.push(`## ${idx + 1}. [${sectionLabel}] ${blk.name}`);
    if (blk.description) lines.push(`Role: ${blk.description}`);
    if (blk.code) {
      lines.push('```tsx');
      lines.push(String(blk.code).trim().slice(0, 1400));
      lines.push('```');
    }
    lines.push('');
  });

  lines.push('Ensure seamless visual rhythm, working interactive states, mobile responsiveness, and realistic domain copy.');
  return lines.join('\n').trim();
}

/**
 * Converts a Watermelon Resource entry into a WebForge SkillManager definition.
 */
export function resourceToSkillDefinition(resource) {
  if (!resource) return null;
  const skillId = resource.skillId || `wm-res-${resource.slug || resource.id}`;
  const rawPrompt = String(resource.skillPrompt || resource.description || '').trim();
  const prompt = rawPrompt.includes(resource.name) ? rawPrompt : `# ${resource.name}\n\n${rawPrompt}`;
  return {
    id: skillId,
    name: resource.name,
    description: resource.description || 'Watermelon UI engineering recipe',
    author: 'Watermelon UI',
    source: resource.repoUrl || 'https://ui.watermelon.sh',
    icon: 'WM',
    enabled: true,
    builtin: false,
    origin: 'watermelon-resource',
    prompt,
  };
}

/**
 * Builds a Prompt Studio Step 1 blueprint object for any Watermelon Dashboard or Template.
 */
export function buildWatermelonPromptBlueprint(item) {
  if (!item) return null;
  const isDash = (item.wfCollection || classifyWatermelonItem(item).wfCollection) === 'dashboards';
  const meta = DASHBOARD_DOMAIN_META[item.slug] || null;
  const isLight = meta?.palette === 'light' || item.starterDomain === 'agency';
  const accent = meta?.accent || item.swatches?.[2] || '#10B981';

  if (isDash) {
    const cleanName = String(item.name || 'Workspace').replace(/\s+Dashboard$/i, '').trim();
    const navList = meta?.nav || ['Overview', 'Analytics', 'Activity', 'Reports', 'Settings'];
    return {
      id: `wm-bp-${item.slug || item.id}`,
      name: item.name,
      category: 'Watermelon Dashboard',
      summary: meta?.domain || item.description || 'Interactive multi-panel dashboard layout',
      swatches: isLight ? ['#F8FAFC', '#FFFFFF', accent] : ['#0A0B0E', '#14171D', accent],
      selections: {
        type: 'Dashboard / Admin Panel',
        style: isLight
          ? 'Minimalist and Clean (Watermelon UI light dashboard: crisp 1px hairlines, flat tonal cards, tabular metrics)'
          : 'Dark and Modern (Watermelon UI dark dashboard: obsidian surfaces, 1px borders, tabular KPIs, Recharts visual clarity)',
        designSystemId: isLight ? '' : 'designmd-supabase',
        paletteKey: isLight ? 'classic-blue' : 'botanical-slate',
        color: isLight
          ? `Crisp Light Surface (#F8FAFC canvas, #FFFFFF cards, #0F172A ink, ${accent} focal accent)`
          : `Obsidian Dashboard (#0A0B0E canvas, #14171D panels, #F5F6F8 ink, ${accent} focal accent)`,
        typographyId: 'outfit-mono',
        fontPref: 'Plus Jakarta Sans for headings & UI controls, JetBrains Mono with tabular-nums for all KPI metrics and tables',
        header: 'Left sidebar navigation',
        hero: 'Compact KPI metrics summary bar at top',
        content: 'Data-dense tabbed dashboard workspace',
        footer: 'Minimal single-line footer',
        spacing: 'Compact high-density workspace (tight 16-24px rhythm)',
        motionProfileId: 'refined-minimal',
        motionProfiles: ['refined-minimal'],
        motionProfile: 'Refined Linear Precision Motion: crisp 150ms ease-out micro-transitions, zero gratuitous bounce',
        interactionStyleId: 'data-dense',
        interactionStyle: 'High-Density Pro Workspace: instant client-side search/filter, tabular-nums alignment, sticky headers & row actions',
        siteName: cleanName,
        siteTagline: meta?.domain || `${cleanName} operational dashboard`,
        siteDescription: `Complete ${cleanName} dashboard modeled on Watermelon UI (${item.slug}) with sidebar views (${navList.join(', ')}), KPI summary row, interactive trend visualization, filterable data table, and quick action drawer.`,
        siteTone: 'Technical and concise',
        audience: 'Founders & Executives',
        pageCount: 'interactive web application workspace',
        customSections: `Sidebar Shell (${navList.slice(0, 4).join(', ')}), KPI Metric Strip, Interactive Trend Chart, Filterable Data Table, Detail Slide-Over`,
        tech: 'React with Tailwind CSS and Lucide React',
        features: [
          'Responsive hamburger mobile menu',
          'Interactive data filter / search',
          'Dark / Light mode toggle',
        ],
        techFeatures: ['Use semantic HTML5 elements', 'Ensure WCAG AA accessibility standards', 'Use CSS custom properties'],
      },
    };
  }

  // Template blueprint
  const sections = Array.isArray(item.sections) && item.sections.length
    ? item.sections.join(', ')
    : 'Sticky Navbar, Editorial Hero, Bento Features, Pricing Tiers, Testimonials, FAQ Accordion, Multi-column Footer';

  return {
    id: `wm-bp-${item.slug || item.id}`,
    name: item.name,
    category: 'Watermelon Template',
    summary: item.description || 'Complete multi-section Watermelon UI website starter',
    swatches: item.swatches || ['#0A0B0D', '#14161A', accent],
    selections: {
      type: item.starterDomain === 'agency' ? 'Portfolio / Personal' : 'SaaS / Landing Page',
      style: isLight ? 'Editorial and Minimalist' : 'Dark and Modern',
      designSystemId: isLight ? '' : 'designmd-linear',
      paletteKey: isLight ? 'charcoal-gold' : 'obsidian-amber',
      color: isLight
        ? 'Warm Archival Paper (#F7F5F0 canvas, #FFFFFF cards, #18181B ink, #B45309 accent)'
        : `Obsidian Modern (#0A0B0D canvas, #14161A cards, #F8FAFC ink, ${accent} focal accent)`,
      typographyId: isLight ? 'instrument-jakarta' : 'bricolage-manrope',
      fontPref: isLight
        ? 'Instrument Serif for expressive headings, Plus Jakarta Sans for clean UI copy'
        : 'Plus Jakarta Sans for display & body copy, JetBrains Mono for metrics and labels',
      header: 'Fixed top navigation bar',
      hero: 'Split hero with text on left and visual on right',
      content: 'Card-based grid layout',
      footer: 'Multi-column footer with navigation and contact',
      spacing: 'Balanced modern spacing (80-96px section rhythm)',
      motionProfileId: 'expressive-20',
      motionProfiles: ['expressive-20'],
      motionProfile: 'Expressive 20-Principle UX Motion: tactile spring feedback, capped stagger reveals, fast close',
      interactionStyleId: 'tactile-springs',
      interactionStyle: 'Tactile Springs & Hover Lift: sliding tab indicators, crisp hover feedback, smooth transitions',
      siteName: item.name.replace(/\s+Template$/i, '').trim(),
      siteTagline: item.description || 'Built with Watermelon UI full-page architecture',
      siteDescription: `Full-page multi-section website modeled on Watermelon UI template "${item.name}" featuring ${sections}.`,
      siteTone: isLight ? 'Editorial and refined' : 'Confident and modern',
      audience: 'B2B SaaS Buyers',
      pageCount: 'multi-section flagship website',
      customSections: sections,
      tech: 'React with Tailwind CSS and Lucide React',
      features: [
        'Responsive hamburger mobile menu',
        'Smooth scroll navigation',
        'Pricing table section',
        'FAQ accordion section',
      ],
      techFeatures: ['Use semantic HTML5 elements', 'Ensure WCAG AA accessibility standards', 'Use CSS custom properties'],
    },
  };
}

function escapeJsStr(str = '') {
  return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ');
}

/**
 * Generates a clean, instant, zero-iframe architectural thumbnail markup for heavy
 * Watermelon Dashboards, Templates, and Resources cards (prevents iframe overload & rate-limit errors).
 */
export function buildWatermelonStructuralThumbHtml(item = {}, { escapeHtmlFn = (s) => String(s || '') } = {}) {
  const wfCol = item.wfCollection || classifyWatermelonItem(item).wfCollection;
  const meta = DASHBOARD_DOMAIN_META[item.slug] || null;
  const accent = meta?.accent || item.swatches?.[2] || (wfCol === 'resources' ? '#10B981' : wfCol === 'templates' ? '#6366F1' : '#10B981');
  const isLight = meta?.palette === 'light' || item.starterDomain === 'agency';

  if (wfCol === 'resources') {
    const kind = escapeHtmlFn(item.resourceKind || 'AI Recipe');
    const deps = (item.dependencies || []).slice(0, 3).map((d) => escapeHtmlFn(d)).join(' · ');
    return `
      <div class="wm-struct-thumb wm-struct-resource" style="--wm-accent:${escapeHtmlFn(accent)}">
        <div class="wm-struct-res-top">
          <span class="wm-struct-res-kind">${kind}</span>
          <span class="wm-struct-res-dot" aria-hidden="true"></span>
        </div>
        <div class="wm-struct-res-lines" aria-hidden="true">
          <div class="wm-code-line w-75 is-accent"></div>
          <div class="wm-code-line w-90"></div>
          <div class="wm-code-line w-65"></div>
          <div class="wm-code-line w-85"></div>
        </div>
        <div class="wm-struct-res-foot">${deps || 'React · Tailwind · Watermelon UI'}</div>
      </div>`;
  }

  if (wfCol === 'templates') {
    const sections = Array.isArray(item.sections) && item.sections.length
      ? item.sections.slice(0, 4)
      : ['Navbar', 'Hero', 'Bento Grid', 'Pricing'];
    return `
      <div class="wm-struct-thumb wm-struct-template ${isLight ? 'is-light' : ''}" style="--wm-accent:${escapeHtmlFn(accent)}">
        <div class="wm-tpl-bar" aria-hidden="true">
          <span class="wm-tpl-brand"></span>
          <span class="wm-tpl-links"><i></i><i></i><i></i></span>
          <span class="wm-tpl-cta"></span>
        </div>
        <div class="wm-tpl-hero" aria-hidden="true">
          <div class="wm-tpl-h1"></div>
          <div class="wm-tpl-sub"></div>
          <div class="wm-tpl-btn-row">
            <span class="wm-tpl-btn primary"></span>
            <span class="wm-tpl-btn"></span>
          </div>
        </div>
        <div class="wm-tpl-grid" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
        <div class="wm-struct-caption">${escapeHtmlFn(sections.join(' · '))}</div>
      </div>`;
  }

  // Dashboard miniature shell thumbnail
  const kpis = meta?.kpis || [
    ['Active', '24.8K', '+12%'],
    ['Revenue', '$84.2K', '+9.4%'],
    ['Latency', '114ms', '-8%'],
  ];
  return `
    <div class="wm-struct-thumb wm-struct-dash ${isLight ? 'is-light' : ''}" style="--wm-accent:${escapeHtmlFn(accent)}">
      <div class="wm-dash-mini-shell" aria-hidden="true">
        <div class="wm-dash-mini-rail">
          <span class="wm-rail-logo"></span>
          <span class="wm-rail-item active"></span>
          <span class="wm-rail-item"></span>
          <span class="wm-rail-item"></span>
          <span class="wm-rail-item"></span>
        </div>
        <div class="wm-dash-mini-main">
          <div class="wm-dash-mini-kpis">
            ${kpis.slice(0, 3).map((k) => `
              <div class="wm-dash-mini-kpi">
                <small>${escapeHtmlFn(k[0])}</small>
                <strong>${escapeHtmlFn(k[1])}</strong>
              </div>
            `).join('')}
          </div>
          <div class="wm-dash-mini-chart">
            <span style="height:42%"></span>
            <span style="height:68%"></span>
            <span style="height:54%"></span>
            <span style="height:82%"></span>
            <span style="height:64%"></span>
            <span style="height:92%" class="peak"></span>
            <span style="height:76%"></span>
          </div>
        </div>
      </div>
      <div class="wm-struct-caption">${escapeHtmlFn(meta?.domain || 'Interactive Multi-Panel Dashboard')}</div>
    </div>`;
}

/**
 * Generates a complete, clean, editable React + Tailwind starter project VFS
 * for 1-click "Load Starter" on any Watermelon Dashboard or Template.
 */
export function buildWatermelonStarterVfs(item = {}) {
  const wfCol = item.wfCollection || classifyWatermelonItem(item).wfCollection;
  const cleanTitle = String(item.name || 'Watermelon Starter').trim();
  const isDash = wfCol === 'dashboards';
  const meta = DASHBOARD_DOMAIN_META[item.slug] || null;
  const accent = meta?.accent || item.swatches?.[2] || '#10B981';
  const isLight = meta?.palette === 'light' || item.starterDomain === 'agency';

  const indexCss = isLight
    ? `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
:root { --wm-accent: ${accent}; }
body { margin: 0; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #F8FAFC; color: #0F172A; }
.tabular-nums { font-variant-numeric: tabular-nums; font-family: 'JetBrains Mono', monospace; }`
    : `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
:root { --wm-accent: ${accent}; }
body { margin: 0; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #0A0B0E; color: #F4F4F5; }
.tabular-nums { font-variant-numeric: tabular-nums; font-family: 'JetBrains Mono', monospace; }`;

  const mainJsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

  if (isDash) {
    const brand = escapeJsStr(cleanTitle.replace(/\s+Dashboard$/i, '').trim() || 'Workspace');
    const domain = escapeJsStr(meta?.domain || 'Operational Analytics Console');
    const navItems = meta?.nav || ['Overview', 'Analytics', 'Operations', 'Reports', 'Settings'];
    const kpis = meta?.kpis || [
      ['Total Volume', '$142,800', '+14.2%'],
      ['Active Accounts', '2,840', '+8.4%'],
      ['Response Time', '118ms', '-12ms'],
      ['Completion Rate', '99.1%', '+0.6%'],
    ];

    const bgCls = isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0A0B0E] text-zinc-100';
    const railCls = isLight ? 'bg-white border-slate-200' : 'bg-[#101217] border-zinc-800/80';
    const cardCls = isLight ? 'bg-white border-slate-200' : 'bg-[#12151C] border-zinc-800/80';
    const mutedCls = isLight ? 'text-slate-500' : 'text-zinc-400';
    const hoverRow = isLight ? 'hover:bg-slate-50 border-slate-100' : 'hover:bg-zinc-900/60 border-zinc-800/60';
    const inputCls = isLight ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500';

    const appJsx = `import React, { useMemo, useState } from 'react';
import {
  Activity, ArrowUpRight, Bell, CheckCircle2, Filter, LayoutDashboard,
  Menu, Plus, Search, Settings, SlidersHorizontal, TrendingUp, X
} from 'lucide-react';

const NAV_ITEMS = ${JSON.stringify(navItems)};
const KPI_CARDS = ${JSON.stringify(kpis.map(([label, value, delta]) => ({ label, value, delta })))};

const INITIAL_ROWS = [
  { id: 'WM-1042', name: 'Primary Production Pipeline', owner: 'Maya Lin', status: 'Active', metric: '$42,180', updated: '2m ago' },
  { id: 'WM-1041', name: 'Enterprise Onboarding Flow', owner: 'Devon Park', status: 'Active', metric: '$28,940', updated: '14m ago' },
  { id: 'WM-1039', name: 'Automated Audit Review', owner: 'Elena Rostova', status: 'Review', metric: '$19,400', updated: '41m ago' },
  { id: 'WM-1036', name: 'Q4 Capacity Forecast', owner: 'Marcus Vance', status: 'Active', metric: '$34,620', updated: '1h ago' },
  { id: 'WM-1032', name: 'Regional Failover Check', owner: 'Priya Nair', status: 'Paused', metric: '$11,250', updated: '3h ago' },
];

const CHART_SERIES = {
  '7D': [42, 58, 51, 74, 69, 88, 82],
  '30D': [35, 48, 62, 59, 76, 84, 93],
  '90D': [28, 44, 52, 68, 72, 81, 96],
};

export default function App() {
  const [activeNav, setActiveNav] = useState(NAV_ITEMS[0]);
  const [range, setRange] = useState('30D');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [mobileMenu, setMobileMenu] = useState(false);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      const q = query.trim().toLowerCase();
      const matchQuery = !q || r.name.toLowerCase().includes(q) || r.owner.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [rows, query, statusFilter]);

  const handleAddRecord = () => {
    const nextNum = 1043 + rows.length;
    setRows((prev) => [
      {
        id: 'WM-' + nextNum,
        name: activeNav + ' Workflow #' + (prev.length + 1),
        owner: 'You',
        status: 'Active',
        metric: '$' + (12 + prev.length * 4) + ',400',
        updated: 'Just now',
      },
      ...prev,
    ]);
  };

  const bars = CHART_SERIES[range] || CHART_SERIES['30D'];

  return (
    <div className="min-h-screen flex ${bgCls}">
      {/* Sidebar Rail */}
      <aside className={\`fixed inset-y-0 left-0 z-40 w-60 border-r ${railCls} flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 \${mobileMenu ? 'translate-x-0' : '-translate-x-full'}\`}>
        <div className="h-14 px-5 flex items-center justify-between border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-semibold text-xs" style={{ background: '${accent}' }}>
              ${brand.slice(0, 2).toUpperCase()}
            </span>
            <span className="font-semibold tracking-tight text-sm">${brand}</span>
          </div>
          <button type="button" onClick={() => setMobileMenu(false)} className="lg:hidden p-1.5 rounded-md ${mutedCls}" aria-label="Close navigation">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1" aria-label="Dashboard navigation">
          {NAV_ITEMS.map((item) => {
            const active = activeNav === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => { setActiveNav(item); setMobileMenu(false); }}
                className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors \${active ? 'text-white' : '${mutedCls} hover:opacity-100'}\`}
                style={active ? { background: '${accent}' } : undefined}
              >
                <LayoutDashboard className="w-4 h-4 opacity-80" />
                <span>{item}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-inherit text-xs ${mutedCls}">
          <div className="font-medium">${brand} Workspace</div>
          <div className="mt-0.5 opacity-80">${domain}</div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 px-5 border-b ${railCls} flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => setMobileMenu(true)} className="lg:hidden p-1.5 rounded-md border border-inherit" aria-label="Open navigation">
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-sm font-medium truncate">
              <span className="${mutedCls}">${brand} / </span>
              <span>{activeNav}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={handleAddRecord} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-transform active:scale-[0.98]" style={{ background: '${accent}' }}>
              <Plus className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-7 max-w-7xl w-full mx-auto space-y-6">
          {/* KPI Strip */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Key metrics">
            {KPI_CARDS.map((kpi) => (
              <div key={kpi.label} className="rounded-xl border p-4 ${cardCls}">
                <div className="flex items-center justify-between text-xs ${mutedCls}">
                  <span>{kpi.label}</span>
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: '${accent}' }} />
                </div>
                <div className="mt-2.5 flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-semibold tracking-tight tabular-nums">{kpi.value}</span>
                  <span className="text-xs font-medium tabular-nums" style={{ color: '${accent}' }}>{kpi.delta}</span>
                </div>
              </div>
            ))}
          </section>

          {/* Trend Chart + Operational Summary */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-xl border p-5 ${cardCls}">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-sm font-semibold">{activeNav} Activity</h2>
                  <p className="text-xs ${mutedCls} mt-0.5">${domain}</p>
                </div>
                <div className="inline-flex rounded-lg border border-inherit p-0.5 text-xs">
                  {['7D', '30D', '90D'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRange(r)}
                      className={\`px-2.5 py-1 rounded-md font-medium transition-colors \${range === r ? 'text-white' : '${mutedCls}'}\`}
                      style={range === r ? { background: '${accent}' } : undefined}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-44 flex items-end gap-3 pt-4">
                {bars.map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div
                      className="w-full rounded-t-md transition-all duration-300"
                      style={{ height: val + '%', background: i === bars.length - 1 ? '${accent}' : '${accent}55' }}
                    />
                    <span className="text-[11px] tabular-nums ${mutedCls}">P{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border p-5 ${cardCls} flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-semibold">System Health</h2>
                <p className="text-xs ${mutedCls} mt-1">Watermelon UI starter scaffold ready for customization.</p>
                <ul className="mt-4 space-y-3 text-xs">
                  <li className="flex items-center justify-between">
                    <span className="${mutedCls}">Sync Status</span>
                    <span className="font-medium inline-flex items-center gap-1" style={{ color: '${accent}' }}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Nominal
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="${mutedCls}">Tracked Records</span>
                    <span className="tabular-nums font-medium">{rows.length}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="${mutedCls}">Active View</span>
                    <span className="font-medium">{activeNav}</span>
                  </li>
                </ul>
              </div>
              <div className="mt-5 pt-4 border-t border-inherit text-xs ${mutedCls}">
                Ask WebForge AI in chat to add charts, API routes, or swap sections from Watermelon Blocks.
              </div>
            </div>
          </section>

          {/* Interactive Data Table */}
          <section className="rounded-xl border ${cardCls} overflow-hidden">
            <div className="p-4 border-b border-inherit flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${mutedCls}" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter records by name, owner, or ID..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border ${inputCls} focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {['All', 'Active', 'Review', 'Paused'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={\`px-2.5 py-1 rounded-md border transition-colors \${statusFilter === st ? 'text-white border-transparent' : 'border-inherit ${mutedCls}'}\`}
                    style={statusFilter === st ? { background: '${accent}' } : undefined}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-inherit text-xs ${mutedCls}">
                    <th className="py-2.5 px-4 font-medium">ID</th>
                    <th className="py-2.5 px-4 font-medium">Workflow</th>
                    <th className="py-2.5 px-4 font-medium">Owner</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium text-right">Volume</th>
                    <th className="py-2.5 px-4 font-medium text-right">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm ${mutedCls}">
                        No records match your current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="border-b last:border-b-0 ${hoverRow} transition-colors">
                        <td className="py-3 px-4 tabular-nums text-xs ${mutedCls}">{row.id}</td>
                        <td className="py-3 px-4 font-medium">{row.name}</td>
                        <td className="py-3 px-4 ${mutedCls}">{row.owner}</td>
                        <td className="py-3 px-4 text-xs font-medium">{row.status}</td>
                        <td className="py-3 px-4 text-right tabular-nums font-medium">{row.metric}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-xs ${mutedCls}">{row.updated}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
`;

    return {
      'src/main.jsx': mainJsx,
      'src/App.jsx': appJsx,
      'src/index.css': indexCss,
    };
  }

  // Full-Page Template Starter VFS
  const brand = escapeJsStr(cleanTitle.replace(/\s+Template$/i, '').trim() || 'Watermelon Studio');
  const subtitle = escapeJsStr(item.description || 'Modular multi-section website crafted with Watermelon UI architecture.');
  const bgCls = isLight ? 'bg-[#F7F5F0] text-zinc-900' : 'bg-[#090A0D] text-zinc-100';
  const surfaceCls = isLight ? 'bg-white border-zinc-200/90' : 'bg-[#12141A] border-zinc-800/80';
  const mutedCls = isLight ? 'text-zinc-600' : 'text-zinc-400';

  const appJsx = `import React, { useState } from 'react';
import { ArrowRight, Check, ChevronDown, Layers, Menu, Shield, Sparkles, X, Zap } from 'lucide-react';

const FEATURES = [
  { icon: Zap, title: 'Sub-200ms Interaction Rhythm', desc: 'Crisp spring physics and compositor-only motion engineered for tactile clarity.' },
  { icon: Layers, title: 'Composable Block System', desc: 'Every section shares consistent spacing, 1px hairline depth, and typography tokens.' },
  { icon: Shield, title: 'Accessible by Default', desc: 'Semantic landmarks, keyboard navigation, and high-contrast legibility across viewports.' },
];

const PLANS = [
  { name: 'Starter', audience: 'For solo builders', price: '$0', period: '/mo', items: ['Unlimited local builds', 'Core Watermelon blocks', 'Export clean React & Tailwind'] },
  { name: 'Studio Pro', audience: 'For product teams', price: '$29', period: '/mo', featured: true, items: ['All 22 block categories', 'Interactive dashboards & kits', 'Custom design token sync'] },
  { name: 'Enterprise', audience: 'For scaling orgs', price: '$99', period: '/mo', items: ['Private component registries', 'Dedicated design system rules', 'Priority architecture reviews'] },
];

const FAQS = [
  { q: 'Can I customize every block in WebForge?', a: 'Yes — open Section Swapper or attach any Watermelon Animated component directly in Chat to refine any section.' },
  { q: 'Does this starter work with local LLMs?', a: 'Every file uses clean, readable React + Tailwind structure designed for reliable surgical edits by 9B-12B models.' },
  { q: 'Are light and dark tokens supported?', a: 'All spacing, typography, and surface borders follow clean CSS variables so palette changes stay cohesive.' },
];

export default function App() {
  const [openFaq, setOpenFaq] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen ${bgCls}">
      {/* Sticky Navigation */}
      <header className="sticky top-0 z-30 border-b backdrop-blur-md ${surfaceCls}">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#top" className="font-semibold tracking-tight text-base flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '${accent}' }} />
            <span>${brand}</span>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm ${mutedCls}">
            <a href="#features" className="hover:opacity-100 transition-opacity">Features</a>
            <a href="#pricing" className="hover:opacity-100 transition-opacity">Pricing</a>
            <a href="#faq" className="hover:opacity-100 transition-opacity">FAQ</a>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <a href="#pricing" className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-transform active:scale-[0.98]" style={{ background: '${accent}' }}>
              Get Started
            </a>
          </div>
          <button type="button" onClick={() => setMobileOpen((v) => !v)} className="md:hidden p-2 rounded-lg border border-inherit" aria-label="Toggle menu">
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden px-6 pb-4 flex flex-col gap-3 text-sm border-t border-inherit pt-3">
            <a href="#features" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#pricing" onClick={() => setMobileOpen(false)}>Pricing</a>
            <a href="#faq" onClick={() => setMobileOpen(false)}>FAQ</a>
          </div>
        )}
      </header>

      <main id="top">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.14em] mb-4" style={{ color: '${accent}' }}>
              Watermelon UI Full-Page Starter
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08]">
              Build cohesive digital products with precision.
            </h1>
            <p className="mt-6 text-lg leading-relaxed ${mutedCls} max-w-2xl">
              ${subtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <a href="#pricing" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-transform active:scale-[0.98]" style={{ background: '${accent}' }}>
                <span>Start Building</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#features" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border ${surfaceCls}">
                <span>Explore Sections</span>
              </a>
            </div>
          </div>
        </section>

        {/* Bento Feature Section */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-16 border-t border-inherit">
          <div className="max-w-xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Engineered for speed and calm clarity</h2>
            <p className="mt-2 text-sm ${mutedCls}">Swap any block, attach Animated UI chips, or refine brand tokens directly in Chat.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className="rounded-2xl border p-6 ${surfaceCls}">
                  <Icon className="w-5 h-5 mb-4" style={{ color: '${accent}' }} />
                  <h3 className="font-semibold text-base">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed ${mutedCls}">{f.desc}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="max-w-6xl mx-auto px-6 py-16 border-t border-inherit">
          <div className="max-w-xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Transparent plans</h2>
            <p className="mt-2 text-sm ${mutedCls}">Start free and scale with your team.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map((plan) => (
              <div key={plan.name} className="rounded-2xl border p-6 flex flex-col justify-between ${surfaceCls}" style={plan.featured ? { borderColor: '${accent}' } : undefined}>
                <div>
                  <div className="text-xs ${mutedCls}">{plan.audience}</div>
                  <h3 className="mt-1 text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tabular-nums">{plan.price}</span>
                    <span className="text-xs ${mutedCls}">{plan.period}</span>
                  </div>
                  <ul className="mt-6 space-y-2.5 text-sm">
                    {plan.items.map((pt) => (
                      <li key={pt} className="flex items-center gap-2 ${mutedCls}">
                        <Check className="w-4 h-4 shrink-0" style={{ color: '${accent}' }} />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  className={\`mt-7 w-full py-2.5 rounded-xl text-sm font-semibold transition-transform active:scale-[0.98] \${plan.featured ? 'text-white' : 'border border-inherit'}\`}
                  style={plan.featured ? { background: '${accent}' } : undefined}
                >
                  Choose {plan.name}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Accordion */}
        <section id="faq" className="max-w-4xl mx-auto px-6 py-16 border-t border-inherit">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-8">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q} className="rounded-xl border ${surfaceCls} overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left font-medium text-sm"
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={\`w-4 h-4 transition-transform \${isOpen ? 'rotate-180' : ''}\`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm leading-relaxed ${mutedCls}">{item.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-inherit py-10 mt-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-xs ${mutedCls}">
          <span>© {new Date().getFullYear()} ${brand}. Crafted with Watermelon UI.</span>
          <div className="flex items-center gap-5">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
`;

  return {
    'src/main.jsx': mainJsx,
    'src/App.jsx': appJsx,
    'src/index.css': indexCss,
  };
}
