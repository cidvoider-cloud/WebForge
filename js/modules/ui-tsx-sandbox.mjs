/**
 * WebForge Studio — Live React/TSX Component Sandbox Runtime Builder
 *
 * Compiles real-world React/TypeScript components (Watermelon UI, Kokonut UI,
 * shadcn/ui v4, and custom AI-Instructions TSX snippets) in-browser via Babel
 * Standalone + lazy CommonJS multi-file module resolution, backed by:
 *   - TypeScript Interface & Destructured Props Auto-Synthesizer (prevents
 *     undefined-prop crashes on standalone components like AaveSwapComponent)
 *   - cn() (clsx / tailwind-merge) & cva() (class-variance-authority)
 *   - Crash-safe Icon Proxies (lucide-react, react-icons/*, @hugeicons/*,
 *     @aliimam/icons, @tabler/icons-react, phosphor-react, hugeicons-react)
 *   - motion/react & framer-motion shims
 *   - Compound Radix UI (radix-ui & @radix-ui/react-*) & Base UI (@base-ui/react/*)
 *   - Full shadcn/ui v4 suite (including Sidebar, Chart, Form, Carousel, InputOTP)
 *   - Interactive Recharts SVG charts, zod, react-hook-form, react-day-picker,
 *     date-fns, react-use-measure, @dnd-kit/*, @floating-ui/*, react-router-dom,
 *     react-aria-components, vaul, cmdk, shiki, input-otp, and smart fallback proxy
 */

function safeInlineJson(val) {
  return JSON.stringify(val)
    .replace(/<\/script>/gi, '<\\/script>')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// ── Pure TypeScript Interface & Props Auto-Synthesizer ──

const TOKEN_PRESETS = [
  {
    name: 'Ethereum',
    symbol: 'ETH',
    ticker: 'ETH',
    priceUSD: 3420,
    price: 3420,
    rate: 3420,
    balance: 4.82,
    max: 12.5,
    amount: 1.5,
    change: 3.42,
    decimals: 18,
    color: '#627EEA',
    logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%23627EEA'/%3E%3Cpath fill='%23fff' d='M16 5l-6.5 11.2L16 20l6.5-3.8L16 5zm0 16.5l-6.5-3.8L16 27l6.5-9.3L16 21.5z'/%3E%3C/svg%3E",
  },
  {
    name: 'USD Coin',
    symbol: 'USDC',
    ticker: 'USDC',
    priceUSD: 1,
    price: 1,
    rate: 1,
    balance: 14250,
    max: 25000,
    amount: 5130,
    change: 0.01,
    decimals: 6,
    color: '#2775CA',
    logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%232775CA'/%3E%3Ctext x='16' y='21' text-anchor='middle' fill='%23fff' font-family='sans-serif' font-size='15' font-weight='700'%3E%24%3C/text%3E%3C/svg%3E",
  },
  {
    name: 'Wrapped BTC',
    symbol: 'WBTC',
    ticker: 'WBTC',
    priceUSD: 94200,
    price: 94200,
    rate: 94200,
    balance: 0.42,
    max: 1.5,
    amount: 0.1,
    change: 2.15,
    decimals: 8,
    color: '#F7931A',
    logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%23F7931A'/%3E%3Ctext x='16' y='21' text-anchor='middle' fill='%23fff' font-family='sans-serif' font-size='15' font-weight='700'%3EB%3C/text%3E%3C/svg%3E",
  },
];

const SAMPLE_AVATARS = [
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%2310B981'/%3E%3Ctext x='20' y='25' text-anchor='middle' fill='%23fff' font-family='sans-serif' font-size='14' font-weight='600'%3EAL%3C/text%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%233B82F6'/%3E%3Ctext x='20' y='25' text-anchor='middle' fill='%23fff' font-family='sans-serif' font-size='14' font-weight='600'%3EMR%3C/text%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%238B5CF6'/%3E%3Ctext x='20' y='25' text-anchor='middle' fill='%23fff' font-family='sans-serif' font-size='14' font-weight='600'%3EJK%3C/text%3E%3C/svg%3E",
];

const SAMPLE_CARD_IMAGES = [
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 200'%3E%3Cdefs%3E%3ClinearGradient id='g1' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%230F172A'/%3E%3Cstop offset='1' stop-color='%231E293B'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='320' height='200' fill='url(%23g1)'/%3E%3Ccircle cx='240' cy='60' r='58' fill='%2310B981' fill-opacity='0.22'/%3E%3Crect x='28' y='132' width='140' height='12' rx='6' fill='%23fff' fill-opacity='0.18'/%3E%3Crect x='28' y='154' width='90' height='10' rx='5' fill='%23fff' fill-opacity='0.1'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 200'%3E%3Cdefs%3E%3ClinearGradient id='g2' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23111827'/%3E%3Cstop offset='1' stop-color='%231F2937'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='320' height='200' fill='url(%23g2)'/%3E%3Ccircle cx='90' cy='75' r='52' fill='%233B82F6' fill-opacity='0.24'/%3E%3Crect x='28' y='132' width='160' height='12' rx='6' fill='%23fff' fill-opacity='0.18'/%3E%3Crect x='28' y='154' width='105' height='10' rx='5' fill='%23fff' fill-opacity='0.1'/%3E%3C/svg%3E",
];

function stripTsComments(src) {
  return String(src || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function readBalancedBlock(src, openIdx, openCh = '{', closeCh = '}') {
  let depth = 0;
  let inStr = null;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
      continue;
    }
    if (ch === openCh) depth++;
    else if (ch === closeCh) {
      depth--;
      if (depth === 0) return { content: src.slice(openIdx + 1, i), endIdx: i };
    }
  }
  return null;
}

function splitTopLevel(str, delimiters = [';', ',', '\n']) {
  const parts = [];
  let cur = '';
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  let angle = 0;
  let inStr = null;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inStr) {
      cur += ch;
      if (ch === '\\' && i + 1 < str.length) { cur += str[++i]; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
      cur += ch;
      continue;
    }
    if (ch === '(') paren++;
    else if (ch === ')') paren = Math.max(0, paren - 1);
    else if (ch === '{') brace++;
    else if (ch === '}') brace = Math.max(0, brace - 1);
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket = Math.max(0, bracket - 1);
    else if (ch === '<') angle++;
    else if (ch === '>' && str[i - 1] !== '=') angle = Math.max(0, angle - 1);

    if (paren === 0 && brace === 0 && bracket === 0 && angle === 0 && delimiters.includes(ch)) {
      if (cur.trim()) parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function parseObjectTypeFields(body) {
  const fields = [];
  const entries = splitTopLevel(body, [';', ',', '\n']);
  for (const raw of entries) {
    const cleaned = raw.replace(/^readonly\s+/, '').trim();
    if (!cleaned || cleaned.startsWith('[') || cleaned.startsWith('...')) continue;
    const colonIdx = cleaned.indexOf(':');
    if (colonIdx === -1) continue;
    let namePart = cleaned.slice(0, colonIdx).trim();
    const typePart = cleaned.slice(colonIdx + 1).trim();
    const optional = namePart.endsWith('?');
    namePart = namePart.replace(/\?$/, '').replace(/^['"]|['"]$/g, '').trim();
    if (!/^[A-Za-z_$][\w$]*$/.test(namePart)) continue;
    fields.push({ name: namePart, optional, type: typePart });
  }
  return fields;
}

function collectTypeDefinitions(combinedSource) {
  const clean = stripTsComments(combinedSource);
  const defs = new Map();

  // interface Name { ... }
  const ifaceRe = /(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)(?:<[^>{]*>)?(?:\s+extends\s+[^{]+)?\s*\{/g;
  let m;
  while ((m = ifaceRe.exec(clean)) !== null) {
    const braceIdx = m.index + m[0].length - 1;
    const blk = readBalancedBlock(clean, braceIdx, '{', '}');
    if (blk) {
      defs.set(m[1], { kind: 'object', fields: parseObjectTypeFields(blk.content) });
    }
  }

  // type Name = { ... } | ...
  const typeRe = /(?:export\s+)?type\s+([A-Za-z_$][\w$]*)(?:<[^>=]*>)?\s*=\s*/g;
  while ((m = typeRe.exec(clean)) !== null) {
    const name = m[1];
    let idx = m.index + m[0].length;
    while (idx < clean.length && /\s/.test(clean[idx])) idx++;
    if (clean[idx] === '{') {
      const blk = readBalancedBlock(clean, idx, '{', '}');
      if (blk) {
        defs.set(name, { kind: 'object', fields: parseObjectTypeFields(blk.content) });
      }
    } else {
      const endSemi = clean.indexOf(';', idx);
      const endNl = clean.indexOf('\n', idx);
      const endPos = endSemi !== -1 && (endNl === -1 || endSemi < endNl) ? endSemi : (endNl !== -1 ? endNl : clean.length);
      const expr = clean.slice(idx, endPos).trim();
      if (expr) defs.set(name, { kind: 'alias', expr });
    }
  }

  return defs;
}

function looksLikeTokenFieldName(fieldName) {
  return /^(from|to|source|target|token|fromtoken|totoken|basetoken|quotetoken|selltoken|buytoken|inputtoken|outputtoken|asset)$/i.test(String(fieldName || ''));
}

function synthesizePrimitiveForName(fieldName, typeStr, variantIndex = 0) {
  const low = String(fieldName || '').toLowerCase();
  const t = String(typeStr || '').trim();
  const preset = TOKEN_PRESETS[variantIndex % TOKEN_PRESETS.length];

  // String literal unions: 'sm' | 'md' | 'lg'
  const literalMatch = t.match(/['"]([^'"]+)['"]/);
  if (literalMatch && !/\b(string|number|boolean)\b/.test(t.replace(/['"][^'"]*['"]/g, ''))) {
    return literalMatch[1];
  }

  if (/\bnumber\b/.test(t) || /^(price|priceusd|amount|balance|max|min|total|count|value|rate|progress|percent|score|rating|duration|delay|size|width|height|index|step|limit|fee|apr|apy|volume|change|decimals|age|year|month|day)$/i.test(low)) {
    if (low.includes('price') || low === 'rate') return preset.priceUSD;
    if (low === 'max') return preset.max;
    if (low === 'min') return 0.01;
    if (low === 'balance') return preset.balance;
    if (low === 'amount') return preset.amount;
    if (low.includes('percent') || low.includes('progress') || low === 'apy' || low === 'apr') return 64;
    if (low === 'rating' || low === 'score') return 4.8;
    if (low === 'decimals') return preset.decimals;
    if (low === 'duration') return 300;
    if (low === 'delay') return 0;
    if (low === 'index' || low === 'step') return variantIndex;
    return (variantIndex + 1) * 12;
  }

  if (/\bboolean\b/.test(t) || /^(is[A-Z]|has[A-Z]|show[A-Z]|enable|active|open|checked|verified|featured|popular)/.test(String(fieldName || ''))) {
    if (low === 'disabled' || low === 'loading' || low === 'error' || low === 'readonly') return false;
    return variantIndex === 0;
  }

  if (low === 'logo' || low === 'tokenlogo' || low === 'iconurl') return preset.logo;
  if (low.includes('avatar') || low.includes('photo')) return SAMPLE_AVATARS[variantIndex % SAMPLE_AVATARS.length];
  if (low.includes('image') || low.includes('img') || low.includes('thumbnail') || low.includes('cover') || low.includes('banner') || low === 'src') {
    return SAMPLE_CARD_IMAGES[variantIndex % SAMPLE_CARD_IMAGES.length];
  }
  if (low === 'symbol' || low === 'ticker' || low === 'code') return preset.symbol;
  if (low === 'currency') return 'USD';
  if (low === 'email') return ['alex@acme.dev', 'maya@acme.dev', 'jordan@acme.dev'][variantIndex % 3];
  if (low === 'username' || low === 'handle') return ['@alexlin', '@mayarao', '@jordank'][variantIndex % 3];
  if (low === 'href' || low === 'url' || low === 'link') return '#';
  if (low === 'color' || low === 'accent' || low === 'bg') return ['#10B981', '#3B82F6', '#8B5CF6'][variantIndex % 3];
  if (low === 'id' || low === 'key' || low === 'slug') return `item-${variantIndex + 1}`;
  if (low === 'date' || low === 'timestamp' || low === 'createdat' || low === 'time') return 'Nov 22, 2026';
  if (low === 'status') return ['Active', 'Pending', 'Completed'][variantIndex % 3];
  if (low === 'role' || low === 'badge' || low === 'tag' || low === 'category') return ['Pro', 'Verified', 'Core'][variantIndex % 3];
  if (low === 'title' || low === 'heading' || low === 'label') {
    return ['Overview', 'Analytics', 'Deployments', 'Settings'][variantIndex % 4];
  }
  if (low === 'subtitle' || low === 'description' || low === 'summary' || low === 'bio' || low === 'message' || low === 'content' || low === 'text') {
    return ['Instant liquidity with deterministic settlement', 'Real-time portfolio telemetry and routing', 'Zero-slippage automated execution'][variantIndex % 3];
  }
  if (low === 'name') {
    return preset.name;
  }
  return ['Alpha', 'Beta', 'Gamma'][variantIndex % 3];
}

function isFunctionType(typeStr) {
  const t = String(typeStr || '').trim();
  return /=>/.test(t) || /\bFunction\b/.test(t) || /\bEventHandler\b/.test(t);
}

function isReactNodeType(typeStr) {
  const t = String(typeStr || '').trim();
  return /\b(ReactNode|ReactElement|JSX\.Element|ComponentType|LucideIcon)\b/.test(t);
}

function synthesizeValueForType(fieldName, typeStr, defs, variantIndex = 0, depth = 0, callbackNames = null) {
  if (depth > 4) return {};
  let t = String(typeStr || '').trim();
  // Strip wrapping parentheses
  while (t.startsWith('(') && t.endsWith(')') && !isFunctionType(t)) {
    t = t.slice(1, -1).trim();
  }
  // Remove `| undefined` and `| null`
  t = t.replace(/\|\s*(undefined|null)\b/g, '').replace(/\b(undefined|null)\s*\|/g, '').trim();

  if (isFunctionType(t)) {
    if (callbackNames && depth === 0) callbackNames.push(fieldName);
    return undefined;
  }
  if (isReactNodeType(t)) {
    return undefined;
  }

  // Array syntax: T[] or Array<T> or ReadonlyArray<T>
  let elemType = null;
  if (t.endsWith('[]')) {
    elemType = t.slice(0, -2).trim();
  } else {
    const arrM = t.match(/^(?:Readonly)?Array<([\s\S]+)>$/);
    if (arrM) elemType = arrM[1].trim();
  }
  if (elemType) {
    return [0, 1, 2].map((idx) => synthesizeValueForType(fieldName.replace(/s$/, ''), elemType, defs, idx, depth + 1, null));
  }

  // Inline object type: { ... }
  if (t.startsWith('{') && t.endsWith('}')) {
    const fields = parseObjectTypeFields(t.slice(1, -1));
    const obj = {};
    for (const f of fields) {
      if (isFunctionType(f.type) || isReactNodeType(f.type)) continue;
      if (f.optional && /^(className|style|ref|children|disabled|loading|error)$/i.test(f.name)) continue;
      const v = synthesizeValueForType(f.name, f.type, defs, variantIndex, depth + 1, null);
      if (v !== undefined) obj[f.name] = v;
    }
    return obj;
  }

  // Named interface / type alias lookup
  const baseIdent = t.replace(/<.*>$/, '').trim();
  if (defs.has(baseIdent)) {
    const def = defs.get(baseIdent);
    if (def.kind === 'alias') {
      return synthesizeValueForType(fieldName, def.expr, defs, variantIndex, depth + 1, callbackNames);
    }
    const obj = {};
    for (const f of def.fields) {
      if (isFunctionType(f.type) || isReactNodeType(f.type)) continue;
      if (f.optional && /^(className|style|ref|children|disabled|loading|error)$/i.test(f.name)) continue;
      const v = synthesizeValueForType(f.name, f.type, defs, variantIndex, depth + 1, null);
      if (v !== undefined) obj[f.name] = v;
    }
    return obj;
  }

  // Date
  if (baseIdent === 'Date') {
    return '2026-11-22T12:00:00.000Z';
  }

  // Record<K, V>
  const recM = t.match(/^Record<[^,]+,\s*([\s\S]+)>$/);
  if (recM) {
    return {
      primary: synthesizeValueForType('primary', recM[1].trim(), defs, 0, depth + 1, null),
      secondary: synthesizeValueForType('secondary', recM[1].trim(), defs, 1, depth + 1, null),
    };
  }

  // Fallback primitive
  return synthesizePrimitiveForName(fieldName, t, variantIndex);
}

/**
 * Pure TypeScript component props synthesizer.
 * Parses exported React component signatures + TS interfaces/types and produces
 * safe, JSON-serializable sample props so standalone components (such as
 * AaveSwapComponent({ from, to }: AaveSwapComponentProps)) render live without
 * undefined-property crashes.
 */
export function synthesizeTsxSampleProps(sourceCode = '', auxiliaryFiles = []) {
  const src = String(sourceCode || '');
  if (!src.trim()) return { props: {}, callbackNames: [] };

  const auxText = Array.isArray(auxiliaryFiles)
    ? auxiliaryFiles.map((f) => String(f && f.code ? f.code : '')).join('\n\n')
    : '';
  const defs = collectTypeDefinitions(`${auxText}\n\n${src}`);
  const clean = stripTsComments(src);

  // Locate primary exported component parameter list
  const sigPatterns = [
    /export\s+default\s+function\s+[A-Z][\w$]*\s*\(([\s\S]*?)\)\s*(?::[^{=]+)?\{/,
    /export\s+function\s+[A-Z][\w$]*\s*\(([\s\S]*?)\)\s*(?::[^{=]+)?\{/,
    /export\s+(?:const|let)\s+[A-Z][\w$]*\s*:\s*React\.(?:FC|FunctionComponent)<([^>]+)>\s*=\s*\(([\s\S]*?)\)\s*=>/,
    /export\s+(?:const|let)\s+[A-Z][\w$]*\s*=\s*(?:React\.)?forwardRef<[^>]*>\s*\(\s*\(([\s\S]*?)\)\s*=>/,
    /export\s+(?:const|let)\s+[A-Z][\w$]*\s*=\s*\(([\s\S]*?)\)\s*(?::[^{=]+)?=>/,
    /function\s+[A-Z][\w$]*\s*\(([\s\S]*?)\)\s*(?::[^{=]+)?\{/,
  ];

  let paramStr = '';
  let explicitFcType = '';
  for (let i = 0; i < sigPatterns.length; i++) {
    const m = clean.match(sigPatterns[i]);
    if (m) {
      if (i === 2) {
        explicitFcType = m[1].trim();
        paramStr = m[2].trim();
      } else {
        paramStr = m[1].trim();
      }
      break;
    }
  }

  if (!paramStr && !explicitFcType) return { props: {}, callbackNames: [] };

  // Only inspect first parameter (props)
  const firstParam = splitTopLevel(paramStr, [','])[0] || '';
  let propsTypeExpr = explicitFcType;
  let destructuredNames = [];
  let defaultedNames = new Set();

  if (firstParam.startsWith('{')) {
    const blk = readBalancedBlock(firstParam, 0, '{', '}');
    if (blk) {
      const items = splitTopLevel(blk.content, [',']);
      for (const item of items) {
        const trimmed = item.trim();
        if (!trimmed || trimmed.startsWith('...')) continue;
        const hasDefault = trimmed.includes('=');
        const left = trimmed.split('=')[0].trim();
        const propName = left.split(':')[0].trim();
        if (/^[A-Za-z_$][\w$]*$/.test(propName)) {
          destructuredNames.push(propName);
          if (hasDefault) defaultedNames.add(propName);
        }
      }
      const afterBrace = firstParam.slice(blk.endIdx + 1).trim();
      if (afterBrace.startsWith(':')) {
        propsTypeExpr = afterBrace.slice(1).split('=')[0].trim();
      }
    }
  } else if (firstParam.includes(':')) {
    const colonIdx = firstParam.indexOf(':');
    propsTypeExpr = firstParam.slice(colonIdx + 1).split('=')[0].trim();
  }

  const SKIP_OPTIONAL = new Set([
    'className', 'class', 'style', 'id', 'ref', 'key', 'children', 'asChild',
    'disabled', 'readOnly', 'loading', 'isLoading', 'error', 'open', 'defaultOpen',
    'value', 'defaultValue', 'checked', 'defaultChecked', 'selected', 'onOpenChange',
  ]);

  const props = {};
  const callbackNames = [];
  let tokenVariantCursor = 0;

  let fields = [];
  if (propsTypeExpr) {
    if (propsTypeExpr.startsWith('{') && propsTypeExpr.endsWith('}')) {
      fields = parseObjectTypeFields(propsTypeExpr.slice(1, -1));
    } else {
      const baseType = propsTypeExpr.replace(/<.*>$/, '').trim();
      if (defs.has(baseType) && defs.get(baseType).kind === 'object') {
        fields = defs.get(baseType).fields;
      }
    }
  }

  const fieldMap = new Map(fields.map((f) => [f.name, f]));

  // 1. Synthesize all required fields from the props interface/type (unless the component already provides a default value)
  for (const f of fields) {
    if (defaultedNames.has(f.name)) continue;
    if (SKIP_OPTIONAL.has(f.name)) continue;
    const isDestructuredWithoutDefault = destructuredNames.includes(f.name) && !defaultedNames.has(f.name);
    if (f.optional && !isDestructuredWithoutDefault) continue;

    if (isFunctionType(f.type) || /^on[A-Z]/.test(f.name)) {
      callbackNames.push(f.name);
      continue;
    }
    if (isReactNodeType(f.type)) continue;

    const variantIdx = looksLikeTokenFieldName(f.name) ? tokenVariantCursor++ : 0;
    const val = synthesizeValueForType(f.name, f.type, defs, variantIdx, 0, callbackNames);
    if (val !== undefined) {
      props[f.name] = val;
    }
  }

  // 2. Fallback for untyped destructured props without defaults
  for (const name of destructuredNames) {
    if (name in props || defaultedNames.has(name) || SKIP_OPTIONAL.has(name)) continue;
    if (fieldMap.has(name)) continue;
    if (/^on[A-Z]/.test(name)) {
      callbackNames.push(name);
      continue;
    }
    if (/^(items|data|list|rows|options|tabs|steps|cards|features|users|tokens|images|slides|links|events|messages|notifications|files|tasks|columns|nodes|edges|categories|plans)$/i.test(name)) {
      props[name] = [0, 1, 2].map((idx) => ({
        id: `item-${idx + 1}`,
        name: ['Alpha', 'Beta', 'Gamma'][idx],
        title: ['Overview', 'Analytics', 'Deployments'][idx],
        label: ['Overview', 'Analytics', 'Deployments'][idx],
        value: (idx + 1) * 28,
        description: 'Interactive sample preview item',
        avatar: SAMPLE_AVATARS[idx % SAMPLE_AVATARS.length],
        image: SAMPLE_CARD_IMAGES[idx % SAMPLE_CARD_IMAGES.length],
        logo: TOKEN_PRESETS[idx % TOKEN_PRESETS.length].logo,
        symbol: TOKEN_PRESETS[idx % TOKEN_PRESETS.length].symbol,
        priceUSD: TOKEN_PRESETS[idx % TOKEN_PRESETS.length].priceUSD,
      }));
    } else if (looksLikeTokenFieldName(name)) {
      props[name] = { ...TOKEN_PRESETS[tokenVariantCursor++ % TOKEN_PRESETS.length] };
    }
  }

  return { props, callbackNames: Array.from(new Set(callbackNames)) };
}

export function buildTsxSandboxScript({
  code = '',
  demoCode = '',
  auxiliaryFiles = [],
  sourcePath = '',
  name = 'UI Component',
  id = '',
  libraryId = '',
  samplePropsOverride = null,
} = {}) {
  const cleanCode = String(code || '').trim();
  const cleanDemo = String(demoCode || '').trim();
  const auxList = Array.isArray(auxiliaryFiles) ? auxiliaryFiles : [];
  const synthesized = !cleanDemo && cleanCode
    ? synthesizeTsxSampleProps(cleanCode, auxList)
    : { props: {}, callbackNames: [] };

  const mergedProps = samplePropsOverride && typeof samplePropsOverride === 'object'
    ? { ...synthesized.props, ...samplePropsOverride }
    : synthesized.props;

  const payloadJson = safeInlineJson({
    id: String(id || '').trim(),
    libraryId: String(libraryId || '').trim(),
    code: cleanCode,
    demoCode: cleanDemo,
    auxiliaryFiles: auxList,
    sourcePath: String(sourcePath || '').trim(),
    name: String(name || 'UI Component').trim(),
    sampleProps: mergedProps,
    callbackNames: synthesized.callbackNames,
  });

  return `<script>
(function () {
  var PAYLOAD = ${payloadJson};
  var mount = document.getElementById('wfStageRoot');
  var React = window.React;
  var ReactDOM = window.ReactDOM;
  var origCreateElement = React.createElement;
  function reportStatus(statusObj) {
    window.__wfPreviewStatus = statusObj;
    try {
      window.parent.postMessage(Object.assign({
        type: 'wf-preview-status',
        id: PAYLOAD.id || '',
        libraryId: PAYLOAD.libraryId || ''
      }, statusObj || {}), '*');
    } catch (_) {}
  }

  function isMotionValue(val) {
    return Boolean(val && typeof val === 'object' && typeof val.get === 'function' && typeof val.set === 'function');
  }
  function sanitizeMotionChild(child) {
    if (isMotionValue(child)) {
      var v = child.get();
      return v === undefined || v === null ? '' : String(v);
    }
    if (Array.isArray(child)) {
      var changed = false;
      var mapped = new Array(child.length);
      for (var i = 0; i < child.length; i++) {
        var next = sanitizeMotionChild(child[i]);
        if (next !== child[i]) changed = true;
        mapped[i] = next;
      }
      return changed ? mapped : child;
    }
    return child;
  }
  function unwrapMotionStyle(styleObj) {
    if (!styleObj || typeof styleObj !== 'object') return styleObj;
    var out = {};
    for (var k in styleObj) {
      var val = styleObj[k];
      out[k] = (val && typeof val === 'object' && typeof val.get === 'function') ? val.get() : val;
    }
    return out;
  }
  function safeCreateElement(type, props) {
    if (type === undefined || type === null) {
      type = 'div';
    } else if (typeof type === 'object' && !type.$$typeof && typeof type.render !== 'function') {
      type = typeof type.default === 'function' ? type.default : (typeof type.Root === 'function' ? type.Root : 'div');
    }
    var safeProps = props;
    if (type === 'img' && props && typeof props.src === 'string') {
      var imgSrc = props.src.trim();
      var fallbackSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 200'%3E%3Crect width='320' height='200' fill='%23111827'/%3E%3Ccircle cx='240' cy='64' r='48' fill='%2310B981' fill-opacity='0.22'/%3E%3Crect x='24' y='132' width='136' height='10' rx='5' fill='%23fff' fill-opacity='0.18'/%3E%3Crect x='24' y='152' width='84' height='8' rx='4' fill='%23fff' fill-opacity='0.1'/%3E%3C/svg%3E";
      if (!imgSrc || (imgSrc.charAt(0) === '/' && imgSrc.indexOf('//') !== 0 && imgSrc.indexOf('/assets/aistudio/') !== 0)) {
        safeProps = Object.assign({}, props, { src: fallbackSvg });
      } else if (!props.onError) {
        safeProps = Object.assign({}, props, {
          onError: function (e) {
            if (e && e.currentTarget && e.currentTarget.src !== fallbackSvg) {
              e.currentTarget.src = fallbackSvg;
            }
          }
        });
      }
    }
    if (safeProps && safeProps.style && typeof safeProps.style === 'object') {
      var hasMvStyle = false;
      for (var sk in safeProps.style) {
        if (isMotionValue(safeProps.style[sk])) { hasMvStyle = true; break; }
      }
      if (hasMvStyle) {
        safeProps = Object.assign({}, safeProps, { style: unwrapMotionStyle(safeProps.style) });
      }
    }
    var args = [type, safeProps];
    for (var i = 2; i < arguments.length; i++) {
      args.push(sanitizeMotionChild(arguments[i]));
    }
    return origCreateElement.apply(React, args);
  }
  var SafeReact = Object.assign({}, React, { createElement: safeCreateElement });
  var h = safeCreateElement;

  function showFallback(title, detail, stack, reasonCode) {
    reportStatus({
      ok: false,
      reasonCode: reasonCode || 'RUNTIME_ERROR',
      message: String(detail || 'Preview failed to render'),
      stack: String(stack || '')
    });
    if (!mount) return;
    mount.innerHTML = ''
      + '<div class="w-full max-w-md rounded-xl border border-border bg-card p-5 text-left" role="alert">'
      + '  <div class="flex items-start gap-3">'
      + '    <span class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive" aria-hidden="true">'
      + '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>'
      + '    </span>'
      + '    <div class="min-w-0 flex-1">'
      + '      <div class="text-sm font-semibold text-foreground wf-err-title"></div>'
      + '      <p class="mt-1 text-xs text-muted-foreground leading-relaxed wf-err-msg"></p>'
      + '      <div class="mt-3 flex items-center gap-2">'
      + '        <button type="button" class="inline-flex h-7 items-center rounded-md border border-border bg-secondary px-2.5 text-xs font-medium text-secondary-foreground hover:opacity-90 wf-err-retry">Retry</button>'
      + '      </div>'
      + '      <details class="mt-3 hidden wf-err-details">'
      + '        <summary class="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Stack trace</summary>'
      + '        <pre class="mt-2 max-h-40 overflow-auto rounded-md bg-muted/60 p-2 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap wf-err-stack"></pre>'
      + '      </details>'
      + '    </div>'
      + '  </div>'
      + '</div>';
    var tEl = mount.querySelector('.wf-err-title');
    var mEl = mount.querySelector('.wf-err-msg');
    var dEl = mount.querySelector('.wf-err-details');
    var sEl = mount.querySelector('.wf-err-stack');
    var rBtn = mount.querySelector('.wf-err-retry');
    if (tEl) tEl.textContent = title || PAYLOAD.name || 'Preview error';
    if (mEl) mEl.textContent = String(detail || 'Unable to render component in offline sandbox.');
    if (stack && dEl && sEl) {
      dEl.classList.remove('hidden');
      sEl.textContent = String(stack);
    }
    if (rBtn) {
      rBtn.addEventListener('click', function () {
        if (typeof window.__wfRemountPreview === 'function') {
          window.__wfRemountPreview();
        } else {
          window.location.reload();
        }
      });
    }
  }

  function showToast(msg) {
    var el = document.getElementById('wfPreviewToast');
    if (!el) return;
    el.textContent = String(msg || '');
    el.classList.add('show');
    clearTimeout(window.__wfToastT);
    window.__wfToastT = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  // ── 1. cn() & clsx() & twMerge() ──
  function clsx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (!arg) continue;
      if (typeof arg === 'string' || typeof arg === 'number') {
        out.push(String(arg));
      } else if (Array.isArray(arg)) {
        var inner = clsx.apply(null, arg);
        if (inner) out.push(inner);
      } else if (typeof arg === 'object') {
        for (var k in arg) {
          if (Object.prototype.hasOwnProperty.call(arg, k) && arg[k]) out.push(k);
        }
      }
    }
    return out.join(' ');
  }
  function cn() {
    return clsx.apply(null, arguments);
  }

  // ── 2. cva() (class-variance-authority) ──
  function cva(base, config) {
    config = config || {};
    return function (props) {
      props = props || {};
      var classes = [base];
      var variants = config.variants || {};
      var defaults = config.defaultVariants || {};
      var resolved = {};
      for (var vk in variants) {
        var val = props[vk] !== undefined ? props[vk] : defaults[vk];
        if (val !== undefined && val !== null) {
          resolved[vk] = val;
          var vMap = variants[vk];
          if (vMap && vMap[String(val)]) classes.push(vMap[String(val)]);
        }
      }
      if (Array.isArray(config.compoundVariants)) {
        config.compoundVariants.forEach(function (cv) {
          var match = true;
          for (var ck in cv) {
            if (ck === 'class' || ck === 'className') continue;
            var expected = cv[ck];
            var actual = resolved[ck];
            if (Array.isArray(expected)) {
              if (expected.indexOf(actual) === -1) { match = false; break; }
            } else if (actual !== expected) {
              match = false; break;
            }
          }
          if (match) classes.push(cv.class || cv.className || '');
        });
      }
      if (props.class) classes.push(props.class);
      if (props.className) classes.push(props.className);
      return cn(classes);
    };
  }

  // ── 3. Crash-safe Icon Suite (Lucide, react-icons/*, @hugeicons/*, @aliimam/*, Tabler, Phosphor) ──
  var ICON_PATHS = {
    Check: '<path d="M20 6 9 17l-5-5"/>',
    CheckCheck: '<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
    X: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    Plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    Minus: '<path d="M5 12h14"/>',
    Search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    ChevronDown: '<path d="m6 9 6 6 6-6"/>',
    ChevronUp: '<path d="m18 15-6-6-6 6"/>',
    ChevronRight: '<path d="m9 18 6-6-6-6"/>',
    ChevronLeft: '<path d="m15 18-6-6 6-6"/>',
    ChevronsUpDown: '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
    ArrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    ArrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    ArrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    ArrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    ArrowUpDown: '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
    ArrowUpRight: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    ArrowDownLeft: '<path d="M17 7 7 17"/><path d="M17 17H7V7"/>',
    Sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
    Send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    Copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    Trash2: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    Trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>',
    Settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    User: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    Users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    Mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    Bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    Calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    Clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    Heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    Star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    Home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    Menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    MoreHorizontal: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    Ellipsis: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    MoreVertical: '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
    Sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/>',
    Moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    Eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    EyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
    Lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    Globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    Zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    Shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    ShieldCheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    AlertCircle: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    AlertTriangle: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    Info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    HelpCircle: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    CheckCircle2: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    CircleCheck: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    CircleAlert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    Loader2: '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
    Terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
    Code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    FileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    Folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    Paperclip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    Mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
    Upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    Download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    ExternalLink: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    CreditCard: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
    Wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    Coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/>',
    DollarSign: '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    TrendingUp: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    TrendingDown: '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
    BarChart3: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    BarChart2: '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>',
    Activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    Flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    Bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    Share2: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
    Filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    SlidersHorizontal: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/>',
    LogOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    RotateCcw: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    RefreshCw: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    Image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    Video: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    Music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    Volume2: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
    Database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    Cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    Key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    Crown: '<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>',
    ShoppingCart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    ShoppingBag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    Tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
    MapPin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    Phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    Archive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    Edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    Pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    LayoutGrid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    LayoutDashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    List: '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
    GripVertical: '<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>',
    ThumbsUp: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
    Laptop: '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',
    Smartphone: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
    Monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    Command: '<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>',
    Bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
    Circle: '<circle cx="12" cy="12" r="10"/>',
    PanelLeft: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
    Play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    Pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    Layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    MessageSquare: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    Inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    Rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>',
    Package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    Briefcase: '<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    Link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    BookOpen: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    Save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    Github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
    Twitter: '<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>',
    Chrome: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" x2="12" y1="8" y2="8"/><line x1="3.95" x2="8.54" y1="6.06" y2="14"/><line x1="10.88" x2="21.94" y1="21.94" y2="14"/>'
  };

  function resolveIconPath(iconName) {
    var raw = String(iconName || '');
    if (ICON_PATHS[raw]) return ICON_PATHS[raw];
    var noSuffix = raw.replace(/(Icon|Outline|Solid|Fill|Line|Duotone|Bold|Regular|Light|Thin|01|02|03)$/, '');
    if (ICON_PATHS[noSuffix]) return ICON_PATHS[noSuffix];
    // Strip react-icons pack prefixes (Fa, Fi, Hi2, Hi, Io5, Io, Md, Ri, Si, Tb, Bi, Bs, Ai, Lu, Go, Ti, Vsc, Ci, Pi, Cg, Gr, Im, Sl)
    var noPrefix = noSuffix.replace(/^(Hi2|Io5|Vsc|Fa6|Fa|Fi|Hi|Io|Md|Ri|Si|Tb|Bi|Bs|Ai|Lu|Go|Ti|Ci|Pi|Cg|Gr|Im|Sl)(?=[A-Z])/, '');
    if (ICON_PATHS[noPrefix]) return ICON_PATHS[noPrefix];
    var low = noPrefix.toLowerCase();
    if (low.indexOf('swap') !== -1 || low.indexOf('exchange') !== -1 || low.indexOf('switch') !== -1) return ICON_PATHS.ArrowUpDown;
    if (low.indexOf('chevron') !== -1 && low.indexOf('down') !== -1) return ICON_PATHS.ChevronDown;
    if (low.indexOf('chevron') !== -1 && low.indexOf('up') !== -1) return ICON_PATHS.ChevronUp;
    if (low.indexOf('chevron') !== -1 && low.indexOf('right') !== -1) return ICON_PATHS.ChevronRight;
    if (low.indexOf('chevron') !== -1 && low.indexOf('left') !== -1) return ICON_PATHS.ChevronLeft;
    if (low.indexOf('arrow') !== -1 && low.indexOf('down') !== -1) return ICON_PATHS.ArrowDown;
    if (low.indexOf('arrow') !== -1 && low.indexOf('up') !== -1) return ICON_PATHS.ArrowUp;
    if (low.indexOf('arrow') !== -1 && low.indexOf('left') !== -1) return ICON_PATHS.ArrowLeft;
    if (low.indexOf('arrow') !== -1) return ICON_PATHS.ArrowRight;
    if (low.indexOf('check') !== -1) return ICON_PATHS.Check;
    if (low.indexOf('close') !== -1 || low.indexOf('cancel') !== -1) return ICON_PATHS.X;
    if (low.indexOf('search') !== -1) return ICON_PATHS.Search;
    if (low.indexOf('plus') !== -1 || low.indexOf('add') !== -1) return ICON_PATHS.Plus;
    if (low.indexOf('minus') !== -1) return ICON_PATHS.Minus;
    if (low.indexOf('user') !== -1 || low.indexOf('person') !== -1) return ICON_PATHS.User;
    if (low.indexOf('mail') !== -1 || low.indexOf('envelope') !== -1) return ICON_PATHS.Mail;
    if (low.indexOf('bell') !== -1 || low.indexOf('notif') !== -1) return ICON_PATHS.Bell;
    if (low.indexOf('star') !== -1) return ICON_PATHS.Star;
    if (low.indexOf('heart') !== -1) return ICON_PATHS.Heart;
    if (low.indexOf('setting') !== -1 || low.indexOf('cog') !== -1 || low.indexOf('gear') !== -1) return ICON_PATHS.Settings;
    if (low.indexOf('trash') !== -1 || low.indexOf('delete') !== -1) return ICON_PATHS.Trash2;
    if (low.indexOf('edit') !== -1 || low.indexOf('pencil') !== -1) return ICON_PATHS.Edit;
    if (low.indexOf('copy') !== -1) return ICON_PATHS.Copy;
    if (low.indexOf('send') !== -1) return ICON_PATHS.Send;
    if (low.indexOf('lock') !== -1) return ICON_PATHS.Lock;
    if (low.indexOf('calendar') !== -1) return ICON_PATHS.Calendar;
    if (low.indexOf('clock') !== -1 || low.indexOf('time') !== -1) return ICON_PATHS.Clock;
    if (low.indexOf('wallet') !== -1) return ICON_PATHS.Wallet;
    if (low.indexOf('dollar') !== -1 || low.indexOf('coin') !== -1) return ICON_PATHS.DollarSign;
    if (low.indexOf('chart') !== -1 || low.indexOf('graph') !== -1) return ICON_PATHS.BarChart3;
    if (low.indexOf('home') !== -1) return ICON_PATHS.Home;
    if (low.indexOf('menu') !== -1 || low.indexOf('bars') !== -1) return ICON_PATHS.Menu;
    if (low.indexOf('sun') !== -1) return ICON_PATHS.Sun;
    if (low.indexOf('moon') !== -1) return ICON_PATHS.Moon;
    if (low.indexOf('eye') !== -1) return ICON_PATHS.Eye;
    if (low.indexOf('info') !== -1) return ICON_PATHS.Info;
    if (low.indexOf('sparkle') !== -1 || low.indexOf('magic') !== -1) return ICON_PATHS.Sparkles;
    return '<circle cx="12" cy="12" r="8"/><path d="M12 8v8"/><path d="M8 12h8"/>';
  }

  function makeIcon(iconName) {
    var pathHtml = resolveIconPath(iconName);
    var IconComp = React.forwardRef(function (props, ref) {
      props = props || {};
      var size = props.size || 18;
      var rest = {};
      for (var k in props) {
        if (k !== 'size' && k !== 'color' && k !== 'strokeWidth' && k !== 'absoluteStrokeWidth' && k !== 'weight' && k !== 'variant' && k !== 'children') {
          rest[k] = props[k];
        }
      }
      rest.ref = ref;
      rest.xmlns = 'http://www.w3.org/2000/svg';
      rest.width = props.width || size;
      rest.height = props.height || size;
      rest.viewBox = '0 0 24 24';
      rest.fill = 'none';
      rest.stroke = props.color || 'currentColor';
      rest.strokeWidth = props.strokeWidth || 2;
      rest.strokeLinecap = 'round';
      rest.strokeLinejoin = 'round';
      rest.className = cn('lucide shrink-0', props.className);
      rest.dangerouslySetInnerHTML = { __html: pathHtml };
      return h('svg', rest);
    });
    IconComp.displayName = iconName;
    return IconComp;
  }

  var iconCache = {};
  var lucideProxy = new Proxy({}, {
    get: function (_t, prop) {
      if (prop === '__esModule') return true;
      if (prop === 'default') return lucideProxy;
      if (typeof prop !== 'string') return undefined;
      if (prop === 'createLucideIcon') return function (n) { return makeIcon(n); };
      if (!iconCache[prop]) iconCache[prop] = makeIcon(prop);
      return iconCache[prop];
    }
  });

  // ── 4. motion/react & framer-motion Shim ──
  var MOTION_SKIP = {
    initial: 1, animate: 1, exit: 1, transition: 1, variants: 1,
    whileHover: 1, whileTap: 1, whileFocus: 1, whileInView: 1, whileDrag: 1,
    viewport: 1, layout: 1, layoutId: 1, layoutDependency: 1, drag: 1,
    dragConstraints: 1, dragElastic: 1, dragMomentum: 1, dragSnapToOrigin: 1,
    onDrag: 1, onDragStart: 1, onDragEnd: 1, onAnimationStart: 1,
    onAnimationComplete: 1, onUpdate: 1, onViewportEnter: 1, onViewportLeave: 1,
    custom: 1, transformTemplate: 1, dragControls: 1, dragListener: 1,
    layoutScroll: 1, layoutRoot: 1
  };
  function makeMotionValue(init) {
    var v = init !== undefined ? init : 0;
    var listeners = [];
    return {
      get: function () { return v; },
      set: function (next) {
        v = next;
        for (var i = 0; i < listeners.length; i++) {
          try { listeners[i](next); } catch (_e) {}
        }
      },
      jump: function (next) { v = next; },
      on: function (_ev, cb) {
        if (typeof cb === 'function') listeners.push(cb);
        return function () { listeners = listeners.filter(function (fn) { return fn !== cb; }); };
      },
      onChange: function (cb) {
        if (typeof cb === 'function') listeners.push(cb);
        return function () { listeners = listeners.filter(function (fn) { return fn !== cb; }); };
      },
      stop: function () {},
      isAnimating: function () { return false; },
      toString: function () { return String(v); },
      valueOf: function () { return v; }
    };
  }
  function useMotionTemplate(strings) {
    var parts = [];
    for (var i = 0; i < strings.length; i++) {
      parts.push(strings[i]);
      if (i + 1 < arguments.length) {
        var expr = arguments[i + 1];
        if (expr && typeof expr === 'object' && typeof expr.get === 'function') {
          parts.push(String(expr.get()));
        } else if (expr !== undefined && expr !== null) {
          parts.push(String(expr));
        }
      }
    }
    return makeMotionValue(parts.join(''));
  }
  var motionCache = {};
  var motionProxy = new Proxy(function (Comp) { return Comp; }, {
    get: function (_t, tag) {
      if (typeof tag !== 'string') return undefined;
      if (tag === 'create') {
        return function (Comp) { return Comp; };
      }
      if (!motionCache[tag]) {
        motionCache[tag] = React.forwardRef(function (props, ref) {
          var clean = { ref: ref };
          for (var k in props) {
            if (!MOTION_SKIP[k]) clean[k] = props[k];
          }
          clean.style = Object.assign(
            { transition: 'all 220ms cubic-bezier(0.22,1,0.36,1)' },
            unwrapMotionStyle(clean.style) || {}
          );
          return h(tag, clean, props.children);
        });
      }
      return motionCache[tag];
    }
  });
  var motionBase = {
    __esModule: true,
    motion: motionProxy,
    m: motionProxy,
    AnimatePresence: function (p) { return h(React.Fragment, null, p.children); },
    MotionConfig: function (p) { return h(React.Fragment, null, p.children); },
    LazyMotion: function (p) { return h(React.Fragment, null, p.children); },
    LayoutGroup: function (p) { return h(React.Fragment, null, p.children); },
    Reorder: {
      Group: React.forwardRef(function (p, ref) { return h(p.as || 'ul', Object.assign({ ref: ref, className: p.className, style: unwrapMotionStyle(p.style) }), p.children); }),
      Item: React.forwardRef(function (p, ref) { return h(p.as || 'li', Object.assign({ ref: ref, className: p.className, style: unwrapMotionStyle(p.style) }), p.children); })
    },
    domAnimation: {},
    domMax: {},
    MotionGlobalConfig: { skipAnimations: false },
    useAnimation: function () { return { start: function () { return Promise.resolve(); }, stop: function () {}, set: function () {} }; },
    useAnimationControls: function () { return { start: function () { return Promise.resolve(); }, stop: function () {}, set: function () {} }; },
    useInView: function () { return true; },
    useReducedMotion: function () { return false; },
    useMotionValue: function (init) { return React.useRef(makeMotionValue(init)).current; },
    useMotionTemplate: useMotionTemplate,
    useMotionValueEvent: function () {},
    useVelocity: function () { return makeMotionValue(0); },
    useTime: function () { return makeMotionValue(0); },
    useSpring: function (init) { return (init && typeof init === 'object' && typeof init.get === 'function') ? init : makeMotionValue(init || 0); },
    useTransform: function (val, inputRange, outputRange) {
      var fallback = Array.isArray(outputRange) && outputRange.length ? outputRange[0] : (typeof inputRange === 'function' ? inputRange(val && val.get ? val.get() : 0) : 0);
      return makeMotionValue(fallback);
    },
    useScroll: function () {
      return {
        scrollX: makeMotionValue(0),
        scrollY: makeMotionValue(0),
        scrollXProgress: makeMotionValue(0),
        scrollYProgress: makeMotionValue(0)
      };
    },
    useAnimate: function () { return [React.useRef(null), function () { return Promise.resolve(); }]; },
    useDragControls: function () { return { start: function () {} }; },
    usePresence: function () { return [true, function () {}]; },
    useIsPresent: function () { return true; },
    useCycle: function () {
      var items = Array.prototype.slice.call(arguments);
      var st = React.useState(0);
      return [items[st[0]], function () { st[1](function (i) { return (i + 1) % Math.max(1, items.length); }); }];
    },
    stagger: function () { return 0; },
    cubicBezier: function () { return function (t) { return t; }; },
    spring: function () { return {}; },
    easeIn: 'easeIn',
    easeOut: 'easeOut',
    easeInOut: 'easeInOut',
    animate: function () { return { stop: function () {}, then: function (fn) { if (fn) fn(); return Promise.resolve(); } }; }
  };
  var motionModule = new Proxy(motionBase, {
    get: function (target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'string' && prop.indexOf('use') === 0) {
        return function (init) { return makeMotionValue(init !== undefined ? init : 0); };
      }
      return undefined;
    }
  });

  // ── 5. Slot & Interactive shadcn / Radix / Base UI Primitive Suite ──
  var Slot = React.forwardRef(function (props, ref) {
    var children = props.children;
    if (React.isValidElement(children)) {
      var merged = Object.assign({}, props, children.props, {
        ref: ref,
        className: cn(props.className, children.props && children.props.className)
      });
      delete merged.children;
      return React.cloneElement(children, merged);
    }
    return h('span', { ref: ref, className: props.className }, children);
  });

  function passProps(props, skip) {
    var out = {};
    for (var k in props) {
      if (k === 'children' || (skip && skip[k])) continue;
      if (k === 'asChild' || k === 'render' || k === 'sideOffset' || k === 'alignOffset' || k === 'avoidCollisions' || k === 'forceMount') continue;
      out[k] = props[k];
    }
    return out;
  }

  function box(defaultCls, tag) {
    return React.forwardRef(function (p, ref) {
      p = p || {};
      var Comp = p.asChild ? Slot : (tag || 'div');
      var out = passProps(p);
      out.ref = ref;
      out.className = cn(defaultCls, p.className);
      return h(Comp, out, p.children);
    });
  }

  // Button
  var buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring',
    {
      variants: {
        variant: {
          default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
          destructive: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
          outline: 'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
          secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
          ghost: 'hover:bg-accent hover:text-accent-foreground',
          link: 'text-primary underline-offset-4 hover:underline'
        },
        size: {
          default: 'h-9 px-4 py-2',
          sm: 'h-8 rounded-md px-3 text-xs',
          lg: 'h-10 rounded-md px-6',
          icon: 'h-9 w-9',
          'icon-sm': 'h-8 w-8',
          'icon-lg': 'h-10 w-10'
        }
      },
      defaultVariants: { variant: 'default', size: 'default' }
    }
  );
  var Button = React.forwardRef(function (props, ref) {
    props = props || {};
    var Comp = props.asChild ? Slot : 'button';
    var p = passProps(props, { variant: 1, size: 1, asChild: 1 });
    p.ref = ref;
    if (Comp === 'button' && !p.type) p.type = 'button';
    p.className = cn(buttonVariants({ variant: props.variant, size: props.size }), props.className);
    return h(Comp, p, props.children);
  });

  // Badge
  var badgeVariants = cva(
    'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 transition-colors',
    {
      variants: {
        variant: {
          default: 'border-transparent bg-primary text-primary-foreground',
          secondary: 'border-transparent bg-secondary text-secondary-foreground',
          destructive: 'border-transparent bg-destructive text-destructive-foreground',
          outline: 'text-foreground border-border'
        }
      },
      defaultVariants: { variant: 'default' }
    }
  );
  var Badge = function (props) {
    props = props || {};
    var Comp = props.asChild ? Slot : 'span';
    var p = passProps(props, { variant: 1, asChild: 1 });
    p.className = cn(badgeVariants({ variant: props.variant }), props.className);
    return h(Comp, p, props.children);
  };

  // Card
  var Card = React.forwardRef(function (p, ref) {
    return h('div', Object.assign(passProps(p), { ref: ref, className: cn('bg-card text-card-foreground flex flex-col gap-5 rounded-xl border border-border py-6 shadow-sm', p.className) }), p.children);
  });
  var CardHeader = function (p) { return h('div', Object.assign(passProps(p), { className: cn('flex flex-col gap-1.5 px-6', p.className) }), p.children); };
  var CardTitle = function (p) { return h('div', Object.assign(passProps(p), { className: cn('leading-none font-semibold tracking-tight', p.className) }), p.children); };
  var CardDescription = function (p) { return h('div', Object.assign(passProps(p), { className: cn('text-muted-foreground text-sm', p.className) }), p.children); };
  var CardAction = function (p) { return h('div', Object.assign(passProps(p), { className: cn('ml-auto', p.className) }), p.children); };
  var CardContent = function (p) { return h('div', Object.assign(passProps(p), { className: cn('px-6', p.className) }), p.children); };
  var CardFooter = function (p) { return h('div', Object.assign(passProps(p), { className: cn('flex items-center px-6 pt-2', p.className) }), p.children); };

  // Input / Textarea / Label / Separator / Skeleton / Progress
  var Input = React.forwardRef(function (p, ref) {
    return h('input', Object.assign(passProps(p), { ref: ref, className: cn('flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50', p.className) }));
  });
  var Textarea = React.forwardRef(function (p, ref) {
    return h('textarea', Object.assign(passProps(p), { ref: ref, className: cn('flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50', p.className) }));
  });
  var Label = React.forwardRef(function (p, ref) {
    return h('label', Object.assign(passProps(p), { ref: ref, className: cn('text-sm font-medium leading-none select-none', p.className) }), p.children);
  });
  var Separator = function (p) {
    p = p || {};
    var vert = p.orientation === 'vertical';
    return h('div', Object.assign(passProps(p, { orientation: 1, decorative: 1 }), { role: 'separator', className: cn('shrink-0 bg-border', vert ? 'h-full w-px' : 'h-px w-full', p.className) }));
  };
  var Skeleton = function (p) {
    return h('div', Object.assign(passProps(p), { className: cn('animate-pulse rounded-md bg-muted', p.className) }));
  };
  var Progress = function (p) {
    p = p || {};
    var val = Math.max(0, Math.min(100, Number(p.value || 0)));
    return h('div', Object.assign(passProps(p, { value: 1, max: 1 }), { className: cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', p.className) }),
      h('div', { className: 'h-full bg-primary transition-all', style: { width: val + '%' } })
    );
  };

  // Avatar
  var Avatar = function (p) { return h('span', Object.assign(passProps(p), { className: cn('relative flex size-10 shrink-0 overflow-hidden rounded-full bg-muted', p.className) }), p.children); };
  var AvatarImage = function (p) {
    var st = React.useState(false);
    if (st[0] || !p.src) return null;
    return h('img', Object.assign(passProps(p), { referrerPolicy: 'no-referrer', onError: function () { st[1](true); }, className: cn('aspect-square size-full object-cover', p.className) }));
  };
  var AvatarFallback = function (p) { return h('span', Object.assign(passProps(p), { className: cn('flex size-full items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground', p.className) }), p.children); };

  // Alert
  var Alert = function (p) {
    var dest = p.variant === 'destructive';
    return h('div', Object.assign(passProps(p, { variant: 1 }), { role: 'alert', className: cn('relative w-full rounded-lg border px-4 py-3 text-sm grid gap-1', dest ? 'border-destructive/50 text-destructive bg-destructive/5' : 'bg-card text-card-foreground border-border', p.className) }), p.children);
  };
  var AlertTitle = function (p) { return h('h5', Object.assign(passProps(p), { className: cn('font-medium leading-none tracking-tight', p.className) }), p.children); };
  var AlertDescription = function (p) { return h('div', Object.assign(passProps(p), { className: cn('text-sm text-muted-foreground leading-relaxed', p.className) }), p.children); };

  // Switch (Interactive)
  var Switch = React.forwardRef(function (p, ref) {
    p = p || {};
    var st = React.useState(Boolean(p.defaultChecked));
    var checked = p.checked !== undefined ? Boolean(p.checked) : st[0];
    function toggle() {
      var next = !checked;
      if (p.checked === undefined) st[1](next);
      if (typeof p.onCheckedChange === 'function') p.onCheckedChange(next);
    }
    return h('button', {
      ref: ref, type: 'button', role: 'switch', 'aria-checked': checked, 'data-state': checked ? 'checked' : 'unchecked',
      id: p.id, disabled: p.disabled, onClick: toggle,
      className: cn('inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors', checked ? 'bg-primary' : 'bg-input', p.className)
    }, h('span', { className: cn('pointer-events-none block size-4 rounded-full bg-background shadow-md transition-transform', checked ? 'translate-x-4' : 'translate-x-0') }));
  });

  // Checkbox (Interactive)
  var Checkbox = React.forwardRef(function (p, ref) {
    p = p || {};
    var st = React.useState(Boolean(p.defaultChecked));
    var checked = p.checked !== undefined ? Boolean(p.checked) : st[0];
    function toggle() {
      var next = !checked;
      if (p.checked === undefined) st[1](next);
      if (typeof p.onCheckedChange === 'function') p.onCheckedChange(next);
    }
    return h('button', {
      ref: ref, type: 'button', role: 'checkbox', 'aria-checked': checked, 'data-state': checked ? 'checked' : 'unchecked',
      id: p.id, disabled: p.disabled, onClick: toggle,
      className: cn('inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-primary shadow-xs cursor-pointer transition-colors', checked ? 'bg-primary text-primary-foreground' : 'bg-transparent', p.className)
    }, checked ? h(lucideProxy.Check, { className: 'size-3' }) : null);
  });

  // Slider (Interactive)
  var Slider = function (p) {
    p = p || {};
    var initVal = Array.isArray(p.defaultValue) ? p.defaultValue[0] : (Array.isArray(p.value) ? p.value[0] : (typeof p.defaultValue === 'number' ? p.defaultValue : 50));
    var st = React.useState(initVal);
    var val = Array.isArray(p.value) ? p.value[0] : (typeof p.value === 'number' ? p.value : st[0]);
    return h('input', {
      type: 'range', min: p.min || 0, max: p.max || 100, step: p.step || 1, value: val,
      onChange: function (e) {
        var n = Number(e.target.value);
        st[1](n);
        if (typeof p.onValueChange === 'function') p.onValueChange([n]);
      },
      className: cn('w-full accent-primary cursor-pointer', p.className)
    });
  };

  // Tabs (Interactive)
  var TabsCtx = React.createContext({ value: '', setValue: function () {} });
  var Tabs = function (p) {
    p = p || {};
    var st = React.useState(p.defaultValue || '');
    var val = p.value !== undefined ? p.value : st[0];
    var setVal = function (v) { if (p.value === undefined) st[1](v); if (typeof p.onValueChange === 'function') p.onValueChange(v); };
    return h(TabsCtx.Provider, { value: { value: val, setValue: setVal } },
      h('div', Object.assign(passProps(p, { defaultValue: 1, value: 1, onValueChange: 1 }), { className: cn('flex flex-col gap-2', p.className) }), p.children)
    );
  };
  var TabsList = function (p) { return h('div', Object.assign(passProps(p), { role: 'tablist', className: cn('bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1 gap-1', p.className) }), p.children); };
  var TabsTrigger = function (p) {
    var ctx = React.useContext(TabsCtx);
    var active = ctx.value === p.value;
    return h('button', Object.assign(passProps(p, { value: 1 }), {
      type: 'button', role: 'tab', 'aria-selected': active, 'data-state': active ? 'active' : 'inactive',
      onClick: function (e) { ctx.setValue(p.value); if (p.onClick) p.onClick(e); },
      className: cn('inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all cursor-pointer', active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground', p.className)
    }), p.children);
  };
  var TabsContent = function (p) {
    var ctx = React.useContext(TabsCtx);
    if (ctx.value && p.value && ctx.value !== p.value) return null;
    return h('div', Object.assign(passProps(p, { value: 1 }), { role: 'tabpanel', className: cn('mt-2 outline-none', p.className) }), p.children);
  };

  // Accordion (Interactive)
  var AccCtx = React.createContext({ open: {}, toggle: function () {} });
  var AccItemCtx = React.createContext('');
  var Accordion = function (p) {
    p = p || {};
    var init = {};
    if (typeof p.defaultValue === 'string') init[p.defaultValue] = true;
    else if (Array.isArray(p.defaultValue)) p.defaultValue.forEach(function (v) { init[v] = true; });
    var st = React.useState(init);
    function toggle(v) {
      st[1](function (prev) {
        if (p.type === 'multiple') {
          var nextM = Object.assign({}, prev);
          nextM[v] = !nextM[v];
          return nextM;
        }
        var nextS = {};
        if (!prev[v] || p.collapsible === false) nextS[v] = true;
        return nextS;
      });
    }
    return h(AccCtx.Provider, { value: { open: st[0], toggle: toggle } },
      h('div', Object.assign(passProps(p, { type: 1, collapsible: 1, defaultValue: 1, value: 1 }), { className: cn('w-full', p.className) }), p.children)
    );
  };
  var AccordionItem = function (p) {
    return h(AccItemCtx.Provider, { value: p.value || '' },
      h('div', Object.assign(passProps(p, { value: 1 }), { className: cn('border-b border-border last:border-b-0', p.className) }), p.children)
    );
  };
  var AccordionTrigger = function (p) {
    var ctx = React.useContext(AccCtx);
    var val = React.useContext(AccItemCtx);
    var isOpen = Boolean(ctx.open[val]);
    return h('button', Object.assign(passProps(p), {
      type: 'button', 'aria-expanded': isOpen, 'data-state': isOpen ? 'open' : 'closed',
      onClick: function () { ctx.toggle(val); },
      className: cn('flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium transition-all hover:underline cursor-pointer', p.className)
    }), p.children, h(lucideProxy.ChevronDown, { className: cn('size-4 text-muted-foreground transition-transform duration-200', isOpen ? 'rotate-180' : '') }));
  };
  var AccordionContent = function (p) {
    var ctx = React.useContext(AccCtx);
    var val = React.useContext(AccItemCtx);
    if (!ctx.open[val]) return null;
    return h('div', Object.assign(passProps(p), { className: cn('pb-4 pt-0 text-sm text-muted-foreground', p.className) }), p.children);
  };

  // Overlay factory
  function createOverlayKit(kind) {
    var Ctx = React.createContext({ open: false, setOpen: function () {}, selected: '', setSelected: function () {} });
    var Root = function (p) {
      p = p || {};
      var st = React.useState(Boolean(p.defaultOpen));
      var sel = React.useState(p.defaultValue || p.value || '');
      var isOpen = p.open !== undefined ? Boolean(p.open) : st[0];
      var setOpen = function (v) { if (p.open === undefined) st[1](v); if (typeof p.onOpenChange === 'function') p.onOpenChange(v); };
      var setSel = function (v) { sel[1](v); if (typeof p.onValueChange === 'function') p.onValueChange(v); setOpen(false); };
      return h(Ctx.Provider, { value: { open: isOpen, setOpen: setOpen, selected: p.value !== undefined ? p.value : sel[0], setSelected: setSel } },
        h('div', { className: kind === 'popover' || kind === 'select' || kind === 'dropdown' ? 'relative inline-block' : 'contents' }, p.children)
      );
    };
    var Trigger = React.forwardRef(function (p, ref) {
      p = p || {};
      var ctx = React.useContext(Ctx);
      var onClick = function (e) { ctx.setOpen(!ctx.open); if (p.onClick) p.onClick(e); };
      if (p.asChild && React.isValidElement(p.children)) {
        return React.cloneElement(p.children, { onClick: onClick, ref: ref });
      }
      return h('button', Object.assign(passProps(p, { asChild: 1 }), {
        ref: ref, type: 'button', onClick: onClick,
        className: cn(kind === 'select' ? 'flex h-9 w-full min-w-44 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs cursor-pointer' : 'cursor-pointer', p.className)
      }), p.children, kind === 'select' ? h(lucideProxy.ChevronDown, { className: 'size-4 opacity-50' }) : null);
    });
    var Content = React.forwardRef(function (p, ref) {
      p = p || {};
      var ctx = React.useContext(Ctx);
      if (!ctx.open) return null;
      if (kind === 'dialog') {
        return h('div', { className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4', onClick: function (e) { if (e.target === e.currentTarget) ctx.setOpen(false); } },
          h('div', Object.assign(passProps(p, { showCloseButton: 1 }), { ref: ref, className: cn('relative w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xl', p.className) }),
            p.children,
            h('button', { type: 'button', 'aria-label': 'Close', onClick: function () { ctx.setOpen(false); }, className: 'absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100 cursor-pointer' }, h(lucideProxy.X, { className: 'size-4' }))
          )
        );
      }
      if (kind === 'collapsible') {
        return h('div', Object.assign(passProps(p), { ref: ref, className: cn('mt-2', p.className) }), p.children);
      }
      return h('div', Object.assign(passProps(p, { align: 1, sideOffset: 1, side: 1 }), {
        ref: ref,
        className: cn('absolute left-0 top-full mt-2 z-50 min-w-48 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg', p.className)
      }), p.children);
    });
    var Close = function (p) {
      p = p || {};
      var ctx = React.useContext(Ctx);
      var onClick = function (e) { ctx.setOpen(false); if (p.onClick) p.onClick(e); };
      if (p.asChild && React.isValidElement(p.children)) return React.cloneElement(p.children, { onClick: onClick });
      return h('button', Object.assign(passProps(p, { asChild: 1 }), { type: 'button', onClick: onClick, className: cn(buttonVariants({ variant: 'outline' }), p.className) }), p.children || 'Close');
    };
    var Item = function (p) {
      p = p || {};
      var ctx = React.useContext(Ctx);
      var isSel = p.value !== undefined && ctx.selected === p.value;
      return h('button', Object.assign(passProps(p, { value: 1 }), {
        type: 'button',
        onClick: function (e) {
          if (p.value !== undefined) ctx.setSelected(p.value);
          else ctx.setOpen(false);
          if (p.onSelect) p.onSelect(e);
          if (p.onClick) p.onClick(e);
        },
        className: cn('flex w-full items-center justify-between gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer', isSel ? 'bg-accent/60 font-medium' : '', p.className)
      }), p.children, isSel ? h(lucideProxy.Check, { className: 'size-3.5' }) : null);
    };
    var Value = function (p) {
      var ctx = React.useContext(Ctx);
      return h('span', { className: 'truncate' }, ctx.selected || (p && p.placeholder) || 'Select…');
    };
    var Portal = function (p) { return h(React.Fragment, null, p.children); };
    var Overlay = function (p) { return h('div', { className: cn('fixed inset-0 bg-black/50', p && p.className) }, p && p.children); };
    return {
      Root: Root, Trigger: Trigger, Content: Content, Popup: Content, Close: Close,
      Item: Item, Value: Value, Portal: Portal, Overlay: Overlay, Backdrop: Overlay,
      Positioner: Portal, Title: box('text-lg font-semibold leading-none', 'h2'),
      Description: box('text-sm text-muted-foreground', 'p'),
      Header: box('flex flex-col gap-1.5'), Footer: box('flex justify-end gap-2 mt-4'),
      Group: box('flex flex-col'), Label: box('px-2 py-1 text-xs font-semibold text-muted-foreground'),
      GroupLabel: box('px-2 py-1 text-xs font-semibold text-muted-foreground'),
      Separator: function () { return h(Separator, { className: 'my-1' }); },
      Viewport: box('p-1'), Icon: box('inline-flex items-center', 'span'),
      Anchor: box('inline-block'), Arrow: function () { return null; },
      Provider: Portal, Sub: Root, SubTrigger: Trigger, SubContent: Content,
      CheckboxItem: Item, RadioGroup: box('flex flex-col'), RadioItem: Item,
      ItemIndicator: box('inline-flex items-center', 'span'), ItemText: box('inline', 'span'),
      ScrollUpButton: function () { return null; }, ScrollDownButton: function () { return null; }
    };
  }

  var dialogKit = createOverlayKit('dialog');
  var popoverKit = createOverlayKit('popover');
  var dropdownKit = createOverlayKit('dropdown');
  var selectKit = createOverlayKit('select');
  var tooltipKit = createOverlayKit('tooltip');
  var collapsibleKit = createOverlayKit('collapsible');

  // RadioGroup
  var RadioCtx = React.createContext({ val: '', setVal: function () {} });
  var RadioGroup = function (p) {
    p = p || {};
    var st = React.useState(p.defaultValue || '');
    var val = p.value !== undefined ? p.value : st[0];
    return h(RadioCtx.Provider, { value: { val: val, setVal: function (v) { st[1](v); if (p.onValueChange) p.onValueChange(v); } } },
      h('div', Object.assign(passProps(p, { defaultValue: 1, value: 1, onValueChange: 1 }), { role: 'radiogroup', className: cn('grid gap-2', p.className) }), p.children)
    );
  };
  var RadioGroupItem = function (p) {
    var ctx = React.useContext(RadioCtx);
    var active = ctx.val === p.value;
    return h('button', {
      type: 'button', role: 'radio', 'aria-checked': active, id: p.id, onClick: function () { ctx.setVal(p.value); },
      className: cn('inline-flex size-4 items-center justify-center rounded-full border border-primary cursor-pointer', p.className)
    }, active ? h('span', { className: 'size-2 rounded-full bg-primary' }) : null);
  };

  // Toggle
  var Toggle = function (p) {
    p = p || {};
    var st = React.useState(Boolean(p.defaultPressed));
    var on = p.pressed !== undefined ? Boolean(p.pressed) : st[0];
    return h('button', Object.assign(passProps(p, { pressed: 1, defaultPressed: 1, onPressedChange: 1, variant: 1, size: 1 }), {
      type: 'button', 'aria-pressed': on, 'data-state': on ? 'on' : 'off',
      onClick: function () { var n = !on; st[1](n); if (p.onPressedChange) p.onPressedChange(n); },
      className: cn('inline-flex items-center justify-center gap-1.5 rounded-md border border-transparent px-3 h-9 text-sm font-medium cursor-pointer transition-colors', on ? 'bg-accent text-accent-foreground border-border' : 'hover:bg-muted', p.className)
    }), p.children);
  };

  // ── Sidebar Suite (shadcn/ui v4 Dashboards) ──
  var SidebarCtx = React.createContext({
    state: 'expanded', open: true, setOpen: function () {}, openMobile: false,
    setOpenMobile: function () {}, isMobile: false, toggleSidebar: function () {}
  });
  var useSidebar = function () { return React.useContext(SidebarCtx); };
  var SidebarProvider = function (p) {
    p = p || {};
    var st = React.useState(p.defaultOpen !== false);
    var open = p.open !== undefined ? Boolean(p.open) : st[0];
    var setOpen = function (v) { var next = typeof v === 'function' ? v(open) : v; st[1](next); if (p.onOpenChange) p.onOpenChange(next); };
    var toggle = function () { setOpen(!open); };
    return h(SidebarCtx.Provider, {
      value: { state: open ? 'expanded' : 'collapsed', open: open, setOpen: setOpen, openMobile: false, setOpenMobile: function () {}, isMobile: false, toggleSidebar: toggle }
    }, h('div', { className: cn('flex min-h-[520px] w-full bg-background text-foreground', p.className), style: p.style }, p.children));
  };
  var Sidebar = function (p) {
    var ctx = useSidebar();
    return h('aside', Object.assign(passProps(p, { side: 1, variant: 1, collapsible: 1 }), {
      className: cn('shrink-0 border-r border-border bg-card/60 transition-all duration-200 flex flex-col', ctx.open ? 'w-60' : 'w-14', p.className)
    }), p.children);
  };
  var SidebarTrigger = function (p) {
    var ctx = useSidebar();
    return h('button', Object.assign(passProps(p), {
      type: 'button', onClick: function (e) { ctx.toggleSidebar(); if (p.onClick) p.onClick(e); },
      className: cn('inline-flex size-8 items-center justify-center rounded-md hover:bg-accent cursor-pointer', p.className)
    }), h(lucideProxy.PanelLeft, { className: 'size-4' }));
  };
  var SidebarMenuButton = React.forwardRef(function (p, ref) {
    p = p || {};
    var Comp = p.asChild ? Slot : 'button';
    return h(Comp, Object.assign(passProps(p, { isActive: 1, tooltip: 1, size: 1, variant: 1 }), {
      ref: ref, type: Comp === 'button' ? 'button' : undefined,
      className: cn('flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors cursor-pointer', p.isActive ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground', p.className)
    }), p.children);
  });

  // ── Chart Suite (shadcn/ui Chart + Recharts SVG Shims) ──
  var ChartCtx = React.createContext({ config: {} });
  var useChart = function () { return React.useContext(ChartCtx); };
  var ChartContainer = function (p) {
    p = p || {};
    return h(ChartCtx.Provider, { value: { config: p.config || {} } },
      h('div', Object.assign(passProps(p, { config: 1 }), { className: cn('w-full min-h-[200px] flex flex-col justify-center', p.className) }), p.children)
    );
  };
  var ChartTooltip = function () { return null; };
  var ChartTooltipContent = function () { return null; };
  var ChartLegend = function (p) { return h('div', { className: 'flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2' }, p && p.children); };
  var ChartLegendContent = function () { return null; };

  function extractChartSeries(children) {
    var series = [];
    React.Children.forEach(children, function (ch) {
      if (!React.isValidElement(ch)) return;
      var props = ch.props || {};
      if (props.dataKey) {
        series.push({
          key: props.dataKey,
          stroke: props.stroke || props.fill || '#10B981',
          fill: props.fill || props.stroke || '#10B981',
          type: (ch.type && ch.type.__wfChartKind) || 'line'
        });
      }
    });
    return series;
  }

  function makeSvgSeriesChart(kind) {
    return function SvgChart(p) {
      p = p || {};
      var data = Array.isArray(p.data) && p.data.length ? p.data : [
        { name: 'Jan', value: 42 }, { name: 'Feb', value: 64 }, { name: 'Mar', value: 58 },
        { name: 'Apr', value: 84 }, { name: 'May', value: 78 }, { name: 'Jun', value: 96 }
      ];
      var series = extractChartSeries(p.children);
      if (!series.length) {
        var sampleKeys = Object.keys(data[0] || {}).filter(function (k) { return typeof data[0][k] === 'number'; });
        series = [{ key: sampleKeys[0] || 'value', stroke: '#10B981', fill: '#10B981', type: kind }];
      }
      var palette = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'];
      var W = Number(p.width) || 460;
      var H = Number(p.height) || 220;
      var padX = 28;
      var padY = 20;
      var plotW = W - padX * 2;
      var plotH = H - padY * 2 - 18;
      var maxVal = 1;
      data.forEach(function (row) {
        series.forEach(function (s) {
          var v = Number(row[s.key] || 0);
          if (v > maxVal) maxVal = v;
        });
      });
      var labelKey = Object.keys(data[0] || {}).find(function (k) { return typeof data[0][k] === 'string'; }) || 'name';
      var svgChildren = [];
      // Horizontal grid lines
      for (var g = 0; g <= 3; g++) {
        var gy = padY + (plotH * g) / 3;
        svgChildren.push(h('line', { key: 'g' + g, x1: padX, y1: gy, x2: W - padX, y2: gy, stroke: 'currentColor', strokeOpacity: 0.12, strokeDasharray: '3 3' }));
      }
      if (kind === 'bar') {
        var groupW = plotW / Math.max(1, data.length);
        var barW = Math.max(6, (groupW * 0.68) / Math.max(1, series.length));
        data.forEach(function (row, di) {
          series.forEach(function (s, si) {
            var val = Math.max(0, Number(row[s.key] || 0));
            var bh = (val / maxVal) * plotH;
            var bx = padX + di * groupW + groupW * 0.16 + si * barW;
            var by = padY + plotH - bh;
            var col = (s.fill && s.fill.indexOf('url(') === -1 && s.fill.indexOf('var(') === -1) ? s.fill : palette[si % palette.length];
            svgChildren.push(h('rect', { key: 'b-' + di + '-' + si, x: bx, y: by, width: Math.max(4, barW - 2), height: Math.max(2, bh), rx: 3, fill: col, fillOpacity: 0.88 }));
          });
        });
      } else {
        series.forEach(function (s, si) {
          var col = (s.stroke && s.stroke.indexOf('url(') === -1 && s.stroke.indexOf('var(') === -1) ? s.stroke : palette[si % palette.length];
          var pts = data.map(function (row, di) {
            var x = padX + (data.length > 1 ? (di / (data.length - 1)) * plotW : plotW / 2);
            var val = Math.max(0, Number(row[s.key] || 0));
            var y = padY + plotH - (val / maxVal) * plotH;
            return x.toFixed(1) + ',' + y.toFixed(1);
          });
          if (kind === 'area' || s.type === 'area') {
            var areaPts = pts.concat([(padX + plotW).toFixed(1) + ',' + (padY + plotH).toFixed(1), padX.toFixed(1) + ',' + (padY + plotH).toFixed(1)]).join(' ');
            svgChildren.push(h('polygon', { key: 'a-' + si, points: areaPts, fill: col, fillOpacity: 0.18 }));
          }
          svgChildren.push(h('polyline', { key: 'l-' + si, points: pts.join(' '), fill: 'none', stroke: col, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }));
        });
      }
      // X-axis labels
      var step = Math.max(1, Math.ceil(data.length / 6));
      for (var li = 0; li < data.length; li += step) {
        var lx = padX + (data.length > 1 ? (li / (data.length - 1)) * plotW : plotW / 2);
        var txt = String(data[li][labelKey] || (li + 1)).slice(0, 8);
        svgChildren.push(h('text', { key: 'x-' + li, x: lx, y: H - 6, textAnchor: 'middle', fill: 'currentColor', fillOpacity: 0.55, fontSize: 10 }, txt));
      }
      return h('svg', { viewBox: '0 0 ' + W + ' ' + H, className: cn('w-full h-full max-h-[260px] overflow-visible', p.className) }, svgChildren);
    };
  }

  function PieChartShim(p) {
    var palette = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'];
    var slices = [];
    React.Children.forEach(p && p.children, function (ch) {
      if (React.isValidElement(ch) && ch.props && Array.isArray(ch.props.data)) {
        slices = ch.props.data;
      }
    });
    if (!slices.length) slices = [{ value: 38 }, { value: 28 }, { value: 20 }, { value: 14 }];
    var total = slices.reduce(function (acc, s) { return acc + Number(s.value || s.visitors || s.amount || 10); }, 0) || 1;
    var r = 64;
    var circ = 2 * Math.PI * r;
    var offset = 0;
    return h('svg', { viewBox: '0 0 200 200', className: cn('w-full h-full max-h-[220px] mx-auto', p && p.className) },
      slices.map(function (s, idx) {
        var val = Number(s.value || s.visitors || s.amount || 10);
        var dash = (val / total) * circ;
        var el = h('circle', {
          key: idx, cx: 100, cy: 100, r: r, fill: 'none',
          stroke: (s.fill && s.fill.indexOf('var(') === -1) ? s.fill : palette[idx % palette.length],
          strokeWidth: 26, strokeDasharray: dash + ' ' + (circ - dash), strokeDashoffset: -offset,
          transform: 'rotate(-90 100 100)'
        });
        offset += dash;
        return el;
      })
    );
  }

  var RechartsNoop = function () { return null; };
  var RechartsArea = function () { return null; }; RechartsArea.__wfChartKind = 'area';
  var RechartsBar = function () { return null; }; RechartsBar.__wfChartKind = 'bar';
  var RechartsLine = function () { return null; }; RechartsLine.__wfChartKind = 'line';
  var rechartsModule = {
    __esModule: true,
    ResponsiveContainer: function (p) {
      var hVal = typeof p.height === 'number' ? p.height + 'px' : (p.height || '220px');
      return h('div', { className: cn('w-full min-w-[180px]', p.className), style: { width: '100%', height: hVal, minHeight: '160px' } }, p.children);
    },
    AreaChart: makeSvgSeriesChart('area'),
    LineChart: makeSvgSeriesChart('line'),
    BarChart: makeSvgSeriesChart('bar'),
    ComposedChart: makeSvgSeriesChart('bar'),
    ScatterChart: makeSvgSeriesChart('line'),
    RadarChart: PieChartShim,
    RadialBarChart: PieChartShim,
    PieChart: PieChartShim,
    Area: RechartsArea,
    Bar: RechartsBar,
    Line: RechartsLine,
    Pie: RechartsNoop,
    Radar: RechartsNoop,
    RadialBar: RechartsNoop,
    Scatter: RechartsNoop,
    Cell: RechartsNoop,
    XAxis: RechartsNoop,
    YAxis: RechartsNoop,
    ZAxis: RechartsNoop,
    CartesianGrid: RechartsNoop,
    PolarGrid: RechartsNoop,
    PolarAngleAxis: RechartsNoop,
    PolarRadiusAxis: RechartsNoop,
    Tooltip: RechartsNoop,
    Legend: RechartsNoop,
    ReferenceLine: RechartsNoop,
    ReferenceArea: RechartsNoop,
    Label: RechartsNoop,
    LabelList: RechartsNoop,
    Brush: RechartsNoop,
    Sector: RechartsNoop,
    Rectangle: RechartsNoop
  };

  // ── Form Suite (react-hook-form + shadcn Form + zod) ──
  var RhFormCtx = React.createContext(null);
  function useFormShim(opts) {
    opts = opts || {};
    var valsRef = React.useRef(Object.assign({}, opts.defaultValues || {}));
    var tick = React.useState(0);
    var rerender = function () { tick[1](function (n) { return n + 1; }); };
    var api = {
      register: function (name) {
        return {
          name: name,
          defaultValue: valsRef.current[name],
          onChange: function (e) { valsRef.current[name] = e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e; rerender(); },
          onBlur: function () {},
          ref: function () {}
        };
      },
      handleSubmit: function (onValid) {
        return function (e) {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          if (typeof onValid === 'function') onValid(Object.assign({}, valsRef.current), e);
        };
      },
      watch: function (name) { return name ? valsRef.current[name] : valsRef.current; },
      getValues: function (name) { return name ? valsRef.current[name] : valsRef.current; },
      setValue: function (name, v) { valsRef.current[name] = v; rerender(); },
      reset: function (next) { valsRef.current = Object.assign({}, next || opts.defaultValues || {}); rerender(); },
      clearErrors: function () {},
      setError: function () {},
      trigger: function () { return Promise.resolve(true); },
      formState: { errors: {}, isSubmitting: false, isValid: true, isDirty: false, isSubmitted: false, touchedFields: {}, dirtyFields: {} },
      control: { _values: valsRef, _rerender: rerender }
    };
    return api;
  }
  var FormProviderShim = function (p) {
    return h(RhFormCtx.Provider, { value: p }, p.children);
  };
  var ControllerShim = function (p) {
    var ctx = React.useContext(RhFormCtx);
    var st = React.useState(p.defaultValue !== undefined ? p.defaultValue : '');
    var field = {
      name: p.name || '',
      value: st[0],
      onChange: function (v) {
        var next = v && v.target ? (v.target.type === 'checkbox' ? v.target.checked : v.target.value) : v;
        st[1](next);
        if (ctx && ctx.setValue && p.name) ctx.setValue(p.name, next);
      },
      onBlur: function () {},
      ref: function () {}
    };
    if (typeof p.render === 'function') {
      return p.render({ field: field, fieldState: { invalid: false, isTouched: false, isDirty: false, error: undefined }, formState: { errors: {} } });
    }
    return null;
  };
  var reactHookFormModule = {
    __esModule: true,
    useForm: useFormShim,
    FormProvider: FormProviderShim,
    Controller: ControllerShim,
    useFormContext: function () { return React.useContext(RhFormCtx) || useFormShim(); },
    useWatch: function (opts) { var ctx = React.useContext(RhFormCtx); return ctx && ctx.getValues ? ctx.getValues(opts && opts.name) : undefined; },
    useController: function (opts) {
      var st = React.useState(opts && opts.defaultValue !== undefined ? opts.defaultValue : '');
      return { field: { name: opts && opts.name || '', value: st[0], onChange: st[1], onBlur: function () {}, ref: function () {} }, fieldState: { invalid: false }, formState: { errors: {} } };
    },
    useFieldArray: function () {
      var st = React.useState([]);
      return {
        fields: st[0],
        append: function (v) { st[1](function (prev) { return prev.concat([Object.assign({ id: String(Date.now() + Math.random()) }, v)]); }); },
        prepend: function (v) { st[1](function (prev) { return [Object.assign({ id: String(Date.now() + Math.random()) }, v)].concat(prev); }); },
        remove: function (idx) { st[1](function (prev) { return prev.filter(function (_x, i) { return i !== idx; }); }); },
        insert: function () {}, swap: function () {}, move: function () {}, update: function () {}, replace: st[1]
      };
    },
    useFormState: function () { return { errors: {}, isSubmitting: false, isValid: true, isDirty: false }; }
  };

  function makeZodSchema() {
    var schema = {
      parse: function (v) { return v; },
      safeParse: function (v) { return { success: true, data: v }; },
      parseAsync: function (v) { return Promise.resolve(v); },
      safeParseAsync: function (v) { return Promise.resolve({ success: true, data: v }); },
      shape: {}
    };
    return new Proxy(schema, {
      get: function (target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop === 'string') {
          return function () { return makeZodSchema(); };
        }
        return undefined;
      }
    });
  }
  var zodBuilder = new Proxy({
    __esModule: true,
    coerce: new Proxy({}, { get: function () { return function () { return makeZodSchema(); }; } })
  }, {
    get: function (target, prop) {
      if (prop === 'z' || prop === 'default') return zodBuilder;
      if (prop in target) return target[prop];
      if (typeof prop === 'string') return function () { return makeZodSchema(); };
      return undefined;
    }
  });

  // ── Carousel Suite ──
  var CarouselCtx = React.createContext({ scrollPrev: function () {}, scrollNext: function () {}, canScrollPrev: true, canScrollNext: true, orientation: 'horizontal' });
  var Carousel = function (p) {
    return h(CarouselCtx.Provider, { value: { scrollPrev: function () {}, scrollNext: function () {}, canScrollPrev: true, canScrollNext: true, orientation: (p && p.orientation) || 'horizontal' } },
      h('div', Object.assign(passProps(p, { opts: 1, plugins: 1, setApi: 1, orientation: 1 }), { className: cn('relative w-full', p && p.className) }), p && p.children)
    );
  };

  // ── InputOTP Suite ──
  var OtpCtx = React.createContext({ slots: [] });
  var InputOTP = function (p) {
    p = p || {};
    var maxLen = Number(p.maxLength || 6);
    var st = React.useState(String(p.defaultValue || ''));
    var val = p.value !== undefined ? String(p.value) : st[0];
    var slots = [];
    for (var i = 0; i < maxLen; i++) {
      slots.push({ char: val[i] || '', hasFakeCaret: i === val.length, isActive: i === val.length });
    }
    return h(OtpCtx.Provider, { value: { slots: slots } },
      h('div', { className: cn('relative inline-flex items-center gap-2', p.containerClassName, p.className) },
        h('input', {
          type: 'text', maxLength: maxLen, value: val,
          onChange: function (e) { var next = e.target.value; if (p.value === undefined) st[1](next); if (p.onChange) p.onChange(next); },
          className: 'absolute inset-0 opacity-0 cursor-text w-full h-full'
        }),
        typeof p.render === 'function' ? p.render({ slots: slots }) : p.children
      )
    );
  };
  var InputOTPSlot = function (p) {
    var ctx = React.useContext(OtpCtx);
    var slot = (ctx.slots && ctx.slots[p.index]) || { char: '' };
    return h('div', { className: cn('flex size-9 items-center justify-center rounded-md border border-input text-sm font-medium', p.className) }, slot.char || '');
  };

  // ── Calendar / DayPicker & date-fns ──
  var DayPickerComp = function (p) {
    p = p || {};
    var days = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    var st = React.useState(19);
    return h('div', { className: cn('rounded-lg border border-border bg-card p-3 w-fit', p.className) },
      h('div', { className: 'flex items-center justify-between mb-2 px-1 text-sm font-medium' }, h('span', null, 'November 2026')),
      h('div', { className: 'grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1' }, days.map(function (d) { return h('div', { key: d, className: 'w-8 py-1' }, d); })),
      h('div', { className: 'grid grid-cols-7 gap-1 text-center text-xs' }, Array.from({ length: 30 }, function (_, i) {
        var d = i + 1;
        var active = st[0] === d;
        return h('button', {
          key: d, type: 'button',
          onClick: function () {
            st[1](d);
            if (typeof p.onSelect === 'function') p.onSelect(new Date(2026, 10, d));
          },
          className: cn('size-8 rounded-md cursor-pointer transition-colors', active ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-accent')
        }, d);
      }))
    );
  };

  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function toDateObj(d) { return d instanceof Date ? d : new Date(d || Date.now()); }
  var dateFnsModule = {
    __esModule: true,
    format: function (date, fmt) {
      var d = toDateObj(date);
      if (isNaN(d.getTime())) return '';
      var f = String(fmt || 'PPP');
      if (f === 'PPP' || f === 'PP') return MONTHS_SHORT[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
      return f
        .replace(/yyyy/g, String(d.getFullYear()))
        .replace(/MMMM/g, MONTHS_FULL[d.getMonth()])
        .replace(/MMM/g, MONTHS_SHORT[d.getMonth()])
        .replace(/MM/g, String(d.getMonth() + 1).padStart(2, '0'))
        .replace(/dd/g, String(d.getDate()).padStart(2, '0'))
        .replace(/d/g, String(d.getDate()))
        .replace(/HH/g, String(d.getHours()).padStart(2, '0'))
        .replace(/mm/g, String(d.getMinutes()).padStart(2, '0'));
    },
    addDays: function (d, n) { var r = new Date(toDateObj(d)); r.setDate(r.getDate() + Number(n || 0)); return r; },
    subDays: function (d, n) { var r = new Date(toDateObj(d)); r.setDate(r.getDate() - Number(n || 0)); return r; },
    addMonths: function (d, n) { var r = new Date(toDateObj(d)); r.setMonth(r.getMonth() + Number(n || 0)); return r; },
    subMonths: function (d, n) { var r = new Date(toDateObj(d)); r.setMonth(r.getMonth() - Number(n || 0)); return r; },
    addYears: function (d, n) { var r = new Date(toDateObj(d)); r.setFullYear(r.getFullYear() + Number(n || 0)); return r; },
    subYears: function (d, n) { var r = new Date(toDateObj(d)); r.setFullYear(r.getFullYear() - Number(n || 0)); return r; },
    startOfMonth: function (d) { var r = toDateObj(d); return new Date(r.getFullYear(), r.getMonth(), 1); },
    endOfMonth: function (d) { var r = toDateObj(d); return new Date(r.getFullYear(), r.getMonth() + 1, 0); },
    startOfWeek: function (d) { var r = new Date(toDateObj(d)); r.setDate(r.getDate() - r.getDay()); return r; },
    endOfWeek: function (d) { var r = new Date(toDateObj(d)); r.setDate(r.getDate() + (6 - r.getDay())); return r; },
    startOfDay: function (d) { var r = toDateObj(d); return new Date(r.getFullYear(), r.getMonth(), r.getDate()); },
    endOfDay: function (d) { var r = toDateObj(d); return new Date(r.getFullYear(), r.getMonth(), r.getDate(), 23, 59, 59); },
    eachDayOfInterval: function (iv) {
      var out = [];
      var cur = new Date(toDateObj(iv && iv.start));
      var end = toDateObj(iv && iv.end);
      var guard = 0;
      while (cur <= end && guard++ < 60) { out.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
      return out;
    },
    isSameDay: function (a, b) { var da = toDateObj(a), db = toDateObj(b); return da.toDateString() === db.toDateString(); },
    isSameMonth: function (a, b) { var da = toDateObj(a), db = toDateObj(b); return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth(); },
    isToday: function (d) { return toDateObj(d).toDateString() === new Date().toDateString(); },
    isAfter: function (a, b) { return toDateObj(a).getTime() > toDateObj(b).getTime(); },
    isBefore: function (a, b) { return toDateObj(a).getTime() < toDateObj(b).getTime(); },
    isValid: function (d) { return !isNaN(toDateObj(d).getTime()); },
    differenceInDays: function (a, b) { return Math.round((toDateObj(a).getTime() - toDateObj(b).getTime()) / 86400000); },
    parseISO: function (s) { return new Date(s); },
    formatDistanceToNow: function () { return '2 minutes ago'; },
    formatDateRange: function (a, b) { return dateFnsModule.format(a, 'MMM d') + ' – ' + dateFnsModule.format(b, 'MMM d, yyyy'); }
  };

  // ── Compound Primitive Proxy Builder (Radix UI & Base UI) ──
  function makeCompoundProxy(baseObj) {
    var fallbackComp = box('');
    return new Proxy(Object.assign({ __esModule: true }, baseObj || {}), {
      get: function (target, prop) {
        if (prop in target) return target[prop];
        if (prop === 'default') return target.Root || fallbackComp;
        if (prop === '__esModule') return true;
        if (typeof prop === 'string' && /^[A-Z]/.test(prop)) return fallbackComp;
        if (typeof prop === 'string' && prop.indexOf('use') === 0) return function () { return {}; };
        return undefined;
      }
    });
  }

  var RADIX_KITS = {
    Dialog: makeCompoundProxy(dialogKit),
    AlertDialog: makeCompoundProxy(dialogKit),
    Popover: makeCompoundProxy(popoverKit),
    HoverCard: makeCompoundProxy(popoverKit),
    DropdownMenu: makeCompoundProxy(dropdownKit),
    ContextMenu: makeCompoundProxy(dropdownKit),
    Menubar: makeCompoundProxy(dropdownKit),
    Menu: makeCompoundProxy(dropdownKit),
    Select: makeCompoundProxy(selectKit),
    Tooltip: makeCompoundProxy(tooltipKit),
    Collapsible: makeCompoundProxy(collapsibleKit),
    Tabs: makeCompoundProxy({ Root: Tabs, List: TabsList, Trigger: TabsTrigger, Tab: TabsTrigger, Content: TabsContent, Panel: TabsContent, Indicator: box('') }),
    Accordion: makeCompoundProxy({ Root: Accordion, Item: AccordionItem, Header: box('', 'h3'), Trigger: AccordionTrigger, Content: AccordionContent, Panel: AccordionContent }),
    Switch: makeCompoundProxy({ Root: Switch, Thumb: box('') }),
    Checkbox: makeCompoundProxy({ Root: Checkbox, Indicator: box('inline-flex items-center', 'span') }),
    Slider: makeCompoundProxy({ Root: Slider, Track: box(''), Range: box(''), Thumb: box(''), Control: box(''), Indicator: box('') }),
    RadioGroup: makeCompoundProxy({ Root: RadioGroup, Item: RadioGroupItem, Indicator: box('') }),
    Radio: makeCompoundProxy({ Root: RadioGroupItem, Indicator: box('') }),
    Avatar: makeCompoundProxy({ Root: Avatar, Image: AvatarImage, Fallback: AvatarFallback }),
    Progress: makeCompoundProxy({ Root: Progress, Indicator: box(''), Track: box('') }),
    Separator: makeCompoundProxy({ Root: Separator }),
    Label: makeCompoundProxy({ Root: Label }),
    Toggle: makeCompoundProxy({ Root: Toggle }),
    ToggleGroup: makeCompoundProxy({ Root: box('inline-flex items-center gap-1'), Item: Toggle }),
    ScrollArea: makeCompoundProxy({ Root: box('overflow-auto'), Viewport: box('size-full'), Scrollbar: function () { return null; }, Thumb: function () { return null; }, Corner: function () { return null; } }),
    AspectRatio: makeCompoundProxy({ Root: function (p) { return h('div', { style: { aspectRatio: String((p && p.ratio) || 1.777) }, className: cn('relative w-full overflow-hidden', p && p.className) }, p && p.children); } }),
    Slot: makeCompoundProxy({ Root: Slot, Slot: Slot, Slottable: function (p) { return h(React.Fragment, null, p.children); } }),
    NavigationMenu: makeCompoundProxy({ Root: box('relative flex items-center', 'nav'), List: box('flex items-center gap-1', 'ul'), Item: box('', 'li'), Trigger: Button, Content: box('p-2'), Link: box('inline-flex items-center px-3 py-1.5 text-sm', 'a'), Viewport: box(''), Indicator: function () { return null; } }),
    NumberField: makeCompoundProxy({ Root: box('inline-flex items-center gap-1'), Group: box('inline-flex items-center rounded-md border border-input'), Input: Input, Increment: Button, Decrement: Button, ScrubArea: box('inline-flex items-center') })
  };

  function resolveRadixOrBaseModule(spec) {
    if (spec === 'radix-ui' || spec === '@base-ui/react') {
      return new Proxy(Object.assign({ __esModule: true }, RADIX_KITS), {
        get: function (target, prop) {
          if (prop in target) return target[prop];
          if (prop === 'mergeProps') return function () { return Object.assign.apply(null, [{}].concat(Array.prototype.slice.call(arguments))); };
          if (prop === 'useRender') return function (opts) { return h((opts && opts.defaultTagName) || 'div', opts && opts.props); };
          if (typeof prop === 'string' && /^[A-Z]/.test(prop)) return makeCompoundProxy({});
          return undefined;
        }
      });
    }
    var sub = spec;
    if (sub.indexOf('@radix-ui/react-') === 0) sub = sub.slice('@radix-ui/react-'.length);
    else if (sub.indexOf('@base-ui/react/') === 0) sub = sub.slice('@base-ui/react/'.length);
    if (sub === 'merge-props') return { __esModule: true, mergeProps: function () { return Object.assign.apply(null, [{}].concat(Array.prototype.slice.call(arguments))); } };
    if (sub === 'use-render') return { __esModule: true, useRender: function (opts) { return h((opts && opts.defaultTagName) || 'div', opts && opts.props); } };
    if (sub === 'slot') return Object.assign({ __esModule: true, Slot: Slot, Root: Slot, Slottable: function (p) { return h(React.Fragment, null, p.children); }, default: Slot });
    var pascal = sub.split('-').map(function (s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }).join('');
    if (RADIX_KITS[pascal]) return RADIX_KITS[pascal];
    return makeCompoundProxy({});
  }

  var SHADCN_UI_EXPORTS = {
    __esModule: true,
    cn: cn,
    Slot: Slot,
    Button: Button, buttonVariants: buttonVariants,
    Badge: Badge, badgeVariants: badgeVariants,
    Card: Card, CardHeader: CardHeader, CardTitle: CardTitle, CardDescription: CardDescription, CardAction: CardAction, CardContent: CardContent, CardFooter: CardFooter,
    Input: Input, Textarea: Textarea, Label: Label, Separator: Separator, Skeleton: Skeleton, Progress: Progress,
    Avatar: Avatar, AvatarImage: AvatarImage, AvatarFallback: AvatarFallback,
    Alert: Alert, AlertTitle: AlertTitle, AlertDescription: AlertDescription,
    Switch: Switch, Checkbox: Checkbox, Slider: Slider,
    Tabs: Tabs, TabsList: TabsList, TabsTrigger: TabsTrigger, TabsContent: TabsContent,
    Accordion: Accordion, AccordionItem: AccordionItem, AccordionTrigger: AccordionTrigger, AccordionContent: AccordionContent,
    RadioGroup: RadioGroup, RadioGroupItem: RadioGroupItem,
    Toggle: Toggle, ToggleGroup: box('inline-flex items-center gap-1 rounded-md'), ToggleGroupItem: Toggle,
    Dialog: dialogKit.Root, DialogTrigger: dialogKit.Trigger, DialogPortal: dialogKit.Portal, DialogOverlay: dialogKit.Overlay, DialogContent: dialogKit.Content, DialogClose: dialogKit.Close,
    DialogHeader: box('flex flex-col gap-1.5 text-left'), DialogFooter: box('flex justify-end gap-2 mt-4'), DialogTitle: box('text-lg font-semibold leading-none', 'h2'), DialogDescription: box('text-sm text-muted-foreground', 'p'),
    AlertDialog: dialogKit.Root, AlertDialogTrigger: dialogKit.Trigger, AlertDialogPortal: dialogKit.Portal, AlertDialogOverlay: dialogKit.Overlay, AlertDialogContent: dialogKit.Content, AlertDialogAction: dialogKit.Close, AlertDialogCancel: dialogKit.Close,
    AlertDialogHeader: box('flex flex-col gap-1.5 text-left'), AlertDialogFooter: box('flex justify-end gap-2 mt-4'), AlertDialogTitle: box('text-lg font-semibold leading-none', 'h2'), AlertDialogDescription: box('text-sm text-muted-foreground', 'p'),
    Sheet: dialogKit.Root, SheetTrigger: dialogKit.Trigger, SheetPortal: dialogKit.Portal, SheetOverlay: dialogKit.Overlay, SheetContent: dialogKit.Content, SheetClose: dialogKit.Close, SheetHeader: box('flex flex-col gap-1.5'), SheetFooter: box('flex justify-end gap-2 mt-4'), SheetTitle: box('text-lg font-semibold leading-none', 'h2'), SheetDescription: box('text-sm text-muted-foreground', 'p'),
    Drawer: dialogKit.Root, DrawerTrigger: dialogKit.Trigger, DrawerPortal: dialogKit.Portal, DrawerOverlay: dialogKit.Overlay, DrawerContent: dialogKit.Content, DrawerClose: dialogKit.Close, DrawerHeader: box('flex flex-col gap-1.5'), DrawerFooter: box('flex justify-end gap-2 mt-4'), DrawerTitle: box('text-lg font-semibold leading-none', 'h2'), DrawerDescription: box('text-sm text-muted-foreground', 'p'),
    Popover: popoverKit.Root, PopoverTrigger: popoverKit.Trigger, PopoverContent: popoverKit.Content, PopoverAnchor: box('inline-block'),
    HoverCard: popoverKit.Root, HoverCardTrigger: popoverKit.Trigger, HoverCardContent: popoverKit.Content,
    DropdownMenu: dropdownKit.Root, DropdownMenuTrigger: dropdownKit.Trigger, DropdownMenuContent: dropdownKit.Content, DropdownMenuItem: dropdownKit.Item, DropdownMenuCheckboxItem: dropdownKit.Item, DropdownMenuRadioItem: dropdownKit.Item,
    DropdownMenuLabel: box('px-2 py-1.5 text-xs font-semibold text-muted-foreground'), DropdownMenuSeparator: function () { return h(Separator, { className: 'my-1' }); }, DropdownMenuGroup: box('flex flex-col'), DropdownMenuSub: dropdownKit.Root, DropdownMenuSubTrigger: dropdownKit.Trigger, DropdownMenuSubContent: dropdownKit.Content, DropdownMenuShortcut: box('ml-auto text-xs opacity-60', 'span'), DropdownMenuPortal: function (p) { return h(React.Fragment, null, p.children); }, DropdownMenuRadioGroup: box('flex flex-col'),
    ContextMenu: dropdownKit.Root, ContextMenuTrigger: dropdownKit.Trigger, ContextMenuContent: dropdownKit.Content, ContextMenuItem: dropdownKit.Item, ContextMenuSeparator: function () { return h(Separator, { className: 'my-1' }); }, ContextMenuLabel: box('px-2 py-1.5 text-xs font-semibold text-muted-foreground'),
    Select: selectKit.Root, SelectTrigger: selectKit.Trigger, SelectValue: selectKit.Value, SelectContent: selectKit.Content, SelectItem: selectKit.Item, SelectGroup: box('flex flex-col'), SelectLabel: box('px-2 py-1 text-xs font-semibold text-muted-foreground'), SelectSeparator: function () { return h(Separator, { className: 'my-1' }); }, SelectScrollUpButton: function () { return null; }, SelectScrollDownButton: function () { return null; },
    TooltipProvider: function (p) { return h(React.Fragment, null, p.children); }, Tooltip: tooltipKit.Root, TooltipTrigger: tooltipKit.Trigger, TooltipContent: tooltipKit.Content,
    Collapsible: collapsibleKit.Root, CollapsibleTrigger: collapsibleKit.Trigger, CollapsibleContent: collapsibleKit.Content,
    ScrollArea: box('overflow-auto'), ScrollBar: function () { return null; },
    AspectRatio: function (p) { return h('div', { style: { aspectRatio: String((p && p.ratio) || 1.777) }, className: cn('relative w-full overflow-hidden', p && p.className) }, p && p.children); },
    Table: box('w-full caption-bottom text-sm', 'table'), TableHeader: box('[&_tr]:border-b', 'thead'), TableBody: box('[&_tr:last-child]:border-0', 'tbody'), TableFooter: box('border-t bg-muted/50 font-medium', 'tfoot'), TableRow: box('border-b border-border transition-colors hover:bg-muted/50', 'tr'), TableHead: box('h-10 px-3 text-left align-middle font-medium text-muted-foreground', 'th'), TableCell: box('p-3 align-middle', 'td'), TableCaption: box('mt-4 text-sm text-muted-foreground', 'caption'),
    Breadcrumb: box('', 'nav'), BreadcrumbList: box('flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground', 'ol'), BreadcrumbItem: box('inline-flex items-center gap-1.5', 'li'), BreadcrumbLink: box('hover:text-foreground transition-colors', 'a'), BreadcrumbPage: box('font-normal text-foreground', 'span'), BreadcrumbSeparator: function (p) { return h('li', { className: 'opacity-50' }, p.children || '/'); }, BreadcrumbEllipsis: box('px-1', 'span'),
    Pagination: box('mx-auto flex w-full justify-center', 'nav'), PaginationContent: box('flex flex-row items-center gap-1', 'ul'), PaginationItem: box('', 'li'), PaginationLink: function (p) { return h('a', Object.assign(passProps(p, { isActive: 1 }), { href: p.href || '#', onClick: function (e) { e.preventDefault(); }, className: cn(buttonVariants({ variant: p.isActive ? 'outline' : 'ghost', size: 'sm' }), p.className) }), p.children); }, PaginationPrevious: function (p) { return h('a', { href: '#', onClick: function (e) { e.preventDefault(); }, className: cn(buttonVariants({ variant: 'ghost', size: 'sm' }), p.className) }, 'Previous'); }, PaginationNext: function (p) { return h('a', { href: '#', onClick: function (e) { e.preventDefault(); }, className: cn(buttonVariants({ variant: 'ghost', size: 'sm' }), p.className) }, 'Next'); }, PaginationEllipsis: box('px-2 text-muted-foreground', 'span'),
    Command: box('flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground'), CommandInput: function (p) { return h('div', { className: 'flex items-center border-b border-border px-3' }, h(lucideProxy.Search, { className: 'mr-2 size-4 opacity-50' }), h('input', Object.assign(passProps(p), { className: 'flex h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground' }))); }, CommandList: box('max-h-72 overflow-y-auto p-1'), CommandEmpty: box('py-6 text-center text-sm text-muted-foreground'), CommandGroup: function (p) { return h('div', { className: 'p-1' }, p.heading ? h('div', { className: 'px-2 py-1 text-xs font-medium text-muted-foreground' }, p.heading) : null, p.children); }, CommandItem: dropdownKit.Item, CommandSeparator: function () { return h(Separator, { className: 'my-1' }); }, CommandShortcut: box('ml-auto text-xs text-muted-foreground', 'span'), CommandDialog: dialogKit.Root,
    Kbd: box('inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground', 'kbd'),
    KbdGroup: box('inline-flex items-center gap-1', 'span'),
    Spinner: function (p) { return h(lucideProxy.Loader2, { className: cn('size-4 animate-spin', p.className) }); },
    ButtonGroup: box('inline-flex items-center rounded-md'), ButtonGroupText: box('inline-flex items-center px-3 text-sm text-muted-foreground'), ButtonGroupSeparator: Separator,
    Field: box('flex flex-col gap-1.5'), FieldLabel: Label, FieldDescription: box('text-xs text-muted-foreground', 'p'), FieldError: box('text-xs text-destructive', 'p'), FieldGroup: box('flex flex-col gap-4'), FieldSet: box('flex flex-col gap-4 border-0 p-0', 'fieldset'), FieldLegend: box('text-sm font-semibold', 'legend'), FieldContent: box('flex flex-col gap-1'), FieldTitle: box('text-sm font-medium'), FieldSeparator: Separator,
    InputGroup: box('flex items-center rounded-md border border-input bg-background px-2'), InputGroupInput: function (p) { return h('input', Object.assign(passProps(p), { className: cn('h-9 w-full bg-transparent px-2 text-sm outline-none', p.className) })); }, InputGroupTextarea: Textarea, InputGroupAddon: box('inline-flex items-center gap-1 text-muted-foreground'), InputGroupButton: Button, InputGroupText: box('text-xs text-muted-foreground', 'span'),
    Empty: box('flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center gap-3'), EmptyHeader: box('flex flex-col items-center gap-2'), EmptyMedia: box('flex size-10 items-center justify-center rounded-lg bg-muted'), EmptyTitle: box('text-base font-semibold', 'h3'), EmptyDescription: box('text-sm text-muted-foreground max-w-sm', 'p'), EmptyContent: box('flex items-center gap-2 mt-2'),
    Item: box('flex items-center gap-3 rounded-lg border border-border p-3'), ItemGroup: box('flex flex-col gap-2'), ItemMedia: box('shrink-0'), ItemContent: box('flex-1 min-w-0'), ItemTitle: box('text-sm font-medium'), ItemDescription: box('text-xs text-muted-foreground'), ItemActions: box('flex items-center gap-1.5'), ItemSeparator: Separator,
    Calendar: DayPickerComp,
    // Sidebar
    SidebarProvider: SidebarProvider, Sidebar: Sidebar, SidebarContent: box('flex-1 overflow-auto p-3 flex flex-col gap-4'),
    SidebarHeader: box('p-3 border-b border-border'), SidebarFooter: box('p-3 border-t border-border mt-auto'),
    SidebarGroup: box('flex flex-col gap-1.5'), SidebarGroupLabel: box('px-2 text-xs font-medium text-muted-foreground'),
    SidebarGroupContent: box('flex flex-col gap-0.5'), SidebarGroupAction: Button,
    SidebarMenu: box('flex flex-col gap-0.5', 'ul'), SidebarMenuItem: box('', 'li'), SidebarMenuButton: SidebarMenuButton,
    SidebarMenuAction: Button, SidebarMenuBadge: Badge, SidebarMenuSkeleton: Skeleton,
    SidebarMenuSub: box('ml-4 border-l border-border pl-2 flex flex-col gap-0.5', 'ul'),
    SidebarMenuSubItem: box('', 'li'), SidebarMenuSubButton: SidebarMenuButton,
    SidebarTrigger: SidebarTrigger, SidebarRail: function () { return null; },
    SidebarInset: box('flex-1 min-w-0 flex flex-col'), SidebarSeparator: Separator, SidebarInput: Input,
    useSidebar: useSidebar,
    // Chart
    ChartContainer: ChartContainer, ChartTooltip: ChartTooltip, ChartTooltipContent: ChartTooltipContent,
    ChartLegend: ChartLegend, ChartLegendContent: ChartLegendContent, ChartStyle: function () { return null; }, useChart: useChart,
    // Form
    Form: FormProviderShim, FormField: ControllerShim, FormItem: box('flex flex-col gap-1.5'),
    FormLabel: Label, FormControl: Slot, FormDescription: box('text-xs text-muted-foreground', 'p'),
    FormMessage: box('text-xs text-destructive', 'p'), useFormField: function () { return { id: 'f', name: 'f', formItemId: 'fi', error: undefined }; },
    // Carousel
    Carousel: Carousel, CarouselContent: box('flex gap-4 overflow-x-auto'), CarouselItem: box('shrink-0 basis-full'),
    CarouselPrevious: Button, CarouselNext: Button, useCarousel: function () { return React.useContext(CarouselCtx); },
    // InputOTP
    InputOTP: InputOTP, InputOTPGroup: box('inline-flex items-center gap-1'), InputOTPSlot: InputOTPSlot, InputOTPSeparator: function () { return h('span', { className: 'px-1 text-muted-foreground' }, '–'); },
    // Resizable
    ResizablePanelGroup: box('flex w-full h-full'), ResizablePanel: box('flex-1 min-w-0'), ResizableHandle: function () { return h('div', { className: 'w-px bg-border shrink-0' }); },
    // NavigationMenu & Menubar
    NavigationMenu: box('relative flex items-center', 'nav'), NavigationMenuList: box('flex items-center gap-1', 'ul'), NavigationMenuItem: box('', 'li'),
    NavigationMenuTrigger: Button, NavigationMenuContent: box('p-2'), NavigationMenuLink: box('inline-flex items-center px-3 py-1.5 text-sm', 'a'),
    NavigationMenuIndicator: function () { return null; }, NavigationMenuViewport: box(''),
    navigationMenuTriggerStyle: function () { return 'inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium hover:bg-accent'; },
    Menubar: box('inline-flex items-center gap-1 rounded-md border border-border p-1'), MenubarMenu: dropdownKit.Root, MenubarTrigger: dropdownKit.Trigger, MenubarContent: dropdownKit.Content, MenubarItem: dropdownKit.Item, MenubarSeparator: Separator, MenubarLabel: box('px-2 py-1 text-xs font-semibold'), MenubarShortcut: box('ml-auto text-xs opacity-60', 'span'),
    // Toast
    useToast: function () { return { toast: function (t) { showToast(typeof t === 'string' ? t : (t && t.title) || 'Done'); }, toasts: [] }; },
    toast: function (t) { showToast(typeof t === 'string' ? t : (t && t.title) || 'Done'); },
    Toaster: function () { return null; }
  };

  function makeSmartFallbackProxy(baseExports) {
    var compCache = {};
    var proxy = new Proxy(Object.assign({ __esModule: true }, baseExports || {}), {
      get: function (target, prop) {
        if (prop in target) return target[prop];
        if (prop === 'default') return proxy;
        if (prop === '__esModule') return true;
        if (typeof prop !== 'string') return undefined;
        if (/^[A-Z]/.test(prop)) {
          if (!compCache[prop]) {
            var baseComp = box('');
            compCache[prop] = new Proxy(baseComp, {
              get: function (ct, subProp) {
                if (subProp in ct) return ct[subProp];
                if (typeof subProp === 'string' && /^[A-Z]/.test(subProp)) return box('');
                return undefined;
              }
            });
          }
          return compCache[prop];
        }
        if (prop.indexOf('use') === 0) {
          return function () { return {}; };
        }
        return function () { return ''; };
      }
    });
    return proxy;
  }

  var uiProxy = makeSmartFallbackProxy(SHADCN_UI_EXPORTS);

  // ── 6. Lazy Multi-File Module Registry & Resolver ──
  var compiledModules = {};
  var pendingAuxByKey = {};
  var compilingSet = {};

  function normalizeModPath(p) {
    var s = String(p || '').trim().replace(/\\\\/g, '/').replace(/^\\.?\\//, '');
    var parts = s.split('/');
    var stack = [];
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i];
      if (!seg || seg === '.') continue;
      if (seg === '..') { if (stack.length) stack.pop(); }
      else stack.push(seg);
    }
    return stack.join('/');
  }

  function stripExt(p) {
    return String(p || '').replace(/\\.(tsx|ts|jsx|js|mjs|cjs)$/, '');
  }

  function resolveRelativePath(fromPath, relSpec) {
    var base = normalizeModPath(fromPath);
    var dir = base.indexOf('/') !== -1 ? base.slice(0, base.lastIndexOf('/')) : '';
    return normalizeModPath((dir ? dir + '/' : '') + relSpec);
  }

  function registerPendingAux(af) {
    if (!af || !af.code) return;
    var norm = normalizeModPath(af.path || '');
    var noExt = stripExt(norm);
    var keys = [norm, noExt, '@/' + norm, '@/' + noExt];
    if (noExt.endsWith('/index')) {
      var dirKey = noExt.slice(0, -6);
      keys.push(dirKey, '@/' + dirKey);
    }
    var base = noExt.split('/').pop();
    if (base && base !== 'index') keys.push('__base:' + base);
    // Also index trailing segments like components/foo or data/bar
    var segs = noExt.split('/');
    for (var i = 1; i < segs.length; i++) {
      keys.push('__tail:' + segs.slice(i).join('/'));
    }
    for (var k = 0; k < keys.length; k++) {
      if (keys[k] && !pendingAuxByKey[keys[k]]) pendingAuxByKey[keys[k]] = af;
    }
  }

  function findPendingAux(spec, fromPath) {
    var candidates = [];
    if (spec.indexOf('./') === 0 || spec.indexOf('../') === 0) {
      var rel = resolveRelativePath(fromPath, spec);
      candidates.push(rel, stripExt(rel), stripExt(rel) + '/index');
    }
    var cleaned = stripExt(spec.replace(/^@\\//, ''));
    candidates.push(spec, stripExt(spec), cleaned, cleaned + '/index', '__tail:' + cleaned);
    var base = cleaned.split('/').pop();
    if (base && base !== 'index') candidates.push('__base:' + base);
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (compiledModules[c]) return { compiled: compiledModules[c] };
      if (pendingAuxByKey[c]) return { pending: pendingAuxByKey[c], key: c };
    }
    return null;
  }

  function resolveModule(spec, fromPath) {
    spec = String(spec || '').trim();
    if (!spec) return uiProxy;

    // CSS / font side-effect imports
    if (/\\.(css|scss|sass|less)$/.test(spec) || spec.indexOf('@fontsource/') === 0) return {};
    if (spec.indexOf('next/font/') === 0) {
      return new Proxy({ __esModule: true }, {
        get: function (_t, prop) {
          if (prop === '__esModule') return true;
          return function () { return { className: '', variable: '', style: { fontFamily: 'inherit' } }; };
        }
      });
    }

    // 1. Check already-compiled or lazily-compilable local/auxiliary files
    var localHit = findPendingAux(spec, fromPath || PAYLOAD.sourcePath || '');
    if (localHit) {
      if (localHit.compiled) return localHit.compiled;
      if (localHit.pending) {
        var af = localHit.pending;
        var auxId = normalizeModPath(af.path || localHit.key);
        if (!compilingSet[auxId]) {
          compilingSet[auxId] = true;
          try {
            var regPaths = [af.path, auxId, '@/' + auxId];
            return compileAndLoad(af.code, af.path || 'aux.tsx', regPaths);
          } catch (_e) {
            // Fall through to shims if aux file fails to compile
          } finally {
            delete compilingSet[auxId];
          }
        }
      }
    }

    // 2. Core React & Styling Utilities
    if (spec === 'react') return Object.assign({ __esModule: true, default: SafeReact }, SafeReact);
    if (spec === 'react-dom' || spec === 'react-dom/client') return Object.assign({ __esModule: true, default: ReactDOM }, ReactDOM);
    if (spec === 'clsx') return { __esModule: true, default: clsx, clsx: clsx };
    if (spec === 'tailwind-merge') return { __esModule: true, twMerge: cn, default: cn, extendTailwindMerge: function () { return cn; } };
    if (spec === 'class-variance-authority') return { __esModule: true, cva: cva, cx: cn, default: cva };

    // 3. Icon Libraries
    if (
      spec === 'lucide-react' || spec.indexOf('lucide-react/') === 0 ||
      spec.indexOf('react-icons') === 0 ||
      spec === '@tabler/icons-react' ||
      spec === 'phosphor-react' || spec === '@phosphor-icons/react' ||
      spec === '@aliimam/icons' || spec === '@aliimam/logos' ||
      spec === 'hugeicons-react' ||
      spec === '@radix-ui/react-icons' ||
      spec.indexOf('@heroicons/react') === 0
    ) {
      return lucideProxy;
    }
    if (spec === '@hugeicons/react') {
      var HugeiconsIcon = React.forwardRef(function (p, ref) {
        var iconKey = typeof p.icon === 'string' ? p.icon.replace(/Icon$/, '') : 'Sparkles';
        var Comp = makeIcon(iconKey);
        return h(Comp, { ref: ref, size: p.size || 18, strokeWidth: p.strokeWidth || 2, color: p.color, className: p.className, style: p.style });
      });
      return { __esModule: true, HugeiconsIcon: HugeiconsIcon, default: HugeiconsIcon };
    }
    if (spec === '@hugeicons/core-free-icons' || spec.indexOf('@hugeicons/') === 0) {
      return new Proxy({ __esModule: true }, {
        get: function (_t, prop) {
          if (prop === '__esModule') return true;
          return typeof prop === 'string' ? prop : 'Sparkles';
        }
      });
    }

    // 4. Motion & Number Animation
    if (spec === 'motion/react' || spec === 'framer-motion' || spec === 'motion' || spec === 'motion/react-client') return motionModule;
    if (spec === '@number-flow/react') {
      var NumberFlow = React.forwardRef(function (p, ref) {
        var val = p.value !== undefined && p.value !== null ? p.value : 0;
        var text = String(val);
        if (typeof val === 'number' && p.format) {
          try { text = new Intl.NumberFormat(p.locales || 'en-US', p.format).format(val); } catch (_e) {}
        }
        return h('span', { ref: ref, className: cn('tabular-nums inline-block transition-all duration-200', p.className), style: p.style }, (p.prefix || '') + text + (p.suffix || ''));
      });
      return { __esModule: true, default: NumberFlow, NumberFlow: NumberFlow, NumberFlowGroup: function (p) { return h('span', { className: p.className }, p.children); } };
    }

    // 5. Radix UI & Base UI Compound Primitives
    if (spec === 'radix-ui' || spec.indexOf('@radix-ui/react-') === 0 || spec === '@base-ui/react' || spec.indexOf('@base-ui/react/') === 0) {
      return resolveRadixOrBaseModule(spec);
    }

    // 6. Charts, Forms, Validation, Dates, Measure, DnD, Floating, Router, OTP, Payment, Shiki, Aria
    if (spec === 'recharts' || spec.indexOf('recharts@') === 0) return rechartsModule;
    if (spec === 'react-hook-form') return reactHookFormModule;
    if (spec === '@hookform/resolvers/zod' || spec.indexOf('@hookform/resolvers') === 0) {
      return { __esModule: true, zodResolver: function () { return function (values) { return Promise.resolve({ values: values, errors: {} }); }; } };
    }
    if (spec === 'zod') return zodBuilder;
    if (spec === 'react-use-measure') {
      var useMeasure = function () {
        var st = React.useState({ width: 320, height: 200, top: 0, left: 0, bottom: 200, right: 320, x: 0, y: 0 });
        var refCb = React.useCallback(function (node) {
          if (!node || typeof node.getBoundingClientRect !== 'function') return;
          var r = node.getBoundingClientRect();
          if (r.width > 0 || r.height > 0) {
            st[1]({ width: r.width, height: r.height, top: r.top, left: r.left, bottom: r.bottom, right: r.right, x: r.x, y: r.y });
          }
        }, []);
        return [refCb, st[0]];
      };
      return { __esModule: true, default: useMeasure, useMeasure: useMeasure };
    }
    if (spec === 'react-day-picker') {
      return {
        __esModule: true,
        DayPicker: DayPickerComp,
        DayButton: Button,
        getDefaultClassNames: function () { return new Proxy({}, { get: function () { return ''; } }); }
      };
    }
    if (spec === 'date-fns' || spec.indexOf('date-fns/') === 0 || spec === 'little-date') return dateFnsModule;

    if (spec === '@dnd-kit/core') {
      return {
        __esModule: true,
        DndContext: function (p) { return h(React.Fragment, null, p.children); },
        DragOverlay: function () { return null; },
        useDraggable: function () { return { attributes: {}, listeners: {}, setNodeRef: function () {}, transform: null, isDragging: false }; },
        useDroppable: function () { return { setNodeRef: function () {}, isOver: false }; },
        useSensor: function (s) { return s; },
        useSensors: function () { return Array.prototype.slice.call(arguments); },
        PointerSensor: function () {}, KeyboardSensor: function () {}, MouseSensor: function () {}, TouchSensor: function () {},
        closestCenter: function () { return []; }, closestCorners: function () { return []; }, rectIntersection: function () { return []; }
      };
    }
    if (spec === '@dnd-kit/sortable') {
      return {
        __esModule: true,
        SortableContext: function (p) { return h(React.Fragment, null, p.children); },
        useSortable: function () { return { attributes: {}, listeners: {}, setNodeRef: function () {}, setActivatorNodeRef: function () {}, transform: null, transition: undefined, isDragging: false }; },
        arrayMove: function (arr, from, to) { var copy = arr.slice(); var item = copy.splice(from, 1)[0]; copy.splice(to, 0, item); return copy; },
        verticalListSortingStrategy: function () {}, horizontalListSortingStrategy: function () {}, rectSortingStrategy: function () {},
        sortableKeyboardCoordinates: function () { return { x: 0, y: 0 }; }
      };
    }
    if (spec === '@dnd-kit/utilities') {
      return { __esModule: true, CSS: { Transform: { toString: function () { return ''; } }, Transition: { toString: function () { return ''; } } } };
    }
    if (spec === '@dnd-kit/modifiers') {
      return new Proxy({ __esModule: true }, { get: function (_t, p) { return p === '__esModule' ? true : function (a) { return a; }; } });
    }
    if (spec.indexOf('@floating-ui/') === 0) {
      return {
        __esModule: true,
        useFloating: function () { return { refs: { setReference: function () {}, setFloating: function () {} }, floatingStyles: {}, context: {} }; },
        autoUpdate: function () { return function () {}; },
        offset: function () { return {}; }, flip: function () { return {}; }, shift: function () { return {}; }, size: function () { return {}; }, arrow: function () { return {}; },
        useHover: function () { return {}; }, useFocus: function () { return {}; }, useDismiss: function () { return {}; }, useRole: function () { return {}; }, useClick: function () { return {}; },
        useInteractions: function () { return { getReferenceProps: function (p) { return p || {}; }, getFloatingProps: function (p) { return p || {}; } }; },
        FloatingPortal: function (p) { return h(React.Fragment, null, p.children); },
        FloatingFocusManager: function (p) { return h(React.Fragment, null, p.children); },
        FloatingArrow: function () { return null; }
      };
    }
    if (spec === 'react-router-dom' || spec === 'react-router') {
      var RouterLink = React.forwardRef(function (p, ref) {
        return h('a', Object.assign(passProps(p, { to: 1, end: 1 }), { ref: ref, href: p.to || p.href || '#', onClick: function (e) { e.preventDefault(); if (p.onClick) p.onClick(e); } }), p.children);
      });
      return {
        __esModule: true,
        BrowserRouter: function (p) { return h(React.Fragment, null, p.children); },
        HashRouter: function (p) { return h(React.Fragment, null, p.children); },
        MemoryRouter: function (p) { return h(React.Fragment, null, p.children); },
        Routes: function (p) { return h(React.Fragment, null, p.children); },
        Route: function (p) { return p.element || null; },
        Outlet: function () { return null; },
        Navigate: function () { return null; },
        Link: RouterLink, NavLink: RouterLink,
        useNavigate: function () { return function () {}; },
        useLocation: function () { return { pathname: '/', search: '', hash: '', state: null }; },
        useParams: function () { return {}; },
        useSearchParams: function () { return [new URLSearchParams(), function () {}]; }
      };
    }
    if (spec === 'input-otp') {
      return { __esModule: true, OTPInput: InputOTP, OTPInputContext: OtpCtx, REGEXP_ONLY_DIGITS: '^[0-9]+$', REGEXP_ONLY_CHARS: '^[a-zA-Z]+$', REGEXP_ONLY_DIGITS_AND_CHARS: '^[a-zA-Z0-9]+$' };
    }
    if (spec === 'react-payment-inputs' || spec === 'react-payment-inputs/images') {
      return {
        __esModule: true,
        default: new Proxy({}, { get: function () { return ''; } }),
        usePaymentInputs: function () {
          return {
            meta: { erroredInputs: {}, touchedInputs: {}, cardType: { type: 'visa', displayName: 'Visa' } },
            getCardImageProps: function () { return { width: 24, height: 16 }; },
            getCardNumberProps: function (p) { return Object.assign({ placeholder: '0000 0000 0000 0000' }, p || {}); },
            getExpiryDateProps: function (p) { return Object.assign({ placeholder: 'MM / YY' }, p || {}); },
            getCVCProps: function (p) { return Object.assign({ placeholder: 'CVC' }, p || {}); },
            wrapperProps: {}
          };
        }
      };
    }
    if (spec === 'use-mask-input') {
      return { __esModule: true, withMask: function () { return function () {}; }, withHookFormMask: function (r) { return r; }, useHookFormMask: function (r) { return r; } };
    }
    if (spec === 'shiki') {
      return {
        __esModule: true,
        codeToHtml: function (code) { return Promise.resolve('<pre class="p-4 rounded-lg bg-muted/60 text-xs font-mono overflow-x-auto"><code>' + String(code || '').replace(/</g, '&lt;') + '</code></pre>'); },
        createHighlighter: function () { return Promise.resolve({ codeToHtml: function (c) { return '<pre><code>' + String(c || '').replace(/</g, '&lt;') + '</code></pre>'; } }); }
      };
    }
    if (spec === 'react-aria-components') {
      return makeSmartFallbackProxy(Object.assign({}, SHADCN_UI_EXPORTS, {
        composeRenderProps: function (ch, fn) { return typeof fn === 'function' ? fn(ch, {}) : ch; },
        TextField: box('flex flex-col gap-1.5'), Group: box('inline-flex items-center gap-1'),
        Heading: box('text-base font-semibold', 'h3'), Text: box('text-sm', 'span'),
        Link: box('underline-offset-4 hover:underline', 'a')
      }));
    }
    if (spec === 'vaul') return { __esModule: true, Drawer: makeCompoundProxy(dialogKit) };
    if (spec === 'cmdk') {
      var CmdkComp = Object.assign(box('flex w-full flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground'), {
        Input: SHADCN_UI_EXPORTS.CommandInput, List: SHADCN_UI_EXPORTS.CommandList, Empty: SHADCN_UI_EXPORTS.CommandEmpty,
        Group: SHADCN_UI_EXPORTS.CommandGroup, Item: SHADCN_UI_EXPORTS.CommandItem, Separator: SHADCN_UI_EXPORTS.CommandSeparator,
        Dialog: dialogKit.Root, Loading: box('p-3 text-xs text-muted-foreground')
      });
      return { __esModule: true, Command: CmdkComp, default: CmdkComp, useCommandState: function () { return ''; } };
    }
    if (spec === 'embla-carousel-react' || spec === 'embla-carousel-autoplay') {
      var useEmbla = function () {
        return [function () {}, { scrollPrev: function () {}, scrollNext: function () {}, scrollTo: function () {}, canScrollPrev: function () { return true; }, canScrollNext: function () { return true; }, on: function () {}, off: function () {}, selectedScrollSnap: function () { return 0; } }];
      };
      return { __esModule: true, default: spec === 'embla-carousel-autoplay' ? function () { return {}; } : useEmbla };
    }
    if (spec === 'react-resizable-panels') {
      return { __esModule: true, PanelGroup: box('flex w-full h-full'), Group: box('flex w-full h-full'), Panel: box('flex-1 min-w-0'), PanelResizeHandle: function () { return h('div', { className: 'w-px bg-border' }); }, Separator: function () { return h('div', { className: 'w-px bg-border' }); } };
    }
    if (spec === 'sonner') {
      var toastFn = function (m) { showToast(typeof m === 'string' ? m : (m && m.title) || 'Notification'); };
      toastFn.success = toastFn; toastFn.error = toastFn; toastFn.info = toastFn; toastFn.warning = toastFn; toastFn.loading = toastFn; toastFn.dismiss = function () {};
      return { __esModule: true, toast: toastFn, Toaster: function () { return null; } };
    }
    if (spec === 'canvas-confetti') {
      var confetti = function () {};
      confetti.create = function () { return confetti; };
      return { __esModule: true, default: confetti };
    }
    if (spec === 'tunnel-rat') {
      return { __esModule: true, default: function () { return { In: function (p) { return h(React.Fragment, null, p.children); }, Out: function () { return null; } }; } };
    }
    if (spec === 'nanoid') {
      var nanoidFn = function () { return 'id_' + Math.random().toString(36).slice(2, 10); };
      return { __esModule: true, nanoid: nanoidFn, customAlphabet: function () { return nanoidFn; } };
    }
    if (spec === 'wavesurfer.js') {
      return { __esModule: true, default: { create: function () { return { load: function () {}, playPause: function () {}, destroy: function () {}, on: function () {}, getDuration: function () { return 120; }, getCurrentTime: function () { return 30; } }; } } };
    }
    if (spec === 'matter-js') {
      var noopObj = new Proxy({}, { get: function () { return function () { return {}; }; } });
      return { __esModule: true, default: noopObj, Engine: noopObj, Render: noopObj, Runner: noopObj, Bodies: noopObj, Composite: noopObj, World: noopObj, Mouse: noopObj, MouseConstraint: noopObj, Events: noopObj, Body: noopObj, Vector: noopObj };
    }

    // 7. Next.js Ecosystem
    if (spec === 'next/image') {
      var NextImg = React.forwardRef(function (p, ref) {
        var src = p.src || '';
        if (typeof src === 'object' && src.src) src = src.src;
        return h('img', Object.assign(passProps(p, { fill: 1, priority: 1, quality: 1, unoptimized: 1, placeholder: 1, blurDataURL: 1 }), { ref: ref, src: src, referrerPolicy: 'no-referrer', className: cn(p.fill ? 'absolute inset-0 size-full object-cover' : '', p.className) }));
      });
      return { __esModule: true, default: NextImg };
    }
    if (spec === 'next/link') {
      var NextLink = React.forwardRef(function (p, ref) {
        return h('a', Object.assign(passProps(p, { prefetch: 1, replace: 1, scroll: 1, shallow: 1 }), { ref: ref, href: p.href || '#', onClick: function (e) { e.preventDefault(); if (p.onClick) p.onClick(e); } }), p.children);
      });
      return { __esModule: true, default: NextLink };
    }
    if (spec === 'next/navigation' || spec === 'next/router') {
      return {
        __esModule: true,
        useRouter: function () { return { push: function () {}, replace: function () {}, back: function () {}, refresh: function () {}, prefetch: function () {}, pathname: '/', query: {} }; },
        usePathname: function () { return '/'; },
        useSearchParams: function () { return new URLSearchParams(); },
        useParams: function () { return {}; }
      };
    }
    if (spec.indexOf('next/font') === 0) {
      return new Proxy({ __esModule: true }, {
        get: function (_t, prop) {
          if (prop === '__esModule') return true;
          return function () { return { className: '', variable: '', style: { fontFamily: 'inherit' } }; };
        }
      });
    }
    if (spec === 'next-themes') {
      return {
        __esModule: true,
        useTheme: function () {
          var isDark = document.documentElement.classList.contains('dark');
          return {
            theme: isDark ? 'dark' : 'light',
            resolvedTheme: isDark ? 'dark' : 'light',
            setTheme: function (t) { document.documentElement.classList.toggle('dark', t === 'dark'); }
          };
        },
        ThemeProvider: function (p) { return h(React.Fragment, null, p.children); }
      };
    }

    // 8. Project-relative utilities, UI components & hooks
    if (spec === 'cn' || spec.endsWith('/cn') || spec.indexOf('@/lib/utils') !== -1 || spec.indexOf('/lib/utils') !== -1 || spec.endsWith('/utils')) {
      return { __esModule: true, cn: cn, default: cn };
    }
    if (spec.indexOf('/components/ui/') !== -1 || spec.indexOf('/ui/') !== -1) {
      return uiProxy;
    }
    if (spec.indexOf('/hooks/') !== -1) {
      return new Proxy({ __esModule: true }, {
        get: function (_t, prop) {
          if (prop === '__esModule') return true;
          if (prop === 'useAutoResizeTextarea') {
            return function () { return { textareaRef: React.useRef(null), adjustHeight: function () {} }; };
          }
          if (prop === 'useIsMobile' || prop === 'useMobile') return function () { return false; };
          if (prop === 'useToast') return SHADCN_UI_EXPORTS.useToast;
          return function () { return {}; };
        }
      });
    }
    return uiProxy;
  }

  function compileAndLoad(sourceCode, filename, registerPaths) {
    var cleaned = String(sourceCode || '')
      .replace(/^\\s*['"]use client['"];?\\s*$/gm, '')
      .replace(/^\\s*['"]use server['"];?\\s*$/gm, '');
    var transformed = window.Babel.transform(cleaned, {
      presets: [
        ['env', { modules: 'commonjs' }],
        ['react', { runtime: 'classic' }],
        ['typescript', { isTSX: true, allExtensions: true }]
      ],
      filename: filename || 'component.tsx'
    }).code;
    var mod = { exports: {} };
    var localRequire = function (spec) { return resolveModule(spec, filename || ''); };
    var runner = new Function('require', 'module', 'exports', 'React', 'cn', transformed);
    runner(localRequire, mod, mod.exports, SafeReact, cn);
    if (Array.isArray(registerPaths)) {
      registerPaths.forEach(function (rp) {
        if (!rp) return;
        var norm = normalizeModPath(rp);
        var noExt = stripExt(norm);
        compiledModules[rp] = mod.exports;
        compiledModules[norm] = mod.exports;
        compiledModules[noExt] = mod.exports;
        compiledModules['@/' + norm] = mod.exports;
        compiledModules['@/' + noExt] = mod.exports;
        if (noExt.endsWith('/index')) {
          var dirKey = noExt.slice(0, -6);
          compiledModules[dirKey] = mod.exports;
          compiledModules['@/' + dirKey] = mod.exports;
        }
        var base = noExt.split('/').pop();
        if (base && base !== 'index') compiledModules['__base:' + base] = mod.exports;
      });
    }
    return mod.exports;
  }

  function pickComponent(exportsObj) {
    if (!exportsObj) return null;
    if (typeof exportsObj === 'function') return exportsObj;
    if (typeof exportsObj.default === 'function') return exportsObj.default;
    var keys = Object.keys(exportsObj);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (/^[A-Z]/.test(k) && typeof exportsObj[k] === 'function') {
        return exportsObj[k];
      }
    }
    return null;
  }

  function buildInitialProps() {
    var out = Object.assign({}, PAYLOAD.sampleProps || {});
    (PAYLOAD.callbackNames || []).forEach(function (cbName) {
      if (typeof out[cbName] !== 'function') {
        out[cbName] = function () {};
      }
    });
    return out;
  }

  class PreviewErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { error: null, retryKey: 0 }; }
    static getDerivedStateFromError(error) { return { error: error }; }
    componentDidCatch(error) {
      reportStatus({
        ok: false,
        reasonCode: 'RUNTIME_ERROR',
        message: String((error && error.message) || error || 'Runtime error'),
        stack: String((error && error.stack) || '')
      });
    }
    render() {
      var self = this;
      if (this.state.error) {
        var errMsg = String((this.state.error && this.state.error.message) || this.state.error || 'Component crashed during render');
        var errStack = String((this.state.error && this.state.error.stack) || '');
        return h('div', { className: 'w-full max-w-md rounded-xl border border-border bg-card p-5 text-left', role: 'alert' },
          h('div', { className: 'flex items-start gap-3' },
            h('span', { className: 'inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive', 'aria-hidden': 'true' }, '!'),
            h('div', { className: 'min-w-0 flex-1' },
              h('div', { className: 'text-sm font-semibold text-foreground' }, PAYLOAD.name || 'Preview error'),
              h('p', { className: 'mt-1 text-xs text-muted-foreground leading-relaxed' }, errMsg),
              h('div', { className: 'mt-3 flex items-center gap-2' },
                h('button', {
                  type: 'button',
                  className: 'inline-flex h-7 items-center rounded-md border border-border bg-secondary px-2.5 text-xs font-medium text-secondary-foreground hover:opacity-90',
                  onClick: function () { self.setState({ error: null, retryKey: self.state.retryKey + 1 }); }
                }, 'Retry')
              ),
              errStack ? h('details', { className: 'mt-3' },
                h('summary', { className: 'cursor-pointer text-xs text-muted-foreground hover:text-foreground' }, 'Stack trace'),
                h('pre', { className: 'mt-2 max-h-40 overflow-auto rounded-md bg-muted/60 p-2 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap' }, errStack)
              ) : null
            )
          )
        );
      }
      return h(React.Fragment, { key: this.state.retryKey }, this.props.children);
    }
  }

  function mountPreview() {
    try {
      if (!window.Babel || !React || !ReactDOM) {
        showFallback(PAYLOAD.name, 'Offline Preview Kit runtime failed to load.', '', 'MISSING_DEP');
        return;
      }
      // 1. Register all auxiliary files for lazy topological resolution
      (PAYLOAD.auxiliaryFiles || []).forEach(function (af) {
        registerPendingAux(af);
      });

      // 2. Compile primary demo or standalone component (aux files compile on demand)
      var targetExports = null;
      if (PAYLOAD.demoCode) {
        targetExports = compileAndLoad(PAYLOAD.demoCode, 'demo.tsx', []);
      } else if (PAYLOAD.code) {
        var primaryReg = PAYLOAD.sourcePath ? [PAYLOAD.sourcePath, '@/' + PAYLOAD.sourcePath] : [];
        targetExports = compileAndLoad(PAYLOAD.code, PAYLOAD.sourcePath || 'component.tsx', primaryReg);
      }

      var Comp = pickComponent(targetExports);
      if (typeof Comp === 'function') {
        var initProps = PAYLOAD.demoCode ? null : buildInitialProps();
        ReactDOM.createRoot(mount).render(
          h(PreviewErrorBoundary, null, h(Comp, initProps))
        );
        setTimeout(function () {
          if (window.__wfPreviewStatus && window.__wfPreviewStatus.ok === false) return;
          var rect = mount ? mount.getBoundingClientRect() : { width: 0, height: 0 };
          var hasDom = Boolean(mount && (mount.children.length > 0 || (mount.textContent || '').trim().length > 0));
          var ok = hasDom && rect.width > 0 && rect.height > 0;
          reportStatus({
            ok: ok,
            reasonCode: ok ? null : 'BLANK',
            message: ok ? '' : 'Component mounted with empty output',
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          });
        }, 160);
      } else {
        showFallback(PAYLOAD.name, 'No default React component export was found to mount standalone.', '', 'RUNTIME_ERROR');
      }
    } catch (err) {
      showFallback(
        PAYLOAD.name,
        err && err.message ? err.message : 'Unable to execute TSX preview in standalone browser sandbox.',
        err && err.stack ? err.stack : '',
        'RUNTIME_ERROR'
      );
    }
  }
  window.__wfRemountPreview = mountPreview;
  mountPreview();
})();
</script>`;
}
