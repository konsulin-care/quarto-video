# 050 — User guides

Phase 5 · Status: done · Depends on: 049 · PRD: §14 (1, 12), §15 (Phase 5) · ADR: reads 0007

## Goal
Published documentation lets a new author install, author, validate, render,
extend and troubleshoot using nothing else.

## Scope
- In: `docs/guides/` — installation, authoring (DSL reference generated or
  checked against the extension README), CLI reference, diagnostics
  reference (every code with fix), extending (new component/preset
  checklist), troubleshooting, versioning and migration (from ADR-0007);
  starter template `videos/_template/`; root `README.md` quickstart.
- Out: website hosting.

## Deliverables
- `docs/guides/*.md`, `videos/_template/index.qmd`, updated `README.md`.
- Docs test: every code in the validator README appears in the diagnostics
  guide; every command in guides exists in `video --help`; every `.qmd`
  snippet in guides validates.

## Definition of done
Automated:
- [ ] Docs tests pass.
- [ ] `video validate videos/_template` → OK.

Human check:
1. Following only `docs/guides/authoring.md`, create a new project from
   `videos/_template`, add a statistic scene, render it.
2. Introduce three typical mistakes; for each, the diagnostics guide explains
   the fix.

## Notes
- Stale READMEs, not changed here: `packages/validator/README.md` lists IR versions
  only to 1.1 (E_IR_SCHEMA, E_IR_UNSUPPORTED_VERSION); `packages/ir/README.md` says
  `validateIr` reads to 1.11. The guides state 1.0 to 1.12.
- `video <command> --help` is a usage error (exit 2); there is no per-command help.

## Completion log
- 2026-10-20: user guides in `docs/guides/` (installation, authoring, cli,
  diagnostics, extending, troubleshooting, versioning; README index), the starter
  `videos/_template/index.qmd`, root README quickstart, and the docs test
  `tests/integration/docs.test.ts` (in `test:integration:pure`; about 8 s: 14 tests,
  incl. the 72 validator codes, command and flag names vs `video --help`, three
  qmd projects in authoring.md and the template; allow-list empty). Tests covering the change:
  docs.test.ts. Gates: `mise exec -- mise run check` EXIT=0. Docs test
  `npx tsx --test tests/integration/docs.test.ts` EXIT=0, 14/0. Template
  `npx video validate videos/_template` EXIT=0, no diagnostics (`--json` prints `[]`).
  hello-world validate EXIT=0. `mise exec -- mise run test` EXIT=0 in 35 min 55 s:
  scripts 19/0; unit 120 files, 1171/0; Lua 308/0; integration pure 173/0; render
  group 94/0 and vitest 7/0; visual 320 frames, harness and flash 24/0.
  Mutation check: a bogus command and a bad qmd project in a guide each fail the
  test; the guide was restored.
  Human checks: both open, not performed.
  Follow-up: the two stale README version lists above.
