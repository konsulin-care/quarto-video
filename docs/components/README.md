# docs/components/ — component and preset pages
Status: `title` is the only released component (task 024 replaces its placeholder). Animation presets: `fade-in`, `slide-up`, `reveal` (task 021). Transition presets: task 022.

## Purpose
One page per released component (`<id>.md`), plus this index. A page says what an author writes, what the component accepts and how it behaves. The registry (`packages/registry`) is the source of truth for slots, props and bounds; these pages explain it.

## Components
| Component | Page | Status |
| --- | --- | --- |
| `title` | [title.md](title.md) | Released (placeholder, task 004; contract, task 013; animations, task 021) |

## Presets
A preset is a named motion or transition that an author may use. Presets are data in `packages/registry` (`animations/<id>.json`, `transitions.json`) and a pure frame function in `renderer/remotion`. Authors pick a preset by name; they never write motion code.

### Animations (task 021)
Written as `animation="<id>"` on a `.scene` Div. An animation moves the whole scene from its first frame.

| Id | Purpose | Compatible components | Min frames | Short scene | Reduced motion |
| --- | --- | --- | --- | --- | --- |
| `fade-in` | Content fades from transparent to opaque. | `title` | 15 | static | static |
| `slide-up` | Content fades in while it rises into place. | `title` | 15 | static | static |
| `reveal` | A wipe uncovers the content from left to right. | `title` | 15 | static | static |

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
Not yet released. See `transitions.json` for the names that already parse; until task 022 each one is drawn as a hard cut.

## Adding a page
Copy the shape of [title.md](title.md): Purpose, Usage, Slots and content, Timing and placement, Accessibility, Known limits. A released component or preset also needs its visual case in `tests/visual/cases/` (`tests/README.md`).
