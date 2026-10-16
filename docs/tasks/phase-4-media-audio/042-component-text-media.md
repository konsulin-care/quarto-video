# 042 — Component `text-media`

Phase 4 · Status: in-progress · Depends on: 039 · PRD: §5.4 (8), §5.5 · ADR: —

## Goal
Release the `text-media` component: text paired with image or video footage.

## Scope
- In: slots `text` (required) and `media` (image or video, required); prop `side=left|right`; media uses the shared fit util.
- Out: audio behaviour (044); other components.

## Deliverables
- Contract `packages/registry/components/text-media.json`.
- Renderer `renderer/remotion/components/text-media/` + `registry-map.ts` entry.
- Docs `docs/components/text-media.md` from the component template.
- Fixtures `tests/fixtures/projects/component-text-media/` and
  `component-text-media-invalid/`.
- Visual cases `tests/visual/cases/text-media-*.json` with references.

## Definition of done
Automated:
- [ ] Contract validates; parity test passes; `video components` lists `text-media`.
- [ ] Each violation in the invalid fixture yields its code and line.
- [ ] `side` swaps layout (visual cases).
- [ ] Long text wraps without overlapping the media box.

Human check:
1. `npx video render tests/fixtures/projects/component-text-media` and watch it.
2. Review against `docs/components/text-media.md`: framing, legibility, theme
   consistency, nothing clipped.
3. `npx video validate tests/fixtures/projects/component-text-media-invalid` →
   one actionable error per violating scene.

## Notes

## Completion log
