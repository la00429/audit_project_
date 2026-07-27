/**
 * AuditTest Vision — Popup Controller
 *
 * Handles the extension popup UI interactions:
 * - Start Audit button triggers screenshot capture + analysis
 * - Renders audit results with severity badges
 * - Provides "Copy Fix" and "Export as GitHub Issue" actions
 */
interface AuditMessage {
    type: string;
    payload?: unknown;
}
interface PopupIssue {
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
}
interface PopupReport {
    totalIssues: number;
    criticalCount: number;
    issues: PopupIssue[];
    patches: Array<{
        code: string;
        targetSelector: string;
        description: string;
    }>;
    pageUrl: string;
    timestamp: string;
    durationMs: number;
}
declare const startBtn: HTMLButtonElement;
declare const statusEl: HTMLDivElement;
declare const resultsEl: HTMLDivElement;
declare const criticalCountEl: HTMLDivElement;
declare const majorCountEl: HTMLDivElement;
declare const minorCountEl: HTMLDivElement;
declare const issueListEl: HTMLDivElement;
declare const exportGithubBtn: HTMLButtonElement;
declare const copyFixesBtn: HTMLButtonElement;
declare let currentReport: PopupReport | null;
declare function setStatus(message: string): void;
declare function renderResults(report: PopupReport): void;
declare function generateGithubIssue(report: PopupReport): string;
//# sourceMappingURL=popup.d.ts.map