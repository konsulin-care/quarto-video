# 047 — Acceptance demo `videos/demo`

Phase 5 · Status: todo · Depends on: 041–046 · PRD: §13.4, §16 · ADR: —

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
- [ ] Validate → zero errors and warnings.
- [ ] Render: size, fps, frame count and audio duration match the IR.
- [ ] Every PRD §13.4 element is present (test inspects the IR).
- [ ] Runs in CI within the documented time budget.

Human check:
1. `npx video validate videos/demo` → OK.
2. `npx video render videos/demo` → open `videos/demo/output.mp4`; every
   §13.4 element appears, audio and captions in sync.

## Notes

## Completion log
