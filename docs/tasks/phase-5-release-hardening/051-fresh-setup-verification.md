# 051 — Fresh-setup verification

Phase 5 · Status: in-progress · Depends on: 050 · PRD: §13.4, §15 (Phase 5 exit), §16 · ADR: —

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
- [x] Checklist test: every §16 bullet has an evidence link that exists.

Human check:
1. On a machine without the repo, follow `docs/guides/installation.md` and
   then the README quickstart; `videos/demo/output.mp4` is produced and plays.
2. Read the acceptance checklist; every criterion is marked with evidence.

## Notes
Phase 5 exit criterion and v1 release readiness are met when this is done.

## Completion log
- 2026-10-20: fresh-setup verification and the PRD §16 checklist (commit 539fa19, Task: 051).
  Added `.github/workflows/fresh-setup.yml` (clean ubuntu-latest, no cache, pinned actions),
  `scripts/fresh-setup.sh` (runs the sh blocks of `installation.md` in a new clone; checks
  `videos/demo` with ffprobe, a full decode and `scripts/fresh-setup-check.ts` against the IR),
  `docs/guides/acceptance-checklist.md` (one row per PRD §16 bullet, read by
  `tests/integration/acceptance-checklist.test.ts`, in `test:integration:pure`, about 1 s, 4 tests).
  Guide: step 2 says how npm gets the pinned Node, step 4 gives a pinned browser install
  (Playwright 1.56.1). Stale IR version lines fixed in the validator and IR READMEs.
  Tests: `scripts/tests/test_fresh_setup.sh` (3 tests); `acceptance-checklist.test.ts` 4/4;
  `docs.test.ts` 15/0.
  Gates and runs, with exit codes:
  - `mise exec -- mise run check`: EXIT 0.
  - `mise exec -- npx tsx --test tests/integration/acceptance-checklist.test.ts`: EXIT 0, 4/4.
  - Local fresh-setup from HEAD 539fa19: `scripts/fresh-setup.sh file:///home/user/quarto-video <scratch>/fresh-run-1`
    in a plain shell (Node 22 on PATH; the script activates mise tools after step 2),
    `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`. Result: `fresh setup: PASS`, `EXIT=0`
    (log: scratchpad `fresh-run-1.log`; logs in `fresh-run-1/logs`). Output: hello-world
    `OK (6 scenes, 150 frames)`, my-video `OK (3 scenes, 360 frames)`, demo
    `OK demo (8 scenes, 1056 frames)`, `output.mp4` plays and matches its IR: 1056 frames,
    1920x1080, 30 fps. The browser step ran `playwright install --with-deps` (apt worked).
  - `mise exec -- mise run test` (full, background, about 35 min): EXIT 0. scripts 22/0;
    unit 120 files, 1171/0; lua 308/0; integration pure and render groups passed (render
    vitest 3 files, 7/0); visual 320 frames, harness and flash passed.
  - Workflow YAML: parsed with PyYAML, EXIT 0. js-yaml is not in `node_modules`.
  Not verified here: the GitHub job itself (it has not run on GitHub), macOS and Windows.
  Status stays `in-progress` until the job passes on GitHub, so the first Automated box is unchecked.
  Human checks 1 and 2: open, not performed.
  Tests covering the change: `acceptance-checklist.test.ts`, `docs.test.ts`, `scripts/tests/test_fresh_setup.sh`.
  Follow-up: first GitHub run of `fresh-setup.yml`; then set Status to done and check the first box.
