# 017 — IR v1.0 freeze and versioning

Phase 2 · Status: done · Depends on: 015, 016 · PRD: §8.2, §11.3, §18.7 · ADR: writes 0007

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
- [x] All fixtures and examples produce IR that validates against 1.0
      (`tests/integration/ir-v1.test.ts`; golden tests; `examples/v1.json`).
- [x] `schemaVersion: "2.0"` → validator and renderer fail with
      `E_IR_UNSUPPORTED_VERSION` naming supported versions (`packages/validator/test/version.test.ts`,
      `renderer/remotion/test/render-validation.test.ts`, `packages/ir/test/cli.test.ts`).
- [x] IR contains `generator` versions (`packages/ir/test/v1.test.ts`, `generator.test.ts`, `test_generator.lua`).

Human check:
1. `npx video validate videos/hello --print-ir > /tmp/ir.json`; edit
   `schemaVersion` to `"9.0"`.
2. `npm run ir:check -w packages/ir -- /tmp/ir.json` → unsupported-version
   error listing supported versions; exit 1.

## Notes
- Decisions, all in ADR-0007: "frozen" = a released schema file never changes
  (`frozen.test.ts` checks SHA-256); `ir-1.0.json` = 0.3 plus required `generator`,
  nothing else changed; 0.1 to 0.3 stay readable, never written, removed no earlier than 2.0
  (conservative: rejecting them would break valid manifests); `schemaVersion` is MAJOR.MINOR,
  no patch; a missing version is reported alone; any other value is `E_IR_UNSUPPORTED_VERSION`.
- `generator`: the filter's constants (`lib/generator.lua`), synced to `_extension.yml`, the CLI
  package and the renderer preview by test. Not injected by the CLI: `quarto render` has no CLI.
- DSL: no version key added (PRD §18.7 is open); no feature is deprecated, so no warning code yet.
  No IR migrator: manifests are generated, so migration means re-running the filter.
- Flags for a human: (a) drop 0.1 to 0.3 at 2.0, or keep them; (b) whether the DSL needs its own
  version key; (c) the `x-*` extension namespace is documented but no schema implements it;
  (d) `generator.cli` is the private package version `0.0.0`, so the release step must bump it
  with `lib/generator.lua` and the renderer preview (the test fails if they drift).
- Existing assertions changed (messages, not loosened): content.test and timeline.test (the
  unsupported-version message and code), run.test (contract version message now "0.2 or newer").
## Completion log
- 2026-10-14: done. Summary: ADR-0007 (versioning, deprecation, migration); `ir-1.0.json`
  (frozen; 0.3 plus `generator: {extension, cli}`); `src/versions.ts` (supported 0.1, 0.2, 0.3,
  1.0; the gate in `validateIr`); `E_IR_UNSUPPORTED_VERSION` in validator (stage 2), `ir:check`
  and the renderer; the filter writes 1.0 with `generator`; golden `expected.json` (6) moved to
  1.0; `examples/v1.json`; READMEs and AGENT.md commands updated.
- Tests: `packages/ir/test/{versions,v1,frozen,generator,cli,content,timeline,schema}.test.ts`,
  `packages/validator/test/version.test.ts`, `codes.test.ts`, `renderer/remotion/test/render-validation.test.ts`,
  `_extensions/video/tests/test_generator.lua`, `test_timeline.lua`, `tests/integration/ir-v1.test.ts`
  (6 golden manifests), plus the existing golden tests.
- Follow-ups: (a) decision on 0.1 to 0.3 at 2.0 (ADR-0007 open item); (b) DSL version key (PRD §18.7);
  (c) `x-*` namespace; (d) release process bumps `generator` constants; (e) user migration guide (050).
- Pending human checks (not run by an agent): (1) `npx video validate videos/hello --print-ir` in a
  fresh clone, then set `schemaVersion` to "9.0" and run `npm run ir:check -w packages/ir -- <file>`,
  expecting the unsupported-version error that lists the supported versions and exit 1 (the same
  output is covered automatically by `cli.test.ts` on a 2.0 file). An agent ran the same
  steps inside the repo (validate exit 0 with `generator`; the edited file printed the error,
  exit 1); a person must still run them from a fresh clone.
