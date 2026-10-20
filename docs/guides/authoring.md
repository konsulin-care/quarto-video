# Authoring

Status: task 050. This is the DSL reference for IR 1.12 (ADR-0020). Every `qmd`
fence in this guide is a complete project that `video validate` accepts
(`tests/integration/docs.test.ts`). Other fences are fragments.

A project is a folder with an `index.qmd`. Scenes are Pandoc Divs. You write
components, durations and presets by name; you never write CSS, HTML,
JavaScript or pixel positions.

```
my-video/
├── index.qmd      # the only required file
├── assets/        # images, footage, music, captions (paths relative to the project)
└── .video-build/  # generated on every run; safe to delete
```

## Front matter

```yaml
---
title: "My video"          # optional; stored with the build settings, not drawn
theme: modern              # the only theme
video:
  width: 1920              # positive, even; default 1920
  height: 1080             # positive, even; default 1080
  fps: 30                  # positive whole number; default 30
  background: "#101418"    # hex colour; default: the theme's canvas
  output: output.mp4       # relative path ending in .mp4; default output.mp4
  reducedMotion: false     # true or false, unquoted; default false
  captions:                # optional, see Captions
    src: assets/captions.vtt
    mode: sidecar          # burn, sidecar or both
defaults:
  scene:
    duration: 3s           # for a scene with no duration
    transition: fade       # for every scene after the first, unless it sets its own
audio:
  music:                   # optional, see Music
    src: assets/music.wav
    volume: 0.4            # above 0, at most 1
    loop: true
    fadeOut: 2s
---
```

Any other key under `video`, `defaults` or `audio` is `E_CONFIG_UNKNOWN_KEY`,
with a "Did you mean" hint when a known key is close. `codec` and `container`
are not supported yet.

## Scenes

```markdown
::: {.scene component="statement" duration="4s" animation="reveal"}
One sentence that makes your point.
:::
```

- `component` and `duration` are required, unless `defaults.scene.duration`
  gives a duration (`E_SCENE_NO_COMPONENT`, `E_SCENE_NO_DURATION`).
- The only class is `scene`. A scene cannot sit inside another block.
- `#my-id` names the scene: a letter, then lowercase letters, digits and hyphens,
  at most 64 characters, unique in the project. Without one the scene is `scene-001`, `scene-002`, ....
- Any other attribute is a prop of the component (see the table below).
  An attribute the component does not take is an error (`E_SCENE_SHAPE`).
- Scenes play one after another in source order. The timeline is the sum of
  their durations, less any transition overlap (see Transitions).

### Durations

A duration is a number with `s` or `ms` and up to three decimals: `4s`, `1.5s`,
`250ms`. It must be greater than zero, at most 3600 s, and at least one frame at
the project's fps (ADR-0003). Each component also has bounds, shown below. At
30 fps, `100ms` is 3 frames and is valid.

| Component | Duration | Slots (`required` must have content) | Props (on the `.scene`) |
| --- | --- | --- | --- |
| `title` | 0.1 s to 30 s | `default` (required: paragraph, heading); `subtitle` (paragraph); `text-overlay` | none |
| `statement` | 0.1 s to 30 s | `default` (required: paragraph, heading); `text-overlay` | none |
| `bullets` | 0.1 s to 30 s | `default` (required: one list of 2 to 6 items); `heading` (heading) | none |
| `statistic` | 0.1 s to 30 s | `label` (required: paragraph); `context` (paragraph) | `value` (number, required); `unit`; `prefix`; `decimals` (whole number 0 to 6) |
| `section-divider` | 0.1 s to 8 s | `default` (required: paragraph, heading); `kicker` (paragraph) | none |
| `end-card` | 0.1 s to 30 s | `default` (required: paragraph, heading); `cta` (paragraph); `credits` (list) | none |
| `comparison` | 0.1 s to 30 s | `left`, `right` (required); `middle` (optional): heading, paragraph, list | none |
| `image` | 0.1 s to 30 s | `default` (required: one image block); `caption` (paragraph) | none |
| `chart` | 0.1 s to 30 s | `caption` (paragraph) | `data` (CSV path), `type` (`bar` or `line`), `x`, `y` (CSV columns), `title`, `unit` |
| `product-demo` | 0.1 s to 30 s | `caption` (paragraph); needs one framed `.video` block | none |
| `text-media` | 0.1 s to 30 s | `text` (required: paragraph, heading); needs one framed `.video` block | `side` (`left` or `right`) |
| `split-screen` | 0.1 s to 30 s | `left`, `middle`, `right` (paragraph or heading, or region footage) | none |

`npx video components` prints this list from the registry, and
`npx video components --json` prints the full contracts. Each component has a
page in `docs/components/`.

## Content slots

Content inside a scene is Markdown, read into named slots:

- Loose content goes to the `default` slot.
- A named slot is a nested Div with the slot's name as its class, such as
  `::: {.subtitle}` or `::: {.label}`. The template shows both.
- Blocks the components draw: headings (`#` and `##`), paragraphs, one list
  (`-`), and an image block. A block the slot does not accept is
  `E_SLOT_BLOCK_KIND`; a missing required slot is `E_SLOT_REQUIRED`.
- Not supported in scene content: tables, links, raw HTML or comments,
  footnotes, math and Markdown images (`E_CONTENT_UNSUPPORTED`). Use an image
  block for pictures.

Image and footage blocks take a file from the project. They need files, so
they are shown as fragments:

```markdown
::: {.scene component="image" duration="4s" animation="fade-in"}
::: {.image src="assets/harbour.jpg" fit="cover" alt="A harbour at dusk"}
:::

::: {.caption}
Harbour at dusk.
:::
:::
```

```markdown
::: {.scene component="statement" duration="8s"}
::: {.video src="assets/city.mp4" placement="background" fit="cover" audio="mute"}
:::

Cities are being transformed by AI.
:::
```

A `.video` block must set `audio` (`mute` or `keep`). Its source range, frames,
device frames and short-footage rules are in
[docs/components/video-block.md](../components/video-block.md).

## Your first scenes

```qmd
---
title: "Two scenes"
video:
  width: 1280
  height: 720
  fps: 30
---

::: {.scene component="title" duration="3s" animation="fade-in" exit="fade-out"}
# Hello

::: {.subtitle}
A first video
:::
:::

::: {.scene component="statement" duration="4s" transition="fade" transitionDuration="500ms" animation="reveal"}
One sentence that makes your point.
:::
```

## Bullets and statistics

```qmd
---
video:
  width: 1280
  height: 720
---

::: {.scene component="bullets" duration="5s" animation="stagger"}
::: {.heading}
## Three things to remember
:::

- First point
- Second point
- Third point
:::

::: {.scene component="statistic" duration="3s" value="42" unit="%" animation="count-up"}
::: {.label}
Of learners finished the course
:::

::: {.context}
Survey of 1,200 learners in 2026
:::
:::
```

`value` is a plain number: `42`, `-0.5`, `1e9`. `1,000` is `E_PROP_TYPE`; write
`1000`. `decimals` sets the digits after the point, and `prefix` and `unit` are
drawn next to the number.

## Transitions

A transition belongs to the scene it leads into. It overlaps the previous scene,
so the timeline is shorter by the transition's length.

| Name | Time | Notes |
| --- | --- | --- |
| `cut` | none | takes no `transitionDuration` |
| `fade` | `transitionDuration` | |
| `slide` | `transitionDuration` | |
| `wipe` | `transitionDuration` | |
| `zoom` | `transitionDuration` | |

- `transition="<name>"` and `transitionDuration="<n>s"` (or `ms`) go on the
  incoming scene. A transition needs a duration unless it is `cut`.
- The first scene has no transition (`E_TRANSITION_FIRST_SCENE`).
- A transition may not be longer than either scene it joins (`E_TRANSITION_TOO_LONG`).
- `defaults.scene.transition` gives every later scene a transition; a scene
  that sets its own `transition` wins.

Two 1-second scenes joined by a 500 ms `fade` make 45 frames at 30 fps,
not 60.

## Animations

Entrances are set with `animation`. Each preset works with the components listed:

| Preset | Components | Notes |
| --- | --- | --- |
| `fade-in` | title, section-divider, end-card, statement, comparison, bullets, image, chart, statistic, product-demo, text-media, split-screen | windowed |
| `slide-up` | the same as `fade-in` | windowed |
| `reveal` | the same as `fade-in`, without section-divider | windowed |
| `kinetic` | statement | words rise in one by one; more than 12 words falls back to `fade-in` (`W_ANIMATION_FALLBACK`) |
| `stagger` | bullets, end-card | list items appear in turn |
| `count-up` | statistic | the number counts up from zero |

The entrance lasts a third of the scene, at most one second, unless
`animationDuration` sets it. A scene shorter than 15 frames shows its end
state at once. `reducedMotion: true` in the front matter draws each preset at its end
state.

## Exit and animationDuration

`exit` names the exit preset. Only `fade-out` exists. It fades the scene out over
its last window. An entrance name in `exit` (or an exit name in `animation`) is
`E_ANIMATION_UNKNOWN`, with the attribute to use instead.

`animationDuration` sets the length of the entrance and/or exit window:

- It needs an `animation` or an `exit`, and the presets must be windowed
  (`fade-in`, `slide-up`, `reveal`, `fade-out`). `kinetic`, `stagger` and
  `count-up` keep their own timing and reject it (`E_ANIMATION_DURATION`).
- It must be no longer than the scene.
- With both an entrance and an exit, the two windows must fit: twice the
  duration at most the scene length (`E_ANIMATION_DURATION`).

The reference video `videos/hello-world` uses both. Its first scene fades in
over 500 ms and its last scene fades out over 500 ms. The excerpt below has the
same two scenes:

```qmd
---
video:
  width: 1000
  height: 1000
  background: "#000000"
---

::: {.scene component="title" duration="1.0s" animation="fade-in" animationDuration="500ms"}
# H
:::

::: {.scene component="title" duration="2.0s" exit="fade-out" animationDuration="500ms"}
# World!
:::
```

## Music and captions

- `audio.music` is one background track for the whole video. The file is a
  WAV in the project, probed at validation. It must last at least one frame
  and be long enough for the video unless `loop: true` (`E_MUSIC_SHORT`), and
  `fadeOut` must not be longer than the video (`E_MUSIC_FADE`).
- `video.captions` takes a WebVTT file (`src`) and a `mode`. `burn` draws the
  captions into the picture, `sidecar` writes `output.vtt` beside the video,
  and `both` does both. Cues must not overlap and must end inside the video.
  Both `src` and `mode` are required.

## Checking a project

```sh
npx video validate my-video          # OK, or the diagnostics
npx video validate my-video --print-ir
```

Fix every error before you render. [diagnostics.md](diagnostics.md) lists each
code and its fix; [cli.md](cli.md) lists the commands.
