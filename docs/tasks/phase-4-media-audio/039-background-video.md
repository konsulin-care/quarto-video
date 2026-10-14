# 039 — Background video placement

Phase 4 · Status: todo · Depends on: 038 · PRD: §6.1 (1), §10.2 · ADR: —

## Goal
Footage can fill the canvas behind a scene's text, with `cover`/`contain`,
trimming, looping and freezing rendered exactly as validated.

## Scope
- In: `placement="background"` supported by `title` and `statement`
  (contracts updated); `.text-overlay` slot; renderer video primitive using
  the shared `fit` util, source range, `loop`, `freeze`, `playbackRate`;
  legibility scrim token from the theme; muted output (audio in 044).
- Out: framed and slot placements (040–043).

## Deliverables
- `renderer/remotion/media/Video.tsx` (+ tests); contract updates.
- Fixtures `background-video`, `background-video-loop`, `-freeze`.
- Visual cases at known frames (fixture videos show a frame counter).

## Definition of done
Automated:
- [ ] Rendered frame N shows source frame `sourceStart + N × playbackRate`
      (read from the counter pattern) for trim, loop and freeze cases.
- [ ] `placement="background"` on an unsupported component → error.
- [ ] `cover` and `contain` match the image component's framing (visual).
- [ ] Output has no audio stream from muted footage.

Human check:
1. `npx video render tests/fixtures/projects/background-video` and watch:
   footage fills the frame, overlay text readable, clip starts at
   `sourceStart`.
2. Render the `-loop` and `-freeze` fixtures: the clip repeats / holds its
   last frame, never slows down.

## Notes

## Completion log
