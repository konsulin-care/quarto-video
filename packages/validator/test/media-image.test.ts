// Framed image footage in stage 3 (IR 1.10, ADR-0018; ADR-0008): an image is an
// existing file of a guaranteed image format. It is never probed and has no source
// range, so no E_MEDIA_RANGE or E_MEDIA_SHORT_SOURCE applies to it.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IrMedia } from "@quarto-video/ir";
import { afterAll, describe, expect, it } from "vitest";
import type { Prober } from "../src/media/probe.js";
import { checkManifest } from "../src/run.js";
import { assetRefsOf, checkAssets } from "../src/stages/assets.js";
import { resolveSourceEnds } from "../src/stages/media-source.js";

const ROOT = mkdtempSync(join(tmpdir(), "validator-image-"));
mkdirSync(join(ROOT, "assets"), { recursive: true });
// Existence and extension are what stage 3 reads for an image; the bytes are not decoded.
writeFileSync(join(ROOT, "assets", "still.png"), "still");
writeFileSync(join(ROOT, "assets", "photo.svg"), "<svg/>");
writeFileSync(join(ROOT, "assets", "still.bmp"), "bitmap");
afterAll(() => rmSync(ROOT, { recursive: true, force: true }));

/** A probe that must never run: images are not probed (ADR-0018). */
const neverProbe: Prober = () => {
  throw new Error("an image was probed");
};

function image(src: string): IrMedia {
  return {
    type: "video",
    kind: "image",
    src,
    placement: "framed",
    fit: "cover",
    frame: "browser",
    alt: "",
  };
}

function irOf(media: IrMedia[]) {
  return {
    settings: { fps: 30 },
    scenes: [
      {
        id: "scene-001",
        component: "product-demo",
        durationFrames: 60,
        source: { file: "index.qmd", line: 4 },
        content: { slots: {} },
        media,
      },
    ],
  };
}

describe("framed image footage (stage 3)", () => {
  it("an image reference is an image with no source range or keep flag", () => {
    const [ref] = assetRefsOf(irOf([image("assets/still.png")]));
    expect(ref).toEqual({
      path: "assets/still.png",
      use: "image",
      sceneId: "scene-001",
      file: "index.qmd",
      line: 4,
    });
  });

  it("an existing image of a guaranteed format passes without a probe", () => {
    const refs = assetRefsOf(
      irOf([image("assets/still.png"), image("assets/photo.svg")]),
    );
    expect(checkAssets(refs, ROOT, { probe: neverProbe })).toEqual([]);
  });

  it("a missing image is E_ASSET_MISSING naming the scene", () => {
    const [diagnostic] = checkAssets(
      assetRefsOf(irOf([image("assets/missing.png")])),
      ROOT,
      { probe: neverProbe },
    );
    expect(diagnostic).toMatchObject({
      code: "E_ASSET_MISSING",
      sceneId: "scene-001",
      assetPath: "assets/missing.png",
    });
  });

  it("an image in a format outside ADR-0008 is E_MEDIA_FORMAT listing the image formats", () => {
    const [diagnostic] = checkAssets(
      assetRefsOf(irOf([image("assets/still.bmp")])),
      ROOT,
      { probe: neverProbe },
    );
    expect(diagnostic?.code).toBe("E_MEDIA_FORMAT");
    expect(diagnostic?.suggestion).toContain(".png, .jpg, .jpeg, .webp, .svg");
  });

  it("an image is not probed for its source end", () => {
    const ir = irOf([image("assets/still.png")]);
    const resolved = resolveSourceEnds(ir, ROOT, { probe: neverProbe });
    expect(resolved.scenes[0]?.media).toEqual([image("assets/still.png")]);
  });

  it("a manifest with a framed image passes every stage", () => {
    const manifest = {
      schemaVersion: "1.10",
      type: "video",
      settings: { width: 640, height: 360, fps: 30, background: "#10131C" },
      scenes: [
        {
          id: "scene-001",
          component: "product-demo",
          durationFrames: 60,
          content: {
            slots: {
              caption: [
                {
                  type: "paragraph",
                  inlines: [{ type: "text", text: "A still" }],
                },
              ],
            },
          },
          source: { file: "index.qmd", line: 3 },
          media: [image("assets/still.png")],
        },
      ],
      timeline: {
        durationFrames: 60,
        scenes: [{ id: "scene-001", startFrame: 0 }],
      },
      generator: { extension: "0.1.0", cli: "0.0.0" },
    };
    const result = checkManifest(manifest, "index.qmd", undefined, undefined, {
      root: ROOT,
      media: { probe: neverProbe },
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.ir).not.toBeNull();
  });
});
