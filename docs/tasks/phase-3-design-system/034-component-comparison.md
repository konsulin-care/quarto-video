# 034 — Component `comparison`

Phase 3 · Status: in-progress · Depends on: 024 · PRD: §5.4 (5), §5.5, §10.2 · ADR: —

## Goal
Release the `comparison` component: two or more structured content areas side by side.

## Scope
- In: slots `left`, `right` (required) and optional `middle`, or `columns` of 2–3; each area accepts heading/paragraph/list.
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/comparison.json`.
- Renderer `renderer/remotion/components/comparison/` + `registry-map.ts` entry.
- Docs `docs/components/comparison.md` from the component template.
- Fixture `tests/fixtures/projects/component-comparison/` (valid) and
  `component-comparison-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/comparison-*.json` with references.

## Definition of done
Automated:
- [ ] Contract validates; parity test passes; `video components` lists `comparison`.
- [ ] Each contract violation in the invalid fixture yields its code and line.
- [ ] Missing `right` → `E_SLOT_MISSING`.
- [ ] Unequal content lengths keep columns aligned at the top (visual case).
- [ ] Every compatible animation renders without clipping (visual cases).

Human check:
1. `npx video render tests/fixtures/projects/component-comparison` and watch it.
2. Review against `docs/components/comparison.md`: legible at 1080p, consistent
   with the theme, no clipped or overlapping text.
3. `npx video validate tests/fixtures/projects/component-comparison-invalid` → one
   actionable error per violating scene.

## Notes

## Completion log
