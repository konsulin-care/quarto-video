# 043 — Component `split-screen`

Phase 4 · Status: in-progress · Depends on: 039 · PRD: §5.4 (10), §6.1 (3), §5.5 · ADR: —

## Goal
Release the `split-screen` component: simultaneous media or content regions.

## Scope
- In: 2–3 named regions (`left`, `right`, optional `middle`) each holding media or content; per-region `fit`; all regions share the scene timeline; each video validated separately.
- Out: audio behaviour (044); other components.

## Deliverables
- Contract `packages/registry/components/split-screen.json`.
- Renderer `renderer/remotion/components/split-screen/` + `registry-map.ts` entry.
- Docs `docs/components/split-screen.md` from the component template.
- Fixtures `tests/fixtures/projects/component-split-screen/` and
  `component-split-screen-invalid/`.
- Visual cases `tests/visual/cases/split-screen-*.json` with references.

## Definition of done
Automated:
- [ ] Contract validates; parity test passes; `video components` lists `split-screen`.
- [ ] Each violation in the invalid fixture yields its code and line.
- [ ] 4 regions → error with the limit.
- [ ] Two clips with different source ranges both play correctly (frame counters).
- [ ] Region placed media in an unknown slot → error naming valid slots.

Human check:
1. `npx video render tests/fixtures/projects/component-split-screen` and watch it.
2. Review against `docs/components/split-screen.md`: framing, legibility, theme
   consistency, nothing clipped.
3. `npx video validate tests/fixtures/projects/component-split-screen-invalid` →
   one actionable error per violating scene.

## Notes

## Completion log
