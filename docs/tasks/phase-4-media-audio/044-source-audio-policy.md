# 044 — Source audio policy

Phase 4 · Status: todo · Depends on: 039 · PRD: §7, §18.6 · ADR: writes 0009

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
- [ ] `mute` → output has no audio stream or measured silence (ffmpeg
      `volumedetect` max ≤ −90 dB) for that scene's frames.
- [ ] `keep` with 1 kHz tone fixture → tone present at expected level ±1 dB.
- [ ] `keep` on a source without audio → `E_AUDIO_NO_STREAM`.
- [ ] `volume` outside the documented range → error.

Human check:
1. Render `tests/fixtures/projects/audio-keep` and listen: tone audible only
   during the clip's scene.
2. Render `audio-mute`: silent.

## Notes

## Completion log
