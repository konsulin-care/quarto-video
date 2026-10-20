# 052 — `quarto render` for every project in videos/

Phase 5 · Status: done · Depends on: 007a · PRD: §1.3, §4.3, §16, §18.1 · ADR: writes 0021

## Goal
`quarto render videos/<name>` and `quarto render videos/<name>/index.qmd`
write `output.mp4` for any project under `videos/`, a fresh copy of
`videos/_template` included, without copying Quarto files into the project.

## Scope
- In: one shared `videos/_quarto.yml` and post-render hook; removing the
  per-project files from `videos/hello` and `videos/hello-world`; the
  integration test; guides, READMEs, ADR-0021.
- Out: projects outside `videos/` (they copy the two files), other Quarto
  versions, `quarto preview`, changing `video render`.

## Deliverables
- `videos/_quarto.yml`, `videos/_render-video.sh` (executable).
- `tests/integration/quarto-render.test.ts` on the shared hook.
- ADR-0021 (accepted); ADR-0002 Consequences point at it.

## Definition of done
Automated:
- [x] `quarto render videos/hello` and `quarto render videos/hello/index.qmd`
      write the expected MP4, with no `_quarto.yml` in `videos/hello`.
- [x] A failing `video render` makes `quarto render` exit non-zero and leaves
      no `output.mp4`.
- [x] The ADR-0002 spike test still passes.

Human check:
1. `cp -r videos/_template videos/my-video && quarto render videos/my-video`
   prints `Wrote my-video/output.mp4`, and the file plays.
2. `quarto render videos/my-video/index.qmd` does the same.

## Notes
- The hook reads `QUARTO_PROJECT_OUTPUT_FILES` (`<project>/index.html` per
  line, relative to `videos/`) and runs `video render` on each project.
- `render: ["*/index.qmd"]` keeps `README.md` and `assets/SOURCES.md` out;
  Quarto already skips `_template`.

## Completion log
- 2026-10-20. Implemented as above. Local run (Quarto 1.10.19 and Node 24.21.0
  from mise, headless shell 1194): `quarto-render.test.ts` 3/3 and
  `spike-quarto-native.test.ts` 1/1. Manual: template copy (360 frames),
  `hello-world` file form (150 frames), render from inside the project
  directory, and a two-project hook run with one invalid project (exit 1, the
  valid one written). See ADR-0021.
