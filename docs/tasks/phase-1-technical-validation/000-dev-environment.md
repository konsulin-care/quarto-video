# 000 — Development environment and quality gates

Phase 1 · Status: in-progress · Depends on: — · PRD: §11.1, §13, §14 · ADR: writes 0010

## Goal
Every contributor and agent gets the same pinned toolchain from one command,
dependencies stay current automatically, and broken code is rejected by
hooks and CI before review.

## Scope
- In: mise toolchain, Renovate, lefthook hooks, `scripts/` check/test
  runners with fail-fast and skip rules, 300-line code limit, testing
  policy, CI workflow.
- Out: npm workspace, TS/ESLint/Prettier/Vitest config (task 001); Lua
  test runner (task 003); visual harness (task 020).

## Deliverables
- `mise.toml`: exact pins for node, quarto, ffmpeg, lefthook, shellcheck,
  shfmt, stylua, selene; tasks `setup`, `check`, `test`.
- `renovate.json`: weekly, automerge minor/patch/digest, majors reviewed.
- `lefthook.yml`: `pre-commit` → `scripts/check.sh --staged`;
  `pre-push` → `scripts/check.sh --push`, `scripts/test.sh --push`.
- `scripts/check.sh`, `scripts/test.sh`, `scripts/check-line-limit.sh`,
  `scripts/lib/common.sh`, `scripts/tests/` self-tests.
- `.github/workflows/ci.yml`: mise-action, `mise run check`, `mise run test`.
- `docs/testing.md`, ADR-0010, `AGENT.md` Commands and rules.

## Definition of done
Automated:
- [x] `mise run check` and `mise run test` exit 0 (TS/Lua steps skip).
- [x] `scripts/tests/run.sh`: 300-line file passes, 301-line fails,
      non-code files ignored, missing runner skips.
- [ ] CI workflow passes on the branch.

Human check:
1. Fresh clone → `mise install && mise run setup`.
2. Commit a docs-only change: lefthook reports no matching files.
3. Stage a `.sh` file with 301 lines, `git commit` → fails naming the file
   and line count; unstage and delete it.

## Notes
- Quarto is not in the mise registry; pinned via `github:quarto-dev/quarto-cli`.
- ffmpeg uses `conda:ffmpeg` (prebuilt binaries for Linux and macOS).
- shfmt/stylua use explicit `aqua:` names: Renovate does not know the
  short registry names.
- CI runs on PRs and `main`; the CI box is ticked, and Status set to
  `done`, after the first green run on the PR for this branch.

## Completion log
- 2026-10-14: mise.toml, renovate.json, lefthook.yml, scripts/ gates,
  CI workflow, ADR-0010, docs/testing.md. Tests: `scripts/tests/` (16
  cases: line limit, scoping, skip, fail-fast, suite selection). Verified
  locally: Renovate extracts all 8 mise tools; actionlint clean; hooks
  reject a 301-line file and skip docs-only commits. GitHub-hosted tools
  could not be downloaded in the authoring sandbox, so `mise install` of
  quarto/lefthook/linters is first verified by CI. Follow-up: install the
  Renovate GitHub App; make "Check and test" a required status check.
