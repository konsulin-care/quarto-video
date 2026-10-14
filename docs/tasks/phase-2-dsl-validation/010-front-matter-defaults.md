# 010 — Front matter and defaults

Phase 2 · Status: todo · Depends on: 009 · PRD: §5.2 · ADR: reads 0003

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
- [ ] Empty front matter → IR with all defaults.
- [ ] Each setting overridden → reflected in IR.
- [ ] `defaults.scene.duration` applies to scenes without `duration`; an
      explicit scene `duration` wins.
- [ ] Unknown key (`video.widht`) → `E_CONFIG_UNKNOWN_KEY` suggesting `width`.
- [ ] Invalid values (`fps: 0`, `width: "big"`, odd height for H.264) → errors.

Human check:
1. Copy `videos/hello`, set `video.fps: 24` → `npx video validate <copy> --print-ir`
   shows `fps: 24` and recomputed frames.
2. Add `video.widht: 1280` → error suggesting `width`; exit 1.

## Notes

## Completion log
