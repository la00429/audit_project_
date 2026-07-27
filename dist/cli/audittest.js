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
// --- CLI Argument Parsing ---
const args = process.argv.slice(2);
const flags = {
    json: args.includes('--json'),
    fix: args.includes('--fix'),
    help: args.includes('--help') || args.includes('-h'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    screenshot: args.includes('--screenshot'),
    report: args.includes('--report'),
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
  --report       Genera reporte HTML interactivo con screenshot anotado
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
    let url = targetUrl;
    if (!url.startsWith('http') && !url.startsWith('file://')) {
        const resolved = path.resolve(url);
        if (fs.existsSync(resolved)) {
            url = `file://${resolved}`;
        }
        else {
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
        let screenshotBase64 = '';
        if (flags.screenshot || flags.report) {
            const screenshotPath = 'audittest-screenshot.png';
            const screenshotBuffer = await page.screenshot({ fullPage: false, encoding: 'binary' });
            fs.writeFileSync(screenshotPath, screenshotBuffer);
            screenshotBase64 = screenshotBuffer.toString('base64');
            if (flags.screenshot)
                printStep(`Screenshot guardado: ${screenshotPath}`);
        }
        printStep('Extrayendo metadatos del DOM...');
        const elements = await extractElements(page);
        printStep(`${elements.length} elementos analizados`);
        printStep('Ejecutando auditoría WCAG + Visual...');
        const issues = runAudit(elements);
        const duration = Date.now() - startTime;
        // Generate HTML report
        if (flags.report) {
            const reportPath = 'audittest-report.html';
            const htmlReport = generateHTMLReport(issues, url, duration, screenshotBase64, elements);
            fs.writeFileSync(reportPath, htmlReport);
            printStep(`Reporte HTML generado: ${reportPath}`);
            printStep('Abre el archivo en tu navegador para ver el reporte interactivo');
        }
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
        }
        else {
            printResults(issues, url, duration);
        }
        // Exit code based on critical issues
        const criticalCount = issues.filter(i => i.severity === 'critical').length;
        await browser.close();
        process.exit(criticalCount > 0 ? 1 : 0);
    }
    catch (error) {
        if (browser)
            await browser.close();
        printError(`Error: ${error.message}`);
        process.exit(1);
    }
}
// --- DOM Extraction ---
async function extractElements(page) {
    return page.evaluate(() => {
        const elements = [];
        const tags = ['img', 'input', 'select', 'textarea', 'button', 'a',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div',
            'main', 'nav', 'header', 'footer', 'aside', 'section', 'form', 'label'];
        for (const tag of tags) {
            document.querySelectorAll(tag).forEach((el) => {
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 && rect.height === 0)
                    return;
                const computed = window.getComputedStyle(el);
                if (computed.display === 'none' || computed.visibility === 'hidden')
                    return;
                let selector = el.tagName.toLowerCase();
                if (el.id)
                    selector = `#${el.id}`;
                else if (el.className && typeof el.className === 'string') {
                    const cls = el.className.trim().split(/\s+/)[0];
                    if (cls)
                        selector += `.${cls}`;
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
                        id: el.id || '',
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
function runAudit(elements) {
    const issues = [];
    let counter = 0;
    // Rule 1: Images without alt text (WCAG 1.1.1)
    const imgsNoAlt = elements.filter(el => el.tagName === 'IMG' && !el.attributes.alt && !el.attributes['aria-label']);
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
    const inputsNoLabel = elements.filter(el => inputTypes.includes(el.tagName) &&
        !el.attributes['aria-label'] &&
        !el.attributes['aria-labelledby'] &&
        !el.attributes.id);
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
        if (!el.textContent)
            continue;
        if (!el.computedStyles.color || !el.computedStyles.backgroundColor)
            continue;
        const fg = parseRgb(el.computedStyles.color);
        const bg = parseRgb(el.computedStyles.backgroundColor);
        if (!fg || !bg)
            continue;
        // Skip transparent backgrounds
        if (el.computedStyles.backgroundColor === 'rgba(0, 0, 0, 0)')
            continue;
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
    const hasLandmark = elements.some(el => landmarks.includes(el.tagName) || !!el.attributes.role);
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
    const overflowing = elements.filter(el => el.boundingBox.x + el.boundingBox.width > viewportWidth + 10 && el.boundingBox.width > 0);
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
    const emptyButtons = elements.filter(el => (el.tagName === 'BUTTON' || el.tagName === 'A') &&
        !el.textContent &&
        !el.attributes['aria-label'] &&
        !el.attributes.alt);
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
function parseRgb(color) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match)
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    return null;
}
function relativeLuminance(rgb) {
    const [r, g, b] = rgb.map(c => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(fg, bg) {
    const l1 = relativeLuminance(fg);
    const l2 = relativeLuminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}
// --- Pretty Output ---
function printBanner() {
    if (flags.json)
        return;
    console.log('');
    console.log('\x1b[35m╔══════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[35m║\x1b[0m     \x1b[1m\x1b[36mAuditTest Vision\x1b[0m — Auditoría Automática v1.0.0     \x1b[35m║\x1b[0m');
    console.log('\x1b[35m╚══════════════════════════════════════════════════════════╝\x1b[0m');
    console.log('');
}
function printStep(msg) {
    if (flags.json)
        return;
    console.log(`  \x1b[36m►\x1b[0m ${msg}`);
}
function printError(msg) {
    console.error(`  \x1b[31m✖\x1b[0m ${msg}`);
}
function printResults(issues, url, durationMs) {
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
    if (critical > 0)
        console.log(`    \x1b[31m● ${critical} crítico(s)\x1b[0m`);
    if (major > 0)
        console.log(`    \x1b[33m● ${major} mayor(es)\x1b[0m`);
    if (minor > 0)
        console.log(`    \x1b[34m● ${minor} menor(es)\x1b[0m`);
    console.log('');
    // Issue details
    if (issues.length === 0) {
        console.log('  \x1b[32m✓ ¡Sin problemas detectados! La página cumple con las reglas evaluadas.\x1b[0m');
    }
    else {
        for (const issue of issues) {
            const severityColors = {
                critical: '\x1b[31m',
                major: '\x1b[33m',
                minor: '\x1b[34m',
                info: '\x1b[90m',
            };
            const color = severityColors[issue.severity] || '\x1b[0m';
            const badge = `${color}[${issue.severity.toUpperCase()}]\x1b[0m`;
            console.log(`  ${badge} ${issue.title}`);
            console.log(`    ${issue.description}`);
            if (issue.selector)
                console.log(`    \x1b[90mSelector: ${issue.selector}\x1b[0m`);
            if (issue.wcagCriterion)
                console.log(`    \x1b[90mWCAG: ${issue.wcagCriterion}\x1b[0m`);
            if (issue.fix)
                console.log(`    \x1b[32m💡 Fix: ${issue.fix}\x1b[0m`);
            console.log('');
        }
    }
    // Exit status
    console.log('\x1b[35m──────────────────────────────────────────────────────────\x1b[0m');
    if (critical > 0) {
        console.log(`  \x1b[31m✖ FALLO: ${critical} issue(s) crítico(s) detectado(s)\x1b[0m`);
        console.log(`  \x1b[90mExit code: 1 (útil para CI/CD pipelines)\x1b[0m`);
    }
    else {
        console.log(`  \x1b[32m✓ PASÓ: Sin issues críticos\x1b[0m`);
        console.log(`  \x1b[90mExit code: 0\x1b[0m`);
    }
    console.log('');
}
// --- HTML Report Generator ---
function generateHTMLReport(issues, url, durationMs, screenshotBase64, elements) {
    const critical = issues.filter(i => i.severity === 'critical').length;
    const major = issues.filter(i => i.severity === 'major').length;
    const minor = issues.filter(i => i.severity === 'minor').length;
    const passed = 7 - new Set(issues.map(i => i.title)).size;
    const severityColor = {
        critical: '#ef4444',
        major: '#f59e0b',
        minor: '#3b82f6',
        info: '#71717a',
    };
    const markers = issues
        .filter(i => i.selector)
        .map(issue => {
        const el = elements.find(e => e.selector === issue.selector);
        if (!el || el.boundingBox.width === 0)
            return '';
        const { x, y, width, height } = el.boundingBox;
        const color = severityColor[issue.severity] || '#71717a';
        return `<div class="marker" style="left:${x}px;top:${y}px;width:${width}px;height:${height}px;--c:${color}" data-id="${issue.id}"><span class="marker-label">${issue.id}</span></div>`;
    })
        .join('\n');
    const issueCards = issues.map(issue => {
        const color = severityColor[issue.severity] || '#71717a';
        return `<div class="card" data-id="${issue.id}" style="--accent:${color}">
      <div class="card-top"><span class="badge">${issue.severity}</span><span class="card-id">${issue.id}</span>${issue.wcagCriterion ? `<span class="wcag">WCAG ${issue.wcagCriterion}</span>` : ''}</div>
      <h3>${issue.title}</h3>
      <p>${issue.description}</p>
      ${issue.selector ? `<div class="sel"><code>${issue.selector}</code></div>` : ''}
      ${issue.fix ? `<div class="fix"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4m-7-7H1m22 0h-4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83m0-14.14l-2.83 2.83m-8.48 8.48l-2.83 2.83"/></svg>${issue.fix}</div>` : ''}
    </div>`;
    }).join('\n');
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reporte — AuditTest Vision</title>
<style>
:root{--bg:#09090b;--s1:#18181b;--s2:#27272a;--tx:#fafafa;--tm:#a1a1aa;--purple:#7c3aed;--green:#22c55e;--red:#ef4444;--yellow:#f59e0b;--blue:#3b82f6;--r:10px}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--tx);min-height:100vh}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 28px;background:var(--s1);border-bottom:1px solid var(--s2);position:sticky;top:0;z-index:1000;backdrop-filter:blur(12px)}
.topbar h1{font-size:1rem;font-weight:600;display:flex;align-items:center;gap:8px}
.topbar h1 span{background:linear-gradient(135deg,var(--purple),#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.topbar .meta{display:flex;gap:16px;font-size:.75rem;color:var(--tm)}
.stats{display:flex;gap:12px;padding:20px 28px;border-bottom:1px solid var(--s2)}
.stat{display:flex;align-items:center;gap:10px;background:var(--s1);border:1px solid var(--s2);border-radius:var(--r);padding:12px 20px;flex:1}
.stat-num{font-size:1.6rem;font-weight:700}
.stat-label{font-size:.7rem;color:var(--tm);text-transform:uppercase;letter-spacing:.04em}
.main{display:grid;grid-template-columns:1fr 400px;height:calc(100vh - 140px)}
.viewport{position:relative;overflow:auto;background:#050507;cursor:crosshair}
.viewport img{display:block;min-width:1280px}
.marker{position:absolute;border:2px solid var(--c);border-radius:4px;opacity:.5;transition:all .25s;cursor:pointer}
.marker:hover,.marker.active{opacity:1;box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 30%,transparent),0 0 24px color-mix(in srgb,var(--c) 20%,transparent)}
.marker-label{position:absolute;top:-8px;right:-8px;background:var(--c);color:#fff;font-size:.6rem;font-weight:700;padding:2px 5px;border-radius:4px;line-height:1}
.sidebar{overflow-y:auto;border-left:1px solid var(--s2);padding:0}
.sidebar-header{padding:16px 20px;border-bottom:1px solid var(--s2);font-size:.8rem;color:var(--tm);font-weight:500;position:sticky;top:0;background:var(--bg);z-index:10}
.cards{padding:12px}
.card{background:var(--s1);border:1px solid var(--s2);border-radius:var(--r);padding:16px;margin-bottom:10px;border-left:3px solid var(--accent);cursor:pointer;transition:all .2s}
.card:hover,.card.active{background:#1f1f24;border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.card-top{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.badge{font-size:.6rem;font-weight:700;text-transform:uppercase;padding:3px 8px;border-radius:4px;background:var(--accent);color:#fff;letter-spacing:.04em}
.card-id{font-size:.7rem;color:#52525b}
.wcag{font-size:.65rem;background:#1e3a5f;color:var(--blue);padding:2px 7px;border-radius:4px;margin-left:auto}
.card h3{font-size:.85rem;font-weight:600;margin-bottom:4px}
.card p{font-size:.78rem;color:var(--tm);line-height:1.5}
.sel{margin-top:8px}
.sel code{font-size:.72rem;background:var(--s2);padding:3px 8px;border-radius:4px;color:#c4b5fd;font-family:monospace}
.fix{margin-top:10px;padding:10px 12px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:8px;font-size:.75rem;color:var(--green);display:flex;align-items:flex-start;gap:8px;line-height:1.4}
.empty{text-align:center;padding:60px 20px}
.empty svg{margin-bottom:16px;opacity:.3}
.empty p{color:var(--green);font-weight:500}
.empty span{display:block;color:var(--tm);font-size:.8rem;margin-top:6px}
</style>
</head>
<body>
<div class="topbar">
  <h1><span>AuditTest Vision</span> Reporte</h1>
  <div class="meta"><span>${url}</span><span>${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span><span>${durationMs}ms</span></div>
</div>
<div class="stats">
  <div class="stat"><div><div class="stat-num" style="color:var(--purple)">${issues.length}</div><div class="stat-label">Total</div></div></div>
  <div class="stat"><div><div class="stat-num" style="color:var(--red)">${critical}</div><div class="stat-label">Criticos</div></div></div>
  <div class="stat"><div><div class="stat-num" style="color:var(--yellow)">${major}</div><div class="stat-label">Mayores</div></div></div>
  <div class="stat"><div><div class="stat-num" style="color:var(--blue)">${minor}</div><div class="stat-label">Menores</div></div></div>
  <div class="stat"><div><div class="stat-num" style="color:var(--green)">${passed}</div><div class="stat-label">Pasaron</div></div></div>
</div>
<div class="main">
  <div class="viewport">
    ${screenshotBase64 ? `<img src="data:image/png;base64,${screenshotBase64}" alt="Screenshot">` : '<div style="padding:40px;color:var(--tm)">Sin screenshot</div>'}
    ${markers}
  </div>
  <div class="sidebar">
    <div class="sidebar-header">${issues.length} problema${issues.length !== 1 ? 's' : ''} detectado${issues.length !== 1 ? 's' : ''}</div>
    <div class="cards">
      ${issues.length === 0 ? `<div class="empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><p>Sin problemas detectados</p><span>La pagina cumple las reglas evaluadas</span></div>` : issueCards}
    </div>
  </div>
</div>
<script>
document.querySelectorAll('.card').forEach(c=>{c.addEventListener('click',()=>{document.querySelectorAll('.card,.marker').forEach(x=>{x.classList.remove('active')});c.classList.add('active');const m=document.querySelector('.marker[data-id="'+c.dataset.id+'"]');if(m){m.classList.add('active');m.scrollIntoView({behavior:'smooth',block:'center'})}})});
document.querySelectorAll('.marker').forEach(m=>{m.addEventListener('click',()=>{document.querySelectorAll('.card,.marker').forEach(x=>{x.classList.remove('active')});m.classList.add('active');const c=document.querySelector('.card[data-id="'+m.dataset.id+'"]');if(c){c.classList.add('active');c.scrollIntoView({behavior:'smooth',block:'center'})}})});
</script>
</body>
</html>`;
}
// --- Run ---
main();
//# sourceMappingURL=audittest.js.map