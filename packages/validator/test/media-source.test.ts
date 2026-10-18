// The source end of a `.video` block (task 039; ADR-0008): without sourceEnd the
// probed duration of the file is written as sourceEndFrames, in source frames at
// the project fps. Authored ends and unprobeable files are left as they are. The
// prober is a stub, so no ffprobe runs.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IrMedia, IrMediaVideo } from "@quarto-video/ir";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MediaProbe, Prober } from "../src/media/probe.js";
import {
  resolveSourceEnds,
  type SourceEndManifest,
} from "../src/stages/media-source.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "video-source-end-"));
  mkdirSync(join(root, "assets"));
  writeFileSync(join(root, "assets", "clip.mp4"), "not really a video");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function probeOf(durationS: number): MediaProbe {
  return {
    kind: "video",
    container: "mov,mp4,m4a,3gp,3g2,mj2",
    durationS,
    width: 640,
    height: 360,
    fps: 30,
    videoCodec: "h264",
    hasAudio: false,
  };
}

function video(overrides: Partial<IrMediaVideo> = {}): IrMediaVideo {
  return {
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
    ...overrides,
  };
}

/** The source end of the first item, which must be a video (an image has none). */
function endOf(media: readonly IrMedia[] | undefined): number | undefined {
  const item = media?.[0];
  if (item === undefined || item.kind === "image")
    throw new Error("expected a video item");
  return item.sourceEndFrames;
}

function manifest(media: IrMedia[]): SourceEndManifest {
  return {
    settings: { fps: 30 },
    scenes: [
      {
        id: "intro",
        component: "statement",
        durationFrames: 60,
        content: { slots: {} },
        source: { file: "index.qmd", line: 3 },
        media,
      },
    ],
  };
}

describe("resolveSourceEnds", () => {
  it("writes the probed end, in source frames, when sourceEnd is absent", () => {
    const stub: Prober = () => ({ ok: true, media: probeOf(2.5) });
    const ir = resolveSourceEnds(manifest([video()]), root, {
      probe: stub,
    });
    expect(endOf(ir.scenes[0]?.media)).toBe(75);
  });

  it("rounds the probed duration to a whole frame, as the range check does", () => {
    const stub: Prober = () => ({ ok: true, media: probeOf(2.01) });
    const ir = resolveSourceEnds(manifest([video()]), root, { probe: stub });
    expect(endOf(ir.scenes[0]?.media)).toBe(60);
  });

  it("keeps an authored sourceEnd and does not probe for it", () => {
    let calls = 0;
    const stub: Prober = () => {
      calls += 1;
      return { ok: true, media: probeOf(9) };
    };
    const ir = resolveSourceEnds(
      manifest([video({ sourceEndFrames: 45 })]),
      root,
      { probe: stub },
    );
    expect(endOf(ir.scenes[0]?.media)).toBe(45);
    expect(calls).toBe(0);
  });

  it("leaves footage that cannot be probed without an end", () => {
    const stub: Prober = () => ({ ok: false, reason: "no streams" });
    const ir = resolveSourceEnds(manifest([video()]), root, { probe: stub });
    expect(endOf(ir.scenes[0]?.media)).toBeUndefined();
  });

  it("does not change the manifest it is given", () => {
    const stub: Prober = () => ({ ok: true, media: probeOf(2) });
    const input = manifest([video()]);
    resolveSourceEnds(input, root, { probe: stub });
    expect(endOf(input.scenes[0]?.media)).toBeUndefined();
  });
});
