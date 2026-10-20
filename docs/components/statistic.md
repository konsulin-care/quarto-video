# Component `statistic`

Status: released in task 031 (IR 1.5, ADR-0015). Visual cases: `statistic-basic`, `statistic-large` (1e9) and `statistic-animations` (every compatible animation), task 031.

## Purpose
Headline number with a label and optional context.

## Usage
```markdown
::: {.scene component="statistic" duration="3s" value="42" unit="%" animation="fade-in"}
::: {.label}
Of learners finished the course
:::

::: {.context}
Survey of 1,200 learners in 2026
:::
:::
```

## Slots and content
| Slot | Required | Accepts |
| --- | --- | --- |
| `label` | yes | paragraph |
| `context` | no | paragraph |

Props, all on the `.scene` Div:

| Prop | Type | Required | Rule |
| --- | --- | --- | --- |
| `value` | number | yes | A decimal number from -1e15 to 1e15: `42`, `-0.5`, `1e9`. |
| `unit` | text | no | Drawn after the number, smaller and muted (`%`, `M`). |
| `prefix` | text | no | Drawn before the number, after its sign (`$`). |
| `decimals` | number | no | A whole number from 0 to 6. Default `0`. |

Content is drawn as plain lines, one per block (ADR-0004). The label is the line under the number, at the theme's subtitle size in the text colour; the context is at the body size in the muted colour.

## Number formatting (locale-fixed)
The value is written the same way on every machine (ADR-0015). No locale or `Intl` call is made.
- `,` groups the thousands; `.` is the decimal mark. Digits after the mark are exactly `decimals`.
- Rounding is half away from zero, on the value as a binary number (ECMAScript `toFixed`).
- A value that rounds to zero has no sign: `-0.001` with `decimals="2"` is `0.00`.

| Authored | Shown |
| --- | --- |
| `value="1e9"` | `1,000,000,000` |
| `value="-3.456" decimals="1" prefix="$" unit="M"` | `-$3.5M` |
| `value="0.5" decimals="2"` | `0.50` |
| `value="2.5"` | `3` |
| `value="1,000"` | error `E_PROP_TYPE` (write `1000`) |

The formatter is `formatNumber(value, decimals)` in `renderer/remotion/components/statistic/format.ts`. Task 032 (`count-up`) uses the same function.

Errors (validator, stage 2): `E_PROP_REQUIRED` (no `value`); `E_PROP_TYPE` for a `value` or `decimals` that is not a number (`abc`); `E_PROP_VALUE` for a number outside its bounds, a `decimals` that is not a whole number, or an empty value; `E_SLOT_REQUIRED` (no `label`); `E_SLOT_UNKNOWN`; `E_SLOT_BLOCK_KIND` (a list in a slot); `E_SCENE_SHAPE` (an unknown attribute).

## Text size
The number takes the largest size up to twice the theme's title size (192px at `modern`) that fits the safe-area width, and never less than the body size (40px). A unit is drawn at half that size. A long number steps down so it stays inside the frame (`size.ts`, using the registry's glyph estimate). The label and context keep their sizes (56px and 40px) and wrap.

## Timing and placement
- Duration: 0.1s to 30s per scene (`duration` in the contract).
- Animations: `count-up` (task 032: the number counts up from zero, see [README](README.md#animations-task-021)), `fade-in`, `slide-up`, `reveal`. The animation moves the number, label and context together.
- Placements and transitions: none.

## Accessibility
The value, label and optional context are the only content. The value is bold in the theme's text colour; the label uses the text colour and the context the muted text colour. Both pairs meet WCAG AA. Long text wraps inside the safe area and is not shrunk. Under reduced motion each animation draws its end state from the first frame (task 023).

## Known limits
- The number is never shrunk below 40px. A prefix or unit that is very long can still run past the frame at that size.
- A value beyond ±1e15 is an error; `decimals` above 6 is an error.
- The label and context are not fitted to the frame: a very long label takes more lines and may run past the bottom of the frame.
