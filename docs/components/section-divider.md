# Component `section-divider`

Status: released in task 029. Visual cases: `section-divider-kicker`, `section-divider-no-kicker` and `section-divider-long` (task 029).

## Purpose
Chapter or topic break between sections: a section title, with an optional kicker above it.

## Usage
```markdown
::: {.scene component="section-divider" duration="3s" animation="fade-in"}
::: {.kicker}
Part 2
:::

# Memory and data
:::
```
Without the `.kicker` Div the title stands alone, centred on the frame.

## Slots and content
| Slot | Required | Accepts |
| --- | --- | --- |
| `default` | yes | paragraph, heading |
| `kicker` | no | paragraph |

The component has no props.

Content is drawn as plain lines, one per block (ADR-0004). The `default` slot is the section title, in the theme's bold title size. `kicker` sits above it in the accent colour, at the theme's body size. A short accent rule sits under the title in every case. Loose blocks go to `default`.

Errors (validator, stage 2): a `.kicker` with a list is `E_SLOT_BLOCK_KIND`; any other slot name, such as `.caption`, is `E_SLOT_UNKNOWN`; a scene with no title is `E_SLOT_REQUIRED`.

## Timing and placement
- Duration: 0.1s to 8s per scene (`duration` in the contract). Shorter or longer is `E_DURATION_BOUNDS`.
- Animations: `fade-in` and `slide-up` (see [README](README.md#animations-task-021)). `reveal` is not compatible with this component: `E_ANIMATION_INCOMPATIBLE` (see Known limits).
- Placements and transitions: none listed in the contract, and not checked yet (ADR-0005).

## Accessibility
The section title and the optional kicker are the only content. Colour and size come from the theme (task 019). The title uses the text token. The kicker uses the accent token, which on the `modern` theme's background is about 7:1 (computed from the hex values; the accent is not one of the theme's declared contrast pairs). Long text wraps inside the safe area (PRD §10.2) and is not shrunk to fit. Under reduced motion, `fade-in` and `slide-up` draw their end state from the first frame (task 023).

## Known limits
- `reveal` is not offered. Its registry test pins `title` as its only compatible component, so adding `section-divider` needs that test changed first (a follow-up, not done here).
- The text is not shrunk to fit and the contract sets no line limit. The `section-divider-long` case checks a two-line title at 1920x1080 only. At 640x360 a very long title is expected to clip, as it does for `title` (task 024); this is not checked for this component.
- The kicker is one line of paragraph text. A heading or list in the kicker is an error, not a second title.
- Only plain text is drawn: emphasis and quotes are shown as their text (ADR-0004).
