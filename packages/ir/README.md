# packages/ir/ — Video IR schema, types, time rules
Status: IR 0.1, 0.2, 0.3 and frozen 1.0, 1.1 and 1.2 schemas (1.1: scene `animation`, task 021, ADR-0011; 1.2: `settings.reducedMotion`, task 023, ADR-0012), types, `validateIr()` and `ir:check` (tasks 002, 012, 015, 017); duration → frames (009, ADR-0003); typed content and `plainText` (012, ADR-0004); timeline and transitions (015, ADR-0005); versions, the 1.0 freeze and the version gate (017, ADR-0007).
Run: `npm run typecheck -w @quarto-video/ir`; `npm run ir:check -w @quarto-video/ir -- <file.json>`; tests: root `npm run test`.

## Layout
| Path | Owns |
| --- | --- |
| `schema/ir-0.1.json` … `ir-1.2.json` | JSON Schemas, draft 2020-12, `additionalProperties: false`. Released files are frozen (ADR-0007) |
| `src/types.ts`, `src/content-types.ts` | Hand-written types for 0.1 to 1.2 (timeline, transitions, `generator`), content nodes, `IrError`, `IrValidation` |
| `src/versions.ts` | `SUPPORTED_VERSIONS`, `LATEST_VERSION` (1.2), `UNSUPPORTED_VERSION_CODE`, the gate's message |
| `src/validate.ts` | `validateIr(json)`: the version gate, then the schema for the declared version; all errors, JSON Pointer paths |
| `src/text.ts` | `plainText(content)`: the `default` slot as text; `slotTexts(content)`: each slot's text by name (task 024; subpath `@quarto-video/ir/text`) |
| `src/check.ts` | File text → `OK` or `<path>: <message>` lines (pure) |
| `src/cli.ts` | `ir:check` entry point (tsx); exit 0 valid, 1 otherwise |
| `src/duration.ts` | `durationToFrames(text, fps)`: `"<n>s"`/`"<n>ms"` → frames (ADR-0003) |
| `src/timeline.ts` | `resolveTimeline`, `timelineOf`, `hasTimeline` (subpath `@quarto-video/ir/timeline`, no ajv) |
| `src/index.ts` | Package exports (`PACKAGE_NAME`, `validateIr`, versions, durations, timeline, types) |
| `test-vectors/durations.json`, `timeline.json` | Shared vectors, run by TS and Lua |
| `examples/minimal.json` (0.1), `content-nodes.json` (0.2), `timeline.json` (0.3) | Older reference manifests; must validate |
| `examples/v1.json`, `v1.1.json`, `v1.2.json` | IR 1.0 reference (the 0.3 timeline example with `generator`); 1.1 adds one scene `animation`; 1.2 adds `settings.reducedMotion` |
| `test/` | `validate`, `versions`, `v1`, `v11`, `v12`, `frozen` (schema hashes), `generator` (versions match the repo), `content`, `timeline`, `schema`, `cli`, `duration`, smoke |

## Versions (ADR-0007)
- `schemaVersion` is `"MAJOR.MINOR"`, one file per version. The filter writes `1.2` only.
- `validateIr` reads 0.1, 0.2, 0.3, 1.0, 1.1 and 1.2. Any other `schemaVersion` is
  `E_IR_UNSUPPORTED_VERSION` at `/schemaVersion`, and the message lists the supported versions.
  A missing `schemaVersion` is `is required` at `/schemaVersion` and nothing else.
- IR 1.0 is IR 0.3 plus a required `generator: {extension, cli}` (semver strings). Nothing else changed.
- IR 1.1 (ADR-0011) is 1.0 plus an optional scene `animation: {name}`, a preset id. Only shape is checked here; the registry is checked by the validator.
- IR 1.2 (ADR-0012) is 1.1 plus an optional `settings.reducedMotion` boolean (absent means false). The filter always writes it; the renderer applies each preset's reduced-motion rule.
- A released schema file never changes; `test/frozen.test.ts` checks its SHA-256. A change is a new file and an ADR.
- Minor versions are additive; a major version may break. Pre-1.0 versions are read, never written.

## Decisions (tasks 015, 012, 011, 009, 002)
- Timeline (ADR-0005): scene `transition` is `{ name, durationFrames }`, the overlap with the
  previous scene; `cut` is 0 frames. Top-level `timeline` (0.3 and 1.0) lists each scene's
  `startFrame`; the total is the end of the last scene. `resolveTimeline` is the TS rule;
  `lib/timeline.lua` is its twin.
- Content (ADR-0004): 0.2 and later use `content: { slots }`, slot name → blocks (`default` for loose
  content); `content.text` is 0.1 only. Nodes are lowercase `type` values. Renderers call `plainText`,
  never the index (ajv must stay out of the renderer bundle).
- `scenes[].source.line` is optional: the 1-based opening fence line, absent when unknown.
- Durations: `s` or `ms`, exact in microseconds, rounded half up to frames (ADR-0003). No default duration.
- Validator: `ajv@8.20.0` (exact), draft 2020-12. Error paths name the location; unknown keys report `/<key>`.
- The schema does not check scene id uniqueness; that is a validator rule.

## Purpose
The single, versioned, renderer-independent contract between authoring and
rendering (PRD §8.2, §8.3). Everything else depends on this package; it
depends on nothing internal.

## Owns
- JSON Schema for each IR version: `schema/ir-<version>.json` (source of truth).
- TypeScript types matching the schema (hand-written, tested against the schemas and examples).
- `validateIr(json)` and the version gate; `ir:check`.
- Duration/time helpers and shared test vectors used by Lua and TS.
- Example manifests in `examples/` (each must validate).

## Does not own
- Component-specific rules (slots, props) → `packages/registry`.
- Asset existence or media metadata → `packages/validator`.

## Rules
- All timeline values are integer frames. Source-time values are stored in
  frames too, but in fields prefixed `source` (e.g. `sourceStartFrames`).
- No Remotion, React, CSS, or executable content in the schema.
- Renderer-specific settings belong in an `x-*` namespace (this README's rule; PRD §8.2 asks for an isolated namespace). No schema implements it yet (ADR-0007 open item).
- `additionalProperties: false` everywhere.
- Changing a released schema requires a new version file and the ADR-0007 policy.
- Every schema change ships with an example and a failing-case test.

## Related
Tasks 002, 009, 011, 012, 015, 017. ADR-0003, 0004, 0005, 0007.
