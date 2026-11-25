/**
 * WebForge Settings — Reusable UI Primitives (Cherry Studio Structure, WebForge Tokens)
 * Shared components: SettingsLayout, SettingsNav, SettingsPage, SettingsCard, SettingsRow,
 * ListPane, ListItem, Switch, ModelSelect, SecretInput, EmptyState.
 */

import { escapeHtml } from '../../../js/modules/storage.mjs';
import { renderKubaiIcon } from '../../../js/modules/kubai-icons.mjs';

function attrString(attrs = {}) {
  return Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => (v === true ? k : `${k}="${escapeHtml(String(v))}"`))
    .join(' ');
}

export function SettingsLayout({
  navHtml = '',
  listPaneHtml = '',
  contentHtml = '',
  hasListPane = false,
  activePageLabel = '',
  mobileNavOpen = false,
  animatePage = false,
  animateListPane = false,
} = {}) {
  return `
    <div class="st-shell ${hasListPane ? 'has-list-pane' : ''} ${mobileNavOpen ? 'st-mobile-nav-open' : ''}" data-st-shell>
      <aside class="st-nav-pane" id="stNavPane" aria-label="Settings navigation">
        ${navHtml}
      </aside>
      <aside class="st-list-pane ${animateListPane ? 'st-list-enter' : ''}" id="stListPaneHost" aria-label="Selection list" ${hasListPane ? '' : 'hidden'}>${hasListPane ? listPaneHtml : ''}</aside>
      <main class="st-content-pane" id="stContentPane">
        <div class="st-mobile-drill-bar">
          <button type="button" class="st-icon-text-btn" data-st-mobile-back aria-label="Back to settings sections">
            <i data-lucide="chevron-left"></i>
            <span>Settings</span>
          </button>
          <span class="st-mobile-drill-title truncate" id="stMobileDrillTitle">${escapeHtml(activePageLabel)}</span>
        </div>
        <div class="st-content-scroll" id="stContentScroll">
          <div class="st-content-inner ${animatePage ? 'st-page-enter' : ''}" id="stContentInner">
            ${contentHtml}
          </div>
        </div>
      </main>
    </div>
  `;
}

export function SettingsNav({ groups = [], activePageId = '', searchQuery = '' } = {}) {
  const groupsHtml = groups.length
    ? groups
        .map(
          (group) => `
          <div class="st-nav-group">
            <div class="st-nav-group-label">${escapeHtml(group.label)}</div>
            <div class="st-nav-group-items" role="list">
              ${group.items
                .map((item) => {
                  const active = item.id === activePageId;
                  return `
                    <button
                      type="button"
                      class="st-nav-item ${active ? 'active' : ''}"
                      data-st-nav="${escapeHtml(item.id)}"
                      aria-current="${active ? 'page' : 'false'}"
                    >
                      ${renderKubaiIcon(item.id, { size: 18, className: 'st-nav-kb-icon' })}
                      <span class="truncate">${escapeHtml(item.label)}</span>
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>
        `
        )
        .join('')
    : `<div class="st-nav-empty">No matching settings</div>`;

  return `
    <div class="st-nav-head">
      <button type="button" class="st-back-btn" id="btnSettingsBack" aria-label="Back to previous screen" title="Back (Esc)">
        <i data-lucide="arrow-left"></i>
        <span>Back</span>
      </button>
      <h1 class="st-nav-title">Settings</h1>
      <div class="st-search-wrap">
        <i data-lucide="search" aria-hidden="true"></i>
        <input
          type="search"
          id="stNavSearch"
          class="st-input st-search-input"
          placeholder="Search settings…"
          value="${escapeHtml(searchQuery)}"
          autocomplete="off"
          aria-label="Search settings"
        >
      </div>
    </div>
    <nav class="st-nav-scroll" aria-label="Settings sections">
      ${groupsHtml}
    </nav>
  `;
}

export function SettingsPage({ title = '', subtitle = '', headerActionHtml = '', bodyHtml = '' } = {}) {
  return `
    <section class="st-page">
      <header class="st-page-head">
        <div class="st-page-head-copy">
          <h2 class="st-page-title">${escapeHtml(title)}</h2>
          ${subtitle ? `<p class="st-page-subtitle">${escapeHtml(subtitle)}</p>` : ''}
        </div>
        ${headerActionHtml ? `<div class="st-page-head-action">${headerActionHtml}</div>` : ''}
      </header>
      <div class="st-page-body">
        ${bodyHtml}
      </div>
    </section>
  `;
}

export function SettingsCard({ title = '', description = '', headerRightHtml = '', rowsHtml = '', bodyHtml = '', id = '' } = {}) {
  const idAttr = id ? `id="${escapeHtml(id)}"` : '';
  return `
    <div class="st-card" ${idAttr}>
      ${
        title || headerRightHtml
          ? `<div class="st-card-head">
              <div class="st-card-head-copy">
                ${title ? `<h3 class="st-card-title">${escapeHtml(title)}</h3>` : ''}
                ${description ? `<p class="st-card-desc">${escapeHtml(description)}</p>` : ''}
              </div>
              ${headerRightHtml ? `<div class="st-card-head-right">${headerRightHtml}</div>` : ''}
            </div>`
          : ''
      }
      ${rowsHtml ? `<div class="st-card-rows">${rowsHtml}</div>` : ''}
      ${bodyHtml ? `<div class="st-card-body">${bodyHtml}</div>` : ''}
    </div>
  `;
}

export function SettingsRow({
  icon = '',
  label = '',
  tooltip = '',
  description = '',
  controlHtml = '',
  extraIconBtnHtml = '',
  id = '',
  className = '',
  labelFor = '',
} = {}) {
  const idAttr = id ? `id="${escapeHtml(id)}"` : '';
  const tag = labelFor ? 'label' : 'span';
  const forAttr = labelFor ? `for="${escapeHtml(labelFor)}"` : '';
  return `
    <div class="st-row ${escapeHtml(className)}" ${idAttr}>
      <div class="st-row-left">
        <div class="st-row-title-line">
          ${icon ? `<i data-lucide="${escapeHtml(icon)}" class="st-row-icon" aria-hidden="true"></i>` : ''}
          <${tag} class="st-row-label" ${forAttr}>${escapeHtml(label)}</${tag}>
          ${
            tooltip
              ? `<span class="st-info-tip" title="${escapeHtml(tooltip)}" aria-label="${escapeHtml(tooltip)}" tabindex="0"><i data-lucide="info"></i></span>`
              : ''
          }
        </div>
        ${description ? `<p class="st-row-desc">${escapeHtml(description)}</p>` : ''}
      </div>
      <div class="st-row-right">
        ${controlHtml}
        ${extraIconBtnHtml}
      </div>
    </div>
  `;
}

export function ListPane({
  searchId = 'stListSearch',
  searchPlaceholder = 'Filter…',
  searchValue = '',
  filterBtnHtml = '',
  itemsHtml = '',
  footerHtml = '',
  mobileDropdownHtml = '',
  id = '',
} = {}) {
  const idAttr = id ? `id="${escapeHtml(id)}"` : '';
  return `
    <div class="st-list-wrap" ${idAttr}>
      ${mobileDropdownHtml ? `<div class="st-list-mobile-picker">${mobileDropdownHtml}</div>` : ''}
      <div class="st-list-desktop">
        <div class="st-list-head">
          <div class="st-search-wrap st-list-search-wrap">
            <i data-lucide="search" aria-hidden="true"></i>
            <input
              type="search"
              id="${escapeHtml(searchId)}"
              class="st-input st-search-input"
              placeholder="${escapeHtml(searchPlaceholder)}"
              value="${escapeHtml(searchValue)}"
              autocomplete="off"
              aria-label="${escapeHtml(searchPlaceholder)}"
            >
          </div>
          ${filterBtnHtml}
        </div>
        <div class="st-list-scroll" role="listbox">
          ${itemsHtml}
        </div>
        ${footerHtml ? `<div class="st-list-footer">${footerHtml}</div>` : ''}
      </div>
    </div>
  `;
}

export function ListItem({
  logoHtml = '',
  label = '',
  sublabel = '',
  active = false,
  statusDot = false,
  metaHtml = '',
  dataAttrs = {},
} = {}) {
  const attrs = attrString(dataAttrs);
  return `
    <button
      type="button"
      class="st-list-item ${active ? 'active' : ''}"
      role="option"
      aria-selected="${active ? 'true' : 'false'}"
      ${attrs}
    >
      ${logoHtml ? `<span class="st-list-logo" aria-hidden="true">${logoHtml}</span>` : ''}
      <span class="st-list-item-copy">
        <span class="st-list-item-name truncate">${escapeHtml(label)}</span>
        ${sublabel ? `<span class="st-list-item-sub truncate">${escapeHtml(sublabel)}</span>` : ''}
      </span>
      ${metaHtml}
      ${statusDot ? '<span class="st-status-dot-on" title="Enabled and configured" aria-label="Enabled and configured"></span>' : ''}
    </button>
  `;
}

export function Switch({ id = '', checked = false, ariaLabel = '', dataAttrs = {} } = {}) {
  const attrs = attrString({
    id: id || undefined,
    'aria-label': ariaLabel || undefined,
    ...dataAttrs,
  });
  return `
    <label class="st-switch">
      <input type="checkbox" class="st-switch-input" ${checked ? 'checked' : ''} ${attrs}>
      <span class="st-switch-track" aria-hidden="true"></span>
    </label>
  `;
}

export function ModelSelect({
  id = '',
  value = '',
  models = [],
  placeholder = 'Select model…',
  ariaLabel = 'Select model',
  dataAttrs = {},
} = {}) {
  const attrs = attrString({
    id: id || undefined,
    'aria-label': ariaLabel,
    ...dataAttrs,
  });
  const hasCurrent = value && models.some((m) => m.id === value);
  const options = [
    `<option value="">${escapeHtml(placeholder)}</option>`,
    ...(!hasCurrent && value
      ? [`<option value="${escapeHtml(value)}" selected>${escapeHtml(value)}</option>`]
      : []),
    ...models.map((m) => {
      const tag = m.providerName ? ` [${m.providerName}]` : '';
      const sel = m.id === value ? 'selected' : '';
      return `<option value="${escapeHtml(m.id)}" data-provider-id="${escapeHtml(m.providerId || '')}" ${sel}>${escapeHtml(m.name)}${escapeHtml(tag)}</option>`;
    }),
  ].join('');
  return `<select class="st-select st-model-select" ${attrs}>${options}</select>`;
}

export function SecretInput({
  id = '',
  value = '',
  placeholder = 'sk-...',
  ariaLabel = 'API key',
  dataAttrs = {},
} = {}) {
  const attrs = attrString({
    id: id || undefined,
    'aria-label': ariaLabel,
    ...dataAttrs,
  });
  return `
    <div class="st-secret-wrap" data-st-secret-wrap>
      <input
        type="password"
        class="st-input st-secret-input"
        value="${escapeHtml(value)}"
        placeholder="${escapeHtml(placeholder)}"
        autocomplete="off"
        spellcheck="false"
        ${attrs}
      >
      <button
        type="button"
        class="st-secret-toggle"
        data-st-secret-toggle
        aria-label="Show API key"
        title="Show API key"
      >
        <i data-lucide="eye"></i>
      </button>
    </div>
  `;
}

export function EmptyState({ icon = 'inbox', kubaiIcon = '', title = 'Nothing here yet', description = '', actionHtml = '' } = {}) {
  const visual = kubaiIcon
    ? renderKubaiIcon(kubaiIcon, { size: 38, className: 'st-empty-kb-icon' })
    : `<i data-lucide="${escapeHtml(icon)}"></i>`;
  return `
    <div class="st-empty-state">
      <div class="st-empty-icon ${kubaiIcon ? 'is-kubai' : ''}" aria-hidden="true">${visual}</div>
      <div class="st-empty-title">${escapeHtml(title)}</div>
      ${description ? `<p class="st-empty-desc">${escapeHtml(description)}</p>` : ''}
      ${actionHtml ? `<div class="st-empty-action">${actionHtml}</div>` : ''}
    </div>
  `;
}
