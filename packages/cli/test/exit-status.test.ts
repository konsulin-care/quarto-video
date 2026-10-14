import { describe, expect, it } from "vitest";
import type { Diagnostic } from "@quarto-video/validator";
import { exitCodeFor } from "../src/exit-status.js";
import { EXIT_INVALID, EXIT_OK } from "../src/exit-codes.js";

const WARNING: Diagnostic = {
  severity: "warning",
  code: "E_IR_SCHEMA",
  message: "a warning does not fail the command",
};

const ERROR: Diagnostic = {
  severity: "error",
  code: "E_SCENE_NO_DURATION",
  message: 'Scene "scene-001" has no duration attribute.',
};

describe("exit status from diagnostics", () => {
  it("exits 0 when the only diagnostics are warnings", () => {
    expect(exitCodeFor([WARNING, WARNING])).toBe(EXIT_OK);
  });

  it("exits 1 when any diagnostic is an error", () => {
    expect(exitCodeFor([ERROR])).toBe(EXIT_INVALID);
    expect(exitCodeFor([WARNING, ERROR])).toBe(EXIT_INVALID);
  });

  it("exits 0 when there are no diagnostics", () => {
    expect(exitCodeFor([])).toBe(EXIT_OK);
  });
});
