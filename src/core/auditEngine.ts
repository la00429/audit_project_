/**
 * AuditTest Vision — Core Orchestrator
 *
 * This is the central engine that coordinates all audit modules.
 * It receives a page screenshot (base64) + DOM metadata, dispatches
 * analysis tasks to each module in parallel, and builds a unified report.
 *
 * Architecture: Modular Microkernel — each module is independent and
 * communicates only through well-defined interfaces.
 */

import { VisualModule, VisualIssue } from '../modules/visualModule';
import { WcagModule, WcagIssue } from '../modules/wcagModule';
import { AutoFixModule, FixPatch } from '../modules/autoFixModule';

// --- Shared Types ---

/** Metadata about a DOM element relevant to auditing */
export interface DOMElementMeta {
  selector: string;
  tagName: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  computedStyles?: Record<string, string>;
  attributes?: Record<string, string>;
  textContent?: string;
}

/** Input payload sent to the audit engine */
export interface AuditInput {
  /** Base64-encoded screenshot of the page */
  screenshot: string;
  /** URL of the page being audited */
  pageUrl: string;
  /** Extracted DOM element metadata for analysis */
  elements: DOMElementMeta[];
  /** Optional: raw HTML snippet for auto-fix context */
  htmlSnippet?: string;
}

/** Severity levels for reported issues */
export type Severity = 'critical' | 'major' | 'minor' | 'info';

/** A single issue in the unified audit report */
export interface AuditIssue {
  id: string;
  module: 'visual' | 'wcag' | 'autofix';
  severity: Severity;
  title: string;
  description: string;
  selector?: string;
  fix?: FixPatch;
}

/** The complete audit report returned by the engine */
export interface AuditReport {
  timestamp: string;
  pageUrl: string;
  totalIssues: number;
  criticalCount: number;
  issues: AuditIssue[];
  patches: FixPatch[];
  durationMs: number;
}

// --- Engine Implementation ---

export class AuditEngine {
  private visualModule: VisualModule;
  private wcagModule: WcagModule;
  private autoFixModule: AutoFixModule;

  constructor(private apiKey?: string) {
    // Each module is instantiated independently — microkernel pattern
    this.visualModule = new VisualModule(apiKey);
    this.wcagModule = new WcagModule();
    this.autoFixModule = new AutoFixModule(apiKey);
  }

  /**
   * Run a full audit pipeline:
   * 1. Dispatch visual analysis (Vision LLM)
   * 2. Run WCAG accessibility checks (rule-based)
   * 3. Generate auto-fix patches for detected issues
   * 4. Merge results into a unified report
   */
  async runAudit(input: AuditInput): Promise<AuditReport> {
    const startTime = Date.now();

    // Parallel dispatch — modules are independent
    const [visualIssues, wcagIssues] = await Promise.all([
      this.visualModule.analyze(input.screenshot, input.elements),
      this.wcagModule.evaluate(input.elements),
    ]);

    // Combine all detected issues for auto-fix generation
    const allDetectedIssues = [...visualIssues, ...wcagIssues];

    // Generate fix patches for issues that support auto-fix
    const patches = await this.autoFixModule.generateFixes(
      allDetectedIssues,
      input.elements,
      input.htmlSnippet
    );

    // Build unified report
    const issues = this.mergeIssues(visualIssues, wcagIssues, patches);
    const criticalCount = issues.filter(i => i.severity === 'critical').length;

    return {
      timestamp: new Date().toISOString(),
      pageUrl: input.pageUrl,
      totalIssues: issues.length,
      criticalCount,
      issues,
      patches,
      durationMs: Date.now() - startTime,
    };
  }

  /** Merge issues from all modules into a flat, ID'd list */
  private mergeIssues(
    visual: VisualIssue[],
    wcag: WcagIssue[],
    patches: FixPatch[]
  ): AuditIssue[] {
    const issues: AuditIssue[] = [];
    let counter = 0;

    // Map visual issues
    for (const v of visual) {
      const matchingPatch = patches.find(p => p.targetSelector === v.selector);
      issues.push({
        id: `ATV-${++counter}`,
        module: 'visual',
        severity: v.severity,
        title: v.title,
        description: v.description,
        selector: v.selector,
        fix: matchingPatch,
      });
    }

    // Map WCAG issues
    for (const w of wcag) {
      const matchingPatch = patches.find(p => p.targetSelector === w.selector);
      issues.push({
        id: `ATV-${++counter}`,
        module: 'wcag',
        severity: w.severity,
        title: w.title,
        description: w.description,
        selector: w.selector,
        fix: matchingPatch,
      });
    }

    return issues;
  }

  /**
   * Quick headless check — used by the git hook CLI.
   * Returns true if no critical issues are found.
   */
  async passesGate(input: AuditInput): Promise<{ pass: boolean; report: AuditReport }> {
    const report = await this.runAudit(input);
    return {
      pass: report.criticalCount === 0,
      report,
    };
  }
}
