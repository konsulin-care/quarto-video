# docs/guides/ — human guides

Status: `compatibility.md` (task 049) is real. User guides arrive in task 050.

- `compatibility.md`: supported Quarto, Pandoc, Node, Remotion and ffmpeg versions (the pins in `mise.toml` and `renderer/remotion/package.json`), OS notes and known cross-platform differences. Its versions are the single matrix in `packages/cli/src/compatibility.json`, which `video doctor` reads; `packages/cli/test/compat-matrix.test.ts` checks both.
