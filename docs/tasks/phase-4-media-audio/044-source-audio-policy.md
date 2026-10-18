# 044 — Source audio policy

Phase 4 · Status: done · Depends on: 039 · PRD: §7, §18.6 · ADR: writes 0009

## Goal

Each piece of footage has explicit audio behaviour (`mute` or `keep` with a
volume), and the output audio matches it exactly.

## Scope

- In: ADR-0009 (audio architecture: per-media policy + project-level
  `audio` section vs. separate audio timeline; trimming/looping/ending
  rules; volume range and units; behaviour at transitions/overlaps);
  `audio="mute|keep"`, `volume`; IR fields; validator checks
  (`keep` on a file without audio → error); renderer mixing.
- Out: background music (045).

## Deliverables

- `docs/decisions/0009-audio-architecture.md` (accepted).
- IR schema minor bump; validator `stages/audio.ts`; renderer support.
- Fixtures `audio-mute`, `audio-keep`, `audio-keep-silent-source`.

## Definition of done

Automated:

- [x] `mute` → output has no audio stream or measured silence (ffmpeg
      `volumedetect` max ≤ −90 dB) for that scene's frames.
- [x] `keep` with 1 kHz tone fixture → tone present at expected level ±1 dB.
- [x] `keep` on a source without audio → `E_AUDIO_NO_STREAM`.
- [x] `volume` outside the documented range → error.

Human check:

1. Render `tests/fixtures/projects/audio-keep` and listen: tone audible only
   during the clip's scene.
2. Render `audio-mute`: silent.

## Notes

- Human check (listening, passed 2026-10-18): `audio-keep` (tone only during its scene) and `audio-mute` (silent) rendered and listened to.
- Mono sources play 3 dB quieter: the output is stereo and ffmpeg centre-mixes mono (ADR-0009, Consequences). Open for a human: fix (channel option or pan) or reject mono keep.
- `audio="keep"` was E_VIDEO_BLOCK (task 038); its test now uses `loud`. `volume` is a real attribute now; the unknown-attribute test uses `gain`.
- Extra fixture `audio-keep-fade` (transition ramp, ADR-0009). Fixtures `audio-*` are gitignored; text-media clips were tracked by mistake and are untracked (c829137).
- Line limits: over 100 lines, not trimmed: `_extensions/video/README.md` 117 (was 102), `packages/validator/README.md` 153 (was 139), `renderer/remotion/README.md` 107 (was 95). Prettier (the staged-file format gate) reflowed these.

## Completion log

- 2026-10-16: source audio policy done (ADR-0009 accepted; IR 1.8; filter `keep`/`volume`; E_AUDIO_NO_STREAM; renderer SourceAudio). Tests: `mise run check` passed; `mise run test` suites scripts 19/19, unit 996/996 (103 files), lua 257/257, integration 153 + 56 pass; visual passed on rerun (the first full run was cut off by my own timeout). Pre-push gates passed on push 083bddb.
- Tests: `renderer/remotion/test/source-audio.test.ts`, `packages/validator/test/audio.test.ts`, `packages/ir/test/v18.test.ts`, `_extensions/video/tests/test_media_audio.lua`, `tests/integration/audio-policy.test.ts`.
- Human check: not run by a person. I could not listen. Measured with ffmpeg volumedetect on fresh renders: audio-mute has no audio stream; audio-keep is silent in the first and last scenes (-91 dB) and peaks at -18.0 dB in the kept scene (source tone -17.5 dB peak).
- Follow-ups: mono level fix or rejection; a human listening check of audio-keep and audio-mute.
