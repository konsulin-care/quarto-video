# 003 — Minimal Lua filter → IR

Phase 1 · Status: done · Depends on: 002 · PRD: §4.3, §5.3, §8.1 · ADR: —

## Goal
A Quarto extension whose Lua filter turns a `.qmd` with `.scene` Divs into an
IR v0.1 manifest at `<project>/.video-build/manifest.json`.

## Scope
- In: `_extension.yml`; filter reading `video.fps/width/height/background`
  (no defaults yet: missing → filter error); each `.scene` Div →
  one scene with `component` attribute and plain-text content; `duration`
  accepted only as whole seconds `"<n>s"` (full parser in task 009); ids
  `scene-001…` by order. Lua unit-test runner.
- Out: defaults (010), source lines (011), structured content (012),
  any validation of component names (014).

## Deliverables
- `_extensions/video/_extension.yml`, `video.lua`, `lib/` modules.
- Documented invocation command (e.g. `quarto render <file> --to video-ir`
  or `quarto pandoc … --lua-filter`) chosen for reliability; record why in
  `_extensions/video/README.md`.
- `npm run test:lua` running Lua unit tests (Quarto's bundled Pandoc Lua).
- Fixture `tests/fixtures/projects/minimal-filter/index.qmd` (2 title scenes, 4 s each, 30 fps)
  + `expected.json`; golden test in `npm run test:integration`.
- Filter writes nothing outside `<project>/.video-build/`.

## Definition of done
Automated:
- [x] Golden test: produced manifest deep-equals `expected.json` and passes
      `validateIr`.
- [x] Lua unit tests cover: no scenes → empty `scenes`, non-scene Divs
      ignored, `duration="4s"` at 30 fps → 120.
- [x] Manifest contains no Pandoc type names or React identifiers.

Human check:
1. Run the documented command on `tests/fixtures/projects/minimal-filter`.
2. Open `.video-build/manifest.json`: two scenes, `scene-001`/`scene-002`,
   text matches the `.qmd`, `durationFrames` = seconds × fps.

## Notes
Risk: how Quarto lets a filter write a side file vs. its normal output; keep
the approach documented so task 007 can build on it.

Decisions:
- Invocation: `quarto pandoc <index.qmd> --from markdown --to native --lua-filter _extensions/video/video.lua`.
  The pinned Quarto bundles Pandoc 3.10 (Lua 5.4), and this form needs no Quarto project resolution.
- `quarto render` with `filters: [video]` also works (verified on a scratch copy). Quarto gives Pandoc a
  temp copy, so the filter uses `quarto.doc.input_file`. Quarto support itself is for ADR-0002 (task 007).
- Unknown attributes, classes or ids on a `.scene` Div, and nested `.scene` Divs, are errors, not dropped.
- `source.file` is the input file's name (project-relative); line numbers are task 011.
- Lua 5.1 selene std plus `pandoc.yml` (Pandoc globals). `math.type` is avoided for portability.
- Open for task 005: the IR schema requires `scenes` minItems 1 and `content.text` minLength 1, so an empty
  or blank-text scene passes the filter and fails `validateIr`. Left as is; not changed here.

## Completion log
- 2026-10-14: Minimal Lua filter in `_extensions/video/`: `video.lua`, `lib/` (settings, scenes, duration,
  manifest, json), `_extension.yml`. Writes `<project>/.video-build/manifest.json` (IR 0.1) and nothing else.
  Tests: `npm run test:lua` (21: no scenes → `[]`, non-scene Divs ignored, `4s` at 30 fps → 120, settings
  errors, encoder); `npm run test:integration` (golden deep-equals `expected.json`, `validateIr`, no Pandoc
  or React names, only `.video-build` written, stale manifest removed). `scripts/check.sh --all`,
  `scripts/test.sh --all`, `npm run check`, `npm run test` all exit 0 with the pinned tools on PATH.
  Follow-ups:
  - Quarto not installed in the sandbox (`command -v quarto` empty) and mise not installed. The pinned
    Quarto 1.10.19, StyLua 2.6.0 and selene 0.32.0 were downloaded from their GitHub releases into scratch
    space, outside the repo. Checksums not verified. `quarto render` was checked on a scratch copy only.
  - CI not verified: `ci.yml` runs `mise run test`, which should put `quarto` on PATH.
  - Human check pending: steps 1–2 (run the documented command, open the manifest).
  - Task 005 must decide empty-scene and blank-text handling (see Decisions).
  - Errors are plain Pandoc errors until the diagnostics model (task 008).
