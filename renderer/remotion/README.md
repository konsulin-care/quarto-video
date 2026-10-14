# renderer/remotion/ — Remotion reference renderer
Status: Minimal render (task 004): any valid IR renders to MP4 with a placeholder `title` scene; the title shows the `default` slot's text (task 012). Scenes play on the IR timeline; overlaps are hard cuts until task 022 (task 015, ADR-0005). Themes (task 019): tokens from the registry, bundled Inter fonts; `title` is styled from them. Presets and the other components: tasks 021–035, 039–046.
Run: `npm run render -w renderer/remotion -- <ir.json> <out.mp4>`; typecheck: `npm run typecheck -w @quarto-video/remotion`; unit tests: root `npm run test`; render tests: root `npm run test:integration`.

## Purpose
Render a valid Video IR manifest to frames and encode the output (PRD §8.4).
It implements what `packages/registry` declares; it decides nothing about
what is valid.

## Layout
- `src/entry.ts` — Remotion bundle entry (`registerRoot`).
- `src/Root.tsx` — `video` composition; size, fps and length come from the IR
  input props via `calculateMetadata`.
- `src/IrVideo.tsx` — plays each scene with `<Sequence>` at its `startFrame` (`timelineOf`, `@quarto-video/ir/timeline`), on `settings.background`; a scene shows until the next one starts. Scene text comes from `plainText` (`@quarto-video/ir/text`).
- `src/registry-map.ts` — registry id → implementation (`title` only).
- `src/index.ts` — public API used by `packages/cli`: `render`, `loadIr`, `IrRenderError`, types `RenderFn`, `RenderOptions`, `RenderProgress`.
- `src/composition-id.ts` — the composition id, apart from `Root.tsx` so Node never loads browser code.
- `themes/` — `tokens.ts` (theme id to registry tokens; `DEFAULT_THEME_ID`), `ThemeProvider.tsx` (`ThemeProvider`, `useTheme`; holds the frame until the fonts load), `fonts.ts` (bundled font files per family and weight), `safe-area.ts` (margins for a frame size), `fonts/` (Inter 5.2.8, latin woff2, from `@fontsource/inter`; `LICENSE` is SIL OFL 1.1).
- `src/render.ts` — `render(irPath, outPath, opts)`: validate, bundle, encode. `opts.onProgress({ encodedFrames, totalFrames })` is called while encoding; `opts.theme` is a theme id (default `modern`), and an unknown id is an `IrRenderError` before the browser starts.
- `src/cli.ts` — `render` script entry (exit 0 on success, 1 on error, 2 on usage).
- `src/errors.ts` — `IrRenderError`, thrown for rejected input.
- `components/title/` — placeholder centred title; `components/<id>/` for the rest.
- `test/` — unit tests: invalid IR rejection (no browser), pinned versions, theme parity (`theme-parity.test.ts`), theme lint, safe area.
- Planned, not yet present: `animations/`, `transitions/`, `media/`.

## Versions (ADR-0001, exact)
- `remotion`, `@remotion/bundler`, `@remotion/renderer`: 4.0.530 (released 2026-09-29).
- `react`, `react-dom`: 19.2.8; `@types/react`: 19.2.18.
- Upgrades happen only in a dedicated task. Test `pinning.test.ts` enforces exact ranges.

## Browser (no downloads)
Chromium is preinstalled; do not run `playwright install`. Remotion is pointed
at the existing headless shell, never at its own download:
- CLI: `QV_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell` (`npm run render` and `video render` both read it). `video render` refuses to start without it (preflight, task 018).
- API: `render(ir, out, { browserExecutable })`. Unset means Remotion downloads its own browser.
- The integration test finds `chromium_headless_shell-*` under `PLAYWRIGHT_BROWSERS_PATH`
  (or honours `QV_BROWSER_EXECUTABLE`); it fails if none exists.

## Rules
- Input is IR only. Never import `packages/validator` or `packages/cli`.
- The CLI calls `render()` through `src/index.ts`; the renderer knows nothing about the CLI (ADR-0001, AGENT.md).
- `render()` validates before anything else; invalid IR rejects with the JSON
  path (for example `/scenes/0/durationFrames`) and never starts a browser.
- Unknown components are rejected the same way (`/scenes/<i>/component`).
- Check `schemaVersion` on load: `validateIr` accepts `"0.1"`, `"0.2"`, `"0.3"` and `"1.0"` and rejects others with `E_IR_UNSUPPORTED_VERSION`, which names the supported versions (ADR-0007). Length comes from `timelineOf(ir).durationFrames`, never a sum of scene lengths (transitions overlap).
- Visual state = f(IR, frame). Use `useCurrentFrame()`/props only. Banned:
  `Date`, `Math.random`, `performance.now`, timers, `fetch`, remote URLs
  (enforced by lint rule from task 021).
- Sources use NodeNext `./x.js` imports; `render.ts` maps `.js` to `.ts/.tsx`
  for webpack through `webpackOverride`.
- Animations read durations from the IR; never hard-code frame counts that
  can exceed a scene's frames.
- Components draw with `useTheme()` tokens only: no hex or `rgb()` colours and no literal font sizes (`test/theme-lint.test.ts`). Fonts are bundled files reached through `new URL(..., import.meta.url)`; a render fetches nothing.
- Media `src` are project-relative IR paths resolved against the asset root
  passed by the CLI (task 006).

## Adding a component or preset
1. Registry entry (contract) exists. 2. Implement under `components/<id>/` and
add it to `src/registry-map.ts`. 3. Add visual cases in `tests/visual/cases/`.
4. Write `docs/components/<id>.md`.

## Testing
- Unit (`npm run test`): invalid-IR rejection, pinned versions.
- Integration (`npm run test:integration`): `render-theme.test.ts` renders the `modern` theme with unreachable proxies (the fonts are local).
- Integration (`npm run test:integration`): renders `packages/ir/examples/minimal.json`
  shrunk to 640×360 and 1 s, and a two-scene IR; ffprobe checks size, 30 fps and
  frame count = sum of `durationFrames`.
- Parity (root `npm run check`): `test/registry-parity.test.ts` checks that `src/registry-map.ts` maps exactly the registry's component ids (task 013). Tests may import the registry index. `src` uses the registry only for types and the theme JSON subpath (`themes/tokens.ts`), never its runtime index (it pulls in the validator).
- Not yet covered: `tsc` does not check `tests/integration/` (no tsconfig there).

## Related
Tasks 004, 019–046. ADR-0001, 0005, 0009.
