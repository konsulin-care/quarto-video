# 012 — Content representation

Phase 2 · Status: done · Depends on: 011 · PRD: §5.3, §8.2, §18.4 · ADR: writes 0004

## Goal
Scene Markdown becomes renderer-independent structured content organised into
named slots, without exposing Pandoc internals.

## Scope
- In: ADR-0004 choosing the node set (e.g. heading, paragraph, text, strong,
  emphasis, code, list/item, link?, image ref) and slot rules: nested
  Divs with a class (`.left`, `.right`, `.text-overlay`) → named slots;
  loose content → `default` slot. Unsupported Markdown (tables, raw HTML,
  footnotes, math) → error. IR schema bump to `0.2`.
- Out: per-component slot validity (014); media blocks (038).

## Deliverables
- `docs/decisions/0004-ir-content-representation.md` (accepted).
- `packages/ir/schema/ir-0.2.json` + examples; v0.1 still accepted.
- `_extensions/video/lib/content.lua` + tests.
- Fixture `tests/fixtures/projects/content-nodes` covering every node type.
- Renderer placeholder `title` renders text from the new content model.

## Definition of done
Automated:
- [x] Golden test for `content-nodes` matches `expected.json`.
- [x] IR contains none of Pandoc's type names (`Para`, `Str`, `Space`…).
- [x] Raw HTML / table → `E_CONTENT_UNSUPPORTED` with line.
- [x] Renderer integration test still passes on `videos/hello`.

Human check:
1. `npx video validate tests/fixtures/projects/content-nodes --print-ir` →
   `slots.left` holds a `strong` "CPUs" and a paragraph.
2. Add `<div>x</div>` inside a scene → error at that line; exit 1.

## Notes
- Node set, slot rules and unsupported list: ADR-0004 (decided here, conservative).
  Flagged for a human: links, HTML comments, footnotes and math are errors, not
  content (links need a URL policy; comments may be wanted as authoring notes).
- Slot names: any class that matches `^[a-z][a-z0-9-]*$`; a closed list waits for
  task 014, which checks slots per component. `default` is reserved.
- Quotes become `quoted` nodes (Pandoc smart quotes), not errors.
- Heading ids are not carried; other attributes on headings, code and inline
  code are errors. A list must start at 1 and be decimal (delimiter ignored).
- Scene without content: `E_IR_SCHEMA` at `/scenes/<i>/content/slots`, as in 0.1.
- Prose outside scenes is not video content, so it is not checked.
- Lines: each unsupported element is searched in its scene's raw text
  (`lib/content_lines.lua`); no recognised text means no line.
- Limits: `<div class="x">` is a slot (Pandoc reads it as a Div); a raw HTML
  block right before a scene's closing fence swallows the fence (Pandoc);
  nested blocks in slots and citations get no line.
- `expected.json` of five fixtures regenerated for the 0.2 shape. One change is
  a content move, not a regression: `scene-lines-ok` "closing" text is now in
  slot `note` (a nested Div is a slot), so `default` is empty there.
- `plainText` has its own export (`@quarto-video/ir/text`): the renderer bundle
  must not pull in ajv through the package index (found by the render test).

## Completion log

## Completion log
- 2026-10-14: done. Summary: scene content is typed blocks in named slots (IR
  0.2, ADR-0004). Unsupported Markdown is `E_CONTENT_UNSUPPORTED` at its line.
  Already satisfied before: none of the Definition-of-done boxes.
  Code: `_extensions/video/lib/content*.lua`, `packages/ir/schema/ir-0.2.json`,
  `packages/ir/src/{content-types,text,validate}.ts`, renderer `IrVideo.tsx`
  and `Root.tsx`.
- Tests covering the change: `_extensions/video/tests/test_content.lua`,
  `test_content_lines.lua`, `test_scenes.lua`, `test_json.lua`;
  `packages/ir/test/content.test.ts`, `schema.test.ts`; `codes.test.ts`;
  `tests/integration/content-nodes.test.ts` (golden `content-nodes`; raw HTML
  and table at their lines); `validate.test.ts` (empty-scene path).
- Gates (all exit 0): `npm run check`: "Tests 102 passed (102)";
  `scripts/check.sh --all`: "check: passed (all)"; `npm run test:lua`:
  "lua tests: 163 passed, 0 failed"; `npm run test:integration`: vitest
  "Tests 2 passed (2)" and node "pass 55 / fail 0" (includes `quarto-render`
  of `videos/hello`).
- Follow-ups: task 014 (slot names per component); task 038 (images, media);
  human decision on links and HTML comments; link policy (task 016 or an ADR).
- Pending human checks (not performed by the agent): 1. `npx video validate
  tests/fixtures/projects/content-nodes --print-ir` shows `slots.left` with a
  `strong` "CPUs" and a paragraph. 2. Add `<div>x</div>` inside a scene of a
  copy of a fixture: error at that line, exit 1.
