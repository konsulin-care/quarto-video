# 021 — Animation presets: fade-in, slide-up, reveal

Phase 3 · Status: done · Depends on: 020 · PRD: §5.6, §10.2 · ADR: writes 0011

## Goal
A preset system where animations are registered data + pure frame functions,
shipped with `fade-in`, `slide-up` and `reveal`.

## Scope
- In: preset contract (id, purpose, compatible components, min frames,
  short-scene fallback, reduced-motion behaviour); renderer preset API
  `(frame, durationFrames, tokens) → style`; `animation` attribute resolved
  and checked for component compatibility; lint rule banning `Date`,
  `Math.random`, `performance.now`, timers, `fetch` in the renderer.
- Out: reduced-motion switch (023), signature presets (026, 028, 032).

## Deliverables
- `packages/registry/schema/animation.json`, `animations/*.json`.
- `renderer/remotion/animations/*.ts` + unit tests of value curves.
- Visual cases: each preset at first, middle and last frame.
- Presets section in `docs/components/README.md` (create if missing).

## Definition of done
Automated:
- [x] Same frame computed twice → identical output (property test).
- [x] Curves reach their end state no later than the scene's last frame for
      every duration ≥ min frames; below min frames the documented fallback
      applies.
- [x] Unknown or incompatible preset → validation error.
- [x] Lint rule fails on `Math.random()` in renderer code (verified once).

Human check:
1. [x] Met (2026-10-15). `npx video render tests/fixtures/projects/animations-basic` exits 0 (640x360, 30 fps, 135 frames); each animation completes. Text is not clipped at rest or during the reveal entrance (reveal redesign; Completion log).

## Notes
- IR 1.1 (ADR-0011): `animation` must reach the validator, so the IR gained an optional scene field; ADR-0007 requires a new file and an ADR.
- Entrance = a third of the scene, max 30 frames (preset API has no fps; the theme's ms motion tokens are unused). minFrames 15 for all three.
- Short scene and reduced motion both `static` (end state from frame 0). The switch is task 023.
- Visual "middle" frame = entrance midpoint (frame 7), since the entrance ends at frame 15.
- Lint rule is a text-pattern test (`test/banned-apis.test.ts`), not ESLint; it also flags comments.
- Behaviour change: `animation` is now a valid scene attribute, so the Lua test and the `diagnostics-multiple` fixture use `colour` as the unknown attribute. Expectations unchanged.
- Commit trailer: only Claude-Session (standing instruction), so AGENT.md's `Task:` line is omitted.

## Completion log
### 2026-10-15 — done
- Summary: scene `animation` in IR 1.1 (ADR-0011); filter resolves it (E_ANIMATION_UNKNOWN for a bad shape); validator stage 2 checks presets and compatibility (E_ANIMATION_UNKNOWN, E_ANIMATION_INCOMPATIBLE); registry presets `fade-in`, `slide-up`, `reveal` (`packages/registry/animations/`); renderer preset API `(frame, durationFrames, tokens) → style` with `AnimatedScene`; lint test banning Date, Math.random, performance.now, timers, fetch; docs/components/README.md Presets section.
- Tests: `packages/registry/test/animations.test.ts`; `packages/ir/test/v11.test.ts`; `packages/validator/test/animation.test.ts`; `_extensions/video/tests/test_animations.lua`; `renderer/remotion/test/animation-curves.test.ts`, `animation-parity.test.ts`, `banned-apis.test.ts`; `tests/integration/contract.test.ts` (`contract-animation-*`); visual `animations-basic` (9 frames).
- Fixtures changed: `diagnostics-multiple` and the Lua scene test now use `colour` as the unknown attribute (the behaviour change above).
- Verified: lint rule fails on a scratch `Math.random()` (file removed); `video render` of animations-basic; visual references approved on the pinned Chromium.
- Known deviation: the "text never clipped" human check is not met as written. The reveal wipe hides part of the text during its 15-frame entrance by design; at rest nothing is clipped. Accepted as the reveal's intent; a human should confirm.
- Follow-ups: task 023 (apply reduced motion); task 022 (transitions); decide whether animation should use fps-based timing (the ms motion tokens are unused); consider `defaults.scene.animation`; the remote-URL part of the lint rule is not implemented; confirm the `visual` CI job matches the references.

### 2026-10-15 — reveal redesign (known deviation resolved)
- Deviation resolved: `reveal` no longer clips text at any frame. The wipe (a `clip-path` inset from the left) is replaced by an element-level opacity fade and a scale from 0.96 to 1 over the entrance, on the same ease-out cubic as fade-in and slide-up.
- Curve rule: `p = easeOut(min(frame / enterFrames, 1))`; style `{ opacity: p, transform: scale(s) }` with `s = 1 - (1 - p) * 0.04`, rounded to two decimals. The style has only opacity and transform, so no clip, mask or hard edge exists at any frame. Reduced motion (static): `{ opacity: 1, transform: "scale(1)" }`.
- Why this design: a soft-edged mask still cuts glyphs wherever its edge sits inside the text, and a per-element stagger is a larger change. Opacity and scale is the smallest design that never cuts a glyph. It stays distinct from fade-in (opacity only) and slide-up (opacity and translate).
- Changed: `packages/registry/animations/reveal.json` (purpose; id, components, min frames, short-scene and reduced-motion rules unchanged); `renderer/remotion/animations/reveal.ts`; `renderer/remotion/animations/curve.ts` (the `linear` easing had no users left and is removed).
- Tests: `renderer/remotion/test/animation-curves.test.ts` reveal block asserts the no-clip rule (only opacity and scale; scale within [0.96, 1]; monotone), start and end states, and distinctness from fade-in and slide-up. `renderer/remotion/test/reduced-motion.test.ts` end state updated. The generic property tests are unchanged.
- Visual: two references changed and were re-approved after viewing them: `animations-basic` frame 97 (reveal entrance, scene frame 7) and `title-animations` frame 195 (reveal entrance, scene frame 15). Both show the whole text. The other reveal frames match their references (end states and reduced motion). The fade-in and slide-up references are untouched.
- Human check: `npx video render tests/fixtures/projects/animations-basic` exits 0. Frames 90 to 104 (the reveal entrance) were extracted: the word is absent at frame 90, then whole and increasingly opaque at every frame. The output MP4 was removed from the fixture folder afterwards.
