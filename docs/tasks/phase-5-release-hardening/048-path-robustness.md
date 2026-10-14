# 048 — Path robustness

Phase 5 · Status: todo · Depends on: 047 · PRD: §4.1, §11.3, §13.2 · ADR: reads 0006

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

## Completion log
