# 051 — Fresh-setup verification

Phase 5 · Status: todo · Depends on: 050 · PRD: §13.4, §15 (Phase 5 exit), §16 · ADR: —

## Goal
Prove the PRD §16 acceptance criteria from a clean machine using only the
published docs.

## Scope
- In: a clean container (CI job) that follows the installation guide
  verbatim (commands extracted from the guide), validates and renders
  `videos/demo`; a checklist mapping each PRD §16 criterion to the test or
  task that proves it.
- Out: new features. Gaps become new appended tasks.

## Deliverables
- `.github/workflows/fresh-setup.yml` (or equivalent script).
- `docs/guides/acceptance-checklist.md` — §16 criterion → evidence.

## Definition of done
Automated:
- [ ] Fresh-setup job passes on a clean image using only guide commands.
- [ ] Checklist test: every §16 bullet has an evidence link that exists.

Human check:
1. On a machine without the repo, follow `docs/guides/installation.md` and
   then the README quickstart; `videos/demo/output.mp4` is produced and plays.
2. Read the acceptance checklist; every criterion is marked with evidence.

## Notes
Phase 5 exit criterion and v1 release readiness are met when this is done.

## Completion log
