# 013 — Component registry and `video components`

Phase 2 · Status: done · Depends on: 012 · PRD: §5.4, §5.5 · ADR: —

## Goal
Components are declared as validated data contracts, discoverable by humans
and agents via `video components`.

## Scope
- In: contract JSON Schema covering PRD §5.5; loader API; contract for the
  placeholder `title` (slots `default`, props none yet); renderer parity
  test; `video components [--json]`.
- Out: enforcing contracts on projects (014); presets/themes (019+).

## Deliverables
- `packages/registry/schema/contract.json`, `components/title.json`,
  `src/index.ts` (`listComponents`, `getComponent`).
- Parity test: registry ids ⇔ `renderer/remotion/src/registry-map.ts`.
- `packages/cli/src/commands/components.ts`.
- `packages/registry/README.md` updated with contract field reference.

## Definition of done
Automated:
- [x] Every contract validates against `contract.json` (`contract.test.ts`).
- [x] A contract missing `slots` fails loading with a clear error (`contract.test.ts`).
- [x] Parity test fails if a renderer mapping is removed (`registry-parity.test.ts`; verified once by removing `title` from `registry-map.ts`, then restored).
- [x] `video components --json` lists `title` with slots, props, duration bounds (`tests/integration/components.test.ts`).

Human check:
1. `npx video components` → a table with `title`, its slots and
   duration bounds.
2. `npx video components --json | head` → valid JSON.

## Notes
Decisions (conservative; flagged in the task report):
- Schema covers the registry README's field list (PRD §5.5 minus default layout, styling, media and validation rules, which the tasks that need them add). Unknown fields are errors.
- Prop types: `string`, `boolean`, `enum` only. Numbers are excluded so no pixel-like prop can exist yet.
- Slot `accepts` uses ADR-0004 block kinds. `title`: `default` required, accepts `paragraph`, `heading`. Per-component slot checks are task 014.
- `title` duration 1s–30s (provisional; the fixtures use 1–4 s). Other components set their own bounds.
- Placements: none for `title`. Named-slot placements wait for tasks 038 and 043.
- `getComponent(id)` throws `RegistryError` for an unknown id. It never returns `undefined`.
- Every file in `components/` must be `<id>.json` with a matching `id`. Anything else is an error.
- Parity test lives in `renderer/remotion/test`: `src` never imports the registry (its loader reads files).
- `video components`: table by default, `--json` for the full contracts. Exit 2 for extra arguments or a broken registry.
- Open conflict: the registry README says a released entry needs visual cases, which arrive in task 020, so `title` is listed before them. Added `docs/components/title.md`. Human decision: confirm the placeholder may stay listed until 020.

## Completion log
- 2026-10-14: `components/title.json`, `schema/contract.json`, loader and lookups in `packages/registry/src`, `video components [--json]`, `docs/components/title.md`. No DoD box was met before this task.
  Tests: `packages/registry/test/contract.test.ts`, `components.test.ts`; `renderer/remotion/test/registry-parity.test.ts`; `packages/cli/test/components.test.ts`; `tests/integration/components.test.ts`.
  Follow-ups: 014 enforces contracts on projects; 020 adds `title` visual cases; 019+ add presets and themes; 035+ add contracts for the other components.
  Pending human checks: (1) `npx video components` shows a table with `title`, its slots and duration bounds; (2) `npx video components --json | head` prints valid JSON.
