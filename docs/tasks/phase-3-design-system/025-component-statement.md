# 025 — Component `statement`

Phase 3 · Status: done · Depends on: 024 · PRD: §5.4 (2), §5.5, §10.2 · ADR: —

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
1. [ ] Awaiting human playback. Automated part met 2026-10-15: `video render` exit 0 (1920x1080, 30 fps, 450 frames); stills at 0.5 s, 7.5 s and 14.7 s viewed. Left unticked: motion has not been watched.
2. [x] Legible at 1080p, theme-consistent, no clipped or overlapping text (stills; `reveal` clips nothing by design since the task 021 redesign).
3. [x] Met 2026-10-15: `validate` gives 6 errors over 5 scenes, lines 9, 9, 15, 23, 28, 32, matching `expected.json`. Scene 1 yields two (`E_SLOT_UNKNOWN` and `E_SLOT_REQUIRED`): a statement with only an unknown slot has no default, and an empty scene is an IR schema error.

## Notes
- Base: worktree fast-forwarded to aa6ada2 (no own commits). `node_modules` is `npm ci`, not the main checkout's (it has ajv 6, the workspace needs 8).
- Additive contract fields: slot `maxBlocks`, contract `textFit` (`{max, min}` on the type scale). New warnings `W_SLOT_TOO_MANY_BLOCKS` and `W_TEXT_FIT`.
- Fit rule: `packages/registry/src/layout.ts`, a 0.6 em glyph estimate, shared by the validator and the renderer (`@quarto-video/registry/layout`).
- Renderer: `SceneProps.blocks` keeps inline emphasis; `strong` takes `colors.accent`. `reveal`, `fade-in` and `slide-up` now list `statement`.
- Accent check: `modern.json` accent changed to `#FF3366`; `statement-basic` FAILED (0.57% and 0.97% of pixels, diff images written). Reverted; `git diff` empty.
- Not exercised: `E_ANIMATION_INCOMPATIBLE` (no preset excludes `statement`).
- Awaiting human playback: Human check 1 (watch the render in motion; stills and the automated checks do not cover it).

## Completion log
- 2026-10-15: `statement` built (contract, renderer, docs, fixtures, three visual cases with approved references, integration test).
- 2026-10-15: closed as done in the main checkout. Gates: `check.sh --all` exit 0 ("check: passed (all)"); `test.sh --all` exit 0 ("test: passed (scripts unit lua integration visual)"); `npm run test:visual` exit 0 (163 frames ok, 0 failing). Earlier worktree-only `quarto` failure no longer reproduces. Accent mutation re-run: `statement-basic` fails at frames 330 and 420 with the accent changed, then reverted.
- 2026-10-15: awaiting human playback of the render (Human check 1). Stills at 0.5 s, 7.5 s and 14.7 s look correct: accent `strong` phrase, reveal heading, final accent line.
