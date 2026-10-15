// The statement's size range is the one its contract declares (task 025). The
// renderer cannot import the registry index (node:fs), so it keeps TEXT_FIT and
// this test checks it against statement.json.
import { describe, expect, it } from "vitest";
import { listComponents } from "@quarto-video/registry";
import { TEXT_FIT } from "../components/statement/Statement.js";

describe("statement text fit", () => {
  it("matches the textFit of its contract", () => {
    const contract = listComponents().find((c) => c.id === "statement");
    expect(contract?.textFit).toEqual(TEXT_FIT);
  });
});
