/**
 * AuditTest Vision — Auto-Fix Module
 *
 * Generates CSS/HTML code patches to automatically fix detected issues.
 * Uses a combination of rule-based fixes (for WCAG) and LLM-generated
 * patches (for complex visual issues).
 *
 * Each patch includes the target selector, the fix type (CSS or HTML),
 * and the exact code to apply.
 */
// --- Module Implementation ---
export class AutoFixModule {
    apiKey;
    apiEndpoint;
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiEndpoint = process.env.AUTOFIX_API_ENDPOINT || 'https://api.audittest.local/v1/autofix';
    }
    /**
     * Generate fix patches for all detected issues.
     * Applies rule-based fixes first, then falls back to LLM for complex cases.
     */
    async generateFixes(issues, elements, htmlSnippet) {
        const patches = [];
        for (const issue of issues) {
            // Try rule-based fix first (fast, deterministic)
            const ruleFix = this.tryRuleBasedFix(issue, elements);
            if (ruleFix) {
                patches.push(ruleFix);
                continue;
            }
            // Fall back to LLM-generated fix for complex visual issues
            if (issue.selector) {
                const llmFix = await this.tryLLMFix(issue, elements, htmlSnippet);
                if (llmFix) {
                    patches.push(llmFix);
                }
            }
        }
        return patches;
    }
    /** Attempt to fix an issue using predefined rules */
    tryRuleBasedFix(issue, elements) {
        // WCAG: Missing alt text → add empty alt for decorative, or placeholder
        if (issue.title === 'Image missing alt text' && issue.selector) {
            return {
                targetSelector: issue.selector,
                fixType: 'attribute',
                description: 'Add descriptive alt attribute to image',
                code: `alt="[TODO: Add descriptive text]"`,
                confidence: 0.7,
                issueTitle: issue.title,
            };
        }
        // WCAG: Insufficient contrast → suggest darker foreground
        if (issue.title === 'Insufficient color contrast' && issue.selector) {
            const el = elements.find(e => e.selector === issue.selector);
            if (el?.computedStyles?.backgroundColor) {
                return {
                    targetSelector: issue.selector,
                    fixType: 'css',
                    description: 'Increase text color contrast to meet WCAG AA threshold',
                    code: `${issue.selector} {\n  color: #000000; /* High contrast fallback */\n}`,
                    confidence: 0.6,
                    issueTitle: issue.title,
                };
            }
        }
        // WCAG: Missing form label → add aria-label
        if (issue.title === 'Form input missing label' && issue.selector) {
            return {
                targetSelector: issue.selector,
                fixType: 'attribute',
                description: 'Add aria-label to form input for accessibility',
                code: `aria-label="[TODO: Add field description]"`,
                confidence: 0.8,
                issueTitle: issue.title,
            };
        }
        // Visual: Overflow issues → add overflow handling
        if (issue.title.toLowerCase().includes('overflow') && issue.selector) {
            return {
                targetSelector: issue.selector,
                fixType: 'css',
                description: 'Contain text overflow with ellipsis',
                code: `${issue.selector} {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}`,
                confidence: 0.65,
                issueTitle: issue.title,
            };
        }
        // Visual: Overlapping elements → add z-index fix
        if (issue.title.toLowerCase().includes('overlap') && issue.selector) {
            return {
                targetSelector: issue.selector,
                fixType: 'css',
                description: 'Fix element overlap with positioning adjustment',
                code: `${issue.selector} {\n  position: relative;\n  z-index: 1;\n}`,
                confidence: 0.5,
                issueTitle: issue.title,
            };
        }
        return null;
    }
    /** Use LLM to generate a fix for complex visual issues */
    async tryLLMFix(issue, elements, htmlSnippet) {
        try {
            const targetEl = elements.find(e => e.selector === issue.selector);
            const context = {
                issue: { title: issue.title, description: issue.description },
                element: targetEl,
                htmlSnippet: htmlSnippet?.slice(0, 2000), // Limit context size
            };
            const prompt = `You are a CSS/HTML expert. Generate a minimal fix for this UI issue:

Issue: ${issue.title}
Description: ${issue.description}
Element: ${targetEl?.tagName} at selector "${issue.selector}"
Bounding box: ${JSON.stringify(targetEl?.boundingBox)}
Current styles: ${JSON.stringify(targetEl?.computedStyles)}
${htmlSnippet ? `\nHTML context:\n${context.htmlSnippet}` : ''}

Return JSON: { "fixType": "css"|"html"|"attribute", "code": "...", "confidence": 0.0-1.0, "description": "..." }`;
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
                },
                body: JSON.stringify({
                    model: 'autofix-v1',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    max_tokens: 1024,
                }),
            });
            if (!response.ok)
                return null;
            const data = await response.json();
            const content = JSON.parse(data.choices?.[0]?.message?.content || '{}');
            if (!content.code)
                return null;
            return {
                targetSelector: issue.selector,
                fixType: content.fixType || 'css',
                description: content.description || `LLM-generated fix for: ${issue.title}`,
                code: content.code,
                confidence: Math.min(content.confidence || 0.5, 1.0),
                issueTitle: issue.title,
            };
        }
        catch (error) {
            console.error('[AutoFixModule] LLM fix generation failed:', error);
            return null;
        }
    }
}
//# sourceMappingURL=autoFixModule.js.map