#!/usr/bin/env node
/**
 * AuditTest Vision — CLI Tool v1.1.0
 *
 * Herramienta de línea de comandos para auditoría de accesibilidad y detección visual.
 * Funciona 100% local con Puppeteer, sin necesidad de APIs externas.
 *
 * Features:
 *   - 7 reglas WCAG 2.1 evaluadas automáticamente
 *   - Score de accesibilidad 0-100
 *   - Reporte HTML interactivo con light/dark mode
 *   - Comparación entre dos URLs (--diff)
 *   - Watch mode para desarrollo (--watch)
 *   - Export a PDF (--pdf)
 */
import puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import { loadConfig, getDisabledRules } from '../core/configLoader.js';
import { SEVERITY_WEIGHTS } from '../core/scoreCalculator.js';
// --- CLI Argument Parsing ---
const args = process.argv.slice(2);
const flags = {
    json: args.includes('--json'),
    fix: args.includes('--fix'),
    help: args.includes('--help') || args.includes('-h'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    screenshot: args.includes('--screenshot'),
    report: args.includes('--report'),
    pdf: args.includes('--pdf'),
    watch: args.includes('--watch'),
    diff: args.includes('--diff'),
};
// PDF implicitly enables fix suggestions (REQ-8: PDF must contain fix suggestions)
if (flags.pdf) {
    flags.fix = true;
}
// Get URLs
const nonFlagArgs = args.filter(a => !a.startsWith('--') && !a.startsWith('-'));
const targetUrl = nonFlagArgs[0];
const diffUrl = flags.diff ? nonFlagArgs[1] : undefined;
// --- Config Loading ---
const auditConfig = loadConfig();
const disabledRules = getDisabledRules(auditConfig);
// --- Help ---
if (flags.help || !targetUrl) {
    console.log(`
\x1b[35m╔══════════════════════════════════════════════════════════════╗
║\x1b[0m         \x1b[1m\x1b[36mAuditTest Vision\x1b[0m — CLI v1.1.0                    \x1b[35m║
╚══════════════════════════════════════════════════════════════╝\x1b[0m

\x1b[1mUso:\x1b[0m
  npx audittest-vision <url|archivo> [opciones]

\x1b[1mEjemplos:\x1b[0m
  npx audittest-vision https://google.com
  npx audittest-vision https://miapp.com --report --fix
  npx audittest-vision https://miapp.com --json
  npx audittest-vision https://prod.com --diff https://staging.com
  npx audittest-vision http://localhost:3000 --watch
  npx audittest-vision https://miapp.com --pdf

\x1b[1mOpciones:\x1b[0m
  --report         Genera reporte HTML interactivo con screenshot anotado
  --pdf            Exporta el reporte como archivo PDF
  --json           Salida en formato JSON (para CI/CD pipelines)
  --fix            Mostrar sugerencias de auto-fix para cada issue
  --diff <url2>    Comparar accesibilidad entre dos URLs
  --watch          Re-auditar cada 30s (modo desarrollo)
  --screenshot     Guardar screenshot de la página auditada
  --verbose, -v    Mostrar detalles de cada verificación
  --help, -h       Mostrar esta ayuda

\x1b[1mReglas evaluadas (WCAG 2.1):\x1b[0m
  \x1b[36m•\x1b[0m 1.1.1  Imágenes sin alt text (Nivel A)
  \x1b[36m•\x1b[0m 1.1.1  Botones/enlaces sin texto accesible (Nivel A)
  \x1b[36m•\x1b[0m 1.3.1  Inputs sin label asociado (Nivel A)
  \x1b[36m•\x1b[0m 1.3.1  Jerarquía de headings incorrecta (Nivel A)
  \x1b[36m•\x1b[0m 1.3.1  Ausencia de landmarks semánticos (Nivel A)
  \x1b[36m•\x1b[0m 1.4.3  Contraste de color insuficiente (Nivel AA)
  \x1b[36m•\x1b[0m Visual Elementos fuera del viewport

\x1b[1mFormatos de salida:\x1b[0m
  Terminal    Resultado por defecto con barra de score coloreada
  --json      Objeto JSON con score, issues y metadata (ideal para CI/CD)
  --report    Archivo HTML interactivo con screenshot y markers
  --pdf       Documento PDF con score, issues y sugerencias de fix

\x1b[1mScore (0-100):\x1b[0m
  90-100  Excelente (verde)
  70-89   Bueno (amarillo)
  50-69   Necesita trabajo (naranja)
  0-49    Pobre (rojo)

  Cálculo: 100 - (critical×25 + major×10 + minor×3)
`);
    process.exit(0);
}
// --- Score Calculation ---
function calculateScore(issues) {
    const totalDeductions = issues.reduce((sum, issue) => sum + (SEVERITY_WEIGHTS[issue.severity] ?? 0), 0);
    return Math.max(0, 100 - totalDeductions);
}
function getScoreColor(score) {
    if (score >= 90)
        return '\x1b[32m'; // green
    if (score >= 70)
        return '\x1b[33m'; // yellow
    if (score >= 50)
        return '\x1b[38;5;208m'; // orange
    return '\x1b[31m'; // red
}
function getScoreLabel(score) {
    if (score >= 90)
        return 'Excelente';
    if (score >= 70)
        return 'Bueno';
    if (score >= 50)
        return 'Necesita trabajo';
    return 'Pobre';
}
function printScoreBar(score) {
    const color = getScoreColor(score);
    const filled = Math.round(score / 5);
    const empty = 20 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    console.log(`  ${color}${bar} ${score}/100 — ${getScoreLabel(score)}\x1b[0m`);
}
// --- Resolve URL ---
function resolveUrl(input) {
    if (input.startsWith('http') || input.startsWith('file://'))
        return input;
    const resolved = path.resolve(input);
    if (fs.existsSync(resolved))
        return `file://${resolved}`;
    printError(`No se encontró el archivo: ${input}`);
    process.exit(1);
}
// --- Single Audit Run ---
async function runSingleAudit(url, takeScreenshot) {
    const startTime = Date.now();
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    let screenshotBase64 = '';
    if (takeScreenshot) {
        const buffer = await page.screenshot({ fullPage: false, encoding: 'binary' });
        screenshotBase64 = buffer.toString('base64');
        if (flags.screenshot)
            fs.writeFileSync('audittest-screenshot.png', buffer);
    }
    const elements = await extractElements(page);
    const issues = runAudit(elements);
    const score = calculateScore(issues);
    await browser.close();
    return { url, issues, elements, score, screenshotBase64, durationMs: Date.now() - startTime };
}
// --- Main Execution ---
async function main() {
    printBanner();
    const url = resolveUrl(targetUrl);
    // --- WATCH MODE ---
    if (flags.watch) {
        await runWatchMode(url);
        return;
    }
    // --- DIFF MODE ---
    if (flags.diff) {
        if (!diffUrl) {
            printError('--diff requiere una segunda URL. Uso: npx audittest-vision url1 --diff url2');
            process.exit(1);
        }
        await runDiffMode(url, resolveUrl(diffUrl));
        return;
    }
    // --- STANDARD AUDIT ---
    printStep('Iniciando navegador headless...');
    printStep(`Navegando a: ${url}`);
    const result = await runSingleAudit(url, flags.screenshot || flags.report || flags.pdf);
    printStep(`${result.elements.length} elementos analizados`);
    printStep('Ejecutando auditoría WCAG + Visual...');
    // Score
    if (!flags.json) {
        console.log('');
        console.log(`  \x1b[1mAccessibility Score:\x1b[0m`);
        printScoreBar(result.score);
        console.log('');
    }
    // HTML Report
    if (flags.report || flags.pdf) {
        const reportPath = 'audittest-report.html';
        const html = generateHTMLReport(result);
        fs.writeFileSync(reportPath, html);
        printStep(`Reporte HTML generado: ${reportPath}`);
    }
    // PDF Export
    if (flags.pdf) {
        printStep('Generando PDF...');
        await generatePDF('audittest-report.html', 'audittest-report.pdf');
        printStep('PDF exportado: audittest-report.pdf');
    }
    // JSON output
    if (flags.json) {
        console.log(JSON.stringify({
            url: result.url, timestamp: new Date().toISOString(), durationMs: result.durationMs,
            score: result.score, scoreLabel: getScoreLabel(result.score),
            totalIssues: result.issues.length,
            critical: result.issues.filter(i => i.severity === 'critical').length,
            major: result.issues.filter(i => i.severity === 'major').length,
            minor: result.issues.filter(i => i.severity === 'minor').length,
            issues: result.issues,
        }, null, 2));
    }
    else {
        printResults(result);
    }
    const criticalCount = result.issues.filter(i => i.severity === 'critical').length;
    const maxCritical = auditConfig.gates.prePush.maxCritical;
    process.exit(criticalCount > maxCritical ? 1 : 0);
}
// --- WATCH MODE ---
async function runWatchMode(url) {
    let previousIssues = [];
    let cycle = 0;
    console.log(`  \x1b[36m⟳\x1b[0m Modo watch activo — auditando cada 30s`);
    console.log(`  \x1b[36m⟳\x1b[0m URL: ${url}`);
    console.log(`  \x1b[90m  Presiona Ctrl+C para detener\x1b[0m\n`);
    const runCycle = async () => {
        cycle++;
        try {
            const result = await runSingleAudit(url, false);
            const newIssues = result.issues.filter(i => !previousIssues.find(p => p.title === i.title && p.selector === i.selector));
            const fixedIssues = previousIssues.filter(p => !result.issues.find(i => i.title === p.title && i.selector === p.selector));
            console.log(`\x1b[35m─── Ciclo #${cycle} ─── ${new Date().toLocaleTimeString('es-ES')} ───\x1b[0m`);
            printScoreBar(result.score);
            if (newIssues.length > 0) {
                console.log(`  \x1b[31m[NEW] ${newIssues.length} nuevo(s):\x1b[0m`);
                newIssues.forEach(i => console.log(`    \x1b[31m+ ${i.title}\x1b[0m ${i.selector || ''}`));
            }
            if (fixedIssues.length > 0) {
                console.log(`  \x1b[32m[FIXED] ${fixedIssues.length} resuelto(s):\x1b[0m`);
                fixedIssues.forEach(i => console.log(`    \x1b[32m- ${i.title}\x1b[0m ${i.selector || ''}`));
            }
            if (newIssues.length === 0 && fixedIssues.length === 0 && cycle > 1) {
                console.log(`  \x1b[90mSin cambios\x1b[0m`);
            }
            console.log(`  \x1b[90m${result.issues.length} issues total · ${result.durationMs}ms\x1b[0m\n`);
            previousIssues = result.issues;
        }
        catch (e) {
            console.log(`  \x1b[31m✖ Error: ${e.message}\x1b[0m\n`);
        }
    };
    await runCycle();
    const interval = setInterval(runCycle, 30000);
    process.on('SIGINT', () => { clearInterval(interval); console.log('\n  \x1b[36m⟳\x1b[0m Watch detenido.'); process.exit(0); });
}
// --- DIFF MODE ---
async function runDiffMode(url1, url2) {
    printStep(`Auditando ambas URLs en paralelo...`);
    const [result1, result2] = await Promise.all([
        runSingleAudit(url1, false),
        runSingleAudit(url2, false),
    ]);
    const onlyIn1 = result1.issues.filter(i => !result2.issues.find(j => j.title === i.title && j.selector === i.selector));
    const onlyIn2 = result2.issues.filter(i => !result1.issues.find(j => j.title === i.title && j.selector === i.selector));
    const inBoth = result1.issues.filter(i => result2.issues.find(j => j.title === i.title && j.selector === i.selector));
    const scoreDelta = result2.score - result1.score;
    console.log('');
    console.log('\x1b[35m══════════════════════════════════════════════════════════\x1b[0m');
    console.log('  \x1b[1mComparación de Accesibilidad\x1b[0m');
    console.log('\x1b[35m══════════════════════════════════════════════════════════\x1b[0m\n');
    console.log(`  \x1b[1mURL 1:\x1b[0m ${url1}`);
    console.log(`  Score: `);
    printScoreBar(result1.score);
    console.log(`\n  \x1b[1mURL 2:\x1b[0m ${url2}`);
    console.log(`  Score: `);
    printScoreBar(result2.score);
    console.log(`\n  \x1b[1mDelta:\x1b[0m ${scoreDelta >= 0 ? '\x1b[32m+' : '\x1b[31m'}${scoreDelta} puntos\x1b[0m\n`);
    if (onlyIn1.length > 0) {
        console.log(`  \x1b[31m✖ Solo en URL 1 (${onlyIn1.length} regresiones):\x1b[0m`);
        onlyIn1.forEach(i => console.log(`    \x1b[31m- [${i.severity}] ${i.title}\x1b[0m`));
        console.log('');
    }
    if (onlyIn2.length > 0) {
        console.log(`  \x1b[32m✓ Solo en URL 2 (${onlyIn2.length} mejoras):\x1b[0m`);
        onlyIn2.forEach(i => console.log(`    \x1b[32m+ [${i.severity}] ${i.title}\x1b[0m`));
        console.log('');
    }
    if (inBoth.length > 0) {
        console.log(`  \x1b[33m● Persistentes en ambas (${inBoth.length}):\x1b[0m`);
        inBoth.forEach(i => console.log(`    \x1b[33m= [${i.severity}] ${i.title}\x1b[0m`));
        console.log('');
    }
    if (flags.json) {
        console.log(JSON.stringify({ url1, url2, score1: result1.score, score2: result2.score, scoreDelta, onlyIn1, onlyIn2, inBoth }, null, 2));
    }
    process.exit(0);
}
// --- PDF Generation ---
async function generatePDF(htmlPath, outputPath) {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.pdf({ path: outputPath, format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } });
    await browser.close();
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
                    selector, tagName: el.tagName,
                    boundingBox: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
                    computedStyles: { color: computed.color, backgroundColor: computed.backgroundColor, fontSize: computed.fontSize, fontWeight: computed.fontWeight, overflow: computed.overflow, display: computed.display },
                    attributes: { alt: el.getAttribute('alt') || '', 'aria-label': el.getAttribute('aria-label') || '', 'aria-labelledby': el.getAttribute('aria-labelledby') || '', role: el.getAttribute('role') || '', id: el.id || '', type: el.getAttribute('type') || '', href: el.getAttribute('href') || '' },
                    textContent: (el.textContent || '').trim().slice(0, 80),
                });
            });
        }
        return elements.slice(0, 500);
    });
}
// --- Audit Rules Engine ---
/**
 * CLI audit rules engine.
 *
 * Note: These rules intentionally duplicate wcagModule logic for the CLI path.
 * The WcagModule is used by the Chrome Extension and AuditEngine API paths.
 * The CLI uses Spanish messages, inline formatting, and --fix suggestions
 * that differ from the module's output format.
 *
 * Rule enable/disable is controlled via audit-rules.spec.json (loaded in configLoader).
 * See: https://github.com/la00429/audit_project_/issues — tracked for future unification.
 */
function runAudit(elements) {
    const issues = [];
    const skip = new Set(disabledRules);
    let counter = 0;
    // Rule 1: Images without alt text
    if (!skip.has('missing-alt')) {
        elements.filter(el => el.tagName === 'IMG' && !el.attributes.alt && !el.attributes['aria-label'])
            .forEach(img => { issues.push({ id: `ATV-${++counter}`, severity: 'major', title: 'Imagen sin texto alternativo', description: `"${img.selector}" no tiene alt ni aria-label.`, selector: img.selector, wcagCriterion: '1.1.1', fix: flags.fix ? 'Agrega: alt="Descripción de la imagen"' : undefined }); });
    }
    // Rule 2: Form inputs without labels
    if (!skip.has('missing-label')) {
        elements.filter(el => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && !el.attributes['aria-label'] && !el.attributes['aria-labelledby'] && !el.attributes.id)
            .forEach(input => { issues.push({ id: `ATV-${++counter}`, severity: 'major', title: 'Campo sin label', description: `<${input.tagName.toLowerCase()}> "${input.selector}" no tiene label asociado.`, selector: input.selector, wcagCriterion: '1.3.1', fix: flags.fix ? 'Agrega: aria-label="Descripción del campo"' : undefined }); });
    }
    // Rule 3: Color contrast
    if (!skip.has('color-contrast')) {
        for (const el of elements) {
            if (!el.textContent || !el.computedStyles.color || !el.computedStyles.backgroundColor)
                continue;
            if (el.computedStyles.backgroundColor === 'rgba(0, 0, 0, 0)')
                continue;
            const fg = parseRgb(el.computedStyles.color);
            const bg = parseRgb(el.computedStyles.backgroundColor);
            if (!fg || !bg)
                continue;
            const ratio = contrastRatio(fg, bg);
            const fontSize = parseFloat(el.computedStyles.fontSize || '16');
            const fontWeight = parseInt(el.computedStyles.fontWeight || '400');
            const threshold = (fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700)) ? 3.0 : 4.5;
            if (ratio < threshold) {
                issues.push({ id: `ATV-${++counter}`, severity: ratio < 2.5 ? 'critical' : 'major', title: 'Contraste insuficiente', description: `"${el.selector}" ratio ${ratio.toFixed(2)}:1 (mín: ${threshold}:1)`, selector: el.selector, wcagCriterion: '1.4.3', fix: flags.fix ? 'Usa un color más oscuro o fondo más claro.' : undefined });
            }
        }
    }
    // Rule 4: Heading hierarchy
    if (!skip.has('heading-order')) {
        const headings = elements.filter(el => /^H[1-6]$/.test(el.tagName)).sort((a, b) => a.boundingBox.y - b.boundingBox.y);
        for (let i = 1; i < headings.length; i++) {
            const prev = parseInt(headings[i - 1].tagName[1]);
            const curr = parseInt(headings[i].tagName[1]);
            if (curr > prev + 1) {
                issues.push({ id: `ATV-${++counter}`, severity: 'minor', title: 'Heading saltado', description: `"${headings[i].selector}" <h${curr}> sigue a <h${prev}>.`, selector: headings[i].selector, wcagCriterion: '1.3.1', fix: flags.fix ? `Cambia a <h${prev + 1}>.` : undefined });
            }
        }
    }
    // Rule 5: Missing landmarks
    if (!skip.has('missing-landmark')) {
        const hasLandmark = elements.some(el => ['MAIN', 'NAV', 'HEADER', 'FOOTER', 'ASIDE'].includes(el.tagName) || !!el.attributes.role);
        if (!hasLandmark && elements.length > 10) {
            issues.push({ id: `ATV-${++counter}`, severity: 'minor', title: 'Sin landmarks', description: 'No hay <main>, <nav>, <header> ni roles ARIA.', wcagCriterion: '1.3.1', fix: flags.fix ? 'Usa <main>, <nav>, <header>, <footer>.' : undefined });
        }
    }
    // Rule 6: Viewport overflow (visual rule, not configurable via WCAG config)
    elements.filter(el => el.boundingBox.x + el.boundingBox.width > 1290 && el.boundingBox.width > 0).slice(0, 3)
        .forEach(el => { issues.push({ id: `ATV-${++counter}`, severity: 'major', title: 'Fuera del viewport', description: `"${el.selector}" excede ${Math.round(el.boundingBox.x + el.boundingBox.width - 1280)}px.`, selector: el.selector, fix: flags.fix ? 'Agrega: max-width: 100%; overflow: hidden;' : undefined }); });
    // Rule 7: Buttons/links without text
    if (!skip.has('accessible-name')) {
        elements.filter(el => (el.tagName === 'BUTTON' || el.tagName === 'A') && !el.textContent && !el.attributes['aria-label'] && !el.attributes.alt)
            .forEach(btn => { issues.push({ id: `ATV-${++counter}`, severity: 'major', title: 'Botón sin texto accesible', description: `<${btn.tagName.toLowerCase()}> "${btn.selector}" sin texto ni aria-label.`, selector: btn.selector, wcagCriterion: '1.1.1', fix: flags.fix ? 'Agrega aria-label="Acción"' : undefined }); });
    }
    return issues;
}
// --- Color Utilities ---
function parseRgb(color) {
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
}
function relativeLuminance(rgb) {
    const [r, g, b] = rgb.map(c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(fg, bg) {
    const l1 = relativeLuminance(fg);
    const l2 = relativeLuminance(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
// --- Pretty Output ---
function printBanner() {
    if (flags.json)
        return;
    console.log('');
    console.log('\x1b[35m╔══════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[35m║\x1b[0m     \x1b[1m\x1b[36mAuditTest Vision\x1b[0m — Auditoría Automática v1.1.0     \x1b[35m║\x1b[0m');
    console.log('\x1b[35m╚══════════════════════════════════════════════════════════╝\x1b[0m');
    console.log('');
}
function printStep(msg) { if (!flags.json)
    console.log(`  \x1b[36m►\x1b[0m ${msg}`); }
function printError(msg) { console.error(`  \x1b[31m✖\x1b[0m ${msg}`); }
function printResults(result) {
    const { issues, url, durationMs } = result;
    const critical = issues.filter(i => i.severity === 'critical').length;
    const major = issues.filter(i => i.severity === 'major').length;
    const minor = issues.filter(i => i.severity === 'minor').length;
    console.log('\x1b[35m──────────────────────────────────────────────────────────\x1b[0m');
    console.log(`  \x1b[1mResultados\x1b[0m · ${url}`);
    console.log(`  ${issues.length} problemas · ${durationMs}ms`);
    console.log('\x1b[35m──────────────────────────────────────────────────────────\x1b[0m\n');
    if (critical > 0)
        console.log(`    \x1b[31m● ${critical} crítico(s)\x1b[0m`);
    if (major > 0)
        console.log(`    \x1b[33m● ${major} mayor(es)\x1b[0m`);
    if (minor > 0)
        console.log(`    \x1b[34m● ${minor} menor(es)\x1b[0m`);
    console.log('');
    if (issues.length === 0) {
        console.log('  \x1b[32m✓ ¡Sin problemas! La página cumple las reglas evaluadas.\x1b[0m');
    }
    else {
        for (const issue of issues) {
            const colors = { critical: '\x1b[31m', major: '\x1b[33m', minor: '\x1b[34m', info: '\x1b[90m' };
            console.log(`  ${colors[issue.severity]}[${issue.severity.toUpperCase()}]\x1b[0m ${issue.title}`);
            console.log(`    ${issue.description}`);
            if (issue.fix)
                console.log(`    \x1b[32m💡 ${issue.fix}\x1b[0m`);
            console.log('');
        }
    }
    console.log('\x1b[35m──────────────────────────────────────────────────────────\x1b[0m');
    if (critical > 0)
        console.log(`  \x1b[31m✖ FALLO: ${critical} issue(s) crítico(s)\x1b[0m`);
    else
        console.log(`  \x1b[32m✓ PASÓ: Sin issues críticos\x1b[0m`);
    console.log('');
}
// --- HTML Report Generator ---
function generateHTMLReport(result) {
    const { issues, url, durationMs, screenshotBase64, elements, score } = result;
    const critical = issues.filter(i => i.severity === 'critical').length;
    const major = issues.filter(i => i.severity === 'major').length;
    const minor = issues.filter(i => i.severity === 'minor').length;
    const scoreColor = score >= 90 ? '#22c55e' : score >= 70 ? '#eab308' : score >= 50 ? '#f97316' : '#ef4444';
    const markers = issues.filter(i => i.selector).map(issue => {
        const el = elements.find(e => e.selector === issue.selector);
        if (!el || el.boundingBox.width === 0)
            return '';
        const { x, y, width, height } = el.boundingBox;
        const color = issue.severity === 'critical' ? '#ef4444' : issue.severity === 'major' ? '#f59e0b' : '#3b82f6';
        return `<div class="marker" style="left:${x}px;top:${y}px;width:${width}px;height:${height}px;--c:${color}" data-id="${issue.id}"><span class="ml">${issue.id}</span></div>`;
    }).join('');
    const cards = issues.map(issue => {
        const color = issue.severity === 'critical' ? '#ef4444' : issue.severity === 'major' ? '#f59e0b' : '#3b82f6';
        return `<div class="card" data-id="${issue.id}" style="--a:${color}"><div class="ct"><span class="badge">${issue.severity}</span><span class="cid">${issue.id}</span>${issue.wcagCriterion ? `<span class="wcag">WCAG ${issue.wcagCriterion}</span>` : ''}</div><h3>${issue.title}</h3><p>${issue.description}</p>${issue.selector ? `<code>${issue.selector}</code>` : ''}${issue.fix ? `<div class="fix">${issue.fix}</div>` : ''}</div>`;
    }).join('');
    return `<!DOCTYPE html><html lang="es" data-theme="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reporte AuditTest Vision</title>
<style>
:root,[data-theme="dark"]{--bg:#09090b;--s1:#18181b;--s2:#27272a;--tx:#fafafa;--tm:#a1a1aa;--cd:#18181b;--purple:#7c3aed}
[data-theme="light"]{--bg:#fff;--s1:#f9fafb;--s2:#e5e7eb;--tx:#111827;--tm:#6b7280;--cd:#f9fafb}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--tx);transition:background .3s,color .3s}
.top{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:var(--s1);border-bottom:1px solid var(--s2);position:sticky;top:0;z-index:999}
.top h1{font-size:.9rem;font-weight:600}.top h1 b{background:linear-gradient(135deg,var(--purple),#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.top .m{font-size:.7rem;color:var(--tm);display:flex;gap:12px;align-items:center}
.tbtn{background:var(--bg);border:1px solid var(--s2);border-radius:6px;padding:5px 10px;cursor:pointer;font-size:.7rem;color:var(--tm)}
.tbtn:hover{border-color:var(--purple);color:var(--purple)}
.score-bar{display:flex;align-items:center;gap:16px;padding:16px 20px;border-bottom:1px solid var(--s2);background:var(--s1)}
.gauge{position:relative;width:80px;height:80px}.gauge svg{transform:rotate(-90deg)}.gauge circle{fill:none;stroke-width:8}
.gauge .bg{stroke:var(--s2)}.gauge .fg{stroke:${scoreColor};stroke-linecap:round;transition:stroke-dashoffset .5s}
.gauge .val{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700;color:${scoreColor}}
.score-info{display:flex;gap:20px}.si{text-align:center}.si .n{font-size:1.3rem;font-weight:700}.si .l{font-size:.6rem;color:var(--tm);text-transform:uppercase}
.layout{display:grid;grid-template-columns:1fr 360px;height:calc(100vh - 150px)}
@media(max-width:900px){.layout{grid-template-columns:1fr;height:auto}}
.vp{position:relative;overflow:auto;background:color-mix(in srgb,var(--bg) 95%,#000)}.vp img{display:block;min-width:1280px}
.marker{position:absolute;border:2px solid var(--c);border-radius:3px;opacity:.4;cursor:pointer;transition:all .2s}
.marker:hover,.marker.active{opacity:1;box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 25%,transparent),0 0 16px color-mix(in srgb,var(--c) 15%,transparent)}
.ml{position:absolute;top:-8px;right:-8px;background:var(--c);color:#fff;font-size:.55rem;font-weight:700;padding:1px 4px;border-radius:3px}
.sb{overflow-y:auto;border-left:1px solid var(--s2)}.sbh{padding:12px 16px;border-bottom:1px solid var(--s2);font-size:.75rem;color:var(--tm);position:sticky;top:0;background:var(--bg);z-index:5}
.cards{padding:8px}
.card{background:var(--cd);border:1px solid var(--s2);border-radius:8px;padding:12px;margin-bottom:6px;border-left:3px solid var(--a);cursor:pointer;transition:all .15s}
.card:hover,.card.active{background:color-mix(in srgb,var(--cd) 92%,var(--a))}
.ct{display:flex;align-items:center;gap:5px;margin-bottom:5px}
.badge{font-size:.55rem;font-weight:700;text-transform:uppercase;padding:2px 6px;border-radius:3px;background:var(--a);color:#fff}
.cid{font-size:.6rem;color:var(--tm)}.wcag{font-size:.58rem;background:color-mix(in srgb,#3b82f6 12%,transparent);color:#3b82f6;padding:2px 5px;border-radius:3px;margin-left:auto}
.card h3{font-size:.78rem;font-weight:600;margin-bottom:3px}.card p{font-size:.7rem;color:var(--tm);line-height:1.4}
.card code{display:inline-block;font-size:.65rem;background:var(--s2);padding:2px 6px;border-radius:3px;color:var(--purple);margin-top:4px;font-family:monospace}
.fix{margin-top:6px;padding:6px 8px;background:color-mix(in srgb,#22c55e 6%,transparent);border:1px solid color-mix(in srgb,#22c55e 15%,transparent);border-radius:5px;font-size:.68rem;color:#22c55e}
.empty{text-align:center;padding:40px 16px;color:#22c55e;font-weight:500}
</style></head><body>
<div class="top"><h1><b>AuditTest Vision</b> Reporte</h1><div class="m"><span>${url}</span><span>${new Date().toLocaleDateString('es-ES')}</span><span>${durationMs}ms</span><button class="tbtn" onclick="document.documentElement.setAttribute('data-theme',document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');this.textContent=document.documentElement.getAttribute('data-theme')==='dark'?'🌙':'☀️'" id="tb">🌙</button></div></div>
<div class="score-bar">
<div class="gauge"><svg width="80" height="80" viewBox="0 0 80 80"><circle class="bg" cx="40" cy="40" r="34"/><circle class="fg" cx="40" cy="40" r="34" stroke-dasharray="${2 * Math.PI * 34}" stroke-dashoffset="${2 * Math.PI * 34 * (1 - score / 100)}"/></svg><div class="val">${score}</div></div>
<div class="score-info"><div class="si"><div class="n" style="color:#ef4444">${critical}</div><div class="l">Criticos</div></div><div class="si"><div class="n" style="color:#f59e0b">${major}</div><div class="l">Mayores</div></div><div class="si"><div class="n" style="color:#3b82f6">${minor}</div><div class="l">Menores</div></div><div class="si"><div class="n" style="color:var(--purple)">${issues.length}</div><div class="l">Total</div></div></div>
</div>
<div class="layout"><div class="vp">${screenshotBase64 ? `<img src="data:image/png;base64,${screenshotBase64}">` : '<div style="padding:40px;color:var(--tm)">Sin screenshot</div>'}${markers}</div>
<div class="sb"><div class="sbh">${issues.length} problema${issues.length !== 1 ? 's' : ''}</div><div class="cards">${issues.length === 0 ? '<div class="empty">✓ Sin problemas</div>' : cards}</div></div></div>
<script>document.querySelectorAll('.card').forEach(c=>{c.onclick=()=>{document.querySelectorAll('.card,.marker').forEach(x=>x.classList.remove('active'));c.classList.add('active');const m=document.querySelector('.marker[data-id="'+c.dataset.id+'"]');if(m){m.classList.add('active');m.scrollIntoView({behavior:'smooth',block:'center'})}}});document.querySelectorAll('.marker').forEach(m=>{m.onclick=()=>{document.querySelectorAll('.card,.marker').forEach(x=>x.classList.remove('active'));m.classList.add('active');const c=document.querySelector('.card[data-id="'+m.dataset.id+'"]');if(c){c.classList.add('active');c.scrollIntoView({behavior:'smooth',block:'center'})}}})</script>
</body></html>`;
}
// --- Run ---
main();
//# sourceMappingURL=audittest.js.map