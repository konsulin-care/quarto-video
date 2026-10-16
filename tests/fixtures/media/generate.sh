#!/usr/bin/env bash
# Generates the media test fixtures (task 037; ADR-0008) with ffmpeg test
# patterns. Run from anywhere: paths resolve from this script's directory.
# Outputs are gitignored: tests/fixtures/media/out/ (probe fixtures) and the
# unsupported clip in the media-unsupported project. Re-running overwrites them.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../../.." && pwd)"
out="$here/out"
unsupported="$repo/tests/fixtures/projects/media-unsupported/assets"
mkdir -p "$out" "$unsupported"

ff() { ffmpeg -hide_banner -loglevel error -nostdin -y "$@"; }

# H.264 MP4, 2 s, 640x360 at 30 fps, with a 440 Hz tone (AAC).
ff -f lavfi -i "testsrc2=size=640x360:rate=30" -f lavfi -i "sine=frequency=440" \
  -t 2 -map 0:v -map 1:a -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 96k \
  "$out/clip-2s-audio.mp4"

# H.264 MP4, 5 s, 640x360 at 25 fps, no audio stream.
ff -f lavfi -i "testsrc=size=640x360:rate=25" \
  -t 5 -an -c:v libx264 -pix_fmt yuv420p "$out/clip-5s-silent.mp4"

# VP9 WebM, 2 s, 640x360 at 24 fps, with Opus audio.
ff -f lavfi -i "testsrc2=size=640x360:rate=24" -f lavfi -i "sine=frequency=330" \
  -t 2 -map 0:v -map 1:a -c:v libvpx-vp9 -b:v 300k -deadline realtime -cpu-used 8 \
  -c:a libopus -b:a 64k "$out/clip-2s.webm"

# 16-bit PCM WAV, 2 s, mono, 44.1 kHz.
ff -f lavfi -i "sine=frequency=440:sample_rate=44100" \
  -t 2 -ac 1 -c:a pcm_s16le "$out/tone-2s.wav"

# An unsupported container for the media-unsupported project: MPEG-4 in AVI, 1 s.
ff -f lavfi -i "testsrc=size=320x240:rate=25" \
  -t 1 -c:v mpeg4 "$unsupported/clip.avi"

echo "media fixtures written to $out and $unsupported"
