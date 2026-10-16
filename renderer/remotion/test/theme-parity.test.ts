// Parity between the registry's themes and the renderer (packages/registry):
// every registry theme can be drawn, and every font file a theme names is
// bundled in themes/fonts/ (committed, so rendering needs no network).
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { listThemes } from "@quarto-video/registry";
import { FONT_FILES } from "../themes/fonts.js";
import { themeIds, themeTokens } from "../themes/tokens.js";

describe("registry and renderer themes", () => {
  it("draws exactly the theme ids the registry declares", () => {
    const registryIds = listThemes().map((theme) => theme.id);
    expect(themeIds()).toEqual([...registryIds].sort());
  });

  it("gives the renderer the same tokens the registry declares", () => {
    for (const theme of listThemes()) {
      expect(themeTokens(theme.id)).toEqual(theme);
    }
  });

  it("bundles a local file for every weight of every theme font", () => {
    for (const theme of listThemes()) {
      const family = theme.typography.fontFamily;
      const files = FONT_FILES[family];
      expect(files, `family ${family}`).toBeDefined();
      for (const weight of Object.values(theme.typography.weights)) {
        const url = files?.[weight];
        expect(url, `${family} ${weight}`).toBeDefined();
        expect(url?.startsWith("file:")).toBe(true);
        expect(existsSync(fileURLToPath(url ?? ""))).toBe(true);
      }
    }
  });

  it("commits the font licence next to the font files", () => {
    const licence = fileURLToPath(
      new URL("../themes/fonts/LICENSE", import.meta.url),
    );
    expect(existsSync(licence)).toBe(true);
  });
});
