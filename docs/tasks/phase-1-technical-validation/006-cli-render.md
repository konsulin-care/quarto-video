# 006 — `video render`

Phase 1 · Status: in-progress · Depends on: 004, 005 · PRD: §4.2, §11.2, §11.3 · ADR: —

## Goal
`video render <path>` validates, renders and writes `video.output`
(default `output.mp4`) inside the project, with progress output, and never
renders or leaves a partial file when something fails.

## Scope
- In: orchestration validate → render; output path relative to project
  root; progress percent; temp-file-then-rename; build-dir cleanup policy;
  sample project `videos/hello/`.
- Out: preflight (018), `--json` render events (008), concurrency tuning.

## Deliverables
- `packages/cli/src/commands/render.ts`.
- `videos/hello/index.qmd` (2 short title scenes).
- Cleanup policy written in `packages/cli/README.md` (what stays in
  `.video-build/` after success/failure).
- Integration tests in `tests/integration/render.test.ts`.

## Definition of done
Automated:
- [ ] Rendering a 640×360, 1 s fixture creates `output.mp4` with matching
      size/fps/frames (ffprobe).
- [ ] A validation-failing fixture → exit 1, renderer never invoked, no
      output file created.
- [ ] Forced renderer failure (test hook) → non-zero exit, error text
      includes the renderer message, no `output.mp4` left behind, any
      previous `output.mp4` untouched.
- [ ] Works with directory and `.qmd` input and from any cwd.

Human check:
1. `npx video render videos/hello` → progress percentages, then
   `Wrote videos/hello/output.mp4`.
2. Play the file: both title scenes appear in order.
3. Break `index.qmd` (`duration="0s"`), rerun → error, exit 1, old
   `output.mp4` unchanged (check timestamp).

## Notes
Phase 1 exit criterion (PRD §15) is met when this task is done.

## Completion log
