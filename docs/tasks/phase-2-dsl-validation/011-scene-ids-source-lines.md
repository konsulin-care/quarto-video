# 011 — Scene ids and source lines

Phase 2 · Status: done · Depends on: 008 · PRD: §5.3, §8.2, §9.2 · ADR: —

## Goal
Every scene has a stable id, and every diagnostic about a scene or nested
block reports the correct `index.qmd` line number.

## Scope
- In: author ids via `{#intro .scene …}`; generated `scene-NNN` by document
  order otherwise; id format rule; duplicate ids → error; source line for
  each scene and nested Div stored in IR `source.line`.
- Out: content nodes (012).

## Deliverables
- Approach for line numbers documented in `_extensions/video/README.md`
  (Pandoc's Markdown reader has no source positions; e.g. pre-scan of the
  raw file matching fence order — choose and justify).
- `_extensions/video/lib/locate.lua` + tests.
- Fixtures with varying front-matter length, nested Divs, code blocks
  containing `:::` text (must not confuse the locator).

## Definition of done
Automated:
- [x] Generated ids are `scene-001`… in order; author ids preserved.
- [x] Duplicate id → `E_SCENE_DUPLICATE_ID` reporting both lines.
- [x] Invalid id (`#1 bad`) → error with suggestion.
- [x] Line numbers correct for every scene in the fixtures, including after
      a fenced code block containing `:::`.

Human check:
1. `npx video validate tests/fixtures/projects/scene-lines-error` → error
   header `ERROR index.qmd:<n>`; open the file: line `<n>` is the faulty
   scene's opening fence.
2. Add `{#intro …}` to a scene in a copy of `videos/hello`; `--print-ir`
   shows `"id": "intro"`.

## Notes
- Id rule: a letter, then lowercase letters, digits and hyphens, at most 64
  characters. Stricter than IR 0.1's pattern (which allows a digit first), so
  `#1` is an error as the DoD requires. `#Intro` is an error too.
- Generated `scene-NNN`: NNN is the scene's position among all scene Divs (nested
  ones included), so an author id does not renumber the others.
- Line numbers: Pandoc 3.1.3 has no `sourcepos`. A count-based pairing of
  fences with Divs was tried and gave a wrong line when a quote or a lazy list
  line was involved, so the final design marks each fence and verifies each
  pair (`_extensions/video/README.md`, "Source lines"). A mismatch gives no
  line rather than a wrong one.
- Existing exact-output tests now include the real line (`validate-diagnostics`
  three strings) and `expected.json` gained `source.line` (`minimal-filter`,
  `front-matter-empty|defaults|overrides`). Each line was checked against the file.
- Lines are stored for scenes only. Nested non-scene Divs get no line until
  content nodes exist (012).
- Not done, and needs a decision: a `.scene` inside a table cell is read as
  text and ignored (no error). The IR 0.1 schema requires `scenes` to have at
  least one item, but `_extensions/video/README.md` says a document without
  scenes gives `"scenes": []`. Both pre-date this task.

## Completion log
- 2026-10-14: done. Summary: author ids (`{#intro .scene …}`), generated
  `scene-NNN`, `E_SCENE_ID_INVALID` (with a suggestion), `E_SCENE_DUPLICATE_ID`
  (names both lines), `source.line` on each scene in IR 0.1 (optional), and
  `E_SCENE_SHAPE` for a scene fence Pandoc does not read as a block. Code:
  `_extensions/video/lib/scan.lua`, `lib/locate.lua`.
- Automated DoD satisfied by: `tests/integration/scene-lines.test.ts` (ids in
  IR, duplicate with both lines, invalid ids, nested line); fixtures
  `tests/fixtures/projects/scene-lines-ok|error|invalid-id`; Lua
  `_extensions/video/tests/test_scene_ids.lua` and `test_locate.lua`; IR
  `packages/ir/test/validate.test.ts` (source.line); validator `codes.test.ts`.
- Already satisfied before this task: generated ids in document order.
- Gates: see the report; all four passed on this change set.
- Follow-ups: content lines of nested Divs (task 012); `.scene` in table cells
  (see Notes); the IR `minItems` decision (see Notes).
- Pending human checks (not performed by the agent): 1. `npx video validate
  tests/fixtures/projects/scene-lines-error` shows `ERROR index.qmd:17` and line
  17 is the duplicate's opening fence. 2. Copy `videos/hello`, add `{#intro …}`
  to a scene; `--print-ir` shows `"id": "intro"`.
