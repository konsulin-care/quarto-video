# 028 — Preset `stagger`

Phase 3 · Status: done · Depends on: 027 · PRD: §5.6, §12 · ADR: —

## Goal
Release the `stagger` animation preset: sequential reveal of list items.

## Scope
- In: compatible with `bullets` (and `end-card` credits); per-item delay computed from item count and durationFrames; reduced-motion = all items fade together.
- Out: changes to the preset framework (021).

## Deliverables
- `packages/registry/animations/stagger.json` (purpose, compatible components,
  min frames, short-scene fallback, reduced-motion rule).
- `renderer/remotion/animations/stagger.ts` + unit tests of its schedule.
- Visual cases at start, middle and end frames, normal and reduced motion.
- Entry in the presets section of `docs/components/README.md`.

## Definition of done
Automated:
- [x] Deterministic: same frame → same output (property test). `renderer/remotion/test/stagger.test.ts`; `animation-curves.test.ts` (every preset).
- [x] Last item is fully visible by 70 % of the scene for 2–6 items. `renderer/remotion/test/stagger.test.ts`.
- [x] Item order on screen equals document order. `renderer/remotion/test/stagger.test.ts` (start order; opacity never rises for a later item at any frame).
- [x] Flash-rate check (task 023) passes. `tests/visual/flash-presets.test.ts` (`preset-stagger`, `reduced-motion-stagger`).
- [x] Compatible components: `bullets` and `end-card` only. `packages/registry/test/stagger.test.ts`; `tests/integration/preset-stagger.test.ts` (a statement is `E_ANIMATION_INCOMPATIBLE`).

Human check:
1. `npx video render tests/fixtures/projects/preset-stagger` and watch: motion
   is smooth, readable, and ends before the scene does.
2. Set `video.reducedMotion: true` and render again: the documented reduced
   behaviour is shown.

## Notes
- Reduced motion is static (all items in place from frame 0), not a fade. The task scope says "all items fade together", but the registry schema allows only `static` for `reducedMotion` (task 021 contract), and PRD §12 does not define it. A fade needs a schema change to the framework, which is out of scope, so the conservative rule was kept. A human decides whether to extend the schema (for example `fade`).
- Timing: minFrames 45 (1.5 s), not 30, so the short-scene fallback is reached by real bullets scenes (bullets allow 1 s). Each item fades over 9 frames; the schedule is kinetic's with 70 % and 9 frames.
- Framework: `AnimatedScene` provides `StaggerMotionContext` for `stagger`, as it does `WordMotionContext` for `kinetic`. The preset API (021) is unchanged.
- Renderer: `bullets` rows and `end-card` credit lines take their item style. Other parts of the scene (heading, message, call to action) are drawn from frame 0. Without stagger, both components draw exactly as before (visual references unchanged).
- Tests edited (additive): `reduced-motion.test.ts` (END_STATE and the "still moves" filter skip stagger, as for kinetic); the preset-list expectations in `packages/registry/test/animations.test.ts`, `packages/validator/test/animation.test.ts` and `renderer/remotion/test/animation-curves.test.ts`.
- Pre-existing layout limits found while writing fixtures (not changed here): at 640x360 a bullets list with a heading and four points overflows the frame, and a two-line end-card message overlaps the credits. The fixture is sized to avoid both. A follow-up could fix these layouts.
- Validator README: no change (no validator logic changed). Its line count is unchanged.
- Awaiting human playback: Human check 1 (watch `preset-stagger` in motion) and check 2 (watch `reduced-motion-stagger`). Stills were checked by reading only.

## Completion log
- 2026-10-15: `stagger` released: contract `packages/registry/animations/stagger.json` (bullets and end-card; 45-frame minimum; static short scene and reduced motion); renderer schedule `renderer/remotion/animations/stagger.ts` (9-frame item entrance, all in place by 70 %); `bullets` rows and `end-card` credit lines styled per item; docs row and component notes.
- Tests: `renderer/remotion/test/stagger.test.ts` (determinism, last item in place by 70 % for 2 to 6 items, document order on screen, reduced and short scenes static, schedule depends on count and length); `packages/registry/test/stagger.test.ts` (compatible components); `tests/integration/preset-stagger.test.ts` (both fixtures validate; stagger on a statement is E_ANIMATION_INCOMPATIBLE); `tests/visual/flash-presets.test.ts` (both stagger projects); visual `stagger-basic` and `stagger-reduced-motion` (frames 0, 20, 89, 90, 105, 179, 195); 14 references viewed before approval.
- Gates: `scripts/check.sh --all` exit 0 (`check: passed (all)`, log `scratchpad/stagger-check.log`). `scripts/test.sh --all` EXIT=0 (`test: passed`, log `scratchpad/stagger-test.log`; visual 200 frames; flash 9 of 9). The first gate run failed on the end-card contract test, which pins the animation list; fixed in its own commit. `stagger.test.ts` alone: 13 tests, 1.1 s; no timeouts in the log.
- Human check 1: `video render tests/fixtures/projects/preset-stagger` exit 0 (640x360, 30 fps, 210 frames). A contact sheet every 9 frames shows each bullet in order, all in place by frame 63, the credits one line at a time, and nothing clipped. Output MP4 removed.
- Human check 2: `reduced-motion-stagger` render exit 0; the full list and all credits are shown from the first frame. Output MP4 removed.
- Awaiting human playback: watching both renders in motion (human checks 1 and 2). Stills were checked by reading only.
- Follow-ups for a human: (1) reduced motion is static, not a fade; decide whether to extend the registry schema (see Notes); (2) bullets and end-card layouts overflow or overlap at 640x360 with long content (Notes); (3) fixture budget: `preset-stagger` must stay at its current content to keep the visual references valid.
