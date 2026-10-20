# quarto-video

A Quarto extension and `video` CLI for authoring polished, repeatable videos in
Quarto Markdown with a declarative scene DSL, rendered through Remotion via a
renderer-independent Video IR.

You write scenes in an `index.qmd` file, run `quarto render`, and get an MP4.

**Status:** pre-alpha. Verified on Linux x86_64 with Quarto 1.10.19 only.
Development follows the numbered tasks in [`docs/tasks/`](docs/tasks/README.md).

## How it works

quarto-video has three parts. You install them once, from this repository:

- **The Lua filter** (`_extensions/video/`) reads the scenes in your
  `index.qmd` and turns them into a JSON manifest.
- **The `video` CLI** validates that manifest and renders it to MP4 with
  Remotion and a headless Chromium.
- **A post-render hook** (`_render-video.sh`) connects them to Quarto. After
  `quarto render`, Quarto runs the hook, and the hook runs `video render` on
  your project.

A Quarto filter cannot write a video file on its own (ADR-0002). So you don't
copy `_extensions/` into your project or use `quarto add`. Each video project
carries two small files instead: a `_quarto.yml` and a copy of the hook.

## Step by step: your first video

### 1. Install quarto-video (once)

You need [mise](https://mise.jdx.dev) 2026.10.0 or later. It installs the pinned
Node.js, Quarto and ffmpeg.

```sh
git clone <repository-url> ~/quarto-video
cd ~/quarto-video
mise install          # Node 24.21.0, Quarto 1.10.19, ffmpeg, linters
npm ci                # the video CLI and the renderer
npx --yes playwright@1.56.1 install --with-deps chromium-headless-shell
```

The last line installs a Chromium headless shell. Rendering needs one, and the
CLI never downloads one itself. The binary is under `~/.cache/ms-playwright`:
`chromium_headless_shell-1194/chrome-linux/headless_shell`. See
[installation.md](docs/guides/installation.md) for details and other ways to
install it.

### 2. Put the tools on your PATH

Add these lines to your shell profile (`~/.bashrc`, `~/.zshrc`):

```sh
export QUARTO_VIDEO="$HOME/quarto-video"
export PATH="$QUARTO_VIDEO/node_modules/.bin:$(cd "$QUARTO_VIDEO" && mise bin-paths | tr '\n' ':')$PATH"
export QV_BROWSER_EXECUTABLE="$HOME/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell"
```

This puts `video`, the pinned `quarto`, `node` and `ffmpeg` first on `PATH`,
and tells the renderer where the browser is. Open a new shell and check:

```sh
video doctor          # one ✓ line per tool; exits 0 when all are usable
```

### 3. Create the project directory

A project is one directory, and one video. It can live anywhere:

```sh
mkdir -p ~/work/my-video
cd ~/work/my-video
```

### 4. Configure `_quarto.yml`

Create `_quarto.yml` in the project directory. It makes the directory a Quarto
project, renders only `index.qmd`, and runs the hook afterwards:

```yaml
project:
  type: default
  render:
    - index.qmd
  post-render:
    - ./_render-video.sh
```

Keep the `./` in `./_render-video.sh`, because Quarto can't run the hook
without it. Don't add `output-dir`.

### 5. Add the render hook

Copy the hook from this repository and keep it executable:

```sh
cp "$QUARTO_VIDEO/videos/_render-video.sh" .
chmod +x _render-video.sh
```

You never edit it. It runs `video render` on each project Quarto just rendered,
and fails `quarto render` when the video render fails.

### 6. Write `index.qmd`, a hello world

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
├── _quarto.yml        # step 4
├── _render-video.sh   # step 5
└── index.qmd          # step 6
```

Add an `assets/` folder for images, footage, music and captions, and `data/`
for chart CSVs. Paths in `index.qmd` are relative to the project directory.

### 7. Validate (optional, fast)

```sh
video validate ~/work/my-video
```

This prints `OK my-video (2 scenes, 150 frames)`, or every error with its line
and a fix. It needs no browser and renders nothing.

### 8. Render with Quarto

Run either form from the directory that contains the project:

```sh
cd ~/work
quarto render my-video              # the project directory
quarto render my-video/index.qmd    # or its index.qmd
```

Or run `quarto render` inside `my-video/`. Quarto renders the page, then the
hook validates and renders the video, showing progress and then
`Wrote output.mp4`. If the video has an error, `quarto render` exits non-zero
and prints the diagnostics.

`video render ~/work/my-video` does the same without Quarto.

## Where the output goes

Everything is written inside the project directory. Nothing is written next to
it.

| Path (in the project directory) | What it is |
| --- | --- |
| `output.mp4` | **The video.** Set `video.output` in front matter to change it, for example `output: dist/intro.mp4` writes `dist/intro.mp4`. The path must stay inside the project and end in `.mp4`. |
| `output.vtt` | Only with `video.captions` in `sidecar` or `both` mode: the captions, next to the video. |
| `.video-build/` | Build files: the manifest, diagnostics and `build-info.json` (hashes and tool versions). Safe to delete. |
| `index.html`, `index_files/`, `.quarto/` | Quarto's own HTML page and cache. Not needed for the video. |

The video is first rendered to `.video-build/render.partial.mp4` and checked
(size, fps, frame count). Only then does it replace the output file. A failed
render leaves your previous `output.mp4` untouched. Leave Quarto's
`output-dir` unset in `_quarto.yml`: the hook finds your project from the paths
of the pages Quarto rendered.

Add this to the project's `.gitignore` to keep generated files out of commits:

```
output.mp4
output.vtt
.video-build/
.quarto/
index.html
index_files/
```

## Many videos in one folder

Put several projects side by side under one parent with a single shared
`_quarto.yml` and hook. Then no project needs its own Quarto files. This
repository's `videos/` folder works this way: `videos/_quarto.yml` uses
`render: ["*/index.qmd"]`, and the copy of `_render-video.sh` sits next to it.

```sh
cd ~/quarto-video
cp -r videos/_template videos/my-video
quarto render videos/my-video         # writes videos/my-video/output.mp4
quarto render videos                  # every project; _template is skipped
```

Don't add a `_quarto.yml` inside a project in such a folder. Quarto would treat
that project as separate, and it would have no hook (ADR-0021).

## When something goes wrong

- **`quarto render` exits 0 but writes no MP4:** Quarto found no `_quarto.yml`
  with the hook. Check step 4.
- **`video: browser is not available`:** set `QV_BROWSER_EXECUTABLE` (step 2).
- **`node is not available ... is not Node 24`:** the mise tools are not first
  on `PATH` (step 2).
- **The hook fails to start:** run `chmod +x _render-video.sh`, and check the
  `./` in `_quarto.yml`.

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
