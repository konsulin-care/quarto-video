# 001 — Workspace tooling

Phase 1 · Status: in-progress · Depends on: 000 · PRD: §11.1, §11.3 · ADR: writes 0001, reads 0010

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
- [ ] `npm ci && mise run check && mise run test` exits 0 and runs ≥ 5 smoke
      tests (one per package).
- [ ] CI workflow passes on the branch.
- [ ] Lint fails on an unused variable (verified once, not committed).

Human check:
1. Fresh clone → `mise install && mise run setup && npm ci && mise run check`.
2. See lint, typecheck and a test summary listing all five packages; exit 0.
3. Introduce a type error in `packages/ir/src/index.ts`, rerun → fails with
   the file and line; revert.

## Notes

## Completion log
