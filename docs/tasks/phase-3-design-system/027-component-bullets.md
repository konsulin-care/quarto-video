# 027 — Component `bullets`

Phase 3 · Status: in-progress · Depends on: 024 · PRD: §5.4 (3), §5.5, §10.2 · ADR: —

## Goal
Release the `bullets` component: sequential points or a compact list.

## Scope
- In: slot `default` must contain one list (2–6 items, else error); optional `heading` slot; items appear in order.
- Out: other components; media placements (Phase 4).

## Deliverables
- Contract `packages/registry/components/bullets.json`.
- Renderer `renderer/remotion/components/bullets/` + `registry-map.ts` entry.
- Docs `docs/components/bullets.md` from the component template.
- Fixture `tests/fixtures/projects/component-bullets/` (valid) and
  `component-bullets-invalid/` (one scene per contract violation).
- Visual cases `tests/visual/cases/bullets-*.json` with references.

## Definition of done
Automated:
- [x] Contract validates; parity test passes; `video components` lists `bullets`.
- [x] Each contract violation in the invalid fixture yields its code and line.
- [x] 7 items → `E_SLOT_CONSTRAINT` with the limit.
- [x] Long items wrap; all items visible on the last frame (visual case `bullets-long`).
- [x] Every compatible animation renders without clipping (visual cases `bullets-animations`; see Notes on reveal).

Human check:
1. `npx video render tests/fixtures/projects/component-bullets` and watch it.
2. Review against `docs/components/bullets.md`: legible at 1080p, consistent
   with the theme, no clipped or overlapping text.
3. `npx video validate tests/fixtures/projects/component-bullets-invalid` → one
   actionable error per violating scene.

## Notes
- Contract: `default` slot `accepts: ["list"]`, `items: {minItems: 2, maxItems: 6}`
  (new optional `items` object in `schema/contract.json`, typed in `types.ts`,
  checked in `load.ts`). `heading` slot optional, accepts `heading`.
  Animations: fade-in, reveal, slide-up. Duration 1000–30000 ms.
- Stage 2 emits `E_SLOT_CONSTRAINT` (new code in `diagnostic.ts` and the
  validator README) with the item count and the 2–6 limit.
- Renderer: one row per list item, bullet in `colors.accent`, text wraps
  (`overflowWrap: anywhere`). Items are split on newlines, so a list
  item that itself spans lines in IR is not supported.
- Reveal: the known wipe is untouched. Reveal visual cases capture only
  the end state, so reveal mid-animation clipping is not verified.
- Visual references are 640x360 (harness size). Not verified at 1080p;
  the human check covers that.
- Quarto render test (`quarto render videos/hello`) fails only when the
  checkout path contains a dot-directory (the `.claude/worktrees/...`
  path). The post-render hook then does not run. The same commit in a
  dot-free copy passes all 3 tests.
- Shared-file edits (additive): animation `compatibleComponents` JSONs,
  `registry-map.ts`, root `package.json` integration list,
  `docs/components/README.md`, `contract.test.ts` expectations
  ("Available components: bullets, title."), registry tests,
  validator README and `DIAGNOSTIC_CODES`.
- Human checks 1–3 are not run here; they need a person watching the
  render at 1080p.

## Completion log
- 2026-10-15: `check.sh --all` exit 0 (`scratchpad/check-all.log`).
  `test.sh --all` exit 0 on a dot-free copy of commit 7f87831
  (`scratchpad/test-dotfree.log`: scripts, unit, lua, integration 125/125,
  visual all pass). `test.sh --all` in the worktree exits 1 on the one
  quarto dot-path test (`scratchpad/test-wt.log`), as described above.
  Blocked: the gate is not exit 0 on the worktree path. Status stays
  in-progress until the gate runs green from a dot-free checkout or the
  quarto test is made path-independent.
