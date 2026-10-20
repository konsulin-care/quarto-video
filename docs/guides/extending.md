# Extending: a new component or preset

Status: task 050. The rule (AGENT.md): a new component or preset ships with a
registry contract, a renderer implementation, a docs page, validation fixtures
and visual cases, in the same change. This checklist lists each piece. Work
through it in order; the tests catch most of what you miss.

Read first: `AGENT.md`, `docs/testing.md`, `docs/architecture.md`, and the
README of every directory you touch. Authors choose semantic names; the
registry is the only place a new name is declared.

## Before you start

- A component or preset that needs a new IR field is an IR change. Add a new
  schema file `packages/ir/schema/ir-<minor>.json`, never edit a released one,
  and write an ADR (ADR-0007, [versioning.md](versioning.md)).
- A question the PRD leaves open (`docs/prd.md` §18) is resolved by an ADR, not
  in the change. Do not edit `docs/prd.md`; propose the change to a person.

## A new component

1. **Contract.** Add `packages/registry/components/<id>.json`, checked by
   `packages/registry/schema/contract.json`. It declares `id`, `version`,
   `purpose`, `slots`, `props`, `placements`, `compatibleAnimations`,
   `compatibleTransitions`, `duration` and `accessibility`, and optionally
   `mediaKinds`, `regions`, `requiresMedia` and `textFit`. Unknown fields are errors.
2. **Renderer.** Add `renderer/remotion/components/<id>/`, following the existing
   components. It is a pure function of the frame, the scene and the theme
   tokens (no clock, no randomness, no network). Register it where the other
   components are registered, and update `renderer/remotion/README.md`.
3. **Docs page.** Copy `docs/components/_template.md` to `docs/components/<id>.md`
   (at most 100 lines), add a row to the table in `docs/components/README.md`, and
   add the component to the table in [authoring.md](authoring.md#durations).
4. **Validation fixtures.** Add `tests/fixtures/projects/<slug>/` with
   `index.qmd` and an `expected.json`. Cover each rule the contract adds, with
   one fixture per diagnostic it can raise. Add or extend an integration test in
   `tests/integration/` that checks the fixture.
5. **Visual cases.** Add `tests/visual/cases/<case>.json` for each animation the
   component takes. Reference stills come from `npm run test:visual:approve -- <case>`;
   check the new PNGs and state the design in the task's Completion log. The
   harness never approves anything by itself.
6. **Registry check.** `npx video components` must list the new id, and
   `npx video components --json` must give its contract.
7. **Directory READMEs.** Update `packages/registry/README.md`,
   `renderer/remotion/README.md`, `docs/components/README.md` and `tests/README.md`
   in the same change.

## A new animation preset

1. **Registry.** Add `packages/registry/animations/<id>.json`, checked by
   `schema/animation.json`: `role` (`entrance` or `exit`), `windowed`, `minFrames`,
   `shortScene`, `reducedMotion`, and `compatibleComponents`. The component
   contracts' `compatibleAnimations` must list it too, so the links match both ways.
2. **Renderer.** Add the pure frame function under `renderer/remotion/animations/`.
   The parity test (`renderer/remotion/test/animation-parity.test.ts`) fails when
   the entrance or exit tables do not match the registry roles.
3. **Validator.** Stage 2 checks presets, roles, compatibility and windows. A
   preset that uses its own schedule sets `windowed: false` and rejects
   `animationDuration`. Add the cases to the validator's animation tests.
4. **Docs and visuals.** Add the row to the presets table in
   `docs/components/README.md` and to the table in [authoring.md](authoring.md#animations),
   and add a visual case that shows the start, the middle and the end.

A transition follows the same pattern: `packages/registry/transitions.json`,
`renderer/remotion/transitions/`, and the transition name in the docs and visual cases.

## A new diagnostic code

1. Add the code to `DIAGNOSTIC_CODES` in `packages/validator/src/diagnostic.ts`
   and to the table in `packages/validator/README.md`. Codes are never reused.
2. Write a test that triggers it. The validator's `codes.test.ts` checks the table.
3. Add the code to [diagnostics.md](diagnostics.md) with its meaning and fix.
   `tests/integration/docs.test.ts` fails until it is there.

## Before you push

```sh
mise exec -- mise run check
mise exec -- mise run test
```

Never bypass a hook (`--no-verify`, `LEFTHOOK=0`). A failing hook is a failure
to fix. Record the tests that cover the change in the task's Completion log.
