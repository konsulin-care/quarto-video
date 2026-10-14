# ADR-0004: IR content representation

- Status: accepted
- Date: 2026-10-14
- Task: 012
- PRD: §5.3, §8.2, §18.4

## Context
PRD §5.3 requires scene content parsed into structured content, not stored only
as flat text. PRD §8.2 requires an IR with no renderer types, and §18.4 asks
which Pandoc nodes to keep without coupling the renderer to Pandoc. IR 0.1 holds
one flat `content.text`. Task 011 left nested Div content to this task. Pandoc
3.10 (`quarto pandoc`, pinned by Quarto 1.10.19) has no `sourcepos`, so source
lines come from the raw-text scan of task 011 (`_extensions/video/README.md`).
AGENT.md: unknown inputs are errors, and authors choose semantic properties.

## Options
1. **Mirror the Pandoc AST** (`Para`, `Str`, `Space`, ...). Rejected: couples the
   renderer to Pandoc internals (PRD §18.4) and puts forbidden names in the IR.
2. **Keep Markdown text** and let the renderer parse it. Rejected: the renderer
   would need a Markdown parser, which breaks "the IR is the contract".
3. **Closed typed node set** (chosen): a small set of lowercase node types.
   Anything outside it is an error, never dropped.
4. **Open node set** (every Pandoc element under a generic name). Rejected:
   widens scope silently; each new element needs its own decision.

## Decision
1. **Blocks** in `content.slots.<name>[]`: `paragraph {inlines}`; `heading {level
   1–6, inlines}`; `list {ordered, items: [{blocks}]}` (ordered lists start at 1
   and use decimal numbers; the delimiter `.` or `)` is formatting only);
   `code-block {text, language?}` (language = the one class, if any).
2. **Inlines**: `text {text}` (adjacent text merged; a soft break is a space);
   `strong`, `emphasis` and `quoted {quote: double|single, inlines}` (Markdown
   quotes; the IR does not change their characters); `code {text}` (no
   attributes); `line-break`.
3. **Slots**: a nested Div with exactly one class names a slot. The name matches
   `^[a-z][a-z0-9-]*$` (at most 64 characters). Blocks outside slot Divs form
   `default`. Divs inside slots, an empty slot, a second slot of one name (the
   first is kept) and the author class `default` are errors. Which slots a
   component accepts is checked by task 014, not here.
4. **Unsupported** (`E_CONTENT_UNSUPPORTED`, at the element's line): tables;
   raw HTML and HTML comments (block or inline); footnotes; math; links and
   autolinks; images and figures; block quotes; horizontal rules; spans,
   underline, small caps, strike-through, superscript, subscript; citations;
   attributes on headings, code blocks or inline code; ordered lists that do not
   start at 1 or are not decimal; a Div without a slot class (such as an HTML
   `<div>`); definition lists, line blocks and any other element. Images wait for
   task 038; links need a URL policy (task 016 and an open question for a human).
5. Heading identifiers are not carried. Any other attribute is an error.
6. **Scope**: content is the scene's `.scene` Div only. Prose outside scenes is
   not video content, so unsupported Markdown there is not an error.
7. **Lines**: each unsupported element is searched for in the scene's raw text,
   in order, before its closing fence, in prose only (`lib/content_lines.lua`).
   An element whose text cannot be recognised has no line, never a wrong one.
8. **Empty scene**: no content is an IR schema error (`E_IR_SCHEMA` at
   `/scenes/<i>/content/slots`), as in IR 0.1.
9. **Schema**: `schema/ir-0.2.json` replaces `content.text`. The filter emits 0.2.
   IR 0.1 stays valid (`validateIr`, `ir:check`). An unknown `schemaVersion` is an
   error at `/schemaVersion`.
10. **Renderers** read content through `plainText` (`@quarto-video/ir/text`): the
    `default` slot's blocks, one per line. Other slots are not drawn yet.

## Consequences
- Authors can write structured scene content; later components read slots by name.
- Markdown that IR 0.1 dropped silently (tables, HTML, footnotes, math, links,
  images) now fails validation. This is deliberate, and it is the most visible
  change for authors.
- Nested Divs in a scene are slots, so their text is no longer in `default`
  (`scene-lines-ok` fixture, "closing" scene).
- Known limits: `<div class="x">` is read as a Div, so it is a slot; a raw HTML
  block directly before a scene's closing fence can swallow the fence (Pandoc);
  no line is found for citations, nested blocks in slots, or tables without
  pipes or borders.
- Follow-ups: task 014 (slot names per component); task 038 (images and media);
  a human decision on links and HTML comments; an ADR for a link policy if wanted.

## Verification
- `npm run test:lua`: `test_content.lua` (each node and each error kind),
  `test_content_lines.lua` (lines, nth slot, no wrong line), `test_scenes.lua`,
  `test_json.lua` (booleans).
- `npm run check`: `packages/ir/test/content.test.ts` (examples, schema errors,
  `plainText`), `schema.test.ts` (both schemas); `packages/validator/test/codes.test.ts`.
- `npm run test:integration`: `content-nodes.test.ts` (golden `content-nodes`;
  `E_CONTENT_UNSUPPORTED` for raw HTML and a table at their lines, exit 1), and
  the existing render tests on `videos/hello` through `quarto render`.

## References
- PRD §5.3, §8.2, §18.4; ADR-0003 (duration rules); ADR-0010 (testing policy).
- Task 011, "Source lines" in `_extensions/video/README.md`.
