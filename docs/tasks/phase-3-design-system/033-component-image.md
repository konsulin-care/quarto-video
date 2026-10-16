# 033 — Component `image`

Phase 3 · Status: done · Depends on: 024 · PRD: §5.4 (6), §6.2, §5.5, §10.2 · ADR: —

## Goal
Release the `image` component: image-led composition with optional caption.

## Scope
- In: image block `{.image src=… fit=cover|contain alt=…}`; slot `caption`; shared `fit` util in `renderer/remotion/media/` reused later by video; `alt` stored as accessibility metadata. Supported image formats per asset checks (PNG, JPEG, WebP, SVG — confirm in ADR-0008 later).
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/image.json`.
- Renderer `renderer/remotion/components/image/` + `registry-map.ts` entry.
- Docs `docs/components/image.md` from the component template.
- Fixture `tests/fixtures/projects/component-image/` (valid) and
  `component-image-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/image-*.json` with references.

## Definition of done
Automated:
- [x] Contract validates; parity test passes; `video components` lists `image`.
- [x] Each contract violation in the invalid fixture yields its code and line.
- [x] Visual cases for portrait, landscape and extreme (1:4) images with both fit modes.
- [x] Missing `src` file → asset error from stage 3.
- [x] Every compatible animation renders without clipping (visual cases).

Human check:
1. `npx video render tests/fixtures/projects/component-image` and watch it.
2. Review against `docs/components/image.md`: legible at 1080p, consistent
   with the theme, no clipped or overlapping text.
3. `npx video validate tests/fixtures/projects/component-image-invalid` → one
   actionable error per violating scene.

## Notes
- Merged `worktree-agent-abeaaf66df180c9d2` with `--no-ff` (merge `13b1f52`). Shared-file conflicts were unions: `docs/components/README.md`, the root `package.json` integration list, the registry README, `fade-in`/`slide-up` and `reveal` compatibility lists, registry tests, `registry-map.ts`, `contract.test.ts`. `reveal.json` keeps the 2026-10-15 redesign text.
- The reveal redesign (fade plus grow from 96%) does not change the existing reveal frames, because they sample only the end state. The reveal entrance (frames 120–140) was added as 122, 130 and 138 and viewed: no clipping. The fixture caption no longer says "wipe".
- `video components` sorts slot names, so the row reads `caption (optional: paragraph); default (required: image)`. The branch's test expectation was corrected to that order.
- Stills of the valid render (1080p, 30 fps, 420 frames) were checked at 0.5 s, 7 s and 13.5 s. The caption is legible and nothing is clipped. Two things for the human check: the SVG asset carries its own light background inside the picture box, and the last scene has no caption (optional slot).
- Awaiting human playback: watch `npx video render tests/fixtures/projects/component-image` at 1080p. Not ticked here.
- Awaiting human review against `docs/components/image.md` (legibility, theme). Not ticked here.

## Completion log
- 2026-10-15: merged the image branch; `check.sh --all` exit 0 (final, after lint, format and typecheck fixes). `test.sh --all` exit 0 on the final code: scripts 16/16, unit 519/519, lua 212/212, integration 147 tsx plus vitest 5/5, visual 148 frames plus harness 17/17. Final log: `scratchpad/image-test-final.log`.
- Earlier full runs were not green: run 1 (`scratchpad/image-test-run1.log`) timed out two unit tests at 5 s under load (both pass alone); run 2 (`scratchpad/image-test.log`) failed the slot-order expectation, fixed in `f8671b8`.
- `test:visual` exit 0 (`scratchpad/visual2.log`) before the final run. 28 image frames pass at 0.000% difference. Frames 122, 130 and 138 were added to `image-animations`; every approved frame was viewed.
- `video render tests/fixtures/projects/component-image` exit 0 (`scratchpad/render-image.log`). `video validate tests/fixtures/projects/component-image-invalid` exit 1 with five errors, one per violating scene, at lines 9, 15, 24, 33 and 40. The render output MP4 was deleted.
