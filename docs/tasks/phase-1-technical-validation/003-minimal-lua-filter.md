# 003 — Minimal Lua filter → IR

Phase 1 · Status: in-progress · Depends on: 002 · PRD: §4.3, §5.3, §8.1 · ADR: —

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
- [ ] Golden test: produced manifest deep-equals `expected.json` and passes
      `validateIr`.
- [ ] Lua unit tests cover: no scenes → empty `scenes`, non-scene Divs
      ignored, `duration="4s"` at 30 fps → 120.
- [ ] Manifest contains no Pandoc type names or React identifiers.

Human check:
1. Run the documented command on `tests/fixtures/projects/minimal-filter`.
2. Open `.video-build/manifest.json`: two scenes, `scene-001`/`scene-002`,
   text matches the `.qmd`, `durationFrames` = seconds × fps.

## Notes
Risk: how Quarto lets a filter write a side file vs. its normal output; keep
the approach documented so task 007 can build on it.

## Completion log
