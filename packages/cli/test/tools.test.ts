// Tool detection (packages/cli/src/tools.ts): the order `video doctor` prints,
// and the QV_TEST_MISSING seam that marks a tool absent with its install hint.
import { describe, expect, it } from "vitest";
import { detectTools, TOOL_IDS } from "../src/tools.js";

describe("tool detection", () => {
  it("reports every tool in the documented order", () => {
    const tools = detectTools({ QV_BROWSER_EXECUTABLE: "" });
    expect(tools.map((tool) => tool.tool)).toEqual([...TOOL_IDS]);
  });

  it("marks a tool named in QV_TEST_MISSING as absent, with its install hint", () => {
    const tools = detectTools({
      QV_BROWSER_EXECUTABLE: "",
      QV_TEST_MISSING: "ffprobe",
    });
    const ffprobe = tools.find((tool) => tool.tool === "ffprobe");
    expect(ffprobe?.ok).toBe(false);
    expect(ffprobe?.version).toBeNull();
    expect(ffprobe?.hint).toMatch(
      /^marked missing by QV_TEST_MISSING; install ffmpeg/,
    );
  });

  it("reports an unset browser as missing and says why", () => {
    const browser = detectTools({ QV_BROWSER_EXECUTABLE: "" }).find(
      (tool) => tool.tool === "browser",
    );
    expect(browser?.ok).toBe(false);
    expect(browser?.hint).toMatch(/QV_BROWSER_EXECUTABLE is not set/);
  });
});
