# docs/guides/ — user guides

Status: task 050. Every guide is current with IR 1.12 and the `video` CLI, and is
checked by `tests/integration/docs.test.ts` (diagnostic codes, commands, flags and the
`qmd` examples).

- `installation.md`: the tools, the browser variable, a first run and a new project.
- `authoring.md`: the DSL reference (front matter, scenes, durations, components, transitions, animations, exit, `animationDuration`, slots, music, captions).
- `cli.md`: every `video` command, flag, exit code and file it writes.
- `diagnostics.md`: every error and warning code, with its fix.
- `extending.md`: the checklist for a new component or preset.
- `troubleshooting.md`: symptoms, causes and fixes.
- `acceptance-checklist.md` (task 051): every PRD §16 criterion with the test or task log that proves it; checked by `tests/integration/acceptance-checklist.test.ts`.
- `versioning.md`: IR and DSL versioning (ADR-0007), IR 1.0 to 1.12, and migration.
- `compatibility.md` (task 049): supported Quarto, Pandoc, Node, Remotion and ffmpeg versions, OS notes and known cross-platform differences. Its versions are the single matrix in `packages/cli/src/compatibility.json`, which `video doctor` reads; `packages/cli/test/compat-matrix.test.ts` checks both.
