# packages/ir/ — Video IR schema, types, time rules
Status: IR 0.1, 0.2 and 0.3 schemas, types, `validateIr()` and `ir:check` (tasks 002, 012, 015); duration → frames (009, ADR-0003); typed content and `plainText` (012, ADR-0004); timeline and transitions (015, ADR-0005). v1 freeze: task 017.
Run: `npm run typecheck -w @quarto-video/ir`; `npm run ir:check -w @quarto-video/ir -- <file.json>`; tests: root `npm run test`.

## Layout
| Path | Owns |
| --- | --- |
| `schema/ir-0.1.json`, `ir-0.2.json`, `ir-0.3.json` | JSON Schemas, draft 2020-12, `additionalProperties: false` |
| `src/types.ts`, `src/content-types.ts` | Hand-written types for 0.1, 0.2 and 0.3 (transitions, timeline), content nodes, `IrError`, `IrValidation` |
| `src/validate.ts` | `validateIr(json)`: picks the schema from `schemaVersion` (0.1, 0.2 or 0.3), all errors, JSON Pointer paths |
| `src/text.ts` | `plainText(content)`: the `default` slot as text (subpath `@quarto-video/ir/text`) |
| `src/check.ts` | File text → `OK` or `<path>: <message>` lines (pure) |
| `src/cli.ts` | `ir:check` entry point (tsx); exit 0 valid, 1 otherwise |
| `src/duration.ts` | `durationToFrames(text, fps)`: `"<n>s"`/`"<n>ms"` → frames (ADR-0003) |
| `src/timeline.ts` | `resolveTimeline(scenes)`: start frames and total (ADR-0005); `timelineOf(ir)` (subpath `@quarto-video/ir/timeline`, no ajv) |
| `src/index.ts` | Package exports (`PACKAGE_NAME`, `validateIr`, `durationToFrames`, types) |
| `test-vectors/durations.json` | Shared duration cases, run by TS and Lua (`{ input, fps, frames \| errorCode }`) |
| `test-vectors/timeline.json` | Shared timeline cases, run by TS and Lua (`{ scenes, startFrames, durationFrames }`) |
| `examples/minimal.json` | One 4 s title scene at 30 fps (IR 0.1); must validate |
| `examples/content-nodes.json` | IR 0.2 with every content node type and two slots |
| `examples/timeline.json` | IR 0.3: three scenes with 1 s fades (the ADR-0005 example; 300 frames) |
| `test/` | `validate`, `content` (0.2 nodes, versions, `plainText`), `timeline` (vectors, 0.3 schema, `timelineOf`), `schema` (no renderer terms), `cli`, `duration`, smoke |

## Decisions (task 015, ADR-0005)
- IR 0.3 is a new file (`ir-0.3.json`); 0.2 is unchanged. The filter emits 0.3. `validateIr` still accepts 0.1 and 0.2.
- Scene `transition` (optional) is `{ name, durationFrames }`: the overlap with the previous scene. No `transition` means no transition (a cut on the first scene).
- Top-level `timeline` (required in 0.3): `durationFrames` and `scenes: [{ id, startFrame }]` in scene order. Overlaps are frames shared by two scenes; the total is the end of the last scene.
- `resolveTimeline` is the TS rule; `lib/timeline.lua` is its twin. Both pass `test-vectors/timeline.json`.

## Decisions (task 012, ADR-0004)
- IR 0.2 `content` is `{ slots }`: slot name → array of blocks (`default` for loose content). `content.text` is 0.1 only.
- Nodes are lowercase `type` values: blocks `paragraph`, `heading`, `list`, `code-block`; inlines `text`, `strong`, `emphasis`, `quoted`, `code`, `line-break`.
- The schema rejects an empty `slots` object and empty slot arrays. Unknown slot names fail `patternProperties` (names are `^[a-z][a-z0-9-]{0,63}$`).
- Renderers call `plainText`, never the index: the index pulls in ajv, which the renderer bundle must not contain.

## Decisions (task 011)
- `scenes[].source.line` is optional: the 1-based line of the scene's opening
  fence in `source.file`. It is absent when the source text cannot be paired
  with the scenes (`_extensions/video/lib/locate.lua`). Renderers must not need it.

## Decisions (task 009, ADR-0003)
- Durations: `s` or `ms`, up to 3 decimals, exact in microseconds, rounded half up
  to frames. Zero, negative, > 3600 s and < 1 frame are errors.
- No built-in default duration. A scene without `duration` takes `defaults.scene.duration`
  from front matter (task 010); without it, the scene is `E_SCENE_NO_DURATION`.

## Decisions (task 002)
- Validator: `ajv@8.20.0` (exact; runtime dependency of this package), draft
  2020-12. ADR-0001 is silent on JSON Schema libraries; ajv is the common,
  maintained choice. ajv 6 (hoisted from ESLint) is draft-07 only.
- Error paths name the offending location: a missing key reports the key's
  own path (`/scenes/0/durationFrames`); an unknown key reports `/<key>`.
- The schema does not check scene id uniqueness; that is a validator rule.

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
