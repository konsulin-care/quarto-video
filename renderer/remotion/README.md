# renderer/remotion/ — Remotion reference renderer

Status: Framed image footage (IR 1.10, ADR-0018): `media/Still.tsx`, a still held for its scene, drawn by `FramedFootage` with the shared fit and no audio. Project music track (task 045, ADR-0017, IR 1.9 `music`, `media/music.ts`). Minimal render (task 004): any valid IR renders to MP4; the `title` scene shows its `default` slot as the title and its optional `subtitle` slot under it (task 024, replacing the placeholder of task 004). Scenes play on the IR timeline. Transition presets (task 022): `cut`, `fade`, `slide`, `wipe`, `zoom`, applied over each boundary's overlap by `TransitionScene`. Themes (task 019): tokens from the registry, bundled Inter fonts; `title` is styled from them. Animation presets (task 021): `fade-in`, `slide-up`, `reveal`, applied to the whole scene by `AnimatedScene`. `count-up` (task 032) changes the number of a `statistic`: `AnimatedScene` provides `CountMotionContext`, the statistic draws the counted value (`animations/count-up.ts`: 0 at frame 0, the value from ceil(0.7 × duration) on; the size comes from the final text). `stagger` (task 028) moves the items of a `bullets` list or the `credits` of an `end-card`: `AnimatedScene` provides `StaggerMotionContext`, and each list styles its items (`animations/stagger.ts`: item i of N starts at floor(i × S / N) with S = ceil(0.7 × length) − 9, so every item is in place by 70%; reduced motion or a scene under 45 frames shows all items in place). `kinetic` (task 026) moves the words of a `statement`: `AnimatedScene` provides `WordMotionContext`, the statement styles each word (`components/statement/words.ts`), and a statement over 12 words draws `fade-in` (`effectiveAnimation`). Reduced motion (task 023, `settings.reducedMotion` in IR 1.2): each preset draws its registry rule (`static`: the end state from its first frame) and each transition its fallback (`slide`, `wipe`, `zoom` draw `fade`), over the same overlap. Device frames (task 040): `media/FramedScene.tsx` draws a scene's framed `.video` block in its registry frame (`media/frames/`) at the largest size in the canvas safe area, with the footage clipped to the screen. Background footage (task 039): `media/` draws a scene's `.video` block with `placement="background"` behind its component (`BackgroundScene`): one `OffthreadVideo` per scene frame, at the source frame `media/schedule.ts` names (trim at `playbackRate`, `loop`, `freeze`), muted, framed by `fit`; the theme's scrim sits over it. `text-overlay` text stands in for `default` (`src/overlay.ts`). Other components and transitions: tasks 022–035, 040–046.
Run: `npm run render -w renderer/remotion -- <ir.json> <out.mp4>`; typecheck: `npm run typecheck -w @quarto-video/remotion`; unit tests: root `npm run test`; render tests: root `npm run test:integration`.

## Purpose

Render a valid Video IR manifest to frames and encode the output (PRD §8.4).
It implements what `packages/registry` declares; it decides nothing about
what is valid.

## Layout

- `src/entry.ts` — Remotion bundle entry (`registerRoot`).
- `src/Root.tsx` — `video` composition; size, fps and length come from the IR
  input props via `calculateMetadata`.
- `src/IrVideo.tsx` — plays each scene with `<Sequence>` at its `startFrame` for its own `durationFrames` (`timelineOf`, `@quarto-video/ir/timeline`), on `settings.background`. A transition's overlap shows both scenes: the outgoing scene runs to its own end. Scene text comes from `plainText` (`@quarto-video/ir/text`).
- `src/registry-map.ts` — registry id → implementation (`chart`, `product-demo`, `split-screen`, `text-media`, `title`, ...); `PLACES_OWN_MEDIA` lists the components that place their scene's footage themselves (`text-media`, task 042; `split-screen`, task 043), so IrVideo does not wrap them in FramedScene; `regions` is a scene's region footage by name (IR 1.7); a component receives `slots` (plain text per slot, task 024), `props` (the authored attributes) and `tables` (CSV data by prop name, ADR-0014).
- `src/AnimatedScene.tsx` — applies the scene's animation preset at the scene's own frame; no animation draws the scene as it is. `reducedMotion` (from the IR, via `IrVideo.tsx`) selects the preset's registry rule.
- `src/TransitionScene.tsx` — applies the incoming transition on the scene's first frames and the outgoing one (from the next scene) on its last; no overlap draws the scene as it is. `reducedMotion` selects each transition's registry fallback.
- `transitions/` — preset type (`types.ts`: `incoming(p)` and `outgoing(p)`, `p` in (0, 1], 1 on the overlap's last frame), one file per name, `index.ts` (`TRANSITIONS`, `transitionStyle`). Names and bounds come from `packages/registry/transitions/`.
- `animations/` — preset API (`types.ts`: `(frame, durationFrames, tokens) → style`), shared timing (`curve.ts`), one file per preset, `index.ts` (`ANIMATIONS`, `animationStyle`, `effectiveAnimation`). Minimums come from `packages/registry/animations/`. `kinetic.ts` (the word schedule, task 026) and `word-motion.ts` (the per-word context read by the statement). `stagger.ts` (the item schedule, task 028) and `stagger-motion.ts` (the per-item context read by bullets and end-card).
- `src/index.ts` — public API used by `packages/cli`: `render`, `loadIr`, `IrRenderError`, types `RenderFn`, `RenderOptions`, `RenderProgress`.
- `src/composition-id.ts` — the composition id, apart from `Root.tsx` so Node never loads browser code.
- `themes/` — `canvas.ts` (`canvasBackground`: explicit colour or the theme's background token), `tokens.ts` (theme id to registry tokens; `DEFAULT_THEME_ID`), `ThemeProvider.tsx` (`ThemeProvider`, `useTheme`; holds the frame until the fonts load), `fonts.ts` (bundled font files per family and weight), `safe-area.ts` (margins for a frame size), `fonts/` (Inter 5.2.8, latin woff2, from `@fontsource/inter`; `LICENSE` is SIL OFL 1.1).
- `src/render.ts` — `render(irPath, outPath, opts)`: validate, bundle, encode. `opts.onProgress({ encodedFrames, totalFrames })` is called while encoding; `opts.theme` is a theme id (default `modern`), and an unknown id is an `IrRenderError` before the browser starts. `opts.background` (`#RRGGBB`, the explicit `video.background`) is the canvas colour; unset or null draws the theme's `background` token. The IR's `settings.background` is not drawn (`themes/canvas.ts`). The bundle is built in a fresh directory under `opts.workDir` (the CLI passes `.video-build/`) and removed when the call ends, on success or failure (`withBundle`).
- `src/still.ts` — `renderStills(irPath, outDir, opts)`: one PNG per frame (`<outDir>/<frame>.png`) from the same bundle, theme and canvas as `render()`. `opts.frames` must lie inside the composition. Used by the visual harness (`tests/visual/`, task 020). `opts.tokens` is a test seam: tokens to draw instead of the theme's; production callers omit it.
- `src/cli.ts` — `render` script entry (exit 0 on success, 1 on error, 2 on usage).
- `src/errors.ts` — `IrRenderError`, thrown for rejected input.
- `components/text-media/` — the `text-media` component (task 042): the text in its column, the framed footage in the other (`TextMedia.tsx`; the columns from `textMediaColumns` in the registry layout). `media/FramedFootage.tsx` draws a frame and its footage in any box (FramedScene and text-media use it).
- `components/shared/TextColumn.tsx` — text fitted in one box (task 042; text-media and split-screen): the largest size of its range that fits (`fitText`), centred vertically.
- `components/split-screen/` — the `split-screen` component (task 043, ADR-0016): `SplitScreen.tsx` draws each drawn region in its column of `regionColumns` (footage clipped to its column through `Footage`, or text through TextColumn); `regions.ts` (`drawnRegions`, pure) gives the regions drawn, in `REGION_ORDER`.
- `components/product-demo/` — the `product-demo` component (task 041): the optional caption under the frame (`ProductDemo.tsx`). The frame is drawn by `media/FramedScene.tsx`, which reserves the caption band (`media/frames/caption.ts`: its lines at the caption size, pure) and fits the frame above it (`fitFrame` in `media/frames/layout.ts`).
- `components/title/` — the `title` component (task 024): the default slot as the title, the optional `subtitle` slot under it; `components/<id>/` for the rest.
- `components/statistic/` — the `statistic` component (task 031): the number from `format.ts` (`formatNumber`, locale-fixed, reused by task 032), the size rule in `size.ts`, and `Statistic.tsx` (number, unit, prefix, label and context).
- `components/chart/` — the `chart` component (task 035): bars or a line from the `tables.data` CSV table; `data.ts` (points), `scale.ts` (nice value axis, pure), `layout.ts` (plot geometry, pure), `Marks.tsx` (bars, line), `Chart.tsx` (title, axis, labels, caption). Colours from the accent and text tokens only.
- `test/` — unit tests: invalid IR rejection (no browser), pinned versions, theme parity (`theme-parity.test.ts`), frame parity and geometry (`frame-parity.test.ts`, `frame-layout.test.ts`), theme lint, safe area.
- `media/audio.ts` (pure, task 044, ADR-0009): `audioSegmentsOf` (the passes over a kept clip's source range: trim, loop, freeze, end of scene) and `gainAt` (volume, faded over transition overlaps). `media/SourceAudio.tsx`: one `<Audio>` per pass in its own `Sequence`; `IrVideo` mounts it for each kept block of a scene, whatever draws the picture. The picture is always muted. `src/stereo-sources.ts` (task 044 follow-up, ADR-0009): a mono kept clip or mono music track is copied to `<assetRoot>/.video-build/audio-stereo/` with its channel on both L and R (`pan`); `media/audio-source.ts` maps the source to its copy, and the picture keeps the project file.
- `media/` — background footage (task 039): `schedule.ts` (`planOf`, `sourceFrameAt`: the source frame of each scene frame, pure), `Video.tsx` (`Footage`: one muted `OffthreadVideo` per frame, framed by `fitStyle`; `BackgroundVideo`), `BackgroundScene.tsx` (footage, theme scrim, content), `fit.ts` (the shared fit, task 033). `src/overlay.ts` (`withOverlay`): `text-overlay` as `default` when `default` is empty.
- `media/Still.tsx` (ADR-0018): the framed image, `Img` with `staticFile` and `fitStyle` (the image component's path). It draws the same picture at every frame: no audio, no source timing. `FramedFootage` picks it for `kind: "image"`.
- `media/music.ts` (pure, task 045, ADR-0017): `musicPassesOf` (one pass, or the loop repeats of `lengthFrames`, cut at the timeline end) and `musicGainAt` (volume, with the linear fade-out over the last `fadeOutFrames`). `media/MusicTrack.tsx`: one `<Audio>` per pass, mounted once by `IrVideo` over the whole timeline (IR 1.9 `music`).
- `media/frames/` — device frames (task 040): `tokens.ts` (the four registry contracts, imported as data), `layout.ts` (frame box and screen in pixels, pure), `FrameShell.tsx` (body and margin decoration, theme tokens only). `media/FramedScene.tsx` places `Footage` on the screen (clipped to it), the scrim over the footage; `statement` takes `framed`.

## Versions (ADR-0001, exact)

- `remotion`, `@remotion/bundler`, `@remotion/renderer`: 4.0.530 (released 2026-09-29).
- `react`, `react-dom`: 19.2.8; `@types/react`: 19.2.18.
- Upgrades happen only in a dedicated task. Test `pinning.test.ts` enforces exact ranges.

## Browser (no downloads)

Chromium is preinstalled; do not run `playwright install`. Remotion is pointed
at the existing headless shell, never at its own download:

- CLI: `QV_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell` (`npm run render` and `video render` both read it). `video render` refuses to start without it: the stage 5 preflight runs at the CLI boundary (`packages/cli/src/cli.ts`), after stages 1–4 (task 018).
- Test runs: `scripts/test.sh` resolves the variable once when it is unset (`scripts/lib/browser.sh`, the lookup of `scripts/spike-quarto-native.sh`) and fails before the integration and visual suites start if no shell is found. Suites that need a browser, and tests that inject a stub renderer, are listed in `tests/README.md` (Browser).
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
  (`test/banned-apis.test.ts`, task 021; remote URLs are not checked yet).
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
2. Write `docs/components/<id>.md`.
   A preset: its `packages/registry/animations/<id>.json`, a file in `animations/` and an entry in `animations/index.ts`, its visual case, and its row in `docs/components/README.md`. A transition: its name in `packages/registry/transitions.json`, `transitions/<id>.json`, a file in `transitions/` and an entry in `transitions/index.ts`, its visual case, and its row in `docs/components/README.md`.

## Testing

- Unit (`npm run test`): invalid-IR rejection, pinned versions.
- Integration (`npm run test:integration`): `render-theme.test.ts` renders the `modern` theme with unreachable proxies (the fonts are local), and checks the canvas pixel: the theme token by default, the explicit colour when given.
- Integration (`npm run test:integration`): renders `packages/ir/examples/minimal.json`
  shrunk to 640×360 and 1 s, and a two-scene IR; ffprobe checks size, 30 fps and
  frame count = sum of `durationFrames`.
- Transitions (task 022): `test/transition-curves.test.ts` (each side at its first, middle and last overlap frame; cut draws no style; the outgoing scene is gone by the overlap's last frame), `test/transition-parity.test.ts`. Visual: `transitions-basic`; integration: `timeline.test.ts` (`transitions` fixture).
- Reduced motion (task 023): `test/reduced-motion.test.ts` (each animation is static at its end state; each transition's fallback has the same overlap as fade).
- Count-up (task 032): `test/count-up.test.ts` (schedule: from 0, monotone toward the value, the formatted final value from ceil(0.7 × duration), determinism over seeded values, reduced and short scenes at the value). Visual: `count-up-*`; the flash check covers `preset-count-up` and `reduced-motion-count-up`.
- Stagger (task 028): `test/stagger.test.ts` (schedule determinism, the last item in place by 70% for 2 to 6 items, document order on screen, reduced and short scenes static). Visual: `stagger-*` cases; the flash check covers `preset-stagger` and `reduced-motion-stagger`.
- Source audio (task 044): `test/source-audio.test.ts` (passes, end, freeze, loop, rate refused, gain ramps). Integration: `tests/integration/audio-policy.test.ts` (levels through volumedetect; mono keep at its file's level). Mono copies: `test/stereo-sources.test.ts` (which sources, the pan, the map).
- Project music (task 045): `test/music.test.ts` (passes, loop, end, fade-out and volume; pure). Integration: `tests/integration/music.test.ts`.
- Background footage (task 039): `test/media-schedule.test.ts` (trim, loop, freeze and unresolved ends), `test/overlay-text.test.ts`. Integration: `tests/integration/background-video.test.ts` (frame N's counter in the still, trim, loop and freeze; the muted MP4 has no audio stream). Visual: `background-video*`.
- Kinetic (task 026): `test/kinetic.test.ts` (schedule determinism, every word in place from 80%, reduced and short scenes static, the fallback past 12 words, word splits that count as the registry does). Visual: `kinetic-basic`, `kinetic-reduced-motion`; the flash check covers `preset-kinetic`.
- Animations (task 021): `test/animation-curves.test.ts` (value curves, end state by the last frame for every duration from the minimum, short-scene fallback, determinism), `test/animation-parity.test.ts` (ids equal the registry's). Visual: `animations-basic` (`tests/visual/`).
- Lint (task 021): `test/banned-apis.test.ts` scans `src`, `components`, `themes`, `animations` for the banned APIs and pins what the rule flags.
- Split-screen (task 043): `test/split-screen-layout.test.ts` (the drawn regions in order; columns for two and three regions never overlap at four canvas shapes). Visual: `split-screen-*`.
- Parity (root `npm run check`): `test/registry-parity.test.ts` checks that `src/registry-map.ts` maps exactly the registry's component ids (task 013). Tests may import the registry index. `src` uses the registry only for types and the theme JSON subpath (`themes/tokens.ts`), never its runtime index (it pulls in the validator).
- Not yet covered: `tsc` does not check `tests/integration/` (no tsconfig there).

## Related

Tasks 004, 019–046. ADR-0001, 0005, 0009, 0011.
