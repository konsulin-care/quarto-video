# 023 — Reduced motion

Phase 3 · Status: todo · Depends on: 022 · PRD: §5.6, §12 · ADR: —

## Goal
A project-level option that replaces non-essential motion with each preset's
documented reduced-motion behaviour.

## Scope
- In: `video.reducedMotion: true|false` (default false) in front matter and
  IR settings; renderer honours each preset's `reducedMotion` rule; flashing
  guard (no full-frame luminance change > 3 per second in any preset).
- Out: per-scene overrides.

## Deliverables
- Settings table row in `_extensions/video/README.md`.
- Renderer support + visual cases with reduced motion on.
- Flash-rate check utility used by preset tests.

## Definition of done
Automated:
- [ ] With `reducedMotion: true`, every preset's visual case matches its
      reduced-motion reference.
- [ ] Every registered preset declares a reduced-motion rule (registry test).
- [ ] Flash-rate test passes for all presets.

Human check:
1. Render `tests/fixtures/projects/animations-basic` twice, with
   `reducedMotion` false and true; the second has no sliding/zooming, only
   simple fades or static content, with identical timing.

## Notes

## Completion log
