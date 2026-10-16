# 038 — `.video` block and source ranges

Phase 4 · Status: done · Depends on: 037 · PRD: §6.1, §6.2, §8.3 · ADR: reads 0003

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
- [x] `sourceEnd` beyond file duration → PRD §9.2 message with line.
      (`tests/integration/media-range.test.ts`; `packages/validator/test/media-range.test.ts`)
- [x] `sourceStart ≥ sourceEnd`, `playbackRate ≤ 0`, `loop`+`freeze`,
      missing `audio` → distinct errors. (`_extensions/video/tests/test_media.lua`)
- [x] 2 s source in a 4 s scene: no flag → `E_MEDIA_SHORT_SOURCE`;
      `loop` or `freeze` → valid. (`media-range.test.ts`; `media-range.test.ts` integration)
- [x] Source-time and timeline-time fields never mixed (schema test).
      (`packages/ir/test/v16.test.ts`)

Human check:
1. `npx video validate tests/fixtures/projects/media-range-overrun` →
   `sourceEnd exceeds the source duration of "assets/clip.mp4".`
2. Add `loop="true"` in a copy of `media-range-short` → validates.

## Notes
- Correction: the task said "IR schema 1.1", but the IR was already at 1.5 (ADR-0015). This task adds IR 1.6 (`ir-1.6.json`, additive minor, ADR-0007). `ir-1.5.json` and older are frozen and unchanged. No new ADR: ADR-0007 covers the minor version and ADR-0008 the formats.
- One `.video` per scene; a second one is `E_VIDEO_BLOCK`. Placement is `background` or `framed` only; slot placement is task 043.
- Frame names are `browser`, `phone`, `tablet`, `generic` until the 040 registry exists. `frame` is required with `framed` and is an error otherwise.
- Audio accepts only `mute`. The task text says `mute|keep`, but `keep` is the source audio policy of task 044; `audio="keep"` is `E_VIDEO_BLOCK`, "not supported yet".
- `alt` is optional (default `""`). Defaults: `placement` background, `fit` contain (as image blocks, ADR-0013), `sourceStart` 0, `loop` and `freeze` false, `playbackRate` 1.
- Source times are source frames at the project fps (ADR-0003 rounding). Zero is a valid `sourceStart`. Time syntax errors come from `lib/duration.lua` (`E_DURATION_SYNTAX`, `E_DURATION_RANGE`).
- `playbackRate` is written as a JSON number through `json.decimal`, which writes a validated numeral as-is. `json.encode` stays integer-only (`test_json.lua` pins it).
- Range rule: available = round(probed seconds x fps). A source is short when (`sourceEnd` or the file's end, minus `sourceStart`) / `playbackRate` is less than the scene's frames, unless `loop` or `freeze` is set. Footage is never stretched.
- Lines: `E_MEDIA_*` findings report the scene's opening line, as image references do; the IR has no per-block line.
- Fixtures: `media-range-{overrun,short,loop,freeze}`. Each `assets/clip.mp4` is a copy of the generated 2 s clip (gitignored). `tests/fixtures/media/generate.sh` writes it, and the integration tests run it first. A fresh clone needs that script before `video validate` on these projects.
- Follow-ups (not this task): block-level source lines (IR); rendering (039, 040); `keep` audio (044); frame names from the registry (040); the DSL version key (ADR-0007, open for a human).

## Completion log

- 2026-10-16: `.video` blocks parse into IR 1.6 `media` (lib/media.lua, lib/media_props.lua); the validator checks each source range against the probed duration (stage 3: E_MEDIA_RANGE, E_MEDIA_SHORT_SOURCE, pure in stages/media-range.ts). IR 1.6 is additive (ir-1.6.json; 1.5 and older frozen). Commits: 97507d2 (start), d67c942 (IR 1.6), adec620 (filter), 6c4a7df (stage 3), a1f5418 (components reference), then this log.
  Tests (`mise run test`, exit 0): scripts 19/19; unit 738/738 (82 files); Lua 239/239; integration 134/134 (pure) + 7/7 (vitest) + 46/46 (render), 0 failures (includes media-range.test.ts); visual 23/23 (exit 0). `mise run check`: exit 0 (line limit, format, lint, typecheck).
  Human check:
  1. `mise exec -- npx video validate tests/fixtures/projects/media-range-overrun` → exit 1: `ERROR index.qmd:5` / `sourceEnd exceeds the source duration of "assets/clip.mp4".` / `Referenced by scene "scene-001".` The line is the scene's opening line (see Notes). Bare `npx video` needs `mise exec --` here, because quarto is not on PATH outside mise.
  2. A copy of media-range-short with `loop="true"` → validates, exit 0 (checked by the integration test "short with loop added to a copy validates").
  Follow-ups: block-level source lines in the IR (E_MEDIA_* report the scene line); rendering in 039 and 040; audio `keep` in 044; frame names from the 040 registry; a human decision on a DSL version key (ADR-0007).
