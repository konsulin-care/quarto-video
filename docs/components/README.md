# docs/components/ — component and preset pages
Status: `title`, `section-divider`, `end-card` and `statement` are the released components (`title` in task 024, which replaces its placeholder; `section-divider` in task 029; `end-card` in task 030; `statement` in task 025). Animation presets: `fade-in`, `slide-up`, `reveal` (task 021). Transition presets: `cut`, `fade`, `slide`, `wipe`, `zoom` (task 022).

## Purpose
One page per released component (`<id>.md`), plus this index. A page says what an author writes, what the component accepts and how it behaves. The registry (`packages/registry`) is the source of truth for slots, props and bounds; these pages explain it.

## Components
| Component | Page | Status |
| --- | --- | --- |
| `title` | [title.md](title.md) | Released (task 024: subtitle slot; placeholder task 004, contract 013, animations 021) |
| `section-divider` | [section-divider.md](section-divider.md) | Released (task 029: kicker slot, fade-in and slide-up) |
| `end-card` | [end-card.md](end-card.md) | Released (task 030: message, call to action, credits) |
| `statement` | [statement.md](statement.md) | Released (task 025: one sentence, accent for `strong`, text fit to the safe area) |

## Presets
A preset is a named motion or transition that an author may use. Presets are data in `packages/registry` (`animations/<id>.json`, `transitions.json`) and a pure frame function in `renderer/remotion`. Authors pick a preset by name; they never write motion code.

### Animations (task 021)
Written as `animation="<id>"` on a `.scene` Div. An animation moves the whole scene from its first frame.

| Id | Purpose | Compatible components | Min frames | Short scene | Reduced motion |
| --- | --- | --- | --- | --- | --- |
| `fade-in` | Content fades from transparent to opaque. | `title`, `section-divider`, `end-card`, `statement` | 15 | static | static |
| `slide-up` | Content fades in while it rises into place. | `title`, `section-divider`, `end-card`, `statement` | 15 | static | static |
| `reveal` | A wipe uncovers the content from left to right. | `title`, `end-card`, `statement` | 15 | static | static |

Rules that apply to every animation preset:
- Timing: the entrance takes a third of the scene, at least 1 frame and at most 30 frames (1 s at 30 fps). The entrance ends before the scene's last frame.
- Easing: `fade-in` and `slide-up` ease out (cubic); `reveal` moves at constant speed.
- Short scene: a scene shorter than `minFrames` shows its end state from its first frame. No motion.
- Reduced motion: each preset declares `static`, which is the end state from its first frame. The switch that applies it is task 023; until then the rule is declared, not applied.
- A preset is a pure function of the frame, the scene length and the theme tokens. The same frame always gives the same picture (PRD §11.1).
- `slide-up` rises by `space.lg` of the theme. `reveal` hides part of the content while it wipes in; at the end nothing is clipped.

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
