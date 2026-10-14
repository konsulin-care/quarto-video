# 029 — Component `section-divider`

Phase 3 · Status: todo · Depends on: 024 · PRD: §5.4 (11), §5.5, §10.2 · ADR: —

## Goal
Release the `section-divider` component: chapter or topic break between sections.

## Scope
- In: slots `default` (section title) and optional `kicker` (e.g. "Part 2"); short default duration bounds.
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/section-divider.json`.
- Renderer `renderer/remotion/components/section-divider/` + `registry-map.ts` entry.
- Docs `docs/components/section-divider.md` from the component template.
- Fixture `tests/fixtures/projects/component-section-divider/` (valid) and
  `component-section-divider-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/section-divider-*.json` with references.

## Definition of done
Automated:
- [ ] Contract validates; parity test passes; `video components` lists `section-divider`.
- [ ] Each contract violation in the invalid fixture yields its code and line.
- [ ] Duration above the max bound → error.
- [ ] Visual cases with and without kicker.
- [ ] Every compatible animation renders without clipping (visual cases).

Human check:
1. `npx video render tests/fixtures/projects/component-section-divider` and watch it.
2. Review against `docs/components/section-divider.md`: legible at 1080p, consistent
   with the theme, no clipped or overlapping text.
3. `npx video validate tests/fixtures/projects/component-section-divider-invalid` → one
   actionable error per violating scene.

## Notes

## Completion log
