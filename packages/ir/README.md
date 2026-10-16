# packages/ir/ — Video IR schema, types, time rules

Status: IR 0.1, 0.2, 0.3 and frozen 1.0 to 1.9 schemas (1.9: optional top-level `music`, the project background track, task 045, ADR-0017; 1.8: source audio, `audio: "keep"` and `volume`, task 044, ADR-0009; 1.7: region footage, `placement: "region"` and a `region` name, task 043, ADR-0016; 1.6: scene `media` for `.video` footage, task 038; 1.5: number prop values, task 031, ADR-0015; 1.1: scene `animation`, task 021, ADR-0011; 1.2: `settings.reducedMotion`, task 023, ADR-0012; 1.3: the image block, task 033, ADR-0013; 1.4: scene `props` and `tables`, task 035, ADR-0014), types, `validateIr()` and `ir:check` (tasks 002, 012, 015, 017); duration → frames (009, ADR-0003); typed content and `plainText` (012, ADR-0004); timeline and transitions (015, ADR-0005); versions, the 1.0 freeze and the version gate (017, ADR-0007).
Run: `npm run typecheck -w @quarto-video/ir`; `npm run ir:check -w @quarto-video/ir -- <file.json>`; tests: root `npm run test`.

## Layout

| Path                                                                             | Owns                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema/ir-0.1.json` … `ir-1.9.json`                                             | JSON Schemas, draft 2020-12, `additionalProperties: false`. Released files are frozen (ADR-0007)                                                                                                                                                                                         |
| `src/types.ts`, `src/content-types.ts`                                           | Hand-written types for 0.1 to 1.5 (timeline, transitions, `generator`), content nodes and image blocks, scene props (1.5: text or number) and tables, `IrError`, `IrValidation`                                                                                                          |
| `src/music-types.ts`                                                             | `IrMusic`, the project music track of IR 1.9 (ADR-0017)                                                                                                                                                                                                                                  |
| `src/versions.ts`                                                                | `SUPPORTED_VERSIONS`, `LATEST_VERSION` (1.9), `UNSUPPORTED_VERSION_CODE`, the gate's message                                                                                                                                                                                             |
| `src/validate.ts`                                                                | `validateIr(json)`: the version gate, then the schema for the declared version; all errors, JSON Pointer paths                                                                                                                                                                           |
| `src/text.ts`                                                                    | `plainText(content)`: the `default` slot as text; `slotTexts(content)`: each slot's text by name (task 024; subpath `@quarto-video/ir/text`)                                                                                                                                             |
| `src/check.ts`                                                                   | File text → `OK` or `<path>: <message>` lines (pure)                                                                                                                                                                                                                                     |
| `src/cli.ts`                                                                     | `ir:check` entry point (tsx); exit 0 valid, 1 otherwise                                                                                                                                                                                                                                  |
| `src/duration.ts`                                                                | `durationToFrames(text, fps)`: `"<n>s"`/`"<n>ms"` → frames (ADR-0003)                                                                                                                                                                                                                    |
| `src/timeline.ts`                                                                | `resolveTimeline`, `timelineOf`, `hasTimeline` (subpath `@quarto-video/ir/timeline`, no ajv)                                                                                                                                                                                             |
| `src/index.ts`                                                                   | Package exports (`PACKAGE_NAME`, `validateIr`, versions, durations, timeline, types)                                                                                                                                                                                                     |
| `test-vectors/durations.json`, `timeline.json`                                   | Shared vectors, run by TS and Lua                                                                                                                                                                                                                                                        |
| `examples/minimal.json` (0.1), `content-nodes.json` (0.2), `timeline.json` (0.3) | Older reference manifests; must validate                                                                                                                                                                                                                                                 |
| `examples/v1.json` … `v1.9.json`                                                 | IR 1.0 reference (the 0.3 timeline example with `generator`); 1.1 adds one scene `animation`; 1.2 adds `settings.reducedMotion`; 1.3 adds an image block; 1.4 adds a chart scene with `props` and `tables`; 1.5 adds a statistic scene with number props; 1.9 adds a project music track |
| `test/`                                                                          | `validate`, `versions`, `v1`, `v11`, `v12`, `v13`, `v14`, `v17`, `v18`, `frozen` (schema hashes), `generator` (versions match the repo), `content`, `timeline`, `schema`, `cli`, `duration`, smoke                                                                                       |

## Versions (ADR-0007)

- `schemaVersion` is `"MAJOR.MINOR"`, one file per version. The filter writes `1.5` only.
- `validateIr` reads 0.1, 0.2, 0.3, 1.0 to 1.8. Any other `schemaVersion` is
  `E_IR_UNSUPPORTED_VERSION` at `/schemaVersion`, and the message lists the supported versions.
  A missing `schemaVersion` is `is required` at `/schemaVersion` and nothing else.
- IR 1.0 is IR 0.3 plus a required `generator: {extension, cli}` (semver strings). Nothing else changed.
- IR 1.1 (ADR-0011) is 1.0 plus an optional scene `animation: {name}`, a preset id. Only shape is checked here; the registry is checked by the validator.
- IR 1.2 (ADR-0012) is 1.1 plus an optional `settings.reducedMotion` boolean (absent means false). The filter always writes it; the renderer applies each preset's reduced-motion rule.
- IR 1.3 (ADR-0013) is 1.2 plus an image block in scene content (`{type: "image", src, fit, alt}`).
- IR 1.4 (ADR-0014) is 1.3 plus, on a scene, `props` (strings: the authored attributes, checked by the validator against the contract) and `tables` (`{columns, rows}` per CSV prop, written by the validator only). A scene may have no slots; the contract decides which are required.
- IR 1.9 (task 045, ADR-0017) is 1.8 plus an optional top-level `music`: `src` (project-relative), `volume` (above 0, at most 1), `loop` (boolean), optional `fadeOutFrames` (at least 1) and optional `lengthFrames` (at least 1; the validator writes it from the probed file). The filter writes 1.9 only when `audio.music` is set.
- IR 1.8 (task 044, ADR-0009) is 1.7 plus a media item `audio` of `keep` (as well as `mute`) and, with `keep` only, `volume`: a number above 0 and at most 1 (linear gain). The filter writes 1.8 only for a manifest with a kept clip.
- IR 1.7 (task 043, ADR-0016) is 1.6 plus a media item `placement` of `region` and its `region` name (an identifier; absent for other placements; no `frame`). The filter writes 1.7 only for a manifest with region footage.
- IR 1.6 (task 038, ADR-0007) is 1.5 plus a scene `media` array of `.video` items: `src`, `placement` (`background` or `framed`), `fit`, optional `frame`, `sourceStartFrames`, optional `sourceEndFrames` (source frames at the project fps, never timeline frames), `audio` (`mute` or `keep`, task 044), `loop`, `freeze`, `playbackRate` (positive), `alt`. Additive: 1.0 to 1.5 are frozen and unchanged.
- IR 1.5 (ADR-0015) is 1.4 plus scene `props` values that may be JSON numbers (the validator writes them from a number prop). Text props are unchanged. Additive: 1.0 to 1.4 are frozen and unchanged.
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
