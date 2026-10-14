# 012 — Content representation

Phase 2 · Status: todo · Depends on: 011 · PRD: §5.3, §8.2, §18.4 · ADR: writes 0004

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
- [ ] Golden test for `content-nodes` matches `expected.json`.
- [ ] IR contains none of Pandoc's type names (`Para`, `Str`, `Space`…).
- [ ] Raw HTML / table → `E_CONTENT_UNSUPPORTED` with line.
- [ ] Renderer integration test still passes on `videos/hello`.

Human check:
1. `npx video validate tests/fixtures/projects/content-nodes --print-ir` →
   `slots.left` holds a `strong` "CPUs" and a paragraph.
2. Add `<div>x</div>` inside a scene → error at that line; exit 1.

## Notes

## Completion log
