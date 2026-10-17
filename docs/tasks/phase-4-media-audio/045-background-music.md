# 045 — Background music

Phase 4 · Status: in-progress · Depends on: 044 · PRD: §7.1, §7.2 · ADR: reads 0009

## Goal

A project-level music track with deterministic start, end, volume and
looping, mixed with any kept footage audio.

## Scope

- In: front matter per ADR-0009 (e.g. `audio.music.src`, `volume`, `loop`,
  `fadeOut`); validation (exists, supported format, short music without
  `loop` → error or documented behaviour); renderer mixing; music ends
  exactly at the video's last frame.
- Out: ducking, multitrack, effects (non-goals).

## Deliverables

- Settings rows in `_extensions/video/README.md`; IR fields.
- Renderer music track; fixtures `music-loop`, `music-short-error`,
  `music-with-keep`.

## Definition of done

Automated:

- [ ] Output audio duration equals video duration (ffprobe).
- [ ] Fade-out: level over the last N frames decreases monotonically.
- [ ] Music + `keep` footage: both present (tone detection at two
      frequencies).
- [ ] Short music without `loop` → documented error.

Human check:

1. Render `tests/fixtures/projects/music-loop` and listen: music starts at
   frame 0, loops seamlessly per the ADR, fades out at the end.

## Notes

- Status stays `in-progress`. (1) Onset compensated: the stitch moves the pre-encoded audio earlier by the AAC encoder delay (`-itsoffset`, 2048 samples at 48 kHz, `renderer/remotion/src/exact-length.ts`). The first audible sample is now at index 1 (was 1882). The strict per-frame fade check still fails, with the same numbers before and after the compensation at frames 122 and 123: before, frame 122 -27.74672 and 123 -27.74609 dB (flat); after, 121 -27.747, 122 -27.746, 123 -28.076 dB (expected -0.32 and -0.33 dB steps). Frames 122, 136, 139 and 142 are not below the previous frame; the gain steps of about 0.3 to 1.8 dB land in uneven blocks (AAC blocks of 1024 samples, about 0.64 frame), so the per-frame levels are not monotone. The check is not changed. A fix needs either a per-frame gain path in Remotion or a decision to resolve the fade at a coarser step. (2) `tests/integration/music.test.ts` is not registered in `test:integration:render`, because the fade assertion fails. (3) Rerun: 5 of 6 pass (duration, start and loop, music with kept footage, short-track error). (4) Human check not run (no listening by a person).
- Done: ADR-0017 (accepted: `audio.music`, IR 1.9 `music`, frame-exact loop and fade, output-length cut). Unit tests pass: filter Lua 273/273, IR 220/220, validator music 14/14, renderer music 9/9 and exact-length 3/3. Music-loop audio is 5.013 s against 5.000 s video after the cut (5.056 s before; the 044 audio-keep output had +58 ms too).
- Version lists in six existing tests now name 1.9, as 5d0e8af did for 1.8.
- Line limits, not trimmed: `_extensions/video/README.md` 121 (was 117), `packages/validator/README.md` 156 (was 153).
- The 044 outputs now end on the last frame too (the cut applies to every render).
- Stray files at the filesystem root from my earlier shell redirects (`/commit1.log`, `/commit2.log`, `/gen.log`, `/lint.log`, `/render-loop.log`, `/val-music-*.json|err`, `/c4.log`, `/r-loop/`). Removal was blocked by the safety check; a person should delete them.
  Phase 4 exit criterion (PRD §15) is met when this task is done.

## Completion log
