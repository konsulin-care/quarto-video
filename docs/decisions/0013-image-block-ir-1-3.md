# ADR-0013: Image block and IR 1.3

- Status: accepted
- Date: 2026-10-15
- Task: 033
- PRD: §5.4 (6), §5.5, §6.3, §8.2, §10.2

## Context
The `image` component needs a picture in a scene. ADR-0004 left images out
(`E_CONTENT_UNSUPPORTED`, "wait for task 038"), and the IR carries no asset
reference, so stage 3 (ADR-0006) never ran on a manifest. Task 033 releases the
component now, so the picture must reach the IR, the renderer and the asset
check. Task 038 still owns media placements and video.

## Options
1. **Image as a content block** (chosen): a `.image` Div with `src`, `fit` and
   `alt`, held in a slot like any block.
2. **Scene-level attributes** (`src=` on `.scene`): simpler, but a scene could
   not hold a caption slot beside its picture, and it breaks the slot model.
3. **Keep IR 1.2 and derive the picture from text.** Rejected: the renderer and
   stage 3 would parse text, which the IR is meant to prevent.

## Decision
1. **Syntax.** `::: {.image src="assets/photo.png" fit="cover|contain" alt="..."}`
   with no content, inside a scene or a slot. `fit` defaults to `contain`, so
   nothing is cropped unless the author asks. `alt` is required; `alt=""` marks
   a decorative image. A scene holds one image block.
2. **IR 1.3** (`schema/ir-1.3.json`, a minor change under ADR-0007): content
   gains the block `{type: "image", src, fit, alt}`. `src` is a non-empty path,
   `fit` is `cover` or `contain`, `alt` is a string. IR 1.2 and earlier never
   contain it. The filter writes 1.3.
3. **Errors.** Shape errors are `E_IMAGE_BLOCK` at stage 1, at the block's line.
   Contract errors (a caption that holds an image, a missing image) are stage 2
   slot codes. A missing file is `E_ASSET_MISSING` at stage 3; with no asset
   list passed in, stage 3 reads the image blocks of the IR.
4. **Renderer.** The project root is the bundle's public directory, so
   `staticFile(src)` finds the file. `alt` is kept in the IR and not drawn.
   `fit` maps to CSS `object-fit` in `renderer/remotion/media/fit.ts`, shared
   with video later.

## Consequences
- Authors can put a picture in a scene, and missing files fail validation.
- Stage 3 now runs for `video validate` and `video render` on images.
- Every golden manifest is written as IR 1.3.
- Known limits: one image per scene; formats are not checked yet (ADR-0008,
  task 037); a bundle copies the whole project root as its public directory.

## Verification
- `packages/ir/test/v13.test.ts`, `frozen.test.ts` (1.3 hash), `packages/validator/test/image-block.test.ts`.
- `_extensions/video/tests/test_image.lua`.
- `tests/integration/component-image.test.ts` (fixtures `component-image*`).
- Visual cases `image-basic` and `image-animations`.

## References
- PRD §5.4, §5.5, §6.3, §8.2, §10.2; ADR-0004, ADR-0006, ADR-0007, ADR-0011.
