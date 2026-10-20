# Component `product-demo`

Status: released in task 041 (framed footage with an optional caption; IR 1.6). Framed images (a still, IR 1.10, ADR-0018) are supported; the visual case is `image-footage`. Visual cases: `product-demo-frames` (the four frames, with captions) and `product-demo-animations` (each compatible animation, sampled through its entrance) (task 041).

## Purpose
Media presented inside a device or browser frame.

## Usage
```markdown
::: {.scene component="product-demo" duration="4s" animation="slide-up"}
::: {.video src="assets/app.mp4" placement="framed" frame="browser" fit="contain" audio="mute" alt="The app's dashboard"}
:::

::: {.caption}
The dashboard, updated live.
:::
:::
```
The footage is a `.video` block with `placement="framed"` and a `frame` (see [video block](video-block.md) and the [frames](README.md#frames-task-040) table). The caption is optional.

The footage may be a video or a still image: a `src` ending in `.png`, `.jpg`, `.jpeg`, `.webp` or `.svg` is an image. An image is held for the scene, with `fit` as for video and no `sourceStart`, `loop`, `audio` or other video attribute.

## Slots and content
| Slot | Required | Accepts |
| --- | --- | --- |
| `caption` | no | paragraph (one block) |

There is no `default` slot: the footage is the scene's media, not a slot. Text or an image in the body of the scene is `E_SLOT_UNKNOWN` (the message lists the available slots). A second `.video` block is `E_VIDEO_BLOCK`.

The component has no props. Its settings are the attributes of its `.video` block: `src`, `audio="mute"`, `placement="framed"`, `frame`, `fit` (default `contain`), `sourceStart`, `sourceEnd`, `playbackRate`, `loop`, `freeze` and `alt`, as the video block page lists them.

Content is drawn as plain lines, one per block (ADR-0004).

## Timing and placement
- Duration: 0.1s to 30s per scene (`duration` in the contract).
- Animations: `fade-in`, `slide-up`, `reveal` (see [README](README.md#animations-task-021)). The animation moves the frame and the caption together.
- Placements: `framed` only. A `background` block is `E_MEDIA_PLACEMENT`. Footage kinds: video and image (`mediaKinds` in the contract, ADR-0018). Transitions: none listed in the contract (ADR-0005).

## Layout
The frame is the largest box of its aspect in the canvas safe area, centred, as in `statement` (task 040). When there is a caption, a band is reserved under the frame: its height is the caption's estimated lines at the caption size (28 px in the modern theme) at the body line height, plus `space.sm`. The frame is fitted above the band, so the caption never covers the footage. Without a caption the frame fills the safe area.

## Accessibility
The footage is the picture. It is muted (source audio is task 044), and its `alt` text is kept in the IR as accessibility metadata and is not drawn. It is clipped to the frame's screen under the theme scrim; the frame is drawn in theme colours only. The caption uses the muted text token, a theme pair that meets WCAG AA, and wraps inside the safe area.

## Known limits
- Source audio is not played: `audio="mute"` only (task 044).
- The caption band grows with the caption, so a long caption leaves the frame smaller. There is no warning for it yet.
- The layout is one column. Footage beside text is `text-media` (task 042, released) or `split-screen` (task 043).

## Errors
- `E_SLOT_MISSING`: the scene has no `.video` block (the message names the placement).
- `E_MEDIA_PLACEMENT`: the block is `background`.
- `E_VIDEO_BLOCK`: an image has `background` placement or no frame, or a video-only attribute (`loop`, `audio`, ...).
- `E_MEDIA_FRAME`: `frame` is not registered (the message lists the frames).
- `E_SLOT_BLOCK_KIND`, `E_SLOT_UNKNOWN`, `E_DURATION_BOUNDS` and `E_ANIMATION_INCOMPATIBLE` as for any component.

Fixtures: `tests/fixtures/projects/component-product-demo` (valid; `product-demo-frames` and `product-demo-animations`) and `component-product-demo-invalid` (one violation per scene, `expected.json`). Image footage: `component-image-footage` (valid; visual `image-footage`), and `component-image-footage-invalid` (its `expected.json`).
