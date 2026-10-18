// The guaranteed formats (ADR-0008): extension and codec rules, pure data.
// An unsupported file is E_MEDIA_FORMAT and names the file and the supported list.
import { describe, expect, it } from "vitest";
import {
  codecProblem,
  extensionOf,
  formatProblem,
  type MediaProbe,
} from "../src/index.js";

const video = (overrides: Partial<MediaProbe> = {}): MediaProbe => ({
  kind: "video",
  container: "mov,mp4,m4a,3gp,3g2,mj2",
  durationS: 2,
  width: 640,
  height: 360,
  fps: 30,
  videoCodec: "h264",
  audioCodec: "aac",
  hasAudio: true,
  ...overrides,
});

describe("formatProblem", () => {
  it("accepts the guaranteed image extensions in any letter case", () => {
    expect(formatProblem("image", "assets/a.png")).toBeNull();
    expect(formatProblem("image", "assets/A.JPG")).toBeNull();
    expect(formatProblem("image", "assets/b.jpeg")).toBeNull();
    expect(formatProblem("image", "assets/c.webp")).toBeNull();
    expect(formatProblem("image", "assets/d.svg")).toBeNull();
  });

  it("rejects an AVI as an image and names the file and the supported formats", () => {
    expect(formatProblem("image", "assets/clip.avi")).toEqual({
      ok: false,
      code: "E_MEDIA_FORMAT",
      message:
        'Asset "assets/clip.avi" is a .avi file, which is not a supported image format.',
      suggestion:
        "Supported image formats: .png, .jpg, .jpeg, .webp, .svg. Convert the file to one of them.",
      assetPath: "assets/clip.avi",
    });
  });

  it("rejects a file without an extension", () => {
    expect(formatProblem("video", "assets/clip")).toMatchObject({
      code: "E_MEDIA_FORMAT",
      message:
        'Asset "assets/clip" has no file extension, which is not a supported video format.',
    });
  });

  it("accepts MP4 and WebM for video, and WAV for audio, but not the other way round", () => {
    expect(formatProblem("video", "assets/a.mp4")).toBeNull();
    expect(formatProblem("video", "assets/a.webm")).toBeNull();
    expect(formatProblem("audio", "assets/a.wav")).toBeNull();
    expect(formatProblem("audio", "assets/a.mp4")).toMatchObject({
      code: "E_MEDIA_FORMAT",
    });
    expect(formatProblem("video", "assets/a.wav")).toMatchObject({
      code: "E_MEDIA_FORMAT",
      suggestion: expect.stringContaining(".mp4 (H.264"),
    });
  });

  it("reads the extension after the last dot of the file name only", () => {
    expect(extensionOf("assets/archive.v2/clip.MP4")).toBe(".mp4");
    expect(extensionOf("assets/.hidden")).toBe("");
  });
});

describe("codecProblem", () => {
  it("accepts H.264 video with AAC audio in MP4 and VP9 with Opus in WebM", () => {
    expect(codecProblem("video", "assets/a.mp4", video())).toBeNull();
    expect(
      codecProblem(
        "video",
        "assets/a.webm",
        video({ videoCodec: "vp9", audioCodec: "opus" }),
      ),
    ).toBeNull();
  });

  it("accepts video without audio", () => {
    expect(
      codecProblem("video", "assets/a.mp4", {
        kind: "video",
        container: "mov,mp4,m4a,3gp,3g2,mj2",
        durationS: 2,
        width: 640,
        height: 360,
        fps: 30,
        videoCodec: "h264",
        hasAudio: false,
      }),
    ).toBeNull();
  });

  it("rejects a video codec outside the guaranteed set, naming the codec", () => {
    expect(
      codecProblem("video", "assets/a.mp4", video({ videoCodec: "hevc" })),
    ).toMatchObject({
      code: "E_MEDIA_FORMAT",
      message: 'Asset "assets/a.mp4" has video codec "hevc" in a .mp4 file.',
    });
  });

  it("rejects audio codecs that the container does not guarantee", () => {
    expect(
      codecProblem("video", "assets/a.mp4", video({ audioCodec: "mp3" })),
    ).toMatchObject({
      code: "E_MEDIA_FORMAT",
      message: expect.stringContaining('"mp3"'),
    });
    expect(
      codecProblem(
        "video",
        "assets/a.webm",
        video({ videoCodec: "vp9", audioCodec: "aac" }),
      ),
    ).toMatchObject({ code: "E_MEDIA_FORMAT" });
  });

  it("rejects a video reference whose file has no video stream", () => {
    expect(
      codecProblem("video", "assets/a.mp4", {
        kind: "audio",
        container: "wav",
        durationS: 2,
        audioCodec: "pcm_s16le",
        hasAudio: true,
      }),
    ).toMatchObject({
      code: "E_MEDIA_FORMAT",
      message: 'Asset "assets/a.mp4" has no video stream.',
    });
  });

  it("accepts PCM audio only, and rejects a file with a video stream as audio", () => {
    const wav: MediaProbe = {
      kind: "audio",
      container: "wav",
      durationS: 2,
      audioCodec: "pcm_s16le",
      hasAudio: true,
    };
    expect(codecProblem("audio", "assets/a.wav", wav)).toBeNull();
    expect(
      codecProblem("audio", "assets/a.wav", { ...wav, audioCodec: "mp3" }),
    ).toMatchObject({ code: "E_MEDIA_FORMAT" });
    expect(
      codecProblem("audio", "assets/a.wav", { ...wav, videoCodec: "h264" }),
    ).toMatchObject({ code: "E_MEDIA_FORMAT" });
  });
});
