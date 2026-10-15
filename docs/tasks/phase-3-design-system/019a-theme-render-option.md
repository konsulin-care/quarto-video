# 019a — Theme as render option; theme canvas background

Phase 3 · Status: done · Depends on: 019 · PRD: §5.2, §10 · ADR: —

## Goal
The theme is a render option (default `modern`), and the canvas is the selected
theme's `background` token unless the author sets `video.background`.

## Scope
- In: `video render --theme <name>`; resolution order option > front matter
  `theme:` > `modern`; `E_THEME_UNKNOWN` for an unknown name (exit 1, no
  render); canvas from the theme `background` token; an explicit
  `video.background` still wins; docs in the three READMEs; tests.
- Out: IR schema change (IR 1.0 is frozen, `settings.background` stays);
  `--theme` on `video validate`; contrast of text against a custom
  `video.background` (019 follow-up 2); per-component layouts (024+).

## Deliverables
- `packages/cli`: `--theme <name>` on `render`; the render config reads the
  explicit `background` and passes it, with the theme, to the renderer.
- `_extensions/video`: `render.json` gets `background` only when
  `video.background` is set in front matter (stored-only, like `theme`).
- `renderer/remotion`: `render()` option `background`; `canvasBackground()`
  resolves the canvas colour (explicit value, else the theme token).
- Docs: `packages/cli/README.md`, `packages/registry/README.md` (theme
  section), `_extensions/video/README.md` (background row and `render.json`).

## Definition of done
Automated:
- [x] Default theme is `modern` with no option and no front matter `theme:` (`tests/integration/cli-theme.test.ts`).
- [x] `--theme` overrides front matter `theme:`; the front matter value is not resolved (`cli-theme.test.ts`).
- [x] `--theme retro` → `E_THEME_UNKNOWN` listing `modern`, exit 1, renderer not called (`cli-theme.test.ts`).
- [x] The canvas is the theme `background` token (`renderer/remotion/test/canvas.test.ts`; pixel of frame 1 in `tests/integration/render-theme.test.ts`).
- [x] An explicit `video.background` overrides the token (`canvas.test.ts`; pixel in `render-theme.test.ts`; `render.json` in `_extensions/video/tests/test_config.lua`).

Human check:
1. `npx video render videos/hello` exits 0; a frame shows the `modern` background `#10131C`. Checked (see log).
2. In a scratch copy of `videos/hello`, `npx video render <copy> --theme retro` prints `Available themes: modern.` and exits 1. Checked (see log).

## Notes
- Resolution: `--theme` (render option) wins; else front matter `theme:`
  (kept, PRD §5.2); else `DEFAULT_THEME` (`modern`). The validator resolves
  the chosen name (stage 2), so the unknown-name error is the same for both.
- The IR still carries `settings.background`. IR 1.0 requires it, so it is
  the Lua default `#000000` when `video.background` is unset. The renderer
  does not draw that default: it draws only an explicit value, passed through
  `render.json`, and otherwise the theme's `background` token.
- Interpretation: an explicit `--theme` makes the front matter value
  irrelevant, even when that value is unknown. No warning is printed.

## Completion log

### 2026-10-15 — done
- Theme is a render option: `video render <path> --theme <name>` (also `--theme=<name>`). Order: option, then front matter `theme:`, then `modern`. An unknown name from either source is `E_THEME_UNKNOWN` (exit 1), and the renderer is not called.
- Canvas: the theme's `background` token, unless `video.background` is set. The explicit value is written to `render.json` (stored-only) and passed to `render()` as `background`. IR 1.0 is unchanged; its `settings.background` stays `#000000` when unset and is not drawn.
- Tests: `tests/integration/theme-render-option.test.ts` (7, recording renderer stub), `renderer/remotion/test/canvas.test.ts` (4), `render-theme.test.ts` (2 pixel checks: token, explicit), `_extensions/video/tests/test_config.lua` (2).
- Gates: `mise exec -- scripts/check.sh --all` pass. `mise exec -- scripts/test.sh --all` pass: scripts 16; unit 44 files / 331 tests; lua 193; integration 110 tsx checks and 5 vitest.
- Human check 1: `npx video render videos/hello` exit 0. Frame at 1 s, corner RGB (16,18,27), against `#10131C` (16,19,28). `videos/hello` sets `video.background` itself, so this run uses the explicit path; the token path is covered by the pixel test.
- Human check 2: a scratch copy without `background` and with `--theme retro` prints `Unknown theme "retro".` and `Available themes: modern.`, exit 1.
- Follow-ups: (1) decide whether `videos/hello` should drop its `background` so the sample shows the theme canvas; (2) contrast of text against a custom `video.background` (019 follow-up 2); (3) `--theme` on `video validate`; (4) making `settings.background` optional in the IR needs an ADR (IR is frozen).
