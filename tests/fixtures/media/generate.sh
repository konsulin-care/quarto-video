#!/usr/bin/env bash
# Generates the media test fixtures (task 037; ADR-0008) with ffmpeg test
# patterns. Run from anywhere: paths resolve from this script's directory.
# Outputs are gitignored: tests/fixtures/media/out/ (probe fixtures), the
# unsupported clip in the media-unsupported project, the clip copied into the
# media-range-* projects (task 038) and the background-video projects (task 039). Re-running overwrites them.
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

# The range fixtures (task 038) use the 2 s clip with audio as assets/clip.mp4.
ranges="$repo/tests/fixtures/projects"
for name in overrun short loop freeze; do
  mkdir -p "$ranges/media-range-$name/assets"
  cp "$out/clip-2s-audio.mp4" "$ranges/media-range-$name/assets/clip.mp4"
done

# The background-video fixtures (task 039): 4 s at 30 fps, where frame n shows its
# own index n in eight bits. Bit k is the k-th 40 px column of the top band (white
# is 1); below the band a grey gradient shows the framing. The 16:9 clip matches
# the canvas; the 4:3 clip shows contain against cover.
# The clips carry a 440 Hz tone, so a render that keeps the source audio is visible.
counter() {
  ff -f lavfi -i "color=c=black:size=$1:rate=30:duration=$3" \
    -f lavfi -i "sine=frequency=440:duration=$3" \
    -vf "geq=lum='if(lt(Y,40),255*mod(floor(N/pow(2,floor(X/40))),2),255*X/W)':cb=128:cr=128" \
    -map 0:v -map 1:a -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 96k "$out/$2"
}
counter 640x360 counter-4s.mp4 4
counter 640x480 counter-4s-4x3.mp4 4
# 2 s: the device-frames scenes use at most 2 s of footage (keeps the generator fast).
counter 360x640 counter-2s-9x16.mp4 2

# H.264 MP4, 2 s, 640x360 at 30 fps, with a stereo 1 kHz tone of amplitude 1/8 (about -18 dBFS
# peak) on both channels (AAC): the audio-keep fixture (task 044). Stereo, because a mono source
# is mixed into the stereo output at the centre level (-3 dB; ADR-0009).
ff -f lavfi -i "testsrc2=size=640x360:rate=30" \
  -f lavfi -i "aevalsrc=0.125*sin(2*PI*1000*t)|0.125*sin(2*PI*1000*t):s=44100" \
  -t 2 -map 0:v -map 1:a -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k \
  "$out/clip-2s-1khz-stereo.mp4"

# 16-bit PCM WAV, 2 s, mono, 44.1 kHz.
ff -f lavfi -i "sine=frequency=440:sample_rate=44100" \
  -t 2 -ac 1 -c:a pcm_s16le "$out/tone-2s.wav"

# An unsupported container for the media-unsupported project: MPEG-4 in AVI, 1 s.
ff -f lavfi -i "testsrc=size=320x240:rate=25" \
  -t 1 -c:v mpeg4 "$unsupported/clip.avi"

background="$repo/tests/fixtures/projects"
for name in background-video background-video-loop background-video-freeze; do
  mkdir -p "$background/$name/assets"
  cp "$out/counter-4s.mp4" "$background/$name/assets/clip.mp4"
done
mkdir -p "$background/background-video-fit/assets"
cp "$out/counter-4s-4x3.mp4" "$background/background-video-fit/assets/clip.mp4"

# The device-frames fixtures (task 040): one counter clip per shape, 16:9 for the
# one-scene-per-frame project, and 16:9, 9:16 and 4:3 for the visual cases.
devices="$repo/tests/fixtures/projects"
mkdir -p "$devices/device-frames/assets" "$devices/device-frames-media/assets"
cp "$out/counter-4s.mp4" "$devices/device-frames/assets/clip.mp4"
cp "$out/counter-4s.mp4" "$devices/device-frames-media/assets/wide.mp4"
cp "$out/counter-2s-9x16.mp4" "$devices/device-frames-media/assets/tall.mp4"
cp "$out/counter-4s-4x3.mp4" "$devices/device-frames-media/assets/four-three.mp4"

# The product-demo fixtures (task 041): the same three counter clips, in one
# project for the valid run and one for the invalid run (task 042: text-media too).
for name in component-product-demo component-product-demo-invalid component-text-media component-text-media-invalid component-split-screen component-split-screen-invalid; do
  mkdir -p "$devices/$name/assets"
  cp "$out/counter-4s.mp4" "$devices/$name/assets/wide.mp4"
  cp "$out/counter-2s-9x16.mp4" "$devices/$name/assets/tall.mp4"
  cp "$out/counter-4s-4x3.mp4" "$devices/$name/assets/four-three.mp4"
done

# The split-screen fixtures (task 043): the counter clips as region footage; the tall clip loops.
for name in component-split-screen component-split-screen-invalid; do
  mkdir -p "$devices/$name/assets"
  cp "$out/counter-4s.mp4" "$devices/$name/assets/wide.mp4"
  cp "$out/counter-2s-9x16.mp4" "$devices/$name/assets/tall.mp4"
  cp "$out/counter-4s-4x3.mp4" "$devices/$name/assets/four-three.mp4"
done

# The source-audio fixtures (task 044): audio-mute keeps the 440 Hz clip muted, audio-keep plays
# the 1 kHz clip, audio-keep-fade fades it in over a transition, and audio-keep-silent-source keeps
# a clip with no audio stream (an error).
audio="$repo/tests/fixtures/projects"
mkdir -p "$audio/audio-mute/assets" "$audio/audio-keep/assets" "$audio/audio-keep-fade/assets" "$audio/audio-keep-silent-source/assets"
cp "$out/clip-2s-audio.mp4" "$audio/audio-mute/assets/clip.mp4"
cp "$out/clip-2s-1khz-stereo.mp4" "$audio/audio-keep/assets/tone.mp4"
cp "$out/clip-2s-1khz-stereo.mp4" "$audio/audio-keep-fade/assets/tone.mp4"
cp "$out/clip-5s-silent.mp4" "$audio/audio-keep-silent-source/assets/silent.mp4"

# The music fixtures (task 045; ADR-0017): a 1.5 s stereo 450 Hz tone (15 cycles per 30 fps frame, so each
# frame measures exactly) of amplitude 1/8, as 16-bit
# PCM WAV, is the track of music-loop, music-short-error and music-with-keep. music-with-keep also
# keeps the 1 kHz clip, so both tones can be told apart.
ff -f lavfi -i "aevalsrc=0.125*sin(2*PI*450*t)|0.125*sin(2*PI*450*t):s=44100" \
  -t 1.5 -c:a pcm_s16le "$out/music-1_5s-450-stereo.wav"
music="$repo/tests/fixtures/projects"
for name in music-loop music-short-error music-with-keep; do
  mkdir -p "$music/$name/assets"
  cp "$out/music-1_5s-450-stereo.wav" "$music/$name/assets/music.wav"
done
cp "$out/clip-2s-1khz-stereo.mp4" "$music/music-with-keep/assets/clip.mp4"

echo "media fixtures written to $out, $unsupported and the media-range-*, background-video*, device-frames* and component-* projects"
