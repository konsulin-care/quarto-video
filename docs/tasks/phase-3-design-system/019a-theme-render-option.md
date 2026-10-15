# 019a — Theme as render option; theme canvas background

Phase 3 · Status: in-progress · Depends on: 019 · PRD: §5.2, §10 · ADR: —

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
- [ ] Default theme is `modern` with no option and no front matter `theme:` (`tests/integration/cli-theme.test.ts`).
- [ ] `--theme` overrides front matter `theme:`; the front matter value is not resolved (`cli-theme.test.ts`).
- [ ] `--theme retro` → `E_THEME_UNKNOWN` listing `modern`, exit 1, renderer not called (`cli-theme.test.ts`).
- [ ] The canvas is the theme `background` token (`renderer/remotion/test/canvas.test.ts`; pixel of frame 1 in `tests/integration/render-theme.test.ts`).
- [ ] An explicit `video.background` overrides the token (`canvas.test.ts`; pixel in `render-theme.test.ts`; `render.json` in `_extensions/video/tests/test_config.lua`).

Human check:
1. `npx video render videos/hello` exits 0; a frame shows the `modern` background `#10131C`.
2. In a scratch copy of `videos/hello`, `npx video render <copy> --theme retro` prints `Available themes: modern.` and exits 1.

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
