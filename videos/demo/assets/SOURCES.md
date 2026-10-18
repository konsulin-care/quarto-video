# Sources of the acceptance demo assets (task 047)

No asset comes from the internet or from a third party. Every media file is
generated locally with FFmpeg 6.1 (built-in `lavfi` sources) and is covered by
the repository licence (`LICENSE`, MIT). The sizes are the committed sizes.

| File | What it is | How it was made | Licence |
| --- | --- | --- | --- |
| `background.mp4` (44 KB) | 6 s, 1280x720, 30 fps, H.264, no audio; the title scene's background | `ffmpeg -f lavfi -i "gradients=s=1280x720:rate=30:duration=6" -an -c:v libx264 -crf 32 -preset slow -pix_fmt yuv420p background.mp4` | MIT (this repo) |
| `product.mp4` (296 KB) | 6 s, 960x540, 30 fps, H.264, no audio; the browser-frame footage | `ffmpeg -f lavfi -i "testsrc2=size=960x540:rate=30:duration=6" -an -c:v libx264 -crf 36 -preset slow -pix_fmt yuv420p product.mp4` | MIT (this repo) |
| `left.mp4` (56 KB) | 6 s, 960x1080, 30 fps, H.264, no audio; the split-screen left region | `ffmpeg -f lavfi -i "testsrc=size=960x1080:rate=30:duration=6" -an -c:v libx264 -crf 32 -preset slow -pix_fmt yuv420p left.mp4` | MIT (this repo) |
| `music.wav` (692 KB) | 8 s, mono, 44.1 kHz, 16-bit PCM; a looping chord (220, 277.18 and 329.63 Hz) with a sin-squared envelope that is zero at both ends, so the loop does not click | `ffmpeg -f lavfi -i "aevalsrc=exprs='0.15*(sin(2*PI*220*t)+sin(2*PI*277.18*t)+sin(2*PI*329.63*t))*sin(PI*t/8)^2':s=44100:d=8" -ac 1 -c:a pcm_s16le music.wav` | MIT (this repo) |
| `captions.vtt` | WebVTT cues written by hand for the scenes (no transcript of any recording) | Typed by hand; cue times were set from `video validate --print-ir` scene starts | MIT (this repo) |

`../data/build-stages.csv` holds four illustrative stage durations typed by
hand. They are not a measurement, and the chart is titled "(illustrative)".

The FFmpeg commands were run from `videos/demo/assets/`; re-running them
reproduces the same file types and durations (the bytes may differ between
encoder builds).
