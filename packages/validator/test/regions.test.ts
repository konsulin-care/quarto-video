// Stage 2 region checks of split-screen (task 043; ADR-0016): the region count,
// the names of footage regions, and text and footage in one region. Each rule
// runs against the shipped split-screen contract. Stage 3 checks each region's
// video on its own (media-range tests).
import type { IrMedia } from "@quarto-video/ir";
import { getComponent } from "@quarto-video/registry";
import { describe, expect, it } from "vitest";
import { checkMediaPlacement } from "../src/stages/media-placement.js";
import { checkRegions } from "../src/stages/regions.js";
import type { SceneWithMedia } from "../src/stages/media-placement.js";

const SPLIT = getComponent("split-screen");
const STATEMENT = getComponent("statement");

type Blocks = SceneWithMedia["content"]["slots"];

const text = (value: string) => [
  {
    type: "paragraph" as const,
    inlines: [{ type: "text" as const, text: value }],
  },
];

function footage(region: string): IrMedia {
  return {
    type: "video",
    src: `assets/${region}.mp4`,
    placement: "region",
    region,
    fit: "cover",
    sourceStartFrames: 0,
    audio: "mute",
    loop: false,
    freeze: false,
    playbackRate: 1,
    alt: "",
  };
}

/** A split-screen scene from its text slots and footage regions. */
function scene(slots: Blocks, media: IrMedia[] = []): SceneWithMedia {
  return {
    id: "scene-001",
    component: "split-screen",
    durationFrames: 90,
    content: { slots },
    source: { file: "index.qmd", line: 4 },
    media,
  };
}

/** The codes and messages of the region checks, for one scene. */
function run(s: SceneWithMedia) {
  return checkRegions({ scenes: [s] }, [SPLIT]);
}

describe("split-screen region count", () => {
  it("accepts two regions of text, and two of footage", () => {
    expect(run(scene({ left: text("A"), right: text("B") }))).toEqual([]);
    expect(run(scene({}, [footage("left"), footage("right")]))).toEqual([]);
  });

  it("accepts three regions, mixing text and footage", () => {
    const s = scene({ middle: text("Mid") }, [
      footage("left"),
      footage("right"),
    ]);
    expect(run(s)).toEqual([]);
  });

  it("rejects one region with the limit and the count", () => {
    const [diagnostic] = run(scene({ left: text("A") }));
    expect(diagnostic?.code).toBe("E_REGION_COUNT");
    expect(diagnostic?.message).toBe(
      'Component "split-screen" takes 2 to 3 regions; this scene uses 1 (left).',
    );
    expect(diagnostic?.line).toBe(4);
  });

  it("rejects a scene with no region, naming none", () => {
    const [diagnostic] = run(scene({}));
    expect(diagnostic?.code).toBe("E_REGION_COUNT");
    expect(diagnostic?.message).toContain("this scene uses 0.");
  });

  it("rejects four regions with the limit, and names the slot that is not a region", () => {
    const found = run(
      scene({
        left: text("A"),
        middle: text("B"),
        right: text("C"),
        top: text("D"),
      }),
    );
    expect(found.map((d) => d.code)).toEqual(["E_REGION_COUNT"]);
    expect(found[0]?.message).toContain(
      "takes 2 to 3 regions; this scene uses 4",
    );
  });
});

describe("split-screen region names and content", () => {
  it("rejects footage in a region the component does not have, listing its regions", () => {
    const found = run(
      scene({ left: text("A") }, [footage("left"), footage("top")]),
    );
    const unknown = found.find((d) => d.code === "E_SLOT_UNKNOWN");
    expect(unknown?.message).toContain(
      'region "top", which "split-screen" does not have',
    );
    expect(unknown?.suggestion).toBe(
      'The regions of "split-screen" are: left, middle, right.',
    );
  });

  it("rejects text and footage in one region", () => {
    const found = run(
      scene({ right: text("B") }, [footage("left"), footage("right")]),
    );
    expect(found.map((d) => d.code)).toEqual(["E_SLOT_CONSTRAINT"]);
    expect(found[0]?.message).toBe(
      'Scene puts both text and footage in region "right".',
    );
    expect(found[0]?.property).toBe("slots/right");
  });

  it("does not check components without regions", () => {
    expect(
      checkRegions({ scenes: [{ ...scene({}), component: "statement" }] }, [
        STATEMENT,
      ]),
    ).toEqual([]);
  });

  it("rejects region footage on a component that takes no regions (E_MEDIA_PLACEMENT)", () => {
    const found = checkMediaPlacement(
      {
        scenes: [
          {
            ...scene({ left: text("A") }, [footage("left")]),
            component: "statement",
          },
        ],
      },
      [STATEMENT],
    );
    expect(found.map((d) => d.code)).toEqual(["E_MEDIA_PLACEMENT"]);
  });
});
