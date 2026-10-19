# Component `chart`

Status: released in task 035 (ADR-0014 for its props and CSV tables). Visual cases: `chart-bar-3`, `chart-bar-12`, `chart-line-3`, `chart-line-12` and `chart-animations` (task 035).

## Purpose
Bar or line chart drawn from a project CSV, with direct value labels and units.

## Usage
```markdown
::: {.scene component="chart" duration="6s" animation="fade-in" type="bar" data="data/sales.csv" x="region" y="sales" unit="kEUR" title="Sales by region"}
::: {.caption}
Source: internal sales report, 2026.
:::
:::
```
The CSV path is relative to the project root. Every prop is a plain string attribute; `.caption` is optional.

## Slots and content
| Slot | Required | Accepts |
| --- | --- | --- |
| `caption` | no | paragraph |

The chart has one optional slot, a paragraph drawn under the plot. A list or heading there is `E_SLOT_BLOCK_KIND`.

## Props
| Prop | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `bar` or `line` | yes | The mark: one bar per row, or a line through the rows. |
| `data` | CSV path | yes | A `.csv` file in the project. Parsed by the validator; no code runs. |
| `x` | column of `data` | yes | The category label of each row, drawn under its mark. |
| `y` | numeric column of `data` | yes | The value of each row. Every cell must be a number. |
| `unit` | text | yes | Drawn in the value axis title, for example `kEUR`. |
| `title` | text | yes | Drawn above the plot. |

The CSV has a header line of unique, non-empty names and one row per data point, each with the same number of fields. Quote a field that contains a comma. Blank lines are errors. At least one data row is needed.

Errors (validator): `E_PROP_REQUIRED` for a missing required prop; `E_PROP_VALUE` for an unknown `type`, a `data` that does not end in `.csv`, or an empty value; `E_SCENE_SHAPE` for an attribute the chart does not declare (the message lists the props); `E_ASSET_MISSING` or `E_ASSET_ESCAPE` for a CSV that is absent or outside the project; `E_CSV_SYNTAX` for a malformed file, with the CSV line; `E_COLUMN_UNKNOWN` for an `x` or `y` that is not a header name (the message lists the available columns); `E_CSV_VALUE` for a `y` cell that is not a number, with the CSV line.

Stage 3 checks the CSV only when stage 2 has no errors (ADR-0014).

## Timing and placement
- Duration: 0.1s to 30s per scene (`duration` in the contract).
- Animations: `fade-in`, `slide-up`, `reveal` (see [README](README.md#animations-task-021)). The animation moves the whole chart, title included; `reveal` fades it in while it grows from 96% to full size.
- Placements: none (Phase 4). Transitions: none listed in the contract.

## Accessibility
Every value is printed beside its mark, and every category label and the unit are drawn, so the data never depends on colour. The series uses the theme accent; the title and labels use the text tokens, and the axis and caption use the muted text token. The svg has a title and a description with the values, for screen readers. Under reduced motion the animation draws its end state from the first frame (task 023).

## Known limits
- Only one series, drawn in the theme accent. A legend is not drawn: the axis title names the series. More series need a later task.
- The value axis starts at zero for bars and includes zero for lines. Negative values are drawn; there is no log scale.
- Labels are not shrunk to fit. Category labels turn when they would overlap at the frame's width; very narrow frames (640x360 with twelve long labels) can still crowd.
- Value labels are the cell text as written (no number formatting); the unit is in the axis title.
