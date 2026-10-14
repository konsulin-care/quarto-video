# 041 — Component `product-demo`

Phase 4 · Status: todo · Depends on: 040 · PRD: §5.4 (9), §6.1 (2), §5.5 · ADR: —

## Goal
Release the `product-demo` component: media presented inside a device or browser frame.

## Scope
- In: one framed media item (video or image, required) with `frame` and optional `caption` slot; supported animations for the frame entrance.
- Out: audio behaviour (044); other components.

## Deliverables
- Contract `packages/registry/components/product-demo.json`.
- Renderer `renderer/remotion/components/product-demo/` + `registry-map.ts` entry.
- Docs `docs/components/product-demo.md` from the component template.
- Fixtures `tests/fixtures/projects/component-product-demo/` and
  `component-product-demo-invalid/`.
- Visual cases `tests/visual/cases/product-demo-*.json` with references.

## Definition of done
Automated:
- [ ] Contract validates; parity test passes; `video components` lists `product-demo`.
- [ ] Each violation in the invalid fixture yields its code and line.
- [ ] Missing media → `E_SLOT_MISSING`; `placement="background"` → unsupported placement error.
- [ ] Framed clip honours `sourceStart`/`sourceEnd` (frame-counter check).

Human check:
1. `npx video render tests/fixtures/projects/component-product-demo` and watch it.
2. Review against `docs/components/product-demo.md`: framing, legibility, theme
   consistency, nothing clipped.
3. `npx video validate tests/fixtures/projects/component-product-demo-invalid` →
   one actionable error per violating scene.

## Notes

## Completion log
