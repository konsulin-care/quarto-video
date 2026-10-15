// Animation presets (PRD §5.6, task 021): the shipped presets in animations/,
// loaded and checked like component contracts. Data only: the frame functions
// live in renderer/remotion/animations, keyed by the same ids.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { RegistryError } from "./load.js";
import type { AnimationPreset } from "./types.js";

const SCHEMA_URL = new URL("../schema/animation.json", import.meta.url);
const ANIMATIONS_DIR = fileURLToPath(new URL("../animations", import.meta.url));

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validatePreset = ajv.compile(
  JSON.parse(readFileSync(SCHEMA_URL, "utf8")) as object,
);

/** Parses one preset file's text. `file` names it in every error. */
export function parseAnimation(text: string, file: string): AnimationPreset {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new RegistryError(`${file}: not valid JSON: ${reason}`);
  }
  if (!validatePreset(value)) {
    const problems = (validatePreset.errors ?? []).map((error) => {
      const where = error.instancePath === "" ? "(root)" : error.instancePath;
      const extra =
        error.keyword === "additionalProperties"
          ? ` "${String(error.params["additionalProperty"])}"`
          : "";
      return `${where}: ${error.message ?? "is invalid"}${extra}`;
    });
    throw new RegistryError(`${file}: ${problems.join("; ")}`);
  }
  const preset = value as AnimationPreset;
  const expectedFile = `${preset.id}.json`;
  if (!file.endsWith(`/${expectedFile}`) && file !== expectedFile) {
    throw new RegistryError(
      `${file}: id "${preset.id}" must match the file name (${expectedFile})`,
    );
  }
  return preset;
}

/** Loads every preset in `dir`, sorted by id. Any other entry is an error. */
export function loadAnimationDir(dir: string): AnimationPreset[] {
  const presets: AnimationPreset[] = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (!name.endsWith(".json") || !statSync(path).isFile()) {
      throw new RegistryError(
        `${name}: only <id>.json preset files belong here`,
      );
    }
    presets.push(parseAnimation(readFileSync(path, "utf8"), name));
  }
  const ids = new Set(presets.map((preset) => preset.id));
  if (ids.size !== presets.length) {
    throw new RegistryError(`${dir}: two presets share an id`);
  }
  return presets.sort((a, b) => a.id.localeCompare(b.id));
}

let loaded: AnimationPreset[] | undefined;

function all(): AnimationPreset[] {
  loaded ??= loadAnimationDir(ANIMATIONS_DIR);
  return loaded;
}

/** Every preset, sorted by id. Copies: callers cannot change the registry. */
export function listAnimations(): AnimationPreset[] {
  return structuredClone(all());
}

/** The preset for `id`. An unknown id is a RegistryError, never undefined. */
export function getAnimation(id: string): AnimationPreset {
  const found = all().find((preset) => preset.id === id);
  if (found === undefined) {
    const known = all()
      .map((preset) => preset.id)
      .join(", ");
    throw new RegistryError(`unknown animation "${id}" (known: ${known})`);
  }
  return structuredClone(found);
}
