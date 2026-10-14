# 001 — Workspace tooling

Phase 1 · Status: todo · Depends on: — · PRD: §11.1, §11.3 · ADR: writes 0001

## Goal
A TypeScript monorepo where every package builds, lints and runs a unit test
with one command, on pinned tool versions.

## Scope
- In: npm workspaces, TS config, lint/format, unit test runner, Node pin, CI.
- Out: any product behaviour; Remotion install (task 004); Quarto (task 003).

## Deliverables
- Root `package.json` with workspaces `packages/*`, `renderer/remotion`;
  scripts `check` (lint + typecheck + unit), `lint`, `typecheck`, `test`,
  `format`, and placeholders `test:integration`, `test:lua`, `test:visual`
  that exit 0 with "no tests yet".
- `tsconfig.base.json` (strict), ESLint + Prettier configs, Vitest.
- `.nvmrc` / `engines` pinning Node LTS; `package-lock.json` committed.
- Each package (`ir`, `registry`, `validator`, `cli`, `renderer/remotion`):
  `package.json`, `src/index.ts`, one smoke test.
- `.gitignore`: `node_modules`, `dist`, `.video-build/`, `videos/*/output.*`,
  `tests/visual/report/`.
- `.github/workflows/ci.yml` running `npm ci && npm run check`.
- `docs/decisions/0001-toolchain.md` (accepted): language, package manager,
  test runner, version-pinning policy (exact versions for renderer deps).
- `AGENT.md` → Commands section filled in.

## Definition of done
Automated:
- [ ] `npm ci && npm run check` exits 0 and runs ≥ 5 smoke tests (one per package).
- [ ] CI workflow passes on the branch.
- [ ] Lint fails on an unused variable (verified once, not committed).

Human check:
1. Fresh clone → `nvm use && npm ci && npm run check`.
2. See lint, typecheck and a test summary listing all five packages; exit 0.
3. Introduce a type error in `packages/ir/src/index.ts`, rerun → fails with
   the file and line; revert.

## Notes

## Completion log
