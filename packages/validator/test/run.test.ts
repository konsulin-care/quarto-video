// The stage runner (PRD §9.1): a failing stage stops the run, and the manifest
// check reports IR schema errors before any contract error.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { checkManifest, runStages } from "../src/run.js";
import type { ComponentContract } from "@quarto-video/registry";
import type { Diagnostic } from "../src/index.js";

const EXAMPLES = fileURLToPath(new URL("../../ir/examples/", import.meta.url));

function example(name: string): unknown {
  return JSON.parse(readFileSync(`${EXAMPLES}${name}`, "utf8")) as unknown;
}

const WARNING: Diagnostic = {
  severity: "warning",
  code: "E_SCENE_SHAPE",
  message: "a warning",
};
const ERROR: Diagnostic = {
  ...WARNING,
  severity: "error",
  message: "an error",
};

describe("runStages", () => {
  it("runs every stage while none reports an error, and keeps warnings", () => {
    const second = vi.fn(() => []);
    expect(runStages([() => [WARNING], second])).toEqual([WARNING]);
    expect(second).toHaveBeenCalledOnce();
  });

  it("stops after the first stage that reports an error", () => {
    const later = vi.fn((): Diagnostic[] => [ERROR]);
    expect(runStages([() => [WARNING, ERROR], later])).toEqual([
      WARNING,
      ERROR,
    ]);
    expect(later).not.toHaveBeenCalled();
  });
});

describe("checkManifest", () => {
  it("returns the manifest when every stage passes", () => {
    const check = checkManifest(example("content-nodes.json"), "index.qmd", []);
    expect(check.diagnostics.map((d) => d.code)).toEqual([
      "E_COMPONENT_UNKNOWN",
    ]);
    expect(check.ir).toBeNull();
  });

  it("reports an IR schema error and no contract error", () => {
    const check = checkManifest(
      { schemaVersion: "0.2", type: "video" },
      "m.json",
      [],
    );
    expect(check.ir).toBeNull();
    expect(check.diagnostics.length).toBeGreaterThan(0);
    expect(new Set(check.diagnostics.map((d) => d.code))).toEqual(
      new Set(["E_IR_SCHEMA"]),
    );
    expect(check.diagnostics[0]?.file).toBe("m.json");
  });

  it("rejects IR 0.1 for contract checks, because it has no slots", () => {
    const check = checkManifest(example("minimal.json"), "manifest.json", []);
    expect(check.ir).toBeNull();
    expect(check.diagnostics).toEqual([
      {
        severity: "error",
        code: "E_IR_SCHEMA",
        message:
          '/schemaVersion: must be "0.2" or "0.3" for component contracts (scene slots); got "0.1"',
        file: "manifest.json",
        property: "/schemaVersion",
      },
    ]);
  });

  it("returns the manifest with no diagnostics when the contracts accept it", () => {
    const comparison: ComponentContract = {
      id: "comparison",
      version: "1.0.0",
      purpose: "Test component.",
      slots: {
        default: {
          required: false,
          accepts: ["paragraph", "heading", "list", "code-block"],
        },
        left: {
          required: false,
          accepts: ["paragraph", "heading", "list", "code-block"],
        },
        right: {
          required: false,
          accepts: ["paragraph", "heading", "list", "code-block"],
        },
      },
      props: {},
      placements: [],
      compatibleAnimations: [],
      compatibleTransitions: [],
      duration: { minMs: 1000, maxMs: 60000 },
      accessibility: "Test only.",
    };
    const check = checkManifest(example("content-nodes.json"), "index.qmd", [
      comparison,
    ]);
    expect(check.diagnostics).toEqual([]);
    expect(check.ir).not.toBeNull();
  });
});
