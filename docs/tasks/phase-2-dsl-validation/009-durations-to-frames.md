# 009 — Durations → frames

Phase 2 · Status: todo · Depends on: 008 · PRD: §5.2, §8.2, §18.2 · ADR: writes 0003

## Goal
A documented, deterministic rule converting authored durations to integer
frames, implemented once in the filter and proven by shared test vectors.

## Scope
- In: ADR-0003 deciding units (`s`, `ms`, `f`?), decimal handling, rounding
  rule, minimum (≥ 1 frame), and whether scenes may omit duration (default
  policy for §18.2). Lua parser; shared vectors; diagnostics for bad input.
- Out: front matter `defaults.scene.duration` wiring (010).

## Deliverables
- `docs/decisions/0003-durations-and-frames.md` (accepted).
- `packages/ir/test-vectors/durations.json`: ≥ 20 cases
  `{ input, fps, frames | errorCode }` incl. fps 24/25/30/60, `1.5s`,
  `0.04s`, `500ms`, `0s`, `-1s`, `4`, `abc`, `1e3s`.
- `_extensions/video/lib/duration.lua` + tests driven by the vectors.
- TS helper in `packages/ir` driven by the same vectors (for later use by
  source ranges).
- DSL reference row for `duration` in `_extensions/video/README.md`.

## Definition of done
Automated:
- [ ] Lua and TS both pass every vector.
- [ ] Invalid durations produce `E_DURATION_*` diagnostics naming the scene.

Human check:
1. In a copy of `tests/fixtures/projects/minimal-filter`, set
   `duration="1.5s"` on scene 1 → `npx video validate <copy> --print-ir`
   shows `"durationFrames": 45`.
2. Set `duration="-1s"` → error naming `scene-001` and the value; exit 1.

## Notes

## Completion log
