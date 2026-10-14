# packages/cli/ — the `video` command
Status: `video validate` (task 005) and `video render` (task 006) are real. `components` and `doctor` arrive with tasks 013 and 018.
Run from the repo root (after `npm ci`): `npx video render videos/hello`. From any other directory: `npm exec --prefix <repo> -- video render <path>`. Tests: `npm run test:integration` (spawns the bin); unit tests run from the root with `npm run test`.

## Purpose
The supported end-to-end entry point (PRD §4.2): resolve a project, run the
filter, validate, render, and report.

## Commands
| Command | Task | Behaviour |
| ------- | ---- | --------- |
| `video validate <path> [--print-ir]` | 005 | Stages 1–2 (filter, IR schema). Done |
| `video render <path>` | 006 | Stages 1–2, then render to `video.output`. Done |
| `video components [--json]` | 013 | List registered components |
| `video doctor` | 018 | Environment and version report |

`--output <path>` and `--json` (task 008 events) are not implemented yet.
Use `video.output` in front matter to choose the destination.

## Entry point
- `bin/video.mjs` is the `video` bin. It registers tsx (root devDependency,
  ADR-0001) and runs `src/cli.ts`, so it works from any working directory.
- `npx video` only resolves inside the repo: outside it, `npx` would fetch an
  unrelated npm package named `video`. Use `npm exec --prefix` instead.

## Project resolution (`src/project.ts`)
- `<path>` is a project dir or a `.qmd` file. `<dir>` → `<dir>/index.qmd`; `<file.qmd>` → its parent is the project root.
- Relative paths resolve from the caller's cwd. Build files go under `<root>/.video-build/`.
- A missing path, a directory without `index.qmd`, or a file that is not `.qmd` → exit 2, message names the path.

## `validate` output (`src/commands/validate.ts`)
- Success: `OK <name> (<n> scenes, <frames> frames)` on stdout.
- `--print-ir`: the validated IR JSON alone on stdout; the OK line moves to stderr.
- Errors: one `<json-path>: <message>` line per IR error, or one filter message, on stderr.

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
- stderr: validation lines, and `video: render failed: <message>` on failure.

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
| `render.partial.mp4` | written by renderer | renamed to output, gone | deleted |

- Each run removes the previous manifest and render settings before it starts, so a rejected document never leaves a stale IR. The temp file is also removed before each render.
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
- `@quarto-video/ir` (IR types, `validateIr`) and `@quarto-video/remotion`
  (its `src/index.ts` public API: `render`, `loadIr`, `IrRenderError`, types).
- The CLI imports only that index. The renderer never imports `cli` or `validator`.

## Rules
- The CLI never parses Markdown or interprets component rules itself. The filter reads front matter and writes `manifest.json` and `render.json`.
- Never start the renderer when any stage reported an error.
- Show progress during render (percent of encoded frames).

## Testing
- `tests/integration/validate.test.ts` (validate, through the bin) and
  `tests/integration/cli-render.test.ts` (render, through the bin, node:test under
  tsx). The render tests check the size, fps and frame count with ffprobe, exit
  codes, the renderer seam, the temp file and the previous output, directory and
  `.qmd` input, and cwd independence. Fixtures are copied to a scratch dir.

## Related
Tasks 005–008, 013, 018, 048. PRD §4.2, §9, §11.2, §11.3.
