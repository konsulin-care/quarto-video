# 002 — IR v0 schema and checker

Phase 1 · Status: in-progress · Depends on: 001 · PRD: §8.2 · ADR: —

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
- [ ] `examples/minimal.json` validates.
- [ ] Each of these is rejected with the right path: missing `durationFrames`,
      `durationFrames: 1.5`, `durationFrames: 0`, `fps: -1`, unknown top-level
      key, `schemaVersion: "9.9"`.
- [ ] Test asserts the schema text contains no `remotion`/`react`/`css`.

Human check:
1. `npm run ir:check -w packages/ir -- examples/minimal.json` → `OK`.
2. Copy the example, set `"durationFrames": 1.5`, run again → one line naming
   `/scenes/0/durationFrames`, exit code 1 (`echo $?`).

## Notes

## Completion log
