# _extensions/video/ — Quarto extension and Lua filter
Status: Minimal filter (task 003): `.scene` Divs → IR 0.1 manifest. Defaults (010), source lines (011), structured content (012), diagnostics (008) and the full duration parser (009) are not done.

## Purpose
Turn the scene DSL inside `index.qmd` into a Video IR manifest (PRD §4.3, §5, §8.1). This is the only layer that sees Markdown or the Pandoc AST.

## Owns
- `_extension.yml` (extension metadata, filter registration) and `video.lua` (entry point).
- `lib/`: `settings.lua` (front matter), `scenes.lua` (`.scene` Divs), `duration.lua` (`"<n>s"` → frames), `manifest.lua` (IR table, JSON file), `json.lua` (deterministic encoder).
- `tests/`: Lua unit tests (`run.lua` runner, one `test_*.lua` per module).

## Does not own
- Component semantics (which slots/props are valid) → `packages/registry` and `packages/validator`. Component names are not checked here (task 014).
- File-system checks on assets → `packages/validator`.
- Any rendering, React, or Remotion code. Never generate code.

## Invocation (decided in task 003)
From the repository root:

```
quarto pandoc tests/fixtures/projects/minimal-filter/index.qmd \
  --from markdown --to native --lua-filter _extensions/video/video.lua > /dev/null
```

It writes `tests/fixtures/projects/minimal-filter/.video-build/manifest.json`. The `--to native` output is discarded; the manifest is the result.

Why this form:
- `quarto pandoc` runs the Pandoc bundled with the pinned Quarto (mise pins Quarto 1.10.19, Pandoc 3.10, Lua 5.4; ADR-0010). Tests and users run the same Lua.
- Plain Pandoc flags and no Quarto project or format resolution: deterministic, no dependency on undocumented Quarto internals (PRD §4.3).
- `quarto render index.qmd` also works when the document lists `filters: [video]`. Verified with 1.10.19 on a scratch copy only. Quarto gives Pandoc a temporary copy of the file, so the filter takes the project path from `quarto.doc.input_file` and falls back to Pandoc's input list. Whether `quarto render` is a supported entry point is for ADR-0002 (task 007); until then the CLI is the reference.

Writes: only `<project>/.video-build/manifest.json`. A run first deletes any old manifest, so a rejected document never leaves a stale one.

## DSL reference
| Input | Scope | Type | Default | Since |
| --- | --- | --- | --- | --- |
| `video.width`, `video.height` | front matter | integer ≥ 1 | none, required | 003 |
| `video.fps` | front matter | integer ≥ 1 | none, required | 003 |
| `video.background` | front matter | `"#RRGGBB"` | none, required | 003 |
| `.scene` | top-level block | Div with class `scene` only | — | 003 |
| `component` | `.scene` | non-empty string, not checked | none, required | 003 |
| `duration` | `.scene` | `"<n>s"`, whole seconds ≥ 1 | none, required | 003 |

Rules:
- Scenes are numbered `scene-001`, `scene-002`… in document order. A document with no scenes gives `"scenes": []`.
- Content is the scene's plain text, one line per paragraph (structured content is task 012).
- Any other attribute, class or identifier on a `.scene` Div is an error, never ignored. A `.scene` nested in another block is an error.
- Missing required settings are filter errors (no defaults until task 010). Errors stop Pandoc with a message; no diagnostics file exists yet (task 008).

## Testing
- `npm run test:lua` runs `quarto pandoc lua _extensions/video/tests/run.lua`: unit tests for scenes, durations, settings and the encoder.
- `npm run test:integration` runs the golden test (`tests/integration/minimal-filter.test.ts`): manifest deep-equals `expected.json`, passes `validateIr`, and contains no Pandoc or React names.
- Both need `quarto` on `PATH` (mise provides the pinned version). Without it they fail with "quarto: not found".

## Rules
- Lua code must be pure: no `os.execute`, `io.popen`, network, or reading files other than the document being processed.
- Attribute names are case-sensitive and passed through unchanged; unknown attributes are NOT dropped (they are errors here).
- Keep the Pandoc dependency inside this directory. IR content nodes must not contain Pandoc type names (`Para`, `Str`, …).
- Duration conversion must pass `packages/ir/test-vectors/durations.json` once task 009 adds it.

## Related
Tasks 003, 008–012, 015, 038. ADR-0002, 0003, 0004, 0005.
