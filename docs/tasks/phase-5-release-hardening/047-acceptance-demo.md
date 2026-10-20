# 047 — Acceptance demo `videos/demo`

Phase 5 · Status: done · Depends on: 041–046 · PRD: §13.4, §16 · ADR: —

## Goal
One complete demonstration project exercising every major capability,
rendered and checked automatically in CI.

## Scope
- In: `videos/demo/` with title, statement or bullets, statistic or chart,
  background footage, framed product demo or split-screen, closing scene,
  background music, captions; small, redistributable assets with
  `assets/SOURCES.md`; end-to-end test.
- Out: new features — if something is missing, append a task.

## Deliverables
- `videos/demo/index.qmd`, `assets/`, `data/`.
- `tests/integration/demo.test.ts` (validate + reduced-resolution render).
- Visual cases sampling each scene.

## Definition of done
Automated:
- [x] Validate → zero errors and warnings. (`demo.test.ts`: "validates with zero diagnostics")
- [x] Render: size, fps, frame count and audio duration match the IR. (`demo.test.ts`: "renders at a reduced size")
- [x] Every PRD §13.4 element is present (test inspects the IR). (`demo.test.ts`: the eight IR tests)
- [x] Runs in CI within the documented time budget. (`test:integration:render`, budget in Notes)

Human check (open; not performed by the agent):
1. `npx video validate videos/demo` → OK.
2. `npx video render videos/demo` → open `videos/demo/output.mp4`; every
   §13.4 element appears, audio and captions in sync.

## Notes
- CI time budget: `demo.test.ts` at most 5 minutes (measured 57 s: 10 tests,
  the 960x540 render about 54 s); the `demo-scenes` visual case at most
  2 minutes (measured 20 s). Both run in the CI `Test` step (`mise run test`,
  job timeout 30 minutes).
- Captions use `mode: both`: burned into the picture and written as
  `output.vtt`. The test checks the sidecar's cue count against the IR.
- Burned captions cover the bottom of the picture (ADR-0019). In-scene text
  there collided with them in the reduced renders, so the demo keeps that
  area clear: no `.caption` or `.context` text, no cue over the end card,
  and the illustrative disclaimers sit in cue text or in the chart title.
- The integration test renders a 960x540 copy. The full 1920x1080 render
  (Human check 2) was not run by the agent.
- Assets are generated locally with FFmpeg (see `assets/SOURCES.md`); total
  1.1 MB. Visual references `visual/references/demo-scenes/` (8 stills,
  1920x1080) were produced by this run and checked by the agent on a contact
  sheet; a person has not reviewed them.

## Completion log
- 2026-10-18: acceptance demo done. `videos/demo` (8 scenes: title with
  background footage, statement, bullets, statistic, bar chart, framed
  product demo in a browser frame, split-screen, end card; music track;
  captions `mode: both`); `assets/SOURCES.md`; `data/build-stages.csv`
  (illustrative); `tests/integration/demo.test.ts` (in
  `test:integration:render`); visual case `tests/visual/cases/demo-scenes.json`
  (8 frames, one per scene). The validator reports no diagnostics; the IR is
  1.11, 1056 frames at 30 fps.
- Tests: `tests/integration/demo.test.ts` (10 tests: validation, the eight
  §13.4 IR checks, the reduced render with size, fps, frames, audio and the
  sidecar); visual `demo-scenes` (8 frames, 0.000% differ).
- Gates: `mise run check` exit 0 (line limit 402 files within 300; format;
  eslint 341 files; selene 48; shellcheck 13; typecheck). `mise run test`
  exit 0 in 28 min 27 s: scripts 19/19; unit 116 files, 1134 tests; Lua
  298/298; integration pure 157/157; integration render 80/80 (demo 10/10);
  vitest integration 3 files, 7 tests; visual 310 frames (demo 8) with the
  harness and flash tests 23/23.
- Measured CI time: `demo.test.ts` 57 s standalone (78 s inside the full
  gate run); `demo-scenes` 20 s.
- Human check: not run by a person. Both checks above are open.
- Follow-ups: the two human checks; a full-size render in CI (only the
  960x540 copy is tested now); a rule or lint for in-scene text under burned
  captions, since the caption panel hides what is under it.
