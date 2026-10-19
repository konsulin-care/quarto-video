// `.video-build/build-info.json` (task 049, PRD §11.1): what produced a render. It
// holds the SHA-256 of the resolved IR text, of every project asset the IR names
// (footage, images, music, captions) and of each device frame definition, the
// versions the tool probes reported, the OS and architecture, and the CLI flags.
// The file is validated against schema/build-info.json before it is written.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { arch, platform, release } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { IrVideo } from "@quarto-video/ir";
import type { ToolId, ToolStatus } from "./tools.js";

export const BUILD_INFO_RELATIVE = join(".video-build", "build-info.json");
const REPO = fileURLToPath(new URL("../../../", import.meta.url));
const SCHEMA_URL = new URL("../schema/build-info.json", import.meta.url);
const FRAME_NAMES = ["browser", "phone", "tablet", "generic"];

export interface BuildFlags {
  json: boolean;
  theme: string | null;
}

/** Versions of the packages and tools; null where a probe did not run. */
export interface BuildTools {
  video: string;
  validator: string;
  renderer: string;
  node: string | null;
  quarto: string | null;
  pandoc: string | null;
  remotion: string | null;
  browser: string | null;
  ffmpeg: string | null;
}

export interface AssetHash {
  kind: "footage" | "image" | "music" | "captions" | "device-frame";
  path: string;
  sha256: string;
}

export interface BuildInfo {
  schemaVersion: "1.0";
  irSchemaVersion: string;
  irHash: string;
  assets: AssetHash[];
  tools: BuildTools;
  platform: { os: string; release: string; arch: string };
  flags: BuildFlags;
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateSchema = ajv.compile(
  JSON.parse(readFileSync(SCHEMA_URL, "utf8")) as object,
);

/** Lowercase hex SHA-256 of bytes or text. */
export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/** The `version` field of a package.json under the repository root. */
function packageVersion(relativePath: string): string {
  const pkg = JSON.parse(readFileSync(join(REPO, relativePath), "utf8")) as {
    version?: string;
  };
  return pkg.version ?? "unknown";
}

/** Project-relative asset paths and device frame definitions the IR names. */
function assetRefs(ir: IrVideo): Omit<AssetHash, "sha256">[] {
  const refs: Omit<AssetHash, "sha256">[] = [];
  const seen = new Set<string>();
  const add = (kind: AssetHash["kind"], path: string) => {
    const key = `${kind}:${path}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ kind, path });
    }
  };
  const top = ir as { music?: { src: string }; captions?: { src: string } };
  if (top.music) add("music", top.music.src);
  if (top.captions) add("captions", top.captions.src);
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node === null || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (typeof record["src"] === "string") {
      const footage = record["type"] === "video";
      const still = record["kind"] === "image" || record["type"] === "image";
      if (footage || still) {
        add(still ? "image" : "footage", record["src"]);
      }
    }
    if (
      typeof record["frame"] === "string" &&
      FRAME_NAMES.includes(record["frame"])
    ) {
      add("device-frame", `packages/registry/frames/${record["frame"]}.json`);
    }
    Object.values(record).forEach(walk);
  };
  walk(ir.scenes);
  return refs.sort((a, b) =>
    `${a.kind}:${a.path}`.localeCompare(`${b.kind}:${b.path}`),
  );
}

/** Reads each referenced file and hashes it. Device frames resolve from the repository. */
async function hashAssets(root: string, ir: IrVideo): Promise<AssetHash[]> {
  return Promise.all(
    assetRefs(ir).map(async (ref) => {
      const base = ref.kind === "device-frame" ? REPO : root;
      const bytes = await readFile(join(base, ref.path));
      return { ...ref, sha256: sha256(bytes) };
    }),
  );
}

/** Version of each tool from the probes; null when a tool did not run. */
function toolVersions(tools: readonly ToolStatus[]): BuildTools {
  const version = (id: ToolId): string | null =>
    tools.find((tool) => tool.tool === id)?.version ?? null;
  return {
    video: packageVersion("packages/cli/package.json"),
    validator: packageVersion("packages/validator/package.json"),
    renderer: packageVersion("renderer/remotion/package.json"),
    node: version("node"),
    quarto: version("quarto"),
    pandoc: version("pandoc"),
    remotion: version("remotion"),
    browser: version("browser"),
    ffmpeg: version("ffprobe"),
  };
}

/** The schema errors of `value`, one line each; empty when it is valid. */
export function buildInfoErrors(value: unknown): string[] {
  if (validateSchema(value)) return [];
  return (validateSchema.errors ?? []).map(
    (error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
  );
}

/**
 * The build info for one render. `irText` is the resolved IR exactly as written
 * to disk, so its hash names the IR the renderer read. Throws when an asset is
 * unreadable or the result does not match the schema.
 */
export async function buildInfo(input: {
  root: string;
  ir: IrVideo;
  irText: string;
  flags: BuildFlags;
  tools: readonly ToolStatus[];
}): Promise<BuildInfo> {
  const info: BuildInfo = {
    schemaVersion: "1.0",
    irSchemaVersion: input.ir.schemaVersion,
    irHash: sha256(input.irText),
    assets: await hashAssets(input.root, input.ir),
    tools: toolVersions(input.tools),
    platform: { os: platform(), release: release(), arch: arch() },
    flags: input.flags,
  };
  const errors = buildInfoErrors(info);
  if (errors.length > 0) {
    throw new Error(`build-info is invalid: ${errors.join("; ")}`);
  }
  return info;
}

/** Writes the validated build info to `<root>/.video-build/build-info.json`. */
export async function writeBuildInfo(
  root: string,
  info: BuildInfo,
): Promise<void> {
  const errors = buildInfoErrors(info);
  if (errors.length > 0) {
    throw new Error(`build-info is invalid: ${errors.join("; ")}`);
  }
  const file = join(root, BUILD_INFO_RELATIVE);
  await mkdir(join(root, ".video-build"), { recursive: true });
  await writeFile(file, `${JSON.stringify(info, null, 2)}\n`);
}
