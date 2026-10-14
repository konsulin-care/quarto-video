# 046 — Captions

Phase 5 · Status: todo · Depends on: 045 · PRD: §12 · ADR: —

## Goal
A project can supply a caption file that is validated and rendered as
legible, timed captions (burned in and/or written as a sidecar).

## Scope
- In: `video.captions: { src: assets/captions.vtt, mode: burn|sidecar|both }`;
  WebVTT parsing in the validator (cues within video duration, no overlaps
  unless allowed); caption style from theme tokens with safe-area
  placement; sidecar copied next to the output.
- Out: caption authoring inside scenes; auto-transcription.

## Deliverables
- Settings rows; IR fields; validator `stages/captions.ts`.
- Renderer caption layer; fixtures `captions-burn`, `captions-invalid`.
- Visual cases with a long two-line cue.

## Definition of done
Automated:
- [ ] Cue beyond video end, malformed timestamp → errors with VTT line.
- [ ] Burned captions visible exactly between cue frames (visual cases).
- [ ] `sidecar` mode writes `output.vtt` next to `output.mp4`.
- [ ] Caption text meets the theme contrast rule over any background.

Human check:
1. Render `tests/fixtures/projects/captions-burn` and watch: captions appear
   and disappear on time, readable over footage.
2. Set `mode: sidecar`, render, open `output.mp4` with `output.vtt` in a
   player that loads sidecar captions.

## Notes

## Completion log
