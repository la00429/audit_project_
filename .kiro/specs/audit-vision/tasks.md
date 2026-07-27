# AuditTest Vision — Task Checklist

## Phase 1: Project Foundation

- [x] 1. Initialize `package.json` with TypeScript, Puppeteer, and @types/chrome dependencies
- [x] 2. Create `tsconfig.json` with strict mode and ESNext module configuration
- [x] 3. Create `tsconfig.extension.json` extending base config for Chrome extension output
- [x] 4. Create `.gitignore` excluding node_modules, dist, secrets, and temp files
- [x] 5. Create `.kiroignore` excluding screenshots, recordings, and build artifacts
- [x] 6. Create `audit-rules.spec.json` with WCAG, visual, autofix, and gate configurations

## Phase 2: Core Engine & Modules

- [x] 7. Create `src/core/auditEngine.ts` — orchestrator with parallel module dispatch and report builder
- [x] 8. Create `src/modules/visualModule.ts` — Vision LLM API integration with structured prompt
- [x] 9. Create `src/modules/wcagModule.ts` — rule-based checks: alt, contrast, labels, headings, landmarks
- [x] 10. Create `src/modules/autoFixModule.ts` — rule-based + LLM fallback patch generator

## Phase 3: Chrome Extension

- [x] 11. Create `src/extension/manifest.json` — Manifest V3 with permissions and service worker
- [x] 12. Create `src/extension/popup.html` — dark-themed popup with summary cards and issue list
- [x] 13. Create `src/extension/popup.ts` — popup controller with audit trigger, result rendering, GitHub export
- [x] 14. Create `src/extension/content.ts` — DOM extractor, floating FAB, and visual badge renderer
- [x] 15. Create `src/extension/content.css` — minimal overlay styles with pulse animation
- [x] 16. Create `src/extension/background.ts` — service worker orchestrating screenshot, DOM, API, storage

## Phase 4: CLI & Automation

- [x] 17. Create `src/cli/git-hook-pre-push.sh` — headless Puppeteer audit with quality gate blocking

## Phase 5: Kiro Integration

- [x] 18. Create `.kiro/specs/audit-vision/requirements.md` — EARS-format functional specs
- [x] 19. Create `.kiro/specs/audit-vision/design.md` — architecture and data flow diagrams
- [x] 20. Create `.kiro/specs/audit-vision/tasks.md` — this file (step-by-step checklist)
- [ ] 21. Create `.kiro/settings/mcp.json` — MCP server configurations for filesystem, browser, and git
- [ ] 22. Create Kiro hooks: validate-env (PreTaskExec), lint-on-save (PostFileSave), pre-push-audit (PreToolUse)
- [ ] 23. Create `.kiro/steering/audit-vision.md` — project steering rules for consistent behavior

## Phase 6: Verification

- [ ] 24. Run `npm install` to verify dependency resolution
- [ ] 25. Run `npm run build` (tsc) to verify zero compilation errors
- [ ] 26. Verify Chrome extension loads in `chrome://extensions/` developer mode
- [ ] 27. Run pre-push hook against a sample HTML file to confirm gate logic
