# 033 — Component `image`

Phase 3 · Status: in-progress · Depends on: 024 · PRD: §5.4 (6), §6.2, §5.5, §10.2 · ADR: —

## Goal
Release the `image` component: image-led composition with optional caption.

## Scope
- In: image block `{.image src=… fit=cover|contain alt=…}`; slot `caption`; shared `fit` util in `renderer/remotion/media/` reused later by video; `alt` stored as accessibility metadata. Supported image formats per asset checks (PNG, JPEG, WebP, SVG — confirm in ADR-0008 later).
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/image.json`.
- Renderer `renderer/remotion/components/image/` + `registry-map.ts` entry.
- Docs `docs/components/image.md` from the component template.
- Fixture `tests/fixtures/projects/component-image/` (valid) and
  `component-image-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/image-*.json` with references.

## Definition of done
Automated:
- [ ] Contract validates; parity test passes; `video components` lists `image`.
- [ ] Each contract violation in the invalid fixture yields its code and line.
- [ ] Visual cases for portrait, landscape and extreme (1:4) images with both fit modes.
- [ ] Missing `src` file → asset error from stage 3.
- [ ] Every compatible animation renders without clipping (visual cases).

Human check:
1. `npx video render tests/fixtures/projects/component-image` and watch it.
2. Review against `docs/components/image.md`: legible at 1080p, consistent
   with the theme, no clipped or overlapping text.
3. `npx video validate tests/fixtures/projects/component-image-invalid` → one
   actionable error per violating scene.

## Notes

## Completion log
