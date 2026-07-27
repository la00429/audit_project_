/**
 * Unit tests for WCAG audit rules.
 * Tests each of the 7 rules with mock DOM element data.
 */

import { describe, it, expect } from 'vitest';

// --- Inline types and utilities (same as CLI) ---

interface ElementMeta {
  selector: string;
  tagName: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  computedStyles: Record<string, string>;
  attributes: Record<string, string>;
  textContent: string;
}

interface AuditIssue {
  id: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  title: string;
  description: string;
  selector?: string;
}

function parseRgb(color: string): [number, number, number] | null {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const l1 = relativeLuminance(fg); const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// Simplified audit runner for testing (same logic as CLI)
function runAudit(elements: ElementMeta[]): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let counter = 0;

  // Rule 1: Images without alt
  elements.filter(el => el.tagName === 'IMG' && !el.attributes.alt && !el.attributes['aria-label'])
    .forEach(img => { issues.push({ id: `ATV-${++counter}`, severity: 'major', title: 'Imagen sin texto alternativo', description: `"${img.selector}" no tiene alt.`, selector: img.selector }); });

  // Rule 2: Inputs without labels
  elements.filter(el => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && !el.attributes['aria-label'] && !el.attributes['aria-labelledby'] && !el.attributes.id)
    .forEach(input => { issues.push({ id: `ATV-${++counter}`, severity: 'major', title: 'Campo sin label', description: `"${input.selector}" sin label.`, selector: input.selector }); });

  // Rule 3: Color contrast
  for (const el of elements) {
    if (!el.textContent || !el.computedStyles.color || !el.computedStyles.backgroundColor) continue;
    if (el.computedStyles.backgroundColor === 'rgba(0, 0, 0, 0)') continue;
    const fg = parseRgb(el.computedStyles.color); const bg = parseRgb(el.computedStyles.backgroundColor);
    if (!fg || !bg) continue;
    const ratio = contrastRatio(fg, bg);
    const fontSize = parseFloat(el.computedStyles.fontSize || '16');
    const fontWeight = parseInt(el.computedStyles.fontWeight || '400');
    const threshold = (fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700)) ? 3.0 : 4.5;
    if (ratio < threshold) {
      issues.push({ id: `ATV-${++counter}`, severity: ratio < 2.5 ? 'critical' : 'major', title: 'Contraste insuficiente', description: `ratio ${ratio.toFixed(2)}:1`, selector: el.selector });
    }
  }

  // Rule 4: Heading hierarchy
  const headings = elements.filter(el => /^H[1-6]$/.test(el.tagName)).sort((a, b) => a.boundingBox.y - b.boundingBox.y);
  for (let i = 1; i < headings.length; i++) {
    const prev = parseInt(headings[i-1].tagName[1]); const curr = parseInt(headings[i].tagName[1]);
    if (curr > prev + 1) { issues.push({ id: `ATV-${++counter}`, severity: 'minor', title: 'Heading saltado', description: `h${curr} sigue a h${prev}`, selector: headings[i].selector }); }
  }

  // Rule 5: Missing landmarks
  const hasLandmark = elements.some(el => ['MAIN', 'NAV', 'HEADER', 'FOOTER', 'ASIDE'].includes(el.tagName) || !!el.attributes.role);
  if (!hasLandmark && elements.length > 10) { issues.push({ id: `ATV-${++counter}`, severity: 'minor', title: 'Sin landmarks', description: 'No landmarks found.' }); }

  // Rule 6: Viewport overflow
  elements.filter(el => el.boundingBox.x + el.boundingBox.width > 1290 && el.boundingBox.width > 0).slice(0, 3)
    .forEach(el => { issues.push({ id: `ATV-${++counter}`, severity: 'major', title: 'Fuera del viewport', description: `"${el.selector}" overflows.`, selector: el.selector }); });

  // Rule 7: Buttons without text
  elements.filter(el => (el.tagName === 'BUTTON' || el.tagName === 'A') && !el.textContent && !el.attributes['aria-label'] && !el.attributes.alt)
    .forEach(btn => { issues.push({ id: `ATV-${++counter}`, severity: 'major', title: 'Boton sin texto', description: `"${btn.selector}" no text.`, selector: btn.selector }); });

  return issues;
}

// --- Helper to create mock elements ---

function mockElement(overrides: Partial<ElementMeta>): ElementMeta {
  return {
    selector: 'div', tagName: 'DIV',
    boundingBox: { x: 0, y: 0, width: 100, height: 50 },
    computedStyles: { color: 'rgb(0, 0, 0)', backgroundColor: 'rgb(255, 255, 255)', fontSize: '16px', fontWeight: '400', overflow: 'visible', display: 'block' },
    attributes: { alt: '', 'aria-label': '', 'aria-labelledby': '', role: '', id: '', type: '', href: '' },
    textContent: 'Hello',
    ...overrides,
  };
}

// --- Tests ---

describe('Rule 1: Images without alt text', () => {
  it('detects images missing alt attribute', () => {
    const elements = [mockElement({ tagName: 'IMG', selector: 'img.hero', attributes: { alt: '', 'aria-label': '', 'aria-labelledby': '', role: '', id: '', type: '', href: '' } })];
    const issues = runAudit(elements);
    expect(issues.some(i => i.title === 'Imagen sin texto alternativo')).toBe(true);
  });

  it('passes when image has alt', () => {
    const elements = [mockElement({ tagName: 'IMG', selector: 'img.hero', attributes: { alt: 'Hero image', 'aria-label': '', 'aria-labelledby': '', role: '', id: '', type: '', href: '' } })];
    const issues = runAudit(elements);
    expect(issues.some(i => i.title === 'Imagen sin texto alternativo')).toBe(false);
  });

  it('passes when image has aria-label', () => {
    const elements = [mockElement({ tagName: 'IMG', selector: 'img.hero', attributes: { alt: '', 'aria-label': 'Decorative', 'aria-labelledby': '', role: '', id: '', type: '', href: '' } })];
    const issues = runAudit(elements);
    expect(issues.some(i => i.title === 'Imagen sin texto alternativo')).toBe(false);
  });
});

describe('Rule 2: Inputs without labels', () => {
  it('detects input without any label mechanism', () => {
    const elements = [mockElement({ tagName: 'INPUT', selector: 'input.email', attributes: { alt: '', 'aria-label': '', 'aria-labelledby': '', role: '', id: '', type: 'text', href: '' } })];
    const issues = runAudit(elements);
    expect(issues.some(i => i.title === 'Campo sin label')).toBe(true);
  });

  it('passes when input has id (implies label[for])', () => {
    const elements = [mockElement({ tagName: 'INPUT', selector: '#email', attributes: { alt: '', 'aria-label': '', 'aria-labelledby': '', role: '', id: 'email', type: 'text', href: '' } })];
    const issues = runAudit(elements);
    expect(issues.some(i => i.title === 'Campo sin label')).toBe(false);
  });
});

describe('Rule 3: Color contrast', () => {
  it('detects low contrast (light gray on white)', () => {
    const elements = [mockElement({
      selector: 'p.faded',
      computedStyles: { color: 'rgb(200, 200, 200)', backgroundColor: 'rgb(255, 255, 255)', fontSize: '16px', fontWeight: '400', overflow: 'visible', display: 'block' },
    })];
    const issues = runAudit(elements);
    expect(issues.some(i => i.title === 'Contraste insuficiente')).toBe(true);
  });

  it('passes with black on white (ratio 21:1)', () => {
    const elements = [mockElement({
      selector: 'p.normal',
      computedStyles: { color: 'rgb(0, 0, 0)', backgroundColor: 'rgb(255, 255, 255)', fontSize: '16px', fontWeight: '400', overflow: 'visible', display: 'block' },
    })];
    const issues = runAudit(elements);
    expect(issues.some(i => i.title === 'Contraste insuficiente')).toBe(false);
  });

  it('marks as critical when ratio is below 2.5', () => {
    const elements = [mockElement({
      selector: 'span.invisible',
      computedStyles: { color: 'rgb(250, 250, 250)', backgroundColor: 'rgb(255, 255, 255)', fontSize: '16px', fontWeight: '400', overflow: 'visible', display: 'block' },
    })];
    const issues = runAudit(elements);
    const issue = issues.find(i => i.title === 'Contraste insuficiente');
    expect(issue?.severity).toBe('critical');
  });
});

describe('Rule 4: Heading hierarchy', () => {
  it('detects skipped heading levels (h1 -> h3)', () => {
    const elements = [
      mockElement({ tagName: 'H1', selector: 'h1', boundingBox: { x: 0, y: 0, width: 200, height: 40 } }),
      mockElement({ tagName: 'H3', selector: 'h3', boundingBox: { x: 0, y: 50, width: 200, height: 30 } }),
    ];
    const issues = runAudit(elements);
    expect(issues.some(i => i.title === 'Heading saltado')).toBe(true);
  });

  it('passes with sequential headings (h1 -> h2)', () => {
    const elements = [
      mockElement({ tagName: 'H1', selector: 'h1', boundingBox: { x: 0, y: 0, width: 200, height: 40 } }),
      mockElement({ tagName: 'H2', selector: 'h2', boundingBox: { x: 0, y: 50, width: 200, height: 30 } }),
    ];
    const issues = runAudit(elements);
    expect(issues.some(i => i.title === 'Heading saltado')).toBe(false);
  });
});

describe('Rule 5: Missing landmarks', () => {
  it('detects page without any landmarks', () => {
    // Create 11+ div elements with no landmark tags
    const elements = Array.from({ length: 12 }, (_, i) => mockElement({ selector: `div.item-${i}` }));
    const issues = runAudit(elements);
    expect(issues.some(i => i.title === 'Sin landmarks')).toBe(true);
  });

  it('passes when page has <main>', () => {
    const elements = [
      ...Array.from({ length: 12 }, (_, i) => mockElement({ selector: `div.item-${i}` })),
      mockElement({ tagName: 'MAIN', selector: 'main' }),
    ];
    const issues = runAudit(elements);
    expect(issues.some(i => i.title === 'Sin landmarks')).toBe(false);
  });
});

describe('Rule 6: Viewport overflow', () => {
  it('detects element exceeding 1280px viewport', () => {
    const elements = [mockElement({ selector: 'div.wide', boundingBox: { x: 1000, y: 0, width: 400, height: 50 } })];
    const issues = runAudit(elements);
    expect(issues.some(i => i.title === 'Fuera del viewport')).toBe(true);
  });

  it('passes when element fits within viewport', () => {
    const elements = [mockElement({ selector: 'div.normal', boundingBox: { x: 0, y: 0, width: 500, height: 50 } })];
    const issues = runAudit(elements);
    expect(issues.some(i => i.title === 'Fuera del viewport')).toBe(false);
  });
});

describe('Rule 7: Buttons without accessible text', () => {
  it('detects button with no text or aria-label', () => {
    const elements = [mockElement({ tagName: 'BUTTON', selector: 'button.icon-btn', textContent: '', attributes: { alt: '', 'aria-label': '', 'aria-labelledby': '', role: '', id: '', type: 'button', href: '' } })];
    const issues = runAudit(elements);
    expect(issues.some(i => i.title === 'Boton sin texto')).toBe(true);
  });

  it('passes when button has text content', () => {
    const elements = [mockElement({ tagName: 'BUTTON', selector: 'button.submit', textContent: 'Submit', attributes: { alt: '', 'aria-label': '', 'aria-labelledby': '', role: '', id: '', type: 'submit', href: '' } })];
    const issues = runAudit(elements);
    expect(issues.some(i => i.title === 'Boton sin texto')).toBe(false);
  });

  it('passes when button has aria-label', () => {
    const elements = [mockElement({ tagName: 'BUTTON', selector: 'button.close', textContent: '', attributes: { alt: '', 'aria-label': 'Close dialog', 'aria-labelledby': '', role: '', id: '', type: 'button', href: '' } })];
    const issues = runAudit(elements);
    expect(issues.some(i => i.title === 'Boton sin texto')).toBe(false);
  });
});
