# 043 — Component `split-screen`

Phase 4 · Status: done · Depends on: 039 · PRD: §5.4 (10), §6.1 (3), §5.5 · ADR: —

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
- [x] Contract validates; parity test passes; `video components` lists `split-screen`. (`packages/registry/test/regions.test.ts`, `components.test.ts`; `renderer/remotion/test/registry-parity.test.ts`; `tests/integration/component-split-screen.test.ts`)
- [x] Each violation in the invalid fixture yields its code and line. (`tests/integration/component-split-screen.test.ts` against `component-split-screen-invalid/expected.json`: seven diagnostics on lines 12, 18, 18, 33, 41, 52, 61)
- [x] 4 regions → error with the limit. (`component-split-screen.test.ts`: "a scene with four regions"; `packages/validator/test/regions.test.ts`)
- [x] Two clips with different source ranges both play correctly (frame counters). (`tests/integration/component-split-screen-frames.test.ts`: left from 1 s reads 40 and 70, right from 0 s reads 10 and 40 at frames 10 and 40)
- [x] Region placed media in an unknown slot → error naming valid slots. (`component-split-screen.test.ts`: "footage in a region the component does not have"; `packages/validator/test/regions.test.ts`)

Human check:
1. `npx video render tests/fixtures/projects/component-split-screen` and watch it.
2. Review against `docs/components/split-screen.md`: framing, legibility, theme
   consistency, nothing clipped.
3. `npx video validate tests/fixtures/projects/component-split-screen-invalid` →
   one actionable error per violating scene.

## Notes
- Decision (ADR-0016, accepted; the header says ADR "—", so this is a change of plan): IR 1.6 places media only as `background` or `framed`, and one `.video` per scene, so a clip cannot name its region. Region footage is `.video region="<name>"`: IR 1.7 media `placement: "region"` plus `region`. The filter writes 1.7 only for a manifest with region footage; other manifests stay 1.6. `placement="left"` is still `E_VIDEO_BLOCK` (test_media.lua pins it).
- Regions are the component's slots (`left`, `middle`, `right`). The contract's `regions: {min: 2, max: 3}` is the limit. Region text and footage are exclusive per region (`E_SLOT_CONSTRAINT`). Each region's clip goes through stage 3 on its own.
- Image footage in regions is not supported: IR media is video only. Follow-up: an IR bump and an ADR for image regions.
- Follow-up: no `W_TEXT_FIT` for regions. The contract has no `textFit`; the renderer fits region text with `REGION_TEXT_FIT` (body to subtitle), shares one size per scene, and keeps words whole. A long word in a narrow column can still break at body size.
- A scene that names a region the component lacks gets `E_SLOT_UNKNOWN` and, when its count is then over the limit, `E_REGION_COUNT`: two errors for that scene (`component-split-screen-invalid` scene-002).
- Existing assertions that list the supported IR versions, the known components, or the component list in an error message gained the new entry (`versions`, `content`, `timeline`, `cli`, validator and render version messages; registry `components` and `animations` lists; `contract.test.ts`). No assertion was removed or loosened.
- `TextMedia` now draws its text through the shared `TextColumn` (same geometry); `text-media` visual cases still pass.
- Stray files at the filesystem root from earlier agents are still present: `/appr1.log`, `/check.log` and `/vis.log`. This task did not write them; the user must delete them.

## Completion log
- 2026-10-16: split-screen. Commits: a30a6c4 (status), 04c9051 (ADR-0016), 4a866d6 (IR 1.7), 9fc711a (registry contract and columns), b9b0bb7 (filter region attribute), 246cff3 (validator region checks), d61b5ab (renderer component), 4007774 (fixtures and integration tests), 7ab0e75 (shared region text size and visual references), 9794fc7 (docs), 4bab002 (contract message list), then this log.
  Summary: `split-screen` with three region slots, `region` footage per region through IR 1.7 (ADR-0016), count and region checks in stage 2, region clips checked per clip in stage 3, and a renderer that draws each region in its column with its own footage.
  Tests: `mise run check` passed (line limit 354 files; format; lint 0 errors; typecheck). `mise run test` passed: scripts 19/19; unit 970/970 (100 files); Lua 250/250; integration 228/228 (tsx suites) and 7/7 (render); visual passed (293 frames). Covering tests: `packages/ir/test/v17.test.ts`; `packages/registry/test/regions.test.ts`; `packages/validator/test/regions.test.ts`; `_extensions/video/tests/test_media.lua`; `renderer/remotion/test/split-screen-layout.test.ts`; `tests/integration/component-split-screen.test.ts`; `tests/integration/component-split-screen-frames.test.ts`; visual `split-screen-frames` and `split-screen-animations` (8 references).
  Human check: (1) `video render` of a scratch copy of component-split-screen exited 0: 640x360, 30 fps, 300 frames, no audio stream. I could not watch the motion. (2) Reviewed the 8 approved stills (frames 30, 90, 200, 280, 155, 175, 245, 265) against the docs page: framing per region (contain on the left and right clips, cover on the 4:3 clip), text beside footage, three regions, nothing clipped. This review found two faults, fixed in 7ab0e75: a word broke mid-word at title size in a three-region column, and two text regions drew at different sizes. (3) `video validate component-split-screen-invalid`: seven errors on six scenes (scene-002 has two, see Notes).
  Follow-ups: image footage in regions (IR bump and ADR); `W_TEXT_FIT` for regions; the two-error scene; delete `/appr1.log`.
