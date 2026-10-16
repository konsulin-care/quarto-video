# 040 — Device frames

Phase 4 · Status: in-progress · Depends on: 039 · PRD: §5.5, §6.1 (2), §10.2 · ADR: —

## Goal
Reusable `browser`, `phone`, `tablet` and `generic` frames that any framed
image or video can be placed in.

## Scope
- In: frame registry entries (`frames/<id>.json`: id, aspect, safe content
  box, theme tokens used); renderer frame components; `frame` prop validated
  against the registry; `placement="framed"` support in the media primitive.
- Out: components that use frames (041+).

## Deliverables
- `packages/registry/frames/*.json`, `renderer/remotion/media/frames/`.
- Visual cases: each frame with 16:9, 9:16 and 4:3 media, `cover` and
  `contain`.
- Frames section in `docs/components/README.md`.

## Definition of done
Automated:
- [ ] Unknown `frame` → error listing registered frames.
- [ ] Media never draws outside the frame's content box (visual cases).
- [ ] Parity test covers frames.

Human check:
1. `npx video render tests/fixtures/projects/device-frames` (one scene per
   frame) and check each frame looks consistent with the theme and crops or
   letterboxes as its `fit` says.

## Notes

## Completion log
