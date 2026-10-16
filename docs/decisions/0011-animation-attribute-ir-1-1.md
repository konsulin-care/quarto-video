# ADR-0011: Scene animation in IR 1.1

- Status: accepted
- Date: 2026-10-15
- Task: 021
- PRD: §5.6, §8.2, §10.2, §11.1

## Context
PRD §5.6 requires that an author names a registered motion preset, and that the
validator rejects unknown or incompatible names. A scene's animation therefore
has to reach the validator, which reads only the IR. IR 1.0 is frozen and has no
such field, and its schema sets `additionalProperties: false`. ADR-0007 requires a
change to a released schema to be a new file, and allows a minor version to add an
optional field.

## Options
1. **IR 1.1, a minor version.** Copy 1.0 and add one optional scene field,
   `animation: { name }`. Pros: additive, so every 1.0 manifest stays valid
   (ADR-0007). Cons: the filter now writes 1.1, and the golden manifests change
   their `schemaVersion`.
2. **Carry the animation inside a `x-*` namespace of 1.0.** Pros: no new version.
   Cons: 1.0 has no such namespace (`packages/ir/README.md`), and it would put an
   author choice outside the schema.
3. **Leave the attribute out of the IR and check it in the filter.** Cons: the
   filter would hold the registry, and the validator could not report stage-2
   diagnostics with the scene's component.

## Decision
- IR 1.1 is `schema/ir-1.1.json`: IR 1.0 plus an optional `animation` object on a
  scene, `{ "name": "<preset id>" }`, with `name` in the transition name pattern.
  Nothing else changes. `ir-1.0.json` stays frozen and still reads.
- The filter writes 1.1. Scenes without an `animation` attribute have no
  `animation` key.
- The filter checks the name's shape only (`E_ANIMATION_UNKNOWN`). The validator
  checks the id against the registry and the component's compatible animations
  (stage 2, `E_ANIMATION_UNKNOWN`, `E_ANIMATION_INCOMPATIBLE`).
- The renderer reads `animation` only when it is present; it never resolves a
  preset that the validator did not accept.

## Consequences
- Every 1.0 manifest is still valid; a 1.0 manifest with an `animation` is an error.
- Golden manifests under `tests/fixtures/projects` now record `"1.1"`. Their content
  is otherwise unchanged.
- Transitions are unchanged (ADR-0005).
- Open for a human: whether the IR should later record preset parameters (for
  example a per-scene speed). Not in 1.1.

## Verification
- `packages/ir/test/v11.test.ts`: the animation shape rules, and a 1.0 manifest that
  carries one is rejected.
- `packages/ir/test/frozen.test.ts`: `ir-1.0.json` and `ir-1.1.json` match their hashes.
- `packages/validator/test/animation.test.ts`: unknown and incompatible presets.
- `tests/integration/contract.test.ts`: `contract-animation-*` fixtures.
- `_extensions/video/tests/test_animations.lua`: the filter's shape check.

## References
- ADR-0004 (content), ADR-0005 (transitions, the same attribute pattern), ADR-0007
  (versioning). Task 021 (`docs/tasks/phase-3-design-system/021-animation-presets-basic.md`).
