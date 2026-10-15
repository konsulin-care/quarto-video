# 031 — Component `statistic`

Phase 3 · Status: in-progress · Depends on: 024 · PRD: §5.4 (4), §5.5, §10.2 · ADR: —

## Goal
Release the `statistic` component: headline number with label and optional context.

## Scope
- In: props `value` (number, required), `unit`, `prefix`, `decimals`; slots `label` (required) and `context` (optional). Number formatting is deterministic and locale-fixed (documented).
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/statistic.json`.
- Renderer `renderer/remotion/components/statistic/` + `registry-map.ts` entry.
- Docs `docs/components/statistic.md` from the component template.
- Fixture `tests/fixtures/projects/component-statistic/` (valid) and
  `component-statistic-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/statistic-*.json` with references.

## Definition of done
Automated:
- [ ] Contract validates; parity test passes; `video components` lists `statistic`.
- [ ] Each contract violation in the invalid fixture yields its code and line.
- [ ] `value="abc"` → type error.
- [ ] Large values (1e9) format with the documented separators; visual case.
- [ ] Every compatible animation renders without clipping (visual cases).

Human check:
1. `npx video render tests/fixtures/projects/component-statistic` and watch it.
2. Review against `docs/components/statistic.md`: legible at 1080p, consistent
   with the theme, no clipped or overlapping text.
3. `npx video validate tests/fixtures/projects/component-statistic-invalid` → one
   actionable error per violating scene.

## Notes

## Completion log
