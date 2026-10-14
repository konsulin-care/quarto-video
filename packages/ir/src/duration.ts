// Authored duration → integer frames (PRD §5.3, §8.2; ADR-0003). The Lua
// filter implements the same rule (_extensions/video/lib/duration.lua); the
// shared vectors in test-vectors/durations.json drive both.
// Arithmetic is exact: the duration is held in whole microseconds, and the
// frame count rounds half up.

export type DurationErrorCode = "E_DURATION_SYNTAX" | "E_DURATION_RANGE";

export type DurationResult =
  | { ok: true; frames: number }
  | { ok: false; code: DurationErrorCode; message: string };

const FORM = /^(\d+)(?:\.(\d+))?(s|ms)$/;
const NEGATIVE = /^-\d/;
const MAX_MICROS = 3_600_000_000; // 3600 s (ADR-0003)
const MAX_WHOLE_DIGITS = 7;

/** The message names the value; `predicate` says what is wrong with it. */
function fail(
  code: DurationErrorCode,
  text: string,
  predicate: string,
): DurationResult {
  return { ok: false, code, message: `duration "${text}" ${predicate}` };
}

/** Converts `text` ("<n>s" or "<n>ms") to frames at `fps` (a positive integer). */
export function durationToFrames(text: string, fps: number): DurationResult {
  if (NEGATIVE.test(text)) {
    return fail("E_DURATION_RANGE", text, "must be greater than zero");
  }
  const match = FORM.exec(text);
  if (match === null) {
    return fail(
      "E_DURATION_SYNTAX",
      text,
      'must be a number of seconds or milliseconds, like "4s", "1.5s" or "500ms"',
    );
  }
  const [, whole = "", fraction = "", unit = ""] = match;
  if (fraction.length > 3) {
    return fail("E_DURATION_SYNTAX", text, "has more than 3 decimal places");
  }
  if (whole.length > MAX_WHOLE_DIGITS) {
    return fail("E_DURATION_RANGE", text, "must be at most 3600s");
  }
  const thousandths = Number(fraction.padEnd(3, "0"));
  const micros =
    unit === "s"
      ? Number(whole) * 1_000_000 + thousandths * 1_000
      : Number(whole) * 1_000 + thousandths;
  if (micros === 0) {
    return fail("E_DURATION_RANGE", text, "must be greater than zero");
  }
  if (micros > MAX_MICROS) {
    return fail("E_DURATION_RANGE", text, "must be at most 3600s");
  }
  const frames = Math.floor((2 * micros * fps + 1_000_000) / 2_000_000);
  if (frames < 1) {
    return fail(
      "E_DURATION_RANGE",
      text,
      `is shorter than one frame at ${fps} fps`,
    );
  }
  return { ok: true, frames };
}
