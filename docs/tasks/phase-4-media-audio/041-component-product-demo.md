# 041 — Component `product-demo`

Phase 4 · Status: done · Depends on: 040 · PRD: §5.4 (9), §6.1 (2), §5.5 · ADR: —

## Goal
Release the `product-demo` component: media presented inside a device or browser frame.

## Scope
- In: one framed media item (video or image, required) with `frame` and optional `caption` slot; supported animations for the frame entrance.
- Out: audio behaviour (044); other components.

## Deliverables
- Contract `packages/registry/components/product-demo.json`.
- Renderer `renderer/remotion/components/product-demo/` + `registry-map.ts` entry.
- Docs `docs/components/product-demo.md` from the component template.
- Fixtures `tests/fixtures/projects/component-product-demo/` and
  `component-product-demo-invalid/`.
- Visual cases `tests/visual/cases/product-demo-*.json` with references.

## Definition of done
Automated:
- [x] Contract validates; parity test passes; `video components` lists `product-demo`. (`packages/registry/test/*`; `renderer/remotion/test/registry-parity.test.ts`; `tests/integration/component-product-demo.test.ts`)
- [x] Each violation in the invalid fixture yields its code and line. (`tests/integration/component-product-demo.test.ts` against `component-product-demo-invalid/expected.json`)
- [x] Missing media → `E_SLOT_MISSING`; `placement="background"` → unsupported placement error. (`packages/validator/test/media-required.test.ts`; the invalid fixture's scenes 1 and 2)
- [x] Framed clip honours `sourceStart`/`sourceEnd` (frame-counter check). (`tests/integration/product-demo-frames.test.ts`: frames 0, 1, 29, 59 show source frames 30, 31, 59, 89)

Human check:
1. `npx video render tests/fixtures/projects/component-product-demo` and watch it.
2. Review against `docs/components/product-demo.md`: framing, legibility, theme
   consistency, nothing clipped.
3. `npx video validate tests/fixtures/projects/component-product-demo-invalid` →
   one actionable error per violating scene.

## Notes
- Scope: the framed media is `.video` only. IR 1.6 media is video only (ADR-0007, frozen), so a framed image needs an IR bump and an ADR, as a new frame did in 040. Conservative choice: an image in the scene is `E_SLOT_UNKNOWN` (the caption is the only slot). Framed images are a follow-up. This is the one gap against the "video or image" scope line.
- "Missing media" is not a slot (footage is not a block), so the contract has a new field `requiresMedia` (schema, types, README). Its diagnostic is a new code `E_SLOT_MISSING` (validator README). A scene with a `.video` block of another placement gets only `E_MEDIA_PLACEMENT`.
- Caption layout: the frame is fitted above a band sized from the caption's estimated lines at the `caption` role (28 px), so nothing is clipped; a long caption makes the frame smaller (the phone frame at 640x360 with a three-line caption is small). `FramedScene` reserves the band; `frameBox` is unchanged, and `fitFrame` gives the same box without a caption.
- Visual: the `slide-up` entrance moves the caption past the bottom edge mid-motion, as the `image` component already does; the settled frames clear the canvas edge.
- Test lists that name every component were updated for `product-demo` (`components.test.ts`, `animations.test.ts`, `contract.test.ts`, `background-video-validate.test.ts`). Not weakened: the expected values gained the new id.
- Accidental stray file: during a test-output redirect, `/vis.log` was written at the filesystem root (outside the repo). Its removal was blocked by a safety check; the user should delete it.
- Framed images are resolved (ADR-0018, IR 1.10): a `.video` block whose `src` is a png, jpg, jpeg, webp or svg is a framed still, and `product-demo` takes it (`mediaKinds`). An `.image` block in the body is still `E_SLOT_UNKNOWN`. Deviations, recorded in ADR-0018: `requiresMedia` stays a boolean; the golden manifests stay at 1.6 (the filter writes the lowest version that describes a manifest); `type` stays `video` on a still. Commits: d188989 (IR 1.10), 8f28d95 (filter), 5a1863c (registry `mediaKinds`), f025467 (validator), 5c2a4f5 (renderer), dbb001f (fixtures, tests, visual `image-footage`), 764c305 (docs).

## Completion log
- 2026-10-16: product-demo. Commits: d6bb62c (status), 155019d (contract, requiresMedia, E_SLOT_MISSING, renderer), 83ca4d6 (fixtures, tests, 10 references), 64a6008 (docs), then this log.
  Tests: `mise run check` passed (all; line limit 338 files; lint 0 errors; typecheck). `mise run test` passed: scripts 19/19; unit 899/899 (93 files); Lua 241/241; integration 146/146 (pure), 51/51 (render, with the vitest config 7/7); visual 275 frames passed. `npm run test:visual`: passed (275 frames), harness and flash 23/23. Covering tests: `packages/validator/test/media-required.test.ts`; `renderer/remotion/test/product-demo-layout.test.ts`; `tests/integration/component-product-demo.test.ts`; `tests/integration/product-demo-frames.test.ts`; visual `product-demo-frames`, `product-demo-animations`.
  Human check: (1) scratch copy of `component-product-demo` rendered with `video render`: exit 0 (wrote output.mp4), H.264 640x360, 300 frames, no audio stream. I viewed the four scene middles from the MP4: framing, caption legibility, theme colours and no clipping match the approved references. I could not watch the motion, so smoothness is not seen by eye. (2) Reviewed against docs/components/product-demo.md. (3) `video validate` of `component-product-demo-invalid`: six errors, one per scene, lines 9, 15, 24, 33, 40, 45.
  Follow-ups: framed images (resolved by ADR-0018, see Notes); a warning for captions that need many lines; the stray `/vis.log` to delete.
