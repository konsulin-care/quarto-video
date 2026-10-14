import { describe, expect, it } from "vitest";
import { PACKAGE_NAME } from "../src/index.js";

describe("@quarto-video/remotion", () => {
  it("exposes its package name", () => {
    expect(PACKAGE_NAME).toBe("@quarto-video/remotion");
  });
});
