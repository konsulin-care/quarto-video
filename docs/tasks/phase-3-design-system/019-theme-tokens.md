# 019 — Theme tokens (`modern`)

Phase 3 · Status: done · Depends on: 018 · PRD: §5.2, §10, §12 · ADR: —

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
- [x] Theme validates against its schema (`packages/registry/test/theme.test.ts`).
- [x] Contrast test: every declared text/background pair ≥ 4.5:1 (`theme.test.ts`; the loader rejects a pair below 4.5:1).
- [x] Render test with network blocked succeeds (fonts are local): `tests/integration/render-theme.test.ts`, with unreachable proxies (best effort). The real isolation check is in the Completion log.
- [x] `theme: retro` → `E_THEME_UNKNOWN` listing `modern` (`packages/validator/test/theme.test.ts`, `tests/integration/theme.test.ts`).
- [x] Lint/test: components contain no hex colours or px font sizes (`renderer/remotion/test/theme-lint.test.ts`).

Human check:
1. `npx video render videos/hello` → title uses the theme font and colours
   (compare with the token values in `themes/modern.json`).
2. Set `theme: retro` → error listing available themes; exit 1.

## Notes
- Path of the name: front matter, then the filter writes `theme` to `.video-build/render.json` (stored-only, like `output`), then `checkTheme` (stage 2) resolves it, then the renderer takes it as `theme`. The IR carries no theme (ADR-0007 untouched).
- Omitted `theme` means `modern` (`DEFAULT_THEME`). PRD §5.2 lists `theme` as required; the default is a choice made here, documented in the registry and validator READMEs.
- Deviation: `video.background` still defaults to `#000000` (`lib/config.lua`). The theme's `background` token sets the contrast reference and is not drawn. Making it the canvas default is a follow-up (the `_extensions/video` README says "until a theme supplies a background").
- Inter 5.2.8 latin subset (400, 600, 700) from `@fontsource/inter@5.2.8`, SIL OFL 1.1; committed under `renderer/remotion/themes/fonts/` with its `LICENSE`. No runtime dependency added.

## Completion log

### 2026-10-14 — done
- Added theme tokens (`packages/registry/themes/modern.json`, `schema/theme.json`), the loader with the AA floor, the validator's `E_THEME_UNKNOWN` (stage 2), the filter's `render.json` theme, a `ThemeProvider` with `useTheme()`, bundled Inter, and a `title` restyled from tokens.
- Tests: `registry/test/theme.test.ts`, `validator/test/theme.test.ts`, `renderer/remotion/test/{theme-parity,theme-lint,safe-area}.test.ts`, `render-validation` (unknown theme), `tests/integration/theme.test.ts` (through the `video` bin: exit 1, no video), `tests/integration/render-theme.test.ts`.
- `scripts/check.sh --all` and `scripts/test.sh --all` (under `mise exec`): pass. Unit 43 files / 327 tests; integration 3 vitest + 103 tsx checks; lua 191.
- Human check 1: `npx video render videos/hello` wrote `videos/hello/output.mp4`; the frame at 1 s shows Inter Bold in the `text` colour on `#10131C`.
- Human check 2: `theme: retro` in a scratch copy prints `Unknown theme "retro". Available themes: modern.` and exits 1.
- Network: the automated test only sets unreachable proxies, which Chromium may not honour. The real check: a render inside `unshare -rn` (no DNS, no route) passes with the local fonts. The same render with one font at a CDN URL fails with `ERR_INTERNET_DISCONNECTED`, exit 1.
- Follow-ups: (1) make the theme background the canvas default (decide where that default lives: IR or a render option); (2) check text contrast against a custom `video.background`; (3) `space`, `radius` and `motion` tokens have no consumer yet (tasks 021, 024+).
