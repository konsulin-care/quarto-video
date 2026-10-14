# 005 — `video validate`

Phase 1 · Status: done · Depends on: 003 · PRD: §4.2, §9.1 · ADR: —

## Goal
`video validate <path>` resolves a project from a directory or a `.qmd`
file, runs the filter and IR schema check, and reports OK or errors with
correct exit codes, independent of the current directory.

## Scope
- In: `bin` entry `video` in `packages/cli`; project resolution rules from
  `packages/cli/README.md`; running the task-003 filter; `validateIr`;
  `--print-ir` (IR JSON to stdout); exit codes 0/1/2.
- Out: diagnostics formatting (008), contract checks (014), assets (016).

## Deliverables
- `packages/cli/src/commands/validate.ts`, `src/project.ts` (resolution).
- Output on success: `OK <project-name> (<n> scenes, <frames> frames)`.
- Integration tests in `tests/integration/validate.test.ts`.
- `AGENT.md` Commands and `packages/cli/README.md` updated.

## Definition of done
Automated:
- [ ] Directory input and explicit `.qmd` input produce identical IR.
- [ ] Running from another cwd (e.g. `os.tmpdir()`) gives identical results.
- [ ] Missing path or no `index.qmd` → exit 2, message names the path.
- [ ] Schema-invalid IR (fixture with `duration="0s"`) → exit 1.
- [ ] `--print-ir` stdout parses as JSON and nothing else is on stdout.

Human check:
1. `npx video validate tests/fixtures/projects/minimal-filter` →
   `OK minimal-filter (2 scenes, 240 frames)`, `echo $?` → 0.
2. `cd /tmp && npx video validate <repo>/tests/fixtures/projects/minimal-filter/index.qmd`
   → same output.
3. `npx video validate does/not/exist` → clear error, `echo $?` → 2.

## Notes
- Schema-invalid fixture is `tests/fixtures/projects/cli-validate-invalid-ir`
  (a blank scene body, IR error `/scenes/0/content/text`). `duration="0s"` is
  rejected by the Lua filter before IR (exit 1, filter message), so it is not used.
- `--print-ir`: the OK line moves to stderr; an IR that fails the schema prints
  nothing on stdout (chosen: conservative, no unvalidated IR on stdout).
- Filter rejections print `<document>: <message>`; Quarto's own exit code
  (83 for Lua errors) is not propagated, the CLI exits 1.
- `bin/video.mjs` loads TypeScript through tsx: a `#!/usr/bin/env tsx` shebang
  fails outside `node_modules/.bin`, and `node --import tsx` resolves from cwd.
- `npx video` resolves only inside the repo; use `npm exec --prefix <repo> -- video`.

## Completion log
- 2026-10-14: `video validate <path> [--print-ir]` in packages/cli: project
  resolution (`src/project.ts`), filter run via `quarto pandoc` (`src/filter.ts`),
  `validateIr`, exit codes 0/1/2. Summary `OK <name> (<n> scenes, <frames> frames)`.
  Tests: `tests/integration/validate.test.ts` (12 cases: dir vs file IR identity,
  cwd independence, exit 2 paths, exit 1 filter and IR errors, `--print-ir`).
  Gates: `npm run check|test|test:lua|test:integration`, `scripts/check.sh --all`,
  `scripts/test.sh --all` exit 0. A fresh `npm ci` links the `video` bin.
- Follow-ups: CI not verified. Human check 2 unverified in its literal form
  (`cd /tmp && npx video ...`): npx there would fetch an unrelated package; checked
  instead with `npm exec --prefix <repo> -- video validate <abs .qmd>` (OK, exit 0).
  Checks 1 and 3 run from the repo root as written (OK, exit 0 and exit 2).
