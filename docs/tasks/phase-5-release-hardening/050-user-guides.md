# 050 — User guides

Phase 5 · Status: todo · Depends on: 049 · PRD: §14 (1, 12), §15 (Phase 5) · ADR: reads 0007

## Goal
Published documentation lets a new author install, author, validate, render,
extend and troubleshoot using nothing else.

## Scope
- In: `docs/guides/` — installation, authoring (DSL reference generated or
  checked against the extension README), CLI reference, diagnostics
  reference (every code with fix), extending (new component/preset
  checklist), troubleshooting, versioning and migration (from ADR-0007);
  starter template `videos/_template/`; root `README.md` quickstart.
- Out: website hosting.

## Deliverables
- `docs/guides/*.md`, `videos/_template/index.qmd`, updated `README.md`.
- Docs test: every code in the validator README appears in the diagnostics
  guide; every command in guides exists in `video --help`; every `.qmd`
  snippet in guides validates.

## Definition of done
Automated:
- [ ] Docs tests pass.
- [ ] `video validate videos/_template` → OK.

Human check:
1. Following only `docs/guides/authoring.md`, create a new project from
   `videos/_template`, add a statistic scene, render it.
2. Introduce three typical mistakes; for each, the diagnostics guide explains
   the fix.

## Notes

## Completion log
