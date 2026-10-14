# 015 — Timeline and transitions

Phase 2 · Status: todo · Depends on: 010, 014 · PRD: §5.6, §8.3, §18.3 · ADR: writes 0005

## Goal
A single deterministic timeline: every scene has a start frame, transitions
have explicit duration and overlap, and total duration is computed from the
resolved timeline.

## Scope
- In: ADR-0005 (transition belongs to incoming/outgoing scene or timeline;
  overlap vs. sequential; first/last scene rules; `cut` = 0 frames);
  `transition` and `transitionDuration` attributes; `defaults.scene.transition`;
  IR `timeline` section (`startFrame` per scene, `durationFrames` total);
  stage 4 checks (transition longer than either scene, negative values).
  Renderer uses `startFrame`/total but draws overlaps as hard cuts until 022.
- Out: visual transition presets (022).

## Deliverables
- `docs/decisions/0005-transition-model.md` (accepted).
- Timeline resolver (single implementation; location per ADR) + unit tests.
- IR schema `0.3` with `timeline`; examples updated.
- `packages/validator/src/stages/timeline.ts`; fixtures `timeline-*`.

## Definition of done
Automated:
- [ ] Unit tests: no transitions; all overlapping; mixed; first/last scene;
      transition = scene length; transition > scene length → error.
- [ ] Rendered MP4 frame count equals IR `timeline.durationFrames`.

Human check:
1. `npx video validate tests/fixtures/projects/timeline-overlap --print-ir`
   (3 × 4 s scenes, 1 s fades, 30 fps) → start frames and total match the
   worked example in ADR-0005.
2. `ffprobe` the rendered file: duration equals that total.

## Notes

## Completion log
