// Components draw with theme tokens only (PRD §10, task 019): no hex colours,
// no rgb() colours and no literal font sizes in renderer/remotion/components/.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const COMPONENTS = fileURLToPath(new URL("../components", import.meta.url));

const RULES: { name: string; pattern: RegExp }[] = [
  { name: "hex colour", pattern: /#[0-9a-fA-F]{3,8}\b/ },
  { name: "rgb() colour", pattern: /\brgba?\(/ },
  { name: "numeric fontSize", pattern: /fontSize:\s*\d/ },
  { name: "px fontSize", pattern: /fontSize:\s*["'`][^"'`]*px/ },
];

/** Every .tsx and .ts file under `dir`, recursively. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("component styling", () => {
  const files = sources(COMPONENTS);

  it("finds the component sources to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const rule of RULES) {
    it(`has no ${rule.name}`, () => {
      const offenders = files.flatMap((file) =>
        readFileSync(file, "utf8")
          .split("\n")
          .flatMap((line, index) =>
            rule.pattern.test(line)
              ? [`${file}:${index + 1}: ${line.trim()}`]
              : [],
          ),
      );
      expect(offenders).toEqual([]);
    });
  }
});
