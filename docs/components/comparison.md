# Component `comparison`

Status: released in task 034. Visual cases: `comparison-basic`, `comparison-animations`, `comparison-uneven` and `comparison-reveal` (task 034).

## Purpose
Two or more structured content areas side by side.

## Usage
```markdown
::: {.scene component="comparison" duration="6s" animation="fade-in"}
::: {.left}
## CPUs

Optimised for general-purpose tasks.
:::

::: {.right}
## GPUs

- Massively parallel.
- Built for throughput.
:::
:::
```
With a `.middle` Div the scene has three columns; without it, two.

## Slots and content
| Slot | Required | Accepts |
| --- | --- | --- |
| `left` | yes | heading, paragraph, list |
| `middle` | no | heading, paragraph, list |
| `right` | yes | heading, paragraph, list |

The component has no props. Content is drawn as plain lines, one per block (ADR-0004). Each slot is one column, in the order left, middle, right. The middle column is drawn only when its slot has text. The "columns of 2 or 3" of the task is this rule: two columns for `left` and `right`, three when `middle` is present. Code blocks are not accepted.

Errors (validator, stage 2): a missing `right` (or `left`) is `E_SLOT_REQUIRED`; any other slot name, such as `.center`, is `E_SLOT_UNKNOWN`; a code block in a slot is `E_SLOT_BLOCK_KIND`.

## Timing and placement
- Duration: 1s to 30s per scene (`duration` in the contract).
- Animations: `fade-in`, `slide-up`, `reveal` (task 021; see [README](README.md#animations-task-021)). The animation moves the whole grid of columns together.
- Placements: none (task 038). Transitions: none listed in the contract, and not checked yet (ADR-0005).

## Accessibility
The areas are the only content. They sit side by side as two columns, or three with `middle`, and start at the same top edge, so unequal lengths stay aligned (visual case `comparison-uneven`). Colour and size come from the theme (task 019): the text uses the text token on the surface token, a pair that meets WCAG AA. Long text wraps inside the safe area (PRD §10.2); the text is not shrunk to fit.

## Known limits
- Plain text only (ADR-0004): a heading, a paragraph and a list look the same in a column. Emphasis is shown as its text, and list items have no bullet marks.
- The columns share a width and the text is not shrunk: a column with a lot of text runs past the bottom of the frame. Keep each area to about 12 lines at 1920x1080.
- At 640x360 the text is small and crowded; the component is designed for 1920x1080.
- Transitions are not checked against the contract yet (ADR-0005).
