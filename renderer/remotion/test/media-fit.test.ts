// The shared `fit` of picture media (task 033; renderer/remotion/media/fit.ts).
// Image and, later, video use this one mapping, so each fit has one CSS form.
import { describe, expect, it } from "vitest";
import { DEFAULT_FIT, fitStyle } from "../media/fit.js";

describe("media fit", () => {
  it("cover fills the box and may crop", () => {
    expect(fitStyle("cover")).toEqual({
      objectFit: "cover",
      width: "100%",
      height: "100%",
      display: "block",
    });
  });

  it("contain shows the whole picture inside the box", () => {
    expect(fitStyle("contain").objectFit).toBe("contain");
  });

  it("the default is contain, so nothing is cropped unless asked", () => {
    expect(DEFAULT_FIT).toBe("contain");
  });
});
