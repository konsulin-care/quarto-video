# 013 — Component registry and `video components`

Phase 2 · Status: todo · Depends on: 012 · PRD: §5.4, §5.5 · ADR: —

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
- [ ] Every contract validates against `contract.json`.
- [ ] A contract missing `slots` fails loading with a clear error.
- [ ] Parity test fails if a renderer mapping is removed (verified once).
- [ ] `video components --json` lists `title` with slots, props, duration bounds.

Human check:
1. `npx video components` → a table with `title`, its slots and
   duration bounds.
2. `npx video components --json | head` → valid JSON.

## Notes

## Completion log
