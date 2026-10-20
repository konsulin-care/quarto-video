# ADR-0021: One shared Quarto project for videos/

- Status: superseded by ADR-0022 (task 053): the extension's post-render filter
  renders; the shared project and hook script are removed
- Date: 2026-10-20
- Task: 052
- PRD: §1.3, §4.3, §16, §18.1

## Context
ADR-0002 made `quarto render` write `output.mp4` through a project
`_quarto.yml` whose `post-render` hook runs `video render`. Task 007a put that
file and a `render-video.sh` hook in `videos/hello`; `hello-world` copied
them. Every new project had to copy both files and keep the script
executable, so `quarto render videos/<name>` on a copy of `videos/_template`
rendered nothing and exited 0. Authors want `quarto render videos/<name>` and
`quarto render videos/<name>/index.qmd` to work for any project under
`videos/` with no extra files.

## Options
1. **Per-project `_quarto.yml` and hook (ADR-0002, task 007a).** Works, but
   every project carries two copied files, and the template has neither.
2. **One shared project at `videos/` (chosen).** `videos/_quarto.yml` lists
   `*/index.qmd` as the render targets and runs one hook. Quarto finds the
   project by searching parent directories, so a project directory needs no
   Quarto files of its own.
3. **An extension-contributed project type or format.** Rejected for the
   same reason as ADR-0002 option 1: the pinned schema has no format-level
   post-render, and a filter may not spawn a process.

## Decision
1. `videos/_quarto.yml` is a `type: default` project with
   `render: ["*/index.qmd"]` and `post-render: ./_render-video.sh`. Projects
   under `videos/` have no `_quarto.yml` or hook of their own: a nested
   `_quarto.yml` would make that directory its own project, without the hook.
2. Quarto runs `_render-video.sh` from `videos/` and lists the pages it
   rendered in `QUARTO_PROJECT_OUTPUT_FILES` (documented for post-render
   scripts), one `<project>/index.html` per line. The hook runs `video render`
   on each project and exits with the first non-zero status. A failing
   project does not stop the others.
3. The hook finds the CLI as task 007a did: `video` on `PATH`, else
   `npm exec --prefix <repo> -- video`, where the repository is the parent of
   `videos/`.
4. Supported forms, Quarto 1.10.19: `quarto render videos/<name>`,
   `quarto render videos/<name>/index.qmd`, and `quarto render` or
   `quarto render index.qmd` from inside `videos/<name>`.
   `quarto render videos` renders every project. Directories starting with `_`
   (`videos/_template`) are skipped, as are `.md` files (`videos/README.md`,
   `assets/SOURCES.md`), because they are not render targets.
5. ADR-0002 decision 4 still holds outside `videos/`: a directory with no
   `_quarto.yml` in it or above it renders nothing. A project elsewhere keeps
   its own `_quarto.yml` (`render: [index.qmd]`, the same `post-render`) and a
   copy of `videos/_render-video.sh` in its directory; Quarto lists
   `index.html`, so the hook renders that directory. It needs `video` on
   `PATH` (`<repo>/node_modules/.bin`). A parent folder of several projects can
   copy `videos/` instead: `render: ["*/index.qmd"]` and one hook.
   `output-dir` must stay unset: the hook maps rendered pages to projects.

## Consequences
- A copy of `videos/_template` renders with `quarto render` and no other
  step. `videos/hello` and `videos/hello-world` lose their two files.
- Quarto writes `videos/.quarto/` and `videos/.gitignore`. Both are
  gitignored, next to the per-project `index.html` and `index_files/`.
- The `Wrote` line from the hook names the output relative to `videos/`
  (`Wrote hello/output.mp4`).
- The ADR-0002 spike copies only `videos/hello`, so its evidence is unchanged.
- Not claimed: other Quarto versions, `quarto preview`, platforms other than
  Linux x86_64.

## Verification
- `tests/integration/quarto-render.test.ts`: `quarto render videos/hello` and
  `quarto render videos/hello/index.qmd` write a 1920x1080, 30/1 fps,
  120-frame MP4 with no Quarto files in `videos/hello`; a failing
  `video render` makes `quarto render` exit non-zero, run from inside the
  project directory of a scratch copy, and leaves no `output.mp4`.
- Manual (2026-10-20, Quarto 1.10.19, Node 24.21.0, headless shell 1194): a
  fresh copy of `videos/_template` rendered by
  `quarto render videos/my-video` gave 1920x1080, 30/1, 360 frames;
  `quarto render videos/hello-world/index.qmd` gave 1000x1000, 30/1, 150
  frames; `quarto render` from inside the project rendered too. A standalone
  project outside the repository (decision 5, the README walkthrough, with
  `video` and the mise tools on `PATH`) rendered with both forms: 1280x720,
  30/1, 150 frames, `Wrote output.mp4`; `video.output: dist/hello-world.mp4`
  wrote that file; without `QV_BROWSER_EXECUTABLE` `quarto render` exited 1. With one
  invalid and one valid project in `QUARTO_PROJECT_OUTPUT_FILES`, the hook
  rendered the valid one and exited 1.

## References
- ADR-0002 · task 007a · `videos/README.md`
- Quarto docs, project scripts: `QUARTO_PROJECT_OUTPUT_FILES`,
  `QUARTO_PROJECT_RENDER_ALL`; `share/schema/project.yml` (`render`, `post-render`)
