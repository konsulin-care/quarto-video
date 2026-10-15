# 023 — Reduced motion

Phase 3 · Status: done · Depends on: 022 · PRD: §5.6, §12 · ADR: writes ADR-0012

## Goal
A project-level option that replaces non-essential motion with each preset's
documented reduced-motion behaviour.

## Scope
- In: `video.reducedMotion: true|false` (default false) in front matter and
  IR settings; renderer honours each preset's `reducedMotion` rule; flashing
  guard (no full-frame luminance change > 3 per second in any preset).
- Out: per-scene overrides.

## Deliverables
- Settings table row in `_extensions/video/README.md`.
- Renderer support + visual cases with reduced motion on.
- Flash-rate check utility used by preset tests.

## Definition of done
Automated:
- [x] With `reducedMotion: true`, every preset's visual case matches its
      reduced-motion reference (`animations-reduced-motion`,
      `transitions-reduced-motion`).
- [x] Every registered preset declares a reduced-motion rule (registry tests:
      `packages/registry/test/animations.test.ts`, `transition-presets.test.ts`).
- [x] Flash-rate test passes for all presets (`tests/visual/flash-presets.test.ts`).

Human check:
1. Render `tests/fixtures/projects/animations-basic` twice, with
   `reducedMotion` false and true; the second has no sliding/zooming, only
   simple fades or static content, with identical timing.
   - Done on scratch copies (the true copy adds `reducedMotion: true` to
     `video:`, nothing else). Both: 640x360, 135 frames, scene starts 0, 45, 90.
     Stills at frames 0 to 134: false shows fade, slide and wipe in progress;
     true shows every scene's text in full from its first frame.

## Notes
- Where the flag lives: IR settings, so IR 1.2 (ADR-0012), an additive minor
  version. The renderer reads it from the manifest, as it reads fps and size.
  `render.json` was the alternative (theme route); not chosen, since the task
  names IR settings.
- Animations: each registry rule is `static`, so `fade-in`, `slide-up` and
  `reveal` draw their end state from the first frame (no entrance). The task's
  "simple fades or static content" is met by static.
- Transitions: `slide`, `wipe` and `zoom` draw their registry fallback `fade`
  over the same overlap; `fade` and `cut` are unchanged. Timing does not move.
- Flash rule (interpretation): a flash is a change of full-frame mean
  luminance (Rec. 709 on sRGB, 0 to 1) above 0.10 between consecutive frames,
  the WCAG 2.3.1 general-flash figure applied to the whole frame. At most 3
  flashes in any 30-frame window at 30 fps. Measured on normal and reduced
  fixtures, every frame. Colour (red) flash and relative-luminance checks are
  not done.
- The registry rule tests predate this task (tasks 021, 022) and already
  assert a rule for every shipped preset; this task adds none.
- The reduced-motion visual cases are the basic fixtures with the flag on, so
  the same frames are compared. Each reference was checked by eye before approval.
- Gates: see the Completion log.

## Completion log
- 2026-10-15: `reducedMotion` (IR 1.2, ADR-0012) is set from front matter
  and read by the renderer. Presets apply their registry rules. Two visual
  cases and two fixtures added. The flash-rate check is in `tests/visual/`,
  run by `npm run test:visual`. Human check as above.
  - Tests: `packages/ir/test/v12.test.ts`, `frozen.test.ts`, `versions.test.ts`;
    `_extensions/video/tests/test_config.lua`; `tests/integration/front-matter.test.ts`
    (fixtures `front-matter-reduced-motion*`); `tests/integration/ir-v1.test.ts`
    (golden manifests now 1.2); `renderer/remotion/test/reduced-motion.test.ts`;
    `tests/visual/flash.test.ts`, `flash-presets.test.ts`; visual cases
    `animations-reduced-motion`, `transitions-reduced-motion`.
  - Gates: `scripts/check.sh --all` EXIT=0 (`/tmp/claude-0/-home-user-quarto-video/2ea04e7d-5501-5980-9c9f-1be8ffdb6f2c/scratchpad/gate-check.log`);
    `scripts/test.sh --all` EXIT=0 (`/tmp/claude-0/-home-user-quarto-video/2ea04e7d-5501-5980-9c9f-1be8ffdb6f2c/scratchpad/gate-test.log`; visual: 48 frames passed).
- Follow-ups: (1) a human reviews the luminance flash rule against WCAG 2.3.1
  and the colour-flash case; (2) per-scene overrides are out of scope; (3)
  `reveal` still wipes text during its normal entrance (task 021 deviation,
  unchanged here); (4) a reduced-motion rule for future components' motion
  (tasks 024+) comes with each preset.
