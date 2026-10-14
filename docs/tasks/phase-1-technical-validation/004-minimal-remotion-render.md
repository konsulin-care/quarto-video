# 004 — Minimal Remotion render of IR

Phase 1 · Status: todo · Depends on: 002 · PRD: §8.4, §11.1 · ADR: reads 0001

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

## Completion log
