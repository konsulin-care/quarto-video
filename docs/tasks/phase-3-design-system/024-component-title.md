# 024 — Component `title`

Phase 3 · Status: done · Depends on: 023 · PRD: §5.4 (1), §5.5, §10.2 · ADR: —

## Goal
Release the `title` component: opening title with optional subtitle.

## Scope
- In: slots `default` (title, required) and `subtitle` (optional); props none beyond common; animations `fade-in`, `slide-up`, `reveal`. Replaces the placeholder. Also creates `docs/components/_template.md` used by all later component tasks.
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/title.json`.
- Renderer `renderer/remotion/components/title/` + `registry-map.ts` entry.
- Docs `docs/components/title.md` from the component template.
- Fixture `tests/fixtures/projects/component-title/` (valid) and
  `component-title-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/title-*.json` with references.

## Definition of done
Automated:
- [x] Contract validates; parity test passes; `video components` lists `title`.
- [x] Each contract violation in the invalid fixture yields its code and line.
- [x] Long title (≥ 80 characters) wraps within safe area, never clipped. Met at 1920x1080 (`title-long`). At 640x360 it scales down (Met 2026-10-15, task 026: `title-long-small`, `component-title-small`; a title that cannot fit at 40px warns `W_TEXT_FIT`, `component-title-warn`).
- [x] Missing subtitle → layout recentres (visual case `title-no-subtitle`).
- [x] Met (2026-10-15): every compatible animation renders without clipping. `reveal` no longer clips (task 021 redesign); fade-in and slide-up never did.

Human check:
1. [ ] Partly met: `npx video render` ran (exit 0, 1920x1080, 30 fps, 450 frames). Reviewed from stills, not played back.
2. [x] Review against `docs/components/title.md`: legible at 1080p, theme-consistent, no clipped or overlapping text, reveal included (the task 021 redesign).
3. [x] `npx video validate tests/fixtures/projects/component-title-invalid`: six errors, one per violating scene, each with a line and a suggestion.

## Notes
- Contract: `subtitle` (optional, paragraph only; a heading there is `E_SLOT_BLOCK_KIND`). `default` is unchanged. Version kept at 1.0.0: the placeholder was never released.
- Renderer: scenes get `slots` (plain text per slot, `ir/text` `slotTexts`) instead of `text`. Title draws `default` above `subtitle` in one centred column. `title-basic`'s approved references are unchanged (single-title look is pixel-identical).
- Visual checks: `title-subtitle`, `title-long`, `title-no-subtitle`, `title-animations`, `title-reduced-motion` (its fixture `reduced-motion-title` is an addition: reduced motion for the subtitle layout). Long-title and reveal results are in the boxes above.
- Known limit (closed 2026-10-15, task 026): text was not shrunk, so a title of about 100 characters at 640x360 was clipped top and bottom. The title now takes the rule of `statement` (task 025): `fitStack` in `packages/registry/src/layout.ts`, with `textFit` in `title.json` (`title` to `body`; subtitle `subtitle` to `body`). See the completion note below.
- Reveal: in the human render the frame at 6.3 s is blank. The wipe starts at the left edge and the centred text appears only when it reaches it. Resolved 2026-10-15 by the task 021 reveal redesign: the text now fades in whole, so the wipe no longer hides it.
- Tests: `tests/integration/component-title.test.ts`, `components.test.ts`, `contract.test.ts`, `packages/registry/test/components.test.ts`, `packages/ir/test/content.test.ts` (`slotTexts`), visual `title-*` and `animations-*`.

## Completion log
- 2026-10-15: `title` released. Subtitle slot, renderer, docs page from `docs/components/_template.md`, fixtures, six visual cases (approved references), integration test. Gates: `check.sh --all` and `test.sh --all` exit 0 on the final tree.
- 2026-10-15 (task 026, text fit for titles; status stays done): `title` scales its default slot from 96px down to 40px, and the subtitle from 56px down to 40px, to fit the safe area together. The title keeps the largest size it can, and the subtitle takes the largest size that fits the height left under it. Below 40px the text is drawn at 40px, with no further shrinking, and `W_TEXT_FIT` names the scene and line (validator, stage 2), as `statement` does. The renderer does not clip it, so it may run past the frame edge. Unchanged: `title-long` at 1920x1080 stays at 96px and its approved reference is unchanged. New: visual `title-long-small` (640x360, a title of 98 characters, with and without a short subtitle; frames 30 and 90), fixture `component-title-small`; warning fixture `component-title-warn` (a 222-character title at 640x360 warns; the 98-character title does not, since it fits at 45px without a subtitle and at 41px with one). Tests: `packages/registry/test/layout.test.ts` (`fitStack`), `renderer/remotion/test/title-fit.test.ts` (matches the contract), `tests/integration/component-title.test.ts`.
- Follow-ups: a playback review of the reveal entrance; reduced motion for `reveal` in the human check.
- Gates (2026-10-15, task 026): `scripts/check.sh --all` EXIT=0 (`/tmp/claude-0/-home-user-quarto-video/2ea04e7d-5501-5980-9c9f-1be8ffdb6f2c/scratchpad/check-final-2.log`); `scripts/test.sh --all` EXIT=0 (`/tmp/claude-0/-home-user-quarto-video/2ea04e7d-5501-5980-9c9f-1be8ffdb6f2c/scratchpad/title-fit-test.log`, no 5 s timeouts); `npm run test:visual` passed, 120 frames, EXIT=0 (`/tmp/claude-0/-home-user-quarto-video/2ea04e7d-5501-5980-9c9f-1be8ffdb6f2c/scratchpad/visual-final-2.log`); `video render tests/fixtures/projects/component-title` EXIT=0, 1080p stills at frames 60 and 330 show the layout unchanged (title at 96px, three lines; subtitle beneath). Output MP4 removed.
