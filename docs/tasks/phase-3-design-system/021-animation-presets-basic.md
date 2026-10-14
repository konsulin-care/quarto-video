# 021 — Animation presets: fade-in, slide-up, reveal

Phase 3 · Status: todo · Depends on: 020 · PRD: §5.6, §10.2 · ADR: —

## Goal
A preset system where animations are registered data + pure frame functions,
shipped with `fade-in`, `slide-up` and `reveal`.

## Scope
- In: preset contract (id, purpose, compatible components, min frames,
  short-scene fallback, reduced-motion behaviour); renderer preset API
  `(frame, durationFrames, tokens) → style`; `animation` attribute resolved
  and checked for component compatibility; lint rule banning `Date`,
  `Math.random`, `performance.now`, timers, `fetch` in the renderer.
- Out: reduced-motion switch (023), signature presets (026, 028, 032).

## Deliverables
- `packages/registry/schema/animation.json`, `animations/*.json`.
- `renderer/remotion/animations/*.ts` + unit tests of value curves.
- Visual cases: each preset at first, middle and last frame.
- Presets section in `docs/components/README.md` (create if missing).

## Definition of done
Automated:
- [ ] Same frame computed twice → identical output (property test).
- [ ] Curves reach their end state no later than the scene's last frame for
      every duration ≥ min frames; below min frames the documented fallback
      applies.
- [ ] Unknown or incompatible preset → validation error.
- [ ] Lint rule fails on `Math.random()` in renderer code (verified once).

Human check:
1. `npx video render tests/fixtures/projects/animations-basic` (one scene per
   preset) and watch: each animation completes and text is never clipped.

## Notes

## Completion log
