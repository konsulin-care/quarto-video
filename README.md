# quarto-video

A Quarto extension and `video` CLI for authoring polished, repeatable videos in
Quarto Markdown with a declarative scene DSL, rendered through Remotion via a
renderer-independent Video IR.

**Status:** pre-alpha. The `video` CLI validates and renders the sample projects. Development follows the numbered
tasks in [`docs/tasks/`](docs/tasks/README.md).

- Product requirements: [`docs/prd.md`](docs/prd.md)
- Architecture: [`docs/architecture.md`](docs/architecture.md)
- Coding agents start at [`AGENT.md`](AGENT.md)
- Testing policy: [`docs/testing.md`](docs/testing.md)

## Quickstart

```sh
git clone <repository-url> quarto-video && cd quarto-video
mise install && mise run setup && npm ci
npx video doctor                              # tools; set QV_BROWSER_EXECUTABLE to render
npx video validate videos/hello-world         # OK hello-world (6 scenes, 150 frames)
cp -r videos/_template videos/my-video        # a starter project
npx video render videos/my-video              # writes videos/my-video/output.mp4
quarto render videos/my-video                 # the same, through Quarto (ADR-0021)
```

- [Installation](docs/guides/installation.md): the tools, the browser and a first run.
- [Authoring](docs/guides/authoring.md): the scene language, components, transitions and animations.
- [CLI](docs/guides/cli.md), [diagnostics](docs/guides/diagnostics.md) and [troubleshooting](docs/guides/troubleshooting.md).

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
