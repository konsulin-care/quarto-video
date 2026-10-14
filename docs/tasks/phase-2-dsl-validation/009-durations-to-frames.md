# 009 — Durations → frames

Phase 2 · Status: done · Depends on: 008 · PRD: §5.2, §8.2, §18.2 · ADR: writes 0003

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
- [x] Lua and TS both pass every vector.
  (`_extensions/video/tests/test_duration_vectors.lua`, `packages/ir/test/duration.test.ts`)
- [x] Invalid durations produce `E_DURATION_*` diagnostics naming the scene.
  (`test_duration.lua`, `test_scenes.lua`; `validate-diagnostics.test.ts`: `-1s`, `0s`)

Human check:
1. In a copy of `tests/fixtures/projects/minimal-filter`, set
   `duration="1.5s"` on scene 1 → `npx video validate <copy> --print-ir`
   shows `"durationFrames": 45`.
2. Set `duration="-1s"` → error naming `scene-001` and the value; exit 1.

## Notes
Decisions (ADR-0003, accepted; PRD §18.2 open decision resolved there):
- Units `s` and `ms` only. No `f` (frames) unit: the author picks seconds.
- Decimals: up to 3 fraction digits, no sign, exponent, or leading/trailing `.`.
- Rounding: exact microseconds, round half up. A value that rounds to 0 frames
  is `E_DURATION_RANGE` (no silent clamp).
- Minimum: one frame. Zero and negative: `E_DURATION_RANGE`.
- Maximum 3600 s. This cap is a conservative guess that prevents overflow;
  it is not a PRD requirement. A human may change it by ADR.
- Omitted duration: no built-in default; `E_SCENE_NO_DURATION` until task 010
  supplies `defaults.scene.duration`.
- Messages name the scene and value. Existing messages changed wording
  (`must be whole seconds` → `which must be a number of seconds or milliseconds`;
  `must be at least 1s` → `must be greater than zero`). No code added or removed.
- Test fixtures and expectations that pinned `1.5s` as an error now use
  `"2 seconds"`, which is still invalid.

## Completion log
- 2026-10-14 · Implemented durations → frames. `"<n>s"` and `"<n>ms"` with up to
  3 decimals, exact and rounded half up; zero, negative, > 3600 s, and values
  under one frame are `E_DURATION_RANGE`; bad forms are `E_DURATION_SYNTAX`.
  Shared vectors (34 cases, incl. fps 24/25/30/60) in `packages/ir/test-vectors/durations.json`.
  Files: `_extensions/video/lib/duration.lua`, `packages/ir/src/duration.ts`,
  ADR-0003, DSL and README rows updated.
  Tests: `_extensions/video/tests/test_duration.lua`, `test_duration_vectors.lua`,
  `test_scenes.lua` (bad duration keeps scene id); `packages/ir/test/duration.test.ts`;
  `tests/integration/validate-diagnostics.test.ts` (`1.5s` → 45 frames via
  `--print-ir`; `-1s` → E_DURATION_RANGE naming scene-001); `quarto-render.test.ts`
  (new wording).
  Human checks (pending, not run by the agent): 1. copy of `minimal-filter` with
  `duration="1.5s"` shows `"durationFrames": 45` in `--print-ir`; 2. `duration="-1s"`
  gives an error naming `scene-001` and `-1s`, exit 1. Automated equivalents above.
- Follow-ups: task 010 (front-matter default, the only source of an inherited
  duration); task 011 (line numbers in messages); a human to confirm the 3600 s cap
  and to update PRD §18.2 status (the PRD is not edited by agents).
