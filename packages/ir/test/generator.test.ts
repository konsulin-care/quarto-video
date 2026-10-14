// The generator versions in every manifest (IR 1.0, ADR-0007) are the versions
// the repository ships: the extension's _extension.yml, the Lua constants the
// filter writes, the CLI package and the renderer's studio preview.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");

const lua = read("_extensions/video/lib/generator.lua");
const extension = lua.match(/M\.extension = "([^"]+)"/)?.[1];
const cli = lua.match(/M\.cli = "([^"]+)"/)?.[1];

describe("generator versions", () => {
  it("match the extension version in _extension.yml", () => {
    expect(read("_extensions/video/_extension.yml")).toMatch(
      new RegExp(`^version: ${extension}$`, "m"),
    );
  });

  it("match the version of the video CLI package", () => {
    const pkg = JSON.parse(read("packages/cli/package.json")) as {
      version: string;
    };
    expect(cli).toBe(pkg.version);
  });

  it("are the values the renderer studio preview records", () => {
    expect(read("renderer/remotion/src/Root.tsx")).toContain(
      `generator: { extension: "${extension}", cli: "${cli}" }`,
    );
  });
});
