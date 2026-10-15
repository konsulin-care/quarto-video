# packages/registry/ — component contracts, presets, themes
Status: Component contracts (task 013): `components/title.json` is the only entry (`default` and optional `subtitle` slots, task 024). `listComponents()`, `getComponent(id)` and `video components` read it. Transition names (task 015): `transitions.json`, read by `listTransitions()`. Transition presets (task 022): `transitions/*.json`, read by `listTransitionPresets()`. Themes (task 019): `themes/modern.json`, read by `listThemes()` and `getTheme(id)`. Animation presets (task 021): `animations/*.json`, read by `listAnimations()` and `getAnimation(id)`.
Run: `npm run typecheck -w @quarto-video/registry`; tests: root `npm run check` (unit) and `npm run test:integration` (`video components`).

## Purpose
Declare the design system as data (PRD §5.4–5.6, §10): which components,
animations, transitions, device frames and themes exist, and what each
accepts. The validator enforces it; the renderer implements it.

## Owns
- `schema/contract.json`: JSON Schema (draft 2020-12) of one component contract. Unknown fields are errors.
- `components/<id>.json`: one contract per component. Only `<id>.json` files belong there.
- `src/load.ts` (checks files against the schema), `src/components.ts` (lookups), `src/types.ts`.
- `transitions.json`: `{ "transitions": [...] }`, the transition names an author may use (PRD §5.6; ADR-0005). `cut` must be listed. `src/transitions.ts` (`listTransitions`, `parseTransitions`) checks it at load.
- `schema/transition.json` and `transitions/<id>.json`: transition presets (task 022): `duration` in ms (`defaultMs` documents the suggested length, never applied; `minMs`/`maxMs` bound `transitionDuration`), and `reducedMotion`, the registered name drawn instead when reduced motion is requested (task 023). `src/transition-presets.ts` (`listTransitionPresets`, `loadTransitionDir`) checks that the files match `transitions.json` one to one. Frame functions: `renderer/remotion/transitions/`.
- `schema/theme.json` and `themes/<id>.json`: theme tokens (task 019; PRD §10). `src/themes.ts` (`listThemes`, `getTheme`, `parseTheme`, `DEFAULT_THEME`), `src/contrast.ts` (WCAG ratio). Font files are renderer assets: `renderer/remotion/themes/fonts/`.
- `schema/animation.json` and `animations/<id>.json`: animation presets (PRD §5.6; task 021). `src/animations.ts` (`listAnimations`, `getAnimation`, `parseAnimation`, `loadAnimationDir`). Frame functions: `renderer/remotion/animations/`.
- Planned, not yet present: `frames/`.

## Contract fields (task 013, PRD §5.5)
| Field | Rule |
| --- | --- |
| `id` | Lowercase kebab-case (`^[a-z][a-z0-9-]*$`, max 64). Must equal the file name. |
| `version` | `MAJOR.MINOR.PATCH`. |
| `purpose` | One sentence, 1–200 characters. |
| `slots` | At least one slot. Each slot is `{required, accepts, maxBlocks?}`; `accepts` lists block kinds from ADR-0004: `paragraph`, `heading`, `list`, `code-block`. `maxBlocks` (1–100, task 025): more blocks is the warning W_SLOT_TOO_MANY_BLOCKS. |
| `props` | Object of camelCase names. Each prop is `{type, enum?, default?}`; `type` is `string`, `boolean` or `enum` (`enum` requires `enum`, a non-empty list). |
| `placements` | Unique values from `background`, `framed`; may be empty (PRD §6). |
| `compatibleAnimations`, `compatibleTransitions` | Preset ids. Each animation id must be a shipped preset whose `compatibleComponents` lists the component (both sides agree; test-checked). Transitions: not checked against scenes yet; empty for every component. |
| `duration` | `{minMs, maxMs}`: integers ≥ 1, `maxMs` ≥ `minMs`. Milliseconds keep bounds fps-independent (ADR-0003). |
| `accessibility` | Notes on text, motion and media behaviour, 1–400 characters. |
| `textFit` | Optional `{max, min}`, each a theme type-scale name (`caption`, `body`, `subtitle`, `title`). The `default` slot's text takes the largest size in the range that fits the safe area (`src/layout.ts`, task 025); text that does not fit at `min` is the warning W_TEXT_FIT. |

Numeric props, pixel or CSS values and functions are not allowed (PRD §5.5, AGENT.md).

## Theme tokens (task 019)
A theme is design tokens only: `colors` (five roles, `#RRGGBB`), `contrastPairs` (text and background roles), `typography` (family, weights, px scale, line heights), `space`, `radius` (px), `safeArea` (percent of width and height per aspect ratio, `"16:9"`), `motion` (ms). Rules:
- The file id equals its name. A declared text pair below WCAG AA (4.5:1) fails the load: a bad theme is a `RegistryError`.
- Resolution (task 019a): the `video render --theme` option, else front matter `theme:`, else `DEFAULT_THEME` (`modern`). The chosen name is checked by the validator, so an unknown name is `E_THEME_UNKNOWN` (stage 2) listing the ids, from either source.
- The canvas is filled with the theme's `colors.background`, unless `video.background` is set explicitly (`renderer/remotion/themes/canvas.ts`).
- Tokens never change the IR or the timeline (PRD §10.2). The renderer reads them through `useTheme()`.

## Loader API (`src/index.ts`)
- `listComponents()`: every contract, sorted by id (copies).
- `getComponent(id)`: one contract. An unknown id throws `RegistryError` listing the known ids; it never returns `undefined`.
- `loadComponentDir(dir)`, `parseContract(text, file)`: the checks behind the two calls. A bad file throws `RegistryError` naming the file and JSON path, e.g. `title.json: (root): must have required property 'slots'`.

## Does not own
- Rendering code → `renderer/remotion`. Checks of scenes against these contracts → `validator` (stage 2, task 014).

## Rules
- Registry content is static data; no functions in contract files.
- An entry is "released" only when its renderer implementation, docs page
  (`docs/components/<id>.md`) and visual cases exist. Unreleased entries must
  not be loadable. `title` is released (task 024): contract, renderer, docs
  page and `title-*` visual cases. Its `subtitle` slot is optional (task 024).
- `npm run check` includes a parity test: every registry id has a renderer
  implementation and vice versa (`renderer/remotion/test/registry-parity.test.ts`).
- Prop names are camelCase and semantic (`fit`, `frame`); never pixel values.

## Testing
- `test/contract.test.ts`: every shipped contract validates; each rule above rejects its bad input (missing `slots`, unknown field, numeric prop, enum without list, bad id, inverted bounds, non-JSON, stray file).
- `test/components.test.ts`: lookups, copies, unknown id.
- `test/transitions.test.ts`: the shipped names, and each rule that rejects a bad file.
- `test/transition-presets.test.ts`: the shipped presets (cut has no length, others have bounds, fallbacks are listed names), each rule that rejects a bad preset file, the match with `transitions.json`.
- `test/animations.test.ts`: the shipped presets, each rule that rejects a bad preset file, the two-way link to component contracts.
- `test/theme.test.ts`: the shipped theme validates; the AA contrast floor; each schema rule rejects its bad input; lookups list the known ids.
- `renderer/remotion/test/registry-parity.test.ts`: registry ids ⇔ `src/registry-map.ts`.
- `tests/integration/components.test.ts`: `video components` table and `--json`.

## Related
Tasks 013, 014, 015, 019, 021–035, 040–043. PRD §5.5, §5.6, §10. ADR-0004 (slot block kinds), ADR-0005 (transitions), ADR-0011 (animation in IR 1.1).
