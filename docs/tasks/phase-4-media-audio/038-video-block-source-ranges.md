# 038 — `.video` block and source ranges

Phase 4 · Status: in-progress · Depends on: 037 · PRD: §6.1, §6.2, §8.3 · ADR: reads 0003

## Goal
Authors declare footage with a `.video` block; its source range, playback
rate and short-source behaviour are validated against the real file and
stored in the IR separately from timeline time.

## Scope
- In: confirm the PRD §6.1 nesting/attribute syntax parses (multi-line
  attributes); props `src`, `placement`, `fit`, `frame`, `sourceStart`,
  `sourceEnd`, `audio` (required), `loop`, `freeze`, `playbackRate`, `alt`;
  IR `media[]` with `sourceStartFrames`, `sourceEndFrames`; short-source
  rule: error unless `loop` or `freeze` (mutually exclusive); never stretch.
- Out: rendering placements (039+), audio mixing (044).

## Deliverables
- Lua parsing in `_extensions/video/lib/media.lua`; DSL reference rows.
- IR schema `1.1` (minor, per ADR-0007) with `media`.
- `packages/validator/src/stages/media.ts`; fixtures `media-range-*`.

## Definition of done
Automated:
- [ ] `sourceEnd` beyond file duration → PRD §9.2 message with line.
- [ ] `sourceStart ≥ sourceEnd`, `playbackRate ≤ 0`, `loop`+`freeze`,
      missing `audio` → distinct errors.
- [ ] 2 s source in a 4 s scene: no flag → `E_MEDIA_SHORT_SOURCE`;
      `loop` or `freeze` → valid.
- [ ] Source-time and timeline-time fields never mixed (schema test).

Human check:
1. `npx video validate tests/fixtures/projects/media-range-overrun` →
   `sourceEnd exceeds the source duration of "assets/clip.mp4".`
2. Add `loop="true"` in a copy of `media-range-short` → validates.

## Notes

## Completion log
