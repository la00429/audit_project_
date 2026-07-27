# AuditTest Vision — Design Architecture

## Overview

AuditTest Vision follows a **Modular Microkernel** architecture where the Audit Engine acts as a lightweight orchestrator, delegating analysis to independent, pluggable modules. Each module has a single responsibility and communicates through well-defined TypeScript interfaces.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ENTRY POINTS                                 │
├──────────────────┬──────────────────────────────────────────────────┤
│ Chrome Extension │              CLI Git Hook                         │
│ (content.ts)     │         (git-hook-pre-push.sh)                    │
└────────┬─────────┘              │                                    │
         │                        │                                    │
         ▼                        ▼                                    │
┌─────────────────────────────────────────────────┐                   │
│            DOM / Screenshot Collector            │                   │
│  • captureVisibleTab() or Puppeteer.screenshot()│                   │
│  • Extract element bounding boxes               │                   │
│  • Extract computed styles + attributes         │                   │
│  • Output: AuditInput { screenshot, elements }  │                   │
└────────────────────────┬────────────────────────┘                   │
                         │                                             │
                         ▼                                             │
┌─────────────────────────────────────────────────┐                   │
│              AUDIT ENGINE (Orchestrator)          │                   │
│  • Receives AuditInput                           │                   │
│  • Dispatches to modules in PARALLEL             │                   │
│  • Merges results into AuditReport               │                   │
│  • Exposes passesGate() for CLI                  │                   │
└──────┬──────────────┬──────────────┬────────────┘                   │
       │              │              │                                  │
       ▼              ▼              ▼                                  │
┌────────────┐ ┌────────────┐ ┌─────────────┐                         │
│  VISUAL    │ │   WCAG     │ │  AUTO-FIX   │                         │
│  MODULE    │ │  MODULE    │ │   MODULE    │                         │
│            │ │            │ │             │                         │
│ Vision LLM │ │ Rule-based │ │ Rules + LLM │                         │
│ API call   │ │ evaluator  │ │ fallback    │                         │
└─────┬──────┘ └─────┬──────┘ └──────┬──────┘                         │
      │               │               │                                │
      ▼               ▼               ▼                                │
┌─────────────────────────────────────────────────┐                   │
│                UNIFIED REPORT                    │                   │
│  • AuditIssue[] with IDs, severity, selectors   │                   │
│  • FixPatch[] with code + confidence             │                   │
│  • Metadata: timestamp, duration, URL            │                   │
└────────────────────────┬────────────────────────┘                   │
                         │                                             │
              ┌──────────┼──────────┐                                  │
              ▼          ▼          ▼                                   │
         ┌────────┐ ┌────────┐ ┌────────┐                             │
         │ Popup  │ │ Badges │ │ Gate   │                             │
         │ UI     │ │ on DOM │ │Decision│                             │
         └────────┘ └────────┘ └────────┘                             │
└─────────────────────────────────────────────────────────────────────┘
```

## Module Interfaces

### AuditInput (shared)
```typescript
interface AuditInput {
  screenshot: string;         // base64 PNG
  pageUrl: string;
  elements: DOMElementMeta[];
  htmlSnippet?: string;
}
```

### DOMElementMeta (shared)
```typescript
interface DOMElementMeta {
  selector: string;
  tagName: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  computedStyles?: Record<string, string>;
  attributes?: Record<string, string>;
  textContent?: string;
}
```

### Module Contracts

| Module | Input | Output | Side Effects |
|--------|-------|--------|--------------|
| VisualModule | screenshot + elements | VisualIssue[] | HTTP call to Vision LLM |
| WcagModule | elements | WcagIssue[] | None (pure computation) |
| AutoFixModule | issues + elements + html | FixPatch[] | HTTP call to Fix LLM (fallback) |

## Extension Architecture (Chrome Manifest V3)

```
popup.html ─── popup.ts (UI controller)
                    │
                    │ chrome.runtime.sendMessage('START_AUDIT')
                    ▼
background.ts (service worker)
    │
    ├── chrome.tabs.captureVisibleTab() → screenshot
    ├── chrome.tabs.sendMessage('EXTRACT_DOM') → elements
    ├── fetch(API) → AuditReport
    │
    └── chrome.tabs.sendMessage('SHOW_RESULTS') → badges
                    │
                    ▼
content.ts (page context)
    ├── extractDOMMetadata() → elements
    ├── injectFloatingButton() → FAB overlay
    └── renderIssueBadges() → visual diff markers
```

## Configuration Loading

```
audit-rules.spec.json
    │
    ├── wcag.rules.* → WcagModule (enable/disable checks)
    ├── visual.checks.* → VisualModule (toggle detections)
    ├── autoFix.allow* → AutoFixModule (permissions)
    └── gates.prePush.* → CLI hook (threshold)
```

## Security Considerations

- API keys stored in `chrome.storage.local` (extension) or `.env` (CLI) — never committed
- Screenshots are processed in memory and never persisted unless `reporting.includeScreenshots` is true
- LLM API calls use HTTPS with Bearer auth; no sensitive DOM data is logged
- Pre-push hook respects `--no-verify` escape hatch

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Language | TypeScript 5.4+ | Type safety, strict mode |
| Extension | Chrome Manifest V3 | Modern extension API |
| Headless | Puppeteer 22+ | Reliable screenshot + DOM |
| Build | tsc (direct) | Zero-config, fast |
| Lint | ESLint 9 | Flat config, modern |
