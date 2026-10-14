# 010 — Front matter and defaults

Phase 2 · Status: done · Depends on: 009 · PRD: §5.2 · ADR: reads 0003

## Goal
All PRD §5.2 settings are read from front matter, have documented defaults,
and unknown keys or invalid values fail with a suggestion.

## Scope
- In: `title`, `video.width|height|fps|output|background`, `theme` (stored
  only; resolved in 019), `defaults.scene.duration`,
  `defaults.scene.transition` (stored; resolved in 015). Defaults:
  1920×1080, 30 fps, `output.mp4`, duration per ADR-0003. "Did you mean"
  suggestions. Codec/container keys are out of the IR (rejected for now).
- Out: theme resolution, transition semantics, audio settings.

## Deliverables
- `_extensions/video/lib/config.lua` + Lua tests.
- Settings table in `_extensions/video/README.md`: key, type, default,
  required?, inheritance rule (PRD §5.2 last bullet).
- Fixtures `tests/fixtures/projects/front-matter-*` with `expected.json`.

## Definition of done
Automated:
- [x] Empty front matter → IR with all defaults.
- [x] Each setting overridden → reflected in IR.
- [x] `defaults.scene.duration` applies to scenes without `duration`; an
      explicit scene `duration` wins.
- [x] Unknown key (`video.widht`) → `E_CONFIG_UNKNOWN_KEY` suggesting `width`.
- [x] Invalid values (`fps: 0`, `width: "big"`, odd height for H.264) → errors.

Human check (pending: not performed by the agent; covered automatically by
`front-matter-overrides` and `diagnostics-unknown-key`, not a substitute):
1. Copy `videos/hello`, set `video.fps: 24` → `npx video validate <copy> --print-ir`
   shows `fps: 24` and recomputed frames.
2. Add `video.widht: 1280` → error suggesting `width`; exit 1.

## Notes
- Renamed `lib/settings.lua` to `lib/config.lua` (name in Deliverables);
  `test_settings.lua` became `test_config.lua`. Added `lib/config_keys.lua`
  and `lib/meta.lua`.
- Background default `#000000`: not in the task's default list, but the IR
  requires a value and PRD §5.2 calls it optional. Human to confirm, or move it
  to the theme in task 019.
- `theme`, `title` and `defaults.scene.transition` have no default and are
  stored only. PRD §5.2 lists `theme` as required; the task scope says stored,
  so it stays optional until 019. Human to confirm.
- Top-level keys are not checked for unknown names: they are shared with
  Quarto's front matter (author, lang, ...). A misspelt top-level key such as
  `thme:` is ignored. Human to decide whether to add a Quarto allow-list.
- Odd `width` is also rejected (yuv420p needs an even width); the task named
  only height.
- An invalid `defaults.scene.duration` uses the duration codes
  (E_DURATION_SYNTAX/RANGE, property `defaults.scene.duration`), since the
  ADR-0003 rules apply. Scenes then add no missing-duration error.
- `E_SETTING_MISSING` is retired: no setting is required now. Removed from
  `DIAGNOSTIC_CODES` and the README table; never reuse it. Human to confirm.
- Empty `video:` block = defaults. Every invalid setting is reported in one run.
- Tests that pinned the old "required" behaviour were rewritten: the
  `test_settings.lua` cases became `test_config.lua`; the `diagnostics-settings`
  fixture uses `fps: 0` (was missing); the two filter-rejection tests
  (`validate.test.ts`, `minimal-filter.test.ts`) use `fps: 0` instead of a
  missing video block, which is now valid. Their assertions still require a
  rejection, a non-zero exit and no stale manifest.
- A map or list where a single value belongs (`width: {a: 1}`) is
  E_SETTING_INVALID, not a stringified value.
- Transition names are not checked against the registry until 015.

## Completion log
- 2026-10-14: done. Summary: front matter defaults (1920×1080, 30 fps,
  `output.mp4`, background `#000000`), `defaults.scene.duration` for scenes
  without `duration`, `E_CONFIG_UNKNOWN_KEY` with "did you mean", invalid
  values (fps 0, non-numeric, odd width/height) reported together, codec and
  container keys rejected, stored `title`/`theme`/transition validated.
- Tests: `_extensions/video/tests/test_config.lua`, `test_config_keys.lua`,
  `test_scenes.lua` (default cases); `tests/integration/front-matter.test.ts`
  (fixtures `front-matter-empty|defaults|overrides|invalid`,
  `diagnostics-unknown-key`); `validate-diagnostics.test.ts` (updated fixture).
- Follow-ups: 011 adds line numbers to E_CONFIG_UNKNOWN_KEY; 015 resolves
  transition names; 019 resolves `theme` and the theme background.
- Pending human checks: both Human check items above (not performed).
