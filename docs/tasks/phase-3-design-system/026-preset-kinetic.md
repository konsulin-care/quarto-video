# 026 — Preset `kinetic`

Phase 3 · Status: todo · Depends on: 025 · PRD: §5.6, §12 · ADR: —

## Goal
Release the `kinetic` animation preset: word-by-word kinetic typography for short statements.

## Scope
- In: compatible with `statement` (and `title` if it reads well); words revealed on a deterministic schedule derived from durationFrames; max words before fallback to `fade-in` documented.
- Out: changes to the preset framework (021).

## Deliverables
- `packages/registry/animations/kinetic.json` (purpose, compatible components,
  min frames, short-scene fallback, reduced-motion rule).
- `renderer/remotion/animations/kinetic.ts` + unit tests of its schedule.
- Visual cases at start, middle and end frames, normal and reduced motion.
- Entry in the presets section of `docs/components/README.md`.

## Definition of done
Automated:
- [ ] Deterministic: same frame → same output (property test).
- [ ] Every word is fully visible from 80 % of the scene onward.
- [ ] A 40-word statement triggers the documented fallback (warning).
- [ ] Flash-rate check (task 023) passes.

Human check:
1. `npx video render tests/fixtures/projects/preset-kinetic` and watch: motion
   is smooth, readable, and ends before the scene does.
2. Set `video.reducedMotion: true` and render again: the documented reduced
   behaviour is shown.

## Notes

## Completion log
