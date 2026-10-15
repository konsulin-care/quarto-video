# 034 — Component `comparison`

Phase 3 · Status: in-progress · Depends on: 024 · PRD: §5.4 (5), §5.5, §10.2 · ADR: —

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
- [ ] Missing `right` → `E_SLOT_MISSING`. Partly met: the behaviour is checked (`E_SLOT_REQUIRED` at the scene line), but `E_SLOT_MISSING` does not exist; the validator's code for a missing required slot is `E_SLOT_REQUIRED`, as in task 024.
- [x] Unequal content lengths keep columns aligned at the top (visual case `comparison-uneven`).
- [x] Every compatible animation renders without clipping (visual cases `comparison-animations`, `comparison-reveal`).

Human check:
1. `npx video render tests/fixtures/projects/component-comparison` and watch it. Partly met: rendered to MP4 in a scratch copy; extracted stills at 3.0 s, 5.5 s and 15.9 s. Playback not watched.
2. Review against `docs/components/comparison.md`: legible at 1080p, theme, no clipping or overlap. Met on the stills viewed (two-column, three-column, uneven, reveal end state, and animation frames).
3. `npx video validate tests/fixtures/projects/component-comparison-invalid` → one actionable error per violating scene. Met: five errors at lines 9, 15, 29, 41, 51.

## Notes
- The branch was fast-forwarded from `ae2677a` to the base `aa6ada2` at the start.
- "Columns of 2–3" is `left` + `right`, or `left` + `middle` + `right` when `middle` has text. There is no `columns` slot.
- The renderer gets plain text per slot (ADR-0004): headings, paragraphs and list items look alike, and bullets are not drawn. Listed as a known limit in the page.
- `compatibleTransitions` is `[]`, as in `title`.
- Shared-file edits: `packages/registry/animations/{fade-in,reveal,slide-up}.json` (comparison added); `packages/registry/test/animations.test.ts`, `packages/registry/test/components.test.ts`, `tests/integration/contract.test.ts` (expected component lists); `renderer/remotion/src/registry-map.ts` (import and entry); `docs/components/README.md` (status, row, animation cells); `package.json` (one integration test).
- Gate: `check.sh --all` exit 0 (`scratchpad/a503-final-check.log`). `test.sh --all` exit 1 in this worktree: 2 of 90 integration checks fail (`quarto-render.test.ts`, the videos/hello post-render hook). Cause: the worktree sits under `.claude/`, and Quarto does not run post-render hooks under a hidden path (reproduced with a hidden parent directory). The same test file passes 3/3 on an export of this branch outside hidden paths. The task therefore stays in-progress until the gate is run from a non-hidden path.

## Completion log
- 2026-10-15: released `comparison` (contract, renderer, docs, fixtures, four visual cases with 13 references; key stills viewed before approval). `test:visual` passed for all 77 frames, including the 13 comparison frames. `flash-presets` was still running at the report and is not verified.
