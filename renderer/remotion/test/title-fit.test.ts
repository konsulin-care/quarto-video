// The title's size range is the one its contract declares (task 026). The
// renderer cannot import the registry index (node:fs), so it keeps TEXT_FIT and
// this test checks it against title.json.
import { describe, expect, it } from "vitest";
import { listComponents } from "@quarto-video/registry";
import { TEXT_FIT } from "../components/title/Title.js";

describe("title text fit", () => {
  it("matches the textFit of its contract", () => {
    const contract = listComponents().find((c) => c.id === "title");
    expect(contract?.textFit).toEqual(TEXT_FIT);
  });
});
