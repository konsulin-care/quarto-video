# Component `split-screen`

Status: released in task 043 (two or three regions side by side, each with text or one region of footage; IR 1.7, ADR-0016). Visual cases: `split-screen-frames` (the layouts: two footage regions with different source ranges, text beside footage, three regions, two text regions) and `split-screen-animations` (the entrances mid-way) (task 043).

## Purpose
Simultaneous regions: two or three columns of text or footage, shown at the same time for the scene.

## Usage
```markdown
::: {.scene component="split-screen" duration="3s" animation="fade-in"}
::: {.left}
Text in the left region.
:::
::: {.video src="assets/tall.mp4" region="right" fit="contain" loop="true" audio="mute" alt="A tall clip in the right region"}
:::
:::
```
Each region of footage is its own `.video` block with `region="<name>"`. It takes no `placement` and no `frame` (see [video block](video-block.md)).

## Slots and content
| Slot | Required | Accepts |
| --- | --- | --- |
| `left` | no | paragraph or heading (one block) |
| `middle` | no | paragraph or heading (one block) |
| `right` | no | paragraph or heading (one block) |

The regions are the slots. A scene uses two or three of them, each with its text or its footage: a region with both is `E_SLOT_CONSTRAINT`, and a scene with one region or four is `E_REGION_COUNT`. The component has no props.

Content is drawn as plain lines, one per block (ADR-0004).

## Timing and placement
- Duration: 0.1s to 30s per scene (`duration` in the contract).
- Animations: `fade-in`, `reveal`, `slide-up` (see [README](README.md#animations-task-021)). The entrance moves all regions together.
- Placements: `region` only. A `background` or `framed` block is `E_MEDIA_PLACEMENT`. Transitions: none listed in the contract (ADR-0005).
- Footage: each region's clip has its own `sourceStart`, `sourceEnd`, `loop`, `freeze` and `fit`. All regions share the scene's timeline. Each clip is checked against its own file, so a range past the file is `E_MEDIA_RANGE` and a short clip is `E_MEDIA_SHORT_SOURCE` at the scene's line.

## Layout
The canvas safe area is split into equal columns, left to right in the order left, middle, right, with `space.md` between them (`regionColumns` and `splitColumns` in `packages/registry/src/layout.ts`, shared with the validator). Only the regions a scene uses take a column. Footage fills its column, clipped to it, and `fit` frames it (`cover` crops, `contain` shows all of it). Text takes the largest size from `subtitle` down to `body` that fits its column, keeps its longest word whole, and every text region of a scene uses the smallest of those sizes, so the regions match.

## Accessibility
The footage is the picture. It is muted (source audio is task 044), its `alt` text is kept in the IR and not drawn. The text uses the theme's text colour on the background, a pair that meets WCAG AA. Regions read left to right; the text reads first in document order.

## Known limits
- Image footage is not supported. IR 1.7 media is video only, so a region holds text or video. An image region needs an IR bump and its own ADR (a follow-up).
- Source audio is not played: `audio="mute"` only (task 044).
- The text of a region is not checked by the validator: no `W_TEXT_FIT` for regions yet. A paragraph too long for its column at 640x360 can run past the frame; use 1920x1080 for long text.
- A scene with a region name the component does not have gets `E_SLOT_UNKNOWN` and, since the count then includes that name, `E_REGION_COUNT` too: two errors for that scene.
- A word wider than a column at `body` size can still break across two lines.

## Errors
- `E_REGION_COUNT`: the scene uses fewer than 2 or more than 3 regions (the message lists the regions used and the limit).
- `E_SLOT_UNKNOWN`: a region name is not `left`, `middle` or `right` (the message lists the regions).
- `E_SLOT_CONSTRAINT`: text and footage in one region.
- `E_MEDIA_PLACEMENT`: region footage on a component that takes no regions, or a background or framed block here.
- `E_VIDEO_BLOCK`: a region block with a `placement` or a `frame`, a second block for a region, or a background block mixed with region blocks.
- `E_MEDIA_RANGE`, `E_MEDIA_SHORT_SOURCE`: a region clip's source range, checked per clip.
- `E_DURATION_BOUNDS` and `E_ANIMATION_INCOMPATIBLE` as for any component.
