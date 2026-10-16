import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "../src/contrast.js";
import {
  DEFAULT_THEME,
  getTheme,
  listThemes,
  parseTheme,
  RegistryError,
} from "../src/index.js";

const MODERN_FILE = fileURLToPath(
  new URL("../themes/modern.json", import.meta.url),
);
const MODERN_TEXT = readFileSync(MODERN_FILE, "utf8");

/** A valid modern theme as an object; tests change one field at a time. */
function theme(): Record<string, unknown> {
  return JSON.parse(MODERN_TEXT) as Record<string, unknown>;
}

function parse(value: unknown, file = "modern.json"): void {
  parseTheme(JSON.stringify(value), file);
}

describe("contrast ratio", () => {
  it("is 21 for black on white and 1 for a colour on itself", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#7AA2FF", "#7AA2FF")).toBeCloseTo(1, 5);
  });

  it("does not depend on the order of the two colours", () => {
    expect(contrastRatio("#10131C", "#F5F7FA")).toBe(
      contrastRatio("#F5F7FA", "#10131C"),
    );
  });
});

describe("modern theme", () => {
  it("validates against theme.json and is the default theme", () => {
    expect(DEFAULT_THEME).toBe("modern");
    expect(getTheme("modern").id).toBe("modern");
  });

  it("meets WCAG AA (4.5:1) for every declared text/background pair", () => {
    const tokens = getTheme("modern");
    expect(tokens.contrastPairs.length).toBeGreaterThan(0);
    for (const pair of tokens.contrastPairs) {
      const ratio = contrastRatio(
        tokens.colors[pair.text],
        tokens.colors[pair.background],
      );
      expect(
        ratio,
        `${pair.text} on ${pair.background}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("lists every theme sorted, and returns copies", () => {
    const list = listThemes();
    expect(list.map((t) => t.id)).toEqual(["modern"]);
    list[0]!.colors.text = "#000000";
    expect(getTheme("modern").colors.text).toBe("#F5F7FA");
  });

  it("names the known themes when asked for an unknown one", () => {
    expect(() => getTheme("retro")).toThrow(RegistryError);
    expect(() => getTheme("retro")).toThrow(
      'unknown theme "retro" (known: modern)',
    );
  });
});

describe("theme file rules", () => {
  it("rejects a text pair below 4.5:1 and names the pair", () => {
    const value = theme();
    (value["colors"] as Record<string, string>)["mutedText"] = "#4A4F5C";
    expect(() => parse(value)).toThrow(
      /modern\.json: \/contrastPairs\/2: mutedText on background is \d\.\d\d:1, below 4\.5:1/,
    );
  });

  it("rejects an unknown field", () => {
    const value = theme();
    value["shadow"] = "soft";
    expect(() => parse(value)).toThrow('"shadow"');
  });

  it("rejects a colour that is not #RRGGBB", () => {
    const value = theme();
    (value["colors"] as Record<string, string>)["text"] = "white";
    expect(() => parse(value)).toThrow("/colors/text");
  });

  it("rejects a missing token group", () => {
    const value = theme();
    delete value["motion"];
    expect(() => parse(value)).toThrow("must have required property 'motion'");
  });

  it("rejects a font size outside the allowed range", () => {
    const value = theme();
    (value["typography"] as { scale: Record<string, number> }).scale["title"] =
      5000;
    expect(() => parse(value)).toThrow("/typography/scale/title");
  });

  it("rejects an id that does not match the file name", () => {
    expect(() => parse(theme(), "retro.json")).toThrow(
      'id "modern" must match the file name (modern.json)',
    );
  });

  it("rejects text that is not JSON", () => {
    expect(() => parseTheme("{", "modern.json")).toThrow("not valid JSON");
  });
});
