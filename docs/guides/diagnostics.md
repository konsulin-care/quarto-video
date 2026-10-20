# Diagnostics

Status: task 050. Every code in the table of `packages/validator/README.md` appears
here; `tests/integration/docs.test.ts` fails when one is missing.

## Reading a diagnostic

```text
ERROR index.qmd:12
Scene "scene-003" has duration "4", which must be a number of seconds or milliseconds, like "4s".
Write seconds or milliseconds, for example duration="4s".
```

- The header is the file and, when known, the line of the scene or block.
- The message says what is wrong. The suggestion says what to do.
- `video validate --json` (or `.video-build/diagnostics.json`) gives the same
  fields as an array: `severity`, `code`, `message`, and when known `file`,
  `line`, `sceneId`, `component`, `property`, `assetPath`, `suggestion`.
- An error (`E_`) fails the command with exit 1. A warning (`W_`) does not.
- Validation stops after the first stage that has errors. Fix that stage, then
  run again to see the next.

The stages: 1 filter (the document), 2 contract (components, props, animations,
the IR), 3 assets and data (files, media, captions, CSV), 4 timeline (transitions),
6 output (the rendered file). Stage 5 (tools, browser, disk) prints `video: <problem>`
and exits 2 rather than a code.

## Stage 1: the document

| Code | What it means | Fix |
| --- | --- | --- |
| `E_SETTING_INVALID` | a front matter value is not allowed (`video.*`, `defaults.scene.transition`, `theme`, captions or music) | use a value the message allows; see [authoring.md](authoring.md#front-matter) |
| `E_CONFIG_UNKNOWN_KEY` | an unknown key under `video`, `defaults` or `audio` | correct the spelling (the hint names the closest key) or delete it |
| `E_SCENE_NO_COMPONENT` | a scene has no `component` | add `component="<name>"`; `npx video components` lists the names |
| `E_SCENE_NO_DURATION` | a scene has no `duration` and `defaults.scene.duration` is unset | add `duration="4s"` or set `defaults.scene.duration` |
| `E_SCENE_NESTED` | a scene is inside another block | move it to the top level of the document |
| `E_SCENE_SHAPE` | an unknown class, braces that cannot be read, or a fence Pandoc does not read as a block; in stage 2, an attribute the component does not take | use only `.scene`, quote every value, check the component's props |
| `E_SCENE_ID_INVALID` | a `#id` is not a letter then lowercase letters, digits and hyphens (at most 64) | use the suggested id |
| `E_SCENE_DUPLICATE_ID` | two scenes have the same id | rename one of them |
| `E_DURATION_SYNTAX` | a duration is not a number of `s` or `ms` (`"4"`, `"1e3s"`) | write `4s`, `1.5s` or `250ms` |
| `E_DURATION_RANGE` | a duration is zero, negative, above 3600 s, or shorter than one frame | use a positive duration of at least one frame (33 ms at 30 fps) |
| `E_CONTENT_UNSUPPORTED` | scene content uses Markdown the content model does not take (tables, links, raw HTML, footnotes, math, Markdown images), a bad or duplicate slot | remove it; use an image block for a picture; name each slot once |
| `E_IMAGE_BLOCK` | an image block has no `src` or `alt`, a `fit` other than `cover` or `contain`, extra attributes or content, or a second image in the scene | give `src`, `alt` and a valid `fit`; keep one image per scene |
| `E_VIDEO_BLOCK` | a `.video` block has an unknown attribute, no `src`, a bad `audio`, `placement`, `frame`, `fit`, `loop` or `freeze`, an id, content, or a second block | fix the attribute list in [video-block.md](../components/video-block.md) |
| `E_VIDEO_AUDIO_REQUIRED` | a `.video` block has no `audio` | add `audio="mute"` or `audio="keep"` |
| `E_VIDEO_RANGE` | `sourceStart` is at or after `sourceEnd` | make `sourceEnd` later than `sourceStart` |
| `E_VIDEO_PLAYBACK_RATE` | `playbackRate` is not a positive number | use a number above zero, such as `1` or `2` |
| `E_VIDEO_VOLUME` | `volume` with `audio="keep"` is not above 0 and at most 1 | use a value such as `0.5` |
| `E_AUDIO_RATE` | `audio="keep"` with a `playbackRate` other than 1 | use `playbackRate="1"`, or `audio="mute"` |
| `E_VIDEO_LOOP_FREEZE` | a `.video` block sets both `loop="true"` and `freeze="true"` | keep one of them |
| `E_ANIMATION_UNKNOWN` | `animation` or `exit` is not a preset name (syntax); in stage 2, not a preset of that role | use a name from [the animation table](authoring.md#animations); entrances go in `animation`, `fade-out` in `exit` |
| `E_ANIMATION_DURATION` | `animationDuration` with no `animation` or `exit` (stage 1); in stage 2, a non-windowed preset, a length above the scene, or overlapping windows | remove it, use a windowed preset, shorten it, or leave room for both windows |
| `E_TRANSITION_UNKNOWN` | `transition` is not a name (syntax); in stage 4, not a registered transition | use `cut`, `fade`, `slide`, `wipe` or `zoom` |
| `E_TRANSITION_DURATION` | a transition has no `transitionDuration`, a `cut` has one, or a duration has no transition | add `transitionDuration` to a fade, remove it from a `cut`, or add the transition |
| `E_TRANSITION_FIRST_SCENE` | the first scene has a transition with time in it | remove the transition from the first scene |
| `E_FILTER_FAILED` | the filter failed without usable diagnostics | run `npx video doctor` and see [troubleshooting.md](troubleshooting.md) |

## Stage 2: components, props, animations, IR

| Code | What it means | Fix |
| --- | --- | --- |
| `E_COMPONENT_UNKNOWN` | `component` is not registered | use a name from the message's list |
| `E_SLOT_UNKNOWN` | content sits in a slot the component does not declare | move it to a slot listed for the component |
| `E_SLOT_REQUIRED` | a required slot is empty | add content, for example to `default` for `statement` |
| `E_SLOT_BLOCK_KIND` | a slot holds a block kind it does not accept (for example a paragraph in `heading`) | use the kind the message names |
| `E_SLOT_CONSTRAINT` | a list has fewer or more items than allowed, or a slot has two lists | keep one list with the allowed number of items (`bullets` takes 2 to 6) |
| `E_SLOT_MISSING` | `product-demo` or `text-media` has no framed `.video` block | add a `.video` block with `placement="framed"` |
| `E_ANIMATION_INCOMPATIBLE` | a registered preset does not apply to the scene's component | use one of the presets the message lists for that component (see [the animation table](authoring.md#animations)) |
| `E_PROP_REQUIRED` | a required prop is missing | add it to the `.scene` (for example `value` on `statistic`) |
| `E_PROP_VALUE` | a prop is empty, not in its list, not `true` or `false`, not a `.csv` path, outside its range, not a whole number when required, or not finite | use a value from `npx video components --json` |
| `E_PROP_TYPE` | a number prop is not a number (`1,000`, `abc`, `NaN`) | write `1000`; `42`, `-0.5` and `1e9` are numbers |
| `E_DURATION_BOUNDS` | the scene's duration is outside its component's bounds | use the range in [the component table](authoring.md#durations) |
| `E_THEME_UNKNOWN` | `theme` is not registered | use `modern`, the only theme; the message lists the themes |
| `E_MEDIA_PLACEMENT` | a `.video` block's placement is not one the component takes | use a placement the component lists in its page under `docs/components/` |
| `E_MEDIA_KIND` | an image is given as footage to a component that takes only video | use a video file, or an image block |
| `E_MEDIA_FRAME` | a framed block names an unknown frame | use `browser`, `phone`, `tablet` or `generic` |
| `E_REGION_COUNT` | `split-screen` uses fewer or more regions than allowed | use the number of regions the message gives (2 or 3) |
| `E_IR_SCHEMA` | the manifest does not match the schema of its declared version (the message gives the JSON path) | do not edit `.video-build/manifest.json`; re-run the command, then report it if it repeats |
| `E_IR_UNSUPPORTED_VERSION` | `schemaVersion` is not a supported IR version | re-run the filter so the manifest is regenerated; see [versioning.md](versioning.md) |

## Stage 3: assets, media, captions, data

| Code | What it means | Fix |
| --- | --- | --- |
| `E_ASSET_MISSING` | a path names no file under the project root (the message names the scene) | check the spelling and case, relative to the project root |
| `E_ASSET_ABSOLUTE` | a path starts with `/`, `\` or a drive letter | use a project-relative path such as `assets/clip.mp4` |
| `E_ASSET_ESCAPE` | a path has a `..` segment | keep every asset inside the project folder |
| `E_ASSET_SYMLINK` | an asset is a symlink to a file outside the project | copy the file into the project |
| `E_ASSET_URL` | a path has a URL scheme | download the file into `assets/` |
| `E_ASSET_INVALID` | a path is empty, has control characters, a backslash, a percent-encoded sequence or a trailing slash | write a plain relative file path |
| `E_MEDIA_FORMAT` | a file's extension or codecs are not guaranteed (ADR-0008) | convert the file to a supported format; the message lists them |
| `E_MEDIA_UNREADABLE` | a video or audio file cannot be probed | re-export it; `ffprobe <file>` shows what is wrong |
| `E_MEDIA_RANGE` | `sourceEnd` is past the file's end, or `sourceStart` is at or after it | use times inside the file's duration |
| `E_MEDIA_SHORT_SOURCE` | the footage from `sourceStart` is shorter than the scene and the block has no `loop` or `freeze` | add `loop="true"` or `freeze="true"`, use a longer range, or shorten the scene; footage is never stretched |
| `E_AUDIO_NO_STREAM` | `audio="keep"` on a file with no sound | use `audio="mute"`, or a file with an audio track |
| `E_MUSIC_SHORT` | the music is under one frame, or shorter than the video and not looping | set `loop: true`, or use a longer file |
| `E_MUSIC_FADE` | `fadeOut` is longer than the video | shorten `fadeOut` |
| `E_CAPTIONS_SYNTAX` | the caption file is not WebVTT (no `WEBVTT` header, a cue without timing or text, or a STYLE or REGION block) | write a WebVTT file; the message gives the line |
| `E_CAPTIONS_TIMESTAMP` | a timestamp is malformed, ends before it starts, or lasts less than a frame | write `hh:mm:ss.mmm` times, each cue at least one frame long |
| `E_CAPTIONS_RANGE` | a cue ends after the video's last frame | end the cue inside the video |
| `E_CAPTIONS_OVERLAP` | two cues overlap | move one cue so they do not overlap |
| `E_CSV_SYNTAX` | a CSV file is malformed (quotes, blank lines, field count, header, no rows) | fix the line the message gives |
| `E_COLUMN_UNKNOWN` | a column prop names no column of its CSV | use a header from the list the message gives |
| `E_CSV_VALUE` | a numeric column has a cell that is not a number | correct the cell |

## Stage 4: timeline

| Code | What it means | Fix |
| --- | --- | --- |
| `E_TRANSITION_TOO_LONG` | a transition is longer than either scene it joins | shorten the transition, or lengthen the shorter scene |
| `E_TRANSITION_OVERLAP` | the incoming and outgoing transitions of one scene overlap | shorten one of them |
| `E_TIMELINE_MISMATCH` | the manifest's timeline is not the one its scenes give (a filter bug) | re-run; if it repeats, report it with the project |

## Stage 6: the rendered file

| Code | What it means | Fix |
| --- | --- | --- |
| `E_OUTPUT_MISSING` | no file, or an empty file, at `video.output` after the render | check disk space and the render output; re-run |
| `E_OUTPUT_UNREADABLE` | the rendered file has no readable video stream | re-render; check `npx video doctor` |
| `E_OUTPUT_MISMATCH` | width, height, fps or frame count differs from the IR (`property` names it) | re-render; if it repeats, report it with `.video-build/build-info.json` |

## Warnings

Warnings never change the exit status. They are shown so you can improve the video.

| Code | What it means | Fix |
| --- | --- | --- |
| `W_SLOT_TOO_MANY_BLOCKS` | a slot holds more blocks than its component allows (`statement` shows one) | keep the number the message suggests |
| `W_TEXT_FIT` | the text does not fit the frame even at its smallest size | shorten the text, or use a component with a larger frame |
| `W_ANIMATION_FALLBACK` | a `kinetic` statement has more than 12 words, so it is drawn with `fade-in` | shorten it to 12 words, or choose another animation |
