/**
 * AuditTest Vision — Visual Analysis Module
 *
 * Uses a Vision LLM API to detect broken layouts, overlapping elements,
 * misalignment, and rendering anomalies from a page screenshot.
 *
 * The module sends the base64 screenshot alongside element bounding-box
 * metadata to the LLM, which returns structured issue findings.
 */
import { DOMElementMeta, Severity } from '../core/auditEngine';
export interface VisualIssue {
    title: string;
    description: string;
    severity: Severity;
    selector?: string;
    /** Bounding box of the problematic area in the screenshot */
    region?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export declare class VisualModule {
    private apiKey?;
    private apiEndpoint;
    constructor(apiKey?: string | undefined);
    /**
     * Analyze a screenshot for visual defects.
     * Sends the image + element metadata to the Vision LLM for inspection.
     */
    analyze(screenshotBase64: string, elements: DOMElementMeta[]): Promise<VisualIssue[]>;
    /** Construct the analysis prompt with element context */
    private buildPrompt;
    /** Call the Vision LLM API with screenshot and prompt */
    private callVisionAPI;
    /** Normalize LLM response into typed VisualIssue array */
    private parseResponse;
    /** Ensure severity is a valid enum value */
    private normalizeSeverity;
}
//# sourceMappingURL=visualModule.d.ts.map