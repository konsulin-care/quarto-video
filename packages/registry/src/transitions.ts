// The transition names an author may use (PRD §5.6; ADR-0005). Data only:
// read from transitions.json, checked once at load. "cut" is the zero-length
// transition every registry must have; the others take a transitionDuration.
// Presets with motion arrive with task 022; until then a non-cut transition
// is drawn as a hard cut (packages/registry/README.md).
import { readFileSync } from "node:fs";
import { RegistryError } from "./load.js";

const FILE = new URL("../transitions.json", import.meta.url);
const NAME = /^[a-z][a-z0-9-]{0,63}$/;

/** Parses the registry's transitions file text. `file` names it in errors. */
export function parseTransitions(text: string, file: string): string[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new RegistryError(`${file}: not valid JSON: ${reason}`);
  }
  const names = (value as { transitions?: unknown } | null)?.transitions;
  if (!Array.isArray(names) || names.length === 0) {
    throw new RegistryError(`${file}: "transitions" must be a non-empty list`);
  }
  const seen = new Set<string>();
  for (const name of names) {
    if (typeof name !== "string" || !NAME.test(name)) {
      throw new RegistryError(
        `${file}: "${String(name)}" is not a transition name`,
      );
    }
    if (seen.has(name)) {
      throw new RegistryError(`${file}: transition "${name}" is listed twice`);
    }
    seen.add(name);
  }
  if (!seen.has("cut")) {
    throw new RegistryError(`${file}: "cut" must be listed`);
  }
  return [...names].sort();
}

/** Every transition name, sorted. Throws RegistryError on a bad file. */
export function listTransitions(): string[] {
  return parseTransitions(readFileSync(FILE, "utf8"), "transitions.json");
}
