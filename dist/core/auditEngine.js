/**
 * AuditTest Vision — Core Orchestrator
 *
 * This is the central engine that coordinates all audit modules.
 * It receives a page screenshot (base64) + DOM metadata, dispatches
 * analysis tasks to each module in parallel, and builds a unified report.
 *
 * Architecture: Modular Microkernel — each module is independent and
 * communicates only through well-defined interfaces.
 */
import { VisualModule } from '../modules/visualModule';
import { WcagModule } from '../modules/wcagModule';
import { AutoFixModule } from '../modules/autoFixModule';
// --- Engine Implementation ---
export class AuditEngine {
    apiKey;
    visualModule;
    wcagModule;
    autoFixModule;
    constructor(apiKey) {
        this.apiKey = apiKey;
        // Each module is instantiated independently — microkernel pattern
        this.visualModule = new VisualModule(apiKey);
        this.wcagModule = new WcagModule();
        this.autoFixModule = new AutoFixModule(apiKey);
    }
    /**
     * Run a full audit pipeline:
     * 1. Dispatch visual analysis (Vision LLM)
     * 2. Run WCAG accessibility checks (rule-based)
     * 3. Generate auto-fix patches for detected issues
     * 4. Merge results into a unified report
     */
    async runAudit(input) {
        const startTime = Date.now();
        // Parallel dispatch — modules are independent
        const [visualIssues, wcagIssues] = await Promise.all([
            this.visualModule.analyze(input.screenshot, input.elements),
            this.wcagModule.evaluate(input.elements),
        ]);
        // Combine all detected issues for auto-fix generation
        const allDetectedIssues = [...visualIssues, ...wcagIssues];
        // Generate fix patches for issues that support auto-fix
        const patches = await this.autoFixModule.generateFixes(allDetectedIssues, input.elements, input.htmlSnippet);
        // Build unified report
        const issues = this.mergeIssues(visualIssues, wcagIssues, patches);
        const criticalCount = issues.filter(i => i.severity === 'critical').length;
        return {
            timestamp: new Date().toISOString(),
            pageUrl: input.pageUrl,
            totalIssues: issues.length,
            criticalCount,
            issues,
            patches,
            durationMs: Date.now() - startTime,
        };
    }
    /** Merge issues from all modules into a flat, ID'd list */
    mergeIssues(visual, wcag, patches) {
        const issues = [];
        let counter = 0;
        // Map visual issues
        for (const v of visual) {
            const matchingPatch = patches.find(p => p.targetSelector === v.selector);
            issues.push({
                id: `ATV-${++counter}`,
                module: 'visual',
                severity: v.severity,
                title: v.title,
                description: v.description,
                selector: v.selector,
                fix: matchingPatch,
            });
        }
        // Map WCAG issues
        for (const w of wcag) {
            const matchingPatch = patches.find(p => p.targetSelector === w.selector);
            issues.push({
                id: `ATV-${++counter}`,
                module: 'wcag',
                severity: w.severity,
                title: w.title,
                description: w.description,
                selector: w.selector,
                fix: matchingPatch,
            });
        }
        return issues;
    }
    /**
     * Quick headless check — used by the git hook CLI.
     * Returns true if no critical issues are found.
     */
    async passesGate(input) {
        const report = await this.runAudit(input);
        return {
            pass: report.criticalCount === 0,
            report,
        };
    }
}
//# sourceMappingURL=auditEngine.js.map