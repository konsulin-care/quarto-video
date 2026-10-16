# 037 — Media probe and supported formats

Phase 4 · Status: done · Depends on: 036 · PRD: §6.3, §18.8 · ADR: writes 0008

## Goal
The validator knows each media asset's type, duration, dimensions, frame rate
and audio presence, and rejects formats outside the guaranteed set.

## Scope
- In: ADR-0008 listing guaranteed video, audio, image and font formats for
  the supported environment; `ffprobe` wrapper (no shell interpolation,
  timeout); cache in `.video-build/media.json` keyed by path + size + mtime;
  stage 3 format checks; generated media fixtures.
- Out: using metadata for source ranges (038).

## Deliverables
- `docs/decisions/0008-supported-media-formats.md` (accepted).
- `packages/validator/src/media/probe.ts`, cache, format table.
- `tests/fixtures/media/generate.sh` (ffmpeg test patterns: 2 s / 5 s H.264
  MP4 with and without audio, WebM, a WAV, an unsupported `.avi`).

## Definition of done
Automated:
- [ ] Probe returns correct duration/size/fps/hasAudio for each fixture.
- [ ] Unsupported format → `E_MEDIA_FORMAT` naming the file and supported list.
- [ ] Second validation uses the cache (probe not re-run; spy).
- [ ] Corrupt file → error, not a crash.

Human check:
1. `bash tests/fixtures/media/generate.sh`.
2. `npx video validate tests/fixtures/projects/media-unsupported` → error
   naming `assets/clip.avi` and the supported formats; exit 1.

## Notes
- Probe and cache are library functions with tests. `video validate` passes only
  image-block references to stage 3 today, so no video or audio file is probed by
  the CLI until 038 adds `.video` blocks (ADR-0008, Consequences).
- Images are checked by extension only (ADR-0008); no content check.
- Fonts are listed in ADR-0008 but no reference uses one yet, so nothing enforces them.
- New codes: `E_MEDIA_FORMAT` (the Automated format box) and `E_MEDIA_UNREADABLE`
  (corrupt file). Both are in `packages/validator/README.md`.
- Renderer playback of MP4/WebM/WAV is not verified here; task 039 verifies video.
- `packages/validator/README.md` is 123 lines, over the 100-line rule for agentic
  docs. It was already 117 before this task; splitting it is a follow-up.
- The CLI's stage 6 probe (`packages/cli/src/output-probe.ts`) has its own ffprobe
  call. Unifying it with `probeFile` is a possible follow-up, not done here.

## Completion log
- 2026-10-16: media probe, cache and format checks. ADR-0008 accepted: guaranteed
  formats are MP4 (H.264, optional AAC), WebM (VP8/VP9, optional Opus/Vorbis),
  WAV (PCM), images (png, jpg, jpeg, webp, svg), and fonts (woff2, woff, ttf, otf)
  listed for later use. Code: `packages/validator/src/media/` (formats, probe,
  cache), `src/stages/media.ts`, and the stage 3 format check in `src/stages/assets.ts`.
  Fixtures: `tests/fixtures/media/generate.sh` and `tests/fixtures/projects/media-unsupported`.
- Tests: `packages/validator/test/media-formats.test.ts`, `media-probe.test.ts` (real
  ffprobe on generated 2 s/5 s MP4, WebM, WAV), `media-stage.test.ts` (one probe per
  file via spy, re-probe on change, corrupt cache, corrupt file as E_MEDIA_UNREADABLE);
  `tests/integration/media-probe.test.ts` (`video validate` exits 1, E_MEDIA_FORMAT).
- Gates: `mise run check` (check.sh --all) passed, exit 0. `mise run test` (test.sh --all)
  passed, exit 0: scripts 19/19, unit 715/715 (80 files), lua 214/214, integration
  pure 128/128 (includes the new media test), render 7/7, visual 225 frames.
- Human check: (1) `bash tests/fixtures/media/generate.sh` wrote four probe fixtures
  and the clip. (2) `npx video validate tests/fixtures/projects/media-unsupported`
  printed `ERROR index.qmd:11`, `Asset "assets/clip.avi" is a .avi file, which is not a
  supported image format.` and the list; exit 1.
- Deviation: ffmpeg is the pinned conda 9.0.2 via mise (`mise install`), not the
  system 6.1 (ffprobe reports 9.0.2 under mise).
- Follow-ups: 038 wires `.video` refs with `use: video`. Renderer checks in 039.
  Validator README length (see Notes).
