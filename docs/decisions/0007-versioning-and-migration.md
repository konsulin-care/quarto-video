# ADR-0007: IR and DSL versioning, deprecation and migration

- Status: accepted
- Date: 2026-10-14
- Task: 017
- PRD: §8.2, §9.2, §11.3, §18.7

## Context
PRD §8.2 requires a versioned IR and says the exact schema must be specified and
tested before it is frozen. PRD §11.3 requires a documented versioning policy and a
migration policy for breaking changes. PRD §9.2 says warnings must not silently become
errors without a documented compatibility policy. PRD §18.7 asks what guarantees apply
to existing projects as the DSL evolves. Until now the IR has versions 0.1, 0.2 and 0.3
(ADR-0004, ADR-0005), and the unknown-version error has no diagnostic code. AGENT.md
says: where the documents are silent, reject rather than guess.

## Options
1. **Meaning of "frozen".** (a) a version is frozen when its schema file is released, and
   the file never changes; (b) the schema may be edited until a later release. Chosen: (a),
   enforced by a hash test (`packages/ir/test/frozen.test.ts`).
2. **Pre-1.0 schemas.** (a) keep reading 0.1 to 0.3, never write them again; (b) reject them
   now. Chosen: (a). ADR-0004 and ADR-0005 kept older versions valid, and rejecting them would
   break manifests that were valid. Removing them needs a major version and a migration note.
3. **What a minor may change.** (a) additive only; (b) anything. Chosen: (a). A minor adds a
   new schema file; every older manifest stays valid under it.
4. **Source of the generator versions.** (a) the filter's own constants, kept equal to
   `_extension.yml` and `packages/cli/package.json` by a test; (b) passed in by the CLI through
   an environment variable (absent under plain `quarto render`); (c) omitted. Chosen: (a).
5. **Unsupported versions.** (a) an error with a code that lists the supported versions;
   (b) a warning, then the latest schema. Chosen: (a), because a guess can silently change the
   output.
6. **DSL deprecation.** (a) warn first, error only in the next major; (b) remove at once.
   Chosen: (a), with the warning code added when the first feature is deprecated.

## Decision
- **Version string.** `schemaVersion` is `"MAJOR.MINOR"` and names `schema/ir-MAJOR.MINOR.json`.
  There is no patch level. A fix that changes no schema file is not a version change.
- **Frozen files.** A released schema file never changes. A change is a new file. The current
  files are `ir-0.1.json`, `ir-0.2.json`, `ir-0.3.json` and `ir-1.0.json`.
- **Major (2.0).** Any change that makes an accepted manifest invalid or changes the meaning of
  an accepted value: removing, renaming, retyping or tightening a field; making an optional field
  required; changing units or rounding. It needs an ADR and a migration note in the user guide
  (task 050).
- **Minor (1.1).** Additive only: a new optional field or a new value. Every manifest valid
  under 1.0 stays valid under 1.1, and renderers read both.
- **Writing and reading.** The filter writes only the latest version (1.0). Every version in
  `SUPPORTED_VERSIONS` (`packages/ir/src/versions.ts`) is read. Versions 0.1 to 0.3 are never
  written again, get no new fields, and are removed no earlier than 2.0.
- **Unsupported version.** `schemaVersion` that is not a supported string (including numbers,
  `"1.0.0"`, `"1"` and `"v1.0"`) is `E_IR_UNSUPPORTED_VERSION` at `/schemaVersion`. Its message
  lists the supported versions. A missing `schemaVersion` is `E_IR_SCHEMA` ("is required") and
  nothing else is reported. The validator, `ir:check` and the renderer all use `validateIr`.
- **Generator.** IR 1.0 requires `generator: {extension, cli}`: the extension version and the
  `video` CLI version, both semver. The filter writes them from `_extensions/video/lib/generator.lua`,
  and `packages/ir/test/generator.test.ts` checks them against `_extension.yml`, the CLI package
  and the renderer preview. Consumers must not change behaviour from `generator`; compatibility is
  decided by `schemaVersion` only.
- **Migration of manifests.** A manifest is generated into `.video-build/`, never written by hand.
  Moving to a newer version means re-running the filter. No IR migrator is provided.
- **DSL.** Front matter and `.scene` attributes carry no version key; none is added here. Within
  a major, no key, attribute or class is removed, no accepted value becomes invalid, and no default
  changes meaning. A feature that is to be removed is first deprecated: it emits a `warning`
  diagnostic (PRD §9.2) that names the replacement and the major that removes it. It becomes an
  error only in that major, with a migration note. No feature is deprecated at 1.0, so no warning
  code exists yet.

## Consequences
- IR 1.0 is the schema in `ir-1.0.json`: IR 0.3 plus the required `generator` block. Nothing else
  changed. `examples/v1.json` is the reference manifest.
- The renderer and validator read four versions; 0.1 to 0.3 cost nothing extra, since `plainText`
  and `timelineOf` already handle them.
- Changing `generator` values means changing the constants and the extension and CLI versions in
  the same change. The test enforces this.
- Any edit to a released schema file fails `frozen.test.ts`; the fix is to revert it or add a new
  file with its own ADR.
- Open for a human: whether 0.1 to 0.3 are dropped at 2.0 (this ADR keeps them); whether the DSL
  needs its own version key (PRD §18.7 asks about the DSL); the `x-*` extension namespace in
  `packages/ir/README.md` is not in any schema yet, and 1.0 does not add it.

## Verification
- `npm run check`: `packages/ir/test/versions.test.ts` (supported list, each version reads its own
  schema, unsupported values, missing version), `v1.test.ts` (generator rules, 0.3 has none,
  timeline required), `frozen.test.ts` (SHA-256 of each released file), `generator.test.ts`
  (constants match the extension, CLI and preview), `cli.test.ts` (`ir:check` on `2.0`: code,
  supported versions, exit 1); `packages/validator/test/version.test.ts` (stage runner: the code,
  no later stage, stage 4 on 1.0); `codes.test.ts` (the code is in the README table);
  `renderer/remotion/test/render-validation.test.ts` (the renderer's message).
- `npm run test:lua`: `test_generator.lua` (the built manifest is 1.0 with the generator
  versions), `test_timeline.lua` (schema version 1.0).
- `npm run test:integration`: `ir-v1.test.ts` (every golden `expected.json` is 1.0, validates and
  records the generator versions); the golden tests (`minimal-filter`, `content-nodes`,
  `front-matter`, `scene-lines`) check that the filter writes these files.

## References
- PRD §8.2 (IR contract, the `1.0` example), §9.2 (warnings), §11.3 (versioning and migration),
  §18.7 (open decision, resolved here in part; the DSL version key is left open).
- ADR-0003 (no hidden defaults), ADR-0004 (IR 0.2), ADR-0005 (IR 0.3), ADR-0006 (asset errors).
- Task 017 file, Notes section.
