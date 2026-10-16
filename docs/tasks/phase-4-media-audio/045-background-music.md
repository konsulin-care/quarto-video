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

- Status stays `in-progress`: not every Automated box is verified. Missing: (1) the fade-out check fails between frames 122 and 123 (flat to 0.001 dB; the 0.3 dB step is not visible in the per-frame RMS, so the measure or the AAC path needs a look); (2) `tests/integration/music.test.ts` is not yet in the `test:integration:render` list in `package.json`; (3) `mise run check` and `mise run test` have not run to completion on the final tree; (4) no Human check.
- Done: ADR-0017 (accepted: `audio.music`, IR 1.9 `music`, frame-exact loop and fade, output-length cut). Unit tests pass: filter Lua 273/273, IR 220/220 (v19 and the 1.9 version lists), validator music 14/14, renderer music 9/9 and exact-length 3/3. Measured on a fresh render: music-loop audio 5.013 s against 5.000 s video (after the cut; 5.056 s before it, which the 044 audio-keep output also had).
- Version lists in six existing tests now name 1.9, as 5d0e8af did for 1.8.
- Line limits, not trimmed: `_extensions/video/README.md` 121 (was 117), `packages/validator/README.md` 156 (was 153).
- The 044 outputs now end on the last frame too (the cut applies to every render).
- Stray files at the filesystem root from my earlier shell redirects (`/commit1.log`, `/commit2.log`, `/gen.log`, `/lint.log`, `/render-loop.log`, `/val-music-*.json|err`, `/c4.log`, `/r-loop/`). Removal was blocked by the safety check; a person should delete them.
  Phase 4 exit criterion (PRD §15) is met when this task is done.

## Completion log
