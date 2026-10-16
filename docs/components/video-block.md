# Video block (`.video`)

Status: source ranges and the short-source rule (task 038, IR 1.6, ADR-0007). The validator checks each block against its file (stage 3, `E_MEDIA_RANGE`, `E_MEDIA_SHORT_SOURCE`). `background` placement is rendered (task 039) under `title` and `statement`; `framed` placement (task 040) is rendered under `statement` and `product-demo` (task 041), in a device frame.

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
| Attribute | Required | Values | Default |
| --- | --- | --- | --- |
| `src` | yes | a file inside the project (no URL, not absolute) | none |
| `audio` | yes | `mute` (keeping the source audio is task 044) | none |
| `placement` | no | `background` or `framed` (slot placement is task 043) | `background` |
| `fit` | no | `cover` or `contain` | `contain` |
| `frame` | with `framed` only | a registered device frame: `browser`, `phone`, `tablet` or `generic` (see [README](README.md#frames-task-040)) | none |
| `sourceStart` | no | a time, `0` allowed (the in-point) | `0s` |
| `sourceEnd` | no | a time (the out-point); absent means the end of the file | the end of the file |
| `loop` | no | `true` or `false`: repeat the footage to fill the scene | `false` |
| `freeze` | no | `true` or `false`: hold the last frame when the footage ends | `false` |
| `playbackRate` | no | a positive number; `2` is double speed | `1` |
| `alt` | no | any text (describes the footage) | `""` |

A time uses the duration form of ADR-0003: `"<n>s"` or `"<n>ms"`. Times are
source time: the in-point and out-point are positions in the file, not on the
timeline. The scene's `duration` is timeline time.

## Rules
- A scene holds one `.video` block. A second one, a block with content, an
  unknown attribute, or a block inside a slot is an error (`E_VIDEO_BLOCK`).
- `loop` and `freeze` cannot both be `true` (`E_VIDEO_LOOP_FREEZE`).
- `sourceStart` must be before `sourceEnd` (`E_VIDEO_RANGE`).
- `playbackRate` must be positive (`E_VIDEO_PLAYBACK_RATE`).
- `audio` is required (`E_VIDEO_AUDIO_REQUIRED`).
- `sourceEnd` past the end of the file is `E_MEDIA_RANGE`: `sourceEnd exceeds the source duration of "assets/clip.mp4".`
- Footage shorter than the scene (its source range, divided by `playbackRate`) is `E_MEDIA_SHORT_SOURCE` unless `loop` or `freeze` is set. The footage is never stretched or sped up to fill the scene.
- `frame` applies only to `framed` placement; a framed block needs one.
- The `frame` must be a registered frame: `E_MEDIA_FRAME` otherwise, and the message lists the registered frames (`packages/registry/frames/`).
- The placement must be one its component takes (`placements` in its contract): `E_MEDIA_PLACEMENT` otherwise. `title` and `statement` take `background`; `statement`, `product-demo` and `text-media` also take `framed`.
- A component that needs footage (`requiresMedia`: `product-demo`, `text-media`) with no `.video` block is `E_SLOT_MISSING`.
- Background footage is muted (`audio="mute"`) and drawn with `fit` (`cover` or `contain`) as the image component draws its picture. Frame N of the scene shows source frame `sourceStart + N × playbackRate`; `loop` repeats the range at normal speed, `freeze` holds its last frame. Without `sourceEnd`, loop and freeze use the end of the file, which the validator reads from the probe.

Fixtures: `tests/fixtures/projects/media-range-*` (overrun, short, loop, freeze). Background: `background-video`, `background-video-loop`, `background-video-freeze`, `background-video-fit`, and `background-video-unsupported` (E_MEDIA_PLACEMENT).
