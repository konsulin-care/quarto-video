# Component `statement`

Status: released in task 025. Visual cases: `statement-animations`, `statement-basic` and `statement-small` (task 025); `kinetic-basic` and `kinetic-reduced-motion` (task 026).

## Purpose
One prominent message or key sentence, with emphasis in the accent colour.

## Usage
```markdown
::: {.scene component="statement" duration="3s" animation="fade-in"}
Parallel hardware runs **thousands of threads** at once.
:::
```
`**strong**` text is drawn in the accent colour; `*emphasis*` is italic.

## Slots and content
| Slot | Required | Accepts |
| --- | --- | --- |
| `default` | yes, unless `text-overlay` is filled | paragraph, heading |
| `text-overlay` | no | paragraph, heading |

The statement has no props. Its `default` slot holds one block. A second block (for example a second paragraph) is the warning `W_SLOT_TOO_MANY_BLOCKS`; the text is still drawn, one block after the other.

Over background footage the statement is written in `.text-overlay` instead of `default` (task 039). The two are alternatives: a scene fills one, and both is `E_SLOT_CONSTRAINT`. The words count for `kinetic` as they do in `default`.

Content is drawn as plain lines, one per block (ADR-0004). Inline emphasis is kept: `strong` takes the accent colour (`colors.accent`), `emphasis` is italic, and quotes and line breaks are drawn as written.

## Timing and placement
- Duration: 1s to 30s per scene (`duration` in the contract).
- Animations: `fade-in`, `slide-up`, `reveal`, `kinetic` (see [README](README.md#animations-task-021)). `kinetic` shows each word in turn; a statement over 12 words is drawn with `fade-in` and warns `W_ANIMATION_FALLBACK`.
- Placements: `background` (task 039): the footage fills the canvas and a theme scrim (`scrim.opacity` of the background colour) sits over it, so the text stays legible. Framed footage is not taken (`E_MEDIA_PLACEMENT`). Transitions: none listed in the contract, and not checked yet (ADR-0005).

## Text size
The text takes the largest size from the theme's `title` (96px) down to its `body` (40px) at which it fits the frame's safe area (`textFit` in the contract; the rule is `fitText` in `packages/registry/src/layout.ts`). A short sentence stays at title size. A longer one steps down, so a three-line statement at 640x360 is smaller than at 1920x1080. The renderer and the validator use the same rule.

Warning (validator, stage 2): `W_TEXT_FIT` when the text does not fit even at 40px. The text is still drawn at 40px, so it may run past the frame. The suggestion says to shorten the text or use a larger frame.

## Accessibility
The statement is the only content. Its text uses the theme's text colour, and `strong` text the accent colour. The accent on the background of the `modern` theme is 7.46:1 (WCAG AA for normal text is 4.5:1). Size comes from the theme (task 019). Text wraps inside the safe area (PRD §10.2) and is never shrunk below body size.

## Known limits
- The fit estimates 0.6 em per glyph instead of measuring glyphs. It can step the size down earlier than the glyphs need, but it does not leave a text that the estimate says fits running past the frame.
- `reveal` fades the statement in while it grows from 96% to full size over its entrance. Nothing is clipped at any frame (task 021, redesigned 2026-10-15).
- No preset is incompatible with the statement today, so `E_ANIMATION_INCOMPATIBLE` is not exercised by a fixture.
- Errors: as for `title` (`E_SLOT_REQUIRED`, `E_SLOT_UNKNOWN`, `E_SLOT_BLOCK_KIND`, `E_DURATION_BOUNDS`, `E_ANIMATION_UNKNOWN`); a scene with only an unknown slot gets two errors (the unknown slot and the missing `default`).
