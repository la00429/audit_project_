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
- [ ] 18. Implement scoring algorithm (100 - weighted deductions)
- [ ] 19. Add score display to terminal output (colored bar)
- [ ] 20. Add score gauge to HTML report
- [ ] 21. Include score in JSON output

## Phase 7: URL Diff Comparison (v1.1.0)
- [ ] 22. Implement --diff flag to accept second URL
- [ ] 23. Run parallel audits on both URLs
- [ ] 24. Calculate diff (new issues, fixed issues, persistent)
- [ ] 25. Display diff in terminal with +/- indicators
- [ ] 26. Add score delta display

## Phase 8: Watch Mode (v1.1.0)
- [ ] 27. Implement --watch flag with 30s interval
- [ ] 28. Track issues between runs (detect [NEW] and [FIXED])
- [ ] 29. Display changes in terminal on each cycle
- [ ] 30. Clean exit on Ctrl+C

## Phase 9: PDF Export (v1.1.0)
- [ ] 31. Implement --pdf flag using Puppeteer to render HTML report
- [ ] 32. Generate PDF with score, issues, and screenshot
- [ ] 33. Save as audittest-report.pdf

## Phase 10: Documentation & Polish
- [ ] 34. Update README.md with all new commands and examples
- [ ] 35. Update landing page (docs/index.html)
- [ ] 36. Update --help text with all flags
- [ ] 37. Final build + npm publish v1.1.0

## Phase 11: Kiro Integration
- [x] 38. SDD requirements.md with EARS specs for all features
- [x] 39. SDD tasks.md (this file)
- [x] 40. Hooks: validate-env, lint-on-save, pre-push-audit
- [x] 41. Steering: audit-vision.md with standards
