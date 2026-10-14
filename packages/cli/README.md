# packages/cli/ — the `video` command
Status: `video validate` (task 005) is real. `render`, `components` and `doctor` arrive with tasks 006, 013 and 018.
Run: `npx video validate <path>` from the repo root (after `npm ci`). From any other directory: `npm exec --prefix <repo> -- video validate <path>`. Tests: `npm run test:integration` (CLI spawns), root `npm run test`.

## Purpose
The supported end-to-end entry point (PRD §4.2): resolve a project, run the
filter, validate, preflight, render, and report.

## Commands (target)
| Command | Task | Behaviour |
| ------- | ---- | --------- |
| `video validate <path> [--print-ir]` | 005 | Stages 1–2 (filter, IR schema). Done |
| `video render <path> [--output <path>] [--json]` | 006 | Stages 1–6 |
| `video components [--json]` | 013 | List registered components |
| `video doctor` | 018 | Environment and version report |

## Entry point
- `bin/video.mjs` is the `video` bin. It registers tsx (root devDependency,
  ADR-0001) and runs `src/cli.ts`, so it works from any working directory.
- `npx video` only resolves inside the repo: outside it, `npx` would fetch an
  unrelated npm package named `video`. Use `npm exec --prefix` instead.

## Project resolution (`src/project.ts`)
- `<path>` is a project dir or a `.qmd` file. `<dir>` → `<dir>/index.qmd`; `<file.qmd>` → its parent is the project root.
- Relative paths resolve from the caller's cwd; everything the CLI writes goes under `<root>/.video-build/`.
- A missing path, a directory without `index.qmd`, or a file that is not `.qmd` → exit 2, message names the path.
- The project name is the root directory's basename (used in the OK line).

## `validate` output (`src/commands/validate.ts`)
- Success: `OK <name> (<n> scenes, <frames> frames)` on stdout.
- `--print-ir`: the validated IR JSON alone on stdout; the OK line moves to stderr. An invalid IR prints nothing on stdout.
- Errors: one `<json-path>: <message>` line per IR error (stderr); a filter rejection prints `<document>: <message>` (stderr).

## Exit codes
- `0` success (warnings allowed) · `1` validation or render failure ·
  `2` usage or environment error (bad path, missing dependency, quarto not found).

## Rules
- The CLI never parses Markdown or interprets component rules itself. It runs the filter with the invocation in `_extensions/video/README.md`.
- Never start the renderer when any stage reported an error.
- Write output to a temp file and move it into place only on success; never
  leave a partial `output.mp4`.
- `--json` prints only machine-readable JSON on stdout; human text → stderr.
- Show progress during render (percent of frames).
- Dependencies: `cli` may import `ir` and `validator`; never `renderer`.

## Testing
`tests/integration/validate.test.ts` spawns `node_modules/.bin/video` against
copies of fixtures and asserts stdout, stderr, exit code and IR identity
(directory vs `index.qmd`, other working directories). Resolution, exit codes
and stream routing are covered there end to end.

## Related
Tasks 005–007, 008, 013, 018, 048. PRD §4.2, §9, §11.2.
