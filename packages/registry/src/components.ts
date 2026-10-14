// Public lookups over the shipped contracts in components/ (data only).
import { fileURLToPath } from "node:url";
import { loadComponentDir, RegistryError } from "./load.js";
import type { ComponentContract } from "./types.js";

const COMPONENTS_DIR = fileURLToPath(new URL("../components", import.meta.url));

let loaded: ComponentContract[] | undefined;

function all(): ComponentContract[] {
  loaded ??= loadComponentDir(COMPONENTS_DIR);
  return loaded;
}

/** Every component contract, sorted by id. Copies: callers cannot change the registry. */
export function listComponents(): ComponentContract[] {
  return structuredClone(all());
}

/** The contract for `id`. An unknown id is a RegistryError, never undefined. */
export function getComponent(id: string): ComponentContract {
  const found = all().find((contract) => contract.id === id);
  if (found === undefined) {
    const known = all()
      .map((contract) => contract.id)
      .join(", ");
    throw new RegistryError(`unknown component "${id}" (known: ${known})`);
  }
  return structuredClone(found);
}
