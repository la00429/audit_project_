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
import { DOMElementMeta } from '../core/auditEngine';
import { VisualIssue } from './visualModule';
import { WcagIssue } from './wcagModule';
export interface FixPatch {
    /** CSS selector or XPath of the element to fix */
    targetSelector: string;
    /** Type of fix being applied */
    fixType: 'css' | 'html' | 'attribute';
    /** Human-readable description of what this fix does */
    description: string;
    /** The actual code patch to apply */
    code: string;
    /** Confidence level of the fix (0-1) */
    confidence: number;
    /** The issue this patch addresses */
    issueTitle: string;
}
type DetectedIssue = VisualIssue | WcagIssue;
export declare class AutoFixModule {
    private apiKey?;
    private apiEndpoint;
    constructor(apiKey?: string | undefined);
    /**
     * Generate fix patches for all detected issues.
     * Applies rule-based fixes first, then falls back to LLM for complex cases.
     */
    generateFixes(issues: DetectedIssue[], elements: DOMElementMeta[], htmlSnippet?: string): Promise<FixPatch[]>;
    /** Attempt to fix an issue using predefined rules */
    private tryRuleBasedFix;
    /** Use LLM to generate a fix for complex visual issues */
    private tryLLMFix;
}
export {};
//# sourceMappingURL=autoFixModule.d.ts.map