import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..', '..', '..');
const read = (p) => readFileSync(path.join(repoRoot, p), 'utf8');

const tokens = read('src/ui/tokens.css');
const indexCss = read('src/index.css');
const storeSource = read('src/store/index.js');
const mainSource = read('src/main.jsx');
const navbarSource = read('src/components/common/Navbar.jsx');

/** Every custom property the application references. */
const APP_VARIABLES = [
  '--bg-primary', '--bg-secondary', '--bg-card', '--bg-elevated', '--bg-hover',
  '--border', '--border-glow', '--border-hover',
  '--text-primary', '--text-secondary', '--text-muted', '--text-accent',
  '--brand', '--brand-dim', '--brand-glow', '--brand-glow2',
  '--signal-buy', '--signal-buy-bg', '--signal-sell', '--signal-sell-bg',
  '--signal-neutral', '--signal-neutral-bg',
  '--gold', '--silver', '--bronze',
  '--shadow-card', '--shadow-glow', '--shadow-buy', '--shadow-sell',
  '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-full',
  '--font-heading', '--font-body', '--font-mono', '--font-display',
  '--topnav-h', '--sidebar-w',
];

/** Extract the body of a theme block. */
const themeBlock = (source, selector) => {
  const start = source.indexOf(selector);
  if (start === -1) return '';
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return '';
};

describe('the design system defines both premium themes', () => {
  it('declares an OLED dark theme and a premium light theme', () => {
    expect(tokens).toContain('[data-theme="mono-dark"]');
    expect(tokens).toContain('[data-theme="mono-light"]');
  });

  it('the OLED dark theme redefines every application variable', () => {
    const block = themeBlock(tokens, '[data-theme="mono-dark"]');
    expect(block).not.toBe('');
    for (const variable of APP_VARIABLES) {
      expect(block, `mono-dark must define ${variable}`).toContain(`${variable}:`);
    }
  });

  it('the premium light theme redefines every application variable', () => {
    const block = themeBlock(tokens, '[data-theme="mono-light"]');
    expect(block).not.toBe('');
    for (const variable of APP_VARIABLES) {
      expect(block, `mono-light must define ${variable}`).toContain(`${variable}:`);
    }
  });
});

describe('the legacy themes are untouched', () => {
  it('every legacy theme still exists in index.css', () => {
    for (const theme of ['tl-dark', 'tl-black-red', 'tl-navy', 'tl-matrix', 'tl-amber', 'tl-light']) {
      expect(indexCss).toContain(`[data-theme="${theme}"]`);
    }
  });

  it('the design system file does not redefine a legacy theme', () => {
    for (const theme of ['tl-dark', 'tl-black-red', 'tl-navy', 'tl-matrix', 'tl-amber', 'tl-light']) {
      expect(tokens).not.toContain(`[data-theme="${theme}"]`);
    }
  });

  it('the original root token block is left intact', () => {
    expect(indexCss).toMatch(/--bg-primary:\s+#131722;/);
    expect(indexCss).toMatch(/--brand:\s+#2962ff;/);
    expect(indexCss).toMatch(/--signal-buy:\s*#089981;/);
  });
});

describe('the theme is integrated without breaking the existing preference', () => {
  it('the design system is imported after the base stylesheet', () => {
    const baseIndex = mainSource.indexOf("'./index.css'");
    const tokensIndex = mainSource.indexOf("'./ui/tokens.css'");
    expect(baseIndex).toBeGreaterThan(-1);
    expect(tokensIndex).toBeGreaterThan(-1);
    expect(tokensIndex).toBeGreaterThan(baseIndex);
  });

  it('the stored preference key is unchanged', () => {
    expect(storeSource).toContain("localStorage.getItem('tl_theme')");
    expect(storeSource).toContain("localStorage.setItem('tl_theme', theme)");
  });

  it('the new themes are registered and the legacy ones are kept', () => {
    expect(storeSource).toContain("'mono-dark'");
    expect(storeSource).toContain("'mono-light'");
    for (const theme of ['tl-dark', 'tl-black-red', 'tl-navy', 'tl-matrix', 'tl-amber', 'tl-light']) {
      expect(storeSource).toContain(`'${theme}'`);
    }
  });

  it('an unknown stored theme falls back to a theme that has tokens', () => {
    expect(storeSource).toContain('THEMES.includes(saved)');
    expect(storeSource).toContain('DEFAULT_THEME');
  });

  it('the Navbar switcher offers the new themes', () => {
    expect(navbarSource).toContain("key: 'mono-dark'");
    expect(navbarSource).toContain("key: 'mono-light'");
  });
});

describe('the primitives are present and opt-in', () => {
  const PRIMITIVES = [
    '.bw-display', '.bw-title', '.bw-section', '.bw-label', '.bw-body', '.bw-num',
    '.bw-card', '.bw-panel', '.bw-btn', '.bw-input', '.bw-select',
    '.bw-tabs', '.bw-tab', '.bw-table', '.bw-badge', '.bw-stat', '.bw-workspace',
  ];

  it('defines every reusable primitive', () => {
    for (const primitive of PRIMITIVES) {
      expect(tokens, `missing primitive ${primitive}`).toContain(primitive);
    }
  });

  it('every primitive is namespaced so it cannot collide with the existing CSS', () => {
    const bwClasses = [...tokens.matchAll(/\.(bw-[a-z0-9-]+)/g)].map((m) => m[1]);
    expect(bwClasses.length).toBeGreaterThan(10);
    // No class that is NOT bw-prefixed is introduced by the design system.
    const unscoped = [
      ...tokens.matchAll(/^\s*\.((?!bw-)[a-z][a-z0-9-]*)\s*[,{]/gm),
    ].map((m) => m[1]);
    expect(unscoped).toEqual([]);
  });

  it('provides a flat variant for surfaces above a live canvas', () => {
    expect(tokens).toContain('.bw-panel--flat');
    expect(tokens).toMatch(/\.bw-panel--flat\s*\{[^}]*backdrop-filter:\s*none/);
  });

  it('uses a tabular mono treatment for financial numbers', () => {
    expect(tokens).toMatch(/\.bw-num\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
    expect(tokens).toMatch(/\.bw-num\s*\{[^}]*var\(--font-mono\)/);
  });

  it('keeps green and red reserved for market states', () => {
    expect(tokens).toContain('.bw-num--up');
    expect(tokens).toContain('.bw-num--down');
    expect(tokens).toContain('.bw-badge--up');
    expect(tokens).toContain('.bw-badge--down');
  });

  it('provides accessible focus states', () => {
    expect(tokens).toMatch(/\.bw-btn:focus-visible/);
    expect(tokens).toMatch(/\.bw-tab:focus-visible/);
    expect(tokens).toMatch(/\.bw-input:focus-visible/);
    expect(tokens).toContain('prefers-reduced-motion');
  });

  it('declares responsive workspace foundations with a minimum chart width', () => {
    expect(tokens).toContain('.bw-workspace');
    expect(tokens).toContain('--bw-right-w');
    expect(tokens).toContain('@media (max-width: 1279px)');
  });
});
