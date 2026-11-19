/**
 * WebForge Studio — Zero-Dependency ZIP Packager & Project Exporter
 */

import { isHtmlVfs } from './context-budget.mjs';
import { escapeHtml } from './storage.mjs';

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export function createZipBlob(files) {
  const encoder = new TextEncoder();
  const entries = [];
  let offset = 0;

  for (const file of files) {
    const data = encoder.encode(file.content ?? '');
    const name = encoder.encode(file.name);
    const now = new Date();
    const time = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
    const date = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
    const crc = crc32(data);

    const header = new Uint8Array(30 + name.length);
    const hv = new DataView(header.buffer);
    hv.setUint32(0, 0x04034b50, true);
    hv.setUint16(4, 20, true);
    hv.setUint16(6, 0, true);
    hv.setUint16(8, 0, true);
    hv.setUint16(10, time, true);
    hv.setUint16(12, date, true);
    hv.setUint32(14, crc, true);
    hv.setUint32(18, data.length, true);
    hv.setUint32(22, data.length, true);
    hv.setUint16(26, name.length, true);
    hv.setUint16(28, 0, true);
    header.set(name, 30);

    entries.push({ header, data, name, crc, size: data.length, offset, time, date });
    offset += header.length + data.length;
  }

  const cdParts = [];
  let cdSize = 0;
  for (const e of entries) {
    const cd = new Uint8Array(46 + e.name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, e.time, true);
    cv.setUint16(14, e.date, true);
    cv.setUint32(16, e.crc, true);
    cv.setUint32(20, e.size, true);
    cv.setUint32(24, e.size, true);
    cv.setUint16(28, e.name.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, e.offset, true);
    cd.set(e.name, 46);
    cdParts.push(cd);
    cdSize += cd.length;
  }

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalLen = entries.reduce((s, e) => s + e.header.length + e.data.length, 0) + cdSize + eocd.length;
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const e of entries) {
    result.set(e.header, pos); pos += e.header.length;
    result.set(e.data, pos); pos += e.data.length;
  }
  for (const cd of cdParts) {
    result.set(cd, pos); pos += cd.length;
  }
  result.set(eocd, pos);

  return new Blob([result], { type: 'application/zip' });
}

export function buildProjectExportFiles(projectName, vfs, standaloneHtml) {
  const isHtmlOnly = isHtmlVfs(vfs);
  const safeSlug = String(projectName || 'webforge-project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'webforge-project';
  const files = Object.entries(vfs || {}).map(([name, content]) => ({ name, content }));

  if (!isHtmlOnly) {
    if (!vfs['package.json']) {
      files.push({
        name: 'package.json',
        content: JSON.stringify({
          name: safeSlug,
          private: true,
          version: '0.0.0',
          type: 'module',
          scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
          dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0', 'lucide-react': '^0.460.0' },
          devDependencies: { '@vitejs/plugin-react': '^4.2.1', vite: '^5.1.0', tailwindcss: '^3.4.1' },
        }, null, 2),
      });
    }
    if (!vfs['index.html']) {
      const entry = vfs['src/main.tsx'] ? '/src/main.tsx' : '/src/main.jsx';
      files.push({
        name: 'index.html',
        content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${escapeHtml(projectName || 'WebForge App')}</title>\n  <script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="${entry}"></script>\n</body>\n</html>\n`,
      });
    }
    if (!vfs['vite.config.js'] && !vfs['vite.config.ts']) {
      files.push({
        name: 'vite.config.js',
        content: `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n  resolve: { alias: { '@': '/src' } },\n});\n`,
      });
    }
  }

  files.push({ name: 'dist/index.html', content: standaloneHtml || '' });
  files.push({
    name: 'README.md',
    content: isHtmlOnly
      ? `# ${projectName || 'WebForge Site'}\n\nOpen \`index.html\` or \`dist/index.html\` directly in your browser.\n`
      : `# ${projectName || 'WebForge React App'}\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`,
  });

  return { safeSlug, files };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 120);
}
