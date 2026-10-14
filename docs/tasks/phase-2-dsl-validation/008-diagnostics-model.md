# 008 — Diagnostics model and reporter

Phase 2 · Status: in-progress · Depends on: 005 · PRD: §9.2 · ADR: —

## Goal
One diagnostic shape used by the filter, validator and CLI, printed in the
PRD §9.2 human format or as JSON, with stable error codes.

## Scope
- In: `Diagnostic` type + JSON Schema (`packages/validator`); human and JSON
  formatters; filter writes `.video-build/diagnostics.json`; CLI merges and
  prints; `--json` flag on `validate` and `render`; warnings don't fail.
- Out: line numbers (011, field stays optional), new checks.

## Deliverables
- `packages/validator/src/diagnostic.ts`, `schema/diagnostic.json`,
  `src/format.ts`.
- Lua helper to append diagnostics; existing filter errors converted
  (e.g. `E_SCENE_NO_COMPONENT`, `E_DURATION_SYNTAX`).
- "Diagnostic codes" table started in `packages/validator/README.md`.
- Fixtures `tests/fixtures/projects/diagnostics-*`.

## Definition of done
Automated:
- [ ] Snapshot tests of the human format for an error and a warning.
- [ ] `--json` output validates against `schema/diagnostic.json`.
- [ ] Only warnings → exit 0; any error → exit 1.
- [ ] Every emitted code appears in the README table (test scans source).

Human check:
1. `npx video validate tests/fixtures/projects/diagnostics-no-component`
   → output like
   `ERROR index.qmd` / `Scene "scene-002" has no component attribute.` /
   `Add component="<name>"`. Exit 1.
2. Same command with `--json` → a JSON array with `code`, `severity`,
   `sceneId`, `suggestion`.

## Notes

## Completion log
