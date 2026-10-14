# 016 — Asset paths and security boundary

Phase 2 · Status: todo · Depends on: 014 · PRD: §6.3, §11.3, §11.4, §18.5 · ADR: writes 0006

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
- [ ] Accepted: `assets/a b.png`, `assets/ünïcode.png`, `./assets/x.png`
      (normalised to `assets/x.png`).
- [ ] Rejected with distinct codes: missing file, absolute path, `../`
      escape, symlink pointing outside, `https://` URL.
- [ ] Diagnostics include asset path and scene id, and never print absolute
      paths outside the project.

Human check:
1. `npx video validate tests/fixtures/projects/assets-missing` →
   `Asset "assets/demo.png" was not found.` / `Referenced by scene "scene-001".`
2. Change `src` to `../../secret.png` → error saying the path is outside
   the project root.

## Notes

## Completion log
