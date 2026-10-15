# 025 — Component `statement`

Phase 3 · Status: in-progress · Depends on: 024 · PRD: §5.4 (2), §5.5, §10.2 · ADR: —

## Goal
Release the `statement` component: one prominent message or key sentence.

## Scope
- In: slot `default` (required, ≤ 1 paragraph; longer → warning); emphasis via `strong` rendered with accent token.
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/statement.json`.
- Renderer `renderer/remotion/components/statement/` + `registry-map.ts` entry.
- Docs `docs/components/statement.md` from the component template.
- Fixture `tests/fixtures/projects/component-statement/` (valid) and
  `component-statement-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/statement-*.json` with references.

## Definition of done
Automated:
- [x] Contract validates; parity test passes; `video components` lists `statement`.
- [x] Each contract violation in the invalid fixture yields its code and line.
- [x] A 3-line statement scales down within its token range, never below the minimum legible size; beyond that → validation warning. (`layout.test.ts`; `component-statement-warn` yields `W_TEXT_FIT`; visual `statement-small`.)
- [x] `strong` text uses the accent colour (visual case `statement-basic`; accent check below).
- [x] Met (2026-10-15): `fade-in` and `slide-up` checked mid-entrance and at end (`statement-animations`). `reveal` clips nothing (task 021 redesign); its visual case covers the end state only, so its entrance is not captured here.

Human check:
1. [ ] Partly met: `video render` exit 0 (1920x1080, 30 fps, 450 frames); reviewed from stills at 1 s, 7.5 s and 14.7 s, not played back.
2. [x] Legible at 1080p, theme-consistent, no clipped or overlapping text (stills; `reveal` clips nothing by design since the task 021 redesign).
3. [ ] Partly met: 5 scenes, 6 errors. Scene 1 has two (`E_SLOT_UNKNOWN` and `E_SLOT_REQUIRED`): a statement with only an unknown slot has no default, and an empty scene is an IR schema error.

## Notes
- Base: worktree fast-forwarded to aa6ada2 (no own commits). `node_modules` is `npm ci`, not the main checkout's (it has ajv 6, the workspace needs 8).
- Additive contract fields: slot `maxBlocks`, contract `textFit` (`{max, min}` on the type scale). New warnings `W_SLOT_TOO_MANY_BLOCKS` and `W_TEXT_FIT`.
- Fit rule: `packages/registry/src/layout.ts`, a 0.6 em glyph estimate, shared by the validator and the renderer (`@quarto-video/registry/layout`).
- Renderer: `SceneProps.blocks` keeps inline emphasis; `strong` takes `colors.accent`. `reveal`, `fade-in` and `slide-up` now list `statement`.
- Accent check: `modern.json` accent changed to `#FF3366`; `statement-basic` FAILED (0.57% and 0.97% of pixels, diff images written). Reverted; `git diff` empty.
- Gates not green in the worktree, so Status stays `in-progress`. `check.sh --all` exit 0. `test.sh --all` exit 1: `quarto render videos/hello/index.qmd` writes no "Wrote output.mp4" in the worktree (exit 0, hook not run), but the same suite passes in a clean `git archive` copy. Cause not found. Under load (average ~38 on 4 CPUs) spawned-CLI tests hit 5 s timeouts (`ir/cli`, `cli/tools`).
- Not exercised: `E_ANIMATION_INCOMPATIBLE` (no preset excludes `statement`).

## Completion log
- 2026-10-15: `statement` built (contract, renderer, docs, fixtures, three visual cases with approved references, integration test). Gates pending the worktree quarto issue above.
