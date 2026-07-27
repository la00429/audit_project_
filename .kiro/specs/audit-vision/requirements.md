# AuditTest Vision — Requirements (EARS Format)

## REQ-1: Chrome Extension UI

**When** the user clicks the "Start Audit" floating button on any webpage,
**the system shall** capture a full-page screenshot using `chrome.tabs.captureVisibleTab()` and extract DOM metadata from all visible elements.

**When** the audit analysis completes,
**the system shall** display results in the extension popup with severity badges (critical, major, minor) and a scrollable issue list.

**When** a detected issue has an available auto-fix,
**the system shall** provide a "Copy Fix" button that copies the CSS/HTML patch to the clipboard.

**When** the user clicks "Export as GitHub Issue",
**the system shall** generate a markdown-formatted issue body containing all findings, severities, selectors, and auto-fix patches.

## REQ-2: Vision LLM Analysis

**When** a page screenshot and DOM element metadata are available,
**the system shall** dispatch them to the Vision LLM API for visual defect detection.

**The system shall** detect the following visual anomalies:
- Overlapping elements that should not overlap
- Misaligned components (broken grid/flexbox)
- Text overflow or truncation
- Elements rendered outside viewport bounds
- Broken image placeholders or missing assets
- Inconsistent spacing or padding

**When** the Vision API is unreachable or returns an error,
**the system shall** gracefully degrade by returning an empty issue set without blocking the audit pipeline.

## REQ-3: WCAG Accessibility Audit

**The system shall** evaluate all visible DOM elements against the following WCAG 2.1 criteria:
- 1.1.1 Non-text Content (alt text on images) — Level A
- 1.3.1 Info and Relationships (form labels, heading hierarchy, landmarks) — Level A
- 1.4.3 Contrast Minimum (4.5:1 ratio for normal text, 3:1 for large text) — Level AA

**When** a WCAG violation is detected,
**the system shall** report it with the specific criterion reference, severity level, and the CSS selector of the offending element.

**Where** the `audit-rules.spec.json` configuration disables a specific rule,
**the system shall** skip evaluation of that rule.

## REQ-4: Auto-Fix CSS/HTML Generation

**When** an issue is detected that matches a known fix pattern (missing alt, low contrast, missing label, overflow, overlap),
**the system shall** generate a deterministic rule-based patch with a confidence score.

**When** an issue does not match any rule-based pattern,
**the system shall** delegate fix generation to the Auto-Fix LLM API.

**The system shall** never apply fixes automatically — all patches are presented for user review and manual copy.

**Each** generated patch **shall** include:
- Target CSS selector
- Fix type (css | html | attribute)
- The code to apply
- A confidence score between 0.0 and 1.0
- A human-readable description

## REQ-5: Git Hook Pre-Push Quality Gate

**When** a developer executes `git push`,
**the system shall** run a headless Puppeteer-based audit against the local build or dev server.

**When** the number of critical issues exceeds the threshold defined in `audit-rules.spec.json` (`gates.prePush.maxCritical`),
**the system shall** block the push and display a colored error summary in the terminal.

**When** no dev server or built HTML file is found,
**the system shall** skip the audit and allow the push to proceed.

## REQ-6: Configuration

**The system shall** read all audit parameters from `audit-rules.spec.json` at the project root, including:
- WCAG level and per-rule enable/disable toggles
- Visual check toggles and viewport dimensions
- Auto-fix permissions (css, html, attribute)
- Quality gate thresholds for pre-push and pre-merge

## Non-Functional Requirements

- **NFR-1:** The WCAG module shall execute in under 500ms for pages with up to 500 elements.
- **NFR-2:** The Chrome Extension popup shall render initial UI within 100ms of opening.
- **NFR-3:** All TypeScript code shall compile with `strict: true` and zero warnings.
- **NFR-4:** The pre-push hook shall complete within 30 seconds or timeout gracefully.
