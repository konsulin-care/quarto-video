# ADR-0022: The extension renders through a post-render filter

- Status: accepted
- Date: 2026-10-20
- Task: 053
- PRD: §1.3, §4.3, §16, §18.1
- Supersedes: ADR-0021; ADR-0002 decisions 2, 3 and 5

## Context
ADR-0002 and ADR-0021 made `quarto render` write the MP4 through a project
`post-render` script (`_render-video.sh`) that each project, or its parent
folder, had to carry. That is not how Quarto extensions are used. Authors
expect the revealjs-plugin flow: `quarto add <extension>`, `filters: [...]` in
YAML, `quarto render`. ADR-0002 rejected a filter that starts the renderer
only because of this repository's own rule that Lua code is pure (decision 5);
it never tried one. Quarto 1.10.19 lets an extension filter run at the
`post-render` entry point (`share/schema/definitions.yml`, `filter-entry-point`).

## Options
1. **Project post-render script (ADR-0021).** Works, but every project carries
   a copied shell script, and `quarto add` alone is not enough.
2. **Extension filter at `post-render` that runs `video render` (chosen).**
   `_extension.yml` registers `render.lua` at `at: post-render`. After Pandoc
   reads the document, it runs `video render <project>`. Nothing to copy.
3. **Custom format or engine extension.** A format has no post-render option
   (ADR-0002); an engine (TypeScript in Quarto's Deno) would still need the
   Node renderer and Chromium, and replaces Quarto's markdown engine for no gain.

## Decision
1. `_extensions/video/_extension.yml` contributes one filter,
   `{path: render.lua, at: post-render}`. `filters: [video]` in a document's
   front matter or in `_quarto.yml` turns it on.
2. `render.lua` finds the CLI (`QUARTO_VIDEO_CLI`, else `video` on `PATH`) and
   runs `video render <input file>.qmd`, with the child's output on stderr. So
   each rendered `.qmd` is its own video, and its directory is that video's
   project root (`packages/cli/src/project.ts`): `topic-a/index.qmd` writes
   `topic-a/output.mp4`, and files side by side share a root, so each sets
   its own `video.output`. It is the only Lua file that starts a process, and it starts
   nothing else. `video.lua` and `lib/` stay pure; the CLI still runs
   `video.lua` itself through `quarto pandoc` (ADR-0002 Invocation), so there is
   no recursion.
3. A failure is a non-zero `quarto render`: a missing CLI exits 2, a failed
   `video render` exits with its status. Quarto logs an `error()` raised in a
   post-render filter and still exits 0, so `render.lua` uses `os.exit`.
4. The renderer is not part of the extension. Node 24, the `video` CLI and a
   Chromium headless shell are installed once, from this repository, like
   TinyTeX for PDF output. Publishing the CLI as an npm package is a separate
   decision.
5. `quarto render <dir>` and a bare `quarto render` need a `_quarto.yml` in
   the directory, as for any Quarto extension; `quarto render <file>.qmd` does
   not. The repository's root `_quarto.yml` renders `videos/*/index.qmd` with
   `filters: [video]`. `videos/_quarto.yml` and `videos/_render-video.sh` are
   removed.

## Consequences
- A user project is `_extensions/video/` (from `quarto add`), `_quarto.yml` and
  `index.qmd`. The output is `<project>/output.mp4` (or `video.output`).
- The installed extension's `video.lua` is not what renders: the CLI uses its
  own copy. Keep the extension and the CLI from the same checkout.
- Quarto also writes `index.html`, `index_files/` and `.quarto/`.
- ADR-0002's spike keeps its evidence: its temporary extension is the 0.1.0
  manifest (`video.lua` only) without `render.lua`.
- Not claimed: `quarto add konsulin-care/quarto-video` from GitHub (it is
  Quarto's standard install and needs the repository to be public; verified
  here with `quarto add <local clone>`), other Quarto versions,
  `quarto preview`, platforms other than Linux x86_64.

## Verification
- `tests/integration/quarto-render.test.ts`: `quarto render videos/hello` and
  `videos/hello/index.qmd` in this repository; in a scratch project after
  `quarto add <repo>`: `quarto render <project-dir>` writes the MP4, an
  invalid scene exits non-zero with its diagnostic and no output, and no
  `video` on `PATH` exits non-zero with the install message.
- `tests/integration/spike-quarto-native.test.ts`: ADR-0002 evidence unchanged.
- The same test renders a second `.qmd` (`topic-c.qmd`, `video.output:
  topic-c.mp4`) beside `index.qmd` with `render: ["*.qmd", "*/index.qmd"]`.
- Manual (2026-10-20): `topic-a/index.qmd`, `topic-b/index.qmd`,
  `topic-c.qmd` and `topic-d.qmd` (`output: videos/topic-d.mp4`) in one
  project: `quarto render` wrote all four and skipped `README.md`;
  `quarto render topic-a` and `quarto render topic-c.qmd` rewrote only their
  own video. A file that is not a render target gets no project `filters`.
- Manual (2026-10-20, Quarto 1.10.19): `filters: [video]` in front matter with
  `quarto render index.qmd` and no `_quarto.yml`; a bare `quarto render`;
  `QUARTO_VIDEO_CLI` with no `video` on `PATH`; no `QV_BROWSER_EXECUTABLE`
  exits 1 with the renderer's message.

## References
- ADR-0002, ADR-0021 · `_extensions/video/README.md` · README.md
- Quarto 1.10.19 `share/schema/extension.yml` (`contributes.filters`, `at`)
