// The version gate in the stage runner (ADR-0007): an unsupported schemaVersion
// is E_IR_UNSUPPORTED_VERSION at /schemaVersion and stops the run; IR 1.0 gets
// the same stage 2 and stage 4 checks as 0.3.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkManifest } from "../src/run.js";

const v1 = JSON.parse(
  readFileSync(new URL("../../ir/examples/v1.json", import.meta.url), "utf8"),
) as Record<string, unknown>;

describe("manifest version gate", () => {
  it("accepts examples/v1.json with no diagnostics", () => {
    const check = checkManifest(v1, "index.qmd");
    expect(check.diagnostics).toEqual([]);
    expect(check.ir?.schemaVersion).toBe("1.0");
  });

  it("reports schemaVersion 2.0 as E_IR_UNSUPPORTED_VERSION and runs no later stage", () => {
    const check = checkManifest({ ...v1, schemaVersion: "2.0" }, "index.qmd");
    expect(check.ir).toBeNull();
    expect(check.diagnostics).toEqual([
      {
        severity: "error",
        code: "E_IR_UNSUPPORTED_VERSION",
        message:
          '/schemaVersion: "2.0" is not a supported IR version; supported versions: 0.1, 0.2, 0.3, 1.0',
        file: "index.qmd",
        property: "/schemaVersion",
      },
    ]);
  });

  it("checks the timeline of a 1.0 manifest (stage 4)", () => {
    const scenes = (v1["timeline"] as { scenes: { startFrame: number }[] })
      .scenes;
    scenes[1]!.startFrame += 1;
    const codes = checkManifest(v1, "index.qmd").diagnostics.map((d) => d.code);
    expect(codes).toEqual(["E_TIMELINE_MISMATCH"]);
  });
});
