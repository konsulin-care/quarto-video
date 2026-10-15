# Component `image`

Status: released in task 033 (IR 1.3, ADR-0013). Visual cases: `image-basic` (portrait, landscape, extreme 1:4 and SVG, both fit modes) and `image-animations` (every compatible animation) (task 033).

## Purpose
Image-led composition with an optional caption.

## Usage
```markdown
::: {.scene component="image" duration="4s" animation="fade-in"}
::: {.image src="assets/harbour.jpg" fit="cover" alt="A harbour at dusk"}
:::

::: {.caption}
Harbour at dusk.
:::
:::
```
The image block is an empty Div with the class `image`. Its `src` is a file
inside the project (for example `assets/harbour.jpg`). PNG, JPEG, WebP and SVG
are the formats this page shows; the format rules are task 037 (ADR-0008).

## Slots and content
| Slot | Required | Accepts |
| --- | --- | --- |
| `default` | yes | image (one block) |
| `caption` | no | paragraph |

The component has no props. Its settings are attributes of the image block:

| Attribute | Required | Values | Default |
| --- | --- | --- | --- |
| `src` | yes | a path inside the project, no URL, not absolute | none |
| `fit` | no | `cover` or `contain` | `contain` |
| `alt` | yes | any text; `alt=""` for a decorative image | none |

`fit="cover"` fills the picture box and may crop; `fit="contain"` shows the
whole picture and leaves the rest of the box in the surface colour. Both use
the same framing as video (`renderer/remotion/media/fit.ts`).

Errors (validator, stage 1, `E_IMAGE_BLOCK` at the block's line): no `src`, no
`alt`, a `fit` other than `cover` or `contain`, an unknown attribute, an id,
extra classes, content inside the block, or a second image in the scene.
Contract errors (stage 2): a caption with a non-paragraph block is
`E_SLOT_BLOCK_KIND`; an image in `caption` is `E_SLOT_BLOCK_KIND`; no image is
`E_SLOT_REQUIRED`. A missing file is `E_ASSET_MISSING` (stage 3). Its scene line
is named.

## Timing and placement
- Duration: 1s to 30s per scene (`duration` in the contract).
- Animations: `fade-in`, `slide-up`, `reveal` (task 021; see [README](README.md#animations-task-021)). The animation moves the picture and caption together.
- Placements: none (task 038 and later). Transitions: none listed in the contract (ADR-0005).

## Accessibility
The image is the picture; its `alt` text is kept in the IR as accessibility
metadata and is not drawn. The caption uses the muted text token, a theme pair
that meets WCAG AA. Long captions wrap inside the safe area (PRD §10.2). The
picture box takes the space the caption does not need, so the frame keeps its
safe-area margins at 1920x1080.

## Known limits
- One image per scene. A second image is `E_IMAGE_BLOCK` (task 033); a gallery is a later component.
- Formats are not checked yet beyond the file's existence and type (task 037, ADR-0008).
- The renderer copies the whole project root into the bundle, so large projects bundle slowly (task 038 keeps media placement in scope).
- `reveal` wipes the picture and caption during its entrance (recorded deviation, task 021); the end state is not clipped.
