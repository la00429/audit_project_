# AuditTest Vision — Task Checklist

## Phase 1: Project Foundation
- [x] 1. Initialize package.json with dependencies
- [x] 2. Create tsconfig.json with strict mode
- [x] 3. Create .gitignore, .kiroignore, audit-rules.spec.json

## Phase 2: Core Engine & Modules
- [x] 4. Create src/core/auditEngine.ts — orchestrator
- [x] 5. Create src/modules/visualModule.ts — visual detection
- [x] 6. Create src/modules/wcagModule.ts — WCAG rules
- [x] 7. Create src/modules/autoFixModule.ts — fix generator

## Phase 3: Chrome Extension
- [x] 8. Create manifest.json (Manifest V3)
- [x] 9. Create popup.html + popup.ts
- [x] 10. Create content.ts + content.css
- [x] 11. Create background.ts (service worker)

## Phase 4: CLI Base
- [x] 12. Create src/cli/audittest.ts with base flags (--fix, --json, --screenshot)
- [x] 13. Create git-hook-pre-push.sh
- [x] 14. Verify CLI works with real URL (example.com)

## Phase 5: HTML Report
- [x] 15. Implement --report flag with screenshot overlay
- [x] 16. Add interactive markers + sidebar
- [x] 17. Add light/dark mode toggle

## Phase 6: Accessibility Score (v1.1.0)
- [x] 18. Implement scoring algorithm (100 - weighted deductions)
- [x] 19. Add score display to terminal output (colored bar)
- [x] 20. Add score gauge to HTML report
- [x] 21. Include score in JSON output

## Phase 7: URL Diff Comparison (v1.1.0)
- [x] 22. Implement --diff flag to accept second URL
- [x] 23. Run parallel audits on both URLs
- [x] 24. Calculate diff (new issues, fixed issues, persistent)
- [x] 25. Display diff in terminal with +/- indicators
- [x] 26. Add score delta display

## Phase 8: Watch Mode (v1.1.0)
- [x] 27. Implement --watch flag with 30s interval
- [x] 28. Track issues between runs (detect [NEW] and [FIXED])
- [x] 29. Display changes in terminal on each cycle
- [x] 30. Clean exit on Ctrl+C

## Phase 9: PDF Export (v1.1.0)
- [x] 31. Implement --pdf flag using Puppeteer to render HTML report
- [x] 32. Generate PDF with score, issues, and screenshot
- [x] 33. Save as audittest-report.pdf

## Phase 10: Documentation & Polish
- [x] 34. Update README.md with all new commands and examples
- [x] 35. Update landing page (docs/index.html)
- [x] 36. Update --help text with all flags
- [x] 37. Final build + npm publish v1.1.0

## Phase 11: Kiro Integration
- [x] 38. SDD requirements.md with EARS specs for all features
- [x] 39. SDD tasks.md (this file)
- [x] 40. Hooks: validate-env, lint-on-save, pre-push-audit
- [x] 41. Steering: audit-vision.md with standards


## Phase 12: Test Infrastructure Setup
- [x] 42. Set up Vitest test framework
  - [x] 42.1 Add `vitest` and `@vitest/coverage-v8` to devDependencies in package.json
    - Add `"vitest": "^3.0.0"` and `"@vitest/coverage-v8": "^3.0.0"` to devDependencies
    - _Requirements: NFR-3_
  - [x] 42.2 Add test scripts to package.json
    - Add `"test": "vitest --run"` and `"test:coverage": "vitest --run --coverage"` scripts
    - _Requirements: NFR-3_
  - [x] 42.3 Create `vitest.config.ts` at project root
    - Configure include patterns for `src/**/*.test.ts`
    - Set TypeScript environment and coverage thresholds
    - _Requirements: NFR-3_

## Phase 13: Configuration Loader (REQ-11)
- [x] 43. Implement config loading utility
  - [x] 43.1 Create `src/core/configLoader.ts`
    - Define `AuditConfig` interface matching `audit-rules.spec.json` schema
    - Implement `loadConfig(path?: string): AuditConfig` that reads and parses the JSON file
    - Return sensible defaults when the config file is missing or malformed
    - _Requirements: REQ-11_
  - [x] 43.2 Update `WcagModule` to accept config for rule enable/disable
    - Add optional `disabledRules?: string[]` parameter to constructor or `evaluate()`
    - Skip evaluation of rules whose `id` is in the disabled list
    - _Requirements: REQ-2, REQ-11_
  - [x] 43.3 Integrate config loader into CLI (`src/cli/audittest.ts`)
    - Load `audit-rules.spec.json` at startup
    - Pass disabled rules and gate thresholds to the audit pipeline
    - _Requirements: REQ-11, REQ-9_
  - [-]* 43.4 Write unit tests for configLoader
    - Test loading valid config, missing file (defaults), and malformed JSON
    - _Requirements: REQ-11_

## Phase 14: CLI Refactor — Use Core Engine
- [x] 44. Eliminate code duplication between CLI and core modules
  - [x] 44.1 Refactor `audittest.ts` to import and use `scoreCalculator`
    - Remove inline `calculateScore` function from CLI
    - Import `calculateScore` from `src/core/scoreCalculator.ts`
    - Map CLI `AuditIssue` type to engine `AuditIssue` for compatibility
    - _Requirements: REQ-5_
  - [x] 44.2 Refactor CLI audit rules to delegate to `WcagModule`
    - Remove inline rules 1-5, 7 from `runAudit()` in `audittest.ts`
    - Import and instantiate `WcagModule`, map CLI `ElementMeta` to `DOMElementMeta`
    - Keep rule 6 (viewport overflow) inline as it belongs to visual detection, not WCAG
    - _Requirements: REQ-2, Design: CLI → AuditEngine → Modules_

- [x] 45. Checkpoint — Ensure CLI still produces identical output after refactor
  - Ensure all tests pass, ask the user if questions arise.

## Phase 15: Missing WCAG Rule — Buttons/Links Accessible Names
- [x] 46. Add accessible name rule to WcagModule
  - [x] 46.1 Implement `accessibleNameRule()` in `src/modules/wcagModule.ts`
    - Detect `<button>` and `<a>` elements with no `textContent`, no `aria-label`, and no `aria-labelledby`
    - Report as severity `major`, criterion `1.1.1`, level `A`
    - Register the rule in the constructor's `this.rules` array
    - _Requirements: REQ-2 (1.1.1 Accessible Names)_
  - [-]* 46.2 Write unit tests for the new accessible name rule
    - Test buttons with text (pass), without text (fail), with aria-label (pass)
    - Test links with text (pass), without text and no aria-label (fail)
    - _Requirements: REQ-2_

## Phase 16: Unit Tests for Core Modules
- [ ] 47. Write unit tests for core modules
  - [-]* 47.1 Create `src/core/scoreCalculator.test.ts`
    - Test that score is always between 0 and 100
    - Test deductions are additive (critical=25, major=10, minor=3, info=0)
    - Test empty issues list returns score 100
    - Test grade classification boundaries (90, 70, 50, 0)
    - _Requirements: REQ-5_
  - [-]* 47.2 Create `src/modules/wcagModule.test.ts`
    - Test each rule detects known violations (missing alt, low contrast, missing label, heading skip, missing landmark, accessible name)
    - Test each rule passes for valid elements
    - _Requirements: REQ-2_
  - [-]* 47.3 Create `src/core/auditEngine.test.ts`
    - Test orchestration: engine calls all modules and merges results
    - Test `passesGate()` returns pass=true when 0 critical issues
    - Test `passesGate()` returns pass=false when critical issues exist
    - Mock VisualModule and AutoFixModule API calls
    - _Requirements: REQ-9_

- [x] 48. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 17: Extension Offline Fallback
- [x] 49. Implement local-first audit fallback in background.ts
  - [x] 49.1 Refactor `runAuditPipeline()` in `src/extension/background.ts`
    - Wrap the `fetch()` call in a try/catch
    - On network failure or non-2xx response, fall back to a local `runLocalAudit()` function
    - _Requirements: REQ-1_
  - [x] 49.2 Implement `runLocalAudit()` using bundled WcagModule
    - Import or inline a lightweight version of WcagModule + scoreCalculator
    - Run WCAG checks locally on the extracted DOM elements
    - Return an `AuditReport` with `module: 'wcag'` issues and calculated score
    - Skip VisualModule (requires LLM API) — mark in report that visual analysis was skipped
    - _Requirements: REQ-1, REQ-2_
  - [ ]* 49.3 Write unit tests for offline fallback logic
    - Test that when fetch throws, local audit runs successfully
    - Test that local audit produces valid AuditReport structure
    - _Requirements: REQ-1_

- [x] 50. Final checkpoint — Verify all phases pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes (Phase 12+)

- Phase 12 is a prerequisite for all test tasks in later phases
- Phase 13 (config loader) and Phase 15 (missing rule) are independent and can run in parallel
- Phase 14 (CLI refactor) depends on Phase 13 for config integration
- Phase 16 (unit tests) depends on Phases 12, 13, 14, and 15 being complete
- Phase 17 (offline fallback) is independent of Phases 13-16
- Tasks marked with `*` are optional and can be skipped for faster delivery

## Task Dependency Graph (Phase 12+)

```json
{
  "waves": [
    { "id": 0, "tasks": ["42.1", "42.2", "42.3"] },
    { "id": 1, "tasks": ["43.1", "46.1", "49.1"] },
    { "id": 2, "tasks": ["43.2", "43.3", "43.4", "46.2", "49.2"] },
    { "id": 3, "tasks": ["44.1", "49.3"] },
    { "id": 4, "tasks": ["44.2"] },
    { "id": 5, "tasks": ["47.1", "47.2", "47.3"] }
  ]
}
```
