# ADR-0003: Duration units, frame rounding, default duration

- Status: accepted
- Date: 2026-10-14
- Task: 009
- PRD: §5.2, §5.3, §8.2, §8.3, §18.2

## Context
PRD §8.2 requires IR times in integer frames and a documented, deterministic
conversion from human-readable durations. PRD §18.2 asks whether every scene
must declare a duration or a global default applies. The filter accepted only
whole seconds (`"<n>s"`, ≥ 1 s), which rejects `1.5s` and `500ms`. Task 010
wires `defaults.scene.duration` from front matter; this ADR fixes the rule it
feeds into. Where the PRD is silent, the more conservative option applies
(AGENT.md, "When the docs are unclear").

## Options
1. **Units.** (a) `s` only; (b) `s` and `ms`; (c) `s`, `ms` and `f` (frames).
   `f` lets authors pick frames, which the PRD never asks for and which ties
   scenes to one fps. Chosen: (b).
2. **Decimals.** (a) whole numbers only; (b) decimals with a bounded fraction.
   Chosen: (b), at most 3 fraction digits, so the value is exact in microseconds.
3. **Rounding.** (a) reject any value that is not a whole number of frames;
   (b) floor; (c) ceiling; (d) round half up. Rejecting `1.5s` at 25 fps
   (37.5 frames) would contradict the author's intent; floor and ceiling bias
   every scene. Chosen: (d), half up, which is exact with integer arithmetic.
4. **Minimum.** (a) clamp to one frame; (b) reject values that round to zero.
   Clamping would silently change a duration the author wrote. Chosen: (b).
5. **Omitted duration.** (a) built-in default (e.g. `4s`); (b) no built-in
   default: an omitted duration is an error until a front-matter default is
   set (task 010). Chosen: (b). A built-in default would hide timing choices
   from authors and makes PRD §5.2's `defaults.scene.duration` meaningless.
6. **Maximum.** (a) none; (b) 3600 s. Without a cap, digit length can overflow
   the arithmetic and a typo can make a multi-hour render. Chosen: (b). This is
   a conservative guess, not a PRD requirement; a human may raise it by ADR.

## Decision
- Form: `<n>s` or `<n>ms`. `<n>` is one or more digits, optionally followed by
  `.` and 1–3 digits. No sign, no leading `.`, no trailing `.`, no spaces, no
  exponent, lowercase units only. Any other form is `E_DURATION_SYNTAX`.
- Sign and magnitude: a value with a leading `-` is `E_DURATION_RANGE`. Zero is
  `E_DURATION_RANGE`. A value above 3600 s is `E_DURATION_RANGE`.
- Conversion: `micros` = the exact duration in microseconds;
  `frames = floor((2 × micros × fps + 1 000 000) / 2 000 000)` (round half up).
- Minimum: a positive value that rounds to 0 frames is `E_DURATION_RANGE`.
- Omitted duration: no built-in default. A `.scene` without `duration` is
  `E_SCENE_NO_DURATION`. Only front matter `defaults.scene.duration` (task 010)
  may supply one.
- Messages name the scene and the value: `Scene "scene-001" has duration
  "-1s", which must be greater than zero.`
- The Lua filter (`_extensions/video/lib/duration.lua`) and the TS helper
  (`packages/ir/src/duration.ts`) implement these rules, and both must pass
  `packages/ir/test-vectors/durations.json`.

## Consequences
- Authors can write `1.5s` and `500ms`. Existing `"<n>s"` documents keep the
  same frame counts.
- Duration messages change wording and name the scene. Tests that pinned the
  old wording are updated. No diagnostic code is added or removed.
- Each decimal duration is an exact rational, so no floating-point drift.
- Authors must write a duration on every scene until task 010 adds defaults.
- Follow-ups: task 010 (front-matter default); task 011 (line numbers in
  messages); a PRD §18.2 status update by a human (the PRD is not edited here).

## Verification
- `npm run test:lua`: `test_duration.lua` (behaviour and each code),
  `test_duration_vectors.lua` (every vector), `test_scenes.lua` (scene id on
  bad durations).
- `npm run check`: `packages/ir/test/duration.test.ts` (every vector).
- `npm run test:integration`: `validate-diagnostics.test.ts` (`1.5s` → 45
  frames in `--print-ir`; `-1s` → `E_DURATION_RANGE` naming `scene-001`).

## References
- PRD §5.2 (`defaults.scene.duration`), §5.3, §8.2 (integer frames, documented
  rule), §8.3 (negative durations fail), §18.2 (open decision, resolved here).
- ADR-0010 (testing policy). Task 009 file, Notes section.
