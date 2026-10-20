// Tool detection for `video doctor` and render preflight (PRD §9.1, stage 5).
// Each tool is probed by running its version command or by resolving it; no
// project code runs. QV_TEST_MISSING=<tool,...> marks tools as absent: a
// test-only seam (packages/cli/README.md), never documented for authors.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { matrixWarning } from "./compat-matrix.js";

export const TOOL_IDS = [
  "node",
  "quarto",
  "pandoc",
  "remotion",
  "browser",
  "ffprobe",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export interface ToolStatus {
  tool: ToolId;
  ok: boolean;
  /** Version text when the tool works; null otherwise. */
  version: string | null;
  /** Why it is unavailable and how to fix it; set only when `ok` is false. */
  hint: string | null;
  /** Set when the version is not in the compatibility matrix (a warning, not a failure). */
  warning?: string | null;
}

/** Outcome of one probe: a version, or the reason the tool is unavailable. */
type Probe = { version: string } | { reason: string };

/** How to make each tool available (printed after the reason). */
const INSTALL: Record<ToolId, string> = {
  node: "use the Node version in mise.toml (run `mise install`)",
  quarto: "install the pinned Quarto (mise.toml; run `mise install`)",
  pandoc: "Pandoc comes with the pinned Quarto; install Quarto first",
  remotion: "run `npm ci` to install the workspace dependencies (ADR-0001)",
  browser:
    "install a Chromium headless shell and set QV_BROWSER_EXECUTABLE to its binary (renderer/remotion/README.md)",
  ffprobe:
    "install ffmpeg, which provides ffprobe (mise.toml pins conda:ffmpeg; run `mise install`)",
};

const PROBE_TIMEOUT_MS = 20_000;
const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** First line of a command's version output, or null when it fails to run. */
function run(command: string, args: string[]): string | null {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: PROBE_TIMEOUT_MS,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error !== undefined || result.status !== 0) return null;
  const text = result.stdout.trim() || result.stderr.trim();
  return text.split("\n")[0]?.trim() ?? "";
}

/** The Node major version the root package.json `engines` pins (ADR-0010). */
function pinnedNodeMajor(): string {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    engines?: { node?: string };
  };
  return (pkg.engines?.node ?? "").split(".")[0] ?? "";
}

function probeNode(): Probe {
  const major = pinnedNodeMajor();
  if (process.versions.node.split(".")[0] !== major) {
    return { reason: `Node ${process.version} is not Node ${major}` };
  }
  return { version: process.version };
}

function probeRemotion(): Probe {
  try {
    const require = createRequire(import.meta.url);
    const file = require.resolve("@remotion/renderer/package.json");
    const pkg = JSON.parse(readFileSync(file, "utf8")) as { version?: string };
    return { version: pkg.version ?? "unknown" };
  } catch {
    return { reason: "@remotion/renderer is not installed" };
  }
}

function probeBrowser(env: NodeJS.ProcessEnv): Probe {
  const path = env["QV_BROWSER_EXECUTABLE"];
  if (!path) {
    return {
      reason:
        "QV_BROWSER_EXECUTABLE is not set (unset, Remotion would download a browser)",
    };
  }
  if (!existsSync(path) || !statSync(path).isFile()) {
    return { reason: "QV_BROWSER_EXECUTABLE is not a file" };
  }
  const version = run(path, ["--version"]);
  return version === null
    ? { reason: "the browser at QV_BROWSER_EXECUTABLE does not run" }
    : { version };
}

function probeFfprobe(): Probe {
  const version = run("ffprobe", ["-version"]);
  if (version === null) return { reason: "ffprobe is not on PATH" };
  return { version: version.match(/version (\S+)/)?.[1] ?? version };
}

function probeQuarto(): Probe {
  const version = run("quarto", ["--version"]);
  return version === null ? { reason: "quarto is not on PATH" } : { version };
}

function probePandoc(): Probe {
  const version = run("quarto", ["pandoc", "--version"]);
  return version === null
    ? { reason: "quarto pandoc does not run" }
    : { version: version.replace(/^pandoc\s+/, "") };
}

/** Tools named in QV_TEST_MISSING are reported as absent, whatever is installed. */
function forcedMissing(env: NodeJS.ProcessEnv): Set<string> {
  return new Set(
    (env["QV_TEST_MISSING"] ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name !== ""),
  );
}

/** Every tool the render needs, in the order `video doctor` prints them. */
export function detectTools(
  env: NodeJS.ProcessEnv = process.env,
): ToolStatus[] {
  const forced = forcedMissing(env);
  const probes: Record<ToolId, () => Probe> = {
    node: probeNode,
    quarto: probeQuarto,
    pandoc: probePandoc,
    remotion: probeRemotion,
    browser: () => probeBrowser(env),
    ffprobe: probeFfprobe,
  };
  return TOOL_IDS.map((tool): ToolStatus => {
    const probe: Probe = forced.has(tool)
      ? { reason: "marked missing by QV_TEST_MISSING" }
      : probes[tool]();
    if ("version" in probe) {
      return {
        tool,
        ok: true,
        version: probe.version,
        hint: null,
        warning: matrixWarning(tool, probe.version),
      };
    }
    return {
      tool,
      ok: false,
      version: null,
      hint: `${probe.reason}; ${INSTALL[tool]}`,
      warning: null,
    };
  });
}
