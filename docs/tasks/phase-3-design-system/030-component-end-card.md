# 030 — Component `end-card`

Phase 3 · Status: todo · Depends on: 024 · PRD: §5.4 (12), §5.5, §10.2 · ADR: —

## Goal
Release the `end-card` component: closing message, credits or call to action.

## Scope
- In: slots `default` (message, required), optional `cta` and `credits` (list).
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/end-card.json`.
- Renderer `renderer/remotion/components/end-card/` + `registry-map.ts` entry.
- Docs `docs/components/end-card.md` from the component template.
- Fixture `tests/fixtures/projects/component-end-card/` (valid) and
  `component-end-card-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/end-card-*.json` with references.

## Definition of done
Automated:
- [ ] Contract validates; parity test passes; `video components` lists `end-card`.
- [ ] Each contract violation in the invalid fixture yields its code and line.
- [ ] Credits list of 10 lines fits or yields a warning, never clipping.
- [ ] Visual cases: message only; message + cta + credits.
- [ ] Every compatible animation renders without clipping (visual cases).

Human check:
1. `npx video render tests/fixtures/projects/component-end-card` and watch it.
2. Review against `docs/components/end-card.md`: legible at 1080p, consistent
   with the theme, no clipped or overlapping text.
3. `npx video validate tests/fixtures/projects/component-end-card-invalid` → one
   actionable error per violating scene.

## Notes

## Completion log
