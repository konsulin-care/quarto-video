# ADR-0010: Development environment and quality gates

- Status: accepted
- Date: 2026-10-14
- Task: 000
- PRD: §11.1, §13, §14

## Context
Contributors and agents need one way to get the exact tool versions the
product is verified against (PRD §14 reproducibility), updates that do not
rot, and gates that reject broken code before it reaches review. Task 001
originally pinned only Node via `.nvmrc`; Quarto, ffmpeg and linters were
unpinned.

## Options
1. **nvm + manual installs** — familiar; pins Node only, drifts per machine.
2. **mise + Renovate + lefthook** — one `mise.toml` pins every tool,
   Renovate understands it natively, lefthook runs hooks from one YAML file.
3. **Dev containers** — fully hermetic; heavy, Docker-only, slow on macOS.

## Decision
Option 2.
- **mise** (`mise.toml`) is the only version manager. Every CLI the project
  runs (Node, Quarto, ffmpeg, lefthook, linters) is pinned to an exact
  version. `mise install && mise run setup` bootstraps a clone. No `.nvmrc`.
- **Renovate** (`renovate.json`) updates mise tools, npm packages and
  GitHub Actions weekly. Minor/patch/digest updates automerge after CI is
  green; majors wait for human review. Releases younger than 3 days are held.
- **lefthook** (`lefthook.yml`) runs hooks that call `scripts/`. Hooks only
  look at code: `*.ts *.tsx *.js *.mjs *.cjs *.lua *.sh`. Docs and data
  files never trigger a hook.
  - `pre-commit`: `scripts/check.sh --staged` on staged code files.
  - `pre-push`: `scripts/check.sh --push` then `scripts/test.sh --push`.
- **Checks** (static): max 300 lines per code file; format (Prettier,
  StyLua, shfmt); lint (ESLint, selene, shellcheck); typecheck (`tsc`,
  pre-push and CI only).
- **Tests** (execute code): `scripts` self-tests, TS unit, Lua unit,
  integration on pre-push and CI; visual regression in CI only.
- **Fail fast**: scripts use `set -euo pipefail` and stop at the first
  failing step; lefthook runs commands `piped`.
- **Skipping**: a step skips with a `skip:` log line when no files of its
  language changed or its runner does not exist yet (e.g. no `package.json`).
  Humans may use `LEFTHOOK_EXCLUDE` locally in an emergency; agents never
  bypass hooks (`--no-verify`, `LEFTHOOK=0`, `LEFTHOOK_EXCLUDE`).
- **CI** (`.github/workflows/ci.yml`) installs tools with `jdx/mise-action`
  and runs `mise run check` and `mise run test` over all files.
- What needs tests is defined in `docs/testing.md`.

## Consequences
- One bootstrap command on Linux and macOS; Windows uses WSL.
- Tools whose mise backend Renovate cannot read (e.g. `conda:`) are
  updated by hand; review them when Renovate updates the rest.
- Task 001 uses the mise Node pin and makes its npm scripts satisfy
  `scripts/check.sh` / `scripts/test.sh` instead of writing its own CI.

## Verification
- `mise run check` and `mise run test` exit 0 locally and in CI.
- `scripts/tests/run.sh` covers the line limit and skip logic.
- A staged 301-line `.sh` file makes `git commit` fail.

## References
- https://mise.jdx.dev · https://docs.renovatebot.com/modules/manager/mise/
- https://lefthook.dev · `docs/testing.md`
