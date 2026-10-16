// Banned APIs in renderer code (PRD §8.4, §11.1; renderer/remotion/README.md):
// a frame is a function of the IR and the frame number only. The rules are
// plain text patterns over the source, so a match in a comment is also flagged.

export const BANNED_RULES: readonly { name: string; pattern: RegExp }[] = [
  { name: "Date", pattern: /\bDate\b/ },
  { name: "Math.random", pattern: /\bMath\.random\b/ },
  { name: "performance.now", pattern: /\bperformance\.now\b/ },
  {
    name: "timer",
    pattern: /\b(setTimeout|setInterval|setImmediate|requestAnimationFrame)\b/,
  },
  { name: "fetch", pattern: /\bfetch\s*\(/ },
];

/** One banned match: the rule, and the 1-based line of the source. */
export interface Violation {
  rule: string;
  line: number;
  text: string;
}

/** Every line of `source` that matches a banned rule. */
export function findViolations(source: string): Violation[] {
  return source.split("\n").flatMap((text, index) =>
    BANNED_RULES.filter((rule) => rule.pattern.test(text)).map((rule) => ({
      rule: rule.name,
      line: index + 1,
      text: text.trim(),
    })),
  );
}
