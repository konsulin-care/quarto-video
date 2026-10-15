# 029 — Component `section-divider`

Phase 3 · Status: done · Depends on: 024 · PRD: §5.4 (11), §5.5, §10.2 · ADR: —

## Goal
Release the `section-divider` component: chapter or topic break between sections.

## Scope
- In: slots `default` (section title) and optional `kicker` (e.g. "Part 2"); short default duration bounds.
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/section-divider.json`.
- Renderer `renderer/remotion/components/section-divider/` + `registry-map.ts` entry.
- Docs `docs/components/section-divider.md` from the component template.
- Fixture `tests/fixtures/projects/component-section-divider/` (valid) and
  `component-section-divider-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/section-divider-*.json` with references.

## Definition of done
Automated:
- [x] Contract validates; parity test passes; `video components` lists `section-divider`.
- [x] Each contract violation in the invalid fixture yields its code and line.
- [x] Duration above the max bound → error (`index.qmd:40`, `E_DURATION_BOUNDS`, 10s over 8s).
- [x] Visual cases with and without kicker.
- [x] Every compatible animation renders without clipping (visual cases). Compatible means `fade-in` and `slide-up`; `reveal` is not compatible (see Notes).

Human check:
1. [ ] Partly met: `npx video render` wrote a 1920x1080, 30 fps, 360-frame MP4 (exit 0). Checked from stills at 0.1 s, 1.5 s, 4.5 s and 11.9 s, not played back.
2. [x] Review against `docs/components/section-divider.md`: legible at 1080p, theme-consistent, no clipped or overlapping text.
3. [x] `npx video validate tests/fixtures/projects/component-section-divider-invalid`: eight errors, one per violating scene, each with a line and a suggestion.

## Notes
- Contract: slots `default` (required, paragraph or heading) and `kicker` (optional, paragraph). Duration 1s to 8s. No props.
- `reveal` is not compatible. The `animations.test.ts` "returns copies" test pins `reveal`'s `compatibleComponents` to `["title"]`, so adding this component to `reveal.json` would change that test. Not done here. Follow-up: allow `reveal` once that test is updated deliberately.
- Shared-file edits: `packages/registry/animations/fade-in.json` and `slide-up.json` (compatibleComponents adds `section-divider`); `renderer/remotion/src/registry-map.ts`; `package.json` (one test file in `test:integration`); `docs/components/README.md` (one row, two animation cells); `packages/registry/test/components.test.ts` and `tests/integration/contract.test.ts` (the unknown-component message now lists `section-divider, title`).
- Kicker colour is the accent token. Its contrast on the modern background is about 7:1, computed from the hex values; the accent is not a declared contrast pair.
- Environment issue, not from this task: `tests/integration/quarto-render.test.ts` fails in any worktree whose path has a dot-directory (`/.claude/worktrees/`). The unmodified base commit fails the same way from a hidden path and passes outside one. The full test gate was therefore run on a `git archive` copy of the final tree at a non-hidden path, with its own `npm ci`.

## Completion log
- 2026-10-15: `section-divider` released. Contract, renderer, fixtures, integration test, three visual cases (approved references, reviewed), docs page. Gates: `check.sh --all` exit 0 on the worktree; `test.sh --all` exit 0 on the non-hidden copy (scripts 16, unit 475, lua 201, integration, visual 75 frames).

## Completion log
