# packages/registry/ — component contracts, presets, themes
Status: Scaffold (task 001): `src/index.ts` and a smoke test. Contracts and presets: tasks 013, 019, 021+.
Run: `npm run typecheck -w @quarto-video/registry`; tests: root `npm run test`.

## Purpose
Declare the design system as data (PRD §5.4–5.6, §10): which components,
animations, transitions, device frames and themes exist, and what each
accepts. The validator enforces it; the renderer implements it.

## Owns
- Contract schema (`schema/contract.json`) and contract files
  (`components/<id>.json`) with fields from PRD §5.5: id, version, purpose,
  slots (required/optional, accepted content), props (type, enum, default),
  supported placements, compatible animations/transitions, min/max duration,
  accessibility notes.
- Preset declarations (`animations/<id>.json`, `transitions/<id>.json`):
  purpose, compatible components, min frames, reduced-motion behaviour.
- Device frames (`frames/<id>.json`) and themes (`themes/<id>.json` tokens).
- Loader API: `getComponent(id)`, `listComponents()`, etc.

## Does not own
- Rendering code → `renderer/remotion`. Validation logic → `validator`.

## Rules
- Registry content is static data; no functions in contract files.
- An entry is "released" only when its renderer implementation, docs page
  (`docs/components/<id>.md` for components) and visual cases exist. Unreleased
  entries must not be loadable.
- `npm run check` includes a parity test: every registry id has a renderer
  implementation and vice versa.
- Prop names are camelCase and semantic (`fit`, `frame`); never pixel values.

## Testing
Contract-schema tests, loader tests, registry↔renderer parity test.

## Related
Tasks 013, 014, 019, 021–035, 040–043. PRD §5.5, §10.
