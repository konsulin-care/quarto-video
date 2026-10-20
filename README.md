# quarto-video

A Quarto extension and `video` CLI for authoring polished, repeatable videos in
Quarto Markdown with a declarative scene DSL, rendered through Remotion via a
renderer-independent Video IR.

You write scenes in an `index.qmd` file, run `quarto render`, and get an MP4.

**Status:** pre-alpha. Verified on Linux x86_64 with Quarto 1.10.19 only.
Development follows the numbered tasks in [`docs/tasks/`](docs/tasks/README.md).

## Quick start

quarto-video works like any Quarto filter extension:

```sh
quarto add konsulin-care/quarto-video     # 1. install the extension
```

```yaml
filters:                                  # 2. turn it on (_quarto.yml or front matter)
  - video
```

```sh
quarto render                             # 3. writes output.mp4
```

The renderer (Node, the `video` CLI and a headless Chromium) is installed once
per machine. The steps below cover that, and a first video.

## How it works

- **`_extensions/video/`** is the Quarto extension. Its filter runs at the end
  of `quarto render` and starts `video render` on the project of the file being
  rendered (ADR-0022).
- **The `video` CLI** reads the scenes in `index.qmd`, validates them and
  renders the MP4 with Remotion and a headless Chromium.

A Quarto extension can only ship Lua and static files. The renderer is a Node
program that drives a browser, so it is installed once, outside the extension.
This is like PDF output, which needs `quarto install tinytex` once.

## Step by step: your first video

### 1. Install the renderer (once per machine)

You need [mise](https://mise.jdx.dev) 2026.10.0 or later. It installs the
pinned Node.js, Quarto and ffmpeg.

```sh
git clone <repository-url> ~/quarto-video
cd ~/quarto-video
mise install          # Node 24.21.0, Quarto 1.10.19, ffmpeg, linters
npm ci                # the video CLI and the renderer
npx --yes playwright@1.56.1 install --with-deps chromium-headless-shell
```

The last line installs the Chromium headless shell the renderer draws with.
The CLI never downloads a browser itself. The binary is under
`~/.cache/ms-playwright`: `chromium_headless_shell-1194/chrome-linux/headless_shell`.
See [installation.md](docs/guides/installation.md) for details.

### 2. Put the renderer on your PATH

Add these lines to your shell profile (`~/.bashrc`, `~/.zshrc`):

```sh
export QUARTO_VIDEO="$HOME/quarto-video"
export PATH="$QUARTO_VIDEO/node_modules/.bin:$(cd "$QUARTO_VIDEO" && mise bin-paths | tr '\n' ':')$PATH"
export QV_BROWSER_EXECUTABLE="$HOME/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell"
```

This puts `video`, the pinned `quarto`, `node` and `ffmpeg` on `PATH`, and
tells the renderer where the browser is. Open a new shell and check:

```sh
video doctor          # one ✓ line per tool; exits 0 when all are usable
```

The extension finds the renderer as `video` on `PATH`. To use another path,
set `QUARTO_VIDEO_CLI` to the `video` binary instead.

### 3. Create the project and add the extension

A project is one directory, and one video:

```sh
mkdir -p ~/work/my-video
cd ~/work/my-video
quarto add konsulin-care/quarto-video
```

`quarto add` copies the extension into `_extensions/video/`. You can also
install from your clone with `quarto add ~/quarto-video`, which is the form
tested here. Keep the extension and the renderer from the same version.

### 4. Configure `_quarto.yml`

```yaml
project:
  type: default
  render:
    - index.qmd
filters:
  - video
```

`filters: [video]` turns the extension on. `render: [index.qmd]` keeps other
files, such as a `README.md`, from being rendered. To render only the file
(`quarto render index.qmd`), you can instead put `filters: [video]` in the
front matter of `index.qmd` and skip `_quarto.yml`.

### 5. Write `index.qmd`, a hello world

```markdown
---
title: "Hello World"
video:
  width: 1280
  height: 720
  fps: 30
---

::: {.scene component="title" duration="2s" animation="fade-in"}
# Hello, World!

::: {.subtitle}
My first quarto-video
:::
:::

::: {.scene component="statement" duration="3s" animation="reveal" exit="fade-out"}
One document, one **MP4**.
:::
```

- **Front matter `video:`** sets the canvas: `width` and `height` (even
  numbers, default 1920 x 1080), `fps` (default 30) and `output` (default
  `output.mp4`). Other settings include `video.background`, `video.captions`,
  and the top-level `theme:` and `audio.music:`. They're all listed in
  [authoring.md](docs/guides/authoring.md).
- **Each `::: {.scene ...}` block** is one scene on the timeline, in document
  order. `component` picks the layout (`title`, `statement`, `bullets`,
  `chart`, `statistic`, `image`, `comparison`, `end-card`, ...). `duration` is
  `"2s"` or `"500ms"`.
- **`animation`, `exit` and `transition`** pick named presets. Examples are
  `fade-in`, `reveal`, `stagger`, `fade-out`, `fade` and `slide`.
- **Content** is plain Markdown inside the scene. Named slots are inner blocks,
  such as `::: {.subtitle}`. Each component's slots are documented in
  [`docs/components/`](docs/components/README.md).

Your project now looks like this:

```
my-video/
├── _extensions/video/   # step 3, from quarto add
├── _quarto.yml          # step 4
└── index.qmd            # step 5
```

Add an `assets/` folder for images, footage, music and captions, and `data/`
for chart CSVs. Paths in `index.qmd` are relative to the project directory.

### 6. Render

```sh
quarto render                       # inside my-video/
quarto render my-video              # or from its parent: the project directory
quarto render my-video/index.qmd    # or the file
```

Quarto renders the document, then the extension renders the video, showing
progress and then `Wrote output.mp4`. If a scene has an error, the
diagnostics are printed with their line numbers, and `quarto render` exits
non-zero. `video validate my-video` checks a project quickly, without
rendering or a browser.

## Where the output goes

Everything is written in the folder of the rendered `.qmd`: here the project
directory. Nothing is written outside it.

| Path (next to `index.qmd`) | What it is |
| --- | --- |
| `output.mp4` | **The video.** Set `video.output` in front matter to change it, for example `output: dist/intro.mp4` writes `dist/intro.mp4`. The path must stay inside the project and end in `.mp4`. |
| `output.vtt` | Only with `video.captions` in `sidecar` or `both` mode: the captions, next to the video. |
| `.video-build/` | Build files: the manifest, diagnostics and `build-info.json` (hashes and tool versions). Safe to delete. |
| `index.html`, `index_files/`, `.quarto/` | Quarto's own HTML page and cache. Not needed for the video. |

The video is first rendered to `.video-build/render.partial.mp4` and checked
(size, fps, frame count). Only then does it replace the output file. A failed
render leaves your previous `output.mp4` untouched.

To keep generated files out of commits, add `output.mp4`, `output.vtt`,
`.video-build/`, `.quarto/`, `index.html` and `index_files/` to `.gitignore`.

## Several videos in one project

Each `.qmd` file the filter sees becomes its own video. One project can hold
many, in subfolders or side by side:

```
my-video/
├── _extensions/video/     # quarto add, once for the whole project
├── _quarto.yml
├── topic-a/index.qmd      # → topic-a/output.mp4
├── topic-b/index.qmd      # → topic-b/output.mp4
├── topic-c.qmd            # → topic-c.mp4 (set in its front matter)
└── topic-d.qmd            # → videos/topic-d.mp4 (set in its front matter)
```

List every video file as a render target in `_quarto.yml`:

```yaml
project:
  type: default
  render:
    - "*/index.qmd"
    - "*.qmd"
filters:
  - video
```

Quarto applies the project's `filters` only to its render targets. A file
outside the list renders as a plain HTML page, with no video. Other files,
such as `README.md`, stay out.

**Where each video goes.** A video's root is the folder its `.qmd` is in. Its
`video.output`, asset paths and `.video-build/` are relative to that folder.

- `topic-a/index.qmd` writes `topic-a/output.mp4`. Each subfolder has its own
  default output, so nothing collides.
- Files side by side in one folder share it. Give each one its own
  `video.output`, or they all write `output.mp4`, and the last one wins:

```yaml
---
title: "Topic C"
video:
  output: topic-c.mp4        # relative to my-video/; videos/topic-c.mp4 also works
---
```

**Render all, or one:**

```sh
cd my-video
quarto render                    # every video
quarto render topic-a            # only topic-a/index.qmd
quarto render topic-c.qmd        # only topic-c.qmd
```

A subfolder per video (`topic-a/index.qmd`, with its own `assets/`) keeps
outputs and assets apart, and is the layout to prefer. This repository works
the same way: its root `_quarto.yml` renders `videos/*/index.qmd`.

Don't add a `_quarto.yml` inside a topic folder: Quarto would make it a
separate project, without the filter.

## When something goes wrong

- **`quarto render` exits 0 but writes no MP4:** `filters: [video]` is
  missing, or `quarto render <dir>` found no `_quarto.yml` in that directory.
- **`quarto-video: the video renderer is not installed or not on PATH`:** do
  step 2, or set `QUARTO_VIDEO_CLI`.
- **`video: browser is not available`:** set `QV_BROWSER_EXECUTABLE` (step 2).
- **`node is not available ... is not Node 24`:** the mise tools are not first
  on `PATH` (step 2).

More in [troubleshooting.md](docs/guides/troubleshooting.md) and
[diagnostics.md](docs/guides/diagnostics.md) (every error code with its fix).

## Documentation

- [Installation](docs/guides/installation.md): the tools, the browser and a first run.
- [Authoring](docs/guides/authoring.md): the scene language, components, transitions and animations.
- [CLI](docs/guides/cli.md), [diagnostics](docs/guides/diagnostics.md) and [troubleshooting](docs/guides/troubleshooting.md).
- Examples: `videos/hello-world` (short), `videos/gpu` (charts and
  statistics), `videos/demo` (footage, music and captions).
- Product requirements: [`docs/prd.md`](docs/prd.md) · Architecture:
  [`docs/architecture.md`](docs/architecture.md) · Coding agents start at
  [`AGENT.md`](AGENT.md) · Testing policy: [`docs/testing.md`](docs/testing.md)

## Development setup

Tools are pinned in `mise.toml` and installed with [mise](https://mise.jdx.dev):

```
mise install        # Node, Quarto, ffmpeg, lefthook, linters
mise run setup      # install git hooks (pre-commit, pre-push)
mise run check      # static checks on all code
mise run test       # all test suites
```

Then `npm ci` installs the workspace (Node 24.21.0; ADR-0001). `npm run check` and `npm run test` run the TypeScript gates directly.

Renovate keeps the pins current; see ADR-0010.
