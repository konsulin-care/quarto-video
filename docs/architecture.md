# Architecture
Status: Target design. Tasks fill it in; ADRs refine it. PRD refs: §4, §8, §9.

## Summary
Authors write `index.qmd`. A Quarto/Pandoc Lua filter turns the scene DSL into
a JSON **Video IR** manifest. A TypeScript **validator** checks the IR against
the **registry** (component contracts, presets, themes) and the project's
assets. Only a fully valid IR reaches the **Remotion renderer**, which encodes
`output.mp4`. The **`video` CLI** orchestrates every step. The IR is the only
contract between authoring and rendering.

## Layers
| Layer     | Location               | Language | Input → Output                              |
| --------- | ---------------------- | -------- | ------------------------------------------- |
| Extension | `_extensions/video/`   | Lua      | `.qmd` (Pandoc AST) → IR JSON + diagnostics |
| IR        | `packages/ir/`         | TS/JSON  | JSON Schema, types, time rules, versions    |
| Registry  | `packages/registry/`   | TS/JSON  | Contracts, presets, themes as data          |
| Validator | `packages/validator/`  | TS       | IR + registry + assets → diagnostics        |
| CLI       | `packages/cli/`        | TS       | Path → orchestrates filter/validate/render  |
| Renderer  | `renderer/remotion/`   | TS/React | Valid IR → frames → `output.mp4`            |

## Responsibilities and boundaries
- **Extension** recognises DSL blocks, reads front matter, applies defaults,
  converts durations to frames, records source lines, and reports syntax-level
  errors. It knows DSL syntax, not component semantics.
- **IR** is renderer-independent, versioned, JSON-serialisable, integer frames
  only. Renderer-specific data lives only under an `x-<renderer>` key.
- **Registry** declares what exists (ids, slots, props, bounds, compatible
  presets, theme tokens). It is data; it contains no rendering code.
- **Validator** runs PRD §9.1 stages 2–4 (schema, assets, timeline) and the
  post-render check (stage 6). It stops at the first stage with an error. It
  never executes project code and never uses the network.
- **CLI** resolves the project root, runs the extension, validator, preflight
  (stage 5) and renderer, prints diagnostics and progress, sets exit codes.
- **Renderer** maps registry ids to React components. Visual state is a pure
  function of `(IR, frame)`. It assumes the IR is valid but re-checks
  `schemaVersion`.

## Dependency rule
`ir` ← `registry` ← `validator` ← `cli`; `renderer` → `ir`, `registry`.
Nothing imports `cli`. The renderer never imports `validator`. Replacing the
renderer must require only the IR and the registry.

## Artifacts and locations
| Artifact            | Location                                     | Committed |
| ------------------- | -------------------------------------------- | --------- |
| Source project      | `videos/<name>/index.qmd`, `assets/`, `data/` | yes       |
| IR manifest         | `videos/<name>/.video-build/manifest.json`   | no        |
| Filter diagnostics  | `videos/<name>/.video-build/diagnostics.json`| no        |
| Media metadata cache| `videos/<name>/.video-build/media.json`      | no        |
| Build info          | `videos/<name>/.video-build/build-info.json` | no        |
| Output video        | `videos/<name>/<video.output>` (`output.mp4`)| no        |

Cleanup policy (task 006): `packages/cli/README.md`.

## Cross-cutting rules
- Paths: every asset path is project-relative; resolution and the security
  boundary are defined by ADR-0006.
- Time: durations → frames per ADR-0003; timeline and transitions per ADR-0005.
  Source time (inside footage) is never mixed with timeline time.
- Diagnostics: one shape everywhere (task 008); human and `--json` output.
- Determinism: no wall clock, randomness, network, or browser state in the
  renderer; dependencies pinned (ADR-0001).
- Quarto-native rendering (`quarto render`) is supported only as far as
  ADR-0002 and ADR-0022 verified. The CLI is always the reference entry point.

## Decisions
See `docs/decisions/README.md` for the ADR index (0001–0009).
