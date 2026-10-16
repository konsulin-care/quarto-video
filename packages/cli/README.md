# packages/cli/ — the `video` command
Status: `validate` (005, 008, 014, 015), `render` (006, 008), `components` (013) and `doctor` (018) are real. `render` runs stages 1–6 (preflight and output check, task 018).
Run from the repo root (after `npm ci`): `npx video render videos/hello`. From any other directory: `npm exec --prefix <repo> -- video render <path>`. Tests: `npm run test:integration` (spawns the bin); unit tests run from the root with `npm run test`.

## Purpose
The supported end-to-end entry point (PRD §4.2): resolve a project, run the
filter, validate, render, and report.

## Commands
| Command | Task | Behaviour |
| ------- | ---- | --------- |
| `video validate <path> [--print-ir]` or `[--json]` | 005, 008, 014, 015 | Stages 1–2 and 4: filter, IR schema, component contracts, timeline. Done |
| `video render <path> [--json] [--theme <name>]` | 006, 008, 018, 019a | Stages 1–6: validation, preflight, render, output check, then `video.output`. Done |
| `video components [--json]` | 013 | List registry component contracts. Done |
| `video doctor [--json]` | 018 | Tools and versions (stage 5 probes). Done |

`--print-ir` and `--json` cannot be combined (exit 2). `--output <path>` is not implemented yet.
Use `video.output` in front matter to choose the destination.

## Entry point
- `bin/video.mjs` registers tsx (ADR-0001) and runs `src/cli.ts` from any cwd.
  `npx video` resolves only inside the repo; elsewhere use `npm exec --prefix <repo> -- video`.

## `components` output (`src/commands/components.ts`)
- Table `ID VERSION DURATION SLOTS PROPS`; `--json`: a JSON array of the full contracts. Needs no project.

## Project resolution (`src/project.ts`)
- `<path>` is a project dir or a `.qmd` file. `<dir>` → `<dir>/index.qmd`; `<file.qmd>` → its parent is the project root.
- Relative paths resolve from the caller's cwd. Build files go under `<root>/.video-build/`.
- A missing path, a directory without `index.qmd`, or a file that is not `.qmd` → exit 2, message names the path.

## `validate` output (`src/commands/validate.ts`)
- Success: `OK <name> (<n> scenes, <frames> frames)` on stdout.
- `--print-ir`: the validated IR JSON alone on stdout; the OK line moves to stderr.
- Errors and warnings: diagnostics as text on stderr (`src/report.ts`).
- `--json`: the diagnostics as a JSON array on stdout, with nothing else (a valid project prints `[]`).

## `render` (`src/commands/render.ts`)
1. Resolve the project and run stages 1–4 as `validate` (`src/check.ts`). Stage 2 also resolves the `theme` name from `render.json` (`E_THEME_UNKNOWN`, task 019). A rejected project exits 1; the renderer is never called.
2. Preflight, stage 5 (`src/preflight.ts`), run at the CLI boundary: `cli.ts` passes it to `runRender` as `RenderOptions.preflight`, and `runRender` calls it after stages 1–4 pass. Every tool from `detectTools` (`src/tools.ts`) must be ok (node, quarto, pandoc, remotion, browser, ffprobe); the output directory and `.video-build` must be writable; the output's filesystem needs at least 256 MiB free. Any problem: `video: <problem>` on stderr, exit 2, renderer not called.
3. Render to `<root>/.video-build/render.partial.mp4` with `render()` from `@quarto-video/remotion`, passing the resolved theme id and the explicit `background` from `render.json` (null when `video.background` is unset; the theme then draws the canvas).

Theme resolution (task 019a): the `--theme <name>` option wins; else the front matter `theme:` (kept in `render.json`); else `modern`. `--theme` takes a name as `--theme <name>` or `--theme=<name>`; a missing name is a usage error (exit 2). An unknown name, from either source, is `E_THEME_UNKNOWN` (exit 1), and the renderer is not called.
4. Stage 6 (`src/output-probe.ts`, `checkOutput`): ffprobe reads the temp file; its width, height, fps and frame count must equal the IR. A mismatch, a missing file or an unreadable one: the temp file is deleted, diagnostics are reported, exit 1, and `video.output` is untouched.
5. On success, create the output's directory and rename the temp file to the output path.

Streams: stdout gets `NN%` progress lines, then `Wrote <path>`. With `--json`, a diagnostics array comes first (warnings, or errors); a stage 6 array can follow the progress lines. stderr: diagnostics as text, preflight problems, and `video: render failed: <message>`.

## `doctor` (`src/commands/doctor.ts`)
- One line per tool: `✓ <tool> <version>` or `✗ <tool> <reason>; <how to install>`. `--json`: `[{tool, ok, version, hint}]`, in the same order.
- Exit 0 when every tool is ok; 2 otherwise (an environment problem).

Environment:
- `QV_BROWSER_EXECUTABLE`: required by `video render` and `quarto render`. An existing Chromium headless shell (`renderer/remotion/README.md`). Unset is an environment error (exit 2): the CLI never lets Remotion download a browser. `runRender` called without a `preflight` (stub renderers in tests) needs no browser.

## Exit codes
- `0` success (warnings allowed) · `1` validation, render or output failure ·
  `2` usage or environment error (bad path, missing argument, a missing tool, preflight or doctor problem).

## Build directory and cleanup policy (PRD §11.3)
| File in `<root>/.video-build/` | During run | After success | After failure |
| --- | --- | --- | --- |
| `manifest.json` (IR), `render.json`, `diagnostics.json` | written by filter | kept | kept (diagnosis) |
| `render.partial.mp4` | written by renderer | renamed to output, gone | deleted |

- Each run removes the previous manifest, render settings and diagnostics before it starts. The temp file is also removed before each render.
- Only `<root>/<video.output>` (default `output.mp4`) is a deliverable. `.video-build/` is gitignored and safe to delete.

## Test-only seams (not user features)
- `QV_TEST_RENDERER=<module>` replaces the renderer; the module exports `render(irPath, outPath, options)`. Used by `cli-render.test.ts` (`support/failing-renderer.mjs`), `preflight-output.test.ts` (`support/short-renderer.mjs`, writes `QV_TEST_RENDER_FRAMES` frames) and `theme-render-option.test.ts` (`support/recording-renderer.mjs`, logs the theme and background it gets).
- `QV_TEST_MISSING=<tool,...>` marks tools as absent in `detectTools`, with their install hints. Used by `preflight-output.test.ts` and `doctor.test.ts`.
- Neither variable is in `--help` or documented for authors.

## Dependencies (`packages/cli/package.json`)
- `@quarto-video/ir`, `@quarto-video/validator` (`checkManifest`, `checkOutput`, formatters) and `@quarto-video/remotion` (`render`, `loadIr`, types). The CLI imports only those indexes.

## Rules
- The CLI never parses Markdown or interprets component rules itself.
- Never start the renderer when any stage reported an error, or preflight failed.

## Testing
- Unit: `test/preflight.test.ts` (each preflight rule), `test/tools.test.ts`, `test/output-probe.test.ts`, `test/components.test.ts`.
- Integration: `tests/integration/cli-browser-gate.test.ts` (variable unset: exit 2, renderer not called), `tests/integration/validate*.test.ts`, `contract.test.ts`, `cli-render.test.ts` (render, output size, fps, frames), `preflight-output.test.ts` (stages 5 and 6), `doctor.test.ts`, `components.test.ts`, `theme.test.ts` (unknown theme: exit 1, no video), `theme-render-option.test.ts` (`--theme` precedence, default `modern`, unknown option, explicit background).

## Related
Tasks 005–008, 013, 018, 048. PRD §4.2, §5.5, §9, §11.2, §11.3.
