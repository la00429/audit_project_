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

## REQ-2: WCAG Accessibility Audit

**The system shall** evaluate all visible DOM elements against the following WCAG 2.1 criteria:
- 1.1.1 Non-text Content (alt text on images) — Level A
- 1.3.1 Info and Relationships (form labels, heading hierarchy, landmarks) — Level A
- 1.4.3 Contrast Minimum (4.5:1 ratio for normal text, 3:1 for large text) — Level AA
- 1.1.1 Accessible Names (buttons/links without text) — Level A

**When** a WCAG violation is detected,
**the system shall** report it with the specific criterion reference, severity level, and the CSS selector of the offending element.

**Where** the `audit-rules.spec.json` configuration disables a specific rule,
**the system shall** skip evaluation of that rule.

## REQ-3: Visual Layout Detection

**When** a page screenshot and DOM element metadata are available,
**the system shall** analyze element bounding boxes to detect:
- Elements overflowing beyond the viewport width (1280px)
- Text overflow and truncation issues

**The system shall** report visual issues with the affected selector and the amount of overflow in pixels.

## REQ-4: Auto-Fix Suggestions

**When** an issue is detected that matches a known fix pattern,
**the system shall** generate a concrete CSS/HTML suggestion to resolve the problem.

**Each** generated suggestion **shall** include:
- Target CSS selector
- Fix type (css | html | attribute)
- The code to apply
- A human-readable description

## REQ-5: Accessibility Score (0-100)

**When** an audit completes,
**the system shall** calculate an accessibility score between 0 and 100 based on:
- Total rules evaluated (7 categories)
- Number of issues found weighted by severity (critical = 25pts, major = 10pts, minor = 3pts)
- Score formula: max(0, 100 - sum_of_weighted_deductions)

**The system shall** display the score prominently in:
- Terminal output (with colored progress bar)
- HTML report (as a circular gauge)
- JSON output (as numeric field)

**The system shall** classify scores as:
- 90-100: Excellent (green)
- 70-89: Good (yellow)
- 50-69: Needs Work (orange)
- 0-49: Poor (red)

## REQ-6: URL Comparison (--diff)

**When** the user provides a `--diff <url2>` flag,
**the system shall** audit both URLs and produce a comparison report showing:
- Issues that exist only in URL1 (regressions)
- Issues that exist only in URL2 (improvements)
- Issues that exist in both (persistent)
- Score change between the two pages

**The system shall** output the diff in terminal with colored indicators (+/-) and in the HTML report with side-by-side comparison.

## REQ-7: Watch Mode (--watch)

**When** the user provides a `--watch` flag,
**the system shall** re-run the audit every 30 seconds against the same URL.

**When** new issues appear between runs,
**the system shall** display them in the terminal with a [NEW] tag.

**When** issues are resolved between runs,
**the system shall** display them with a [FIXED] tag.

**The system shall** continue watching until the user presses Ctrl+C.

## REQ-8: PDF Export (--pdf)

**When** the user provides a `--pdf` flag,
**the system shall** generate a PDF file containing:
- Page URL, date, and duration
- Accessibility score gauge
- Summary of issues by severity
- Detailed issue list with selectors and fix suggestions
- Screenshot of the page (if available)

**The system shall** name the output file `audittest-report.pdf`.

## REQ-9: Git Hook Pre-Push Quality Gate

**When** a developer executes `git push`,
**the system shall** run a headless Puppeteer-based audit against the local build or dev server.

**When** the number of critical issues exceeds the threshold defined in `audit-rules.spec.json`,
**the system shall** block the push and display a colored error summary.

**When** no dev server or built HTML file is found,
**the system shall** skip the audit and allow the push to proceed.

## REQ-10: CLI Documentation

**The system shall** provide comprehensive built-in documentation via `--help` that includes:
- All available flags with descriptions
- Usage examples for every command combination
- List of WCAG rules evaluated with their levels
- Output format explanations

**The system shall** document all CLI commands in the following locations:
- README.md (with examples and expected output)
- Landing page (docs/index.html) with interactive demo
- `--help` flag output in the terminal
- SDD specs (this file) for development reference

**Each** CLI flag **shall** be documented with:
- Flag name and shorthand (if any)
- Description of behavior
- Example usage
- Expected output format

### CLI Command Reference

| Flag | Description | Example |
|------|-------------|---------|
| `<url>` | URL or file path to audit | `npx audittest-vision https://google.com` |
| `--fix` | Show auto-fix suggestions | `npx audittest-vision url --fix` |
| `--report` | Generate interactive HTML report | `npx audittest-vision url --report` |
| `--json` | Output as JSON (for CI/CD) | `npx audittest-vision url --json` |
| `--pdf` | Export report as PDF | `npx audittest-vision url --pdf` |
| `--screenshot` | Save page screenshot as PNG | `npx audittest-vision url --screenshot` |
| `--diff <url2>` | Compare two URLs | `npx audittest-vision url1 --diff url2` |
| `--watch` | Re-audit every 30s (dev mode) | `npx audittest-vision url --watch` |
| `--help, -h` | Show help documentation | `npx audittest-vision --help` |

## REQ-11: Configuration

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
- **NFR-5:** The HTML report shall render correctly in Chrome, Firefox, and Safari.
- **NFR-6:** The CLI shall support both HTTP URLs and local file paths.
- **NFR-7:** The PDF export shall complete within 10 seconds for standard pages.
