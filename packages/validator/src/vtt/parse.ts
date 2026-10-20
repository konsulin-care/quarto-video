// WebVTT parsing for the project caption track (task 046; ADR-0019). Pure: the
// text goes in, the cues and the problems come out. Every problem names its line
// in the file (1-based), so the diagnostic can cite it. The subset: a WEBVTT
// header, NOTE blocks (skipped), and cues with an optional identifier, a timing
// line `start --> end` and text. Timestamps are `[HH:]MM:SS.mmm`. Cue text is
// plain: markup tags are removed. STYLE and REGION blocks are an error.
import type { Diagnostic } from "../diagnostic.js";

export interface VttCue {
  startMs: number;
  endMs: number;
  /** Plain text; lines are joined with a newline. */
  text: string;
  /** Line of the cue's timing line. */
  line: number;
}

export interface VttProblem {
  code: "E_CAPTIONS_SYNTAX" | "E_CAPTIONS_TIMESTAMP";
  line: number;
  message: string;
}

export interface VttParse {
  cues: VttCue[];
  problems: VttProblem[];
}

/** A timestamp: optional hours (two or more digits), minutes, seconds and milliseconds. */
const TIMESTAMP = /^(?:(\d{2,}):)?([0-5]\d):([0-5]\d)\.(\d{3})$/;
/** A timing line: `start --> end`, then optional cue settings that are ignored. */
const TIMING = /^(\S+)[ \t]+-->[ \t]+(\S+)(?:[ \t].*)?$/;
const TAG = /<[^>]*>/g;

interface Line {
  text: string;
  line: number;
}

/** Milliseconds of a timestamp, or null when it is malformed. */
export function timestampMs(raw: string): number | null {
  const match = TIMESTAMP.exec(raw);
  if (match === null) return null;
  const [, hours = "0", minutes = "0", seconds = "0", millis = "0"] = match;
  return (
    ((Number(hours) * 60 + Number(minutes)) * 60 + Number(seconds)) * 1000 +
    Number(millis)
  );
}

/** The blocks of `lines` from index `from` on: runs of non-blank lines, numbered from 1. */
function blocksOf(lines: readonly string[], from: number): Line[][] {
  const blocks: Line[][] = [];
  let current: Line[] = [];
  for (let index = from; index < lines.length; index++) {
    const text = lines[index] ?? "";
    if (text.trim() === "") {
      if (current.length > 0) blocks.push(current);
      current = [];
    } else {
      current.push({ text, line: index + 1 });
    }
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}

/** The problem for a block that is not a valid cue (its first line is cited). */
function syntax(line: number, message: string): VttProblem {
  return { code: "E_CAPTIONS_SYNTAX", line, message };
}

/** Parses one cue block into a cue, or the problems that stop it. */
function cueOf(block: readonly Line[], out: VttParse): void {
  const first = block[0];
  if (first === undefined) return;
  const timingAt = first.text.includes("-->") ? 0 : 1;
  const timing = block[timingAt];
  if (timing === undefined || !timing.text.includes("-->")) {
    out.problems.push(
      syntax(
        first.line,
        'A cue needs a timing line "start --> end", after an identifier if it has one.',
      ),
    );
    return;
  }
  const match = TIMING.exec(timing.text);
  if (match === null) {
    out.problems.push({
      code: "E_CAPTIONS_TIMESTAMP",
      line: timing.line,
      message:
        'The timing line is malformed; write "start --> end" with timestamps such as 00:00:01.500.',
    });
    return;
  }
  const [, startRaw = "", endRaw = ""] = match;
  const startMs = timestampMs(startRaw);
  const endMs = timestampMs(endRaw);
  if (startMs === null || endMs === null) {
    const malformed = (raw: string): VttProblem => ({
      code: "E_CAPTIONS_TIMESTAMP",
      line: timing.line,
      message: `Malformed timestamp "${raw}": write HH:MM:SS.mmm or MM:SS.mmm.`,
    });
    if (startMs === null) out.problems.push(malformed(startRaw));
    if (endMs === null) out.problems.push(malformed(endRaw));
    return;
  }
  if (endMs <= startMs) {
    out.problems.push({
      code: "E_CAPTIONS_TIMESTAMP",
      line: timing.line,
      message: `The cue ends at ${endRaw}, which is not after its start at ${startRaw}.`,
    });
    return;
  }
  const payload = block.slice(timingAt + 1);
  if (payload.length === 0) {
    out.problems.push(syntax(timing.line, "The cue has no text."));
    return;
  }
  if (payload.some((line) => line.text.includes("-->"))) {
    out.problems.push(syntax(timing.line, 'Cue text must not contain "-->".'));
    return;
  }
  const text = payload
    .map((line) => line.text.replace(TAG, "").trim())
    .join("\n");
  if (text.trim() === "") {
    out.problems.push(syntax(timing.line, "The cue has no text."));
    return;
  }
  out.cues.push({ startMs, endMs, text, line: timing.line });
}

/** Parses a WebVTT file's text. A file that does not start with WEBVTT is one problem. */
export function parseVtt(text: string): VttParse {
  const out: VttParse = { cues: [], problems: [] };
  const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\r|\n/);
  if (!/^WEBVTT(?:[ \t]|$)/.test(lines[0] ?? "")) {
    out.problems.push(syntax(1, 'The file must start with "WEBVTT".'));
    return out;
  }
  // The header is WEBVTT and any lines up to the first blank line: not cues.
  const firstBlank = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "",
  );
  const from = firstBlank === -1 ? lines.length : firstBlank;
  for (const block of blocksOf(lines, from)) {
    const first = block[0];
    if (first === undefined) continue;
    if (/^NOTE(?:[ \t]|$)/.test(first.text)) continue;
    if (/^(?:STYLE|REGION)(?:[ \t]|$)/.test(first.text)) {
      out.problems.push(
        syntax(first.line, "STYLE and REGION blocks are not supported."),
      );
      continue;
    }
    cueOf(block, out);
  }
  return out;
}

/** A problem as a diagnostic about the caption file `file`. */
export function problemDiagnostic(
  problem: VttProblem,
  file: string,
): Diagnostic {
  return {
    severity: "error",
    code: problem.code,
    message: problem.message,
    file,
    line: problem.line,
    property: "video.captions.src",
    suggestion:
      problem.code === "E_CAPTIONS_TIMESTAMP"
        ? "Write timestamps as HH:MM:SS.mmm, with the end after the start."
        : "Write a WebVTT file: the WEBVTT header, then cues with timing lines.",
  };
}
