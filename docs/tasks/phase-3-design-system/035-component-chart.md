# 035 — Component `chart`

Phase 3 · Status: done · Depends on: 024 · PRD: §5.4 (7), §12, §5.5, §10.2 · ADR: 0014

## Goal
Release the `chart` component: data visualisation from a defined chart specification.

## Scope
- In: chart spec as attributes: `type=bar|line`, `data=data/<file>.csv`, `x`, `y`, `unit`, `title`; CSV parsed by the validator (no code execution); labels and units always rendered; colour not the only encoding (direct labels).
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/chart.json`.
- Renderer `renderer/remotion/components/chart/` + `registry-map.ts` entry.
- Docs `docs/components/chart.md` from the component template.
- Fixture `tests/fixtures/projects/component-chart/` (valid) and
  `component-chart-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/chart-*.json` with references.

## Definition of done
Automated:
- [x] Contract validates; parity test passes; `video components` lists `chart`.
- [x] Each contract violation in the invalid fixture yields its code and line (`component-chart-invalid`, `component-chart-data-invalid`).
- [x] Unknown column name → error naming available columns (`E_COLUMN_UNKNOWN`).
- [x] Malformed CSV → error with CSV line number (`E_CSV_SYNTAX`).
- [x] Visual cases: bar and line with 3 and 12 points (`chart-bar-3`, `chart-bar-12`, `chart-line-3`, `chart-line-12`).
- [x] Every compatible animation renders without clipping: `chart-animations` samples fade-in, slide-up and the reveal entrance (frames 422, 430, 438, viewed).

Human check:
1. [ ] Awaiting human playback: watch `video render tests/fixtures/projects/component-chart` in motion (see Notes).
2. [ ] Awaiting human review against `docs/components/chart.md`. The agent checked stills (see Notes); not ticked.
3. [x] `video validate` on `component-chart-invalid`: seven errors, one per scene; `component-chart-data-invalid`: four, one per scene.

## Notes
- ADR-0014 (IR 1.4): scene `props` and validator-written `tables` on top of IR 1.3 (image, ADR-0013). The filter passes non-scene attributes on; stage 2 checks props, stage 3 reads CSV (only after stage 2 passes).
- Merged `worktree-agent-ab787a0ebaa231aec` with `--no-ff`. The chart's IR 1.3 and ADR-0013 became IR 1.4 and ADR-0014; image keeps IR 1.3 and ADR-0013. Shared-file conflicts were unions.
- Fixed in this task: `video render` gave the renderer the raw filter manifest, so chart tables were missing and charts drew only their title. It now writes the validated IR to `.video-build/resolved.json` and renders that. Regression: `tests/integration/component-chart.test.ts`.
- `reveal` is now a fade with growth from 96% (task 021 redesign), so no entrance clips; the old wipe deviation is gone.
- Awaiting human playback: `video render tests/fixtures/projects/component-chart` (18 s, 1080p). Agent stills at 3 s, 9 s and 17.5 s were legible, labelled with units, theme tokens only, no clipping. Not ticked.
- Known limit: text is not shrunk; 12 long labels at 640x360 can crowd (rotation applies).
- 2026-10-15: the regression test (`component-chart.test.ts`) no longer needs `QV_BROWSER_EXECUTABLE`. Its stub renderer calls `runRender` directly, and the browser preflight had run inside `runRender`. Preflight now runs at the CLI boundary (`cli.ts` passes it as `RenderOptions.preflight`). `video render` still exits 2 without the variable (`cli-browser-gate.test.ts`).

## Completion log
- 2026-10-15: merged the chart branch; IR 1.4 and ADR-0014 renumber; `video render` fix (the transient `.video-build/resolved.json` is removed after the render). `check.sh --all` exit 0. `test.sh --all` exit 0 (scripts 16/16, unit 569/569, lua 214/214, integration with no failures, visual 163 frames and flash checks). Log: `scratchpad/chart-test-final.log`.
- `test:visual` run: 160 frames matched before the three additions, 163 after. `chart-animations` gained frames 422, 430 and 438 (reveal entrance); all three viewed, then approved. Existing references did not change.
- `video render` on `component-chart` exit 0; output MP4 deleted. `video validate component-chart-invalid`: seven errors, one per scene (lines 9–27). `component-chart-data-invalid`: four, one per scene.
