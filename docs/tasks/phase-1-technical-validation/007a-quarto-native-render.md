# 007a — Quarto-native render via post-render hook

Phase 1 · Status: todo · Depends on: 007 · PRD: §1.3, §4.3, §16, §18.1 · ADR: reads 0002

## Goal
Make `quarto render videos/hello/index.qmd` and `quarto render videos/hello`
a supported way to write `output.mp4`, as ADR-0002 verified: a project
`_quarto.yml` declares `project: post-render:` and the hook runs `video render`.

## Scope
- In: a committed post-render hook and `_quarto.yml` for `videos/hello`; a
  way for the hook to find the `video` CLI with documented mechanisms only;
  an integration test for both forms and the failure path; docs.
- Out: the extension (ADR-0002: it cannot render), custom formats, `quarto
  preview`, other Quarto versions, batch rendering, changing `video render`.

## Deliverables
- `videos/hello/_quarto.yml` and the hook script, each documented in
  `videos/README.md` (the hook is project config, not an extension contribution).
- `tests/integration/quarto-render.test.ts` (new) covering both forms.
- ADR-0002 "Consequences" updated to point at this task's tests (do not change
  its Decision; supersede it only if the decision itself changes).

## Definition of done
Automated:
- [ ] `npm run test:integration` renders `videos/hello` through
      `quarto render videos/hello/index.qmd` and `quarto render videos/hello`
      to `output.mp4` (1920×1080, 30/1 fps, 120 frames, ffprobe).
- [ ] A failing `video render` (for example a validation error) makes
      `quarto render` exit non-zero and leaves no `output.mp4` behind.
- [ ] No Quarto internals are used: the hook calls only documented
      `project:` and the `video` CLI.

Human check:
1. From the repo root, run `quarto render videos/hello/index.qmd` and confirm
   `Wrote videos/hello/output.mp4` and a playable file.
2. Remove `videos/hello/_quarto.yml` and run `quarto render videos/hello`:
   nothing renders (ADR-0002, form dir-extension-filter).

## Notes
- Open for this task: how the hook finds the CLI (`npm exec --prefix <repo>`,
  or a `video` bin on PATH). The spike used an absolute repo path, which is
  not acceptable for a committed hook.
- The hook must use `./name` in `post-render:` (a bare name failed to spawn).
- `quarto render` also writes `index.html` and `.quarto/` into the project;
  decide whether to keep or ignore them (`.gitignore`).

## Completion log
