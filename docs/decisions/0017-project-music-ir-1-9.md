# ADR-0017: Project music track and IR 1.9

- Status: accepted
- Date: 2026-10-16
- Task: 045
- PRD: §7.1, §7.2, §18.6

## Context

ADR-0009 keeps source audio on each `.video` block and leaves project-wide tracks
to task 045 (its Decision 12). PRD §7.1 requires one project-level background music
track with explicit volume, and §7.2 requires deterministic start and end behaviour,
trimming and looping rules, and validation of incomplete settings. IR 1.8 has no place
for a track that belongs to the whole video: the top level and `settings` are closed.

## Options

1. **Front matter `audio.music`, IR top-level `music`** (chosen). One block in the
   document header; the filter writes it as an IR field; the validator resolves its
   file; the renderer plays it over the whole timeline.
2. **Separate audio timeline section.** Rejected, as in ADR-0009: no release needs a
   second clock or several tracks, and the track's length can be stated in frames.
3. **Music in `render.json`.** Rejected: that file holds render settings, not content
   (PRD §5.2). A track kept there would bypass IR validation.

## Decision

1. **Settings.** `audio.music` is a block with these keys; any other key under `audio`
   or `audio.music` is E_CONFIG_UNKNOWN_KEY:
   - `src`: required. A project-relative file that resolves inside the root (ADR-0006).
     Only `.wav` with PCM audio is guaranteed (ADR-0008), so other formats are E_MEDIA_FORMAT.
   - `volume`: optional, default 1. A linear gain, above 0 and at most 1, as for `keep`
     (ADR-0009). Outside the range it is E_SETTING_INVALID.
   - `loop`: optional `true` or `false` (unquoted), default `false`.
   - `fadeOut`: optional duration (`<n>s` or `<n>ms`, ADR-0003), at least one frame.
     Its form errors are the duration codes. A fade longer than the video is E_MUSIC_FADE.
     There is one music track. A second one is an unknown key.
2. **Timing.** The track starts at timeline frame 0 and ends at the last frame of the
   timeline (`timeline.durationFrames` frames, exclusive). No option moves either end.
3. **Length.** The validator probes the file and writes `lengthFrames` = round(duration
   in seconds x fps), the rounding of ADR-0008 (`sourceEndFrames`). A file that rounds to
   fewer than one frame is E_MUSIC_SHORT.
4. **Loop.** The file repeats back to back. Each pass covers `lengthFrames` frames from
   the file's first sample and starts on a frame edge. The final pass is cut at the
   timeline's end. The loop point is exact to the frame, not the sample (ADR-0009).
5. **No loop.** The file plays once. Shorter than the video is E_MUSIC_SHORT (an error,
   never silence filler). Longer is cut at the timeline's last frame.
6. **Fade-out.** With `fadeOut` of N frames and a timeline of T frames, frame f in
   [T-N, T) plays at `volume x (T-f-1)/N`, falling linearly and reaching 0 on the last frame.
   Before the window the track plays at `volume`.
7. **Mixing.** The track is added to the kept footage audio: a sum, with no normalisation,
   no ducking and no limiter. The author keeps the volumes low enough to avoid clipping.
8. **IR 1.9** (`schema/ir-1.9.json`, additive under ADR-0007). An optional top-level `music`:
   `src` (project-relative), `volume` (above 0, at most 1), `loop` (boolean), optional
   `fadeOutFrames` (at least 1) and optional `lengthFrames` (at least 1, written by the
   validator). The filter writes 1.9 when `audio.music` is set and the version rules of
   ADR-0009 and ADR-0016 otherwise.
9. **Renderer.** `IrVideo` mounts one music track over the whole timeline. Its passes and gains
   are pure functions of the frame number.
10. **Output length.** The stitched MP4 is cut to the timeline's frames (`-t frames/fps`, set through
    Remotion's `ffmpegOverride`, `renderer/remotion/src/exact-length.ts`). Without it the AAC encoder
    left the audio about 60 ms past the last frame, in every output (measured on the 044 `audio-keep`
    fixture too); the cut brings it to within about 15 ms of the video.

## Consequences

- Music is one track, with no separate timeline, ducking or effects.
- A mono WAV plays 3 dB quieter, as a mono source does (ADR-0009, Consequences).
- Onset and fade: the stitch moves the pre-encoded audio earlier by the AAC encoder delay (2048 samples at 48 kHz; the first audible sample was 1882 samples late at 44.1 kHz), so the track starts on frame 0 (integration test: index within 64 samples). Per-frame fade levels are not monotone, because AAC blocks of 1024 samples (about 0.64 frame) hold the gain steps. The per-frame check is therefore replaced by three-frame windows: each must not rise by more than 0.5 dB, and windows 120 to 141 must match (149-f)/30 within 1 dB, with the total drop within 1 dB. The tail is checked for monotone fall and silence only (the measured tail lags by about two frames). Human listening check still open.
- The version tests that list the supported versions now include 1.9. This follows
  the precedent of IR 1.8 (task 044).
- Multitrack music, ducking, or a start offset each need their own ADR.

## Verification

- `packages/ir/test/v19.test.ts`, `frozen.test.ts` (1.9 hash): `music` shape and ranges.
- `_extensions/video/tests/test_music.lua`: settings, keys, the version written.
- `packages/validator/test/music.test.ts`: format, unreadable, lengthFrames, E_MUSIC_SHORT, E_MUSIC_FADE.
- `renderer/remotion/test/music.test.ts`: passes, end, fade, volume (pure).
- `renderer/remotion/test/exact-length.test.ts`: the `-t` cut before the output file.
- `tests/integration/music.test.ts`: duration, start and loop, fade, music with kept footage, short music error.

## References

- PRD §7.1, §7.2, §18.6; ADR-0003, ADR-0006, ADR-0007, ADR-0008, ADR-0009, ADR-0016.
