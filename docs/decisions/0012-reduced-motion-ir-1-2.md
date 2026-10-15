# ADR-0012: Reduced motion setting in IR 1.2

- Status: accepted
- Date: 2026-10-15
- Task: 023
- PRD: §5.6, §12

## Context
PRD §12 requires that motion presets avoid unnecessary flashing and extreme motion,
and §5.6 requires presets to define reduced-motion behaviour where applicable. Each
animation and transition preset already declares a `reducedMotion` rule in the registry
(tasks 021, 022). Task 023 adds a project-level switch, `video.reducedMotion`, that
the renderer applies. The task puts the setting in front matter and IR settings.
IR 1.1 is frozen and its `settings` object has `additionalProperties: false`, so
the field needs a new schema version (ADR-0007).

## Options
1. **IR 1.2, a minor version.** Copy 1.1 and add one optional `settings.reducedMotion`
   boolean. Pros: additive, so every 1.1 manifest stays valid; the renderer reads the
   setting from the manifest it is given, like `fps` and `width`. Cons: the filter now
   writes 1.2, and the golden manifests change their `schemaVersion`.
2. **Carry the flag in `render.json`, as the theme is (task 019a).** Pros: no new
   version. Cons: the task names IR settings; render options are for the operator
   (`--theme`), not the author's document, and the flag would then need its own
   route through the CLI.
3. **Make the field required in 1.2.** Cons: ADR-0007 says a minor version adds
   optional fields only; a required field would reject nothing new but would change
   the shape every 1.2 writer must produce.

## Decision
- IR 1.2 is `schema/ir-1.2.json`: IR 1.1 plus an optional `settings.reducedMotion`
  (boolean). An absent value means `false`. Nothing else changes; `ir-1.1.json` stays frozen.
- The filter writes 1.2 and always writes `settings.reducedMotion` (`true` or `false`),
  from `video.reducedMotion` (default `false`, a boolean only; E_SETTING_INVALID otherwise).
- The validator and the renderer read `settings.reducedMotion`; the renderer applies
  each preset's `reducedMotion` rule (registry). The flag does not change any frame
  count, scene start or transition overlap (PRD §8.4: a frame is f(IR, frame)).
- Scope: the flag is project-wide. Per-scene overrides are out of scope (task 023).

## Consequences
- Every 1.1 manifest is still valid under 1.1; under 1.2 it has no `reducedMotion`
  and draws as before. A 1.1 manifest that carries the field is rejected.
- Golden manifests under `tests/fixtures/projects` record `"1.2"` and
  `"reducedMotion": false`. Their content is otherwise unchanged.
- The IR examples gain `examples/v1.2.json` (`reducedMotion: true`).

## Verification
- `packages/ir/test/v12.test.ts`: the optional boolean; `true`, `false` and absent are
  valid; a string, number or null is rejected at `/settings/reducedMotion`; a 1.1 manifest
  with the field is rejected.
- `packages/ir/test/frozen.test.ts`: `ir-1.1.json` and `ir-1.2.json` match their hashes.
- `_extensions/video/tests/test_config.lua`: the front matter flag (default, true,
  false, a string is E_SETTING_INVALID).
- `tests/integration/ir-v1.test.ts`: every golden manifest is 1.2 and validates.

## References
- ADR-0007 (versioning), ADR-0011 (the same minor-version pattern for scene animation).
- Task 023 (`docs/tasks/phase-3-design-system/023-reduced-motion.md`).
