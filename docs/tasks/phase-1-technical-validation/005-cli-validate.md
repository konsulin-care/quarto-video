# 005 — `video validate`

Phase 1 · Status: todo · Depends on: 003 · PRD: §4.2, §9.1 · ADR: —

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

## Completion log
