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
  fix?: { code: string; fixType: string; description: string };
}

interface PopupReport {
  totalIssues: number;
  criticalCount: number;
  issues: PopupIssue[];
  patches: Array<{ code: string; targetSelector: string; description: string }>;
  pageUrl: string;
  timestamp: string;
  durationMs: number;
}

// --- DOM Elements ---
const startBtn = document.getElementById('start-audit-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const resultsEl = document.getElementById('results') as HTMLDivElement;
const criticalCountEl = document.getElementById('critical-count') as HTMLDivElement;
const majorCountEl = document.getElementById('major-count') as HTMLDivElement;
const minorCountEl = document.getElementById('minor-count') as HTMLDivElement;
const issueListEl = document.getElementById('issue-list') as HTMLDivElement;
const exportGithubBtn = document.getElementById('export-github-btn') as HTMLButtonElement;
const copyFixesBtn = document.getElementById('copy-fixes-btn') as HTMLButtonElement;

let currentReport: PopupReport | null = null;

// --- Event Handlers ---

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  setStatus('Capturing screenshot...');

  // Send message to background service worker to start the audit
  chrome.runtime.sendMessage({ type: 'START_AUDIT' }, (response: AuditMessage) => {
    if (response?.type === 'AUDIT_COMPLETE') {
      currentReport = response.payload as PopupReport;
      renderResults(currentReport);
    } else if (response?.type === 'AUDIT_ERROR') {
      setStatus(`Error: ${response.payload}`);
    }
    startBtn.disabled = false;
  });
});

exportGithubBtn.addEventListener('click', () => {
  if (!currentReport) return;
  const payload = generateGithubIssue(currentReport);
  navigator.clipboard.writeText(payload).then(() => {
    exportGithubBtn.textContent = 'Copied!';
    setTimeout(() => { exportGithubBtn.textContent = 'Export as GitHub Issue'; }, 2000);
  });
});

copyFixesBtn.addEventListener('click', () => {
  if (!currentReport?.patches.length) return;
  const allFixes = currentReport.patches
    .map(p => `/* Fix: ${p.description} */\n/* Target: ${p.targetSelector} */\n${p.code}`)
    .join('\n\n');
  navigator.clipboard.writeText(allFixes).then(() => {
    copyFixesBtn.textContent = 'Copied!';
    setTimeout(() => { copyFixesBtn.textContent = 'Copy All Fixes'; }, 2000);
  });
});

// --- Rendering ---

function setStatus(message: string) {
  statusEl.textContent = message;
  statusEl.classList.add('active');
}

function renderResults(report: PopupReport) {
  statusEl.classList.remove('active');
  resultsEl.classList.add('active');

  // Update summary counts
  const critical = report.issues.filter(i => i.severity === 'critical').length;
  const major = report.issues.filter(i => i.severity === 'major').length;
  const minor = report.issues.filter(i => i.severity === 'minor' || i.severity === 'info').length;

  criticalCountEl.textContent = String(critical);
  majorCountEl.textContent = String(major);
  minorCountEl.textContent = String(minor);

  // Render issue cards
  issueListEl.innerHTML = '';
  for (const issue of report.issues) {
    const card = document.createElement('div');
    card.className = `issue-item ${issue.severity}`;
    card.innerHTML = `
      <div class="title">[${issue.module.toUpperCase()}] ${issue.title}</div>
      <div class="desc">${issue.description}</div>
      ${issue.fix ? `<button class="fix-btn" data-code="${encodeURIComponent(issue.fix.code)}">Copy Fix: ${issue.fix.fixType.toUpperCase()}</button>` : ''}
    `;
    issueListEl.appendChild(card);
  }

  // Attach fix copy handlers
  issueListEl.querySelectorAll('.fix-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const code = decodeURIComponent((e.target as HTMLElement).getAttribute('data-code') || '');
      navigator.clipboard.writeText(code).then(() => {
        (e.target as HTMLElement).textContent = 'Copied!';
        setTimeout(() => { (e.target as HTMLElement).textContent = 'Copy Fix'; }, 1500);
      });
    });
  });
}

// --- GitHub Issue Generator ---

function generateGithubIssue(report: PopupReport): string {
  const issueLines = report.issues.map(
    i => `- **[${i.severity.toUpperCase()}]** ${i.title}\n  ${i.description}${i.selector ? `\n  Selector: \`${i.selector}\`` : ''}`
  ).join('\n');

  return `## AuditTest Vision Report

**Page:** ${report.pageUrl}
**Date:** ${report.timestamp}
**Duration:** ${report.durationMs}ms
**Total Issues:** ${report.totalIssues} (${report.criticalCount} critical)

### Issues Found

${issueLines}

### Auto-Fix Patches

${report.patches.length > 0
  ? report.patches.map(p => `\`\`\`css\n/* ${p.description} */\n${p.code}\n\`\`\``).join('\n\n')
  : '_No auto-fixes available_'}

---
*Generated by AuditTest Vision v1.0.0*`;
}
