# ADR-0001: Toolchain: TypeScript, npm workspaces, pinning

- Status: accepted
- Date: 2026-10-14
- Task: 001
- PRD: §11.1, §11.3

## Context
PRD §11.1 requires pinned renderer dependencies and reproducible output.
PRD §11.3 requires packages that are independently testable and a versioned
IR. ADR-0010 pins the CLI tools (Node, linters, hooks) through mise. This ADR
decides the language, package manager, test runner and version policy for
the TypeScript code in `packages/*` and `renderer/remotion`.

## Options
1. **Language** — TypeScript (strict) or JavaScript with JSDoc. TypeScript
   wins: the renderer is TypeScript/React and the IR types must be shared.
2. **Package manager** — npm workspaces, pnpm or yarn. npm ships with the
   pinned Node and is read natively by Renovate. pnpm is stricter but adds a
   tool to `mise.toml`.
3. **Test runner** — Vitest, Jest or `node:test`. Vitest runs TypeScript and
   ESM natively and one config covers every workspace.

## Decision
- **Language**: TypeScript with `tsconfig.base.json` (`strict: true`). Packages
  are ESM (`"type": "module"`, `NodeNext` resolution); relative imports end in
  `.js`.
- **Workspaces**: `packages/*` and `renderer/remotion`. Only the root
  `package-lock.json` exists and is committed. Install with `npm ci`.
- **Names**: `@quarto-video/<name>`, all `"private": true`.
- **Checks**: Prettier (`format:check`), ESLint flat config with
  `typescript-eslint` recommended and `--max-warnings 0` (`lint`), and `tsc`
  per workspace (`typecheck`). `npm run check` runs all four plus the tests.
- **Tests**: Vitest, run once from the root (`npm run test`). Tests live in
  `<workspace>/test/*.test.ts`. Each package has one smoke test.
- **Pinning**: every root devDependency is an exact version, matching
  `renovate.json` (`rangeStrategy: "pin"`). Renderer dependencies (task 004
  onward) are exact too; they change only in a dedicated task (renderer
  README). Renovate holds releases younger than 3 days.
- **Node**: root `engines.node` is `24.21.0`, the mise pin.
- **Placeholders**: `test:integration`, `test:lua` and `test:visual` print
  `no tests yet` and exit 0 until tasks 003, 005 and 020 add their suites.

## Consequences
- One lockfile reproduces every JS tool version. Renovate proposes bumps.
- Lockfile is generated with npm 11 (bundled with Node 24). npm 10.9 cannot
  resolve the vitest 4.x peer tree (npm internal error); `npm ci` works with
  npm 10 against this lockfile.
- vitest is 4.1.11. `npm audit` lists vitest up to 4.1.10 as vulnerable
  (`tinypool`, `@vitest/mocker`); 4.1.11 is the first clean release. 5.0.0-5.0.4
  did not install under npm 10 and were not evaluated under npm 11.
- Renderer dependencies are not added here (task 004).

## Verification
- `npm ci && npm run check && npm run test` exit 0; the run lists 5 smoke tests.
- `npm audit` reports 0 vulnerabilities (npm 11).
- An unused variable fails `npm run lint`; a type error fails `npm run typecheck`
  (both checked once by hand, not committed).

## References
- `docs/prd.md` §11.1, §11.3 · ADR-0010 · `docs/testing.md`
- https://docs.npmjs.com/cli/v11/using-npm/workspaces
- https://vitest.dev · https://typescript-eslint.io
