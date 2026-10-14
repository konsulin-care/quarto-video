# packages/validator/ — staged validation and diagnostics
Status: Diagnostics model and formatters (task 008); content codes (012); stage runner with stage 2 IR schema and component contracts (014); stage 4 transitions and timeline (015, ADR-0005). Asset and output checks: tasks 016, 018, 037–038.
Run: `npm run typecheck -w @quarto-video/validator`; tests: root `npm run test`.

## Purpose
Decide whether an IR manifest may be rendered, and explain every problem in a
form humans and AI agents can act on (PRD §9).

## Owns
- The `Diagnostic` type (`src/diagnostic.ts`), its JSON Schema
  (`schema/diagnostic.json`), and the human and JSON formatters (`src/format.ts`).
- `parseDiagnostics` (`src/schema.ts`): checks JSON text against the schema.
- Stage runner (`src/run.ts`, `checkManifest`) for PRD §9.1. Stage 2 is the IR
  schema, then the component contracts (`src/stages/contract.ts`: component,
  slots, block kinds, duration; ADR-0004). Stage 4 is the timeline
  (`src/stages/timeline.ts`: transition names, lengths, overlaps, and that the
  manifest's timeline is the resolved one; ADR-0005). Stage 3 assets and 6 output
  check come later. Stage 1 is the Lua filter; stage 5 preflight lives in the CLI.
- Depends on `@quarto-video/ir` (IR types, schema, `resolveTimeline`) and `@quarto-video/registry`
  (contracts). Nothing depends on it except the CLI.
- Asset resolution and the security boundary (ADR-0006).
- Media metadata via `ffprobe`, cached in `.video-build/media.json` (task 037).

## Does not own
- Parsing Markdown → `_extensions/video`. Process orchestration → `cli`.
- Writing `.video-build/diagnostics.json` → the filter (`_extensions/video/lib/diagnostics.lua`).

## Diagnostic shape
`{ severity: "error"|"warning", code, message, file?, line?, sceneId?,
   component?, property?, assetPath?, suggestion? }`
- Only `severity`, `code` and `message` are always set. `line` is set for scene
  problems when the source text can be paired with the scenes (task 011).
- Human format (PRD §9.2): a header `ERROR <file>[:<line>]`, the message, then
  the suggestion; blocks are separated by a blank line.
- `--json` (and `.video-build/diagnostics.json`): a JSON array of these objects,
  validated by `schema/diagnostic.json`.

## Rules
- Stop after the first stage that produced an error; report all errors of that
  stage, not just the first. Stage 1 collects every settings and scene error.
- Warnings never change the exit status (`hasErrors` is the only test).
- Never execute project code, never use the network, never print environment
  variables or absolute paths outside the project root.
- Every code in the table has at least one test that triggers it (unit or fixture).
- Contract errors name the scene's opening line: the IR has no line per block.
- Codes are never reused. A new code is added to `DIAGNOSTIC_CODES` and to the table.

## Diagnostic codes
| Code | Stage | Meaning | Since |
| --- | --- | --- | --- |
| `E_SETTING_INVALID` | 1 filter | A front matter setting (`video.*`, `defaults.scene.transition`, `theme`) has a value that is not allowed | 008 (widened 010, 015) |
| `E_CONFIG_UNKNOWN_KEY` | 1 filter | A key under `video` or `defaults` is not a known setting; the message names it and the suggestion is the closest known key | 010 |
| `E_SCENE_NO_COMPONENT` | 1 filter | A `.scene` has no `component` attribute | 008 |
| `E_SCENE_NO_DURATION` | 1 filter | A `.scene` has no `duration` attribute | 008 |
| `E_SCENE_NESTED` | 1 filter | A `.scene` is nested inside another block | 008 |
| `E_SCENE_SHAPE` | 1 filter | A `.scene` has an unknown class or attribute, its `{...}` cannot be read, or Pandoc does not read its fence as a block | 008 (widened 011, 015) |
| `E_SCENE_ID_INVALID` | 1 filter | A scene id (`#id`) is not a letter then lowercase letters, digits and hyphens (max 64); the suggestion is a valid id | 011 |
| `E_SCENE_DUPLICATE_ID` | 1 filter | Two scenes have the same id (author ids or generated `scene-NNN`); the message names both lines | 011 |
| `E_DURATION_SYNTAX` | 1 filter | A `duration` (a scene's, `transitionDuration`, or `defaults.scene.duration`) is not a number of `s` or `ms` with up to 3 decimals, e.g. `"4"`, `"1e3s"` | 008 (widened 015) |
| `E_DURATION_RANGE` | 1 filter | A `duration` (a scene's, `transitionDuration`, or `defaults.scene.duration`) is zero or negative, above 3600 s, or rounds to less than one frame (ADR-0003) | 008 (widened 015) |
| `E_CONTENT_UNSUPPORTED` | 1 filter | Scene content has Markdown the content model does not support (a table, raw HTML or comment, footnote, math, link, image, ...), a block with a bad or missing slot class, a duplicate or empty slot; the line is the element's (ADR-0004) | 012 |
| `E_IR_SCHEMA` | 2 schema | The manifest fails the IR version it declares, 0.1, 0.2 or 0.3 (`message` gives the JSON path) | 008 (0.2 in 012, 0.3 in 015) |
| `E_COMPONENT_UNKNOWN` | 2 contract | A scene's `component` is not in the registry; the suggestion lists the available components | 014 |
| `E_SLOT_UNKNOWN` | 2 contract | A scene has content in a slot its component does not declare; the suggestion lists the slots | 014 |
| `E_SLOT_REQUIRED` | 2 contract | A required slot of the scene's component has no content | 014 |
| `E_SLOT_BLOCK_KIND` | 2 contract | A slot holds a block kind its contract does not accept (`paragraph`, `heading`, `list`, `code-block`); reported once per kind | 014 |
| `E_DURATION_BOUNDS` | 2 contract | A scene's duration is outside the component's `duration` bounds (inclusive, in ms as in the contract) | 014 |
| `E_TRANSITION_UNKNOWN` | 1 filter, 4 timeline | A scene's `transition` is not a transition name (filter: the syntax); stage 4: not in the registry (`transitions.json`); the suggestion lists the known names | 015 |
| `E_TRANSITION_DURATION` | 1 filter | A transition is missing its `transitionDuration`, a `cut` has one, or a `transitionDuration` has no transition (ADR-0005) | 015 |
| `E_TRANSITION_FIRST_SCENE` | 1 filter, 4 timeline | The first scene has a transition with time in it; it has no earlier scene to overlap (ADR-0005) | 015 |
| `E_TRANSITION_TOO_LONG` | 4 timeline | A transition is longer than either scene it joins (equal is allowed) | 015 |
| `E_TRANSITION_OVERLAP` | 4 timeline | The incoming and outgoing transitions of one scene, each of which fits, overlap inside it | 015 |
| `E_TIMELINE_MISMATCH` | 4 timeline | The manifest's `timeline` is not the one its scenes resolve to (a filter bug; `packages/ir/src/timeline.ts`) | 015 |
| `E_FILTER_FAILED` | 1 filter | The filter failed without writing usable diagnostics | 008 |

`E_SETTING_MISSING` (task 008) was retired in task 010: no setting is required
any more, because every setting has a default. The code is not emitted and must
not be reused.

## Testing
- Unit tests per stage in `test/`: formats (snapshots of the human text), schema,
  exit predicate, and the code table (`codes.test.ts` scans the sources).
- Lua: `_extensions/video/tests/test_diagnostics.lua` and the per-module tests.
- Stage 4: `test/timeline.test.ts` (each rule, the DoD cases, the mismatch code, IR 0.2 untouched); fixtures `tests/fixtures/projects/timeline-*` through `tests/integration/timeline.test.ts`.
- Stage 2: `test/contract.test.ts` (each rule on synthetic contracts), `test/run.test.ts`
  (stage runner, IR 0.1 guard). Fixture-driven: `tests/integration/contract.test.ts`
  (every `contract-*` fixture yields its `expected.json`; no render on stage 2 failure).
- Fixture-driven tests: `tests/integration/validate.test.ts`, fixtures in
  `tests/fixtures/projects/diagnostics-*`.

## Related
Tasks 008, 011, 012, 014–018, 037–038, 044. ADR-0004, 0005, 0006, 0008. PRD §9.
