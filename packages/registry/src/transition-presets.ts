// Transition presets (PRD §5.6, task 022): the shipped presets in transitions/,
// loaded and checked like animation presets, and checked against the names in
// transitions.json (ADR-0005). Data only: the frame functions live in
// renderer/remotion/transitions, keyed by the same ids.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { RegistryError } from "./load.js";
import { listTransitions } from "./transitions.js";
import type { TransitionPreset } from "./types.js";

const SCHEMA_URL = new URL("../schema/transition.json", import.meta.url);
const PRESETS_DIR = fileURLToPath(new URL("../transitions", import.meta.url));

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validatePreset = ajv.compile(
  JSON.parse(readFileSync(SCHEMA_URL, "utf8")) as object,
);

/** Parses one preset file's text. `file` names it in every error. */
export function parseTransitionPreset(
  text: string,
  file: string,
): TransitionPreset {
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
  const preset = value as TransitionPreset;
  const expectedFile = `${preset.id}.json`;
  if (!file.endsWith(`/${expectedFile}`) && file !== expectedFile) {
    throw new RegistryError(
      `${file}: id "${preset.id}" must match the file name (${expectedFile})`,
    );
  }
  const { defaultMs, minMs, maxMs } = preset.duration;
  if (preset.id === "cut" ? maxMs !== 0 : minMs < 1) {
    throw new RegistryError(
      preset.id === "cut"
        ? `${file}: cut takes no frames, so its duration must be 0`
        : `${file}: minMs must be at least 1 (cut is the only zero-length transition)`,
    );
  }
  if (!(minMs <= defaultMs && defaultMs <= maxMs)) {
    throw new RegistryError(
      `${file}: duration must satisfy minMs <= defaultMs <= maxMs`,
    );
  }
  return preset;
}

/**
 * Loads every preset in `dir`, sorted by id. Any other entry is an error. The
 * set must match `names` (transitions.json) exactly, and each reducedMotion must
 * be one of `names`.
 */
export function loadTransitionDir(
  dir: string,
  names: readonly string[],
): TransitionPreset[] {
  const presets: TransitionPreset[] = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (!name.endsWith(".json") || !statSync(path).isFile()) {
      throw new RegistryError(
        `${name}: only <id>.json transition files belong here`,
      );
    }
    presets.push(parseTransitionPreset(readFileSync(path, "utf8"), name));
  }
  const ids = presets.map((preset) => preset.id);
  if (new Set(ids).size !== ids.length) {
    throw new RegistryError(`${dir}: two transitions share an id`);
  }
  for (const id of names) {
    if (!ids.includes(id)) {
      throw new RegistryError(
        `transitions.json: "${id}" has no preset file in transitions/`,
      );
    }
  }
  for (const preset of presets) {
    if (!names.includes(preset.id)) {
      throw new RegistryError(
        `transitions/${preset.id}.json: "${preset.id}" is not listed in transitions.json`,
      );
    }
    if (!names.includes(preset.reducedMotion)) {
      throw new RegistryError(
        `transitions/${preset.id}.json: reducedMotion "${preset.reducedMotion}" is not a listed transition`,
      );
    }
  }
  return presets.sort((a, b) => a.id.localeCompare(b.id));
}

let loaded: TransitionPreset[] | undefined;

/** Every transition preset, sorted by id. Copies: callers cannot change them. */
export function listTransitionPresets(): TransitionPreset[] {
  loaded ??= loadTransitionDir(PRESETS_DIR, listTransitions());
  return structuredClone(loaded);
}
