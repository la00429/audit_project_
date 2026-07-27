---
inclusion: auto
---

# AuditTest Vision — Steering Rules

## Project Context

This is "AuditTest Vision", an AI-powered QA auditing tool for developers. It uses a modular microkernel architecture with a Chrome Extension frontend, Vision LLM for visual analysis, rule-based WCAG checks, and an auto-fix generator.

## Code Standards

- All source code is TypeScript with `strict: true`
- Use ESNext modules (`import/export`, no CommonJS in src/)
- Follow modular microkernel pattern: modules are independent, communicate only through interfaces defined in `src/core/auditEngine.ts`
- Inline comments should explain architectural decisions, not restate code
- No `any` types — use proper generics or `unknown` with type guards

## File Structure Rules

- Core orchestrator logic: `src/core/`
- Analysis modules: `src/modules/` (one file per module)
- Chrome Extension files: `src/extension/`
- CLI automation: `src/cli/`
- Configuration: `audit-rules.spec.json` at project root

## Configuration Reference

#[[file:audit-rules.spec.json]]

When modifying audit behavior, always check and respect the settings in `audit-rules.spec.json`:
- Disabled rules should not be evaluated
- Gate thresholds determine pass/fail for CLI hooks
- Auto-fix permissions control what patch types are generated

## API & Security

- Never commit API keys or `.env` files
- API endpoints are configured via environment variables: `VISION_API_ENDPOINT`, `AUTOFIX_API_ENDPOINT`, `AUDITTEST_API_KEY`
- All LLM API calls must handle errors gracefully (return empty results, never throw to caller)
- Screenshots are ephemeral — only persist if `reporting.includeScreenshots` is enabled in config

## Chrome Extension Conventions

- Use Manifest V3 APIs exclusively (no Manifest V2 patterns)
- Background uses service worker (no persistent background page)
- Content script communicates with background via `chrome.runtime.sendMessage`
- Never inject styles that could conflict with page CSS (use unique prefixes like `audittest-`)

## Testing & Verification

- Run `npx tsc --noEmit` after any TypeScript changes to verify compilation
- The pre-push git hook uses Puppeteer headless — ensure `puppeteer` is installed
- Quality gates read from `audit-rules.spec.json` — respect configured thresholds

## Commit Guidelines

- Keep commits atomic: one logical change per commit
- Commit messages: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` prefixes
- Always verify that `audit-rules.spec.json` gates are respected before pushing
