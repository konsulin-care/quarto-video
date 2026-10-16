# docs/components/ — component and preset pages
Status: `title`, `section-divider`, `end-card`, `statement`, `comparison`, `bullets`, `image` (task 033, IR 1.3, ADR-0013) `chart` (task 035, props and CSV tables, IR 1.4, ADR-0014) and `statistic` (task 031, number props, IR 1.5, ADR-0015) are the released components; `product-demo` (task 041) takes framed footage with a caption. `title` in task 024 replaces its placeholder; `section-divider` in task 029; `end-card` in task 030; `statement` in task 025; `comparison` in task 034; `bullets` in task 027. Animation presets: `fade-in`, `slide-up`, `reveal` (task 021; `product-demo` takes all three), `kinetic` (task 026), `stagger` (task 028), `count-up` (task 032). Transition presets: `cut`, `fade`, `slide`, `wipe`, `zoom` (task 022).

## Purpose
One page per released component (`<id>.md`), plus this index. A page says what an author writes, what the component accepts and how it behaves. The registry (`packages/registry`) is the source of truth for slots, props and bounds; these pages explain it.

## Components
| Component | Page | Status |
| --- | --- | --- |
| `title` | [title.md](title.md) | Released (task 024: subtitle slot; placeholder task 004, contract 013, animations 021) |
| `section-divider` | [section-divider.md](section-divider.md) | Released (task 029: kicker slot, fade-in and slide-up) |
| `end-card` | [end-card.md](end-card.md) | Released (task 030: message, call to action, credits) |
| `statement` | [statement.md](statement.md) | Released (task 025: one sentence, accent for `strong`, text fit to the safe area) |
| `comparison` | [comparison.md](comparison.md) | Released (task 034: left, right and optional middle slots) |
| `bullets` | [bullets.md](bullets.md) | Released (task 027: one list of 2 to 6 items, optional heading) |
| `image` | [image.md](image.md) | Released (task 033: image block, caption slot, fit; IR 1.3, ADR-0013) |
| `.video` block | [video-block.md](video-block.md) | Source ranges and short-source rule (task 038, IR 1.6); background under `title` and `statement` (task 039); framed under `statement` (task 040) and `product-demo` (task 041) |
| `chart` | [chart.md](chart.md) | Released (task 035: bar or line from a CSV; IR 1.4, ADR-0014) |
| `statistic` | [statistic.md](statistic.md) | Released (task 031: value, unit, prefix and decimals; label and context; IR 1.5, ADR-0015) |
| `product-demo` | [product-demo.md](product-demo.md) | Released (task 041: one framed `.video` block, optional caption; no framed images yet) |

## Frames (task 040)
A `.video` block with `placement="framed"` shows its footage on the screen of a device frame. `frame` names one of the registered frames (`packages/registry/frames/`); an unknown name is `E_MEDIA_FRAME`, which lists them.

| Frame | Aspect | Screen (safe content box) | Use |
| --- | --- | --- | --- |
| `browser` | 16:10 | 96% × 86%, below a title bar | a web app or site |
| `phone` | 9:19 | 90% × 94% | a mobile app, portrait |
| `tablet` | 4:3 | 92% × 90% | a touch app, landscape |
| `generic` | 16:9 | 94% × 94% | footage with no device |

The frame is the largest box of its aspect in the canvas safe area. Footage is clipped to the screen and framed by `fit` (`cover` or `contain`), as background footage is. `statement` and `product-demo` take `framed`; layouts beside a frame belong to 043.

## Presets
A preset is a named motion or transition that an author may use. Presets are data in `packages/registry` (`animations/<id>.json`, `transitions.json`) and a pure frame function in `renderer/remotion`. Authors pick a preset by name; they never write motion code.

### Animations (task 021)
Written as `animation="<id>"` on a `.scene` Div. An animation moves the whole scene from its first frame.

| Id | Purpose | Compatible components | Min frames | Short scene | Reduced motion |
| --- | --- | --- | --- | --- | --- |
| `fade-in` | Content fades from transparent to opaque. | `title`, `section-divider`, `end-card`, `statement`, `comparison`, `bullets`, `image`, `chart`, `statistic` | 15 | static | static |
| `slide-up` | Content fades in while it rises into place. | `title`, `section-divider`, `end-card`, `statement`, `comparison`, `bullets`, `image`, `chart`, `statistic` | 15 | static | static |
| `reveal` | The content fades in while it grows from 96% to full size. | `title`, `end-card`, `statement`, `comparison`, `bullets`, `image`, `chart`, `statistic` | 15 | static | static |
| `kinetic` | The words of a statement appear one after another, each rising into place, all in place by 80% of the scene. | `statement` | 30 | static | static |
| `stagger` | The items of a list appear one after another, each fading in while it rises into place, all in place by 70% of the scene. | `bullets`, `end-card` | 45 | static | static |
| `count-up` | The value of a statistic counts up from zero to its exact value, shown from 70% of the scene. | `statistic` | 45 | static | static |

Rules that apply to every animation preset:
- Timing: the entrance takes a third of the scene, at least 1 frame and at most 30 frames (1 s at 30 fps). The entrance ends before the scene's last frame. `kinetic` keeps its own timing (below).
- Easing: `fade-in`, `slide-up` and `reveal` ease out (cubic).
- Short scene: a scene shorter than `minFrames` shows its end state from its first frame. No motion.
- Reduced motion: each preset declares `static`, which is the end state from its first frame. The switch that applies it is task 023; until then the rule is declared, not applied.
- A preset is a pure function of the frame, the scene length and the theme tokens. The same frame always gives the same picture (PRD §11.1).
- `slide-up` rises by `space.lg` of the theme. `reveal` grows from 96% to full size. No preset clips or masks content, so no glyph is cut at any frame (task 021: the earlier wipe was replaced on 2026-10-15).

Kinetic (task 026): the scene itself does not move; each word of the statement fades in over 6 frames and rises by `space.sm`. Word *i* of *N* starts at frame floor(*i* × S / *N*), with S = ceil(0.8 × length) − 6, so every word is in place by 80% of the scene. Only `statement`. More than 12 words (`KINETIC_MAX_WORDS`) draws `fade-in` and the validator warns `W_ANIMATION_FALLBACK`. A word is a run of non-space characters. `title` is not supported.

Stagger (task 028): the scene itself does not move; each item of the list does. Item *i* of *N* starts at floor(*i* × S / *N*), with S = ceil(0.7 × length) − 9, and fades in over 9 frames while it rises by `space.sm`, so every item is in place by 70% of the scene. For `bullets` the items are the list points; for `end-card` they are the `credits` lines. The message, heading and call to action are drawn from the first frame. A scene under 45 frames (1.5 s) and reduced motion draw every item in its place (static): reduced motion shows the whole list at once, with no fade, which is the registry's `static` rule. Errors: a stagger on a component other than `bullets` or `end-card` is `E_ANIMATION_INCOMPATIBLE`.

Count-up (task 032): the scene does not move; the number of a `statistic` counts up. The count runs from frame 0 to frame ceil(0.7 × duration), easing out, and shows the value formatted as the statistic formats it (`formatNumber`) from that frame on. A negative value counts down to its value. A scene under 45 frames (1.5 s) and reduced motion show the value from the first frame. Errors: a count-up on any other component is `E_ANIMATION_INCOMPATIBLE`.

Example:
```markdown
::: {.scene component="title" duration="4s" animation="slide-up"}
# Welcome
:::
```

Errors (validator, stage 2): `E_ANIMATION_UNKNOWN` for a name that is not a registered preset (the message lists the known ones); `E_ANIMATION_INCOMPATIBLE` when the preset does not apply to the scene's component (the message lists that component's animations). A name that is not a name at all (for example `Fade In`) is `E_ANIMATION_UNKNOWN` from the filter.

### Transitions (task 022)
Written as `transition="<id>"` and `transitionDuration="<n>s"` (or `ms`) on a `.scene`. A transition belongs to the scene it enters (ADR-0005); the first scene has none. The scene starts `transitionDuration` before the previous one ends, so both are on screen for those frames. Each scene keeps its own length.

| Id | Purpose | Duration (min to max) | Reduced motion |
| --- | --- | --- | --- |
| `cut` | No overlap; no `transitionDuration`. | 0 | cut |
| `fade` | The incoming scene fades in over the outgoing one (a crossfade). | 0.1s to 3s | fade |
| `slide` | The outgoing scene slides out left while the incoming one slides in from the right. | 0.1s to 3s | fade |
| `wipe` | A left-to-right wipe uncovers the incoming scene. | 0.1s to 3s | fade |
| `zoom` | The incoming scene grows from 60% size while it fades in. | 0.1s to 3s | fade |

Rules that apply to every transition:
- Frames: the overlap is `transitionDuration` rounded to frames (ADR-0003). On the overlap's first frame the incoming side has barely started; on its last frame the incoming scene is complete and the outgoing one is gone.
- `cut` draws no blended frame: the next scene's first frame is the previous scene's end.
- Reduced motion: the table's fallback draws the same overlap without movement (task 023 applies it; until then the rule is declared, not applied). `cut` stays `cut`, so the timeline never changes.
- `defaultMs` in the registry is documentation only: every non-cut transition states `transitionDuration` (ADR-0005).

Example:
```markdown
::: {.scene component="title" duration="4s" transition="slide" transitionDuration="500ms"}
# Next
:::
```

Errors (validator, stage 4): `E_TRANSITION_UNKNOWN` for a name that is not registered (the message lists the known ones); `E_TRANSITION_DURATION` when the length is outside the transition's bounds, or a `transitionDuration` is given to `cut`. Other timeline errors: `E_TRANSITION_FIRST_SCENE`, `E_TRANSITION_TOO_LONG`, `E_TRANSITION_OVERLAP` (ADR-0005).

## Adding a page
Copy [_template.md](_template.md): Purpose, Usage, Slots and content, Timing and placement, Accessibility, Known limits. [title.md](title.md) is a worked example. A released component or preset also needs its visual case in `tests/visual/cases/` (`tests/README.md`).
