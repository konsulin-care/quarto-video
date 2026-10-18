// The filter decides an image by its extension (lib/media_kind.lua); the validator
// checks the format by the same list (ADR-0008, media/formats.ts). This test keeps
// the two lists equal, so an image the filter writes is one the validator accepts.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FORMATS } from "../src/media/formats.js";

const LUA = fileURLToPath(
  new URL("../../../_extensions/video/lib/media_kind.lua", import.meta.url),
);

describe("image extensions", () => {
  it("the filter's list equals the validator's image formats (ADR-0008, ADR-0018)", () => {
    const body =
      readFileSync(LUA, "utf8").match(/IMAGE_EXTENSIONS = \{([^}]*)\}/)?.[1] ??
      "";
    const fromLua = [...body.matchAll(/\["(\.[a-z]+)"\]/g)]
      .map((m) => m[1])
      .sort();
    expect(fromLua).toEqual([...FORMATS.image].sort());
  });
});
