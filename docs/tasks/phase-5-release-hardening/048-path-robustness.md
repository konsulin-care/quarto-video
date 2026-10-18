# 048 — Path robustness

Phase 5 · Status: done · Depends on: 047 · PRD: §4.1, §11.3, §13.2 · ADR: reads 0006

## Goal
Projects work regardless of where they live or how they are invoked:
spaces, non-ASCII characters, moved directories, any cwd.

## Scope
- In: integration tests copying `videos/demo` to temp paths such as
  `/tmp/My Videos/démo 動画/`; invoking with relative, absolute and `.qmd`
  paths from different cwds; moving a rendered project and re-rendering;
  Windows-style separators rejected or normalised per ADR-0006.
- Out: batch rendering (follow-on, not in v1).

## Deliverables
- `tests/integration/paths.test.ts`.
- Fixes in CLI/validator/renderer for any failures found (each with a test).

## Definition of done
Automated:
- [ ] Validate + render succeed for every path variant.
- [ ] Output always lands at `<project>/<video.output>`.
- [ ] Moved project renders identically (same frame count, same stills).

Human check:
1. `cp -r videos/demo "/tmp/My Videos/démo 動画"`.
2. `cd / && npx --prefix <repo> video render "/tmp/My Videos/démo 動画"` →
   output written inside that folder and plays correctly.

## Notes
- Moved-project check: every decoded frame's framemd5 (pixel data) is compared, which covers the sampled stills. MP4 bytes are not compared (PRD §11.1).
- CLI paths with backslashes are rejected (non-zero exit, no output). ADR-0006 covers asset references only; this is a decision recorded here.
- Found by the tests and fixed: pandoc reads metadata as Markdown, so `assets\captions.vtt` lost its backslash and gave E_ASSET_MISSING. `lib/meta.lua` now keeps raw inline text (test in `tests/test_captions.lua`).
- Open limit: Markdown escapes in metadata (e.g. `\*`) still drop the backslash; ADR-0006 does not cover this.
- Human checks 1 and 2 are open (not performed by the agent).

## Completion log
- 2026-10-18 · done. `tests/integration/paths.test.ts` (7 tests): demo copied to `My Videos/démo 動画`, validated and rendered from four cwds (repo root, `/`, parent, scratch) with relative, absolute and `.qmd` paths; output at `<project>/output.mp4`; moved project re-renders with the same frame count and identical framemd5 per frame; backslash asset path gives E_ASSET_INVALID; backslash CLI path rejected with no output. Renders at 960x540.
- Fix (own test): `_extensions/video/lib/meta.lua` keeps raw inline text; new case in `_extensions/video/tests/test_captions.lua` (failed before the fix).
- Times: variants 55–84 s each; moved-project test 112 s; separator tests 1.3–1.5 s each. Whole paths file about 6.3 min on a shared machine.
- Gates: `mise exec -- mise run check` passed (exit 0). `mise exec -- mise run test` passed (EXIT=0): scripts 19/0; unit 1134 passed in 116 files; lua 299/0; integration pure 157/0, vitest 7 passed, render group 87/0; visual 310 frames passed.
- Registered `paths.test.ts` in `test:integration:render`. Updated `tests/README.md` and AGENT.md Commands.
- Follow-ups: the open limit in Notes; human checks 1 and 2 still to run.
