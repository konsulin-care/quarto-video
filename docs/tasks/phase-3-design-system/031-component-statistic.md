# 031 — Component `statistic`

Phase 3 · Status: done · Depends on: 024 · PRD: §5.4 (4), §5.5, §10.2 · ADR: writes ADR-0015

## Goal
Release the `statistic` component: headline number with label and optional context.

## Scope
- In: props `value` (number, required), `unit`, `prefix`, `decimals`; slots `label` (required) and `context` (optional). Number formatting is deterministic and locale-fixed (documented).
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/statistic.json`.
- Renderer `renderer/remotion/components/statistic/` + `registry-map.ts` entry.
- Docs `docs/components/statistic.md` from the component template.
- Fixture `tests/fixtures/projects/component-statistic/` (valid) and
  `component-statistic-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/statistic-*.json` with references.

## Definition of done
Automated:
- [x] Contract validates; parity test passes; `video components` lists `statistic`.
  (`packages/registry/test/contract.test.ts`, `renderer/remotion/test/registry-parity.test.ts`, `tests/integration/component-statistic.test.ts`)
- [x] Each contract violation in the invalid fixture yields its code and line.
  (`component-statistic-invalid/expected.json`, checked by `component-statistic.test.ts`)
- [x] `value="abc"` → type error (`E_PROP_TYPE`).
  (`component-statistic.test.ts`, `packages/validator/test/props-number.test.ts`)
- [x] Large values (1e9) format with the documented separators; visual case.
  (`renderer/remotion/test/statistic-format.test.ts`; `tests/visual/cases/statistic-large.json`)
- [x] Every compatible animation renders without clipping (visual cases).
  (`tests/visual/cases/statistic-animations.json`: fade-in, slide-up, reveal end state and mid-entrance)

Human check:
1. `npx video render tests/fixtures/projects/component-statistic` and watch it.
2. Review against `docs/components/statistic.md`: legible at 1080p, consistent
   with the theme, no clipped or overlapping text.
3. `npx video validate tests/fixtures/projects/component-statistic-invalid` → one
   actionable error per violating scene.

## Notes
- IR 1.5 (ADR-0015): IR 1.4 props were strings only, so a number cannot reach the
  renderer as a number. 1.5 allows number prop values; the validator writes them.
  The filter writes 1.5; `ir-1.4.json` and older keep their hashes; golden manifests record "1.5".
- Number props: `min`, `max` and `integer` were added to the contract schema
  (ADR-0015), so `decimals` and `value` have bounds. `value` is limited to ±1e15.
- Formatter for task 032: `formatNumber(value, decimals)` in
  `renderer/remotion/components/statistic/format.ts` (`,` thousands, `.` decimal).
- Existing tests changed because the decision changed them: the unknown-id example
  (`statistic` → `gallery`), the `reveal` component list, the numeric-prop rejection
  (now accepted), the available-components lists, and the supported-version messages.
- Known limits (docs page): the number is never shrunk below 40px; label and context are not fitted.
- Awaiting human playback: watching `output.mp4` in motion (human check 1). Rendered
  with exit 0 (1920x1080, 30 fps, 390 frames); the MP4 was removed from the fixture after stills were checked.

## Completion log
- 2026-10-15: done. Commits (in order): docs(tasks) start; docs(decisions) ADR-0015;
  feat(ir) IR 1.5; feat(registry) number props; feat(validator) E_PROP_TYPE;
  feat(registry) statistic component; test(integration) component list.
- Gates: `scripts/check.sh --all` exit 0 ("check: passed"). `scripts/test.sh --all`
  exit 0 (scripts, unit 617, lua 214, integration, visual 180 frames). `npm run test:visual` exit 0.
  Logs in the session scratchpad (`statistic-test.log`, `visual-run.log`).
- Checks: `video validate` on the invalid fixture: 11 errors, one per scene, exit 1.
  Stills at 0.5s, 4.5s and 12.5s of the valid render checked for legibility, theme and clipping.
- Tests covering the change: `packages/ir/test/v15.test.ts`, `packages/validator/test/props-number.test.ts`,
  `packages/registry/test/contract.test.ts`, `renderer/remotion/test/statistic-format.test.ts`,
  `tests/integration/component-statistic.test.ts`, visual `statistic-basic|large|animations`.
