# 030 — Component `end-card`

Phase 3 · Status: done · Depends on: 024 · PRD: §5.4 (12), §5.5, §10.2 · ADR: —

## Goal
Release the `end-card` component: closing message, credits or call to action.

## Scope
- In: slots `default` (message, required), optional `cta` and `credits` (list).
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/end-card.json`.
- Renderer `renderer/remotion/components/end-card/` + `registry-map.ts` entry.
- Docs `docs/components/end-card.md` from the component template.
- Fixture `tests/fixtures/projects/component-end-card/` (valid) and
  `component-end-card-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/end-card-*.json` with references.

## Definition of done
Automated:
- [x] Contract validates; parity test passes; `video components` lists `end-card`.
- [x] Each contract violation in the invalid fixture yields its code and line.
- [x] Credits list of 10 lines fits or yields a warning, never clipping.
- [x] Visual cases: message only; message + cta + credits.
- [x] Every compatible animation renders without clipping (visual cases).

Human check:
1. [ ] Partly met: `video render` of the fixture ran (1920x1080, 300 frames); stills at start, middle and end were checked. No person watched the video.
2. [x] Review against `docs/components/end-card.md`: legible at 1080p, theme-consistent, no clipped or overlapping text (on the stills and references).
3. [x] `video validate` on the invalid fixture: one actionable error per violating scene.

## Notes
- Contract: slots `default` (paragraph, heading), `cta` (paragraph), `credits` (list). Compatible with fade-in, slide-up and reveal. Duration 2s to 30s.
- Credits: at most half the safe-area height. Ten lines fit at the caption size; a longer list is drawn smaller, never clipped. No validator warning: the renderer scales instead. Items that wrap are not measured.
- Animations: `fade-in` and `slide-up` are checked mid-entrance; `reveal` only at its end state. The reveal entrance no longer clips (task 021 redesign, 2026-10-15), but this case does not capture it.
- Shared files changed: `renderer/remotion/src/registry-map.ts` (one import, one entry); `packages/registry/animations/{fade-in,slide-up,reveal}.json` (`end-card` in `compatibleComponents`); `docs/components/README.md` (status sentence, one row, the three animation rows); `package.json` (integration test appended); `packages/registry/test/animations.test.ts` and `components.test.ts` and `tests/integration/contract.test.ts` (expected lists now include `end-card`).
- Gates: `scripts/check.sh --all` exit 0; `scripts/test.sh --all` exit 0, run on a scratch copy of the committed tree (see Completion log).
- Open, not caused by this task: in the first worktree gate run, a registry test once listed a `comparison` component that is not in this tree (it exists in another worktree). It did not recur in isolation or in the scratch-copy gates; cause not found.

## Completion log
- 2026-10-15: `in-progress` (commit 1). Contract, renderer, fixtures, docs and visual references added. Visual references approved for `end-card-message` (frames 0, 15, 89, 255, 299) and `end-card-full` (frames 90, 110, 209); looked at frames 110, 209 and 299 by eye, and the render's start, middle and end frames as one montage.
- 2026-10-15: test gate failed in the worktree on `quarto-render` (the post-render hook did not run). The same commit at a non-hidden path passes, so the worktree location is the cause. Gates re-run on that copy: check exit 0, test exit 0 (visual: 72 frames passed).
- 2026-10-16: log completed; Status stays `done`. The merge run on the main checkout (after 030 was merged with the other wave branches) gave `check.sh --all` and `test.sh --all` exit 0, including `quarto-render`, which passes there because the main checkout is not under a dot-directory. Human check 1 stays partly met: nobody has watched the render in motion.
