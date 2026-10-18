// Device frames (PRD §5.5, §6.1; task 040): the shipped frames in frames/,
// loaded and checked like animation presets. Data only: the frame drawing lives
// in renderer/remotion/media/frames, keyed by the same ids. Every frame's safe
// content box must lie inside the frame, so footage never leaves it.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { RegistryError } from "./load.js";
import type { FrameContract } from "./types.js";

const SCHEMA_URL = new URL("../schema/frame.json", import.meta.url);
const FRAMES_DIR = fileURLToPath(new URL("../frames", import.meta.url));

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateFrame = ajv.compile(
  JSON.parse(readFileSync(SCHEMA_URL, "utf8")) as object,
);

/** Parses one frame file's text. `file` names it in every error. */
export function parseFrame(text: string, file: string): FrameContract {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new RegistryError(`${file}: not valid JSON: ${reason}`);
  }
  if (!validateFrame(value)) {
    const problems = (validateFrame.errors ?? []).map((error) => {
      const where = error.instancePath === "" ? "(root)" : error.instancePath;
      const extra =
        error.keyword === "additionalProperties"
          ? ` "${String(error.params["additionalProperty"])}"`
          : "";
      return `${where}: ${error.message ?? "is invalid"}${extra}`;
    });
    throw new RegistryError(`${file}: ${problems.join("; ")}`);
  }
  const frame = value as FrameContract;
  const expectedFile = `${frame.id}.json`;
  if (!file.endsWith(`/${expectedFile}`) && file !== expectedFile) {
    throw new RegistryError(
      `${file}: id "${frame.id}" must match the file name (${expectedFile})`,
    );
  }
  const { xPercent, yPercent, widthPercent, heightPercent } = frame.content;
  if (xPercent + widthPercent > 100 || yPercent + heightPercent > 100) {
    throw new RegistryError(
      `${file}: /content: the content box leaves the frame (x + width and y + height must not exceed 100)`,
    );
  }
  return frame;
}

/** Loads every frame in `dir`, sorted by id. Any other entry is an error. */
export function loadFrameDir(dir: string): FrameContract[] {
  const frames: FrameContract[] = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (!name.endsWith(".json") || !statSync(path).isFile()) {
      throw new RegistryError(
        `${name}: only <id>.json frame files belong here`,
      );
    }
    frames.push(parseFrame(readFileSync(path, "utf8"), name));
  }
  const ids = new Set(frames.map((frame) => frame.id));
  if (ids.size !== frames.length) {
    throw new RegistryError(`${dir}: two frames share an id`);
  }
  return frames.sort((a, b) => a.id.localeCompare(b.id));
}

let loaded: FrameContract[] | undefined;

function all(): FrameContract[] {
  loaded ??= loadFrameDir(FRAMES_DIR);
  return loaded;
}

/** Every frame, sorted by id. Copies: callers cannot change the registry. */
export function listFrames(): FrameContract[] {
  return structuredClone(all());
}

/**
 * The frame for `id`. An unknown id is a RegistryError that lists the
 * registered frames, never undefined.
 */
export function getFrame(id: string): FrameContract {
  const found = all().find((frame) => frame.id === id);
  if (found === undefined) {
    const known = all()
      .map((frame) => frame.id)
      .join(", ");
    throw new RegistryError(`unknown frame "${id}" (known: ${known})`);
  }
  return structuredClone(found);
}
