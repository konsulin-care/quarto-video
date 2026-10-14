# packages/validator/ — staged validation and diagnostics
Status: Diagnostics model and formatters (task 008). Stage runner and asset, timeline and output checks: tasks 014, 015, 016, 018, 037–038.
Run: `npm run typecheck -w @quarto-video/validator`; tests: root `npm run test`.

## Purpose
Decide whether an IR manifest may be rendered, and explain every problem in a
form humans and AI agents can act on (PRD §9).

## Owns
- The `Diagnostic` type (`src/diagnostic.ts`), its JSON Schema
  (`schema/diagnostic.json`), and the human and JSON formatters (`src/format.ts`).
- `parseDiagnostics` (`src/schema.ts`): checks JSON text against the schema.
- Stage runner for PRD §9.1 stages 2–4 and 6 (later tasks):
  2 schema/contract · 3 assets · 4 timeline · 6 output check.
  (Stage 1 is the Lua filter; stage 5 preflight lives in the CLI.)
- Asset resolution and the security boundary (ADR-0006).
- Media metadata via `ffprobe`, cached in `.video-build/media.json` (task 037).

## Does not own
- Parsing Markdown → `_extensions/video`. Process orchestration → `cli`.
- Writing `.video-build/diagnostics.json` → the filter (`_extensions/video/lib/diagnostics.lua`).

## Diagnostic shape
`{ severity: "error"|"warning", code, message, file?, line?, sceneId?,
   component?, property?, assetPath?, suggestion? }`
- Only `severity`, `code` and `message` are always set. `line` stays optional
  until task 011.
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
- Codes are never reused. A new code is added to `DIAGNOSTIC_CODES` and to the table.

## Diagnostic codes
| Code | Stage | Meaning | Since |
| --- | --- | --- | --- |
| `E_SETTING_MISSING` | 1 filter | A required `video` setting or the whole `video` block is absent | 008 |
| `E_SETTING_INVALID` | 1 filter | A `video` setting has a value that is not allowed | 008 |
| `E_SCENE_NO_COMPONENT` | 1 filter | A `.scene` has no `component` attribute | 008 |
| `E_SCENE_NO_DURATION` | 1 filter | A `.scene` has no `duration` attribute | 008 |
| `E_SCENE_NESTED` | 1 filter | A `.scene` is nested inside another block | 008 |
| `E_SCENE_SHAPE` | 1 filter | A `.scene` has an identifier, an unknown class or an unknown attribute | 008 |
| `E_DURATION_SYNTAX` | 1 filter | A `duration` is not a number of `s` or `ms` with up to 3 decimals, e.g. `"4"`, `"1e3s"` | 008 |
| `E_DURATION_RANGE` | 1 filter | A `duration` is zero or negative, above 3600 s, or rounds to less than one frame (ADR-0003) | 008 |
| `E_IR_SCHEMA` | 2 schema | The manifest fails IR 0.1 (`message` gives the JSON path) | 008 |
| `E_FILTER_FAILED` | 1 filter | The filter failed without writing usable diagnostics | 008 |

## Testing
- Unit tests per stage in `test/`: formats (snapshots of the human text), schema,
  exit predicate, and the code table (`codes.test.ts` scans the sources).
- Lua: `_extensions/video/tests/test_diagnostics.lua` and the per-module tests.
- Fixture-driven tests: `tests/integration/validate.test.ts`, fixtures in
  `tests/fixtures/projects/diagnostics-*`.

## Related
Tasks 008, 011, 014–018, 037–038, 044. ADR-0006, 0008. PRD §9.
