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

// In a production build, these would be bundled. For clarity, we inline the core logic.
// In real deployment, use a bundler (esbuild/webpack) to import from '../core/auditEngine'

// --- Types (mirrored from core for service worker isolation) ---

interface DOMElementMeta {
  selector: string;
  tagName: string;
  boundingBox: { x: number; y: number; width: number; height: number };
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
    fix?: { code: string; fixType: string; description: string };
  }>;
  patches: Array<{ code: string; targetSelector: string; description: string }>;
  durationMs: number;
}

// --- Configuration ---

const API_ENDPOINT = 'https://api.audittest.local/v1/audit';

// --- Message Handler ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_AUDIT' || message.type === 'START_AUDIT_FROM_PAGE') {
    handleAuditRequest(sendResponse);
    return true; // Keep message channel open for async response
  }
  return false;
});

/** Full audit pipeline orchestration */
async function handleAuditRequest(
  sendResponse: (response: { type: string; payload: unknown }) => void
): Promise<void> {
  try {
    // Step 1: Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      sendResponse({ type: 'AUDIT_ERROR', payload: 'No active tab found' });
      return;
    }

    // Step 2: Capture screenshot as base64
    const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 90,
    });
    const screenshotBase64 = screenshotDataUrl.replace(/^data:image\/png;base64,/, '');

    // Step 3: Request DOM metadata from content script
    const domResponse = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_DOM' });
    const elements: DOMElementMeta[] = domResponse?.elements || [];

    // Step 4: Send to audit API (or run locally if bundled)
    const report = await runAuditPipeline(screenshotBase64, elements, tab.url || '');

    // Step 5: Send results back to popup
    sendResponse({ type: 'AUDIT_COMPLETE', payload: report });

    // Step 6: Notify content script to render visual badges
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_RESULTS',
        issues: report.issues.map(i => ({
          selector: i.selector,
          severity: i.severity,
          title: i.title,
        })),
      });
    }

    // Step 7: Store report in extension storage for later retrieval
    await chrome.storage.local.set({
      lastReport: report,
      lastAuditTime: Date.now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendResponse({ type: 'AUDIT_ERROR', payload: message });
  }
}

/**
 * Execute the audit pipeline.
 * In production, this calls the remote API.
 * For local dev, you can swap to a bundled AuditEngine instance.
 */
async function runAuditPipeline(
  screenshot: string,
  elements: DOMElementMeta[],
  pageUrl: string
): Promise<AuditReport> {
  const apiKey = await getStoredApiKey();

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      screenshot,
      pageUrl,
      elements,
    }),
  });

  if (!response.ok) {
    throw new Error(`Audit API error: ${response.status}`);
  }

  return response.json() as Promise<AuditReport>;
}

/** Retrieve API key from extension storage */
async function getStoredApiKey(): Promise<string | null> {
  const result = await chrome.storage.local.get('apiKey');
  return result.apiKey || null;
}
