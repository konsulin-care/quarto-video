# 042 — Component `text-media`

Phase 4 · Status: done · Depends on: 039 · PRD: §5.4 (8), §5.5 · ADR: —

## Goal
Release the `text-media` component: text paired with image or video footage.

## Scope
- In: slots `text` (required) and `media` (image or video, required); prop `side=left|right`; media uses the shared fit util.
- Out: audio behaviour (044); other components.

## Deliverables
- Contract `packages/registry/components/text-media.json`.
- Renderer `renderer/remotion/components/text-media/` + `registry-map.ts` entry.
- Docs `docs/components/text-media.md` from the component template.
- Fixtures `tests/fixtures/projects/component-text-media/` and
  `component-text-media-invalid/`.
- Visual cases `tests/visual/cases/text-media-*.json` with references.

## Definition of done
Automated:
- [x] Contract validates; parity test passes; `video components` lists `text-media`. (`packages/registry/test/*`; `tests/integration/component-text-media.test.ts`)
- [x] Each violation in the invalid fixture yields its code and line. (`tests/integration/component-text-media.test.ts` against `component-text-media-invalid/expected.json`: seven errors, lines 9, 15, 24, 34, 47, 56, 65)
- [x] `side` swaps layout (visual cases). (`text-media-frames`: frames 30 and 255 show the footage right and left)
- [x] Long text wraps without overlapping the media box. (`renderer/remotion/test/text-media-layout.test.ts`: no overlap at four canvas shapes, both sides; `packages/validator/test/text-media-fit.test.ts`: W_TEXT_FIT in the column)

Human check:
1. `npx video render tests/fixtures/projects/component-text-media` and watch it.
2. Review against `docs/components/text-media.md`: framing, legibility, theme
   consistency, nothing clipped.
3. `npx video validate tests/fixtures/projects/component-text-media-invalid` →
   one actionable error per violating scene.

## Notes
- Scope: footage is a framed `.video` block (`requiresMedia`, placement `framed`). The contract has no `media` slot: IR 1.6 has only `background` and `framed` placements, so a slot image needs an IR bump and an ADR, which this task does not do. Image footage in text-media is a follow-up, as for product-demo (`E_SLOT_UNKNOWN` or `E_SLOT_MISSING` until then).
- `side` is the side the footage takes (`left` or `right`, default `right`). Columns: equal halves of the safe area with `space.md` between them (`textMediaColumns`, `sideColumns`, `mediaSideOf` in `packages/registry/src/layout.ts`), shared by the validator and renderer.
- The text slot is `text`; `FramedFootage` (extracted from FramedScene) draws the frame in the media column. `PLACES_OWN_MEDIA` in `registry-map.ts` keeps IrVideo from wrapping text-media in FramedScene.
- W_TEXT_FIT for text-media fits its `text` slot in the text column. Long text at 640x360 warns (about 190 characters does not fit a half column even at body size). Use 1920x1080 for long text.
- No timeout or assertion was changed. Two unit suites (media-probe, media-stage) time out their beforeAll (`generate.sh`, about 8 s) under the 10 s hook when the machine is loaded (an external pre-push run was active). On an idle machine they pass. Their timeout is not raised; the fragility is a follow-up.
- Stray file: an early command wrote `/appr1.log` at the filesystem root (unset `$TMPDIR`). The removal was blocked by the safety check. The user must delete it.

## Completion log
- 2026-10-16: text-media. Commits: 4189533 (status), f481b27, 28d1af6 (registry contract, columns, layout), ef5c7ea (renderer), 72d225e (validator fit), f543385 (fixtures, integration test, visual cases and 10 references), 15d0995 (docs), then this log.
  Tests: `mise run check` passed (line limit 344 files within 300; format; lint 0 errors; typecheck). `mise run test` passed on an idle machine: scripts 19/19; unit 923/923 (96 files); Lua 241/241; integration 146/146 (pure), 51/51 (render), 23/23 (visual and flash); `test: passed (scripts unit lua integration visual)`. `npm run test:visual` is the visual step of that run. Covering tests: `renderer/remotion/test/text-media-layout.test.ts`; `packages/registry/test/side-columns.test.ts`; `packages/validator/test/text-media-fit.test.ts`; `tests/integration/component-text-media.test.ts`; visual `text-media-frames` and `text-media-animations`.
  Human check: (1) not done as a watched render: `video render` of `component-text-media` was not run and the motion was not watched. (2) Reviewed the 10 approved references as stills: footage right by default and left with `side="left"`, text in its column, no overlap or clipping, the entrances settle. (3) `video validate component-text-media-invalid`: seven errors, one per scene, lines 9, 15, 24, 34, 47, 56, 65.
  Follow-ups: image footage in text-media (IR bump and ADR, as for product-demo); the timeout of the media suites under load; delete the stray `/appr1.log`.
