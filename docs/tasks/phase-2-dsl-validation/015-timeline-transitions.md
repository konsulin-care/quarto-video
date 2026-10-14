# 015 — Timeline and transitions

Phase 2 · Status: done · Depends on: 010, 014 · PRD: §5.6, §8.3, §18.3 · ADR: writes 0005

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
- [x] Unit tests: no transitions; all overlapping; mixed; first/last scene;
      transition = scene length; transition > scene length → error.
- [x] Rendered MP4 frame count equals IR `timeline.durationFrames`.

Human check:
1. `npx video validate tests/fixtures/projects/timeline-overlap --print-ir`
   (3 × 4 s scenes, 1 s fades, 30 fps) → start frames and total match the
   worked example in ADR-0005.
2. `ffprobe` the rendered file: duration equals that total.

## Notes
- Owner: the incoming scene carries `transition` and `transitionDuration`
  (ADR-0005). Overlap, not sequential: scene n starts at start(n-1) + length(n-1)
  − its transition. Total = end of the last scene (300 frames in the example).
- `cut` = 0 frames and takes no `transitionDuration`. The first scene takes no
  transition; `defaults.scene.transition` applies to later scenes only.
- Transition names are registry data (`packages/registry/transitions.json`):
  `cut`, `fade`. `fade` is drawn as a hard cut until 022.
- Bounds: a transition is no longer than either scene it joins (equal allowed);
  a scene's incoming plus outgoing transition must fit inside it. Negative values
  are rejected by the filter and the IR schema before stage 4.
- A non-cut default needs `transitionDuration` on each scene it reaches (no hidden
  default, ADR-0003). This makes the PRD §5.2 example (`transition: fade`, no
  duration) an error. Needs a human decision (see Completion log).
- IR 0.3 is a new file; 0.2 is unchanged. The filter emits 0.3; 0.1 and 0.2 stay valid.
  The renderer resolves 0.1/0.2 as sequential (`timelineOf`).
- The filter resolves the timeline (`lib/timeline.lua`); the validator recomputes it
  (`resolveTimeline`) and reports `E_TIMELINE_MISMATCH`. Both pass
  `packages/ir/test-vectors/timeline.json`.

## Completion log
- 2026-10-14: done. Summary: ADR-0005; `transition`/`transitionDuration`
  and `defaults.scene.transition` in the filter (`lib/transitions.lua`);
  `lib/timeline.lua`; IR 0.3 (`ir-0.3.json`, `timeline`, scene `transition`);
  `resolveTimeline`/`timelineOf` in `@quarto-video/ir`; stage 4
  (`stages/timeline.ts`, six codes); transition registry; renderer plays on
  `startFrame` with hard cuts; `OK` line reports the timeline total.
  Changed existing tests (behaviour, not loosened): content.test (version
  message now names 0.4 as unsupported), run.test (contract version message),
  golden `expected.json` files now 0.3 with `timeline`, and
  `front-matter-overrides` now uses `defaults.scene.transition: cut`.
- Tests: `packages/ir/test/timeline.test.ts`, `packages/validator/test/timeline.test.ts`,
  `packages/registry/test/transitions.test.ts`, `_extensions/video/tests/test_transitions.lua`,
  `test_timeline.lua` (vectors shared with TS), `tests/integration/timeline.test.ts`
  (11 cases: 9 fixtures, the OK total, a 60-frame MP4). `codes.test.ts` covers the six codes.
- Follow-ups: (a) human decision: add `defaults.scene.transitionDuration`, or
  keep requiring it per scene (PRD §5.2 wording); (b) an unused default name
  is not checked (the IR does not carry it); (c) warn when `fade` is drawn as a
  cut until 022; (d) task 022 draws the overlaps.
- Pending human checks: (1) `--print-ir` on `timeline-overlap` in a fresh clone
  (automated equivalent passes; not run by a person); (2) `ffprobe` duration of a
  rendered 10 s `timeline-overlap` (pending; the frame-count test on `timeline-render` passes).
