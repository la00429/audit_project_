/**
 * AuditTest Vision — Content Script
 *
 * Injected into every page to:
 * 1. Extract DOM element metadata (bounding boxes, styles, attributes)
 * 2. Render the floating "Start Audit" button overlay
 * 3. Display visual diff badges on elements with detected issues
 *
 * Communicates with the background service worker via chrome.runtime messages.
 */
interface ElementMeta {
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
interface AuditResultMessage {
    type: string;
    issues?: Array<{
        selector?: string;
        severity: string;
        title: string;
    }>;
}
/**
 * Walks the DOM tree and extracts metadata for audit-relevant elements.
 * Limits collection to visible elements with meaningful content.
 */
declare function extractDOMMetadata(): ElementMeta[];
/** Generate a unique CSS selector for an element */
declare function generateSelector(el: Element): string;
/** Extract relevant HTML attributes from an element */
declare function extractAttributes(el: Element): Record<string, string>;
declare function injectFloatingButton(): void;
declare function renderIssueBadges(issues: Array<{
    selector?: string;
    severity: string;
    title: string;
}>): void;
//# sourceMappingURL=content.d.ts.map