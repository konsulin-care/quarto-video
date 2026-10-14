# packages/ir/ — Video IR schema, types, time rules
Status: Scaffold (task 001): `src/index.ts` and a smoke test. Schema and types: tasks 002, 009, 012, 015, 017.
Run: `npm run typecheck -w @quarto-video/ir`; tests: root `npm run test`.

## Purpose
The single, versioned, renderer-independent contract between authoring and
rendering (PRD §8.2, §8.3). Everything else depends on this package; it
depends on nothing internal.

## Owns
- JSON Schema for each IR version: `schema/ir-<version>.json` (source of truth).
- TypeScript types matching the schema (generated or hand-written + tested).
- `validateIr(json)` — structural schema check, returns diagnostics.
- `schemaVersion` parsing and compatibility check.
- Duration/time helpers and shared test vectors
  (`test-vectors/durations.json`) used by Lua and TS.
- Example manifests in `examples/` (each must validate).
- `ir:check` script: `npm run ir:check -w packages/ir -- <file.json>`.

## Does not own
- Component-specific rules (slots, props) → `packages/registry`.
- Asset existence or media metadata → `packages/validator`.

## Rules
- All timeline values are integer frames. Source-time values are stored in
  frames too, but in fields prefixed `source` (e.g. `sourceStartFrames`).
- No Remotion, React, CSS, or executable content in the schema.
- Renderer-specific settings only under keys matching `^x-[a-z]+$`.
- `additionalProperties: false` everywhere except `x-*` namespaces.
- Changing a frozen schema requires a new version file + ADR-0007 policy.
- Every schema change ships with an example and a failing-case test.

## Testing
`npm run check` runs schema tests, type tests, and examples validation.

## Related
Tasks 002, 009, 012, 015, 017. ADR-0003, 0004, 0005, 0007.
