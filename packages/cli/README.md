# packages/cli/ — the `video` command
Status: Not implemented — built by tasks 005, 006, 013, 018.

## Purpose
The supported end-to-end entry point (PRD §4.2): resolve a project, run the
filter, validate, preflight, render, and report.

## Commands (target)
| Command | Task | Behaviour |
| ------- | ---- | --------- |
| `video validate <path> [--json] [--print-ir]` | 005 | Stages 1–4 |
| `video render <path> [--output <path>] [--json]` | 006 | Stages 1–6 |
| `video components [--json]` | 013 | List registered components |
| `video doctor` | 018 | Environment and version report |

## Project resolution
- `<path>` is a project dir or a `.qmd` file. `<dir>` → `<dir>/index.qmd`; `<file.qmd>` → its parent is the project root.
- All paths resolve from the project root, never from the caller's cwd.
- Generated files go to `<root>/.video-build/`; output to `video.output`.

## Exit codes
- `0` success (warnings allowed) · `1` validation or render failure ·
  `2` usage or environment error (bad path, missing dependency).

## Rules
- The CLI never parses Markdown or interprets component rules itself.
- Never start the renderer when any stage reported an error.
- Write output to a temp file and move it into place only on success; never
  leave a partial `output.mp4`.
- `--json` prints only machine-readable JSON on stdout; human text → stderr.
- Show progress during render (percent of frames).

## Testing
CLI tests spawn the real binary against fixtures and assert stdout/stderr,
exit code, and files written.

## Related
Tasks 005–007, 013, 018, 048. PRD §4.2, §9, §11.2.
