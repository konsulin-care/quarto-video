# 018 — Preflight and output check

Phase 2 · Status: todo · Depends on: 017 · PRD: §9.1 (stages 5–6), §11.1 · ADR: —

## Goal
Rendering fails fast when the environment cannot render, and succeeds only
when the produced file matches the IR.

## Scope
- In: stage 5 preflight (Node version, renderer deps, headless browser,
  `ffprobe`, output dir writable, enough disk heuristic); stage 6 (output
  exists, non-empty, size/fps/frame count match IR); `video doctor`.
- Out: version recording in build info (049).

## Deliverables
- `packages/cli/src/preflight.ts`, `src/commands/doctor.ts`.
- `packages/validator/src/stages/output.ts`.
- Test hooks to simulate missing tools via env vars (documented, test-only).

## Definition of done
Automated:
- [ ] Simulated missing browser/ffprobe → exit 2, message names the tool and
      how to install it; renderer not started.
- [ ] Output with wrong frame count (test hook) → `E_OUTPUT_MISMATCH`, exit 1.
- [ ] `video doctor --json` lists tool names, versions, ok flags.

Human check:
1. `npx video doctor` → Node, Quarto, Pandoc, Remotion, browser, ffprobe with
   ✓/✗ and versions.
2. `chmod -w videos/hello && npx video render videos/hello` → clear
   "output directory not writable" error, exit 2; `chmod +w` afterwards.

## Notes
Phase 2 exit criterion (PRD §15) is met when this task is done.

## Completion log
