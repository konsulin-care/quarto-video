# ADR-0009: Audio architecture: source audio policy and IR 1.8

- Status: accepted
- Date: 2026-10-16
- Task: 044
- PRD: §6.2, §7, §13.1, §18.6

## Context
PRD §7.2 requires audio behaviour to be explicit (never inferred from whether a
source has an audio stream), muted footage to be silent, and the renderer to define
how audio is trimmed, looped, mixed and ended. PRD §18.6 asks whether project-wide
tracks get a separate top-level timeline section or whether the first version stays
with simpler policies. Background music is task 045, which needs that answer; source
audio is this task. Until now `.video` accepts only `audio="mute"` (task 038). The
renderer mutes every footage clip (task 039), so no audio reaches the output.

## Options
1. **Policy on each media item, no audio section** (chosen for source audio). Each
   `.video` block states `audio="mute"` or `audio="keep"`; the audio of a kept clip
   is that block's source range, on its scene's timeline.
2. **Separate top-level audio timeline now.** Rejected for this task: no release
   needs a track that is not tied to footage, and it would add a second clock to
   check against the scenes before 045 needs one.
3. **Infer keep from the file.** Rejected by PRD §7.2.

## Decision
1. **Policy.** `audio` is required on every `.video` block (E_VIDEO_AUDIO_REQUIRED,
   unchanged). `mute`: the footage contributes no sound. `keep`: its source audio plays.
2. **Volume.** `volume` is a decimal linear gain on the source samples, `0 < volume <= 1`,
   written without a unit (`volume="0.5"`, about -6 dB). Default `1`. It is valid only
   with `keep`; with `mute` it is E_VIDEO_BLOCK. Outside the range it is E_VIDEO_VOLUME.
   Above 1 is refused: the policy never boosts a source.
3. **Trim and rate.** Kept audio is the same source range as the picture: from
   `sourceStart` to `sourceEnd` (or the file's end), in source frames at the project fps.
   `keep` requires `playbackRate="1"`; any other rate is E_AUDIO_RATE. Audio is never
   resampled, stretched or pitch-shifted, so exact sync is kept.
4. **Loop.** The range repeats in step with the picture: each repetition starts at
   `sourceStart` on the scene frame where the picture restarts.
5. **Freeze.** The range plays once. After its end the picture holds and the audio is
   silent. No sound is repeated to fill a hold.
6. **End.** Kept audio stops at the scene's last frame. No audio belongs to a scene
   outside its `durationFrames`.
7. **Transitions.** Audio follows the scene timeline, as video does. Where a transition
   overlaps two scenes, both are audible for the overlap's `L` frames with a linear
   crossfade: the incoming scene's gain is `volume x (k+1)/L`, the outgoing scene's is
   `volume x (L-k-1)/L`, where `k` is the frame index in the overlap. A `cut` has no
   overlap. The crossfade is the only place where output differs from `volume` exactly.
8. **Mixing.** The output is the sum of every kept clip's gain-scaled samples. No
   normalisation and no limiter. Two clips that peak together can clip; authors keep
   volumes low. If no scene keeps audio, the MP4 has no audio stream (as before).
9. **Validation.** `E_AUDIO_NO_STREAM` (stage 3): `keep` on a file whose probe has no
   audio stream. `E_AUDIO_RATE` and `E_VIDEO_VOLUME` are filter errors (the author's
   attributes). Each is an error, never a silent approximation.
10. **IR 1.8** (`schema/ir-1.8.json`, additive under ADR-0007). A media item's `audio` may
    be `keep` as well as `mute`; a `keep` item has `volume` (`0 < volume <= 1`, a number),
    and a `mute` item has none. The filter writes 1.8 only for a manifest with a kept
    clip; other manifests keep their version (1.6 or 1.7).
11. **Renderer.** Each scene mounts a source-audio component for its `keep` items,
    whatever component draws the picture. Audio is a `<Audio>` per repetition, trimmed to
    the source range; the picture stays muted.
12. **Project-wide tracks.** Not represented in IR 1.8. PRD §18.6 is answered for source
    audio here. Task 045 decides how music is represented, in its own ADR.

## Consequences
- An author chooses audio on every clip; mute is never implied.
- Looping and freezing have a defined sound, so no hidden stretch or silent filler.
- The crossfade is a policy the author cannot switch off; a later option needs an ADR.
- Audio is exact to the frame boundary, not to the sample: edits fall on frame edges.
- Only the first audio stream of a file is used, as ffprobe and the renderer both choose it.

## Verification
- `packages/ir/test/v18.test.ts`, `frozen.test.ts` (1.8 hash): `keep` needs `volume`, `mute`
  forbids it, `volume` range.
- `_extensions/video/tests/test_media.lua`: `keep` with `volume`, `volume` range, `volume` on
  `mute`, `keep` with a rate other than 1.
- `packages/validator/test/audio.test.ts`: E_AUDIO_NO_STREAM with a stub prober.
- `renderer/remotion/test/source-audio.test.ts`: repetitions, trim, end, freeze and ramp (pure).
- `tests/integration/audio-policy.test.ts`: `audio-mute` silent and `audio-keep` at -18 dB ±1
  in its scene only, through `volumedetect`; `audio-keep-silent-source` is E_AUDIO_NO_STREAM.

## References
- PRD §6.2, §7.1, §7.2, §13.1, §18.6.
- ADR-0005 (transition overlap), ADR-0007 (additive minors), ADR-0008 (probe and cache),
  ADR-0016 (region footage, IR 1.7).
