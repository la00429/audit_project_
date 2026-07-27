/**
 * AuditTest Vision — WCAG Accessibility Module
 *
 * Evaluates basic accessibility rules against DOM element metadata:
 * - Color contrast ratio (WCAG 2.1 AA/AAA thresholds)
 * - Missing alt attributes on images
 * - Missing form labels
 * - Incorrect heading hierarchy
 * - Missing ARIA landmarks
 *
 * This module is purely rule-based (no LLM calls) for speed and determinism.
 */
// --- Module Implementation ---
export class WcagModule {
    rules;
    disabledRules;
    constructor(disabledRules) {
        this.disabledRules = new Set(disabledRules || []);
        // Register all built-in WCAG rules
        this.rules = [
            this.missingAltTextRule(),
            this.colorContrastRule(),
            this.missingFormLabelRule(),
            this.headingHierarchyRule(),
            this.missingLandmarkRule(),
            this.accessibleNameRule(),
        ];
    }
    /** Run all WCAG rules against the provided elements */
    async evaluate(elements) {
        const issues = [];
        for (const rule of this.rules) {
            if (this.disabledRules.has(rule.id))
                continue; // Skip disabled rules
            const ruleIssues = rule.evaluate(elements);
            issues.push(...ruleIssues);
        }
        return issues;
    }
    // --- Rule Implementations ---
    /** WCAG 1.1.1 — Non-text content must have alt text */
    missingAltTextRule() {
        return {
            id: 'missing-alt',
            criterion: '1.1.1',
            level: 'A',
            evaluate: (elements) => {
                return elements
                    .filter(el => el.tagName.toLowerCase() === 'img')
                    .filter(el => !el.attributes?.['alt'] && !el.attributes?.['aria-label'])
                    .map(el => ({
                    title: 'Image missing alt text',
                    description: `<img> element at "${el.selector}" has no alt attribute or aria-label. Screen readers cannot describe this image.`,
                    severity: 'major',
                    selector: el.selector,
                    wcagCriterion: '1.1.1',
                    level: 'A',
                }));
            },
        };
    }
    /** WCAG 1.4.3 — Minimum color contrast ratio of 4.5:1 (AA) */
    colorContrastRule() {
        return {
            id: 'color-contrast',
            criterion: '1.4.3',
            level: 'AA',
            evaluate: (elements) => {
                const issues = [];
                for (const el of elements) {
                    if (!el.computedStyles?.color || !el.computedStyles?.backgroundColor)
                        continue;
                    if (!el.textContent?.trim())
                        continue;
                    const fgColor = this.parseColor(el.computedStyles.color);
                    const bgColor = this.parseColor(el.computedStyles.backgroundColor);
                    if (!fgColor || !bgColor)
                        continue;
                    const ratio = this.contrastRatio(fgColor, bgColor);
                    const isLargeText = this.isLargeText(el);
                    const threshold = isLargeText ? 3.0 : 4.5;
                    if (ratio < threshold) {
                        issues.push({
                            title: 'Insufficient color contrast',
                            description: `Element "${el.selector}" has contrast ratio ${ratio.toFixed(2)}:1 (minimum ${threshold}:1 required). FG: ${el.computedStyles.color}, BG: ${el.computedStyles.backgroundColor}`,
                            severity: ratio < 3.0 ? 'critical' : 'major',
                            selector: el.selector,
                            wcagCriterion: '1.4.3',
                            level: 'AA',
                        });
                    }
                }
                return issues;
            },
        };
    }
    /** WCAG 1.3.1 — Form inputs must have associated labels */
    missingFormLabelRule() {
        return {
            id: 'missing-label',
            criterion: '1.3.1',
            level: 'A',
            evaluate: (elements) => {
                const inputTypes = ['input', 'select', 'textarea'];
                return elements
                    .filter(el => inputTypes.includes(el.tagName.toLowerCase()))
                    .filter(el => !el.attributes?.['aria-label'] && !el.attributes?.['aria-labelledby'] && !el.attributes?.['id'])
                    .map(el => ({
                    title: 'Form input missing label',
                    description: `<${el.tagName}> at "${el.selector}" has no associated <label>, aria-label, or aria-labelledby. Users with assistive technology cannot identify this field.`,
                    severity: 'major',
                    selector: el.selector,
                    wcagCriterion: '1.3.1',
                    level: 'A',
                }));
            },
        };
    }
    /** WCAG 1.3.1 — Heading levels should not skip (e.g., h1 → h3) */
    headingHierarchyRule() {
        return {
            id: 'heading-order',
            criterion: '1.3.1',
            level: 'A',
            evaluate: (elements) => {
                const issues = [];
                const headings = elements
                    .filter(el => /^h[1-6]$/i.test(el.tagName))
                    .sort((a, b) => a.boundingBox.y - b.boundingBox.y); // Sort by DOM order (vertical position)
                for (let i = 1; i < headings.length; i++) {
                    const prevLevel = parseInt(headings[i - 1].tagName[1]);
                    const currLevel = parseInt(headings[i].tagName[1]);
                    if (currLevel > prevLevel + 1) {
                        issues.push({
                            title: 'Skipped heading level',
                            description: `Heading "${headings[i].selector}" is <${headings[i].tagName}> but follows <${headings[i - 1].tagName}>. Heading levels should not skip (e.g., h2 should not jump to h4).`,
                            severity: 'minor',
                            selector: headings[i].selector,
                            wcagCriterion: '1.3.1',
                            level: 'A',
                        });
                    }
                }
                return issues;
            },
        };
    }
    /** WCAG 1.3.1 — Page should have landmark regions */
    missingLandmarkRule() {
        return {
            id: 'missing-landmark',
            criterion: '1.3.1',
            level: 'A',
            evaluate: (elements) => {
                const landmarks = ['main', 'nav', 'header', 'footer', 'aside'];
                const hasLandmark = elements.some(el => landmarks.includes(el.tagName.toLowerCase()) || !!el.attributes?.['role']);
                if (!hasLandmark && elements.length > 0) {
                    return [{
                            title: 'No landmark regions found',
                            description: 'The page has no semantic landmark elements (<main>, <nav>, <header>, etc.) or ARIA role attributes. Landmarks help screen reader users navigate page sections.',
                            severity: 'minor',
                            wcagCriterion: '1.3.1',
                            level: 'A',
                        }];
                }
                return [];
            },
        };
    }
    /** WCAG 1.1.1 — Buttons and links must have accessible names */
    accessibleNameRule() {
        return {
            id: 'accessible-name',
            criterion: '1.1.1',
            level: 'A',
            evaluate: (elements) => {
                const interactiveElements = ['button', 'a'];
                return elements
                    .filter(el => interactiveElements.includes(el.tagName.toLowerCase()))
                    .filter(el => !el.textContent?.trim() && !el.attributes?.['aria-label'] && !el.attributes?.['aria-labelledby'])
                    .map(el => ({
                    title: 'Button/link missing accessible name',
                    description: `<${el.tagName.toLowerCase()}> at "${el.selector}" has no text content, aria-label, or aria-labelledby. Screen readers cannot identify the purpose of this element.`,
                    severity: 'major',
                    selector: el.selector,
                    wcagCriterion: '1.1.1',
                    level: 'A',
                }));
            },
        };
    }
    // --- Utility Methods ---
    /** Parse CSS color string to RGB tuple */
    parseColor(color) {
        // Handle rgb(r, g, b) format
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
            return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
        }
        // Handle hex format
        const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
        if (hexMatch) {
            const hex = hexMatch[1];
            return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
        }
        return null;
    }
    /** Calculate relative luminance (WCAG formula) */
    relativeLuminance(rgb) {
        const [r, g, b] = rgb.map(c => {
            const sRGB = c / 255;
            return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    /** Calculate contrast ratio between two colors */
    contrastRatio(fg, bg) {
        const lum1 = this.relativeLuminance(fg);
        const lum2 = this.relativeLuminance(bg);
        const lighter = Math.max(lum1, lum2);
        const darker = Math.min(lum1, lum2);
        return (lighter + 0.05) / (darker + 0.05);
    }
    /** Determine if text is "large" per WCAG (18px+ or 14px+ bold) */
    isLargeText(el) {
        const fontSize = parseFloat(el.computedStyles?.fontSize || '16');
        const fontWeight = parseInt(el.computedStyles?.fontWeight || '400');
        return fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
    }
}
//# sourceMappingURL=wcagModule.js.map