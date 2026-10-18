// The project caption track (task 046; ADR-0019): the WebVTT parser, and stage 3
// (resolveCaptions) with its range and overlap checks. Each case writes its own
// caption file into a temporary project root; no media is read.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { IrCaptions } from "@quarto-video/ir";
import {
  resolveCaptions,
  frameOf,
  type CaptionsManifest,
} from "../src/stages/captions.js";
import { parseVtt, timestampMs } from "../src/vtt/parse.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "video-captions-"));
  mkdirSync(join(root, "assets"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Writes `text` as the caption file at assets/captions.vtt. */
function vtt(text: string): void {
  writeFileSync(join(root, "assets", "captions.vtt"), text);
}

/** A 30 fps manifest with a timeline of `frames`, carrying a caption track. */
function manifestOf(
  frames: number,
  captions: Partial<IrCaptions> = {},
): CaptionsManifest {
  return {
    settings: { fps: 30 },
    timeline: { durationFrames: frames },
    scenes: [{ source: { file: "index.qmd" } }],
    captions: { src: "assets/captions.vtt", mode: "burn", ...captions },
  };
}

describe("WebVTT parsing", () => {
  it("reads a cue's times and its text, with the line of its timing", () => {
    const parsed = parseVtt(
      "WEBVTT\n\n00:00:00.500 --> 00:00:02.500\nHello\nthere\n",
    );
    expect(parsed.problems).toEqual([]);
    expect(parsed.cues).toEqual([
      { startMs: 500, endMs: 2500, text: "Hello\nthere", line: 3 },
    ]);
  });

  it("accepts the hours form, a cue identifier, a header line and CRLF endings", () => {
    const parsed = parseVtt(
      "﻿WEBVTT - a title\r\nKind: captions\r\n\r\nintro\r\n01:00:00.000 --> 01:00:01.250 align:start\r\nLine one\r\n",
    );
    expect(parsed.problems).toEqual([]);
    expect(parsed.cues).toEqual([
      { startMs: 3600000, endMs: 3601250, text: "Line one", line: 5 },
    ]);
  });

  it("skips NOTE blocks and removes markup tags from the text", () => {
    const parsed = parseVtt(
      "WEBVTT\n\nNOTE written by hand\n\n00:00:00.000 --> 00:00:01.000\n<i>Hi</i> <v Ana>there</v>\n",
    );
    expect(parsed.problems).toEqual([]);
    expect(parsed.cues.map((cue) => cue.text)).toEqual(["Hi there"]);
  });

  it("rejects a file that does not start with WEBVTT, at line 1", () => {
    const parsed = parseVtt("00:00:00.000 --> 00:00:01.000\nHi\n");
    expect(parsed.problems).toEqual([
      expect.objectContaining({ code: "E_CAPTIONS_SYNTAX", line: 1 }),
    ]);
  });

  it("cites the line of a malformed timestamp", () => {
    const parsed = parseVtt("WEBVTT\n\n00:00:0.500 --> 00:00:01.000\nHi\n");
    expect(parsed.problems).toEqual([
      expect.objectContaining({
        code: "E_CAPTIONS_TIMESTAMP",
        line: 3,
        message: expect.stringContaining('"00:00:0.500"'),
      }),
    ]);
  });

  it("rejects a cue that ends before it starts", () => {
    const parsed = parseVtt("WEBVTT\n\n00:00:02.000 --> 00:00:01.000\nHi\n");
    expect(parsed.problems).toEqual([
      expect.objectContaining({ code: "E_CAPTIONS_TIMESTAMP", line: 3 }),
    ]);
  });

  it("rejects a cue with no timing line, citing its first line", () => {
    const parsed = parseVtt("WEBVTT\n\nJust some text\n");
    expect(parsed.problems).toEqual([
      expect.objectContaining({ code: "E_CAPTIONS_SYNTAX", line: 3 }),
    ]);
  });

  it("rejects a cue with no text, at its timing line", () => {
    const parsed = parseVtt("WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n");
    expect(parsed.problems).toEqual([
      expect.objectContaining({ code: "E_CAPTIONS_SYNTAX", line: 3 }),
    ]);
  });

  it("rejects STYLE blocks, which are not supported", () => {
    const parsed = parseVtt("WEBVTT\n\nSTYLE\n::cue { color: red }\n");
    expect(parsed.problems).toEqual([
      expect.objectContaining({ code: "E_CAPTIONS_SYNTAX", line: 3 }),
    ]);
  });

  it("reads timestamps in milliseconds, and rejects malformed ones", () => {
    expect(timestampMs("00:01.250")).toBe(1250);
    expect(timestampMs("01:02:03.004")).toBe(3723004);
    expect(timestampMs("1:02.250")).toBeNull();
    expect(timestampMs("00:60.000")).toBeNull();
  });
});

describe("caption frames", () => {
  it("rounds half up, as the durations do (ADR-0003)", () => {
    expect(frameOf(500, 30)).toBe(15);
    expect(frameOf(2500, 30)).toBe(75);
    expect(frameOf(16, 30)).toBe(0);
    expect(frameOf(17, 30)).toBe(1);
  });
});

describe("caption stage", () => {
  it("writes the cues in frames, in file order, and keeps the track's fields", () => {
    vtt(
      "WEBVTT\n\n00:00:00.500 --> 00:00:02.500\nFirst\n\n00:00:03.000 --> 00:00:04.000\nSecond\n",
    );
    const result = resolveCaptions(manifestOf(150), root);
    expect(result.diagnostics).toEqual([]);
    expect(result.ir.captions).toEqual({
      src: "assets/captions.vtt",
      mode: "burn",
      cues: [
        { startFrame: 15, endFrame: 75, text: "First" },
        { startFrame: 90, endFrame: 120, text: "Second" },
      ],
    });
  });

  it("returns the manifest unchanged when there is no track", () => {
    const manifest = manifestOf(90);
    delete manifest.captions;
    expect(resolveCaptions(manifest, root).ir).toBe(manifest);
  });

  it("reports a cue that ends after the video, citing its line", () => {
    vtt(
      "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nFine\n\n00:00:02.000 --> 00:00:05.000\nToo late\n",
    );
    const result = resolveCaptions(manifestOf(90), root);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: "error",
        code: "E_CAPTIONS_RANGE",
        file: "assets/captions.vtt",
        line: 6,
      }),
    ]);
  });

  it("reports overlapping cues at the later cue's line", () => {
    vtt(
      "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nOne\n\n00:00:01.000 --> 00:00:03.000\nTwo\n",
    );
    const result = resolveCaptions(manifestOf(90), root);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "E_CAPTIONS_OVERLAP",
        file: "assets/captions.vtt",
        line: 6,
      }),
    ]);
  });

  it("reports a cue that lasts less than a frame", () => {
    vtt("WEBVTT\n\n00:00:00.000 --> 00:00:00.010\nBlink\n");
    const result = resolveCaptions(manifestOf(90), root);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: "E_CAPTIONS_TIMESTAMP", line: 3 }),
    ]);
  });

  it("reports a missing caption file as E_ASSET_MISSING in the document", () => {
    const result = resolveCaptions(manifestOf(90), root);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "E_ASSET_MISSING",
        file: "index.qmd",
        property: "video.captions.src",
      }),
    ]);
  });

  it("reports a file that is not .vtt as E_MEDIA_FORMAT", () => {
    writeFileSync(join(root, "assets", "captions.srt"), "1\n");
    const result = resolveCaptions(
      manifestOf(90, { src: "assets/captions.srt" }),
      root,
    );
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: "E_MEDIA_FORMAT", file: "index.qmd" }),
    ]);
  });

  it("reports every parse problem of the file, not only the first", () => {
    vtt(
      "WEBVTT\n\n00:00:0.500 --> 00:00:01.000\nA\n\n00:00:02.000 --> 00:00:01.000\nB\n",
    );
    const result = resolveCaptions(manifestOf(90), root);
    expect(result.diagnostics.map((d) => d.line)).toEqual([3, 6]);
  });
});
