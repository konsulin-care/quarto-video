// The compatibility matrix (compatibility.json, task 049): its pins equal the pins in
// mise.toml and renderer/remotion/package.json, the compatibility doc lists each one,
// and a version outside the matrix gets a warning (matrixWarning, used by `video doctor`).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadMatrix, matrixWarning, MATRIX_DOC } from "../src/compat-matrix.js";

const ROOT = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, ROOT), "utf8");

/** The pins in mise.toml and renderer/remotion/package.json, by matrix tool. */
function pins(): Record<string, string> {
  const mise = read("mise.toml");
  const pick = (pattern: RegExp): string => {
    const match = pattern.exec(mise);
    if (!match?.[1]) throw new Error(`no pin for ${pattern}`);
    return match[1];
  };
  const remotion = JSON.parse(read("renderer/remotion/package.json")) as {
    dependencies: Record<string, string>;
  };
  return {
    node: pick(/^node = "([^"]+)"/m),
    quarto: pick(/"github:quarto-dev\/quarto-cli" = "([^"]+)"/),
    ffprobe: pick(/"conda:ffmpeg" = "([^"]+)"/),
    remotion: remotion.dependencies["@remotion/renderer"] ?? "",
  };
}

describe("compatibility matrix", () => {
  it("lists the pinned Node, Quarto, ffmpeg and Remotion versions", () => {
    const matrix = loadMatrix();
    for (const [tool, pinned] of Object.entries(pins())) {
      expect(matrix[tool as keyof typeof matrix], tool).toEqual([pinned]);
    }
  });

  it("is described by the compatibility guide with every listed version", () => {
    const doc = read(MATRIX_DOC);
    for (const [tool, versions] of Object.entries(loadMatrix())) {
      for (const version of versions ?? []) {
        expect(doc, `${tool} ${version}`).toContain(`\`${version}\``);
      }
    }
  });

  it("accepts a listed version, with or without a leading v", () => {
    expect(matrixWarning("node", "v24.21.0")).toBeNull();
    expect(matrixWarning("quarto", "1.10.19")).toBeNull();
  });

  it("warns about a version outside the matrix and names the guide", () => {
    const warning = matrixWarning("quarto", "1.11.0", { quarto: ["1.10.19"] });
    expect(warning).toMatch(/^1\.11\.0 is outside the compatibility matrix/);
    expect(warning).toContain("supported: 1.10.19");
    expect(warning).toContain(MATRIX_DOC);
  });

  it("does not warn about a tool the matrix does not list", () => {
    expect(matrixWarning("browser", "Chromium 141.0.7390.37")).toBeNull();
  });
});
