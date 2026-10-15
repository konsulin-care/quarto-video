# Component `title`

Status: released in task 024 (replaces the task 004 placeholder). Visual cases: `title-basic` (task 020), `animations-basic` and `animations-reduced-motion` (tasks 021, 023), `title-subtitle`, `title-long`, `title-no-subtitle`, `title-animations` and `title-reduced-motion` (task 024).

## Purpose
Opening title and subtitle for a video or a chapter.

## Usage
```markdown
::: {.scene component="title" duration="3s" animation="fade-in"}
# Welcome to the course

::: {.subtitle}
A short subtitle under the title.
:::
:::
```
Without the `.subtitle` Div the title stands alone, centred on the frame.

## Slots and content
| Slot | Required | Accepts |
| --- | --- | --- |
| `default` | yes | paragraph, heading |
| `subtitle` | no | paragraph |

The title has no props. Content is drawn as plain lines, one per block (ADR-0004). The `default` slot is the title, in the theme's bold title size. `subtitle` sits under it in the muted text colour, at the theme's subtitle size. Loose blocks go to `default`.

Errors (validator, stage 2): a `.subtitle` with a list or code block is `E_SLOT_BLOCK_KIND`; any other slot name, such as `.caption`, is `E_SLOT_UNKNOWN`; a scene with no title is `E_SLOT_REQUIRED`.

## Timing and placement
- Duration: 1s to 30s per scene (`duration` in the contract).
- Animations: `fade-in`, `slide-up`, `reveal` (task 021; see [README](README.md#animations-task-021)). The animation moves the title and subtitle together.
- Placements: none (task 038). Transitions: none listed in the contract, and not checked yet (ADR-0005).

## Accessibility
The title and subtitle are the only content. Colour and size come from the theme (task 019). The subtitle uses the muted text token, a theme pair that meets WCAG AA. Long text wraps inside the safe area (PRD §10.2): a title of 80 characters or more takes several lines and is not clipped at 1920x1080. The text is not shrunk to fit. Under reduced motion, each animation draws its end state from the first frame (task 023).

## Known limits
- The text is not shrunk to fit, and the contract sets no line limit. At 640x360 a title of about 100 characters runs past the top and bottom of the frame and is clipped (rendered check, task 024). Use 1920x1080 for long titles; the 80-character case passes at 1920x1080.
- `reveal` fades the title in while it grows from 96% to full size over its entrance. Nothing is clipped at any frame (task 021, redesigned 2026-10-15).
- The subtitle accepts paragraphs only. A heading in the subtitle is an error, not a second title.
- Only plain text is drawn: emphasis and quotes are shown as their text (ADR-0004).
