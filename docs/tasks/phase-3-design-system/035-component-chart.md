# 035 — Component `chart`

Phase 3 · Status: todo · Depends on: 024 · PRD: §5.4 (7), §12, §5.5, §10.2 · ADR: —

## Goal
Release the `chart` component: data visualisation from a defined chart specification.

## Scope
- In: chart spec as attributes: `type=bar|line`, `data=data/<file>.csv`, `x`, `y`, `unit`, `title`; CSV parsed by the validator (no code execution); labels and units always rendered; colour not the only encoding (direct labels).
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/chart.json`.
- Renderer `renderer/remotion/components/chart/` + `registry-map.ts` entry.
- Docs `docs/components/chart.md` from the component template.
- Fixture `tests/fixtures/projects/component-chart/` (valid) and
  `component-chart-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/chart-*.json` with references.

## Definition of done
Automated:
- [ ] Contract validates; parity test passes; `video components` lists `chart`.
- [ ] Each contract violation in the invalid fixture yields its code and line.
- [ ] Unknown column name → error naming available columns.
- [ ] Malformed CSV → error with CSV line number.
- [ ] Visual cases: bar and line with 3 and 12 points.
- [ ] Every compatible animation renders without clipping (visual cases).

Human check:
1. `npx video render tests/fixtures/projects/component-chart` and watch it.
2. Review against `docs/components/chart.md`: legible at 1080p, consistent
   with the theme, no clipped or overlapping text.
3. `npx video validate tests/fixtures/projects/component-chart-invalid` → one
   actionable error per violating scene.

## Notes

## Completion log
