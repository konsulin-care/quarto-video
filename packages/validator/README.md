# packages/validator/ — staged validation and diagnostics
Status: diagnostics (008); stages 2–4 (014–017; ADR-0004 to ADR-0007); number props (031, ADR-0015); stage 6 output check (018); theme name, stage 2 (019). Media formats and probe (037, ADR-0008); media source ranges (038, IR 1.6).
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
  slots, block kinds, duration; ADR-0004; `src/stages/animation.ts`: presets, ADR-0011;
  `src/stages/props.ts`: props against the contract, ADR-0014; `src/stages/number.ts`: number props, ADR-0015, whose text becomes a JSON number in the resolved IR after stage 2 passes). Stage 3 has two parts:
  asset references (`src/assets/`, `src/stages/assets.ts`), which run only when the
  caller passes them, and data (`src/stages/data.ts`, `src/csv/parse.ts`, task 035):
  each csv prop is read through the asset resolver and parsed (no code runs), column
  props are checked against its header, and the parsed tables are added to the IR as
  `tables` (ADR-0014). `video validate` and `video render` pass the project root, so
  data runs for them. Stage 4 is the timeline
  (`src/stages/timeline.ts`: transition names, lengths, overlaps, and that the
  manifest's timeline is the resolved one; ADR-0005). Stage 3 (`src/assets/`,
  `src/stages/assets.ts`) checks the image blocks' files (ADR-0013) and reads the CSV props into `tables` (ADR-0014); a caller may pass its own references instead. Stage 6 (`src/stages/output.ts`,
  `checkOutput`) judges the rendered file from facts the CLI probes. Stage 1 is the Lua
  filter; stage 5 preflight is in the CLI. `checkTheme` (`src/stages/theme.ts`) resolves the theme name (stage 2).
- Depends on `@quarto-video/ir` and `@quarto-video/registry` (contracts, themes); nothing depends on it except the CLI.
- Asset resolution and the security boundary (ADR-0006): `src/assets/syntax.ts` (the text of a path), `src/assets/resolve.ts` (the file system: exact names, realpath inside the root).
- Media (ADR-0008): `src/media/formats.ts` (the guaranteed formats and their codec rules),
  `src/media/probe.ts` (the `ffprobe` wrapper: argument array, timeout, `-protocol_whitelist file`),
  `src/media/cache.ts` (`.video-build/media.json`, keyed by path, valid while size and mtime match),
  `src/stages/media.ts` (one video or audio reference). Stage 3 probes only references with `use` video or audio.
- Media source ranges (038): `src/stages/media-range.ts` (pure: a `.video` block's source range against the probed duration; E_MEDIA_RANGE, E_MEDIA_SHORT_SOURCE). `assetRefsOf` gives each `.video` block its range; the stage never stretches footage.

## Does not own
- Parsing Markdown and writing `.video-build/diagnostics.json` → `_extensions/video`; orchestration → `cli`.

## Diagnostic shape
`{ severity: "error"|"warning", code, message, file?, line?, sceneId?,
   component?, property?, assetPath?, suggestion? }`
- Only `severity`, `code`, `message` are always set; `line` when the source pairs (task 011).
- Human format (PRD §9.2): a header `ERROR <file>[:<line>]`, the message, then
  the suggestion; blocks are separated by a blank line.
- `--json` and `.video-build/diagnostics.json`: a JSON array, per `schema/diagnostic.json`.

## Rules
- Stop after the first stage with an error; report all of that stage's errors.
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
| `E_SCENE_SHAPE` | 1 filter, 2 contract | A `.scene` has an unknown class, its `{...}` cannot be read, or Pandoc does not read its fence as a block (filter); stage 2: an attribute that is not a scene attribute is not a prop of its component (ADR-0014) | 008 (widened 011, 015, 035) |
| `E_SCENE_ID_INVALID` | 1 filter | A scene id (`#id`) is not a letter then lowercase letters, digits and hyphens (max 64); the suggestion is a valid id | 011 |
| `E_SCENE_DUPLICATE_ID` | 1 filter | Two scenes have the same id (author ids or generated `scene-NNN`); the message names both lines | 011 |
| `E_DURATION_SYNTAX` | 1 filter | A `duration` (a scene's, `transitionDuration`, or `defaults.scene.duration`) is not a number of `s` or `ms` with up to 3 decimals, e.g. `"4"`, `"1e3s"` | 008 (widened 015) |
| `E_DURATION_RANGE` | 1 filter | A `duration` (a scene's, `transitionDuration`, or `defaults.scene.duration`) is zero or negative, above 3600 s, or rounds to less than one frame (ADR-0003) | 008 (widened 015) |
| `E_CONTENT_UNSUPPORTED` | 1 filter | Scene content has Markdown the content model does not support (a table, raw HTML or comment, footnote, math, link, image, ...), a block with a bad or missing slot class, a duplicate or empty slot; the line is the element's (ADR-0004) | 012 |
| `E_IMAGE_BLOCK` | 1 filter | An image block (`.image`, ADR-0013) has no `src`, has no `alt`, a `fit` other than `cover` or `contain`, an unknown attribute, an id, extra classes or content, or a scene has a second image; the line is the block's | 033 |
| `E_VIDEO_BLOCK` | 1 filter | A `.video` block (ADR-0008, IR 1.6) has an unknown attribute, no `src`, an `audio` other than `mute`, a `placement` other than `background` or `framed`, a `frame` without `framed` (or framed without one), a `fit` other than `cover` or `contain`, a `loop` or `freeze` that is not `true` or `false`, an id or extra classes, content, a second block in the scene, or a block inside a slot; the line is the block's | 038 |
| `E_VIDEO_AUDIO_REQUIRED` | 1 filter | A `.video` block has no `audio` attribute; the suggestion is `audio="mute"` (PRD §6.2) | 038 |
| `E_VIDEO_RANGE` | 1 filter | A `.video` block's `sourceStart` is at or after its `sourceEnd` (equal is an empty range); the message gives both values | 038 |
| `E_VIDEO_PLAYBACK_RATE` | 1 filter | A `.video` block's `playbackRate` is not a positive number (zero, negative, or text such as `fast`) | 038 |
| `E_VIDEO_LOOP_FREEZE` | 1 filter | A `.video` block has both `loop="true"` and `freeze="true"`; they are mutually exclusive (task 038) | 038 |
| `E_IR_SCHEMA` | 2 schema | The manifest fails the IR version it declares, 0.1 to 1.1 (`message` gives the JSON path) | 008 (0.2 in 012, 0.3 in 015, 1.0 in 017, 1.1 in 021) |
| `E_IR_UNSUPPORTED_VERSION` | 2 schema | `schemaVersion` is not a supported IR version (any value other than 0.1, 0.2, 0.3, 1.0 or 1.1, including numbers); the message lists the supported versions (ADR-0007) | 017 |
| `E_COMPONENT_UNKNOWN` | 2 contract | A scene's `component` is not in the registry; the suggestion lists the available components | 014 |
| `E_SLOT_UNKNOWN` | 2 contract | A scene has content in a slot its component does not declare; the suggestion lists the slots | 014 |
| `E_SLOT_REQUIRED` | 2 contract | A required slot of the scene's component has no content | 014 |
| `E_SLOT_BLOCK_KIND` | 2 contract | A slot holds a block kind its contract does not accept (`paragraph`, `heading`, `list`, `code-block`); reported once per kind | 014 |
| `E_SLOT_CONSTRAINT` | 2 contract | A slot breaks its contract's item limit: its one list has fewer or more items than the `items` range, or the slot holds more than one list; the message gives the limit | 027 |
| `E_PROP_REQUIRED` | 2 contract | A prop the contract marks `required` is missing from the scene | 035 (ADR-0014) |
| `E_PROP_VALUE` | 2 contract | A prop's value is empty, not one of its `enum`, not `true`/`false` for a boolean, or not a `.csv` path for a `csv` prop; a `number` prop is outside its `min`/`max`, not a whole number where `integer` is set, or not finite | 035 (ADR-0014), 031 (ADR-0015) |
| `E_PROP_TYPE` | 2 contract | A `number` prop's text is not a number (`abc`, `1,000`, `NaN`): a decimal literal such as `42`, `-0.5` or `1e9` is one; the suggestion says how to write it | 031 (ADR-0015) |
| `E_DURATION_BOUNDS` | 2 contract | A scene's duration is outside the component's `duration` bounds (inclusive, in ms as in the contract) | 014 |
| `E_ANIMATION_UNKNOWN` | 1 filter, 2 contract | A scene's `animation` is not an animation name (filter: the syntax); stage 2: not a registered preset (`packages/registry/animations/`); the suggestion lists the known presets (ADR-0011) | 021 |
| `E_ANIMATION_INCOMPATIBLE` | 2 contract | A registered preset does not apply to the scene's component (the component or the preset lacks the other); the suggestion lists the component's animations | 021 |
| `E_THEME_UNKNOWN` | 2 contract | The document's `theme` is not a registered theme (`packages/registry/themes/`); the suggestion lists the available themes. A missing `theme` means `modern` | 019 |
| `E_TRANSITION_UNKNOWN` | 1 filter, 4 timeline | A scene's `transition` is not a transition name (filter: the syntax); stage 4: not in the registry (`transitions.json`); the suggestion lists the known names | 015 |
| `E_TRANSITION_DURATION` | 1 filter | A transition is missing its `transitionDuration`, a `cut` has one, or a `transitionDuration` has no transition (ADR-0005) | 015 |
| `E_TRANSITION_FIRST_SCENE` | 1 filter, 4 timeline | The first scene has a transition with time in it; it has no earlier scene to overlap (ADR-0005) | 015 |
| `E_TRANSITION_TOO_LONG` | 4 timeline | A transition is longer than either scene it joins (equal is allowed) | 015 |
| `E_TRANSITION_OVERLAP` | 4 timeline | The incoming and outgoing transitions of one scene, each of which fits, overlap inside it | 015 |
| `E_TIMELINE_MISMATCH` | 4 timeline | The manifest's `timeline` is not the one its scenes resolve to (a filter bug; `packages/ir/src/timeline.ts`) | 015 |
| `E_ASSET_MISSING` | 3 assets | An asset path names no file under the project root, or a directory; each segment matches exactly, case included. The message names the scene (ADR-0006) | 016 |
| `E_ASSET_ABSOLUTE` | 3 assets | An asset path starts with `/` or `\`, or a drive letter (`C:`). Its text is not printed | 016 |
| `E_ASSET_ESCAPE` | 3 assets | An asset path has a `..` segment, so it is outside the project root, even when it would stay inside | 016 |
| `E_ASSET_SYMLINK` | 3 assets | An asset resolves, through a symlink, to a file outside the project root. The target is not printed | 016 |
| `E_ASSET_URL` | 3 assets | An asset path has a URL scheme (`https:`, `file:`, `data:`, ...). Remote assets are not supported | 016 |
| `E_ASSET_INVALID` | 3 assets | An asset path is empty, has a control character, a backslash, a percent-encoded sequence, or a trailing slash | 016 |
| `E_MEDIA_FORMAT` | 3 assets | An asset's file has an extension not guaranteed for its use (image: png, jpg, jpeg, webp, svg), or a video or audio file's codecs are outside the guaranteed set (ADR-0008). The message names the file, and the suggestion lists the formats | 037 |
| `E_MEDIA_UNREADABLE` | 3 assets | A video or audio file cannot be probed: ffprobe cannot read it, has no stream, an unknown duration, or does not finish in 10 s. The path is printed, never the ffprobe output | 037 |
| `E_MEDIA_RANGE` | 3 assets | A `.video` block's source range is outside its file: `sourceEnd` is past the probed duration, or `sourceStart` is at or after it (ADR-0008, task 038). The message names the file; the line is the block's | 038 |
| `E_MEDIA_SHORT_SOURCE` | 3 assets | A `.video` block's source range (`sourceEnd` or the file's end, minus `sourceStart`, divided by `playbackRate`) is shorter than its scene and the block has neither `loop="true"` nor `freeze="true"`. Footage is never stretched (PRD §6.2) | 038 |
| `E_CSV_SYNTAX` | 3 data | A CSV prop's file is malformed: an unclosed or misplaced quote, a blank line, a row with the wrong number of fields, a missing or repeated header name, or no data rows. `line` is the CSV line | 035 (ADR-0014) |
| `E_COLUMN_UNKNOWN` | 3 data | A column prop (for example `x` or `y` of `chart`) names no column of its CSV; the message lists the available columns | 035 (ADR-0014) |
| `E_CSV_VALUE` | 3 data | A numeric column (`numeric` in the contract) has a cell that is not a number. `line` is the CSV line | 035 (ADR-0014) |
| `E_OUTPUT_MISSING` | 6 output | No file at `video.output` after the render, or an empty one; the render fails and nothing is renamed into place | 018 |
| `E_OUTPUT_UNREADABLE` | 6 output | The rendered file has no readable video stream | 018 |
| `E_OUTPUT_MISMATCH` | 6 output | The rendered width, height, fps or frame count differs from the IR; `property` names it | 018 |
| `E_FILTER_FAILED` | 1 filter | The filter failed without writing usable diagnostics | 008 |
| `W_SLOT_TOO_MANY_BLOCKS` | 2 contract | Warning. A slot holds more blocks than its contract's `maxBlocks` (the statement's `default` shows one); the suggestion says how many to keep | 025 |
| `W_TEXT_FIT` | 2 text fit | Warning. A component's text (contract `textFit`: the `default` slot, or the `subtitle` slot beside it) does not fit the frame even at the smallest size of its range; the suggestion says to shorten it or use a larger frame | 025, 026 |
| `W_ANIMATION_FALLBACK` | 2 animation | Warning. A `kinetic` statement has more than 12 words (`KINETIC_MAX_WORDS`, `registry/kinetic`); its scene is drawn with `fade-in`. The suggestion says to shorten it or choose another preset | 026 |

`E_SETTING_MISSING` (task 008) was retired in task 010 (every setting has a default).
It is not emitted and must not be reused.

## Testing
- Unit tests per stage in `test/`: formats, schema, exit predicate, the code table
  (`codes.test.ts`). Lua: `_extensions/video/tests/test_diagnostics.lua`.
- Media source ranges (038): `test/media-range.test.ts` (the range rules, the reference list, the stage with a spy probe); CLI: `tests/integration/media-range.test.ts` (the media-range-* projects). Media (037): `test/media-formats.test.ts` (extension and codec rules), `test/media-probe.test.ts` (ffprobe on `tests/fixtures/media/generate.sh` output), `test/media-stage.test.ts` (probe once and cache, corrupt files); CLI: `tests/integration/media-probe.test.ts`.
- Stage 4: `test/timeline.test.ts`; fixtures `timeline-*` (`tests/integration/timeline.test.ts`). Stage 6: `test/output.test.ts`; `tests/integration/preflight-output.test.ts`.
- Stage 2: `test/contract.test.ts` (each rule on synthetic contracts), `test/run.test.ts`
  (stage runner, IR 0.1 guard). Fixture-driven: `tests/integration/contract.test.ts`
  (every `contract-*` fixture yields its `expected.json`; no render on stage 2 failure). Animations: `test/animation.test.ts` (unknown, incompatible, valid).
- Stage 3: `test/assets-syntax.test.ts` (each form and code), `test/assets-resolve.test.ts` (temp-dir projects), `test/assets-stage.test.ts`, `test/assets-fixtures.test.ts` (`tests/fixtures/projects/assets-names/expected.json`). Fixtures: `tests/integration/validate.test.ts` (`tests/fixtures/projects/diagnostics-*`), Theme: `test/theme.test.ts`, `tests/integration/theme.test.ts`.

## Related
Tasks 008, 011, 012, 014–018, 021, 037–038, 044. ADR-0004, 0005, 0006, 0008. PRD §6.3, §9.
