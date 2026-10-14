# _extensions/video/ — Quarto extension and Lua filter
Status: `.scene` Divs → IR 1.0 manifest (tasks 003, 012, 015, 017; ADR-0007); `video.output` (006); diagnostics (008); durations → frames (009); front matter defaults (010); scene ids and source lines (011); typed content in slots (012, ADR-0004); transitions and the timeline (015, ADR-0005).

## Purpose
Turn the scene DSL inside `index.qmd` into a Video IR manifest (PRD §4.3, §5, §8.1). This is the only layer that sees Markdown or the Pandoc AST.

## Owns
- `_extension.yml` (extension metadata, filter registration) and `video.lua` (entry point).
- `lib/`: `config.lua` (front matter settings and defaults, ADR-0003 default duration), `config_keys.lua` (unknown keys, "did you mean"), `meta.lua` (front matter value shapes), `scenes.lua` (`.scene` Divs), `duration.lua` (`"<n>s"`/`"<n>ms"` → frames, ADR-0003), `scan.lua` (raw-text scan of scene fences), `locate.lua` (scene ids, Div pairing, source lines), `manifest.lua` (IR table, JSON file), `generator.lua` (extension and CLI versions in `generator`, ADR-0007), `diagnostics.lua` (error codes, collection, `diagnostics.json`), `json.lua` (deterministic encoder), `content.lua` (scene content: slots, blocks, unsupported findings), `content_inlines.lua` (inline nodes), `content_lines.lua` (lines of unsupported content), `transitions.lua` (a scene's incoming transition, ADR-0005), `timeline.lua` (start frames and total, ADR-0005).
- `tests/`: Lua unit tests (`run.lua` runner, one `test_*.lua` per module; `pandoc lua _extensions/video/tests/run.lua` runs them without quarto).

## Does not own
- Component semantics (which slots and durations are valid) → `packages/registry`; checks against them → `packages/validator` (stage 2, task 014).
- File-system checks on assets → `packages/validator`.
- Any rendering, React, or Remotion code. Never generate code.

## Invocation (decided in task 003)
From the repository root:

```
quarto pandoc tests/fixtures/projects/minimal-filter/index.qmd \
  --from markdown --to native --lua-filter _extensions/video/video.lua > /dev/null
```

It writes `.video-build/manifest.json`; the `--to native` output is discarded. `quarto pandoc` runs the pinned Pandoc (ADR-0010) without project resolution (PRD §4.3). `video validate` runs this same invocation (`packages/cli/src/filter.ts`).

Writes: only `<project>/.video-build/manifest.json` (the IR), `<project>/.video-build/render.json` (`{"output": "<video.output>"}`, container settings kept out of the IR, PRD §5.2) and `<project>/.video-build/diagnostics.json` (an array; `[]` on success). A run first deletes all three.

## Front matter settings (task 010)
Every value that is present must be valid. Omitted values take the default. An empty `video:` block means all defaults.

| Key | Type | Default | Required? | Inheritance and notes |
| --- | --- | --- | --- | --- |
| `video.width`, `video.height` | integer ≥ 1, even (H.264) | 1920, 1080 | no | Only the IR carries them. |
| `video.fps` | integer ≥ 1 | 30 | no | Scene durations convert at this fps (ADR-0003). |
| `video.output` | relative path ending `.mp4`, no `..` | `output.mp4` | no | `render.json`, not the IR. |
| `video.background` | `"#RRGGBB"` | `"#000000"` | no | Black until a theme supplies a background (task 019). |
| `title` | text | none | no | Stored; not in the IR yet. |
| `theme` | text | none | no | Stored; resolved by task 019. Absent means no theme yet. |
| `defaults.scene.duration` | `<n>s` or `<n>ms` (ADR-0003) | none | no | Applies to every `.scene` without `duration`. An explicit scene `duration` wins. |
| `defaults.scene.transition` | transition name (`[a-z][a-z0-9-]*`) | none | no | Applies to every scene after the first that has no `transition`; a non-cut default needs `transitionDuration` on each scene it reaches. Registry check: validator stage 4. |

Rules:
- Unknown keys under `video` and `defaults` are `E_CONFIG_UNKNOWN_KEY`, with a "did you mean" suggestion when a known key is close. Top-level keys are shared with Quarto and are not checked here.
- `codec` and `container` are rejected as not supported yet (PRD §5.2).
- Settings the IR does not carry (`title`, `theme`) are validated here and stored until their tasks use them.
- A scene without a duration and without a default is `E_SCENE_NO_DURATION`.

## Scenes and durations
| Input | Scope | Type | Default | Since |
| --- | --- | --- | --- | --- |
| `component` | `.scene` | non-empty string, not checked | none, required | 003 |
| `duration` | `.scene` | `"<n>s"` or `"<n>ms"`, up to 3 decimals, > 0, ≤ 3600 s, ≥ 1 frame; rounds half up to frames | `defaults.scene.duration`, else required | 003 (form 009, default 010) |
| `transition` | `.scene` | a transition name; `cut` takes no time | `defaults.scene.transition` for scenes after the first, else none | 015 (ADR-0005) |
| `transitionDuration` | `.scene` | as `duration` (> 0, rounds to frames); required for a non-cut transition, forbidden for `cut` or without a transition | none | 015 |

Rules:
- Scene ids: the author's `#id`, else `scene-NNN` where NNN is the scene's position among all scene Divs (1-based, document order). An author id does not renumber the others. A document with no scenes gives `"scenes": []`.
- Id rule: a letter, then lowercase letters, digits and hyphens, at most 64 characters (`#1` and `#Intro` are `E_SCENE_ID_INVALID` with a suggestion). Two scenes with one id, including a generated id, are `E_SCENE_DUPLICATE_ID`; the message names both lines.
- Each scene's `source.line` in the IR is the 1-based line of its opening fence in `index.qmd`.
- Content is typed blocks in slots (ADR-0004; table below). Each Markdown element outside the node set is `E_CONTENT_UNSUPPORTED` at its line.
- Any other attribute or class on a `.scene` Div is an error, never ignored. A `.scene` nested in another block is an error (with its line).
- Transitions (ADR-0005): a transition belongs to the scene it enters and overlaps the previous scene by its length. The first scene takes none (`E_TRANSITION_FIRST_SCENE` for `fade`). Errors: `E_TRANSITION_DURATION` (missing, or on a cut), `E_TRANSITION_UNKNOWN` (bad syntax here; unknown names in stage 4). Lengths and overlaps are checked by the validator (stage 4).
- Every bad setting and every bad scene is reported in one run. Scene and duration problems carry their scene id; a bad default names the setting.

## Source lines (tasks 011, 012)
Pandoc 3.10 has no `sourcepos`. `lib/scan.lua` reads the raw `.qmd` (skipping
front matter, fenced code and HTML comments) and marks each scene fence and its
closing fence. `lib/locate.lua` pairs marks with the scene Divs and keeps a line
only when nesting, attributes and text agree. `lib/content_lines.lua` finds the
line of each unsupported element. No recognised text means no line, never a wrong one.

## Scene content (task 012, ADR-0004)
| Markdown in a `.scene` | IR (`content.slots.<name>`) |
| --- | --- |
| paragraph, heading, bullet or decimal list (from 1), fenced code | `paragraph`, `heading`, `list`, `code-block` |
| `**strong**`, `*emphasis*`, `"quoted"`, `` `code` ``, hard break | `strong`, `emphasis`, `quoted`, `code`, `line-break`; text is `text` |
| `::: {.left}` (one class, a valid slot name) | slot `left`; loose blocks are `default` |

- A slot name is `^[a-z][a-z0-9-]*$`. `default` is reserved. Which names a component accepts is checked by the validator (task 014).
- Unsupported (error, line given when found): tables, raw HTML and comments, footnotes, math, links, images, quotes blocks, rules, spans and other inline styles, attributes on headings and code, a Div without a slot class, a second or empty slot, a nested block in a slot.

## Diagnostics (task 008)
- Stages collect errors with `diagnostics.try`; on error the filter writes the array and fails Pandoc. Codes: `packages/validator/README.md`.

## Testing (both need `quarto` on `PATH`, provided by mise)
- `npm run test:lua` runs `quarto pandoc lua _extensions/video/tests/run.lua`: unit tests for scenes, scene ids (`test_scene_ids.lua`), the source scan (`test_locate.lua`), durations, config, config keys and the encoder.
- `test_content.lua`, `test_content_lines.lua`: nodes, slots, each unsupported kind, lines.
- `tests/integration/scene-lines.test.ts` checks ids and lines through the CLI (fixtures `tests/fixtures/projects/scene-lines-*`).
- `tests/integration/content-nodes.test.ts`: the golden `content-nodes` IR, read with the filter alone (its components are not registered yet), and `E_CONTENT_UNSUPPORTED` at the line (fixtures `content-unsupported-*`).
- `test_transitions.lua` (each transition rule and error), `test_timeline.lua` (shared vectors, the ADR-0005 worked example in the manifest).
- `npm run test:integration` runs the golden test (`minimal-filter.test.ts`), the `video` CLI tests and `front-matter.test.ts` (defaults, overrides, unknown key, invalid values; fixtures `tests/fixtures/projects/front-matter-*`).

## Rules
- Lua code is pure: no `os.execute`, `io.popen`, network, or reading files other than the document. Attribute names are case-sensitive; unknown attributes are errors, never dropped.
- Keep Pandoc inside this directory: IR nodes must not use Pandoc names (`Para`, `Str`, …).
- Duration conversion must pass `packages/ir/test-vectors/durations.json` (ADR-0003).

## Related
Tasks 003, 007, 008–012, 015, 019, 038. ADR-0002, 0003, 0004, 0005.
