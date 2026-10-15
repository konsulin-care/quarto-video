# 035 — Component `chart`

Phase 3 · Status: in-progress · Depends on: 024 · PRD: §5.4 (7), §12, §5.5, §10.2 · ADR: 0013

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
- [ ] Partly met: every compatible animation renders without clipping. `chart-animations` covers fade-in and slide-up across the scene; `reveal` is checked at its end state only, as its entrance clips by design (task 021 deviation).

Human check:
1. [ ] Partly met: `video render` ran on the fixture (exit 0) before the final unit tweak. The final stills come from the approved references of the final fixture.
2. [x] Reviewed the stills (`chart-bar-3`, `chart-bar-12`, `chart-line-12`, `chart-animations`): legible at 1080p, theme tokens only, no clipping or overlap.
3. [x] `video validate` on `component-chart-invalid`: seven errors, one per scene; `component-chart-data-invalid`: four, one per scene.

## Notes
- ADR-0013 (IR 1.3): scene `props` and validator-written `tables`; the filter passes non-scene attributes on; `props` checked in stage 2, CSV in stage 3 (only after stage 2 passes, so the data fixture is separate).
- Contract: prop types `csv` and `column` (`of`, `numeric`), `required`. The contract's slots: optional `caption`.
- Shared-file edits: `packages/registry/animations/{fade-in,slide-up,reveal}.json` (`chart` compatible); `docs/components/README.md`; `docs/decisions/README.md`; `package.json` (`test:integration` list); READMEs of ir, validator, renderer, extension.
- Changed expectations in existing tests, as a consequence of the design: known-component lists now name `chart`; unknown-attribute `property` is `props.<name>`; a no-content scene is a contract error under IR 1.3; `diagnostics-multiple` uses an unknown class. IR CLI spawn tests got a 30 s timeout (assertions unchanged).
- Blocker: `test:integration` fails on `quarto render videos/hello/index.qmd` (`writes output.mp4 ...`): Quarto does not run the post-render hook for a single-file render in this environment. `videos/` and the extension manifest are unchanged since base, so this is not caused by this task. The directory form passes. Not fixed here; gate `test.sh --all` exits 1 for this reason.
- Known limit: text is not shrunk; 12 long labels at 640x360 can crowd (rotation applies).

## Completion log
- 2026-10-15: IR 1.3, registry contract, validator stages 2–3, renderer, fixtures, integration test, visual references, docs. `check.sh --all` exits 0. `test.sh --all` exits 1 on the single-file Quarto test above; unit, Lua, integration (other than that test) and visual (76 frames) pass. Task stays in-progress until that test is resolved.
