# 024 — Component `title`

Phase 3 · Status: in-progress · Depends on: 023 · PRD: §5.4 (1), §5.5, §10.2 · ADR: —

## Goal
Release the `title` component: opening title with optional subtitle.

## Scope
- In: slots `default` (title, required) and `subtitle` (optional); props none beyond common; animations `fade-in`, `slide-up`, `reveal`. Replaces the placeholder. Also creates `docs/components/_template.md` used by all later component tasks.
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/title.json`.
- Renderer `renderer/remotion/components/title/` + `registry-map.ts` entry.
- Docs `docs/components/title.md` from the component template.
- Fixture `tests/fixtures/projects/component-title/` (valid) and
  `component-title-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/title-*.json` with references.

## Definition of done
Automated:
- [ ] Contract validates; parity test passes; `video components` lists `title`.
- [ ] Each contract violation in the invalid fixture yields its code and line.
- [ ] Long title (≥ 80 characters) wraps within safe area, never clipped.
- [ ] Missing subtitle → layout recentres (visual case).
- [ ] Every compatible animation renders without clipping (visual cases).

Human check:
1. `npx video render tests/fixtures/projects/component-title` and watch it.
2. Review against `docs/components/title.md`: legible at 1080p, consistent
   with the theme, no clipped or overlapping text.
3. `npx video validate tests/fixtures/projects/component-title-invalid` → one
   actionable error per violating scene.

## Notes

## Completion log
