# 018 — Preflight and output check

Phase 2 · Status: done · Depends on: 017 · PRD: §9.1 (stages 5–6), §11.1 · ADR: —

## Goal
Rendering fails fast when the environment cannot render, and succeeds only
when the produced file matches the IR.

## Scope
- In: stage 5 preflight (Node version, renderer deps, headless browser,
  `ffprobe`, output dir writable, enough disk heuristic); stage 6 (output
  exists, non-empty, size/fps/frame count match IR); `video doctor`.
- Out: version recording in build info (049).

## Deliverables
- `packages/cli/src/preflight.ts`, `src/commands/doctor.ts` (plus `src/tools.ts`, `src/output-probe.ts`).
- `packages/validator/src/stages/output.ts`.
- Test hooks to simulate missing tools via env vars (documented, test-only).

## Definition of done
Automated:
- [x] Simulated missing browser/ffprobe → exit 2, message names the tool and
      how to install it; renderer not started. (`tests/integration/preflight-output.test.ts`)
- [x] Output with wrong frame count (test hook) → `E_OUTPUT_MISMATCH`, exit 1.
      (`tests/integration/preflight-output.test.ts`; `packages/validator/test/output.test.ts`)
- [x] `video doctor --json` lists tool names, versions, ok flags. (`tests/integration/doctor.test.ts`)

Human check (pending, not run by an agent):
1. `npx video doctor` → Node, Quarto, Pandoc, Remotion, browser, ffprobe with
   ✓/✗ and versions.
2. `chmod -w videos/hello && npx video render videos/hello` → clear
   "output directory not writable" error, exit 2; `chmod +w` afterwards.

## Notes
Phase 2 exit criterion (PRD §15) is met when this task is done.
Decisions (the conservative option, per AGENT.md; flagged in the completion report):
- Order: stages 1–4 run first, so a rejected document exits 1 without touching the
  environment; preflight (exit 2) runs next, before the renderer is called.
- Browser: `QV_BROWSER_EXECUTABLE` is required. Unset is exit 2, because Remotion's own
  download is an implicit network fetch (PRD §11.4). A behaviour change for CLI users.
- All six tools are required by render. Node is checked by the major version in the
  root `engines` (ADR-0010 pins the exact version through mise).
- Disk: a fixed 256 MiB free in the output's filesystem; unknown free space is a failure.
- Writable: the nearest existing directory of the output and of `.video-build` is checked
  with `access(W_OK)`. Root bypasses permission bits, so the human check must run as a non-root user.
- Output codes: `E_OUTPUT_MISSING` (no file or empty), `E_OUTPUT_UNREADABLE` (no video
  stream), `E_OUTPUT_MISMATCH` (width, height, fps or frames; `property` names it). fps is
  compared exactly as a rate (29.97 is not 30).
- A stage 6 failure deletes the temp file and leaves `video.output` untouched.
- `video doctor` exits 0 when all tools are ok, else 2 (an environment problem, not exit 1).
- Test hooks: `QV_TEST_MISSING` (absent tools) is new; the frame-count case reuses the
  `QV_TEST_RENDERER` seam with a stub that writes a real MP4.

## Completion log
- 2026-10-14: done. Summary: `video doctor [--json]`; render preflight (tools, writable output
  and build dirs, free disk) exiting 2 before the renderer; stage 6 output check (`checkOutput`)
  that deletes the temp file and exits 1 on a mismatch; codes `E_OUTPUT_MISSING`,
  `E_OUTPUT_UNREADABLE`, `E_OUTPUT_MISMATCH`; test-only `QV_TEST_MISSING`.
- Tests: `packages/validator/test/output.test.ts` (each stage 6 rule), `packages/cli/test/preflight.test.ts`
  (each preflight rule), `packages/cli/test/tools.test.ts`, `packages/cli/test/output-probe.test.ts`,
  `tests/integration/preflight-output.test.ts` (ffprobe, browser, unset browser, frame mismatch,
  previous output kept), `tests/integration/doctor.test.ts` (JSON shape, hints, human lines, usage).
  Existing `cli-render.test.ts` covers the passing path (stage 6 on the real render).
- Follow-ups: (a) replace the fixed disk heuristic with a size estimate; (b) record tool versions
  in build info (049); (c) `doctor` could check the output directory per project.
- Pending human checks (not run by an agent): (1) `npx video doctor` in a fresh clone with the
  pinned tools (expect ✓ for all six); (2) `chmod -w videos/hello && npx video render videos/hello`
  as a non-root user, expecting "output directory not writable" and exit 2, then `chmod +w`.
