import { describe, expect, it } from "vitest";
import {
  formatHuman,
  formatJson,
  hasErrors,
  parseDiagnostics,
  type Diagnostic,
} from "../src/index.js";

const NO_COMPONENT: Diagnostic = {
  severity: "error",
  code: "E_SCENE_NO_COMPONENT",
  message: 'Scene "scene-002" has no component attribute.',
  file: "index.qmd",
  sceneId: "scene-002",
  property: "component",
  suggestion: 'Add component="<name>"',
};

const SLOW_DOWN: Diagnostic = {
  severity: "warning",
  code: "E_IR_SCHEMA",
  message: "a warning uses the same shape",
  file: "index.qmd",
};

describe("human format (PRD §9.2)", () => {
  it("prints an error as header, message and suggestion", () => {
    expect(formatHuman([NO_COMPONENT])).toBe(
      'ERROR index.qmd\nScene "scene-002" has no component attribute.\nAdd component="<name>"\n',
    );
  });

  it("prints a warning with the WARNING label and no suggestion", () => {
    expect(formatHuman([SLOW_DOWN])).toBe(
      "WARNING index.qmd\na warning uses the same shape\n",
    );
  });

  it("separates blocks with one blank line and keeps the order", () => {
    expect(formatHuman([NO_COMPONENT, SLOW_DOWN])).toBe(
      'ERROR index.qmd\nScene "scene-002" has no component attribute.\nAdd component="<name>"\n\nWARNING index.qmd\na warning uses the same shape\n',
    );
  });

  it("omits the location when the file is unknown", () => {
    const bare: Diagnostic = {
      severity: "error",
      code: "E_FILTER_FAILED",
      message: "the filter stopped",
    };
    expect(formatHuman([bare])).toBe("ERROR\nthe filter stopped\n");
  });

  it("prints the line after the file when a line is known", () => {
    const located = { ...NO_COMPONENT, line: 18 };
    expect(formatHuman([located]).split("\n")[0]).toBe("ERROR index.qmd:18");
  });

  it("prints nothing for an empty list", () => {
    expect(formatHuman([])).toBe("");
  });
});

describe("JSON format (--json)", () => {
  it("is a JSON array that parses back to the same diagnostics", () => {
    const text = formatJson([NO_COMPONENT, SLOW_DOWN]);
    expect(text.endsWith("\n")).toBe(true);
    expect(parseDiagnostics(text)).toEqual([NO_COMPONENT, SLOW_DOWN]);
  });

  it("prints [] for no diagnostics, and that validates", () => {
    expect(formatJson([])).toBe("[]\n");
    expect(parseDiagnostics("[]\n")).toEqual([]);
  });
});

describe("exit status predicate", () => {
  it("reports no errors when only warnings are present", () => {
    expect(hasErrors([SLOW_DOWN])).toBe(false);
    expect(hasErrors([])).toBe(false);
  });

  it("reports errors when any error is present", () => {
    expect(hasErrors([SLOW_DOWN, NO_COMPONENT])).toBe(true);
  });
});
