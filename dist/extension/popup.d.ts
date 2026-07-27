/**
 * AuditTest Vision — Popup Controller (Offline-First)
 *
 * Handles the extension popup UI:
 * - Start Audit triggers local WCAG analysis
 * - Shows accessibility score (0-100)
 * - Renders issue list with severity badges
 * - Copy fixes and Export as GitHub Issue
 */
interface AuditMessage {
    type: string;
    payload?: unknown;
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
    score: number;
    scoreLabel: string;
    totalIssues: number;
    criticalCount: number;
    majorCount: number;
    minorCount: number;
    issues: AuditIssue[];
    pageUrl: string;
    timestamp: string;
    durationMs: number;
}
declare const startBtn: HTMLButtonElement;
declare const statusEl: HTMLDivElement;
declare const resultsEl: HTMLDivElement;
declare const scoreEl: HTMLDivElement;
declare const scoreLabelEl: HTMLDivElement;
declare const criticalCountEl: HTMLDivElement;
declare const majorCountEl: HTMLDivElement;
declare const minorCountEl: HTMLDivElement;
declare const issueListEl: HTMLDivElement;
declare const exportGithubBtn: HTMLButtonElement;
declare const copyFixesBtn: HTMLButtonElement;
declare let currentReport: AuditReport | null;
declare function setStatus(message: string): void;
declare function renderResults(report: AuditReport): void;
declare function generateGithubIssue(report: AuditReport): string;
//# sourceMappingURL=popup.d.ts.map