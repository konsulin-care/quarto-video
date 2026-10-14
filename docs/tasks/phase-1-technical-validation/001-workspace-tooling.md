# 001 — Workspace tooling

Phase 1 · Status: done · Depends on: 000 · PRD: §11.1, §11.3 · ADR: writes 0001, reads 0010

## Goal
A TypeScript monorepo where every package builds, lints and runs a unit test
with one command, on pinned tool versions.

## Scope
- In: npm workspaces, TS config, lint/format, unit test runner, npm scripts
  wired into the task 000 gates.
- Out: any product behaviour; Remotion install (task 004); Quarto (task 003);
  tool pinning, hooks and CI (task 000).

## Deliverables
- Root `package.json` with workspaces `packages/*`, `renderer/remotion`;
  scripts `check` (lint + typecheck + unit), `lint`, `typecheck`, `test`,
  `format`, and placeholders `test:integration`, `test:lua`, `test:visual`
  that exit 0 with "no tests yet".
- `tsconfig.base.json` (strict), ESLint + Prettier configs, Vitest.
- `engines` matching the Node version pinned in `mise.toml` (no `.nvmrc`);
  `package-lock.json` committed.
- Each package (`ir`, `registry`, `validator`, `cli`, `renderer/remotion`):
  `package.json`, `src/index.ts`, one smoke test.
- `.gitignore`: `node_modules`, `dist`, `.video-build/`, `videos/*/output.*`,
  `tests/visual/report/`.
- `scripts/check.sh` runs Prettier/ESLint/`tsc` and `scripts/test.sh` runs
  Vitest through these npm scripts; CI (task 000) runs `npm ci` first.
- `docs/decisions/0001-toolchain.md` (accepted): language, package manager,
  test runner, version-pinning policy (exact versions for renderer deps);
  tool versions and gates are ADR-0010.
- `AGENT.md` → Commands section filled in.

## Definition of done
Automated:
- [x] `npm ci && mise run check && mise run test` exits 0 and runs ≥ 5 smoke
      tests (one per package). Verified with the exact commands mise.toml maps
      to (`scripts/check.sh --all`, `scripts/test.sh --all`); mise not installed here.
- [ ] CI workflow passes on the branch. (Not verified: no push, per task rules.)
- [x] Lint fails on an unused variable (verified once, not committed).

Human check:
1. Fresh clone → `mise install && mise run setup && npm ci && mise run check`.
2. See lint, typecheck and a test summary listing all five packages; exit 0.
3. Introduce a type error in `packages/ir/src/index.ts`, rerun → fails with
   the file and line; revert.

## Notes
- Local tools: mise is not installed in the sandbox. shellcheck 0.11.0 (pip) and
  shfmt v3.14.1 (go install) were installed to match `mise.toml`; checks ran with
  `node_modules/.bin` and `~/.local/bin` on PATH.
- `engines.node` is `24.21.0` (exact, from `mise.toml`). Local Node 22.22.0 only
  prints EBADENGINE warnings.
- vitest is 4.1.11, not 5.x: 4.1.10 and older have audit advisories; 5.0.x did
  not install under npm 10. Details in ADR-0001. Conservative choice, flagged.
- The lockfile was generated with npm 11.21.0 (Node 24 bundles npm 11); `npm ci`
  also passes with npm 10.9.4 here. Root devDependencies are exact versions,
  matching Renovate `rangeStrategy: pin`.
- `npm run check` = format:check, lint, typecheck, unit (the Goal says lint +
  typecheck + unit; format is added to match AGENT.md). `scripts/check.sh` runs
  Prettier, ESLint and `tsc` directly and does not run unit tests; unit runs in
  `scripts/test.sh`. No gate was weakened.
- Packages declare no internal dependencies yet. The `ir` <- `registry` <-
  `validator` <- `cli` rule is enforced by the packages that add imports
  (tasks 002 onward), not by this task.
- Placeholders `test:lua`, `test:integration`, `test:visual` run `echo 'no tests yet'`.

## Completion log
- 2026-10-14: npm workspaces (`packages/*`, `renderer/remotion`), strict
  `tsconfig.base.json`, ESLint flat config, Prettier, Vitest. Root scripts `check`,
  `format`, `lint`, `typecheck`, `test` and placeholders. One smoke test per package.
  ADR-0001 accepted; AGENT.md Commands filled in; `.gitignore` build outputs.
  Tests covering it: 5 smoke tests (`packages/*/test/`, `renderer/remotion/test/`)
  via `npm run test`; 16 gate self-tests unchanged (`scripts/tests/`).
  Verified locally: `npm ci`, `npm run check`, `npm run test` (5/5 pass);
  `scripts/check.sh --all` and `scripts/test.sh --all` exit 0; `npm audit` 0
  vulnerabilities. Lint fails on an unused variable (`2:7`) and `tsc` fails at
  `src/index.ts(2,14)` on a type error; both reverted, not committed.
  Follow-ups: CI on the branch not yet verified; human check pending (fresh clone
  with mise, Node 24 `npm ci`).
