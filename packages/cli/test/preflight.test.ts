// Stage 5 rules (packages/cli/src/preflight.ts) with every input supplied by
// the test: tools, writable directories and free space. No real machine state.
import { describe, expect, it } from "vitest";
import {
  MIN_FREE_BYTES,
  preflightProblems,
  type PreflightInput,
} from "../src/preflight.js";
import type { ToolStatus } from "../src/tools.js";

const OK_TOOLS: ToolStatus[] = [
  { tool: "node", ok: true, version: "v24.21.0", hint: null },
  { tool: "ffprobe", ok: true, version: "9.0.2", hint: null },
  { tool: "browser", ok: true, version: "Chromium 141", hint: null },
];

function input(overrides: Partial<PreflightInput> = {}): PreflightInput {
  return {
    tools: OK_TOOLS,
    writeDirs: ["/p/videos/hello", "/p/videos/hello/.video-build"],
    outputDir: "/p/videos/hello",
    writable: () => true,
    freeBytes: () => MIN_FREE_BYTES * 4,
    display: (dir) => dir.replace("/p/", ""),
    ...overrides,
  };
}

describe("preflight problems", () => {
  it("reports nothing when every check passes", () => {
    expect(preflightProblems(input())).toEqual([]);
  });

  it("names a missing tool and how to install it", () => {
    const problems = preflightProblems(
      input({
        tools: [
          ...OK_TOOLS.slice(0, 1),
          {
            tool: "ffprobe",
            ok: false,
            version: null,
            hint: "ffprobe is not on PATH; install ffmpeg",
          },
        ],
      }),
    );
    expect(problems).toEqual([
      "ffprobe is not available: ffprobe is not on PATH; install ffmpeg",
    ]);
  });

  it("names a directory that is not writable, once even when it is listed twice", () => {
    const problems = preflightProblems(
      input({
        writable: (dir) => dir !== "/p/videos/hello",
        writeDirs: ["/p/videos/hello", "/p/videos/hello"],
      }),
    );
    expect(problems).toEqual(["output directory not writable: videos/hello"]);
  });

  it("reports free space below the heuristic minimum, in MiB", () => {
    const problems = preflightProblems(
      input({ freeBytes: () => 10 * 1024 * 1024 }),
    );
    expect(problems).toEqual([
      "not enough free disk space in videos/hello: need 256 MiB, have 10 MiB",
    ]);
  });

  it("reports unknown free space rather than assuming there is some", () => {
    const problems = preflightProblems(input({ freeBytes: () => null }));
    expect(problems).toEqual(["cannot read free disk space in videos/hello"]);
  });

  it("lists every problem, tools first", () => {
    const problems = preflightProblems(
      input({
        tools: [{ tool: "browser", ok: false, version: null, hint: "set it" }],
        writable: () => false,
        freeBytes: () => 0,
      }),
    );
    expect(problems).toHaveLength(4);
    expect(problems[0]).toBe("browser is not available: set it");
  });
});
