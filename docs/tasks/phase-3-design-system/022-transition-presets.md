# 022 — Transition presets

Phase 3 · Status: done · Depends on: 021 · PRD: §5.6, §8.3 · ADR: reads 0005

## Goal
Visual transitions `cut`, `fade`, `slide`, `wipe`, `zoom` implementing the
ADR-0005 overlap model.

## Scope
- In: transition contract (id, purpose, default duration, min/max,
  reduced-motion fallback); renderer implementation over overlap frames;
  validation of names and durations.
- Out: new timeline semantics (ADR-0005 is authoritative).

## Deliverables
- `packages/registry/transitions/*.json`, `renderer/remotion/transitions/*.ts`.
- Visual cases: each transition at overlap start, middle and end.
- Fixture `tests/fixtures/projects/transitions` (one boundary per preset).

## Definition of done
Automated:
- [x] Rendered frame count still equals IR `timeline.durationFrames` (`tests/integration/timeline.test.ts`, transitions: 156 frames).
- [x] At overlap mid-frame both scenes are visible (visual case); at overlap
      end only the incoming scene is (`transition-curves.test.ts`; visual `transitions-basic`).
- [x] `cut` produces no blended frames (`transition-curves.test.ts`; visual frames 35, 36).
- [x] Unknown transition → error listing registered transitions (`timeline.test.ts`; `timeline.test.ts` integration).

Human check:
1. [ ] Partly met. `npx video render tests/fixtures/projects/transitions` exits 0
   (640x360, 30 fps, 156 frames). Stills at each boundary's start, middle and last
   overlap frame match the purposes. No person has watched the motion yet.

## Notes
- Overlap (ADR-0005): a boundary's overlap is the incoming scene's `transitionDuration`. Progress on the incoming side is (frame + 1) / overlap, so the overlap's last frame is complete and the outgoing scene is gone there. Outgoing `fade` stays opaque beneath the incoming one: a true crossfade with no background dip.
- ADR-0005 says each scene is shown "until the next starts". That cannot hold with a mid-overlap check, so each scene now runs its own `durationFrames` (the overlap shows both). The ADR wording needs a human fix; the ADR is not edited here.
- Registry: names stay in `transitions.json` (ADR-0005); contracts in `transitions/<id>.json`, matched 1:1 at load. Bounds 100 ms to 3 s for every motion preset, so existing fixtures stay valid. `defaultMs` is documentation only (ADR-0005 forbids a hidden default).
- Reduced-motion fallback: `slide`, `wipe`, `zoom` fall back to `fade`, not `cut`, so the overlap and timeline stay the same. Applied by task 023.
- Stage 4 reports a duration outside the bounds as `E_TRANSITION_DURATION`; no new code.
- Behaviour change: `wipe` is now registered, so `timeline-unknown` uses `spin` (same expected code and line). The root of `IrVideo` clips overflow so a sliding scene does not spill.
- Visual: `transitions-basic` covers 14 frames. Reference stills were approved and checked on the pinned Chromium.
- The fixture is 5.2 s, longer than the 2 s guideline in `tests/README.md`; six scenes are needed for five boundaries.
- Not verified: the motion itself (see the human check). Wipe and zoom mid-frames overlap heavy text, so the wipe edge is hard to read in stills.

## Completion log
### 2026-10-15 — done
- Summary: transition presets `cut`, `fade`, `slide`, `wipe`, `zoom` (ADR-0005 overlap). Registry: `transitions/<id>.json` (schema `transition.json`; `listTransitionPresets()`). Validator: stage 4 bounds check and the registered names. Renderer: `transitions/` (incoming and outgoing sides), `TransitionScene`, and `IrVideo` plays each scene for its own length.
- Tests: `packages/registry/test/transition-presets.test.ts`; `packages/validator/test/timeline.test.ts` (bounds, names); `renderer/remotion/test/transition-curves.test.ts`, `transition-parity.test.ts`, `banned-apis.test.ts`; `tests/integration/timeline.test.ts` (`transitions` fixture: timeline, render frame count, unknown names); visual `transitions-basic` (14 frames).
- Verified: `scripts/check.sh --all` passed. `video render` of the fixture exits 0, 156 frames, and the stills match the references.
- Known deviation: ADR-0005's renderer sentence (see Notes). Not a deviation from the task.
- Follow-ups: (1) a human fixes ADR-0005's renderer wording; (2) task 023 applies `reducedMotion`; (3) watch the transitions once; (4) reconsider the wipe and zoom mid-frame stills with lighter text; (5) `compatibleTransitions` is still unchecked; (6) a `defaults.scene.transition` remains open (ADR-0005).
