# scripts/ — check and test runners
Status: Gates in place (task 000). Decision: ADR-0010. Policy: `docs/testing.md`.

## Entry points
| Script | Used by | Does |
| --- | --- | --- |
| `check.sh [--staged\|--push\|--all]` | pre-commit, pre-push, `mise run check` | line limit → format → lint → typecheck |
| `test.sh [scope] [--suite NAME]...` | pre-push, `mise run test` | suites `scripts unit lua integration visual` |
| `check-line-limit.sh FILE...` | `check.sh` | fails on code files over 300 lines |
| `tests/run.sh` | `test.sh --suite scripts` | self-tests of these scripts |

Scopes: `--staged` = staged files, `--push` = files changed since the
upstream (or remote default branch), `--all` = every tracked file.
`--all` runs every suite; other scopes leave out `visual` (CI only).

## Tools per language
| Files | Format | Lint |
| --- | --- | --- |
| `*.sh` | `shfmt -i 2 -ci` | shellcheck (`.shellcheckrc`) |
| `*.lua` | StyLua | selene |
| `*.ts *.tsx *.js *.mjs *.cjs` | Prettier | ESLint (`--max-warnings 0`) |
TypeScript is typechecked with `npm run typecheck` (pre-push and CI only).
Fix shell formatting with `shfmt -w -i 2 -ci <file>`.

## Rules
- Fail fast: `set -euo pipefail`; the first failing step stops the run.
- Skip, never pass silently: a step with no files, or whose runner does
  not exist yet (no `package.json`, no npm script), prints `skip: <why>`.
  A missing pinned tool is an error (`run 'mise install'`).
- Only code files are checked (`CODE_RE` in `lib/common.sh`).
- Every behaviour of these scripts has a test in `tests/test_*.sh`
  (`test_<behaviour>` functions, each in a fresh temp git repo).
- Scripts must not use the network.
