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
import { FixPatch } from '../modules/autoFixModule';
/** Metadata about a DOM element relevant to auditing */
export interface DOMElementMeta {
    selector: string;
    tagName: string;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    computedStyles?: Record<string, string>;
    attributes?: Record<string, string>;
    textContent?: string;
}
/** Input payload sent to the audit engine */
export interface AuditInput {
    /** Base64-encoded screenshot of the page */
    screenshot: string;
    /** URL of the page being audited */
    pageUrl: string;
    /** Extracted DOM element metadata for analysis */
    elements: DOMElementMeta[];
    /** Optional: raw HTML snippet for auto-fix context */
    htmlSnippet?: string;
}
/** Severity levels for reported issues */
export type Severity = 'critical' | 'major' | 'minor' | 'info';
/** A single issue in the unified audit report */
export interface AuditIssue {
    id: string;
    module: 'visual' | 'wcag' | 'autofix';
    severity: Severity;
    title: string;
    description: string;
    selector?: string;
    fix?: FixPatch;
}
/** The complete audit report returned by the engine */
export interface AuditReport {
    timestamp: string;
    pageUrl: string;
    totalIssues: number;
    criticalCount: number;
    issues: AuditIssue[];
    patches: FixPatch[];
    durationMs: number;
}
export declare class AuditEngine {
    private apiKey?;
    private visualModule;
    private wcagModule;
    private autoFixModule;
    constructor(apiKey?: string | undefined);
    /**
     * Run a full audit pipeline:
     * 1. Dispatch visual analysis (Vision LLM)
     * 2. Run WCAG accessibility checks (rule-based)
     * 3. Generate auto-fix patches for detected issues
     * 4. Merge results into a unified report
     */
    runAudit(input: AuditInput): Promise<AuditReport>;
    /** Merge issues from all modules into a flat, ID'd list */
    private mergeIssues;
    /**
     * Quick headless check — used by the git hook CLI.
     * Returns true if no critical issues are found.
     */
    passesGate(input: AuditInput): Promise<{
        pass: boolean;
        report: AuditReport;
    }>;
}
//# sourceMappingURL=auditEngine.d.ts.map