/**
 * AuditTest Vision — Background Service Worker (Offline-First)
 *
 * Runs the full WCAG audit LOCALLY without any external API calls.
 * All 7 rules execute inside the service worker using DOM metadata
 * extracted by the content script.
 */

// --- Types ---

interface DOMElementMeta {
  selector: string;
  tagName: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  computedStyles?: Record<string, string>;
  attributes?: Record<string, string>;
  textContent?: string;
}

interface AuditIssue {
  id: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  title: string;
  description: string;
  selector?: string;
  wcagCriterion?: string;
  fix?: string;
}

interface AuditReport {
  timestamp: string;
  pageUrl: string;
  score: number;
  scoreLabel: string;
  totalIssues: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  issues: AuditIssue[];
  durationMs: number;
}

// --- Message Handler ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_AUDIT' || message.type === 'START_AUDIT_FROM_PAGE') {
    handleAuditRequest(sendResponse);
    return true;
  }
  return false;
});

async function handleAuditRequest(
  sendResponse: (response: { type: string; payload: unknown }) => void
): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      sendResponse({ type: 'AUDIT_ERROR', payload: 'No active tab found' });
      return;
    }

    // Request DOM metadata from content script
    const domResponse = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_DOM' });
    const elements: DOMElementMeta[] = domResponse?.elements || [];

    // Run audit locally — no API calls needed
    const report = runLocalAudit(elements, tab.url || '');

    // Send results to popup
    sendResponse({ type: 'AUDIT_COMPLETE', payload: report });

    // Render badges on page
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_RESULTS',
        issues: report.issues.map(i => ({
          selector: i.selector,
          severity: i.severity,
          title: i.title,
        })),
      });
    }

    // Store for later
    await chrome.storage.local.set({ lastReport: report, lastAuditTime: Date.now() });
  } catch (error) {
    sendResponse({ type: 'AUDIT_ERROR', payload: (error as Error).message });
  }
}

// --- Local Audit Engine (all 7 WCAG rules) ---

function runLocalAudit(elements: DOMElementMeta[], pageUrl: string): AuditReport {
  const startTime = Date.now();
  const issues: AuditIssue[] = [];
  let counter = 0;

  // Rule 1: Images without alt (WCAG 1.1.1)
  elements
    .filter(el => el.tagName === 'IMG' && !el.attributes?.['alt'] && !el.attributes?.['aria-label'])
    .forEach(el => {
      issues.push({ id: `ATV-${++counter}`, severity: 'major', title: 'Imagen sin alt text', description: `"${el.selector}" no tiene alt ni aria-label.`, selector: el.selector, wcagCriterion: '1.1.1', fix: 'Agrega: alt="Descripción"' });
    });

  // Rule 2: Inputs without labels (WCAG 1.3.1)
  elements
    .filter(el => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && !el.attributes?.['aria-label'] && !el.attributes?.['aria-labelledby'] && !el.attributes?.['id'])
    .forEach(el => {
      issues.push({ id: `ATV-${++counter}`, severity: 'major', title: 'Campo sin label', description: `<${el.tagName.toLowerCase()}> "${el.selector}" sin label.`, selector: el.selector, wcagCriterion: '1.3.1', fix: 'Agrega: aria-label="Descripción"' });
    });

  // Rule 3: Color contrast (WCAG 1.4.3)
  for (const el of elements) {
    if (!el.textContent?.trim() || !el.computedStyles?.['color'] || !el.computedStyles?.['backgroundColor']) continue;
    if (el.computedStyles['backgroundColor'] === 'rgba(0, 0, 0, 0)') continue;
    const fg = parseRgb(el.computedStyles['color']);
    const bg = parseRgb(el.computedStyles['backgroundColor']);
    if (!fg || !bg) continue;
    const ratio = contrastRatio(fg, bg);
    const fontSize = parseFloat(el.computedStyles['fontSize'] || '16');
    const fontWeight = parseInt(el.computedStyles['fontWeight'] || '400');
    const threshold = (fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700)) ? 3.0 : 4.5;
    if (ratio < threshold) {
      issues.push({ id: `ATV-${++counter}`, severity: ratio < 2.5 ? 'critical' : 'major', title: 'Contraste insuficiente', description: `"${el.selector}" ratio ${ratio.toFixed(2)}:1 (mín: ${threshold}:1)`, selector: el.selector, wcagCriterion: '1.4.3', fix: 'Usa un color más oscuro o fondo más claro.' });
    }
  }

  // Rule 4: Heading hierarchy (WCAG 1.3.1)
  const headings = elements.filter(el => /^H[1-6]$/.test(el.tagName)).sort((a, b) => a.boundingBox.y - b.boundingBox.y);
  for (let i = 1; i < headings.length; i++) {
    const prev = parseInt(headings[i - 1].tagName[1]);
    const curr = parseInt(headings[i].tagName[1]);
    if (curr > prev + 1) {
      issues.push({ id: `ATV-${++counter}`, severity: 'minor', title: 'Heading saltado', description: `<h${curr}> sigue a <h${prev}>.`, selector: headings[i].selector, wcagCriterion: '1.3.1', fix: `Cambia a <h${prev + 1}>.` });
    }
  }

  // Rule 5: Missing landmarks (WCAG 1.3.1)
  const hasLandmark = elements.some(el => ['MAIN', 'NAV', 'HEADER', 'FOOTER', 'ASIDE'].includes(el.tagName) || !!el.attributes?.['role']);
  if (!hasLandmark && elements.length > 10) {
    issues.push({ id: `ATV-${++counter}`, severity: 'minor', title: 'Sin landmarks', description: 'No hay <main>, <nav>, <header> ni roles ARIA.', wcagCriterion: '1.3.1', fix: 'Usa <main>, <nav>, <header>, <footer>.' });
  }

  // Rule 6: Viewport overflow
  elements
    .filter(el => el.boundingBox.x + el.boundingBox.width > 1290 && el.boundingBox.width > 0)
    .slice(0, 3)
    .forEach(el => {
      issues.push({ id: `ATV-${++counter}`, severity: 'major', title: 'Fuera del viewport', description: `"${el.selector}" excede el viewport.`, selector: el.selector, fix: 'Agrega: max-width: 100%;' });
    });

  // Rule 7: Buttons/links without text (WCAG 1.1.1)
  elements
    .filter(el => (el.tagName === 'BUTTON' || el.tagName === 'A') && !el.textContent?.trim() && !el.attributes?.['aria-label'] && !el.attributes?.['alt'])
    .forEach(el => {
      issues.push({ id: `ATV-${++counter}`, severity: 'major', title: 'Botón sin texto', description: `<${el.tagName.toLowerCase()}> "${el.selector}" sin texto accesible.`, selector: el.selector, wcagCriterion: '1.1.1', fix: 'Agrega aria-label="Acción"' });
    });

  // Score
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const majorCount = issues.filter(i => i.severity === 'major').length;
  const minorCount = issues.filter(i => i.severity === 'minor').length;
  const score = Math.max(0, 100 - (criticalCount * 25 + majorCount * 10 + minorCount * 3));
  const scoreLabel = score >= 90 ? 'Excelente' : score >= 70 ? 'Bueno' : score >= 50 ? 'Necesita trabajo' : 'Pobre';

  return {
    timestamp: new Date().toISOString(),
    pageUrl,
    score,
    scoreLabel,
    totalIssues: issues.length,
    criticalCount,
    majorCount,
    minorCount,
    issues,
    durationMs: Date.now() - startTime,
  };
}

// --- Color Utilities ---

function parseRgb(color: string): [number, number, number] | null {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
