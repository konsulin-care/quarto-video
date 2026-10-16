# 034 — Component `comparison`

Phase 3 · Status: done · Depends on: 024 · PRD: §5.4 (5), §5.5, §10.2 · ADR: —

## Goal
Release the `comparison` component: two or more structured content areas side by side.

## Scope
- In: slots `left`, `right` (required) and optional `middle`, or `columns` of 2–3; each area accepts heading/paragraph/list.
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/comparison.json`.
- Renderer `renderer/remotion/components/comparison/` + `registry-map.ts` entry.
- Docs `docs/components/comparison.md` from the component template.
- Fixture `tests/fixtures/projects/component-comparison/` (valid) and
  `component-comparison-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/comparison-*.json` with references.

## Definition of done
Automated:
- [x] Contract validates; parity test passes; `video components` lists `comparison`.
- [x] Each contract violation in the invalid fixture yields its code and line.
- [x] Missing `right` → `E_SLOT_REQUIRED` at the scene line. The code is `E_SLOT_REQUIRED` (as in 024, shared with `title`, `statement`, `bullets`); `E_SLOT_MISSING` does not exist and is not used. Verified: invalid fixture, scene at line 9.
- [x] Unequal content lengths keep columns aligned at the top (visual case `comparison-uneven`).
- [x] Every compatible animation renders without clipping (visual cases `comparison-animations`, `comparison-reveal`).

Human check:
- [ ] `npx video render tests/fixtures/projects/component-comparison` and watch the playback. Awaiting human playback (see Notes).
- [x] Stills review against `docs/components/comparison.md`: legible at 1080p, no clipping or overlap. Verified on fresh render stills at 0.5 s, 8.0 s and 15.7 s.
- [x] `npx video validate tests/fixtures/projects/component-comparison-invalid` gives one actionable error per violating scene. Verified: five errors at lines 9, 15, 29, 41, 51.

## Notes
- The branch was fast-forwarded from `ae2677a` to the base `aa6ada2` at the start.
- "Columns of 2–3" is `left` + `right`, or `left` + `middle` + `right` when `middle` has text. There is no `columns` slot.
- The renderer gets plain text per slot (ADR-0004): headings, paragraphs and list items look alike, and bullets are not drawn. Listed as a known limit in the page.
- `compatibleTransitions` is `[]`, as in `title`.
- Shared-file edits: `packages/registry/animations/{fade-in,reveal,slide-up}.json` (comparison added); `packages/registry/test/animations.test.ts`, `packages/registry/test/components.test.ts`, `tests/integration/contract.test.ts` (expected component lists); `renderer/remotion/src/registry-map.ts` (import and entry); `docs/components/README.md` (status, row, animation cells); `package.json` (one integration test).
- Awaiting human playback: the MP4 was rendered and checked as stills only (0.5 s, 8.0 s, 15.7 s). Nobody has watched it in motion.
- Gates need `QV_BROWSER_EXECUTABLE` set (`renderer/remotion/README.md`). Without it, `component-chart.test.ts` fails in `test.sh`; set it to the Chromium headless shell and rerun.

## Completion log
- 2026-10-15: released `comparison` (contract, renderer, docs, fixtures, four visual cases with 13 references; key stills viewed before approval). `test:visual` passed for all 77 frames, including the 13 comparison frames. `flash-presets` was still running at the report and is not verified.
- 2026-10-15: closed. `E_SLOT_REQUIRED` checked at line 9 of the invalid fixture (decision: this is the code; `E_SLOT_MISSING` is not used). Stills rendered and viewed; invalid fixture validated (five errors, lines 9/15/29/41/51). Gates with `QV_BROWSER_EXECUTABLE` set: `check.sh --all` passed; `test.sh --all` EXIT=0 (`scratchpad/comparison-test.log`); `test:visual` EXIT=0 (`scratchpad/comparison-visual.log`). Human playback check remains open.
