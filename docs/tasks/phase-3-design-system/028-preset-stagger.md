# 028 — Preset `stagger`

Phase 3 · Status: in-progress · Depends on: 027 · PRD: §5.6, §12 · ADR: —

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
- [ ] Deterministic: same frame → same output (property test).
- [ ] Last item is fully visible by 70 % of the scene for 2–6 items.
- [ ] Item order on screen equals document order.
- [ ] Flash-rate check (task 023) passes.

Human check:
1. `npx video render tests/fixtures/projects/preset-stagger` and watch: motion
   is smooth, readable, and ends before the scene does.
2. Set `video.reducedMotion: true` and render again: the documented reduced
   behaviour is shown.

## Notes

## Completion log
