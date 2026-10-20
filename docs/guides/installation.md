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

## 3. Check the machine

```sh
npx video doctor
```

`doctor` prints one line per tool, `✓` when it is usable and `✗` with a hint
when it is not. It exits 0 when every tool is usable and 2 otherwise. Until
step 4 the `browser` line is `✗`, which is expected.

## 4. Point at a Chromium headless shell

Rendering needs a Chromium headless shell. The CLI never downloads one. Install
one by any method you use, then set `QV_BROWSER_EXECUTABLE` to its binary:

```sh
export QV_BROWSER_EXECUTABLE=/path/to/chromium_headless_shell/headless_shell
npx video doctor
```

`renderer/remotion/README.md` describes the variable. Set it in your shell
profile to keep it. `video render` and `quarto render` refuse to start without
it (exit 2).

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

`quarto render` produces `output.mp4` only through a project's `_quarto.yml`
post-render hook (ADR-0002). A project that wants it copies `_quarto.yml` and
`render-video.sh` from `videos/hello-world` and keeps `render-video.sh`
executable. The template has neither file, so `quarto render` on a plain copy
of it renders nothing and exits 0.

## Next steps

- [authoring.md](authoring.md): the scene language, components and presets.
- [cli.md](cli.md): every command and flag.
- [troubleshooting.md](troubleshooting.md): when a command fails.
