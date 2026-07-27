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
import { DOMElementMeta, Severity } from '../core/auditEngine';
export interface WcagIssue {
    title: string;
    description: string;
    severity: Severity;
    selector?: string;
    wcagCriterion: string;
    level: 'A' | 'AA' | 'AAA';
}
export declare class WcagModule {
    private rules;
    private disabledRules;
    constructor(disabledRules?: string[]);
    /** Run all WCAG rules against the provided elements */
    evaluate(elements: DOMElementMeta[]): Promise<WcagIssue[]>;
    /** WCAG 1.1.1 — Non-text content must have alt text */
    private missingAltTextRule;
    /** WCAG 1.4.3 — Minimum color contrast ratio of 4.5:1 (AA) */
    private colorContrastRule;
    /** WCAG 1.3.1 — Form inputs must have associated labels */
    private missingFormLabelRule;
    /** WCAG 1.3.1 — Heading levels should not skip (e.g., h1 → h3) */
    private headingHierarchyRule;
    /** WCAG 1.3.1 — Page should have landmark regions */
    private missingLandmarkRule;
    /** WCAG 1.1.1 — Buttons and links must have accessible names */
    private accessibleNameRule;
    /** Parse CSS color string to RGB tuple */
    private parseColor;
    /** Calculate relative luminance (WCAG formula) */
    private relativeLuminance;
    /** Calculate contrast ratio between two colors */
    private contrastRatio;
    /** Determine if text is "large" per WCAG (18px+ or 14px+ bold) */
    private isLargeText;
}
//# sourceMappingURL=wcagModule.d.ts.map