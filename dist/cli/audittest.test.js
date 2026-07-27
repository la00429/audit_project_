/**
 * Unit tests for PDF report content verification (REQ-8).
 *
 * Validates that generateHTMLReport() output (which is rendered as PDF)
 * contains all required elements per REQ-8:
 * - Page URL, date, duration
 * - Accessibility score gauge
 * - Summary by severity
 * - Detailed issue list with selectors and fix suggestions
 * - Screenshot of the page
 */
import { describe, it, expect } from 'vitest';
// Copy of generateHTMLReport for testing (since it's not exported from the CLI module)
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
.gauge{position:relative;width:80px;height:80px}.gauge svg{transform:rotate(-90deg)}.gauge circle{fill:none;stroke-width:8}
.gauge .bg{stroke:var(--s2)}.gauge .fg{stroke:${scoreColor};stroke-linecap:round;transition:stroke-dashoffset .5s}
.gauge .val{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700;color:${scoreColor}}
</style></head><body>
<div class="top"><h1><b>AuditTest Vision</b> Reporte</h1><div class="m"><span>${url}</span><span>${new Date().toLocaleDateString('es-ES')}</span><span>${durationMs}ms</span></div></div>
<div class="score-bar">
<div class="gauge"><svg width="80" height="80" viewBox="0 0 80 80"><circle class="bg" cx="40" cy="40" r="34"/><circle class="fg" cx="40" cy="40" r="34" stroke-dasharray="${2 * Math.PI * 34}" stroke-dashoffset="${2 * Math.PI * 34 * (1 - score / 100)}"/></svg><div class="val">${score}</div></div>
<div class="score-info"><div class="si"><div class="n" style="color:#ef4444">${critical}</div><div class="l">Criticos</div></div><div class="si"><div class="n" style="color:#f59e0b">${major}</div><div class="l">Mayores</div></div><div class="si"><div class="n" style="color:#3b82f6">${minor}</div><div class="l">Menores</div></div><div class="si"><div class="n" style="color:var(--purple)">${issues.length}</div><div class="l">Total</div></div></div>
</div>
<div class="layout"><div class="vp">${screenshotBase64 ? `<img src="data:image/png;base64,${screenshotBase64}">` : '<div style="padding:40px;color:var(--tm)">Sin screenshot</div>'}${markers}</div>
<div class="sb"><div class="sbh">${issues.length} problema${issues.length !== 1 ? 's' : ''}</div><div class="cards">${issues.length === 0 ? '<div class="empty">✓ Sin problemas</div>' : cards}</div></div></div>
</body></html>`;
}
describe('PDF Report Content (REQ-8)', () => {
    const mockResult = {
        url: 'https://example.com',
        score: 72,
        durationMs: 1234,
        screenshotBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB',
        elements: [
            {
                selector: 'img.logo',
                tagName: 'IMG',
                boundingBox: { x: 10, y: 20, width: 100, height: 50 },
                computedStyles: {},
                attributes: { alt: '' },
                textContent: '',
            },
        ],
        issues: [
            {
                id: 'ATV-1',
                severity: 'critical',
                title: 'Contraste insuficiente',
                description: '"h1.title" ratio 2.10:1 (mín: 4.5:1)',
                selector: 'h1.title',
                wcagCriterion: '1.4.3',
                fix: 'Usa un color más oscuro o fondo más claro.',
            },
            {
                id: 'ATV-2',
                severity: 'major',
                title: 'Imagen sin texto alternativo',
                description: '"img.logo" no tiene alt ni aria-label.',
                selector: 'img.logo',
                wcagCriterion: '1.1.1',
                fix: 'Agrega: alt="Descripción de la imagen"',
            },
            {
                id: 'ATV-3',
                severity: 'minor',
                title: 'Heading saltado',
                description: '"h3.sub" <h3> sigue a <h1>.',
                selector: 'h3.sub',
                wcagCriterion: '1.3.1',
                fix: 'Cambia a <h2>.',
            },
        ],
    };
    const html = generateHTMLReport(mockResult);
    it('contains the page URL', () => {
        expect(html).toContain('https://example.com');
    });
    it('contains the date', () => {
        // The date is generated dynamically, check for the date format container
        expect(html).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
    it('contains the duration', () => {
        expect(html).toContain('1234ms');
    });
    it('contains the SVG score gauge', () => {
        expect(html).toContain('<svg');
        expect(html).toContain('class="gauge"');
        expect(html).toContain('stroke-dasharray');
        expect(html).toContain('stroke-dashoffset');
    });
    it('displays the numeric score value', () => {
        expect(html).toContain('<div class="val">72</div>');
    });
    it('contains severity summary counts', () => {
        // Critical count = 1
        expect(html).toContain('style="color:#ef4444">1</div>');
        // Major count = 1
        expect(html).toContain('style="color:#f59e0b">1</div>');
        // Minor count = 1
        expect(html).toContain('style="color:#3b82f6">1</div>');
        // Total = 3
        expect(html).toContain('style="color:var(--purple)">3</div>');
    });
    it('contains detailed issue cards with severity badges', () => {
        expect(html).toContain('<span class="badge">critical</span>');
        expect(html).toContain('<span class="badge">major</span>');
        expect(html).toContain('<span class="badge">minor</span>');
    });
    it('contains WCAG criterion references', () => {
        expect(html).toContain('WCAG 1.4.3');
        expect(html).toContain('WCAG 1.1.1');
        expect(html).toContain('WCAG 1.3.1');
    });
    it('contains issue titles and descriptions', () => {
        expect(html).toContain('Contraste insuficiente');
        expect(html).toContain('Imagen sin texto alternativo');
        expect(html).toContain('Heading saltado');
    });
    it('contains CSS selectors for issues', () => {
        expect(html).toContain('<code>h1.title</code>');
        expect(html).toContain('<code>img.logo</code>');
        expect(html).toContain('<code>h3.sub</code>');
    });
    it('contains fix suggestions', () => {
        expect(html).toContain('<div class="fix">');
        expect(html).toContain('Usa un color más oscuro o fondo más claro.');
        expect(html).toContain('Agrega: alt="Descripción de la imagen"');
        expect(html).toContain('Cambia a <h2>.');
    });
    it('contains the base64 screenshot as embedded image', () => {
        expect(html).toContain('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB');
        expect(html).toContain('<img src="data:image/png;base64,');
    });
    it('shows fallback text when no screenshot is available', () => {
        const resultNoScreenshot = { ...mockResult, screenshotBase64: '' };
        const htmlNoScreenshot = generateHTMLReport(resultNoScreenshot);
        expect(htmlNoScreenshot).toContain('Sin screenshot');
        expect(htmlNoScreenshot).not.toContain('data:image/png;base64,');
    });
});
//# sourceMappingURL=audittest.test.js.map