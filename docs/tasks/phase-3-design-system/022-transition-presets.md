# 022 — Transition presets

Phase 3 · Status: in-progress · Depends on: 021 · PRD: §5.6, §8.3 · ADR: reads 0005

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
- [ ] Rendered frame count still equals IR `timeline.durationFrames`.
- [ ] At overlap mid-frame both scenes are visible (visual case); at overlap
      end only the incoming scene is.
- [ ] `cut` produces no blended frames.
- [ ] Unknown transition → error listing registered transitions.

Human check:
1. `npx video render tests/fixtures/projects/transitions` and watch each
   boundary; each transition matches its documented purpose.

## Notes

## Completion log
