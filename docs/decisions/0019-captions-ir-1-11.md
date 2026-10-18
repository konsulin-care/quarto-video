# ADR-0019: Project captions and IR 1.11

- Status: accepted
- Date: 2026-10-18
- Task: 046
- PRD: §12, §5.2, §8.2, §9.2 (no §18 item)

## Context

PRD §12 requires that projects can supply captions or subtitle tracks through a
documented mechanism. The initial release has no such mechanism: IR 1.10 has no field
for a text track that belongs to the whole video, and the top level is closed. The
caption file is a project asset, so it must be validated like the music track (ADR-0017)
and its timing must be checked against the timeline. Burned captions are drawn by the
renderer, and a sidecar file is written by the CLI beside the output.

## Options

1. **`video.captions` front matter, IR top-level `captions`, cues written by the
   validator** (chosen). The same shape as the music track: the filter writes the
   settings, the validator reads the file and writes the cues in frames, and the
   renderer never parses WebVTT.
2. **Captions in a scene.** Rejected: captions are timed against the whole timeline,
   not one scene, and authoring captions inside scenes is out of scope.
3. **Captions in `render.json`.** Rejected: burned captions are content that the
   renderer draws, so they belong in the IR (PRD §5.2, ADR-0017 option 3).

## Decision

1. **Settings.** `video.captions` is a block with two keys; any other key is
   E_CONFIG_UNKNOWN_KEY. Both are required, and an omitted one is E_SETTING_INVALID:
   - `src`: a project-relative `.vtt` file. It resolves inside the root (ADR-0006).
   - `mode`: `burn` (drawn into the picture), `sidecar` (written beside the output as
     `output.vtt`) or `both`. Any other value is E_SETTING_INVALID. The mode is never guessed.
2. **WebVTT subset.** The file starts with `WEBVTT`. Header lines, NOTE blocks and cues
   are read. A cue has an optional identifier, a timing line `start --> end` and text.
   Timestamps are `[HH:]MM:SS.mmm`. STYLE and REGION blocks are an error. Markup tags are
   removed, so the text is plain.
3. **Frames.** A cue is shown on frames `startFrame` up to `endFrame` (exclusive). Both
   are round half up of the time x fps (ADR-0003). A cue that lasts less than one frame is
   E_CAPTIONS_TIMESTAMP.
4. **Errors.** Each diagnostic cites the file and the VTT line:
   - E_CAPTIONS_SYNTAX: not WebVTT, or a block that is not a cue (no timing line, no text).
   - E_CAPTIONS_TIMESTAMP: a malformed timestamp, or an end that is not after the start.
   - E_CAPTIONS_RANGE: a cue that ends after the video's last frame.
   - E_CAPTIONS_OVERLAP: two cues that overlap. No overlap is allowed yet; an option
     would need its own decision.
   A missing file is E_ASSET_MISSING, and a file that is not `.vtt` is E_MEDIA_FORMAT,
   both in the document.
5. **IR 1.11** (`schema/ir-1.11.json`, additive under ADR-0007). An optional top-level
   `captions`: `src`, `mode` (`burn`, `sidecar` or `both`), and optional `cues`, each
   `{startFrame, endFrame, text}` (`startFrame` at least 0, `endFrame` at least 1, text
   not empty). The filter writes 1.11 when `video.captions` is set; the validator writes
   `cues`. IR 1.11 keeps every media item's `kind` (ADR-0018), as 1.10 does.
6. **Burned style.** The renderer draws the cue on its frames only, in a panel at the
   bottom of the safe area (PRD §10.2), above every scene. The style comes from the theme
   tokens: the caption size, the semibold weight, the body line height and the spacing
   and radius. The text is the theme's `text` colour on the theme's `background` colour,
   an opaque panel, so the picture behind it never reaches the text. That pair is
   checked at 4.5:1 by the registry loader (PRD §12).
7. **Sidecar.** In `sidecar` and `both` modes the CLI copies the validated file to
   `output.vtt` next to `output.mp4`, before the output is renamed into place. In `burn`
   mode it writes no sidecar.
8. **Not in scope.** Caption authoring in scenes, automatic transcription, styling
   overrides, several tracks and overlapping cues.

## Consequences

- Captions are one track per project, validated like the music track.
- Each burned caption panel hides the picture under it. That is the price of the
  contrast guarantee over any picture.
- The VTT subset is stricter than WebVTT. A file with STYLE or REGION blocks is rejected
  rather than partly shown.
- The version tests that list the supported versions now include 1.11, as they did for
  1.9 and 1.10.

## Verification

- `packages/ir/test/v111.test.ts`, `frozen.test.ts` (1.11 hash): the `captions` shape and ranges; 1.10 rejects `captions`.
- `_extensions/video/tests/test_captions.lua`: settings, keys, the version written.
- `packages/validator/test/captions.test.ts`: the parser, each code with its line, frames, the stage.
- `renderer/remotion/test/captions.test.ts`: cue frames, burn and sidecar modes, the style's contrast over any picture, placement.
- `tests/integration/captions.test.ts`: `captions-burn` IR, `captions-invalid` against `expected.json`, the sidecar per mode.
- `tests/visual/cases/captions-burn.json`: the frames before, on and after the cue.

## References

- PRD §12, §5.2, §8.2, §9.2; ADR-0003, ADR-0006, ADR-0007, ADR-0017, ADR-0018.
