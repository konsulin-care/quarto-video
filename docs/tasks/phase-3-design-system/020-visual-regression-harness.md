# 020 — Visual regression harness

Phase 3 · Status: done · Depends on: 019 · PRD: §13.3 · ADR: —

## Goal
Render chosen frames of fixture projects to stills and compare them with
approved references, producing a reviewable diff report.

## Scope
- In: case format `tests/visual/cases/<case>.json` (project, frames,
  threshold); still rendering via Remotion; pixel diff with tolerance;
  HTML report with reference/actual/diff; approve command; CI job.
- Out: cases for future components (each component task adds its own).

## Deliverables
- `tests/visual/run.ts`, scripts `test:visual`, `test:visual:approve`.
- First case `title-basic` with references.
- Review process documented in `tests/README.md`.

## Definition of done
Automated:
- [x] Unchanged code → `npm run test:visual` passes (`tests/visual/run.ts`: 2 frames, 0 pixels differ).
- [x] Self-test: perturbing a token makes the harness fail and write diff images (`tests/visual/harness.test.ts`, run by `test:visual`).
- [x] CI runs `test:visual` and uploads the report on failure (`.github/workflows/ci.yml`, job `visual`; not yet run on GitHub).

Human check:
1. [x] `npm run test:visual` → pass.
2. [x] Accent change → fails. Met 2026-10-15 through `statement-basic` (task 025, which draws `accent` on `strong`): `modern.json` accent `#FF3366` → frame 330 0.570% of pixels differ, frame 420 0.973% (max channel change 153); re-run and reverted. Earlier evidence: `text` → `#FFFFFF` fails (6.403% of pixels differ), and `report/index.html` shows the diff in red.

## Notes
- `accent` is declared in the theme but not drawn by any released component; the placeholder `title` uses `text`, the font and `background`. A perturbed accent cannot fail a case until a component draws it. Not changed here: the title contract is task 024's. Follow-up: an accent case when the first component uses it.
- The theme loader enforces AA contrast, so a token that breaks contrast (for example `text` `#FF2D2D`, 4.37:1 on `surface`) stops at validation: `visual: validate ... exited 1` and no report. The self-test perturbs tokens in memory and so bypasses the loader.
- Stills: `renderStills()` (`renderer/remotion/src/still.ts`) shares bundle and input props with `render()`. Its `tokens` option is the self-test seam only.
- Frames come from `video validate --print-ir` on a scratch copy of the fixture, so authors and tests see the same IR. The case, not the front matter, names the theme.
- PNG decode/encode and the diff use the pinned ffmpeg; no npm dependency. Reports are gitignored; references are committed.
- The `visual` CI job duplicates the suite that `mise run test` already runs in `check-and-test` (tests/README.md requires the latter); the job exists to upload the report.
- References were approved on Linux with Chromium headless shell 1194. CI rasterisation may differ; the case tolerance absorbs small differences, and a CI failure shows in the uploaded report.
- Not verified: the GitHub workflow itself (no GitHub access from this session; `actionlint` not installed). `upload-artifact` is pinned to v4.6.2 (`ea165f8d…`) from `git ls-remote`.

## Completion log

### 2026-10-15 — done
- Added the harness: `tests/visual/run.ts` (`test:visual`, `test:visual:approve -- [case]`), `cases.ts` (case validation), `harness.ts` (project → IR → stills → compare or approve), `compare.ts` (pixel tolerance), `png.ts` (ffmpeg I/O), `report.ts` (HTML), `harness.test.ts` (self-test).
- Renderer: `renderStills()` in `renderer/remotion/src/still.ts`; `render()` and `renderStills()` share `inputPropsFor()` and `bundleEntry()`.
- First case `title-basic` (`cases/title-basic.json`, fixture `tests/fixtures/projects/title-basic`, 640x360, frames 0 and 29) with approved references.
- Docs: `tests/README.md` (Visual review), `AGENT.md` Commands, `renderer/remotion/README.md`, `docs/components/title.md`.
- Tests: `harness.test.ts` (5: four case-file error paths, one perturbed token). `test:visual` passes unchanged and fails on a changed `text` token.
- Gates: `mise exec -- scripts/check.sh --all`: passed. `mise exec -- scripts/test.sh --all`: passed (scripts 16; unit 44 files, 331 tests; lua 193; integration 5 vitest and 110 tsx checks; visual 2 frames and 5 self-test checks)
- 2026-10-15: human check 2 (accent) is now met through `statement-basic` (task 025 draws `accent`). Re-verified: accent `#FF3366` makes the case FAIL at 0.570% (frame 330) and 0.973% (frame 420) of pixels; reverted.
- Human check 2 (accent) was not met as written on the day of this task; see Notes. Follow-ups: (1) accent case with its first component (024); (2) confirm the `visual` CI job on GitHub and, if CI rasterisation differs, approve from CI output; (3) drop the duplicate visual run from `check-and-test` once the job is trusted.
