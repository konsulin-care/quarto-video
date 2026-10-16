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
Phase 4 exit criterion (PRD §15) is met when this task is done.

## Completion log
