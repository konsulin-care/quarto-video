# _extensions/video/ — Quarto extension and Lua filter
Status: Not implemented — built by tasks 003, 008–012, 015, 038, 044–046.

## Purpose
Turn the scene DSL inside `index.qmd` into a Video IR manifest (PRD §4.3, §5,
§8.1). This is the only layer that sees Markdown or the Pandoc AST.

## Owns
- `_extension.yml` and the filter entry point (`video.lua`) + Lua modules.
- Recognising `.scene` Divs and nested blocks (`.left`, `.video`, …).
- Reading front matter (`video.*`, `theme`, `defaults.*`) and applying defaults.
- Converting durations to integer frames (ADR-0003, shared test vectors).
- Generating scene ids and recording source line numbers.
- Mapping Markdown content to IR content nodes (ADR-0004).
- Emitting syntax-level diagnostics (malformed blocks, bad attribute syntax).

## Does not own
- Component semantics (which slots/props are valid) → `packages/registry`
  + `packages/validator`. The filter passes attributes through faithfully.
- File-system checks on assets → `packages/validator`.
- Any rendering, React, or Remotion code. Never generate code.

## Inputs → outputs
- In: `index.qmd` via Quarto/Pandoc (invocation documented in task 003).
- Out: `<project>/.video-build/manifest.json` (IR) and
  `<project>/.video-build/diagnostics.json` (diagnostic list, task 008).
- The filter must emit IR even when it emits errors, so the validator can
  report everything in one pass; it marks the manifest `"valid": false`.

## Layout (grows with tasks)
- `_extension.yml` — extension metadata and format/filter registration.
- `video.lua` — entry point; keep thin, delegate to modules.
- `lib/*.lua` — one module per concern (config, duration, scenes, content).
- `tests/` — Lua unit tests run by `npm run test:lua` (wired in task 003).

## Rules
- Lua code must be pure: no `os.execute`, `io.popen`, network, or reading files
  other than the document being processed.
- Attribute names are case-sensitive and passed through unchanged; unknown
  attributes are NOT dropped (the validator rejects them).
- Keep the Pandoc dependency inside this directory. IR content nodes must not
  contain Pandoc type names (`Para`, `Str`, …).
- Duration conversion must pass `packages/ir/test-vectors/durations.json`.
- Document every DSL rule you implement in the "DSL reference" section below.

## DSL reference
(Empty. Each task appends the syntax and defaults it implements, as a table:
attribute / scope / type / default / since-task.)

## Testing
- Lua unit tests: `npm run test:lua`.
- Golden IR tests (qmd → expected JSON): `npm run test:integration`.

## Related
Tasks 003, 008–012, 015, 038. ADR-0002, 0003, 0004, 0005.
