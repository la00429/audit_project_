/**
 * AuditTest Vision — Background Service Worker (Offline-First)
 *
 * Runs the full WCAG audit LOCALLY without any external API calls.
 * All 7 rules execute inside the service worker using DOM metadata
 * extracted by the content script.
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
interface AuditIssue {
    id: string;
    severity: 'critical' | 'major' | 'minor' | 'info';
    title: string;
    description: string;
    selector?: string;
    wcagCriterion?: string;
    fix?: string;
}
interface AuditReport {
    timestamp: string;
    pageUrl: string;
    score: number;
    scoreLabel: string;
    totalIssues: number;
    criticalCount: number;
    majorCount: number;
    minorCount: number;
    issues: AuditIssue[];
    durationMs: number;
}
declare function handleAuditRequest(sendResponse: (response: {
    type: string;
    payload: unknown;
}) => void): Promise<void>;
declare function runLocalAudit(elements: DOMElementMeta[], pageUrl: string): AuditReport;
declare function parseRgb(color: string): [number, number, number] | null;
declare function relativeLuminance(rgb: [number, number, number]): number;
declare function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number;
//# sourceMappingURL=background.d.ts.map