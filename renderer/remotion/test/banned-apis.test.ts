// Lint rule (task 021, PRD §8.4): no Date, Math.random, performance.now,
// timers or fetch in renderer code. The rule is checked on the rendering
// directories; the cases below pin what the rule catches and what it passes.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BANNED_RULES, findViolations } from "./banned-apis.js";

const RENDERER = fileURLToPath(new URL("..", import.meta.url));
const DIRS = ["src", "components", "themes", "animations"];

/** Every .ts and .tsx file under `dir`, recursively. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("renderer code bans wall clock, randomness, timers and network", () => {
  const files = DIRS.flatMap((dir) => sources(join(RENDERER, dir)));

  it("finds the renderer sources to check", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("has no banned API in any renderer source", () => {
    const offenders = files.flatMap((file) =>
      findViolations(readFileSync(file, "utf8")).map(
        (v) => `${file}:${v.line} ${v.rule}: ${v.text}`,
      ),
    );
    expect(offenders).toEqual([]);
  });
});

describe("the rule itself", () => {
  it.each([
    ["Math.random()", "Math.random"],
    ["const t = Date.now();", "Date"],
    ["const d = new Date();", "Date"],
    ["const n = performance.now();", "performance.now"],
    ["setTimeout(run, 10);", "timer"],
    ["setInterval(tick, 10);", "timer"],
    ["requestAnimationFrame(step);", "timer"],
    ["await fetch(url);", "fetch"],
  ])("flags %s", (line, rule) => {
    expect(findViolations(line).map((v) => v.rule)).toEqual([rule]);
  });

  it.each([
    "const frame = useCurrentFrame();",
    "const dateLabel = frame;",
    "const updated = update(frame);",
    "const random = seeded(frame);",
  ])("passes %s", (line) => {
    expect(findViolations(line)).toEqual([]);
  });

  it("reports the line number of each match", () => {
    const found = findViolations("const a = 1;\n\nconst b = Math.random();");
    expect(found).toEqual([
      { rule: "Math.random", line: 3, text: "const b = Math.random();" },
    ]);
  });

  it("has a rule for each banned name in the task", () => {
    expect(BANNED_RULES.map((r) => r.name)).toEqual([
      "Date",
      "Math.random",
      "performance.now",
      "timer",
      "fetch",
    ]);
  });
});
