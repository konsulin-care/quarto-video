# quarto-video

A Quarto extension and `video` CLI for authoring polished, repeatable videos in
Quarto Markdown with a declarative scene DSL, rendered through Remotion via a
renderer-independent Video IR.

**Status:** pre-alpha. Nothing is implemented yet. Development follows the numbered
tasks in [`docs/tasks/`](docs/tasks/README.md).

- Product requirements: [`docs/prd.md`](docs/prd.md)
- Architecture: [`docs/architecture.md`](docs/architecture.md)
- Coding agents start at [`AGENT.md`](AGENT.md)

Target workflow (once implemented):

```
video validate videos/gpu
video render videos/gpu      # → videos/gpu/output.mp4
```
