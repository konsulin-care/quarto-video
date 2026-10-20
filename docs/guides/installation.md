# Installation

Status: task 050. Verified on Linux x86_64 only. macOS and Windows are not
verified, and no support is claimed for them (`compatibility.md`).

## What you need

| Tool | Version | Used for | Installed by |
| --- | --- | --- | --- |
| mise | 2026.10.0 or later | installs the pinned tools below (`mise.toml`) | you, from <https://mise.jdx.dev> |
| Node.js | 24.21.0 | the `video` CLI and the renderer | mise |
| Quarto CLI | 1.10.19 | reads `.qmd` files and runs the Lua filter | mise |
| ffmpeg and ffprobe | 9.0.2 | media probing and the output check | mise |
| Chromium headless shell | tested with 141 | draws each frame when you render | you; point `QV_BROWSER_EXECUTABLE` at it |

`video validate` needs Node and Quarto. `video render` also needs ffmpeg and
the browser. The full matrix is in [compatibility.md](compatibility.md).

## 1. Get the repository

```sh
git clone <repository-url> quarto-video
cd quarto-video
```

## 2. Install the tools and dependencies

```sh
mise install
mise run setup
npm ci
```

`mise install` fetches the pinned tools. `mise run setup` installs the git
hooks (contributors). `npm ci` installs the workspace from `package-lock.json`.

Run these where `npm` and `npx` use the pinned Node: activate mise in your shell
(`mise activate`, see <https://mise.jdx.dev>), or prefix each command with
`mise exec --`. `video doctor` reports any other Node version as ✗.

## 3. Check the machine

```sh
npx video doctor
```

`doctor` prints one line per tool, `✓` when it is usable and `✗` with a hint
when it is not. It exits 0 when every tool is usable and 2 otherwise. Until
step 4 the `browser` line is `✗`, which is expected.

## 4. Point at a Chromium headless shell

Rendering needs a Chromium headless shell. The CLI never downloads one. A pinned
way to install one is the Playwright cache (the CI job runs this line):

```sh
npx --yes playwright@1.56.1 install --with-deps chromium-headless-shell
```

`--with-deps` installs system libraries with apt and may ask for sudo. The binary
is `chromium_headless_shell-1194/chrome-linux/headless_shell` under
`~/.cache/ms-playwright`, or under `$PLAYWRIGHT_BROWSERS_PATH` when that is set.
Any other install works too. Set `QV_BROWSER_EXECUTABLE` to the binary:

```sh
export QV_BROWSER_EXECUTABLE=/path/to/chromium_headless_shell/headless_shell
npx video doctor
```

`renderer/remotion/README.md` describes the variable. Set it in your shell
profile to keep it. `video render` and `quarto render` refuse to start without
it (exit 2), so `quarto render` fails too.

## 5. Try the reference video

```sh
npx video validate videos/hello-world
npx video render videos/hello-world
```

The first command prints `OK hello-world (6 scenes, 150 frames)`. The second
writes `videos/hello-world/output.mp4`, a 1000 x 1000, 5-second video, and
prints `Wrote` with its path. Validation alone needs no browser.

## Start your own project

Copy the starter template and validate it:

```sh
cp -r videos/_template videos/my-video
npx video validate videos/my-video
```

The copy prints `OK my-video (3 scenes, 360 frames)`. Edit `videos/my-video/index.qmd`
and follow [authoring.md](authoring.md). Files under `videos/*/` named
`output.*` and `.video-build/` are gitignored, so generated output stays out
of commits.

### Outside `videos/`

A project does not have to live under `videos/`. Run the CLI from the
repository with the project's path:

```sh
cd /path/to/quarto-video
mise exec -- npx video validate /path/to/my-project
```

From any other directory, put the mise tools on `PATH` and point `npm exec` at
the repository:

```sh
PATH="$(cd /path/to/quarto-video && mise bin-paths | tr '\n' ':')$PATH" \
  npm exec --prefix /path/to/quarto-video -- video validate ./my-project
```

## Quarto render (optional)

Every project under `videos/` also renders with Quarto, with no extra files
(ADR-0021):

```sh
quarto render videos/my-video              # or videos/my-video/index.qmd
```

`videos/_quarto.yml` makes `videos/` one Quarto project. After Quarto renders a
project's `index.qmd`, its post-render hook `videos/_render-video.sh` runs
`video render` on that project, so the same tools and `QV_BROWSER_EXECUTABLE`
are needed, and a failed render makes `quarto render` exit non-zero.
`quarto render videos` renders every project; `videos/_template` is skipped.

A project outside `videos/` keeps its own `_quarto.yml` (with
`render: [index.qmd]` and the same `post-render` entry) and a copy of
`_render-video.sh` in its directory, and needs `video` on `PATH`. The root
`README.md` walks through it step by step. Without a `_quarto.yml` in the
project's directory or above it, `quarto render` renders nothing and exits 0. Do not add a `_quarto.yml` inside a project under
`videos/`: it would replace the shared one, which has the hook.

## Next steps

- [authoring.md](authoring.md): the scene language, components and presets.
- [cli.md](cli.md): every command and flag.
- [troubleshooting.md](troubleshooting.md): when a command fails.
