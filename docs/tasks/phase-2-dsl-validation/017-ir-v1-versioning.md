# 017 — IR v1.0 freeze and versioning

Phase 2 · Status: todo · Depends on: 015, 016 · PRD: §8.2, §11.3, §18.7 · ADR: writes 0007

## Goal
Freeze IR `1.0`, define compatibility and migration rules for IR and DSL,
and make every consumer reject unsupported versions clearly.

## Scope
- In: ADR-0007 (semver meaning for `schemaVersion`, what may change in a
  minor, DSL deprecation policy, warning→error policy from PRD §9.2);
  `schema/ir-1.0.json`; `generator` block (extension + CLI versions);
  drop pre-1.0 schemas or keep with deprecation per ADR; renderer and
  validator version gates.
- Out: user-facing migration guide (050).

## Deliverables
- `docs/decisions/0007-versioning-and-migration.md` (accepted).
- `packages/ir/schema/ir-1.0.json`, examples, schema reference in README.
- Version gate in `packages/ir` used by validator and renderer.

## Definition of done
Automated:
- [ ] All fixtures and examples produce IR that validates against 1.0.
- [ ] `schemaVersion: "2.0"` → validator and renderer fail with
      `E_IR_UNSUPPORTED_VERSION` naming supported versions.
- [ ] IR contains `generator` versions.

Human check:
1. `npx video validate videos/hello --print-ir > /tmp/ir.json`; edit
   `schemaVersion` to `"9.0"`.
2. `npm run ir:check -w packages/ir -- /tmp/ir.json` → unsupported-version
   error listing supported versions; exit 1.

## Notes

## Completion log
