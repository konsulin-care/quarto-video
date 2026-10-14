# 019 — Theme tokens (`modern`)

Phase 3 · Status: in-progress · Depends on: 018 · PRD: §5.2, §10, §12 · ADR: —

## Goal
A named theme of design tokens, selected by `theme:` in front matter,
applied by the renderer with locally bundled fonts and AA contrast.

## Scope
- In: token schema (colours, type scale, font families/weights, spacing,
  radii, safe-area margins per aspect ratio, motion timing); `modern`
  theme; theme resolution in validator (unknown → error listing themes);
  renderer `ThemeProvider`; open-licensed fonts committed locally;
  placeholder `title` restyled from tokens.
- Out: per-component layouts (024+).

## Deliverables
- `packages/registry/schema/theme.json`, `themes/modern.json`.
- `renderer/remotion/themes/` provider + fonts + `LICENSE` files.
- Theme section in `packages/registry/README.md`.

## Definition of done
Automated:
- [ ] Theme validates against its schema.
- [ ] Contrast test: every declared text/background pair ≥ 4.5:1.
- [ ] Render test with network blocked succeeds (fonts are local).
- [ ] `theme: retro` → `E_THEME_UNKNOWN` listing `modern`.
- [ ] Lint/test: components contain no hex colours or px font sizes.

Human check:
1. `npx video render videos/hello` → title uses the theme font and colours
   (compare with the token values in `themes/modern.json`).
2. Set `theme: retro` → error listing available themes; exit 1.

## Notes

## Completion log
