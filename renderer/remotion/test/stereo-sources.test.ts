// Mono sound sources (task 044 follow-up; ADR-0009): which files are played from a
// stereo copy, the ffmpeg pan that makes it, and the map the components read. Pure:
// no ffmpeg and no browser; the level itself is measured in tests/integration.
import type { IrVideo } from "@quarto-video/ir";
import { describe, expect, it } from "vitest";
import { audioSourceOf } from "../media/audio-source.js";
import {
  soundSourcesOf,
  stereoArgs,
  stereoFileName,
} from "../src/stereo-sources.js";

function media(src: string, audio: "keep" | "mute") {
  return {
    type: "video",
    src,
    placement: "background",
    fit: "contain",
    sourceStartFrames: 0,
    audio,
    ...(audio === "keep" ? { volume: 1 } : {}),
    loop: false,
    freeze: false,
    playbackRate: 1,
    alt: "",
  };
}

function scene(items: ReturnType<typeof media>[]) {
  return {
    id: "scene-001",
    component: "statement",
    durationFrames: 30,
    content: { slots: {} },
    source: { file: "index.qmd" },
    media: items,
  };
}

describe("soundSourcesOf", () => {
  it("lists each kept clip and the music track once, and no muted clip", () => {
    const ir = {
      scenes: [
        scene([
          media("assets/a.mp4", "keep"),
          media("assets/mute.mp4", "mute"),
        ]),
        scene([media("assets/a.mp4", "keep")]),
      ],
      music: { src: "assets/music.wav", volume: 1, loop: false },
    } as unknown as IrVideo;
    expect(soundSourcesOf(ir)).toEqual(["assets/a.mp4", "assets/music.wav"]);
  });

  it("is empty when nothing is kept and there is no music", () => {
    const ir = {
      scenes: [scene([media("assets/mute.mp4", "mute")])],
    } as unknown as IrVideo;
    expect(soundSourcesOf(ir)).toEqual([]);
  });
});

describe("stereoArgs", () => {
  it("maps the first audio stream through a pan that puts channel 0 on both outputs", () => {
    const args = stereoArgs("/p/assets/tone.mp4", "/p/.video-build/x.wav");
    expect(args).toContain("pan=stereo|c0=c0|c1=c0");
    expect(args).toEqual(expect.arrayContaining(["-map", "0:a:0"]));
    expect(args.at(-1)).toBe("/p/.video-build/x.wav");
  });
});

describe("stereoFileName", () => {
  it("is stable for one source and differs between sources", () => {
    expect(stereoFileName("assets/a.mp4")).toBe(stereoFileName("assets/a.mp4"));
    expect(stereoFileName("assets/a.mp4")).not.toBe(
      stereoFileName("assets/b.mp4"),
    );
    expect(stereoFileName("assets/a.mp4")).toMatch(/^[0-9a-f]{16}\.wav$/);
  });
});

describe("audioSourceOf", () => {
  it("reads a mapped source from its copy and any other from the project file", () => {
    const sources = { "assets/mono.mp4": ".video-build/audio-stereo/x.wav" };
    expect(audioSourceOf("assets/mono.mp4", sources)).toBe(
      ".video-build/audio-stereo/x.wav",
    );
    expect(audioSourceOf("assets/stereo.mp4", sources)).toBe(
      "assets/stereo.mp4",
    );
    expect(audioSourceOf("assets/mono.mp4", undefined)).toBe("assets/mono.mp4");
  });
});
