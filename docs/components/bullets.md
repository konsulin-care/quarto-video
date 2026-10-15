# Component `bullets`

Status: released in task 027. Visual cases: `bullets-basic`, `bullets-animations` and `bullets-long` (task 027).

## Purpose
Sequential points or a compact list, shown one after another.

## Usage
```markdown
::: {.scene component="bullets" duration="4s" animation="slide-up"}
::: {.heading}
## Three things to remember
:::

- Frames come from the timeline.
- Each scene keeps its own length.
- Presets are data, not code.
:::
```
Without the `.heading` Div the list stands alone, centred on the frame.

## Slots and content
| Slot | Required | Accepts |
| --- | --- | --- |
| `default` | yes | list (2 to 6 items) |
| `heading` | no | heading |

The component has no props. The `default` slot holds exactly one list. Its items are drawn in the order written, one row each, with a bullet in the theme's accent colour and the body text. The `heading` slot sits above the list at the theme's subtitle size. Loose blocks go to `default`, so a list written without a Div is the list.

Content is drawn as plain lines, one per block (ADR-0004). The renderer splits the list into rows by its lines (ir/text `slotTexts`), so each item is one row.

Errors (validator, stage 2): a slot with no list (a paragraph in `default`) is `E_SLOT_BLOCK_KIND`; a list of fewer than 2 or more than 6 items, or two lists in `default`, is `E_SLOT_CONSTRAINT` (the message gives the limit); any other slot name, such as `.caption`, is `E_SLOT_UNKNOWN`; a scene with no list is `E_SLOT_REQUIRED`.

## Timing and placement
- Duration: 1s to 30s per scene (`duration` in the contract).
- Animations: `fade-in`, `slide-up`, `reveal` (task 021; see [README](README.md#animations-task-021)). The animation moves the heading and the list together. `stagger` (task 028) reveals the points one after another and leaves the heading in place; see the README.
- Placements: none (task 038). Transitions: none listed in the contract, and not checked yet (ADR-0005).

## Accessibility
The points and the optional heading are the only content. Colour and size come from the theme (task 019). The points use the text token, a theme contrast pair (WCAG AA); the bullet uses the accent token. Long points wrap inside the safe area (PRD §10.2) and are not clipped at 1920x1080. Under reduced motion, each animation draws its end state from the first frame (task 023).

## Known limits
- The list is not shrunk to fit and has no line limit beyond the item count. Six long points at 1920x1080 fit (`bullets-long`). Smaller frames are not checked: a long list at 640x360 may run past the frame. Use 1920x1080 for long lists, or split them (follow-up: a fit rule, as for `title`).
- An item is drawn from its lines. A line break inside one item (for example a nested list or a second paragraph in an item) becomes a separate row. Keep each item to one paragraph.
- `reveal` fades the list in while it grows from 96% to full size over its entrance. Nothing is clipped at any frame (task 021, redesigned 2026-10-15).
- Only plain text is drawn: emphasis and quotes are shown as their text (ADR-0004).
