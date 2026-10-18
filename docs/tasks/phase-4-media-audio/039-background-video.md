# 039 — Background video placement

Phase 4 · Status: done · Depends on: 038 · PRD: §6.1 (1), §10.2 · ADR: —

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
- [x] Rendered frame N shows source frame `sourceStart + N × playbackRate`
      (read from the counter pattern) for trim, loop and freeze cases.
      (`tests/integration/background-video.test.ts`)
- [x] `placement="background"` on an unsupported component → error.
      (`tests/integration/background-video-validate.test.ts`; `packages/validator/test/media-placement.test.ts`)
- [x] `cover` and `contain` match the image component's framing (visual).
      (`tests/visual/cases/background-video-fit.json`: contain at 15, cover at 45;
      both call `fitStyle` in `renderer/remotion/media/fit.ts`, as the image does)
- [x] Output has no audio stream from muted footage.
      (`background-video.test.ts`: the source has audio, the MP4 has none)

Human check:
1. `npx video render tests/fixtures/projects/background-video` and watch:
   footage fills the frame, overlay text readable, clip starts at
   `sourceStart`.
2. Render the `-loop` and `-freeze` fixtures: the clip repeats / holds its
   last frame, never slows down.

## Notes
- `.text-overlay` is a slot. Its contract field `alternative` (new, optional)
  makes it an alternative of `default`: a scene fills one of them, and a
  required slot is satisfied by its alternative. Both filled is
  `E_SLOT_CONSTRAINT`. The renderer draws the overlay as `default` (`src/overlay.ts`).
- Footage without `sourceEnd` needs its file's end for loop and freeze. Stage 3
  writes the probed end into the resolved IR as `sourceEndFrames` (no new IR
  version; `video validate --print-ir` shows it). The renderer never probes.
- Frames: one muted `OffthreadVideo` per scene frame, at the source frame
  computed by `media/schedule.ts` (`startFrom`), so loop and freeze are exact
  and `playbackRate` is applied by us, not by Remotion.
- Scrim: theme token `scrim.opacity` (0.5 in `modern`), the background colour over the footage.
- A scene's animation (for example `fade-in`) fades the footage too, because it is applied to the whole scene.
- Follow-ups (not this task): framed placement (040); audio `keep` (044);
  cost of one extraction per frame on long background scenes (measure before
  044–046); the validator README is 134 lines, above the 100-line rule that
  predates this task.

## Completion log
- 2026-10-16: background placement for `title` and `statement`. Commits: 7a7291c (contracts, theme scrim), e2de167 (E_MEDIA_PLACEMENT, slot alternatives), 18419f1 (probed source end), 446940b (renderer), 55f4f3b (fixtures, tests, references), e59fcb2 (docs), then this log.
  Tests (`mise run test`, exit 0): scripts 19/19; unit 763/763 (87 files); Lua 239/239; integration 139/139 (pure) + 50/50 (render) + 7/7 (vitest), including `background-video*.test.ts` (8 tests); visual 237 frames passed, harness 23/23. `mise run check`: exit 0 (line limit, format, lint 0 errors, typecheck).
  Human check: (1) `video render` of `background-video` from a scratch copy: exit 0, 1.5 s, video stream only; a frame at 0.5 s was viewed: footage fills the frame, overlay text is readable, and the counter reads 60 (sourceStart 1 s, at 2×). I could not watch the motion, so smoothness is not seen by eye; the counter tests show every checked frame exact. (2) `-loop` (3 s) and `-freeze` (2 s) render with exit 0 and the expected durations. The stills show the loop restarting at frame 30 and the freeze holding source frame 89 from frame 29; I did not view their video.
  Follow-ups: see Notes.
