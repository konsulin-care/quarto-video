# Video block (`.video`)

Status: source ranges and the short-source rule (task 038, IR 1.6, ADR-0007); region footage for `split-screen` (task 043, IR 1.7, ADR-0016). The validator checks each block against its file (stage 3, `E_MEDIA_RANGE`, `E_MEDIA_SHORT_SOURCE`). `background` placement is rendered (task 039) under `title` and `statement`; `framed` placement (task 040) is rendered under `statement` and `product-demo` (task 041), in a device frame.

## Purpose

Footage in a scene: a video file placed behind or inside a frame, with a source in-point and out-point. It is a scene's media, not a slot: a `.video` block sits directly in the `.scene` Div.

## Usage

```markdown
::: {.scene component="statement" duration="8s"}
::: {.video src="assets/city.mp4" placement="background" fit="cover" audio="mute"}
:::

Cities are being transformed by AI.
:::
```

A framed clip with a source range:

```markdown
::: {.video src="assets/product-demo.mp4" placement="framed" frame="browser"
fit="contain" sourceStart="12s" sourceEnd="22s" audio="mute" alt="Product demo"}
:::
```

## Attributes

| Attribute      | Required                 | Values                                                                                                          | Default             |
| -------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------- |
| `src`          | yes                      | a file inside the project (no URL, not absolute)                                                                | none                |
| `audio`        | yes                      | `mute` (no source sound) or `keep` (the source sound plays, ADR-0009)                                           | none                |
| `volume`       | with `keep` only         | a decimal above 0 and at most 1: the linear gain of the kept sound (`0.5` is about -6 dB)                       | `1`                 |
| `placement`    | no                       | `background` or `framed`                                                                                        | `background`        |
| `region`       | with region footage only | a region of the component, for `split-screen`: `left`, `middle` or `right`; takes no `placement` and no `frame` | none                |
| `fit`          | no                       | `cover` or `contain`                                                                                            | `contain`           |
| `frame`        | with `framed` only       | a registered device frame: `browser`, `phone`, `tablet` or `generic` (see [README](README.md#frames-task-040))  | none                |
| `sourceStart`  | no                       | a time, `0` allowed (the in-point)                                                                              | `0s`                |
| `sourceEnd`    | no                       | a time (the out-point); absent means the end of the file                                                        | the end of the file |
| `loop`         | no                       | `true` or `false`: repeat the footage to fill the scene                                                         | `false`             |
| `freeze`       | no                       | `true` or `false`: hold the last frame when the footage ends                                                    | `false`             |
| `playbackRate` | no                       | a positive number; `2` is double speed                                                                          | `1`                 |
| `alt`          | no                       | any text (describes the footage)                                                                                | `""`                |

A time uses the duration form of ADR-0003: `"<n>s"` or `"<n>ms"`. Times are
source time: the in-point and out-point are positions in the file, not on the
timeline. The scene's `duration` is timeline time.

## Rules

- A scene holds one background or framed block, or one region block per region (`split-screen`, ADR-0016); the two kinds do not mix. A second block of the same kind or region, a block with content, an unknown attribute, or a block inside a slot is an error (`E_VIDEO_BLOCK`).
- A region block names an identifier (`region="left"`); `region` with `placement` or `frame` is `E_VIDEO_BLOCK`.
- `loop` and `freeze` cannot both be `true` (`E_VIDEO_LOOP_FREEZE`).
- `sourceStart` must be before `sourceEnd` (`E_VIDEO_RANGE`).
- `playbackRate` must be positive (`E_VIDEO_PLAYBACK_RATE`).
- `audio` is required (`E_VIDEO_AUDIO_REQUIRED`).
- `volume` is valid with `keep` only, above 0 and at most 1 (`E_VIDEO_VOLUME`; `E_VIDEO_BLOCK` on `mute`). Volume never boosts a source.
- `keep` needs `playbackRate="1"` (`E_AUDIO_RATE`): the sound cannot follow another speed. A file with no audio stream is `E_AUDIO_NO_STREAM`.
- Kept sound follows the picture: the source range plays from its start, `loop` repeats it, `freeze` leaves silence after it, and it stops with the scene. Across a transition the outgoing and incoming sound cross-fade over the overlap (ADR-0009). Mono sources play 3 dB quieter (ADR-0009, a known deviation).
- `sourceEnd` past the end of the file is `E_MEDIA_RANGE`: `sourceEnd exceeds the source duration of "assets/clip.mp4".`
- Footage shorter than the scene (its source range, divided by `playbackRate`) is `E_MEDIA_SHORT_SOURCE` unless `loop` or `freeze` is set. The footage is never stretched or sped up to fill the scene.
- `frame` applies only to `framed` placement; a framed block needs one.
- The `frame` must be a registered frame: `E_MEDIA_FRAME` otherwise, and the message lists the registered frames (`packages/registry/frames/`).
- The placement must be one its component takes (`placements` in its contract): `E_MEDIA_PLACEMENT` otherwise. `title` and `statement` take `background`; `statement`, `product-demo` and `text-media` also take `framed`; `split-screen` takes region footage.
- A region must be one of the component's regions: `E_SLOT_UNKNOWN`, which lists them. A `split-screen` scene uses two or three regions (`E_REGION_COUNT`) and holds text or footage in each, not both (`E_SLOT_CONSTRAINT`).
- A component that needs footage (`requiresMedia`: `product-demo`, `text-media`) with no `.video` block is `E_SLOT_MISSING`.
- Footage is drawn muted (the picture); its sound is `audio="mute"` or `keep` (task 044). Background footage is drawn with `fit` (`cover` or `contain`) as the image component draws its picture. Frame N of the scene shows source frame `sourceStart + N × playbackRate`; `loop` repeats the range at normal speed, `freeze` holds its last frame. Without `sourceEnd`, loop and freeze use the end of the file, which the validator reads from the probe.

Fixtures: `tests/fixtures/projects/media-range-*` (overrun, short, loop, freeze). Background: `background-video`, `background-video-loop`, `background-video-freeze`, `background-video-fit`, and `background-video-unsupported` (E_MEDIA_PLACEMENT).
