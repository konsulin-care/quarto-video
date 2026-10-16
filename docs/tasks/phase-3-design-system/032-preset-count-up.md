# 032 — Preset `count-up`

Phase 3 · Status: done · Depends on: 031 · PRD: §5.6, §12 · ADR: —

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
- [x] Deterministic: same frame → same output (property test). `renderer/remotion/test/count-up.test.ts`.
- [x] Displayed value is monotonic and equals `value` on the final frame. `count-up.test.ts`.
- [x] Used on a non-statistic component → incompatibility error. `packages/validator/test/animation.test.ts`, `tests/integration/preset-count-up.test.ts`.
- [x] Flash-rate check (task 023) passes. `tests/visual/flash-presets.test.ts` (both count-up projects).

Human check:
1. `npx video render tests/fixtures/projects/preset-count-up` and watch: motion
   is smooth, readable, and ends before the scene does.
2. Set `video.reducedMotion: true` and render again: the documented reduced
   behaviour is shown.

## Notes
- Schedule: the count runs from 0 at frame 0 to `value` at ceil(0.7 × duration), ease-out cubic; `value` is exact from then on, formatted by `formatNumber`. The scene style is `{}`; `AnimatedScene` provides `CountMotionContext` and the statistic draws the counted value.
- The statistic's font size comes from the final text, so the number keeps its size while it counts. A negative value counts down; "monotonic" means towards `value`.
- minFrames 45 (1.5 s): statistic scenes of 1 to 1.5 s are static (fixture scene 3).
- Incompatibility was already reachable through the existing stage 2 path (`title` lists fade-in, reveal, slide-up only); no validator change.
- Fixtures are 1280x720. At 640x360 the statistic's number overflows the frame (top and bottom clipped): a pre-existing layout limit, not fitted by the statistic (follow-up).
- Visual: 14 references across 2 cases, each frame viewed before approval; existing `statistic-*` references unchanged.
- Disk: the first full run hit ENOSPC because the renderer leaves `remotion-webpack-bundle-*` (about 30 MB each) in `/tmp` (731 dirs, 19 GB). Removed by hand; the final run passed.
- Awaiting human playback: watching `preset-count-up` and `reduced-motion-count-up` in motion (human checks 1 and 2). Stills and contact sheets were checked by reading only.

## Completion log
### 2026-10-15 — done
- Summary: `count-up` released for `statistic`: registry `animations/count-up.json` (statistic only, 45-frame minimum, static short-scene and reduced-motion rules); `statistic.json` lists it; renderer `animations/count-up.ts` (schedule), `count-motion.ts` (context), `AnimatedScene` provider, `Statistic.tsx` draws the counted value with `formatNumber`; docs in `docs/components/README.md`, `statistic.md`, and the registry, renderer and tests READMEs.
- Tests: `renderer/remotion/test/count-up.test.ts` (15: schedule, exact and formatted final value, monotone toward value, determinism over seeded values, reduced and short scenes); `packages/registry/test/count-up.test.ts`; `packages/validator/test/animation.test.ts` (count-up on title is E_ANIMATION_INCOMPATIBLE); `tests/integration/preset-count-up.test.ts`; `tests/visual/flash-presets.test.ts` (both projects); visual `count-up-basic` and `count-up-reduced-motion` (start 0, middle 20/110, first exact frame 63, end 89/179, short scene 195).
- Gates (final state): `scripts/check.sh --all` exit 0, "check: passed (all)". `scripts/test.sh --all` exit 0, "test: passed (scripts unit lua integration visual)". Logs: `scratchpad/count-up-check.log`, `scratchpad/count-up-test.log`. Flash check: 10 of 10. No test hit the 5 s timeout.
- Human check 1: `video render tests/fixtures/projects/preset-count-up` exit 0 (1280x720, 30 fps, 210 frames). Contact sheet every 10 frames: the count rises smoothly from 0, holds 1,234 from about frame 63, scene 2 reaches -$3.5M by about frame 153, the short scene shows 98.5%. Nothing clipped. Output MP4 removed.
- Human check 2: `reduced-motion-count-up` render exit 0; every scene shows its final value from its first frame. Output MP4 removed.
- Awaiting human playback: watching both renders in motion.
- Follow-ups for a human: (1) the statistic does not fit its height, so 640x360 clips (Notes); (2) the renderer leaves Remotion bundles in `/tmp` (about 30 MB per render), which filled the disk; (3) the 1 to 1.5 s static threshold (minFrames 45) and the 70% settle share are conservative choices to confirm.
