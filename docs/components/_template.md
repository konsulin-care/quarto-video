<!-- Template for docs/components/<id>.md (task 024). Copy it, replace every
<...> placeholder and delete these comments. Keep this file at or below 100 lines. -->
# Component `<id>`

Status: <released in task NNN; what the page covers>. Visual cases: `<case>` (task NNN).

## Purpose
<One sentence, the same as `purpose` in packages/registry/components/<id>.json.>

## Usage
```markdown
::: {.scene component="<id>" duration="<n>s"}
<content, with named slots as nested Divs>
:::
```

## Slots and content
| Slot | Required | Accepts |
| --- | --- | --- |
| `<slot>` | yes or no | <block kinds, for example paragraph, heading> |

<List each prop with its type and default, or write "The component has no props.">

Content is drawn as plain lines, one per block (ADR-0004).

## Timing and placement
- Duration: <min> to <max> per scene (`duration` in the contract).
- Animations: <ids> (see [README](README.md#animations-task-021)).
- Placements and transitions: <none, or the list>.

## Accessibility
<The contract's `accessibility` text, plus how the layout behaves with long or missing text.>

## Known limits
- <Each limit, and the task that lifts it.>
