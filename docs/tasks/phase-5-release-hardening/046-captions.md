# 046 — Captions

Phase 5 · Status: done · Depends on: 045 · PRD: §12 · ADR: writes 0019

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
- [x] Cue beyond video end, malformed timestamp → errors with VTT line.
- [x] Burned captions visible exactly between cue frames (visual cases).
- [x] `sidecar` mode writes `output.vtt` next to `output.mp4`.
- [x] Caption text meets the theme contrast rule over any background.

Human check (open; not performed by the agent):
1. Render `tests/fixtures/projects/captions-burn` and watch: captions
   appear and disappear on time, readable over footage.
2. Set `mode: sidecar`, render, open `output.mp4` with `output.vtt` in a
   player that loads sidecar captions.

## Notes
- Mode is required: a missing or unknown `mode` is E_SETTING_INVALID, never a default.
- Overlapping cues are E_CAPTIONS_OVERLAP: the task allows no overlap option yet.
- WebVTT subset: NOTE blocks skipped; STYLE and REGION blocks rejected; markup tags removed (plain text).
- Burned style: the theme's caption size and `text` colour on an opaque panel in the theme's `background` colour, so the text meets the 4.5:1 pair over any picture. The panel hides the footage under it.
- IR 1.11 with the cues written by the validator (as IR 1.9 `lengthFrames`); ADR-0019 written, as for IR 1.9 and 1.10.
- Sidecar: copied before the output is renamed into place, so a failed render leaves no `output.vtt`.
- Quarto 1.10.19, Node 24.21.0, StyLua, selene and shellcheck were installed through mise in the agent environment to run the gates.

## Completion log
- 2026-10-18: captions done. ADR-0019; IR 1.11 `captions` (`src`, `mode`, `cues` in frames); `video.captions` (`lib/captions.lua`); validator stage 3 `stages/captions.ts` and `vtt/parse.ts` (E_CAPTIONS_SYNTAX, E_CAPTIONS_TIMESTAMP, E_CAPTIONS_RANGE, E_CAPTIONS_OVERLAP); renderer `media/captions.ts` and `CaptionLayer.tsx` above every scene; CLI copies `output.vtt` in sidecar and both modes.
- Tests: `packages/validator/test/captions.test.ts`; `packages/ir/test/v111.test.ts` (and the 1.11 hash in `frozen.test.ts`); `_extensions/video/tests/test_captions.lua`; `renderer/remotion/test/captions.test.ts`; `tests/integration/captions.test.ts` (captions-burn IR, captions-invalid against expected.json with file and line, sidecar in each mode); visual `tests/visual/cases/captions-burn.json` (frames 14, 15, 30, 44, 45).
- Gates: `mise run check` passed (line limit 391 files; format, lint, typecheck). `mise run test` passed: scripts 19/19; unit 116 files, 1134 tests; Lua 298/298; integration pure 157/157 (33 suites); integration render 70/70 (26 suites); vitest integration 7/7 files; visual 302 frames (`test:visual`, incl. `captions-burn` frames 14, 15, 30, 44, 45) with the flash-rate and harness tests 23/23.
- Human check: not run by a person. Both checks above are open.
- Follow-ups: the two human checks; a design review of the opaque caption panel over footage; an overlap option, if authors need overlapping cues, needs its own decision.
