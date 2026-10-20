# Component `title`

Status: released in task 024 (replaces the task 004 placeholder); text fit added in task 026. Visual cases: `title-basic` (task 020), `animations-basic` and `animations-reduced-motion` (tasks 021, 023), `title-subtitle`, `title-long`, `title-no-subtitle`, `title-animations` and `title-reduced-motion` (task 024), `title-long-small` (task 026).

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
| `default` | yes, unless `text-overlay` is filled | paragraph, heading |
| `text-overlay` | no | paragraph, heading |
| `subtitle` | no | paragraph |

The title has no props. Content is drawn as plain lines, one per block (ADR-0004). The `default` slot is the title, in the theme's bold title size. `subtitle` sits under it in the muted text colour, at the theme's subtitle size. Loose blocks go to `default`. The `text-overlay` slot is the title drawn over background footage (`.text-overlay` in the scene): it takes the place of `default`, and a scene fills one of the two (`E_SLOT_CONSTRAINT` when both are filled).

Errors (validator, stage 2): a `.subtitle` with a list or code block is `E_SLOT_BLOCK_KIND`; any other slot name, such as `.caption`, is `E_SLOT_UNKNOWN`; a scene with no title is `E_SLOT_REQUIRED`.

## Text size
The title takes the largest size from the theme's `title` (96px) down to its `body` (40px) at which the title and subtitle fit the frame's safe area together (`textFit` in the contract; the rule is `fitStack` in `packages/registry/src/layout.ts`, the same code the renderer and the validator run). A short title stays at 96px. A long one steps down. The subtitle (when there is one) takes the largest size from the theme's `subtitle` (56px) down to `body` that fits in the height the title leaves, and the title keeps the largest size it can. A title of about 100 characters at 640x360 is drawn at about 41px with a short subtitle, and at about 45px without one. At 1920x1080 the 80-character case stays at 96px.

Warning (validator, stage 2): `W_TEXT_FIT` when the title does not fit at 40px, or when the subtitle cannot sit beside the title at 40px. The text is still drawn at the minimum size, so it may run past the frame, as `statement` does (task 025). The warning is on the scene's line, with `property` `slots.default` or `slots.subtitle`, and the suggestion says to shorten the text or use a larger frame.

## Timing and placement
- Duration: 0.1s to 30s per scene (`duration` in the contract).
- Animations: `fade-in`, `slide-up`, `reveal` (task 021; see [README](README.md#animations-task-021)). The animation moves the title and subtitle together.
- Placements: `background` (task 039): footage fills the canvas behind the title, under a theme scrim that keeps it legible. Framed footage is not taken (`E_MEDIA_PLACEMENT`; only `statement` takes framed, task 040). Transitions: none listed in the contract, and not checked yet (ADR-0005).

## Accessibility
The title and subtitle are the only content. Colour and size come from the theme (task 019). The subtitle uses the muted text token, a theme pair that meets WCAG AA. Long text wraps inside the safe area (PRD §10.2): a title of 80 characters or more takes several lines and is not clipped at 1920x1080, and it scales down to fit a small frame (see Text size). Under reduced motion, each animation draws its end state from the first frame (task 023).

## Known limits
- The size is estimated (0.6 em per glyph, `GLYPH_EM` in `layout.ts`), so a title can be drawn smaller than it needs. A title that cannot fit at 40px is drawn at 40px and warned (`W_TEXT_FIT`). It may then run past the frame; shorten it or use 1920x1080.
- No line limit is set in the contract.
- `reveal` fades the title in while it grows from 96% to full size over its entrance. Nothing is clipped at any frame (task 021, redesigned 2026-10-15).
- The subtitle accepts paragraphs only. A heading in the subtitle is an error, not a second title.
- Only plain text is drawn: emphasis and quotes are shown as their text (ADR-0004).
