# ADR-0020: Scene exit and animation window in IR 1.12

- Status: accepted
- Date: 2026-10-19
- Task: none (stage 1 of the hello-world and sub-second scene work; no docs/tasks entry)
- PRD: §5.6, §8.2, §12

## Context
Scenes shorter than 1 s are valid (the component floor is now 100 ms, commit
e2d02a2). The entrance rule (ADR-0011, the first third of the scene, at most
30 frames) cannot be tuned per scene, and a scene has no way to leave: the
hello-world video needs a 0.5 s fade-in on its first scene and a 0.5 s fade-out
on its last. IR 1.11 is frozen and has no field for either. The entrance keeps
the name `animation`; the exit needs its own attribute, and both windows need a
length an author can set. Times in the IR are integer frames (ADR-0003).

## Options
1. **`exit` as a sibling of `animation`, plus `animationDuration` (chosen).**
   `exit="fade-out"` names an exit-role preset; `animationDuration="500ms"` sets
   the window of the entrance and/or the exit. IR 1.12 adds `exit: {name}` and
   `animationDurationFrames`.
2. **`exit` overloads `animation`** (for example `animation="fade-in,fade-out"`).
   Rejected: one attribute would carry two presets and two windows, the grammar
   of the existing name check would change, and an old manifest's meaning would
   change under the same key.
3. **A video-level fade setting** (`video.fade: 500ms` in front matter, applied
   to every scene). Rejected: it cannot say "fade in the first scene only and
   fade out the last", which is the hello-world case, and it is not a scene
   attribute, so the validator cannot check it against a scene's length.
4. **Window timing.** Three ways to length a window were weighed:
   (a) a fixed length per preset in the registry (no author choice);
   (b) the scene-relative rule alone (a third of the scene, at most 30 frames),
   applied to the exit too; (c) an explicit `animationDuration`, with (b) as the
   default. Chosen: (c), because (b) alone cannot give the hello-world 0.5 s
   windows in a 2 s scene, and (a) fixes a length the author cannot see in the source.

## Decision
- IR 1.12 (`schema/ir-1.12.json`) is IR 1.11 plus two optional scene fields:
  `exit: {name}` (the animation object shape) and `animationDurationFrames`
  (integer, at least 1). Nothing else changes; `ir-1.11.json` stays frozen.
- The filter writes 1.12 when a scene has an `exit` or an `animationDuration`,
  and every other manifest keeps the version it had (ADR-0007).
- Registry presets gain two required fields (`schema/animation.json`):
  `role` (`entrance` or `exit`) and `windowed` (true when the preset runs over
  one window that `animationDuration` sets). `fade-out` is `role: exit`,
  `windowed: true`, with the same compatible components as `fade-in`.
  `kinetic`, `stagger` and `count-up` keep their own schedules: `windowed: false`.
- Windows. Entrance and exit each last `animationDurationFrames`, or the default
  `enterFrames(D)` (ADR-0011) when absent. The exit occupies the scene's last W
  frames: opacity 1 on its first frame, 0 on the scene's last frame, the entrance
  curve reversed in time (`renderer/remotion/animations/curve.ts`). Both windows
  are a pure function of the frame.
- Rules, checked by the validator (stage 2, `E_ANIMATION_DURATION`): an
  `animationDuration` needs an `animation` or an `exit`; a non-windowed preset
  rejects it; it is at most the scene's length; with both presets, two windows
  fit in the scene (2 × W ≤ D). The filter checks the syntax and the
  "no animation or exit" case; a duration that rounds to no frame is `E_DURATION_RANGE`.
- Roles: `exit` names an exit preset and `animation` an entrance one; using the
  wrong role is `E_ANIMATION_UNKNOWN` with the attribute to use instead.
- Reduced motion (`settings.reducedMotion`): `fade-out`'s rule is `static`, so an
  exit draws the scene at full opacity, with no fade (ADR-0012). A scene shorter
  than `minFrames` (15) is drawn as it is, the same rule as the entrances.

## Consequences
- Every 1.11 manifest is still valid and unchanged. A 1.11 manifest with `exit`
  or `animationDurationFrames` is rejected, as the frozen schema requires.
- Consumers that read `animation` (validator, renderer) read `exit` the same way;
  `kinetic` and the other scheduled presets are unchanged.
- The component compatibility lists gain `fade-out` wherever `fade-in` is
  (the registry links both ways). Entrance messages list entrances only.
- A short scene (under 15 frames) with an exit shows no fade. This is the
  `static` rule, not a bug: a fade over fewer frames than the minimum would flash.
- Open for a human: whether presets other than the shared-window ones (`fade-in`,
  `slide-up`, `reveal`, `fade-out`) should take an animationDuration later. Not in 1.12.

## Verification
- `packages/ir/test/v112.test.ts`: the example validates; `exit` and
  `animationDurationFrames` shapes and bounds; a 1.11 manifest with either is rejected.
  `packages/ir/test/frozen.test.ts`: `ir-1.12.json` hash.
- `packages/registry/test/animations.test.ts`: `role` of each preset, and a
  preset without `role` or with another role is rejected.
- `packages/validator/test/exit-window.test.ts`: exit names, roles, compatibility;
  window bounds, overlap, non-windowed presets. `codes.test.ts`: `E_ANIMATION_DURATION` in the README.
- `_extensions/video/tests/test_animations.lua`: exit and window records, the
  diagnostics, and the IR 1.12 version (`lua pandoc` suite).
- `renderer/remotion/test/exit-window.test.ts`: fade-out curve, window length,
  short and reduced scenes, combined opacity. `animation-parity.test.ts`: the
  entrance and exit tables match the registry roles. Visual: `animations-exit`
  (the start, the entrance end, both window edges and each scene's last frame).
- `tests/integration/contract.test.ts`: `contract-exit-valid` passes stage 2;
  `contract-exit-invalid` yields one error per rule on its own scene.
- `videos/hello-world`: `video validate`, `video render` and `quarto render` (150
  frames, 1000 x 1000, 5.0 s); frames checked at 0.067, 0.25, 0.75, 1.25, 4.25 and 4.9 s.

## References
- ADR-0003 (durations, frames), ADR-0005 (transitions, the attribute pattern),
  ADR-0007 (versioning), ADR-0011 (animation attribute, IR 1.1), ADR-0012 (reduced motion).
