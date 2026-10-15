# 025 — Component `statement`

Phase 3 · Status: in-progress · Depends on: 024 · PRD: §5.4 (2), §5.5, §10.2 · ADR: —

## Goal
Release the `statement` component: one prominent message or key sentence.

## Scope
- In: slot `default` (required, ≤ 1 paragraph; longer → warning); emphasis via `strong` rendered with accent token.
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/statement.json`.
- Renderer `renderer/remotion/components/statement/` + `registry-map.ts` entry.
- Docs `docs/components/statement.md` from the component template.
- Fixture `tests/fixtures/projects/component-statement/` (valid) and
  `component-statement-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/statement-*.json` with references.

## Definition of done
Automated:
- [ ] Contract validates; parity test passes; `video components` lists `statement`.
- [ ] Each contract violation in the invalid fixture yields its code and line.
- [ ] A 3-line statement scales down within its token range, never below the minimum legible size; beyond that → validation warning.
- [ ] `strong` text uses the accent colour (visual case).
- [ ] Every compatible animation renders without clipping (visual cases).

Human check:
1. `npx video render tests/fixtures/projects/component-statement` and watch it.
2. Review against `docs/components/statement.md`: legible at 1080p, consistent
   with the theme, no clipped or overlapping text.
3. `npx video validate tests/fixtures/projects/component-statement-invalid` → one
   actionable error per violating scene.

## Notes

## Completion log
