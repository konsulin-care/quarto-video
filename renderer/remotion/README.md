# renderer/remotion/ — Remotion reference renderer
Status: Scaffold (task 001): `src/index.ts` and a smoke test, no Remotion dependency yet. Rendering: tasks 004, 019–035, 039–046.
Run: `npm run typecheck -w @quarto-video/remotion`; tests: root `npm run test`.

## Purpose
Render a valid Video IR manifest to frames and encode the output (PRD §8.4).
It implements what `packages/registry` declares; it decides nothing about
what is valid.

## Layout (target)
- `src/Root.tsx` — composition reading the IR from input props.
- `components/<id>/` — one directory per registry component.
- `animations/<id>.ts`, `transitions/<id>.ts` — preset implementations.
- `media/` — video/image primitives, `fit` logic, device frames.
- `themes/` — theme provider; fonts bundled locally under `themes/fonts/`.
- `src/render.ts` — `render(irPath, outPath, opts)` used by the CLI.
- `src/registry-map.ts` — registry id → implementation map.

## Rules
- Input is IR only. Never import `packages/validator` or `packages/cli`.
- Check `schemaVersion` on load and fail clearly on unknown majors.
- Visual state = f(IR, frame). Use `useCurrentFrame()`/props only. Banned:
  `Date`, `Math.random`, `performance.now`, timers, `fetch`, remote URLs
  (enforced by lint rule from task 021).
- Animations read durations from the IR; never hard-code frame counts that
  can exceed a scene's frames.
- Layout uses theme tokens only; no magic colours or font sizes in components.
- Media `src` are project-relative IR paths resolved against the asset root
  passed by the CLI.
- Pin exact Remotion versions (ADR-0001); upgrade only in a dedicated task.

## Adding a component or preset
1. Registry entry (contract) exists. 2. Implement here and add it to
`registry-map.ts`. 3. Add visual cases in `tests/visual/cases/`.
4. Write `docs/components/<id>.md`. The parity test fails until all exist.

## Testing
Unit tests for preset curves; integration renders; visual regression stills.

## Related
Tasks 004, 019–046. ADR-0001, 0005, 0009.
