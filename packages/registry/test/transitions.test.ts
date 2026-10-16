// The transition registry file (PRD §5.6; ADR-0005): the shipped names and
// each rule that rejects a bad file.
import { describe, expect, it } from "vitest";
import {
  listTransitions,
  parseTransitions,
  RegistryError,
} from "../src/index.js";

const text = (value: unknown): string => JSON.stringify(value);

describe("transition registry", () => {
  it("lists cut, fade, slide, wipe and zoom, sorted", () => {
    expect(listTransitions()).toEqual(["cut", "fade", "slide", "wipe", "zoom"]);
  });

  it("accepts a sorted or unsorted list and returns it sorted", () => {
    expect(
      parseTransitions(text({ transitions: ["fade", "cut"] }), "t.json"),
    ).toEqual(["cut", "fade"]);
  });

  it.each([
    ["not JSON", "{", "not valid JSON"],
    ["no list", text({}), '"transitions" must be a non-empty list'],
    [
      "an empty list",
      text({ transitions: [] }),
      '"transitions" must be a non-empty list',
    ],
    [
      "an uppercase name",
      text({ transitions: ["cut", "Fade"] }),
      '"Fade" is not a transition name',
    ],
    [
      "a name with a space",
      text({ transitions: ["cut", "a b"] }),
      '"a b" is not a transition name',
    ],
    [
      "a duplicate",
      text({ transitions: ["cut", "cut"] }),
      'transition "cut" is listed twice',
    ],
    ["no cut", text({ transitions: ["fade"] }), '"cut" must be listed'],
  ])("rejects %s", (_label, file, message) => {
    expect(() => parseTransitions(file, "t.json")).toThrow(RegistryError);
    expect(() => parseTransitions(file, "t.json")).toThrow(message);
  });
});
