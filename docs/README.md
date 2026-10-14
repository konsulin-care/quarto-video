# docs/ — product, architecture, decisions, tasks
Status: Planning docs in place; user-facing guides arrive in tasks 049–050.

## Index
| Path                         | Purpose                                         | Read when                        |
| ---------------------------- | ----------------------------------------------- | -------------------------------- |
| docs/prd.md                  | Product requirements (verbatim, read-only)      | You need the "why" or a § ref    |
| docs/architecture.md         | Layers, boundaries, artifacts, data flow        | Your change crosses a layer      |
| docs/glossary.md             | Shared vocabulary                               | A term is ambiguous              |
| docs/decisions/README.md     | ADR format and index                            | Your task references an ADR      |
| docs/tasks/README.md         | Task lifecycle and index                        | Always, before starting work     |
| docs/testing.md              | What needs tests, gates, how to test            | Before writing or changing code  |
| docs/components/<id>.md      | Per-component reference (created by tasks 024+) | Authoring or changing a component|
| docs/guides/                 | Human guides (created by tasks 049–050)         | Writing user-facing docs         |

## Precedence
`prd.md` > accepted ADRs > `architecture.md` > directory READMEs > task file.
An accepted ADR may narrow an open point in the PRD (§18) but never
contradicts a PRD requirement. If you find a contradiction, stop and flag it.

## Rules
- `prd.md` is read-only for agents. Propose changes to a human.
- `architecture.md`, `glossary.md`, `testing.md` and everything under `tasks/` are agentic
  docs: keep each file ≤ 100 lines, terse, and current.
- When you introduce a new term, add it to `glossary.md` in the same change.
- When a decision changes the architecture, update `architecture.md` and link
  the ADR.
- Component docs (`docs/components/<id>.md`) follow the template created in
  task 024: purpose, slots, properties, presets, duration bounds, media and
  accessibility behaviour, example `.qmd`, reference stills.

## Related
- Root entry point: `AGENT.md`
