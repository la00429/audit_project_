#!/usr/bin/env node
/**
 * AuditTest Vision — CLI Tool
 *
 * Herramienta de línea de comandos para auditoría visual y de accesibilidad.
 * Funciona 100% local con Puppeteer, sin necesidad de APIs externas.
 *
 * Uso:
 *   npx audittest-vision https://ejemplo.com
 *   npx audittest-vision ./index.html
 *   npx audittest-vision https://ejemplo.com --json
 *   npx audittest-vision https://ejemplo.com --fix
 */

import puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';

// --- Types ---

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
  wcagCriterion?: string;
  fix?: string;
}

// --- CLI Argument Parsing ---

const args = process.argv.slice(2);
const flags = {
  json: args.includes('--json'),
  fix: args.includes('--fix'),
  help: args.includes('--help') || args.includes('-h'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  screenshot: args.includes('--screenshot'),
};
const targetUrl = args.find(a => !a.startsWith('--') && !a.startsWith('-'));

// --- Help ---

if (flags.help || !targetUrl) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              AuditTest Vision — CLI v1.0.0                  ║
║  Auditoría visual y de accesibilidad automatizada con IA    ║
╚══════════════════════════════════════════════════════════════╝

Uso:
  npx audittest-vision <url|archivo>  [opciones]

Ejemplos:
  npx audittest-vision https://google.com
  npx audittest-vision ./dist/index.html
  npx audittest-vision https://miapp.com --json --screenshot

Opciones:
  --json         Salida en formato JSON (para CI/CD)
  --fix          Mostrar sugerencias de auto-fix para cada issue
  --screenshot   Guardar screenshot de la página auditada
  --verbose, -v  Mostrar detalles de cada verificación
  --help, -h     Mostrar esta ayuda

Reglas evaluadas (WCAG 2.1):
  • 1.1.1  Imágenes sin alt text (Nivel A)
  • 1.3.1  Inputs sin label asociado (Nivel A)
  • 1.3.1  Jerarquía de headings incorrecta (Nivel A)
  • 1.3.1  Ausencia de landmarks semánticos (Nivel A)
  • 1.4.3  Contraste de color insuficiente (Nivel AA)
  • Visual  Detección de overflow de texto
  • Visual  Elementos fuera del viewport
`);
  process.exit(0);
}

// --- Main Execution ---

async function main() {
  const startTime = Date.now();
  
  printBanner();
  
  // Resolve URL
  let url = targetUrl!;
  if (!url.startsWith('http') && !url.startsWith('file://')) {
    const resolved = path.resolve(url);
    if (fs.existsSync(resolved)) {
      url = `file://${resolved}`;
    } else {
      printError(`No se encontró el archivo: ${url}`);
      process.exit(1);
    }
  }

  printStep('Iniciando navegador headless...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    printStep(`Navegando a: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Screenshot
    if (flags.screenshot) {
      const screenshotPath = 'audittest-screenshot.png';
      await page.screenshot({ path: screenshotPath, fullPage: true });
      printStep(`Screenshot guardado: ${screenshotPath}`);
    }

    printStep('Extrayendo metadatos del DOM...');
    const elements = await extractElements(page);
    printStep(`${elements.length} elementos analizados`);

    printStep('Ejecutando auditoría WCAG + Visual...');
    const issues = runAudit(elements);

    const duration = Date.now() - startTime;

    // Output
    if (flags.json) {
      const report = {
        url,
        timestamp: new Date().toISOString(),
        durationMs: duration,
        totalIssues: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        major: issues.filter(i => i.severity === 'major').length,
        minor: issues.filter(i => i.severity === 'minor').length,
        issues,
      };
      console.log(JSON.stringify(report, null, 2));
    } else {
      printResults(issues, url, duration);
    }

    // Exit code based on critical issues
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    await browser.close();
    process.exit(criticalCount > 0 ? 1 : 0);

  } catch (error) {
    if (browser) await browser.close();
    printError(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

// --- DOM Extraction ---

async function extractElements(page: any): Promise<ElementMeta[]> {
  return page.evaluate(() => {
    const elements: any[] = [];
    const tags = ['img', 'input', 'select', 'textarea', 'button', 'a',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div',
      'main', 'nav', 'header', 'footer', 'aside', 'section', 'form', 'label'];

    for (const tag of tags) {
      document.querySelectorAll(tag).forEach((el: Element) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        
        const computed = window.getComputedStyle(el);
        if (computed.display === 'none' || computed.visibility === 'hidden') return;

        let selector = el.tagName.toLowerCase();
        if ((el as HTMLElement).id) selector = `#${(el as HTMLElement).id}`;
        else if (el.className && typeof el.className === 'string') {
          const cls = el.className.trim().split(/\s+/)[0];
          if (cls) selector += `.${cls}`;
        }

        elements.push({
          selector,
          tagName: el.tagName,
          boundingBox: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
          computedStyles: {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight,
            overflow: computed.overflow,
            display: computed.display,
          },
          attributes: {
            alt: el.getAttribute('alt') || '',
            'aria-label': el.getAttribute('aria-label') || '',
            'aria-labelledby': el.getAttribute('aria-labelledby') || '',
            role: el.getAttribute('role') || '',
            id: (el as HTMLElement).id || '',
            type: el.getAttribute('type') || '',
            href: el.getAttribute('href') || '',
          },
          textContent: (el.textContent || '').trim().slice(0, 80),
        });
      });
    }
    return elements.slice(0, 500);
  });
}

// --- Audit Rules Engine ---

function runAudit(elements: ElementMeta[]): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let counter = 0;

  // Rule 1: Images without alt text (WCAG 1.1.1)
  const imgsNoAlt = elements.filter(
    el => el.tagName === 'IMG' && !el.attributes.alt && !el.attributes['aria-label']
  );
  for (const img of imgsNoAlt) {
    issues.push({
      id: `ATV-${++counter}`,
      severity: 'major',
      title: 'Imagen sin texto alternativo',
      description: `La imagen "${img.selector}" no tiene atributo alt ni aria-label. Los lectores de pantalla no pueden describir esta imagen.`,
      selector: img.selector,
      wcagCriterion: '1.1.1',
      fix: flags.fix ? `Agrega: alt="Descripción de la imagen"` : undefined,
    });
  }

  // Rule 2: Form inputs without labels (WCAG 1.3.1)
  const inputTypes = ['INPUT', 'SELECT', 'TEXTAREA'];
  const inputsNoLabel = elements.filter(
    el => inputTypes.includes(el.tagName) &&
      !el.attributes['aria-label'] &&
      !el.attributes['aria-labelledby'] &&
      !el.attributes.id
  );
  for (const input of inputsNoLabel) {
    issues.push({
      id: `ATV-${++counter}`,
      severity: 'major',
      title: 'Campo de formulario sin label',
      description: `El elemento <${input.tagName.toLowerCase()}> "${input.selector}" no tiene label asociado, aria-label, ni aria-labelledby.`,
      selector: input.selector,
      wcagCriterion: '1.3.1',
      fix: flags.fix ? `Agrega: aria-label="Descripción del campo"` : undefined,
    });
  }

  // Rule 3: Color contrast (WCAG 1.4.3)
  for (const el of elements) {
    if (!el.textContent) continue;
    if (!el.computedStyles.color || !el.computedStyles.backgroundColor) continue;

    const fg = parseRgb(el.computedStyles.color);
    const bg = parseRgb(el.computedStyles.backgroundColor);
    if (!fg || !bg) continue;

    // Skip transparent backgrounds
    if (el.computedStyles.backgroundColor === 'rgba(0, 0, 0, 0)') continue;

    const ratio = contrastRatio(fg, bg);
    const fontSize = parseFloat(el.computedStyles.fontSize || '16');
    const fontWeight = parseInt(el.computedStyles.fontWeight || '400');
    const isLarge = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
    const threshold = isLarge ? 3.0 : 4.5;

    if (ratio < threshold) {
      issues.push({
        id: `ATV-${++counter}`,
        severity: ratio < 2.5 ? 'critical' : 'major',
        title: 'Contraste de color insuficiente',
        description: `"${el.selector}" tiene ratio de contraste ${ratio.toFixed(2)}:1 (mínimo requerido: ${threshold}:1). Color: ${el.computedStyles.color}, Fondo: ${el.computedStyles.backgroundColor}`,
        selector: el.selector,
        wcagCriterion: '1.4.3',
        fix: flags.fix ? `Cambia el color del texto a uno más oscuro o el fondo a uno más claro. Sugerencia: color: #000000;` : undefined,
      });
    }
  }

  // Rule 4: Heading hierarchy (WCAG 1.3.1)
  const headings = elements
    .filter(el => /^H[1-6]$/.test(el.tagName))
    .sort((a, b) => a.boundingBox.y - b.boundingBox.y);

  for (let i = 1; i < headings.length; i++) {
    const prev = parseInt(headings[i - 1].tagName[1]);
    const curr = parseInt(headings[i].tagName[1]);
    if (curr > prev + 1) {
      issues.push({
        id: `ATV-${++counter}`,
        severity: 'minor',
        title: 'Nivel de heading saltado',
        description: `"${headings[i].selector}" es <${headings[i].tagName.toLowerCase()}> pero sigue a <${headings[i - 1].tagName.toLowerCase()}>. Los niveles no deberían saltarse.`,
        selector: headings[i].selector,
        wcagCriterion: '1.3.1',
        fix: flags.fix ? `Cambia a <h${prev + 1}> o agrega los niveles intermedios.` : undefined,
      });
    }
  }

  // Rule 5: Missing landmarks (WCAG 1.3.1)
  const landmarks = ['MAIN', 'NAV', 'HEADER', 'FOOTER', 'ASIDE'];
  const hasLandmark = elements.some(
    el => landmarks.includes(el.tagName) || !!el.attributes.role
  );
  if (!hasLandmark && elements.length > 10) {
    issues.push({
      id: `ATV-${++counter}`,
      severity: 'minor',
      title: 'Sin regiones landmark',
      description: 'La página no tiene elementos semánticos (<main>, <nav>, <header>, etc.) ni atributos role. Los landmarks ayudan a usuarios con lectores de pantalla a navegar la página.',
      wcagCriterion: '1.3.1',
      fix: flags.fix ? 'Envuelve el contenido principal en <main>, la navegación en <nav>, etc.' : undefined,
    });
  }

  // Rule 6: Elements overflowing viewport (Visual)
  const viewportWidth = 1280;
  const overflowing = elements.filter(
    el => el.boundingBox.x + el.boundingBox.width > viewportWidth + 10 && el.boundingBox.width > 0
  );
  for (const el of overflowing.slice(0, 3)) {
    issues.push({
      id: `ATV-${++counter}`,
      severity: 'major',
      title: 'Elemento fuera del viewport',
      description: `"${el.selector}" se extiende ${Math.round(el.boundingBox.x + el.boundingBox.width - viewportWidth)}px más allá del ancho del viewport (1280px).`,
      selector: el.selector,
      fix: flags.fix ? `Agrega: overflow: hidden; o max-width: 100%;` : undefined,
    });
  }

  // Rule 7: Buttons/links without accessible text
  const emptyButtons = elements.filter(
    el => (el.tagName === 'BUTTON' || el.tagName === 'A') &&
      !el.textContent &&
      !el.attributes['aria-label'] &&
      !el.attributes.alt
  );
  for (const btn of emptyButtons) {
    issues.push({
      id: `ATV-${++counter}`,
      severity: 'major',
      title: 'Botón/enlace sin texto accesible',
      description: `El elemento <${btn.tagName.toLowerCase()}> "${btn.selector}" no tiene texto visible ni aria-label. Los usuarios con lectores de pantalla no sabrán su propósito.`,
      selector: btn.selector,
      wcagCriterion: '1.1.1',
      fix: flags.fix ? `Agrega aria-label="Descripción de la acción"` : undefined,
    });
  }

  return issues;
}

// --- Color Utilities ---

function parseRgb(color: string): [number, number, number] | null {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  return null;
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// --- Pretty Output ---

function printBanner() {
  if (flags.json) return;
  console.log('');
  console.log('\x1b[35m╔══════════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[35m║\x1b[0m     \x1b[1m\x1b[36mAuditTest Vision\x1b[0m — Auditoría Automática v1.0.0     \x1b[35m║\x1b[0m');
  console.log('\x1b[35m╚══════════════════════════════════════════════════════════╝\x1b[0m');
  console.log('');
}

function printStep(msg: string) {
  if (flags.json) return;
  console.log(`  \x1b[36m►\x1b[0m ${msg}`);
}

function printError(msg: string) {
  console.error(`  \x1b[31m✖\x1b[0m ${msg}`);
}

function printResults(issues: AuditIssue[], url: string, durationMs: number) {
  const critical = issues.filter(i => i.severity === 'critical').length;
  const major = issues.filter(i => i.severity === 'major').length;
  const minor = issues.filter(i => i.severity === 'minor').length;

  console.log('');
  console.log('\x1b[35m──────────────────────────────────────────────────────────\x1b[0m');
  console.log(`  \x1b[1mResultados de Auditoría\x1b[0m`);
  console.log(`  URL: ${url}`);
  console.log(`  Duración: ${durationMs}ms`);
  console.log('\x1b[35m──────────────────────────────────────────────────────────\x1b[0m');
  console.log('');

  // Summary
  console.log(`  \x1b[1mResumen:\x1b[0m ${issues.length} problemas encontrados`);
  if (critical > 0) console.log(`    \x1b[31m● ${critical} crítico(s)\x1b[0m`);
  if (major > 0) console.log(`    \x1b[33m● ${major} mayor(es)\x1b[0m`);
  if (minor > 0) console.log(`    \x1b[34m● ${minor} menor(es)\x1b[0m`);
  console.log('');

  // Issue details
  if (issues.length === 0) {
    console.log('  \x1b[32m✓ ¡Sin problemas detectados! La página cumple con las reglas evaluadas.\x1b[0m');
  } else {
    for (const issue of issues) {
      const severityColors: Record<string, string> = {
        critical: '\x1b[31m',
        major: '\x1b[33m',
        minor: '\x1b[34m',
        info: '\x1b[90m',
      };
      const color = severityColors[issue.severity] || '\x1b[0m';
      const badge = `${color}[${issue.severity.toUpperCase()}]\x1b[0m`;

      console.log(`  ${badge} ${issue.title}`);
      console.log(`    ${issue.description}`);
      if (issue.selector) console.log(`    \x1b[90mSelector: ${issue.selector}\x1b[0m`);
      if (issue.wcagCriterion) console.log(`    \x1b[90mWCAG: ${issue.wcagCriterion}\x1b[0m`);
      if (issue.fix) console.log(`    \x1b[32m💡 Fix: ${issue.fix}\x1b[0m`);
      console.log('');
    }
  }

  // Exit status
  console.log('\x1b[35m──────────────────────────────────────────────────────────\x1b[0m');
  if (critical > 0) {
    console.log(`  \x1b[31m✖ FALLO: ${critical} issue(s) crítico(s) detectado(s)\x1b[0m`);
    console.log(`  \x1b[90mExit code: 1 (útil para CI/CD pipelines)\x1b[0m`);
  } else {
    console.log(`  \x1b[32m✓ PASÓ: Sin issues críticos\x1b[0m`);
    console.log(`  \x1b[90mExit code: 0\x1b[0m`);
  }
  console.log('');
}

// --- Run ---
main();
