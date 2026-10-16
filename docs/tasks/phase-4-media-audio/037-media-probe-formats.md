# 037 — Media probe and supported formats

Phase 4 · Status: in-progress · Depends on: 036 · PRD: §6.3, §18.8 · ADR: writes 0008

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

## Completion log
