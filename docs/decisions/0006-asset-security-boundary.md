# ADR-0006: Asset security boundary

- Status: accepted
- Date: 2026-10-14
- Task: 016
- PRD: §6.3, §11.3, §11.4, §18.5

## Context
PRD §11.3 requires project-relative paths for local assets; §11.4 requires that asset
paths be normalised and checked against permitted roots, that the renderer never fetch
remote resources, and that errors not expose unrelated environment data. AGENT.md
requires that asset paths resolve relative to the project root, that escaping it is an
error, and that the validator never executes project code or uses the network. PRD §18.5
asks whether references should be limited to the project root by default, with
explicitly configured shared roots. Where the PRD is silent, the conservative option
applies (AGENT.md). No DSL attribute or IR field carries an asset reference yet: `src`
first appears on `.video` blocks (task 038) and the `image` component (task 033).

## Options
1. **Roots.** (a) project root only; (b) project root plus a configured shared root now;
   (c) project root by default, shared roots later. Chosen: (a). A shared-root key is a new
   setting with its own validation, and no PRD example needs one. Shared roots need their
   own ADR, which names the key, its validation and how it is printed.
2. **Escapes.** (a) normalise `..` and reject only when the result leaves the root;
   (b) reject every `..` segment. Chosen: (b). `assets/../x.png` is a surprise to an author,
   and the rule is one line to state and test.
3. **Symlinks.** (a) reject every symlink; (b) follow the link and require its real path
   inside the real root. Chosen: (b). A link that stays inside is the same file; a link that
   leaves is `E_ASSET_SYMLINK`.
4. **Missing vs schema.** (a) a missing file or a bad path is an IR schema error (stage 2);
   (b) it is a stage 3 error, `E_ASSET_*`. Chosen: (b). Only stage 3 knows the root and the
   file system, and the IR schema must not depend on the disk.
5. **Percent-encoding.** (a) decode `%XX`; (b) take the text literally; (c) reject `%XX`.
   Chosen: (c). Decoding would make `a%2Fb` a different path than the author typed, and a
   literal reading would make a missing file look like a typo. Rejection says what to do.
6. **Case and Unicode.** (a) case-insensitive on case-insensitive file systems; (b) the
   name matches exactly on every platform. Chosen: (b). Otherwise a project passes on a Mac
   and fails on Linux. Unicode forms (NFC, NFD) are not normalised, so they are different names.

## Decision
- **Syntax (`src/assets/syntax.ts`, no file access).** A reference is project-relative and
  uses `/`. Each form has its code:
  - a leading `/` or `\`, or a drive letter such as `C:`: `E_ASSET_ABSOLUTE`. The text is not
    printed, so no path from outside the project appears in a diagnostic;
  - any `scheme:` (`http:`, `https:`, `file:`, `data:`, ...): `E_ASSET_URL`. This includes
    `//host/...`, which is caught as absolute first;
  - a `..` segment, even one that would stay inside: `E_ASSET_ESCAPE`;
  - empty, a control character, a backslash, a `%XX` sequence, a trailing `/`, or no file
    name: `E_ASSET_INVALID`.
  Empty and `.` segments are removed; the normalised form is what is stored and printed as
  the project-relative path (`./assets/x.png` becomes `assets/x.png`).
- **Existence (`src/assets/resolve.ts`).** Each segment must be listed in its directory
  with the exact spelling. Each directory is checked to lie inside the real root before
  it is listed. The target must be a regular file (a directory or a dangling link is
  missing): otherwise `E_ASSET_MISSING`.
- **Containment.** The real path (`realpath`) of the target must be the real root or inside
  it. Otherwise `E_ASSET_SYMLINK`. Only directory listings and metadata are read; file
  content is never read here.
- **Diagnostics (`src/stages/assets.ts`).** Severity `error`, with `file`, `line` and
  `sceneId` of the referencing scene, `assetPath` (the author's text, absent for absolute
  paths), and a message ending `Referenced by scene "<id>".`. Messages never contain a
  resolved absolute path or a symlink target.
- **Stage order.** Stage 3 runs after the contracts (stage 2) and before the timeline (stage
  4) and stops the run on error (PRD §9.1). It runs only when the caller passes references.
- **Not checked here.** Media type and format (task 037); source ranges (task 038).

## Consequences
- Each rejected form has a code and a message that says what to do; the tests cover each.
- `video validate` does not run stage 3 yet, because no DSL attribute or IR field carries
  a reference. Human check steps 1 and 2 of task 016 cannot be run until task 033 or 038
  adds one. This is flagged in the task file for a human decision.
- Authors cannot use `..` even inside the project. A later shared-root ADR must say how
  it reaches outside the root (for example with a named root key), not with `..`.
- Names with `%`, backslashes or Unicode forms that differ from the file system's must be
  renamed. A rename is the fix; decoding is not offered.

## Verification
- `npm run check`: `packages/validator/test/assets-syntax.test.ts` (each accepted and rejected
  form, the no-echo rule for absolute paths), `assets-resolve.test.ts` (exact case, NFC and NFD,
  missing, directory, symlink to outside, directory symlink outside, inside symlink, dangling
  link; temp-dir projects), `assets-stage.test.ts` (diagnostic fields and the runner's stage 3),
  `assets-fixtures.test.ts` (`tests/fixtures/projects/assets-names/expected.json`).
- `packages/validator/test/codes.test.ts`: the six `E_ASSET_*` codes are emitted, listed in the
  README table and in `DIAGNOSTIC_CODES`.

## References
- PRD §6.3 (asset validation), §9.2 (diagnostics name the asset and the scene), §11.3, §11.4,
  §18.5 (open decision, resolved here).
- AGENT.md invariants (asset paths; the validator never executes code or uses the network).
- ADR-0003 and ADR-0005 (stage and version conventions); task 016 Notes.
