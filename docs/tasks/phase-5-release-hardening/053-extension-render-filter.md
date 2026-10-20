# 053 — Render from the extension: `quarto add`, `filters: [video]`, `quarto render`

Phase 5 · Status: done · Depends on: 052 · PRD: §1.3, §4.3, §16, §18.1 · ADR: writes 0022

## Goal
Use quarto-video like any Quarto filter extension: install it with
`quarto add`, add `filters: [video]`, run `quarto render`. No hook script.

## Scope
- In: `render.lua` at `post-render`; `_extension.yml`; the root `_quarto.yml`
  for the samples; removing `videos/_quarto.yml` and `videos/_render-video.sh`;
  tests; README walkthrough, guides, ADR-0022.
- Out: publishing the CLI to npm, bundling a browser, `quarto preview`.

## Deliverables
- `_extensions/video/render.lua`, `_extensions/video/_extension.yml` (0.2.0).
- `_quarto.yml` (root). `tests/integration/quarto-render.test.ts`.
- ADR-0022; ADR-0021 superseded.

## Definition of done
Automated:
- [x] In this repository, `quarto render videos/hello` and
      `videos/hello/index.qmd` write the expected MP4.
- [x] After `quarto add <repo>` in a scratch project, `quarto render <dir>`
      writes the MP4; an invalid scene and a missing CLI exit non-zero.
- [x] The ADR-0002 spike test passes unchanged.

Human check:
1. Follow README.md "Step by step" in a new directory; `quarto render` writes
   `output.mp4`.

## Notes
- Quarto exits 0 after an `error()` in a post-render filter, so `render.lua`
  ends with `os.exit` on failure.
- `quarto render <dir>` needs a `_quarto.yml` (Quarto's rule for any project).

## Completion log
- 2026-10-20. Implemented. Local (Quarto 1.10.19, Node 24.21.0 from mise,
  headless shell 1194): `quarto-render.test.ts` 5/5, spike 1/1, `test:lua`
  308 passed, stylua and selene clean. Manual checks listed in ADR-0022.
- 2026-10-20. `render.lua` passes the rendered `.qmd`, not its directory, so a
  file other than `index.qmd` renders itself (it rendered `index.qmd` before).
  Test added (`topic-c.qmd`); README "Several videos in one project".
