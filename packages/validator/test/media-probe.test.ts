// ffprobe on the generated fixtures (ADR-0008): duration, size, fps, audio
// presence and codecs. A damaged or empty file is a failed result, never a throw.
// Fixtures come from tests/fixtures/media/generate.sh, run before the suite.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseProbe, probeFile, type MediaProbe } from "../src/index.js";

const MEDIA = fileURLToPath(
  new URL("../../../tests/fixtures/media/", import.meta.url),
);
const OUT = join(MEDIA, "out");
const SCRATCH = mkdtempSync(join(tmpdir(), "media-probe-"));

function probed(name: string): MediaProbe {
  const result = probeFile(join(OUT, name));
  if (!result.ok) throw new Error(`probe of ${name} failed: ${result.reason}`);
  return result.media;
}

beforeAll(() => {
  execFileSync("bash", [join(MEDIA, "generate.sh")], { stdio: "ignore" });
}, 120_000); // generate.sh encodes several clips; two suites run it in parallel.

afterAll(() => rmSync(SCRATCH, { recursive: true, force: true }));

describe("probeFile on the media fixtures", () => {
  it("reports a 2 s H.264 MP4 with AAC audio: 640x360, 30 fps, audio present", () => {
    const media = probed("clip-2s-audio.mp4");
    expect(media).toMatchObject({
      kind: "video",
      width: 640,
      height: 360,
      fps: 30,
      videoCodec: "h264",
      audioCodec: "aac",
      hasAudio: true,
    });
    expect(media.durationS).toBeCloseTo(2, 1);
    expect(media.container).toContain("mp4");
  });

  it("reports a 5 s H.264 MP4 without audio: 25 fps, no audio stream", () => {
    const media = probed("clip-5s-silent.mp4");
    expect(media).toMatchObject({ kind: "video", fps: 25, hasAudio: false });
    expect(media.audioCodec).toBeUndefined();
    expect(media.durationS).toBeCloseTo(5, 1);
  });

  it("reports a 2 s VP9 WebM with Opus audio: 24 fps", () => {
    const media = probed("clip-2s.webm");
    expect(media).toMatchObject({
      kind: "video",
      width: 640,
      height: 360,
      fps: 24,
      videoCodec: "vp9",
      audioCodec: "opus",
      hasAudio: true,
    });
    expect(media.durationS).toBeCloseTo(2, 1);
  });

  it("reports a 2 s PCM WAV as audio only, with no video size", () => {
    const media = probed("tone-2s.wav");
    expect(media).toMatchObject({
      kind: "audio",
      audioCodec: "pcm_s16le",
      hasAudio: true,
    });
    expect(media.width).toBeUndefined();
    expect(media.fps).toBeUndefined();
    expect(media.durationS).toBeCloseTo(2, 1);
  });
});

describe("probeFile on damaged files", () => {
  it("returns a failed result for a file that is not media, without its path", () => {
    const file = join(SCRATCH, "broken.mp4");
    writeFileSync(file, "this is not a video");
    const result = probeFile(file);
    expect(result).toEqual({
      ok: false,
      reason: "ffprobe could not read the file",
    });
    expect(JSON.stringify(result)).not.toContain(SCRATCH);
  });

  it("returns a failed result for an empty file", () => {
    const file = join(SCRATCH, "empty.wav");
    writeFileSync(file, "");
    expect(probeFile(file)).toMatchObject({ ok: false });
  });

  it("returns a failed result for a file that does not exist", () => {
    const result = probeFile(join(SCRATCH, "missing.mp4"));
    expect(result).toMatchObject({ ok: false });
  });
});

describe("parseProbe", () => {
  it("fails for output with no streams", () => {
    expect(parseProbe({ format: { duration: "2" }, streams: [] })).toEqual({
      ok: false,
      reason: "it has no video or audio stream",
    });
  });

  it("fails for a stream with no duration", () => {
    expect(
      parseProbe({
        format: {},
        streams: [{ codec_type: "audio", codec_name: "pcm_s16le" }],
      }),
    ).toEqual({ ok: false, reason: "its duration is unknown" });
  });

  it("uses r_frame_rate when avg_frame_rate is 0/0", () => {
    const result = parseProbe({
      format: { duration: "1.5", format_name: "matroska,webm" },
      streams: [
        {
          codec_type: "video",
          codec_name: "vp8",
          width: 320,
          height: 240,
          avg_frame_rate: "0/0",
          r_frame_rate: "30000/1001",
        },
      ],
    });
    expect(result).toMatchObject({ ok: true, media: { fps: 29.97 } });
  });

  it("ignores cover art when it looks for the video stream", () => {
    const result = parseProbe({
      format: { duration: "1" },
      streams: [
        {
          codec_type: "video",
          codec_name: "mjpeg",
          width: 10,
          height: 10,
          disposition: { attached_pic: 1 },
        },
        { codec_type: "audio", codec_name: "mp3" },
      ],
    });
    expect(result).toMatchObject({
      ok: true,
      media: { kind: "audio", audioCodec: "mp3" },
    });
  });
});
