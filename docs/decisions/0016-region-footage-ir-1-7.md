# ADR-0016: Region footage and IR 1.7

- Status: accepted
- Date: 2026-10-16
- Task: 043
- PRD: §5.4 (10), §5.5, §6.1 (3), §6.2

## Context
`split-screen` shows simultaneous regions, each with its own footage (PRD §6.1
item 3: a named slot). IR 1.6 places media only as `background` or `framed`, and
one `.video` block is allowed per scene (ADR-0013 and task 038). Without an IR
change a manifest cannot say which region a clip belongs to.

## Options
1. **Region as a placement value** (`placement="left"`): matches PRD §6.2 but
   changes the filter's rule that an unknown placement is `E_VIDEO_BLOCK`, and
   test_media.lua pins that rule.
2. **Region as its own attribute** (chosen): `.video region="left"`. The
   placement stays `background` or `framed` for the other components.
3. **Image regions in the same change.** Rejected: IR 1.6 media is video only,
   and an image block needs its own IR decision (follow-up).

## Decision
1. **Syntax.** `::: {.video src="assets/a.mp4" region="left" fit="cover" audio="mute"}`.
   A region block takes no `placement` and no `frame`. Its `region` is an
   identifier (`^[a-z][a-z0-9-]*$`). A scene may hold one block per region, and
   only region blocks may repeat: a second background or framed block is still
   `E_VIDEO_BLOCK`.
2. **IR 1.7** (`schema/ir-1.7.json`, additive under ADR-0007): a media item's
   `placement` may be `region`, and such an item carries `region` (the
   identifier). `region` is absent for other placements. IR 1.6 and earlier are
   unchanged. Region items have no `frame`.
3. **Version written.** The filter writes 1.7 when a scene has region footage,
   and 1.6 otherwise, so manifests without regions stay byte-identical to before.
   1.7 becomes the latest version that the gate accepts and the reader reads.
4. **Contract.** A region component lists `region` in `placements` and gives
   `regions: {min, max}`: the limit on how many regions a scene uses. Its region
   names are its slots. The validator checks the names (`E_SLOT_UNKNOWN`, which
   lists the valid regions), the count (`E_REGION_COUNT`), and that a region holds
   either its text or its footage (`E_SLOT_CONSTRAINT`).
5. **Validation.** Each region's video goes through stage 3 separately: its file,
   its source range, its short-source rule (ADR-0008, task 038).

## Consequences
- `split-screen` (task 043) is the only component that takes region footage.
- Image footage in regions is not supported: IR media stays video only. A
  follow-up needs an IR bump and its own ADR.
- Every IR reader must accept `region`; the TypeScript types and renderer
  change with it.

## Verification
- `packages/ir/test/v17.test.ts`, `frozen.test.ts` (1.7 hash).
- `_extensions/video/tests/test_media.lua` (region blocks; the placement rule unchanged).
- `packages/validator/test/split-screen*.test.ts`; `renderer/remotion/test/split-screen-layout.test.ts`.
- `tests/integration/component-split-screen.test.ts`; visual `split-screen-*`.

## References
- PRD §5.4, §5.5, §6.1, §6.2; ADR-0004, ADR-0007, ADR-0008, ADR-0013, ADR-0014.
