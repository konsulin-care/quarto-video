# 011 — Scene ids and source lines

Phase 2 · Status: todo · Depends on: 008 · PRD: §5.3, §8.2, §9.2 · ADR: —

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
- [ ] Generated ids are `scene-001`… in order; author ids preserved.
- [ ] Duplicate id → `E_SCENE_DUPLICATE_ID` reporting both lines.
- [ ] Invalid id (`#1 bad`) → error with suggestion.
- [ ] Line numbers correct for every scene in the fixtures, including after
      a fenced code block containing `:::`.

Human check:
1. `npx video validate tests/fixtures/projects/scene-lines-error` → error
   header `ERROR index.qmd:<n>`; open the file: line `<n>` is the faulty
   scene's opening fence.
2. Add `{#intro …}` to a scene in a copy of `videos/hello`; `--print-ir`
   shows `"id": "intro"`.

## Notes

## Completion log
