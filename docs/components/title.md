# Component `title`

Status: placeholder released with task 004; contract in task 013 (`packages/registry/components/title.json`). Visual cases: pending task 020.

## Purpose
Opening title and subtitle for a video or a chapter.

## Usage
```markdown
::: {.scene component="title" duration="2s"}
# Welcome

A short subtitle.
:::
```

## Slots and content
| Slot | Required | Accepts |
| --- | --- | --- |
| `default` | yes | paragraph, heading |

The title has no props. Its text is drawn as plain lines, one per block (ADR-0004).

## Timing and placement
- Duration: 1s to 30s per scene (`duration` in the contract).
- Placements, animations and transitions: none yet (tasks 021, 022, 038).

## Accessibility
The text is the only content. Colour and size come from the theme (task 019).

## Known limits
- The contract does not accept lists or code blocks. The renderer still draws them as text until task 014 enforces the contract.
