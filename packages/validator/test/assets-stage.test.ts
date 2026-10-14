// Stage 3 (ADR-0006): diagnostics name the asset path and the scene, never an
// absolute path, and the stage runner checks assets only when they are given.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkManifest } from "../src/run.js";
import { checkAssets } from "../src/stages/assets.js";

const FIXTURE = fileURLToPath(
  new URL("../../../tests/fixtures/projects/assets-names", import.meta.url),
);
const EXAMPLES = fileURLToPath(new URL("../../ir/examples/", import.meta.url));

function example(name: string): unknown {
  return JSON.parse(readFileSync(`${EXAMPLES}${name}`, "utf8")) as unknown;
}

describe("checkAssets", () => {
  it("reports a missing file with its path, scene and line", () => {
    const [diagnostic] = checkAssets(
      [
        {
          path: "assets/demo.png",
          sceneId: "scene-001",
          file: "index.qmd",
          line: 3,
        },
      ],
      FIXTURE,
    );
    expect(diagnostic).toEqual({
      severity: "error",
      code: "E_ASSET_MISSING",
      message:
        'Asset "assets/demo.png" was not found.\nReferenced by scene "scene-001".',
      file: "index.qmd",
      line: 3,
      sceneId: "scene-001",
      assetPath: "assets/demo.png",
      suggestion:
        "Check the spelling and letter case of the path, or add the file to the project.",
    });
  });

  it("reports an escape with the author's path and no absolute path", () => {
    const [diagnostic] = checkAssets(
      [{ path: "../../secret.png", sceneId: "scene-002", file: "index.qmd" }],
      FIXTURE,
    );
    expect(diagnostic).toMatchObject({
      code: "E_ASSET_ESCAPE",
      assetPath: "../../secret.png",
      sceneId: "scene-002",
    });
    expect(diagnostic).not.toHaveProperty("line");
    expect(JSON.stringify(diagnostic)).not.toContain(FIXTURE);
  });

  it("omits the path of an absolute reference, which is outside the project", () => {
    const [diagnostic] = checkAssets(
      [{ path: "/etc/passwd", sceneId: "scene-003", file: "index.qmd" }],
      FIXTURE,
    );
    expect(diagnostic).toMatchObject({ code: "E_ASSET_ABSOLUTE" });
    expect(diagnostic).not.toHaveProperty("assetPath");
    expect(JSON.stringify(diagnostic)).not.toContain("/etc/passwd");
  });

  it("returns nothing for references that resolve, in input order", () => {
    const diagnostics = checkAssets(
      [
        { path: "assets/x.png", sceneId: "scene-001", file: "index.qmd" },
        { path: "assets/gone.png", sceneId: "scene-002", file: "index.qmd" },
        {
          path: "https://example.com/a.png",
          sceneId: "scene-003",
          file: "index.qmd",
        },
      ],
      FIXTURE,
    );
    expect(diagnostics.map((d) => d.code)).toEqual([
      "E_ASSET_MISSING",
      "E_ASSET_URL",
    ]);
    expect(diagnostics.map((d) => d.sceneId)).toEqual([
      "scene-002",
      "scene-003",
    ]);
  });
});

describe("stage 3 in the runner", () => {
  const missing = {
    root: FIXTURE,
    refs: [
      { path: "assets/demo.png", sceneId: "scene-001", file: "index.qmd" },
    ],
  };

  it("runs when asset references are given, and stops the run", () => {
    const result = checkManifest(
      example("timeline.json"),
      "index.qmd",
      undefined,
      undefined,
      missing,
    );
    expect(result.ir).toBeNull();
    expect(result.diagnostics.map((d) => d.code)).toEqual(["E_ASSET_MISSING"]);
  });

  it("is skipped when no asset references are given", () => {
    const result = checkManifest(example("timeline.json"), "index.qmd");
    expect(result.diagnostics).toEqual([]);
    expect(result.ir).not.toBeNull();
  });

  it("passes a valid manifest when every reference resolves", () => {
    const result = checkManifest(
      example("timeline.json"),
      "index.qmd",
      undefined,
      undefined,
      {
        root: FIXTURE,
        refs: [
          { path: "./assets/x.png", sceneId: "scene-001", file: "index.qmd" },
        ],
      },
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.ir).not.toBeNull();
  });
});
