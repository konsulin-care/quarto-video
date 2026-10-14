# 016 — Asset paths and security boundary

Phase 2 · Status: done · Depends on: 014 · PRD: §6.3, §11.3, §11.4, §18.5 · ADR: writes 0006

## Goal
Every asset reference resolves inside the project root (or an explicitly
allowed shared root), exists, and is stored project-relative in the IR.

## Scope
- In: ADR-0006 (default root-only? shared roots config key? symlinks?);
  normalisation; rejection of absolute paths, `..` escapes, symlink escapes,
  URLs (`http:`, `file:`, `data:`); existence check; stage 3 runner.
  Applies to any `src` attribute (images/media arrive later).
- Out: media type/format checks (037).

## Deliverables
- `docs/decisions/0006-asset-security-boundary.md` (accepted).
- `packages/validator/src/assets/resolve.ts`, `src/stages/assets.ts`.
- Fixtures `assets-*` including names with spaces and non-ASCII.

## Definition of done
Automated:
- [x] Accepted: `assets/a b.png`, `assets/ünïcode.png`, `./assets/x.png`
      (normalised to `assets/x.png`).
- [x] Rejected with distinct codes: missing file, absolute path, `../`
      escape, symlink pointing outside, `https://` URL.
- [x] Diagnostics include asset path and scene id, and never print absolute
      paths outside the project.

Human check:
1. `npx video validate tests/fixtures/projects/assets-missing` →
   `Asset "assets/demo.png" was not found.` / `Referenced by scene "scene-001".`
2. Change `src` to `../../secret.png` → error saying the path is outside
   the project root.

## Notes
- Decisions (ADR-0006): root-only, no shared-root key yet (PRD §18.5); any `..` segment
  is `E_ASSET_ESCAPE`, even inside the root; symlinks allowed only when the real path stays
  inside the real root; missing or non-file is `E_ASSET_MISSING` (stage 3, not IR schema);
  percent-encoding is rejected, never decoded; names match exactly (case, no Unicode
  normalisation); backslash, control characters, trailing `/` are `E_ASSET_INVALID`;
  absolute paths are `E_ASSET_ABSOLUTE` and their text is not printed; URLs (any scheme,
  including `//host`) are `E_ASSET_URL`.
- Gap: no DSL attribute or IR field carries an asset reference yet (PRD §6.2 `src` is on
  `.video`, task 038; `image`, task 033). Stage 3 takes references from its caller and
  `video validate` does not pass any. Human check steps 1 and 2 need a human decision on
  which attribute carries the first reference.
- Fixtures: `tests/fixtures/projects/assets-names/` (root-only, no document); symlinks are
  created in temp dirs by the tests.

## Completion log
- 2026-10-14. Done. Stage 3 asset resolution (`packages/validator/src/assets/`,
  `src/stages/assets.ts`), six `E_ASSET_*` codes, ADR-0006 accepted.
  Tests (`npm run check`): `packages/validator/test/assets-{syntax,resolve,stage,fixtures}.test.ts`.
  Follow-ups: attach asset references to the DSL (033 or 038), then run stage 3 from the CLI;
  shared-root ADR if a shared root is wanted.
  Pending human checks: 1. `npx video validate tests/fixtures/projects/assets-missing` shows
  `Asset "assets/demo.png" was not found.` and `Referenced by scene "scene-001".` (blocked: no
  reference carrier). 2. `../../secret.png` gives an error that the path is outside the project root.
