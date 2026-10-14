# 006 — `video render`

Phase 1 · Status: done · Depends on: 004, 005 · PRD: §4.2, §11.2, §11.3 · ADR: —

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
- Integration tests in `tests/integration/cli-render.test.ts` (the task's
  `render.test.ts` name is taken by task 004's renderer test).

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
- Phase 1 exit criterion (PRD §15) is met when this task is done.
- `video.output` is read by the filter and written to `.video-build/render.json`,
  not into the IR (PRD §5.2: container settings stay out of the core IR).
- Progress is `NN%` on stdout; `Wrote <path>` is relative to the cwd.
- Test seam: `QV_TEST_RENDERER` (test-only, `packages/cli/README.md`). Not a user feature.
- The root `vitest` include (`render*.test.ts`) does not match `cli-render.test.ts`,
  so the CLI test runs once, under tsx in `test:integration`.

## Completion log
- 2026-10-14. `video render <path>` validates, renders to `video.output` through
  the renderer's public API, and renames the temp file only on success. The
  renderer gains `onProgress`; the filter gains `video.output`. Cleanup policy
  (manifest and render.json kept, temp file removed) is in `packages/cli/README.md`.
- Tests: `tests/integration/cli-render.test.ts` (8, ffprobe checks, hook-based
  failure paths, cwd and `.qmd` input); `tests/integration/validate.test.ts` and
  `minimal-filter.test.ts` still pass; `_extensions/video/tests/test_settings.lua`
  (4 new `video.output` cases).
- Human check: 1 done (`npx video render videos/hello` → `0%…100%`,
  `Wrote videos/hello/output.mp4`; 1920×1080, 30/1, 120 frames). 2 partly done:
  frames at 1 s and 3 s show each title in order; playback by a person pending.
  3 done on a copy with `duration="0s"`: exit 1, output SHA-256 and mtime unchanged.
- Automated checks pass locally, so the Phase 1 exit criterion (PRD §15) is met
  once the playback check in step 2 is confirmed by a person.
- Follow-ups: CI not verified. `--output` and `--json` (task 008) not built.
  Remotion prints memory-detection warnings on stderr in this container.
