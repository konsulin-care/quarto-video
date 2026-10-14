# packages/cli/ — the `video` command
Status: `video validate` (task 005), `video render` (task 006, both with `--json`, task 008) and `video components` (task 013) are real. `doctor` arrives with task 018.
Run from the repo root (after `npm ci`): `npx video render videos/hello`. From any other directory: `npm exec --prefix <repo> -- video render <path>`. Tests: `npm run test:integration` (spawns the bin); unit tests run from the root with `npm run test`.

## Purpose
The supported end-to-end entry point (PRD §4.2): resolve a project, run the
filter, validate, render, and report.

## Commands
| Command | Task | Behaviour |
| ------- | ---- | --------- |
| `video validate <path> [--print-ir]` or `[--json]` | 005, 008, 014 | Stages 1–2: filter, then IR schema and component contracts. Done |
| `video render <path> [--json]` | 006, 008 | Stages 1–2, then render to `video.output`. Done |
| `video components [--json]` | 013 | List registry component contracts. Done |
| `video doctor` | 018 | Environment and version report |

`--print-ir` and `--json` cannot be combined (exit 2). `--output <path>` is not implemented yet.
Use `video.output` in front matter to choose the destination.

## Entry point
- `bin/video.mjs` registers tsx (ADR-0001) and runs `src/cli.ts` from any cwd.
  `npx video` resolves only inside the repo; elsewhere use `npm exec --prefix <repo> -- video`.

## `components` output (`src/commands/components.ts`)
- Table on stdout: `ID VERSION DURATION SLOTS PROPS`; durations in author syntax (`1s-30s`). `--json`: a JSON array of the full contracts.
- Needs no project. Exit 0; exit 2 for extra arguments, unknown flags or a broken registry (`video: <message>`).

## Project resolution (`src/project.ts`)
- `<path>` is a project dir or a `.qmd` file. `<dir>` → `<dir>/index.qmd`; `<file.qmd>` → its parent is the project root.
- Relative paths resolve from the caller's cwd. Build files go under `<root>/.video-build/`.
- A missing path, a directory without `index.qmd`, or a file that is not `.qmd` → exit 2, message names the path.

## `validate` output (`src/commands/validate.ts`)
- Success: `OK <name> (<n> scenes, <frames> frames)` on stdout.
- `--print-ir`: the validated IR JSON alone on stdout; the OK line moves to stderr.
- Errors and warnings: diagnostics as text on stderr (`ERROR <file>`, message, suggestion; `src/report.ts`). An IR schema error is `E_IR_SCHEMA` about `.video-build/manifest.json`.
- `--json`: the diagnostics as a JSON array on stdout, with nothing else on stdout (no OK line). A valid project prints `[]`.

## `render` output and orchestration (`src/commands/render.ts`)
1. Resolve the project, then run the same stages 1–2 as `validate` (`src/check.ts`).
   A failure exits 1 and the renderer is never called; no output file is touched.
2. Read `video.output` from `.video-build/render.json` (written by the filter), resolved against the project root.
3. Render with `render()` from `@quarto-video/remotion` to a temp file,
   `<root>/.video-build/render.partial.mp4`.
4. On success, create the output's directory and rename the temp file to the output path.
   On failure, delete the temp file. The previous `output.mp4` is never opened for writing.

Streams (chosen so stdout is parseable):
- stdout: `NN%` progress lines, one per whole percent of encoded frames, then `Wrote <path>` (path relative to the cwd, e.g. `Wrote videos/hello/output.mp4`).
- With `--json`, stdout first gets the diagnostics array (errors, or warnings before a render), then the progress and `Wrote` lines on success.
- stderr: diagnostics as text, and `video: render failed: <message>` on failure.

Environment:
- `QV_BROWSER_EXECUTABLE`: an existing Chromium headless shell (`renderer/remotion/README.md`). Unset, Remotion downloads its own browser.

## Exit codes
- `0` success (warnings allowed) · `1` validation or render failure ·
  `2` usage or environment error (bad path, missing argument, quarto not found).

## Build directory and cleanup policy (PRD §11.3)
| File in `<root>/.video-build/` | During run | After success | After failure |
| --- | --- | --- | --- |
| `manifest.json` (IR) | written by filter | kept | kept (diagnosis) |
| `render.json` (output path) | written by filter | kept | kept (diagnosis) |
| `diagnostics.json` (filter errors and warnings) | written by filter | kept (`[]`) | kept (diagnosis) |
| `render.partial.mp4` | written by renderer | renamed to output, gone | deleted |

- Each run removes the previous manifest, render settings and diagnostics before it starts, so a rejected document never leaves a stale IR. The temp file is also removed before each render.
- Nothing else is written. Only `<root>/<video.output>` (default `output.mp4`) is a deliverable.
- `.video-build/` is gitignored and safe to delete at any time.

## Test-only seam (not a user feature)
- `QV_TEST_RENDERER=<absolute path to a module>` replaces the renderer. The module
  must export `render(irPath, outPath, options)`. Only
  `tests/integration/cli-render.test.ts` sets it, with
  `tests/integration/support/failing-renderer.mjs`, which records calls in
  `QV_TEST_RENDER_LOG` and fails with a known message. The variable is not
  listed in `--help` and is not documented for authors.

## Dependencies (`packages/cli/package.json`)
- `@quarto-video/ir` (IR types), `@quarto-video/validator` (`checkManifest` for stage 2, the `Diagnostic` type, formatters, `parseDiagnostics`) and `@quarto-video/remotion`
  (its `src/index.ts` public API: `render`, `loadIr`, `IrRenderError`, types).
- The CLI imports only those indexes. The renderer never imports `cli` or `validator`.

## Rules
- The CLI never parses Markdown or interprets component rules itself. The filter reads front matter and writes `manifest.json`, `render.json` and `diagnostics.json`.
- Never start the renderer when any stage reported an error.
- Show progress during render (percent of encoded frames).

## Testing
- `tests/integration/components.test.ts` (table, `--json`, usage errors) and `test/components.test.ts` (table layout).
- `tests/integration/validate.test.ts` (validate, through the bin), `tests/integration/contract.test.ts` (task 014: contract fixtures, no render on stage 2 failure),
  `tests/integration/validate-diagnostics.test.ts` (one fixture per error family, `--json`),
  and `tests/integration/cli-render.test.ts` (render, through the bin, node:test under
  tsx). The render tests check the size, fps and frame count with ffprobe, exit
  codes, the renderer seam, the temp file and the previous output, directory and
  `.qmd` input, and cwd independence. Fixtures are copied to a scratch dir.

## Related
Tasks 005–008, 013, 018, 048. PRD §4.2, §5.5, §9, §11.2, §11.3.
