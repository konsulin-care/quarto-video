# 026 — Preset `kinetic`

Phase 3 · Status: done · Depends on: 025 · PRD: §5.6, §12 · ADR: —

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
- [x] Deterministic: same frame → same output (property test). `renderer/remotion/test/kinetic.test.ts`.
- [x] Every word is fully visible from 80 % of the scene onward. `renderer/remotion/test/kinetic.test.ts`.
- [x] A 40-word statement triggers the documented fallback (warning). `packages/validator/test/kinetic.test.ts`; `tests/integration/preset-kinetic.test.ts` (`kinetic-fallback`).
- [x] Flash-rate check (task 023) passes. `tests/visual/flash-presets.test.ts` (`preset-kinetic`, `reduced-motion-kinetic`).

Human check:
1. `npx video render tests/fixtures/projects/preset-kinetic` and watch: motion
   is smooth, readable, and ends before the scene does.
2. Set `video.reducedMotion: true` and render again: the documented reduced
   behaviour is shown.

## Notes
- Per-word motion: the preset API moves the whole scene, so kinetic's scene style is `{}`. The words move through `WordMotionContext` (set by AnimatedScene for `kinetic`), styled by `statement`. The framework (021) is unchanged.
- Compatibility: `statement` only. `title` is not supported (conservative; the component would need its own word drawing).
- Word limit 12 (`KINETIC_MAX_WORDS`, registry `src/kinetic.ts`): more words fall back to `fade-in` in the renderer (`effectiveAnimation`) and warn `W_ANIMATION_FALLBACK` (new code, validator stage 2). Chosen for readability (conservative); a human may want a different value.
- Timing: minFrames 30 (equals the statement's 1 s minimum, so the short-scene static branch is reached by unit tests only). Word enter 6 frames; all words in place by ceil(0.8 * D).
- Existing tests used `kinetic` as the unknown-preset example. Renamed to `spin` (the assertions are unchanged; the known-list text now includes kinetic): `packages/registry/test/animations.test.ts`, `packages/validator/test/animation.test.ts`, `renderer/remotion/test/animation-curves.test.ts`, fixture `contract-animation-unknown`.
- `reduced-motion.test.ts`: the "still moves" check skips kinetic, because its motion is per word; `kinetic.test.ts` checks it.
- Fixture `kinetic-fallback` also yields W_TEXT_FIT (40 words at 640x360 does not fit); expected.json lists both.
- Human check 2 would use a scratch copy with `reducedMotion: true`; the reduced fixture is `reduced-motion-kinetic`.
- Awaiting human playback: Human check 1 (watch the render in motion) and check 2 (reduced render). Stills are checked by reading only.
- Pre-existing: `packages/validator/README.md` was 116 lines before this task (cap is 100); now 117 with the W_ANIMATION_FALLBACK row. Not restructured here.
- Fixture text: the 1 s scene of `preset-kinetic` still animates (1 s equals minFrames 30); its text no longer claims otherwise.

## Completion log
- 2026-10-15: kinetic released. Gates: `scripts/check.sh --all` exit 0 ("check: passed"); `scripts/test.sh --all` exit 0 (log in scratchpad `kinetic-test.log`, `test: passed`); `npm run test:visual` exit 0 (186 frames, log `visual-full.log`). `renderer/remotion/test/kinetic.test.ts` alone: 22 tests in 1.2 s, slowest 0.7 s, under the 5 s timeout. Flash check: both kinetic projects pass.
- Human check 1: `video render tests/fixtures/projects/preset-kinetic` exit 0; sampled stills show words in turn, all in place by frame 72 of 90, nothing clipped. Human check 2: `reduced-motion-kinetic` renders the full statement from frame 0. Output MP4s removed.
- Awaiting human playback: watching both renders in motion (human check 1 and 2).
- Follow-up for a human: the word limit (12) is a conservative choice; confirm or change `KINETIC_MAX_WORDS`.
