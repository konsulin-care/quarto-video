# Component `text-media`

Status: released in task 042 (text in one column beside framed footage; `side` picks the footage's side; IR 1.6). Framed images (a still, IR 1.10, ADR-0018) are supported; the visual case is `image-footage`. Visual cases: `text-media-frames` (the four frames, footage on both sides) and `text-media-animations` (each compatible animation through its entrance) (task 042).

## Purpose
Text paired with framed footage: the text in one column, the footage in a device frame in the other.

## Usage
```markdown
::: {.scene component="text-media" duration="4s" side="left" animation="slide-up"}
::: {.video src="assets/app.mp4" placement="framed" frame="phone" fit="contain" audio="mute" alt="The app's start screen"}
:::

::: {.text}
Start in one tap.
:::
:::
```
The footage is a `.video` block with `placement="framed"` and a `frame` (see [video block](video-block.md) and the [frames](README.md#frames-task-040) table). The text is the `text` slot.

## Slots and content
| Slot | Required | Accepts |
| --- | --- | --- |
| `text` | yes | paragraph or heading (one block) |

The footage is the scene's media, not a slot: a scene with no `.video` block is `E_SLOT_MISSING`. Text in the body of the scene outside `.text` is `E_SLOT_UNKNOWN`, and so is any other named slot (the message lists `text`). The footage may be a video or a framed still image (`.png`, `.jpg`, `.jpeg`, `.webp` or `.svg`, ADR-0018); see [video block](video-block.md).

| Prop | Type | Values | Default |
| --- | --- | --- | --- |
| `side` | enum | `left`, `right` | `right` |

`side` is the side the footage takes; the text takes the other side. Any other value is `E_PROP_VALUE`.

Content is drawn as plain lines, one per block (ADR-0004).

## Timing and placement
- Duration: 1s to 30s per scene (`duration` in the contract).
- Animations: `fade-in`, `reveal`, `slide-up` (see [README](README.md#animations-task-021)). The animation moves the text and the frame together.
- Placements: `framed` only. A `background` block is `E_MEDIA_PLACEMENT`. Footage kinds: video and image (`mediaKinds` in the contract, ADR-0018). Transitions: none listed in the contract (ADR-0005).

## Layout
The canvas safe area is split into two columns with `space.md` between them: the footage column on `side`, the text column on the other side, equal widths (`textMediaColumns` in `packages/registry/src/layout.ts`, shared with the validator). The frame is the largest box of its aspect in its column, centred, as in `product-demo`. The text takes the largest size in the type scale from `title` down to `body` that fits its column, wraps at the column's edge and is centred vertically. Text that does not fit even at `body` is the warning `W_TEXT_FIT`; the validator fits the text in the same column the renderer draws it in.

## Accessibility
The footage is the picture. It is muted (source audio is task 044), its `alt` text is kept in the IR and not drawn, and it is clipped to the frame's screen under the theme scrim. The text uses the theme's text colour on the background, a pair that meets WCAG AA, and never runs over the footage. The text reads first in document order.

## Known limits
- Source audio is not played: `audio="mute"` only (task 044).
- Text is fitted to a half-width column, so long text at a small frame (640x360) warns `W_TEXT_FIT`. Shorten it or use 1920x1080.
- Footage without a frame beside text is `split-screen` (task 043), not this component.

## Errors
- `E_SLOT_MISSING`: the scene has no `.video` block (the message names the placement).
- `E_MEDIA_PLACEMENT`: the block is `background`.
- `E_VIDEO_BLOCK`: an image has `background` placement or no frame, or a video-only attribute (`loop`, `audio`, ...).
- `E_MEDIA_FRAME`: `frame` is not registered (the message lists the frames).
- `E_SLOT_REQUIRED`, `E_SLOT_BLOCK_KIND`, `E_SLOT_UNKNOWN`: the text slot is missing, holds a list, or another slot is used.
- `E_PROP_VALUE`: `side` is not `left` or `right`.
- `E_DURATION_BOUNDS` and `E_ANIMATION_INCOMPATIBLE` as for any component. `W_TEXT_FIT`: the text does not fit its column.

Fixtures: `tests/fixtures/projects/component-text-media` (valid; `text-media-frames` and `text-media-animations`) and `component-text-media-invalid` (one violation per scene, `expected.json`). Image footage: `component-image-footage` (valid; scenes 3 and 4 are text-media with stills; visual `image-footage`).
