# ADR-0005: Transition model and overlap semantics

- Status: accepted
- Date: 2026-10-14
- Task: 015
- PRD: §5.2, §5.6, §8.2, §8.3, §18.3

## Context
PRD §8.3 requires one deterministic timeline: scenes in document order, each with
a resolved length in frames, transitions with an explicit duration and documented
overlap, and a total computed from the resolved timeline when overlaps exist. PRD
§18.3 asks whether a transition belongs to the incoming scene, the outgoing scene,
or a timeline element, and what overlap means. Where the PRD is silent, the more
conservative option applies (AGENT.md). IR 0.2 has no transitions and no timeline.

## Options
1. **Owner.** (a) the incoming scene (`transition` on the scene it enters); (b) the
   outgoing scene; (c) explicit timeline elements between scenes. Chosen: (a). It
   is one place per boundary, the first scene has no incoming transition (so the
   rule for it is explicit), and PRD §8.2's example puts `transition` on a scene.
   (b) puts the last scene's transition after the video ends, and a default would
   apply to the last scene. (c) adds a second list that can disagree with the scenes.
2. **Overlap.** (a) sequential: the transition adds its frames between scenes;
   (b) overlap: the transition's frames are shared by both scenes. Chosen: (b),
   the usual meaning of a fade, and PRD §8.3 expects overlaps. Neither option
   stretches footage: each scene keeps its own length.
3. **Cut.** (a) a transition named `cut` of 0 frames, no overlap; (b) no
   transition at all. Chosen: (a) as the name for "no overlap"; no `transitionDuration`.
4. **Default transition.** (a) applies to every scene after the first without its own
   `transition`; (b) applies to none. Chosen: (a). It does not apply to the first
   scene, and an explicit `transition` (including `cut`) wins.
5. **Default duration.** (a) a built-in duration for non-cut transitions; (b) every
   non-cut transition states `transitionDuration` (ADR-0003 forbids hidden defaults).
   Chosen: (b). A consequence is listed under Consequences.

## Decision
- **Attributes.** `transition="<name>"` and `transitionDuration="<n>s"` (or `ms`) on a
  `.scene`. `transitionDuration` uses the ADR-0003 form and rounding; zero and
  negative values are `E_DURATION_RANGE`, a bad form is `E_DURATION_SYNTAX`.
- **Names.** Registry data `packages/registry/transitions.json`: `cut` and `fade`.
  Names outside it are `E_TRANSITION_UNKNOWN` (stage 4). `fade` is accepted now and
  drawn as a hard cut until task 022.
- **Cut.** `cut` takes 0 frames. `transitionDuration` with `cut`, or without a
  transition, is `E_TRANSITION_DURATION`.
- **First and last scene.** The first takes no transition: an explicit non-cut one is
  `E_TRANSITION_FIRST_SCENE`, and the default never applies to it. The last scene needs
  no rule: its transition is its incoming one. A non-cut transition without
  `transitionDuration` is `E_TRANSITION_DURATION`.
- **Timeline.** A scene starts at `start(prev) + length(prev) − transition(scene)`;
  the first starts at 0. The total is the end of the last scene.
- **Bounds (stage 4).** A transition is no longer than either scene it joins
  (`E_TRANSITION_TOO_LONG`; equal is allowed). For each scene, the incoming and
  outgoing transitions together are no longer than the scene (`E_TRANSITION_OVERLAP`),
  checked only when each of them fits alone.
- **IR.** A new file `packages/ir/schema/ir-0.3.json`; 0.2 is unchanged and still
  valid. The filter emits 0.3. Scenes carry optional `transition: {name,
  durationFrames}` (the overlap, 0 for `cut`); the manifest carries
  `timeline: {durationFrames, scenes: [{id, startFrame}]}`.
- **Resolution.** The filter resolves the timeline (`_extensions/video/lib/timeline.lua`).
  The validator recomputes it with `resolveTimeline` (`packages/ir/src/timeline.ts`)
  and rejects a difference (`E_TIMELINE_MISMATCH`). Both pass
  `packages/ir/test-vectors/timeline.json`.
- **Renderer.** Each scene plays its own `durationFrames` from its `startFrame`, so a
  transition's overlap is shown by both scenes (the incoming scene's
  `transition.durationFrames`; `cut` has none). Negative values are rejected earlier
  (ADR-0003; IR schema `minimum: 0`). Corrected 2026-10-15: the earlier wording,
  "until the next starts", contradicted the overlap; the decision is unchanged. See
  task 022.
- **Placement.** Stage 4 is `packages/validator/src/stages/timeline.ts`; the DSL rules
  above are stage 1.

**Worked example** (three 4 s scenes, 1 s fades, 30 fps): starts 0, 90, 180; total
300 frames (10 s), not the 360 that a sum would give.

## Consequences
- Authors can overlap scenes with fades. Output length and frame counts follow the
  timeline, and the `OK` summary reports the total.
- A default `defaults.scene.transition: fade` needs `transitionDuration` on every
  scene it reaches, or the build fails. The PRD §5.2 example (`transition: fade`
  with no duration) therefore needs a human decision (a `defaults.scene.transitionDuration`
  key, which the PRD does not list). The task 010 fixture `front-matter-overrides` now
  uses `transition: cut` in its defaults.
- A default name that no scene uses is not checked by stage 4 (the IR does not carry
  it). A single-scene document with a bad default name passes. Follow-up for a human.
- `fade` renders as a hard cut until task 022. Authors see no warning for this yet.

## Verification
- `npm run check`: `packages/ir/test/timeline.test.ts` (every vector; 0.3 schema rules;
  `timelineOf` for 0.2 and 0.3), `packages/validator/test/timeline.test.ts` (no transitions,
  all overlapping, mixed, first and last scene, transition equal to and longer than the
  scene, each code, mismatch), `packages/registry/test/transitions.test.ts`.
- `npm run test:lua`: `test_transitions.lua` (each filter rule and code), `test_timeline.lua`
  (shared vectors; the worked example in the built manifest).
- `npm run test:integration`: `timeline.test.ts` (each `timeline-*` fixture's codes, lines
  and scene ids; the timeline of the valid ones; the `OK` total; rendered MP4 of
  `timeline-render` has 60 decoded frames, the IR total).

## References
- PRD §5.2 (`defaults.scene.transition`), §5.6 (transition presets), §8.2 (`timeline` in the
  IR contract), §8.3 (timeline semantics), §18.3 (open decision, resolved here).
- ADR-0003 (durations, rounding, no hidden default); ADR-0004 (IR content, versions 0.1
  and 0.2 kept); ADR-0010 (testing policy). Task 015 file, Notes section.
