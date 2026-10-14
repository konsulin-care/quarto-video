# quarto-video

A Quarto extension and `video` CLI for authoring polished, repeatable videos in
Quarto Markdown with a declarative scene DSL, rendered through Remotion via a
renderer-independent Video IR.

**Status:** pre-alpha. Nothing is implemented yet. Development follows the numbered
tasks in [`docs/tasks/`](docs/tasks/README.md).

- Product requirements: [`docs/prd.md`](docs/prd.md)
- Architecture: [`docs/architecture.md`](docs/architecture.md)
- Coding agents start at [`AGENT.md`](AGENT.md)
- Testing policy: [`docs/testing.md`](docs/testing.md)

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

Target workflow (once implemented):

```
video validate videos/gpu
video render videos/gpu      # → videos/gpu/output.mp4
```
