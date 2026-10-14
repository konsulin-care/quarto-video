# 004 — Minimal Remotion render of IR

Phase 1 · Status: done · Depends on: 002 · PRD: §8.4, §11.1 · ADR: reads 0001

## Goal
A Remotion package that renders any valid IR v0.1 manifest to an MP4 whose
size, fps and frame count match the IR.

## Scope
- In: pinned Remotion deps; composition taking the IR as input props;
  scenes played in order via `<Series>`; a placeholder `title` component
  (centred text on `settings.background`); `render(irPath, outPath)` API +
  npm script; `validateIr` check before rendering.
- Out: themes (019), presets (021+), transitions (015/022), media.

## Deliverables
- `renderer/remotion/src/Root.tsx`, `src/render.ts`, `components/title/`.
- Script `npm run render -w renderer/remotion -- <ir.json> <out.mp4>`.
- Integration test rendering `packages/ir/examples/minimal.json` (shrunk to
  640×360, 1 s) and probing the result with `ffprobe`.
- `renderer/remotion/README.md` status + Layout updated.

## Definition of done
Automated:
- [ ] Rendered file: width/height/fps equal IR settings; frame count equals
      the sum of `durationFrames`.
- [ ] Invalid IR (e.g. `durationFrames: 0`) → `render` rejects before
      launching the browser, error contains the JSON path.
- [ ] Remotion versions are exact (no `^`/`~`) in `package.json`.

Human check:
1. `npm run render -w renderer/remotion -- ../../packages/ir/examples/minimal.json /tmp/minimal.mp4`
2. Play `/tmp/minimal.mp4`: 4 s, 1920×1080, title text centred on `#10131C`.

## Notes
- Remotion, `@remotion/bundler`, `@remotion/renderer` 4.0.530 (2026-09-29, two weeks old);
  react and react-dom 19.2.8 (latest 19.2.x older than two weeks); lockfile from npm 11.6.2.
- Bundle sources use `./x.js` imports; webpack maps them via `extensionAlias`.
- Browser: existing `chromium_headless_shell-1194` through `QV_BROWSER_EXECUTABLE`.
  Human-check step 1 without that variable makes Remotion download a browser.
- `tests/integration/` is not typechecked (no tsconfig there); see renderer README.

## Completion log
- 2026-10-14: Minimal Remotion renderer. `render(irPath, outPath)` validates the IR
  first (rejects with the JSON path before any browser starts), bundles `src/entry.ts`,
  and encodes the `video` composition sized from the IR, with scenes played by `<Series>`
  and a placeholder `title` component. Covered by `renderer/remotion/test/pinning.test.ts`,
  `renderer/remotion/test/render-validation.test.ts`, and
  `tests/integration/render.test.ts` (640×360 minimal: 30 frames probed by ffprobe;
  two scenes 20+10 give 30 frames). Full `minimal.json` renders 1920×1080, 30 fps, 120 frames.
  `npm run check`, `npm run test`, `scripts/check.sh --all`, `scripts/test.sh --all` exit 0.
- Follow-ups: CI not verified (no mise or CI run here); human check pending (play the
  full render and confirm the centred title on `#10131C`); typecheck for `tests/integration/`.
