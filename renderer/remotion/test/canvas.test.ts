import { describe, expect, it } from "vitest";
import { IrRenderError } from "../src/errors.js";
import { canvasBackground } from "../themes/canvas.js";
import { DEFAULT_THEME_ID, themeTokens } from "../themes/tokens.js";

describe("canvas background", () => {
  it("defaults to the modern theme", () => {
    expect(DEFAULT_THEME_ID).toBe("modern");
  });

  it("is the selected theme's background token when no colour is set", () => {
    const modern = themeTokens("modern");
    expect(canvasBackground(modern)).toBe("#10131C");
    expect(canvasBackground(modern, null)).toBe("#10131C");
  });

  it("is the explicit video.background when one is set", () => {
    expect(canvasBackground(themeTokens("modern"), "#000000")).toBe("#000000");
  });

  it("rejects an explicit colour that is not #RRGGBB", () => {
    expect(() => canvasBackground(themeTokens("modern"), "black")).toThrow(
      IrRenderError,
    );
    expect(() => canvasBackground(themeTokens("modern"), "#FFF")).toThrow(
      'background must be a hex colour like "#10131C", got "#FFF"',
    );
  });
});
