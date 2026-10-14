# 032 — Preset `count-up`

Phase 3 · Status: todo · Depends on: 031 · PRD: §5.6, §12 · ADR: —

## Goal
Release the `count-up` animation preset: animated count from zero to a statistic's value.

## Scope
- In: compatible with `statistic` only; easing fixed; final value shown exactly (formatted) from the documented frame onward; reduced-motion = static final value.
- Out: changes to the preset framework (021).

## Deliverables
- `packages/registry/animations/count-up.json` (purpose, compatible components,
  min frames, short-scene fallback, reduced-motion rule).
- `renderer/remotion/animations/count-up.ts` + unit tests of its schedule.
- Visual cases at start, middle and end frames, normal and reduced motion.
- Entry in the presets section of `docs/components/README.md`.

## Definition of done
Automated:
- [ ] Deterministic: same frame → same output (property test).
- [ ] Displayed value is monotonic and equals `value` on the final frame.
- [ ] Used on a non-statistic component → incompatibility error.
- [ ] Flash-rate check (task 023) passes.

Human check:
1. `npx video render tests/fixtures/projects/preset-count-up` and watch: motion
   is smooth, readable, and ends before the scene does.
2. Set `video.reducedMotion: true` and render again: the documented reduced
   behaviour is shown.

## Notes

## Completion log
