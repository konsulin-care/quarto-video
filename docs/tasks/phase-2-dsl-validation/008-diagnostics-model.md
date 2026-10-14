# 008 — Diagnostics model and reporter

Phase 2 · Status: done · Depends on: 005 · PRD: §9.2 · ADR: —

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
- [x] Snapshot tests of the human format for an error and a warning.
  (`packages/validator/test/format.test.ts`; block output in `validate-diagnostics.test.ts`)
- [x] `--json` output validates against `schema/diagnostic.json`.
  (`validate-diagnostics.test.ts` parses stdout with the schema; `schema.test.ts`)
- [ ] Only warnings → exit 0; any error → exit 1. Partial: the predicate
  (`hasErrors`, `format.test.ts`) and the exit paths are covered; no check emits
  a warning yet, so the end-to-end warnings case is not tested. See Notes.
- [x] Every emitted code appears in the README table (test scans source).
  (`packages/validator/test/codes.test.ts`)

Human check:
1. `npx video validate tests/fixtures/projects/diagnostics-no-component`
   → output like
   `ERROR index.qmd` / `Scene "scene-002" has no component attribute.` /
   `Add component="<name>"`. Exit 1.
2. Same command with `--json` → a JSON array with `code`, `severity`,
   `sceneId`, `suggestion`.

## Notes
- Codes are listed in `packages/validator/README.md`. The CLI adds
  `E_IR_SCHEMA` (IR schema errors) and `E_FILTER_FAILED` (a filter run with
  no usable diagnostics).
- Filter errors are raised as values carrying diagnostics (`lib/diagnostics.lua`).
  Each stage collects all its errors. A scene stops at its first error.
- `--json` writes the array to stdout only. `render --json` prints warnings
  before progress. `--print-ir` and `--json` cannot be combined.
- Existing test expectations were updated to the new text: `ERROR <file>`
  headers, new scene messages (`Scene "scene-00N" has no component attribute.`),
  and the IR error now names `.video-build/manifest.json`.
- Automated box 3 is open: no check emits a warning, so exit 0 with only
  warnings is covered by the `hasErrors` test, not end to end. Add a warning
  source (a new check) before relying on it.

## Completion log
- 2026-10-14 · Implemented the diagnostic model (`packages/validator`), the
  filter's coded errors and `diagnostics.json`, CLI printing and `--json` for
  `validate` and `render`.
  Tests: `packages/validator/test/{format,schema,codes}.test.ts`;
  `_extensions/video/tests/test_diagnostics.lua` plus updated `test_scenes`,
  `test_settings`, `test_duration`; `tests/integration/validate-diagnostics.test.ts`;
  updated `validate.test.ts` and `cli-render.test.ts`.
  Human check 1 and 2 run and matched (see the report).
  Not run here: Quarto render and Remotion tests (no quarto, no Chromium).
  Filter tests ran with a `quarto pandoc` stand-in over pandoc 3.1.3.
- Follow-ups: a warning-emitting check (box 3 end to end); line numbers (011);
  the `E_FILTER_FAILED` case has no committed fixture (the test builds one in a
  scratch dir); verify against the pinned Quarto 1.10.19 with real `quarto pandoc`.
