# ADR-0015: Numeric props and IR 1.5

- Status: accepted
- Date: 2026-10-15
- Task: 031
- PRD: §5.3, §5.4 (4), §5.5, §10.2, §11.1

## Context
PRD §5.5 says a contract declares "accepted properties and their types". The
contract schema allowed `string`, `boolean`, `enum` (ADR-0014 added `csv` and
`column`), and the registry README said numeric props are not allowed. The
`statistic` component (task 031) needs a number: `value`, and `decimals`. IR
1.4 holds scene props as strings only (`additionalProperties: {type: string}`),
so a number cannot reach the renderer as a number, and `value="abc"` could not
be told apart from `value="1e9"` except by a string parse in the renderer.

## Options
1. **Numbers as strings, parsed by the renderer.** No IR change. Cons: the
   renderer parses author text, which the validator never checked; a bad value
   would reach the renderer.
2. **Numbers as JSON numbers in IR 1.5, checked by the validator.** IR 1.5 is
   IR 1.4 with each scene prop value a string or a number. The validator reads
   the authored text of a `number` prop, rejects what is not a number with
   `E_PROP_TYPE`, and writes the JSON number into the resolved manifest.
3. **Keep numbers out of props and add a number-only field.** Cons: a second
   prop mechanism beside ADR-0014's.

## Decision
- Allowed contract prop types: `string`, `boolean`, `enum`, `number`, and the
  ADR-0014 types `csv` and `column`. Existing string, boolean and enum rules
  are unchanged.
- A `number` prop may declare `min`, `max` (inclusive bounds) and `integer`
  (true). Only a `number` prop may declare these. A `number` prop may be `required`.
- Authored text of a number prop is a decimal literal: an optional sign, digits
  with an optional fraction, and an optional exponent (`42`, `-0.5`, `1e9`).
  Anything else, including `abc`, `1,000` and `NaN`, is `E_PROP_TYPE` (stage 2).
  A number outside `min`/`max`, or not an integer where `integer` is set, is
  `E_PROP_VALUE`.
- The validator writes the number as a JSON number into the resolved manifest
  (stage 2, after the prop checks pass). The renderer reads numbers only from
  validated IR.
- Numbers are data, not pixels. A number prop carries a value; the component
  decides its size and place (PRD §5.5).
- Formatting of numbers is locale-fixed and documented on the component's page
  (`docs/components/statistic.md`): `,` groups thousands, `.` is the decimal
  mark, and no locale or `Intl` call is used. The rule is deterministic (AGENT.md).
- IR 1.5 is written because the schema changes (ADR-0007). It is additive: 1.0 to
  1.4 manifests are unchanged, and `ir-1.4.json` keeps its frozen hash. The
  filter writes 1.5. Chart and every other component are unaffected.

## Consequences
- `ir-1.5.json` is the only new IR schema. Golden manifests record `"1.5"`.
- `E_PROP_TYPE` is a new stage 2 code (docs/validator table, `DIAGNOSTIC_CODES`).
- `packages/registry/schema/contract.json` and `packages/registry/README.md` list
  `number`. A contract with `min`/`max`/`integer` on another type is an error.
- Future components with numbers (task 032 `count-up` reuses the formatter) add
  a `number` prop; no further IR change is needed unless a new shape appears.

## Verification
- `packages/ir/test/v15.test.ts`: number and string prop values validate; a
  boolean prop value and a 1.4 manifest with a number are checked.
- `packages/ir/test/frozen.test.ts`: `ir-1.0.json` to `ir-1.4.json` keep their hashes.
- `packages/registry/test/contract.test.ts`: `number` is accepted; `min` on a
  string prop is rejected.
- `packages/validator/test/props-number.test.ts`: `E_PROP_TYPE` for `abc`,
  `E_PROP_VALUE` for bounds and `integer`, and the JSON number in the resolved IR.
- `tests/integration/component-statistic.test.ts`: the statistic fixtures through the `video` bin.

## References
- ADR-0007 (versioning), ADR-0014 (props and tables in IR 1.4). PRD §5.5.
  Task 031 (`docs/tasks/phase-3-design-system/031-component-statistic.md`).
