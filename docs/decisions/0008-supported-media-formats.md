# ADR-0008: Supported media formats

- Status: accepted
- Date: 2026-10-16
- Task: 037
- PRD: §6.2, §6.3, §11.3, §18.8

## Context
PRD §6.3 requires the validator to check, before rendering, that each asset's
media type is supported. PRD §18.8 asks which video, audio, image and font
formats are guaranteed in the initial supported environment. The environment is
the pinned toolchain (ADR-0010, `mise.toml`): ffmpeg 9.0.2, which provides
ffprobe and the encoders used for the test fixtures, and the Remotion renderer
in Chromium. Where the PRD is silent, the conservative option applies: reject
rather than guess (AGENT.md). Only the validator's acceptance is decided here.
Each renderer's playback of a format is verified by the task that renders it
(task 039 for video).

## Options
1. **Accept what ffprobe can read.** Rejected: the validator would approve
   containers and codecs that no fixture or render test covers.
2. **Guarantee a short list, each entry backed by a fixture.** Anything else is
   `E_MEDIA_FORMAT`. Chosen.
3. **Guarantee a long list now** (MOV, MKV, GIF, MP3, M4A, HEVC, AV1, OTF).
   Rejected: each needs its own fixture and renderer check. A later ADR adds it.

## Decision
| Use   | Extensions                    | Codecs (ffprobe `codec_name`)                                   |
| ----- | ----------------------------- | --------------------------------------------------------------- |
| image | `.png` `.jpg` `.jpeg` `.webp` `.svg` | by extension only (images are not probed)                |
| video | `.mp4`                        | `h264` video; optional `aac` audio                              |
| video | `.webm`                       | `vp8` or `vp9` video; optional `opus` or `vorbis` audio         |
| audio | `.wav`                        | `pcm_*` (only audio streams; no video stream)                   |
| font  | `.woff2` `.woff` `.ttf` `.otf` | by extension; enforced once a feature references a font       |

Rules:
- The extension is the last dot of the file name, matched case-insensitively.
  A file without an extension, or with one not listed for its use, is
  `E_MEDIA_FORMAT`. The message names the file, and the suggestion lists the
  formats for that use.
- A video or audio file must also pass its codec rule (table above), read with
  ffprobe. A codec outside the rule is `E_MEDIA_FORMAT`.
- ffprobe runs with an argument array (no shell), an absolute path, a 10 s
  timeout, and `-protocol_whitelist file`, so no container can name a remote
  URL. A file ffprobe cannot read is `E_MEDIA_UNREADABLE`; the reason never
  includes the path.
- Probe results are cached in `.video-build/media.json`, keyed by the
  project-relative path, and valid while the file's size and mtime are
  unchanged. A cache that cannot be read is empty; one that cannot be written is
  skipped. Neither changes the diagnostics.
- Not guaranteed, so rejected: MOV, MKV, AVI, WebM with AV1, GIF, MP3, M4A and
  ADTS AAC, HEVC, and any other container or codec not in the table.

## Consequences
- An author who uses an unlisted format gets an error that names the file and
  the list. The fix is to convert the file with ffmpeg.
- Adding a format needs a superseding ADR, a fixture, a table entry and tests.
- Images are checked by extension, so a misnamed file is not caught here.
  Content checks for images are not in scope.
- Fonts are listed but no current reference uses one, so nothing enforces them yet.
- The pipeline probes video and audio references only when they are passed to
  the stage (`AssetCheck.media`). Image blocks are the only references in the
  pipeline until task 038 adds `.video` blocks.

## Verification
- `packages/validator/test/media-formats.test.ts`: extension and codec rules,
  including the E_MEDIA_FORMAT message and suggestion.
- `packages/validator/test/media-probe.test.ts`: ffprobe on the generated
  fixtures (`tests/fixtures/media/generate.sh`): duration, size, fps, audio
  presence; damaged and missing files fail without a throw.
- `packages/validator/test/media-stage.test.ts`: one probe per file while the
  cache is valid (spy), re-probe after a change, corrupt cache, unsupported
  format never probed, E_MEDIA_UNREADABLE.
- `tests/integration/media-probe.test.ts`: `video validate` on
  `tests/fixtures/projects/media-unsupported` exits 1 and names `assets/clip.avi`.

## References
- PRD §6.2, §6.3, §11.3, §18.8.
- ADR-0006 (asset paths and the security boundary), ADR-0010 (pinned tools),
  ADR-0013 (image blocks).
- Task 037 (this decision); task 038 (source ranges use the probe).
