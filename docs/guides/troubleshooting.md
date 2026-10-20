# Troubleshooting

Status: task 050. Start with `npx video doctor`: it checks every tool the CLI
uses and prints the fix for each one it cannot find.

## Exit codes first

| Exit | Means | Look at |
| --- | --- | --- |
| 1 | your project is wrong (a diagnostic) or the render or output check failed | the `ERROR` lines on stderr; [diagnostics.md](diagnostics.md) |
| 2 | the environment or the command line is wrong | the `video: ...` line, or the usage text |

## The command does not start

**`video: cannot run quarto (spawnSync quarto ENOENT); install the version pinned in mise.toml`**
(exit 2). Quarto is not on `PATH`. Run `mise install` in the repository, and run
the command with `mise exec -- npx video …` from the repository, or put the mise
tools on `PATH` as [installation.md](installation.md) shows.

**`npx video` runs in the wrong place, or is not found.** Outside the repository
`npx` looks in the current folder. Use `npm exec --prefix <repo> -- video …`, with
the mise tools on `PATH`.

**`video --version` or `video validate --help` prints the usage and exits 2.**
These are not options. `video --help` prints the usage; see [cli.md](cli.md).

## Doctor and rendering

**`✗ browser … QV_BROWSER_EXECUTABLE is not set`**, and `video render` exits 2.
Rendering needs a Chromium headless shell. Install one and set
`QV_BROWSER_EXECUTABLE` to its binary (see
[installation.md](installation.md#4-point-at-a-chromium-headless-shell)). The CLI never downloads a browser.

**A preflight line `video: <problem>` before rendering** (exit 2). Preflight checks
that the output folder and `.video-build/` are writable and that the output's disk
has at least 256 MiB free. Fix the folder or free space, then run again.

**`⚠ <version> is outside the compatibility matrix`** from `doctor`. This is a
warning: the tool works, but the version is not the one tested. Install the
pinned version with `mise install`, or accept the risk. The matrix is in
[compatibility.md](compatibility.md).

**`E_OUTPUT_MISMATCH` after rendering.** The rendered file's size, fps or frame
count differs from the IR, so the file is not written to `video.output`. Render
again. If it repeats, keep `.video-build/build-info.json` and report it.

**A failed render keeps the old file.** This is by design. `video.output` is
replaced only when the render passes its output check, so you never get half a
video. Look at the diagnostics to see why it failed.

## Project errors

**`E_ASSET_MISSING` for a file you can see.** Paths are relative to the project
root and match case exactly. `assets/Logo.png` is not `assets/logo.png`.
Paths with `..`, a leading `/` or a URL are also rejected.

**`E_DURATION_SYNTAX` for `duration="4"`.** A duration needs a unit: `4s` or
`250ms`. A duration that is shorter than one frame at the project's fps is
`E_DURATION_RANGE`.

**`E_CONTENT_UNSUPPORTED` for a link.** Links, tables, raw HTML and Markdown
images are not scene content yet. Remove them, or use an image block for a picture.

**`E_CONFIG_UNKNOWN_KEY` for `video.widht`.** Misspelt keys are errors, not
ignored. The message's "Did you mean" names the right key.

**Two scenes that should be one second apart are short.** A transition overlaps
the previous scene, so the timeline is shorter by its length. Two 1-second scenes
joined by a 500 ms fade last 1.5 seconds, not 2 (see [authoring.md](authoring.md#transitions)).

**An entrance or exit is not visible.** A scene shorter than 15 frames (0.5 s
at 30 fps) shows its end state at once, and so does one with
`video.reducedMotion: true`. This is by design (ADR-0020).

**An exit overlaps the entrance and fails.** Both windows must fit: twice the
`animationDuration` must be no longer than the scene (`E_ANIMATION_DURATION`).

**Music fails with `E_MUSIC_SHORT`.** The track is shorter than the video.
Set `loop: true`, or use a longer `.wav` file.

**Footage stops early or fails with `E_MEDIA_SHORT_SOURCE`.** Footage is never
stretched or looped unless you ask. Add `loop="true"` or `freeze="true"`, use
a longer source range, or shorten the scene.

**A warning about text (`W_TEXT_FIT`).** Warnings do not fail the render. The
text is drawn at its smallest size and still does not fit: shorten it.

## Quarto render

**`quarto render` exits 0 and writes no `output.mp4`.** The filter is not
on. Check `filters: [video]` in the front matter or `_quarto.yml`, and that
`_extensions/video/` is in the project (`quarto add`). `quarto render <dir>`
and a bare `quarto render` also need a `_quarto.yml` in that directory;
`quarto render <dir>/index.qmd` does not.

**``quarto-video: the `video` renderer is not installed or not on PATH``.** Put
`video` on `PATH` (the repository's `node_modules/.bin`), or set
`QUARTO_VIDEO_CLI` to it (README.md, step 2).

**``quarto-video: `video render` failed``.** The messages above it are the
renderer's: the same diagnostics and rules as `video render`, for example
`QV_BROWSER_EXECUTABLE` must be set.

## Results that differ between machines

Rendered pixels can differ between operating systems and browser builds, and
MP4 bytes differ between encoders. Two renders on one machine give identical
stills. macOS and Windows are not verified. See the cross-platform notes in
[compatibility.md](compatibility.md).

## Still stuck

Collect the command you ran, its full output, `npx video doctor --json`, and the
project's `index.qmd`. Check `.video-build/diagnostics.json` for the last run's
diagnostics.
