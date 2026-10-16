# 040 — Device frames

Phase 4 · Status: done · Depends on: 039 · PRD: §5.5, §6.1 (2), §10.2 · ADR: —

## Goal
Reusable `browser`, `phone`, `tablet` and `generic` frames that any framed
image or video can be placed in.

## Scope
- In: frame registry entries (`frames/<id>.json`: id, aspect, safe content
  box, theme tokens used); renderer frame components; `frame` prop validated
  against the registry; `placement="framed"` support in the media primitive.
- Out: components that use frames (041+).

## Deliverables
- `packages/registry/frames/*.json`, `renderer/remotion/media/frames/`.
- Visual cases: each frame with 16:9, 9:16 and 4:3 media, `cover` and
  `contain`.
- Frames section in `docs/components/README.md`.

## Definition of done
Automated:
- [x] Unknown `frame` → error listing registered frames. (`tests/integration/device-frames-validate.test.ts`; `packages/validator/test/media-frame.test.ts`)
- [x] Media never draws outside the frame's content box (visual cases). (`tests/visual/cases/device-frames-contain.json`, `device-frames-cover.json`: 24 scenes; `renderer/remotion/test/frame-layout.test.ts`: each screen inside its frame, each frame inside the safe area)
- [x] Parity test covers frames. (`renderer/remotion/test/frame-parity.test.ts`; the IR 1.6 frame enum equals the registry in `media-frame.test.ts`)

Human check:
1. `npx video render tests/fixtures/projects/device-frames` (one scene per
   frame) and check each frame looks consistent with the theme and crops or
   letterboxes as its `fit` says.

## Notes
- IR 1.6 is frozen (ADR-0007), so its frame enum stays. The validator checks a frame name against the registry first (stage 2, E_MEDIA_FRAME), and the enum is kept equal to the registry by a test. A new frame therefore needs an IR version bump (1.7 and an ADR) before it can be used. Not done here.
- `statement` is the one component that takes `framed`, so the fixtures can render framed footage. This is a contract change inside 040. `title` still does not take it, so `background-video-unsupported` uses `title` for its framed block and its expected output names `statement`.
- Layout: the frame is the largest box of its shape in the canvas safe area; the scrim sits over the footage on the screen; the statement draws over the frame. In the fixtures the statement text is wider than the phone and tablet frames and overlaps them. Layouts beside a frame belong to 041 and 043.
- `tests/fixtures/media/generate.sh` takes about 5 s. Two validator unit files run it in a `beforeAll` with a 10 s limit: the first full run timed out while a render ran alongside, and the rerun on an idle machine passed. Making generation cheaper or running it once is a follow-up.
- `packages/validator/README.md` (136 lines) and `_extensions/video/README.md` (102 lines) are over the 100-line rule; that predates this task.

## Completion log
- 2026-10-16: device frames. Commits: 261ebda (status), f1a553a (registry frames), 3bfc28f (frame check, stage 2), 23ad31b (renderer), 94f333a (fixtures, tests, 28 references), f60e026 (docs), then this log.
  Tests (`mise run test`, exit 0): scripts 19/19; unit 835/835 (91 files); Lua 241/241; integration 142/142 (pure) and 50/50 (render), vitest 7/7; visual 265 frames passed, harness 23/23, flash-rate checks passed. `mise run check`: passed (all: line limit on 331 files, format, lint 0 errors, typecheck).
  Human check: (1) `video render` of `device-frames`, run on a scratch copy: exit 0, 240 frames at 640x360, video stream only. I viewed the four visual stills and the frames extracted from the MP4 at each scene's middle: each frame is drawn in its own shape, the 16:9 footage is contained on its screen, and the generic border uses the accent token. I could not watch the motion, so smoothness is not seen by eye; the visual cases show every frame of the 24-scene project, cover and contain (contact sheet reviewed). The text overlaps the phone and tablet frames (see Notes).
  Follow-ups: layouts beside frames (041, 043); IR 1.7 before a new frame; generator time (Notes).
