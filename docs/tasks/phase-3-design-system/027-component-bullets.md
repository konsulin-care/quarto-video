# 027 — Component `bullets`

Phase 3 · Status: todo · Depends on: 024 · PRD: §5.4 (3), §5.5, §10.2 · ADR: —

## Goal
Release the `bullets` component: sequential points or a compact list.

## Scope
- In: slot `default` must contain one list (2–6 items, else error); optional `heading` slot; items appear in order.
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/bullets.json`.
- Renderer `renderer/remotion/components/bullets/` + `registry-map.ts` entry.
- Docs `docs/components/bullets.md` from the component template.
- Fixture `tests/fixtures/projects/component-bullets/` (valid) and
  `component-bullets-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/bullets-*.json` with references.

## Definition of done
Automated:
- [ ] Contract validates; parity test passes; `video components` lists `bullets`.
- [ ] Each contract violation in the invalid fixture yields its code and line.
- [ ] 7 items → `E_SLOT_CONSTRAINT` with the limit.
- [ ] Long items wrap; all items visible on the last frame (visual case).
- [ ] Every compatible animation renders without clipping (visual cases).

Human check:
1. `npx video render tests/fixtures/projects/component-bullets` and watch it.
2. Review against `docs/components/bullets.md`: legible at 1080p, consistent
   with the theme, no clipped or overlapping text.
3. `npx video validate tests/fixtures/projects/component-bullets-invalid` → one
   actionable error per violating scene.

## Notes

## Completion log
