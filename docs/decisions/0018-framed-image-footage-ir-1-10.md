# ADR-0018: Framed image footage and IR 1.10

- Status: accepted
- Date: 2026-10-18
- Task: 041, 042 (follow-up to both)
- PRD: §5.4 (9), §5.5, §6.1 (2), §6.2, §18.8

## Context
IR 1.6 media is video only (ADR-0007; ADR-0016 consequences). `product-demo` (041) and
`text-media` (042) release framed video, and each left framed images as a follow-up,
because an image needs an IR decision. The `image` component (033) draws a still in the
default slot, not in a device frame (ADR-0013). ADR-0008 guarantees five image
extensions (png, jpg, jpeg, webp, svg), checked by extension, with no probe.

## Options
1. **A new `.image` block with `frame`.** Rejected: a second block for framed media, and
   a second path to the device frame. The `.video` block already places footage in frames.
2. **Images as `.video` blocks, the kind inferred from the extension and written to the
   IR** (chosen). One block places footage in frames; the IR says what each item is.
3. **Background images too** (under `title` and `statement`). Rejected: not asked for, and
   the background path (039) is built for video with its scrim. A later ADR can add it.
4. **Source range and sound on images** (`audio="mute"` as a no-op). Rejected: a still has
   no range to trim and no sound. `audio="mute"` on an image has no meaning, so it is an
   error like the other video attributes, not a silent no-op.

## Decision
1. **Version.** IR 1.10 (`schema/ir-1.10.json`, additive under ADR-0007). The filter writes 1.10
   only for a manifest with a framed image; manifests without one keep 1.6 to 1.9.
2. **Kind.** A `.video` `src` ending in `.png`, `.jpg`, `.jpeg`, `.webp` or `.svg`
   (case-insensitive; `lib/media_kind.lua`) is an image; any other `src` is video. Every item of a
   1.10 manifest has `kind`, required. `type` stays `"video"`: it names the `.video` block, and `kind` names the footage.
3. **Placement.** An image is `placement="framed"` with a `frame`. `background`, no placement, and
   region placement are `E_VIDEO_BLOCK`.
4. **Attributes.** On an image, `sourceStart`, `sourceEnd`, `audio`, `volume`, `loop`, `freeze`,
   `playbackRate` and `region` are `E_VIDEO_BLOCK`, naming the attribute. `audio` is not required.
5. **Time.** An image is held for the scene. It has no source range, so there is no
   `E_MEDIA_RANGE`, no `E_MEDIA_SHORT_SOURCE` and no `sourceEndFrames`.
6. **Stage 3.** The file must resolve inside the root and exist (ADR-0006), and its extension must be in
   the ADR-0008 list (`E_MEDIA_FORMAT` otherwise, listing the image formats). An image is not
   probed: ffprobe would only confirm the extension, and it is not used for SVG.
7. **Contract.** A contract lists `mediaKinds` (`video`, `image`); absent means `["video"]`, and `image`
   needs `framed`. `product-demo` and `text-media` take both. A block of a kind its component does
   not take is `E_MEDIA_KIND` (stage 2), which names the components that take it.
   *Deviation:* `requiresMedia` stays a boolean, and `mediaKinds` is a sibling field. Changing
   `requiresMedia` to an object would have changed the assertions that pin `"requiresMedia": true`.
8. **Fit.** Images use the shared `fit` (`media/fit.ts`), `cover` or `contain`, default `contain`.
9. **Renderer.** `media/Still.tsx` draws the picture with `Img`, `staticFile` and `fitStyle`, the
   image component's path. It has no audio and no frame-dependent timing. `FramedFootage` picks it by `kind`.

## Consequences
- `product-demo` and `text-media` take framed stills. Background placement and `split-screen`
  regions stay video-only; a later ADR adds images there.
- Manifests without images are unchanged, and the golden manifests stay at 1.6 (the filter writes
  the lowest version that describes a manifest).
- The image extensions are in two places: `packages/validator/src/media/formats.ts` and
  `_extensions/video/lib/media_kind.lua`. `media-kind-sync.test.ts` keeps them equal.
- WebP and SVG are accepted by extension (ADR-0008), and no fixture renders them yet: the
  fixtures use PNG and JPEG. Their playback in Chromium is not verified by a test.

## Verification
- `packages/ir/test/v110.test.ts` (kind, placement, video-only fields, frame, `kind` rejected on 1.9),
  `frozen.test.ts` (1.10 hash), `versions.test.ts` and the version-list tests (1.10 listed).
- `_extensions/video/tests/test_media_image.lua` (the kind by extension, the image item, refused
  attributes, placement, IR 1.10 and `kind` only in 1.10).
- `packages/validator/test/media-kind.test.ts` (E_MEDIA_KIND), `media-kind-sync.test.ts`,
  `media-image.test.ts` (existence, format, no probe, no range, a manifest passes every stage);
  `packages/registry/test/media-kinds.test.ts`.
- `tests/integration/component-image-footage.test.ts` (validate, the printed IR, the invalid
  fixture's codes, lines and scenes, a missing still); `tests/integration/image-footage-frames.test.ts`
  (each still held for its scene and different across scenes; the MP4 has no audio stream).
- Visual `image-footage`: cover and contain in the browser and phone frames, in both components.

## References
- ADR-0006 (asset paths), ADR-0007 (minor versions), ADR-0008 (image formats), ADR-0013
  (image block), ADR-0016 (region footage, IR 1.7), ADR-0017 (IR 1.9).
- PRD §5.4, §5.5, §6.1, §6.2, §18.8.
