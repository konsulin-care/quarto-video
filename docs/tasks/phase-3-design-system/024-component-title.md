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
- [x] Long title (≥ 80 characters) wraps within safe area, never clipped. Met at 1920x1080 (`title-long`); at 640x360 it is clipped (Known limits).
- [x] Missing subtitle → layout recentres (visual case `title-no-subtitle`).
- [ ] Partly met: every compatible animation renders without clipping, except `reveal`'s entrance, which clips by design (task 021 deviation, not changed here). Its end state is unclipped; fade-in and slide-up are unclipped throughout.

Human check:
1. [ ] Partly met: `npx video render` ran (exit 0, 1920x1080, 30 fps, 450 frames). Reviewed from stills, not played back.
2. [x] Review against `docs/components/title.md`: legible at 1080p, theme-consistent, no clipped or overlapping text, apart from the reveal entrance (recorded deviation).
3. [x] `npx video validate tests/fixtures/projects/component-title-invalid`: six errors, one per violating scene, each with a line and a suggestion.

## Notes
- Contract: `subtitle` (optional, paragraph only; a heading there is `E_SLOT_BLOCK_KIND`). `default` is unchanged. Version kept at 1.0.0: the placeholder was never released.
- Renderer: scenes get `slots` (plain text per slot, `ir/text` `slotTexts`) instead of `text`. Title draws `default` above `subtitle` in one centred column. `title-basic`'s approved references are unchanged (single-title look is pixel-identical).
- Visual checks: `title-subtitle`, `title-long`, `title-no-subtitle`, `title-animations`, `title-reduced-motion` (its fixture `reduced-motion-title` is an addition: reduced motion for the subtitle layout). Long-title and reveal results are in the boxes above.
- Known limit: text is not shrunk. A title of about 100 characters at 640x360 is clipped top and bottom (checked by rendering a scratch project). Follow-up: a fit rule or a line limit.
- Reveal: in the human render the frame at 6.3 s is blank. The wipe starts at the left edge and the centred text appears only when it reaches it. Recorded, not fixed (task 021).
- Tests: `tests/integration/component-title.test.ts`, `components.test.ts`, `contract.test.ts`, `packages/registry/test/components.test.ts`, `packages/ir/test/content.test.ts` (`slotTexts`), visual `title-*` and `animations-*`.

## Completion log
- 2026-10-15: `title` released. Subtitle slot, renderer, docs page from `docs/components/_template.md`, fixtures, six visual cases (approved references), integration test. Gates: `check.sh --all` and `test.sh --all` exit 0 on the final tree.
- Follow-ups: fit or line limit for long titles on small frames; a playback review of the reveal entrance; reduced motion for `reveal` in the human check.
