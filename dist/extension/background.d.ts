/**
 * AuditTest Vision — Background Service Worker
 *
 * Manifest V3 service worker that orchestrates the audit pipeline:
 * 1. Captures visible tab screenshot via chrome.tabs API
 * 2. Requests DOM metadata from content script
 * 3. Dispatches to the AuditEngine for analysis
 * 4. Returns results to popup and content script
 *
 * Runs in the extension's background context (no DOM access).
 */
interface DOMElementMeta {
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
interface AuditReport {
    timestamp: string;
    pageUrl: string;
    totalIssues: number;
    criticalCount: number;
    issues: Array<{
        id: string;
        module: string;
        severity: string;
        title: string;
        description: string;
        selector?: string;
        fix?: {
            code: string;
            fixType: string;
            description: string;
        };
    }>;
    patches: Array<{
        code: string;
        targetSelector: string;
        description: string;
    }>;
    durationMs: number;
}
declare const API_ENDPOINT = "https://api.audittest.local/v1/audit";
/** Full audit pipeline orchestration */
declare function handleAuditRequest(sendResponse: (response: {
    type: string;
    payload: unknown;
}) => void): Promise<void>;
/**
 * Execute the audit pipeline.
 * In production, this calls the remote API.
 * For local dev, you can swap to a bundled AuditEngine instance.
 */
declare function runAuditPipeline(screenshot: string, elements: DOMElementMeta[], pageUrl: string): Promise<AuditReport>;
/** Retrieve API key from extension storage */
declare function getStoredApiKey(): Promise<string | null>;
//# sourceMappingURL=background.d.ts.map