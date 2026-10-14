# Testing policy
Applies to every change, by humans and agents. Gates: ADR-0010.
Where tests live and how to run them: `tests/README.md`.

## The rule
A change that **directly or indirectly affects behaviour** ships with tests
in the same change set. "Behaviour" is anything a user, author, or
downstream layer can observe: IR output, diagnostics, exit codes, files
written, rendered frames, audio, timing, and the results of gate scripts.

## Requires tests
Direct — logic that runs:
- Lua filter (`_extensions/video/`): DSL parsing, normalisation, IR emission.
- IR checker and time → frame rules (`packages/ir/`).
- Validator stages and diagnostics (`packages/validator/`).
- CLI commands, project resolution, exit codes (`packages/cli/`).
- Renderer components, presets, transitions (`renderer/remotion/`).
- Gate scripts in `scripts/` (checked by `scripts/tests/`).

Indirect — data or config that changes outputs without being logic:
- JSON Schema and IR version rules.
- Registry contracts, presets' parameters, theme tokens, defaults.
- Render configuration (fps, resolution, codec, audio settings).
- Pinned renderer/runtime versions (Remotion, Chromium, Node, Quarto,
  ffmpeg): covered by visual and integration tests, not new unit tests.
- Fixtures and reference images that other tests depend on.

## Exempt (no new test needed)
- Docs, comments, ADRs, task files.
- Formatting-only or rename-only refactors with no observable change
  (existing tests must still pass unchanged).
- Type-only declarations that emit no JavaScript.
- Lint/format/editor configuration.
If unsure, it is not exempt.

## How to test
- One test per behaviour, plus its error paths (each diagnostic code).
- Bug fix: first add a test that fails without the fix.
- Test at the lowest layer that observes the behaviour:
  unit → integration (`video` CLI) → visual regression.
- Deterministic only: no network, no wall clock, no randomness, no
  dependence on cwd or machine locale.
- Name tests after the behaviour, not the function
  (`rejects unknown component`, not `test validate()`).
- Never delete, skip, or loosen a test to make a change pass.

## Gates
| Stage | Runs |
| --- | --- |
| pre-commit | `scripts/check.sh --staged` (line limit, format, lint) |
| pre-push | `scripts/check.sh --push`, `scripts/test.sh --push` |
| CI | `mise run check`, `mise run test` (all files, incl. visual) |
Code files (`*.ts *.tsx *.js *.mjs *.cjs *.lua *.sh`) are at most 300
lines; split by responsibility, never by squeezing lines.

## Reporting (agents)
In the task's Completion log, list the tests that cover the change, or
name the exemption above that applies.
