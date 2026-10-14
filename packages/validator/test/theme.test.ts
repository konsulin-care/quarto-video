// Theme resolution: an unknown theme is E_THEME_UNKNOWN naming the available
// themes; an omitted theme means the default (PRD §5.2).
import { describe, expect, it } from "vitest";
import { getTheme, type ThemeTokens } from "@quarto-video/registry";
import { checkTheme } from "../src/stages/theme.js";

const MODERN = getTheme("modern");
const OTHER: ThemeTokens = { ...getTheme("modern"), id: "classic" };

describe("checkTheme", () => {
  it("resolves the named theme with no diagnostics", () => {
    const check = checkTheme("modern", "index.qmd");
    expect(check.diagnostics).toEqual([]);
    expect(check.theme?.id).toBe("modern");
  });

  it("uses the default theme when front matter names none", () => {
    const check = checkTheme(null, "index.qmd");
    expect(check.diagnostics).toEqual([]);
    expect(check.theme?.id).toBe("modern");
  });

  it("rejects an unknown theme with E_THEME_UNKNOWN listing the available themes", () => {
    const check = checkTheme("retro", "index.qmd", [MODERN, OTHER]);
    expect(check.theme).toBeNull();
    expect(check.diagnostics).toEqual([
      {
        severity: "error",
        code: "E_THEME_UNKNOWN",
        message: 'Unknown theme "retro".',
        file: "index.qmd",
        property: "theme",
        suggestion: "Available themes: modern, classic.",
      },
    ]);
  });

  it("names the default as available when the registry has only it", () => {
    const check = checkTheme("retro", "index.qmd", [MODERN]);
    expect(check.diagnostics[0]?.suggestion).toBe("Available themes: modern.");
  });
});
