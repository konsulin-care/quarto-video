# ADR-0013: Component props and CSV tables in IR 1.3

- Status: accepted
- Date: 2026-10-15
- Task: 035
- PRD: §5.3, §5.5, §12, §8.2

## Context
PRD §5.3 says components define their accepted attributes, and unsupported ones
are rejected. PRD §5.5 says a contract declares "accepted properties and their
types". The `chart` component (task 035) takes such properties: `type`, `data`
(a project CSV), `x`, `y`, `unit`, `title`. IR 1.2 has no place for them: a scene
has `component`, `content`, `transition`, `animation`, and nothing else. The
filter also rejects any attribute it does not know (`E_SCENE_SHAPE`), so the
attributes never reach the validator. The CSV must be parsed by the validator,
not by code (PRD §11.4), and the renderer reads only the IR.

## Options
1. **IR 1.3, a minor version.** Add an optional scene `props` (authored strings)
   and an optional scene `tables` (CSV data). Pros: additive (ADR-0007); the
   validator checks the props against the contract; the renderer gets the data
   from the IR. Cons: the golden manifests change `schemaVersion`.
2. **Keep the filter's attribute list and add component names to it.** Cons: the
   filter would hold the registry; every new prop would be a Lua change.
3. **Let the renderer read and parse the CSV.** Cons: the renderer would parse
   user files, and its reads would not be checked by the validator.

## Decision
- IR 1.3 is `schema/ir-1.3.json`: IR 1.2 plus, on a scene:
  - `props`: an object of strings, keys in camelCase. Written by the filter: every
    attribute that is not a scene attribute (`component`, `duration`,
    `transition`, `transitionDuration`, `animation`). Absent when there are none.
  - `tables`: an object keyed by prop name, each `{ columns, rows }` with cell
    text. Written only by the validator (stage 3), from a CSV prop. The filter
    never writes it.
- Content slots: `minProperties` is removed, so a scene may have no slots (a
  chart has props only). The contract's `slots` decide which slots are required.
  Title scenes still need `default` (`E_SLOT_REQUIRED`).
- The filter writes 1.3. It accepts any non-scene attribute and passes it on. The
  validator rejects a prop the contract does not declare with `E_SCENE_SHAPE`, the
  same code as before, so the rule "unknown attributes are errors" holds.
- Contracts (packages/registry) declare props with types `string`, `boolean`,
  `enum`, `csv` (a project CSV path, parsed by the validator) and `column` (a
  column of the `csv` prop named by `of`; `numeric: true` requires numbers).
  A prop may be `required`.
- The validator checks props in stage 2 and parses CSV props in stage 3, using
  the asset resolver (ADR-0006). Its diagnostics name the CSV line.
- The renderer reads `props` and `tables` only from validated IR.

## Consequences
- 1.0 to 1.2 manifests are unchanged and still valid. A 1.2 manifest with `props`
  or `tables` is an error.
- Golden manifests under `tests/fixtures/projects` record `"1.3"`. Their content
  is otherwise unchanged.
- The validator returns an IR with `tables` added to chart scenes. `video validate
  --print-ir` prints that resolved manifest.
- Open for a human: whether other components (image, task 033) also need typed
  props. Their attributes would use the same `props` field.

## Verification
- `packages/ir/test/v13.test.ts`: the props and tables shape, and 1.2 rejects them.
- `packages/ir/test/frozen.test.ts`: `ir-1.0.json` to `ir-1.2.json` keep their hashes.
- `_extensions/video/tests/test_scenes.lua`: attributes become props.
- `packages/validator/test/props.test.ts`, `csv.test.ts`, `data.test.ts`: the contract and CSV checks.
- `tests/integration/component-chart.test.ts`: the chart fixtures through the `video` bin.

## References
- ADR-0004 (content), ADR-0005 and ADR-0011 (scene attributes), ADR-0006 (assets),
  ADR-0007 (versioning). Task 035 (`docs/tasks/phase-3-design-system/035-component-chart.md`).
