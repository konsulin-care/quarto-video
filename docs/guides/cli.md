# CLI reference: `video`

Status: task 050. Matches the output of `video --help` (`packages/cli/src/cli.ts`).
Run it from the repository root as `npx video …`, or with `mise exec -- npx video …`
when the pinned tools are not on `PATH`. From elsewhere, see
[installation.md](installation.md).

```text
usage: video validate <path> [--print-ir | --json]
       video render <path> [--json] [--theme <name>]
       video components [--json]
       video doctor [--json]
```

`<path>` is a project folder (it must contain `index.qmd`) or a `.qmd` file. A
relative path resolves from the current directory. Build files go to
`<project>/.video-build/`.

## Commands

### `video validate <path>`

Runs the filter, the IR schema, the component contracts, the assets and the
timeline. It does not render and needs no browser.

| Form | Output |
| --- | --- |
| `video validate <path>` | stdout: `OK <name> (<n> scenes, <frames> frames)` on success |
| `video validate <path> --print-ir` | stdout: the validated IR JSON only; the `OK` line goes to stderr |
| `video validate <path> --json` | stdout: a JSON array of diagnostics; a valid project prints `[]` |

Diagnostics are text on stderr: a header `ERROR <file>[:<line>]`, the message,
then the suggestion. Each code is explained in [diagnostics.md](diagnostics.md).
Exit 0 when there are no errors (warnings allowed), 1 on errors, 2 on usage errors.
`--print-ir` and `--json` cannot be combined (exit 2).

### `video render <path>`

Validates the project (stages 1 to 4), checks the tools, the browser and the
output location (stage 5, preflight), renders each frame, then checks the
result against the IR (stage 6).

| Flag | Meaning |
| --- | --- |
| `--json` | print the diagnostics as a JSON array before the progress lines (for warnings or errors) |
| `--theme <name>` or `--theme=<name>` | render with this theme. Without it, the front matter `theme:` is used, else `modern` |

Progress is printed as `NN%` lines on stdout. On success it prints
`Wrote <path>` (the output, and `output.vtt` for a sidecar caption track).
Errors go to stderr as `video: render failed: <message>` or as diagnostics.

Needs `QV_BROWSER_EXECUTABLE` set to a Chromium headless shell. Unset, the
command exits 2 before rendering. Output goes to `video.output` (default
`output.mp4`). It is written to a temporary file first, and renamed into
place only when stage 6 passes, so a failed render leaves any earlier output
untouched.

Each success writes `.video-build/build-info.json`: the hashes of the IR and
of each asset, the tool versions, the OS and the flags. It is removed at the
start of the next run. See [compatibility.md](compatibility.md).

### `video components`

Lists the registered components: id, version, duration bounds, slots and props.

| Form | Output |
| --- | --- |
| `video components` | a table: `ID VERSION DURATION SLOTS PROPS` |
| `video components --json` | a JSON array of the full component contracts |

It needs no project. The same list is in [authoring.md](authoring.md).

### `video doctor`

Checks each tool the CLI uses, one line per tool: `✓ <tool> <version>`, or
`✗ <tool> <reason>; <how to install>`. A version outside the compatibility
matrix adds `⚠` to the ✓ line. A warning does not change the exit status.

| Form | Output |
| --- | --- |
| `video doctor` | one line per tool: node, quarto, pandoc, remotion, browser, ffprobe |
| `video doctor --json` | an array of `{tool, ok, version, hint}` in the same order |

Exit 0 when every tool is ok, 2 otherwise.

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | success (warnings allowed) |
| 1 | the project failed validation, rendering or the output check |
| 2 | usage or environment error: a bad path, a bad flag, a missing tool, a missing browser, a preflight or `doctor` problem |

## Help and usage errors

- `video --help` and `video -h` print the usage on stdout and exit 0.
- There is no separate help for each command. `video validate --help` is an
  unknown flag: the usage goes to stderr and the exit is 2.
- `video --version` is not a command (exit 2).
- A missing or unknown command, an unknown flag, or a path count other than one
  prints the usage on stderr and exits 2.

## Environment

| Variable | Used by | Meaning |
| --- | --- | --- |
| `QV_BROWSER_EXECUTABLE` | `render`, `doctor` | the Chromium headless shell binary. The CLI never downloads a browser |

## Files written

| File in `<project>/.video-build/` | After a run |
| --- | --- |
| `manifest.json`, `render.json`, `diagnostics.json` | kept: the IR, the settings and the diagnostics of the last run |
| `build-info.json` | written after a successful render; absent after a failure |

The rendered file is `<project>/<video.output>`. `.video-build/` is safe to
delete.

## Not implemented

- `--output <path>`: set `video.output` in the front matter instead.
- Any command beyond the four above.
