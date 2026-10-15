# 020 — Visual regression harness

Phase 3 · Status: in-progress · Depends on: 019 · PRD: §13.3 · ADR: —

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
- [ ] Unchanged code → `npm run test:visual` passes.
- [ ] Self-test: perturbing a token makes the harness fail and write diff
      images.
- [ ] CI runs `test:visual` and uploads the report on failure.

Human check:
1. `npm run test:visual` → pass.
2. Change the accent colour in `themes/modern.json`, rerun → fails; open
   `tests/visual/report/index.html` and see highlighted differences; revert.

## Notes

## Completion log
