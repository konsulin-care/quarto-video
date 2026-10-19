# 049 — Reproducibility and compatibility matrix

Phase 5 · Status: done · Depends on: 047 · PRD: §11.1, §14 (11) · ADR: reads 0001

## Goal
Every render records what produced it, repeated renders are visually
equivalent, and supported versions are documented.

## Scope
- In: `.video-build/build-info.json` (IR hash, asset hashes, tool versions,
  OS, Remotion/Chrome versions, CLI flags); reproducibility test rendering
  twice and comparing stills; `docs/guides/compatibility.md` (Quarto,
  Pandoc, Node, Remotion, ffmpeg versions; OS notes; known cross-platform
  differences).
- Out: bit-identical MP4 guarantees (non-goal).

## Deliverables
- Build-info writer in CLI; schema for it.
- `tests/integration/reproducibility.test.ts`.
- `docs/guides/compatibility.md`.

## Definition of done
Automated:
- [x] Two renders of `videos/demo` produce identical stills at sampled frames.
  (`tests/integration/reproducibility.test.ts`: ffmpeg `framemd5` of 5 frames)
- [x] `build-info.json` validates and changes when any asset changes.
  (`reproducibility.test.ts`: schema check; each project asset changed in turn)
- [x] `video doctor` warns when a tool version is outside the matrix.
  (`tests/integration/compat-doctor.test.ts`; `packages/cli/test/compat-matrix.test.ts`)

Human check (open, not performed):
1. Render `videos/demo`, open `.video-build/build-info.json`: versions and
   hashes are present and readable.
2. Compare your local versions with `docs/guides/compatibility.md` using
   `npx video doctor`.

## Notes
- Matrix: `packages/cli/src/compatibility.json` is the single source. Its
  Node, Quarto, ffmpeg and Remotion pins are tested against `mise.toml` and
  `renderer/remotion/package.json`; the guide must list each version.
- Stills: ffmpeg `framemd5` per sampled frame (exact MD5 of decoded pixels).
  Pandoc is not pinned in `mise.toml`: its version is the one bundled with
  Quarto 1.10.19. Chromium is recorded in build-info, not in the matrix.
- A matrix warning does not change `video doctor`'s exit status.

## Completion log
- 2026-10-19: build-info writer (`packages/cli/src/build-info.ts`, schema
  `packages/cli/schema/build-info.json`, ajv validation before write), matrix
  and doctor warning, compatibility guide. Tests: `reproducibility.test.ts`
  (4), `compat-doctor.test.ts` (3), `compat-matrix.test.ts` (5, unit).
  Gates: `mise exec -- mise run check` EXIT=0 (~30 s; line limit, format,
  lint 0 errors, typecheck). `mise exec -- mise run test` EXIT=0 in 41 min
  34 s: scripts 19/0; unit 117 files, 1139/0; Lua 299/0; integration pure
  157/0; vitest render 7/0; render group 94/0 (reproducibility 220 s, compat
  doctor 6 s); visual 310 frames, harness and flash 23/0.
  Fixed on the way: `media-probe` and `media-stage` unit suites hit the 10 s
  hook timeout in `generate.sh` when run in parallel; their `beforeAll` now
  allows 120 s (no assertion changed). Twice failed before that fix; the log
  is in the scratchpad.
  Human checks: both open, not performed.
  Follow-ups: macOS and Windows not verified.
