// Stage 3 source ranges of `.video` blocks (task 038; PRD §6.2, §8.3; ADR-0008).
// The rules are pure (media-range.ts) and checked here with a probed duration
// given as a number. Then the reference list (assetRefsOf) and the stage
// (checkAssets) with a spy probe: no ffprobe runs.
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { IrVideo } from "@quarto-video/ir";
import { assetRefsOf, checkAssets } from "../src/stages/assets.js";
import {
  videoRangeProblem,
  type VideoRange,
} from "../src/stages/media-range.js";
import type { MediaProbe } from "../src/media/probe.js";

const EXAMPLE = fileURLToPath(
  new URL("../../ir/examples/v1.6.json", import.meta.url),
);
const SCRATCH = mkdtempSync(join(tmpdir(), "media-range-"));
afterAll(() => rmSync(SCRATCH, { recursive: true, force: true }));

/** A 2 s clip at 30 fps, scene of 4 s (120 frames), background, no flags. */
function range(over: Partial<VideoRange> = {}): VideoRange {
  return {
    path: "assets/clip.mp4",
    fps: 30,
    durationFrames: 120,
    sourceStartFrames: 0,
    loop: false,
    freeze: false,
    playbackRate: 1,
    ...over,
  };
}

const CLIP_SECONDS = 2;

describe("source end and start against the probed duration", () => {
  it("rejects a sourceEnd beyond the file with the message that names it", () => {
    const problem = videoRangeProblem(
      range({ sourceEndFrames: 90, loop: true }),
      CLIP_SECONDS,
    );
    expect(problem?.code).toBe("E_MEDIA_RANGE");
    expect(problem?.message).toBe(
      'sourceEnd exceeds the source duration of "assets/clip.mp4".',
    );
    expect(problem?.assetPath).toBe("assets/clip.mp4");
  });

  it("accepts a sourceEnd exactly at the end of the file", () => {
    expect(
      videoRangeProblem(
        range({ sourceEndFrames: 60, loop: true }),
        CLIP_SECONDS,
      ),
    ).toBeNull();
  });

  it("rejects a sourceStart at or after the end of the file when there is no sourceEnd", () => {
    const problem = videoRangeProblem(
      range({ sourceStartFrames: 60, loop: true }),
      CLIP_SECONDS,
    );
    expect(problem?.code).toBe("E_MEDIA_RANGE");
    expect(problem?.message).toBe(
      'sourceStart is at or after the source duration of "assets/clip.mp4".',
    );
  });
});

describe("short source (E_MEDIA_SHORT_SOURCE)", () => {
  it("flags a 2 s source in a 4 s scene with no loop or freeze", () => {
    const problem = videoRangeProblem(range(), CLIP_SECONDS);
    expect(problem?.code).toBe("E_MEDIA_SHORT_SOURCE");
    expect(problem?.message).toBe(
      'The source range of "assets/clip.mp4" is 2.00s, but the scene needs 4.00s of it.',
    );
  });

  it("is valid with loop, and with freeze", () => {
    expect(videoRangeProblem(range({ loop: true }), CLIP_SECONDS)).toBeNull();
    expect(videoRangeProblem(range({ freeze: true }), CLIP_SECONDS)).toBeNull();
  });

  it("never stretches: the flag stays when the range is only inside the file", () => {
    const problem = videoRangeProblem(
      range({ sourceStartFrames: 30, sourceEndFrames: 60 }),
      CLIP_SECONDS,
    );
    expect(problem?.code).toBe("E_MEDIA_SHORT_SOURCE");
  });

  it("counts the playback rate: 2x needs twice the source, 0.5x needs half", () => {
    expect(
      videoRangeProblem(
        range({ durationFrames: 60, playbackRate: 2 }),
        CLIP_SECONDS,
      )?.code,
    ).toBe("E_MEDIA_SHORT_SOURCE");
    expect(
      videoRangeProblem(
        range({ durationFrames: 60, playbackRate: 0.5 }),
        CLIP_SECONDS,
      ),
    ).toBeNull();
  });

  it("is valid when the source range fills the scene exactly", () => {
    expect(
      videoRangeProblem(
        range({ durationFrames: 60, sourceEndFrames: 60 }),
        CLIP_SECONDS,
      ),
    ).toBeNull();
  });
});

describe("the reference list carries each video block's range", () => {
  it("lists the v1.6 example's video with its source frames, timing and rate", () => {
    const ir = JSON.parse(readFileSync(EXAMPLE, "utf8")) as IrVideo;
    const refs = assetRefsOf(ir as Parameters<typeof assetRefsOf>[0]);
    const video = refs.find((ref) => ref.use === "video");
    expect(video).toMatchObject({
      path: "assets/clip.mp4",
      sceneId: "scene-001",
      use: "video",
      range: {
        fps: 30,
        sourceStartFrames: 0,
        sourceEndFrames: 60,
        loop: false,
        freeze: true,
        playbackRate: 1,
      },
    });
  });
});

describe("stage 3 with a spy probe", () => {
  /** A project root with assets/clip.mp4 (the probe is a spy: the file is empty). */
  function project(): string {
    const root = mkdtempSync(join(SCRATCH, "project-"));
    mkdirSync(join(root, "assets"));
    writeFileSync(join(root, "assets", "clip.mp4"), "");
    return root;
  }

  const media: MediaProbe = {
    kind: "video",
    container: "mov,mp4,m4a,3gp,3g2,mj2",
    durationS: CLIP_SECONDS,
    width: 640,
    height: 360,
    fps: 30,
    videoCodec: "h264",
    audioCodec: "aac",
    hasAudio: true,
  };

  /** One scene with one video block: the IR the stage reads (IR 1.6). */
  function refsFor(media: Record<string, unknown>) {
    return assetRefsOf({
      settings: { fps: 30 },
      scenes: [
        {
          id: "scene-001",
          durationFrames: 120,
          source: { file: "index.qmd", line: 3 },
          content: { slots: {} },
          media: [
            {
              type: "video",
              src: "assets/clip.mp4",
              placement: "background",
              fit: "contain",
              sourceStartFrames: 0,
              audio: "mute",
              loop: false,
              freeze: false,
              playbackRate: 1,
              alt: "",
              ...media,
            },
          ],
        },
      ] as never,
    });
  }

  it("reports one diagnostic per block with the scene and line, and probes once", () => {
    const root = project();
    const probe = vi.fn(() => ({ ok: true as const, media }));
    const diagnostics = checkAssets(refsFor({ sourceEndFrames: 90 }), root, {
      probe,
      cacheFile: join(root, "media.json"),
    });
    expect(probe).toHaveBeenCalledTimes(1);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: "E_MEDIA_RANGE",
      file: "index.qmd",
      line: 3,
      sceneId: "scene-001",
      assetPath: "assets/clip.mp4",
    });
  });

  it("passes a valid range and a looped short source with no diagnostic", () => {
    const root = project();
    const probe = vi.fn(() => ({ ok: true as const, media }));
    expect(
      checkAssets(refsFor({ loop: true }), root, {
        probe,
        cacheFile: join(root, "media.json"),
      }),
    ).toEqual([]);
    expect(
      checkAssets(refsFor({ sourceEndFrames: 60 }), root, {
        probe,
        cacheFile: join(root, "media.json"),
      })[0]?.code,
    ).toBe("E_MEDIA_SHORT_SOURCE");
  });
});
