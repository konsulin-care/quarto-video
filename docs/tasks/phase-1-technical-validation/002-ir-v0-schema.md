# 002 — IR v0 schema and checker

Phase 1 · Status: done · Depends on: 001 · PRD: §8.2 · ADR: —

## Goal
A minimal, versioned Video IR JSON Schema plus a checker that accepts valid
manifests and rejects invalid ones with the JSON path of the problem.

## Scope
- In: `schemaVersion: "0.1"`, `type: "video"`, `settings` (width, height,
  fps, background), `scenes[]` (id, component, durationFrames, content.text,
  source.file). Types, `validateIr()`, `ir:check` script, one example.
- Out: content nodes (012), timeline/transitions (015), media (038), v1 (017).

## Deliverables
- `packages/ir/schema/ir-0.1.json` (`additionalProperties: false`).
- `packages/ir/src/types.ts`, `packages/ir/src/validate.ts` exporting
  `validateIr(json): { ok, errors: { path, message }[] }`.
- `packages/ir/examples/minimal.json` (one 4 s title scene at 30 fps).
- Script `npm run ir:check -w packages/ir -- <file>`: prints `OK` or one
  line per error `<json-path>: <message>`; exit 0/1.
- `packages/ir/README.md` status + Layout updated.

## Definition of done
Automated:
- [x] `examples/minimal.json` validates.
- [x] Each of these is rejected with the right path: missing `durationFrames`,
      `durationFrames: 1.5`, `durationFrames: 0`, `fps: -1`, unknown top-level
      key, `schemaVersion: "9.9"`.
- [x] Test asserts the schema text contains no `remotion`/`react`/`css`.

Human check:
1. `npm run ir:check -w packages/ir -- examples/minimal.json` → `OK`.
2. Copy the example, set `"durationFrames": 1.5`, run again → one line naming
   `/scenes/0/durationFrames`, exit code 1 (`echo $?`).

## Notes
- Validator: `ajv@8.20.0` (exact, runtime dep of `packages/ir`), draft 2020-12.
  ADR-0001 is silent on JSON Schema libraries; ajv is the conservative, maintained
  choice. Hand-rolled validation was rejected.
- `ir:check` runs through `tsx@4.23.15` (root devDependency). Plain Node type
  stripping cannot resolve the ADR-0001 `.js` import convention.
- Added `@types/node@24.19.0`; TypeScript 6 no longer auto-loads it, so
  `packages/ir/tsconfig.json` sets `"types": ["node"]`.
- Unknown key → path `/<key>`; missing key → `/<parent>/<key>`. Both name the
  offending location.
- Schema scope: all four `settings` keys required (defaults are task 010);
  `scenes` has `minItems: 1`; `background` is `#RRGGBB` only; `source.file`
  rejects absolute paths and leading backslashes.
- Not in the schema, by design: scene id uniqueness and component membership
  (validator, tasks 011/014); path containment (ADR-0006, task 016).
- `scripts/check.sh` runs the Prettier on PATH (3.8.1 here), not the pinned
  3.9.10. Formatting that differs between them was avoided (commit aab9a69).

## Completion log
- 2026-10-14: IR 0.1 schema, `validateIr()` with JSON Pointer paths, `ir:check`
  (exit 0/1), and `examples/minimal.json`. Automated checks pass locally:
  `npm run check`, `npm run test` (19 tests), `scripts/check.sh --all`,
  `scripts/test.sh --all`. Tests: `packages/ir/test/validate.test.ts` (example,
  six rejection paths, multi-error), `schema.test.ts` (no remotion/react/css),
  `cli.test.ts` (`ir:check` via npm, OK and error output and exit codes).
- Follow-ups:
  - CI on branch not yet verified.
  - Human check pending (steps 1 and 2 above), unverified by an agent.
  - `scripts/check.sh` should use the workspace's pinned Prettier, not PATH.
  - Scene id uniqueness and component membership: tasks 011 and 014.
