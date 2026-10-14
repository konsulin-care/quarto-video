# 049 — Reproducibility and compatibility matrix

Phase 5 · Status: todo · Depends on: 047 · PRD: §11.1, §14 (11) · ADR: reads 0001

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
- [ ] Two renders of `videos/demo` produce identical stills at sampled frames.
- [ ] `build-info.json` validates and changes when any asset changes.
- [ ] `video doctor` warns when a tool version is outside the matrix.

Human check:
1. Render `videos/demo`, open `.video-build/build-info.json`: versions and
   hashes are present and readable.
2. Compare your local versions with `docs/guides/compatibility.md` using
   `npx video doctor`.

## Notes

## Completion log
