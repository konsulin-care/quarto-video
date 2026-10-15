# Component `end-card`

Status: released in task 030. Visual cases: `end-card-message` (message only, task 030) and `end-card-full` (message, call to action and a 10-line credits list, task 030).

## Purpose
Closing message, with an optional call to action and credits.

## Usage
```markdown
::: {.scene component="end-card" duration="4s" animation="slide-up"}
# Keep learning with us

::: {.cta}
Subscribe for the next lesson.
:::

::: {.credits}
- Script: Jane Author
- Narration: Sam Voice
- Music: Open Tune Library
:::
:::
```
Without the `.cta` and `.credits` Divs the message stands alone, centred on the frame.

## Slots and content
| Slot | Required | Accepts |
| --- | --- | --- |
| `default` | yes | paragraph, heading |
| `cta` | no | paragraph |
| `credits` | no | list |

The end card has no props. Content is drawn as plain lines, one per block (ADR-0004). The `default` slot is the message, in the theme's bold title size, centred in the free space. `cta` sits under it in the accent colour, at the theme's subtitle size. `credits` sits along the bottom in the muted text colour, at the theme's caption size: each list item is one line, in order. Loose blocks go to `default`.

Errors (validator, stage 2): a `.cta` with a list is `E_SLOT_BLOCK_KIND`; a `.credits` with a paragraph is `E_SLOT_BLOCK_KIND`; a list in the message is `E_SLOT_BLOCK_KIND`; any other slot name, such as `.caption`, is `E_SLOT_UNKNOWN`; a scene with no message is `E_SLOT_REQUIRED`.

## Timing and placement
- Duration: 2s to 30s per scene (`duration` in the contract).
- Animations: `fade-in`, `slide-up`, `reveal` (task 021; see [README](README.md#animations-task-021)). The animation moves the whole card at once.
- Placements: none (task 038). Transitions: none listed in the contract, and not checked yet (ADR-0005).

## Accessibility
The message, call to action and credits are the only content. Colour and size come from the theme (task 019). The call to action uses the accent token and the credits the muted text token. Text wraps inside the safe area (PRD §10.2) and is not shrunk to fit, except credits (see below).

## Credits fit
The credits take at most half the safe-area height. While the lines fit at the caption size (28px at 1920x1080 in the `modern` theme), they are drawn at that size: ten lines fit (visual case `end-card-full`, frames 90, 110 and 209). A longer list is drawn smaller, in the largest size that fits the half, so it is never clipped. The size rule is unit-tested (`renderer/remotion/test/end-card.test.ts`).

## Known limits
- Each credits item must be one line. An item that wraps takes more height than the rule counts, so it can cross into the message area. Keep credits short. The validator does not warn about long lists: the renderer scales them instead.
- The message is not shrunk. A message that fills the free space can run into the call to action or the credits. No visual case covers that.
- `reveal` wipes the content during its entrance, so the card is partly hidden for that part of the scene. The end state is not clipped (recorded deviation, task 021).
- Only plain text is drawn: emphasis and quotes are shown as their text (ADR-0004).
