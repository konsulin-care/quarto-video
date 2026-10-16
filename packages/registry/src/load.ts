// Loads and checks component contracts (PRD §5.5). Pure apart from reading
// the contract files; a bad file is a RegistryError naming the file and path.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { ComponentContract } from "./types.js";

export class RegistryError extends Error {}

const SCHEMA_URL = new URL("../schema/contract.json", import.meta.url);
const schema: unknown = JSON.parse(readFileSync(SCHEMA_URL, "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateContract = ajv.compile(schema as object);

/** Parses one contract file's text. `file` names it in every error. */
export function parseContract(text: string, file: string): ComponentContract {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new RegistryError(`${file}: not valid JSON: ${reason}`);
  }
  if (!validateContract(value)) {
    const problems = (validateContract.errors ?? []).map((error) => {
      const where = error.instancePath === "" ? "(root)" : error.instancePath;
      const extra =
        error.keyword === "additionalProperties"
          ? ` "${String(error.params["additionalProperty"])}"`
          : "";
      return `${where}: ${error.message ?? "is invalid"}${extra}`;
    });
    throw new RegistryError(`${file}: ${problems.join("; ")}`);
  }
  const contract = value as ComponentContract;
  const expectedFile = `${contract.id}.json`;
  if (!file.endsWith(`/${expectedFile}`) && file !== expectedFile) {
    throw new RegistryError(
      `${file}: id "${contract.id}" must match the file name (${expectedFile})`,
    );
  }
  for (const [name, slot] of Object.entries(contract.slots)) {
    const limit = slot.items;
    if (limit !== undefined && limit.maxItems < limit.minItems) {
      throw new RegistryError(
        `${file}: /slots/${name}/items: maxItems (${limit.maxItems}) is below minItems (${limit.minItems})`,
      );
    }
  }
  if (contract.duration.maxMs < contract.duration.minMs) {
    throw new RegistryError(
      `${file}: /duration: maxMs (${contract.duration.maxMs}) is below minMs (${contract.duration.minMs})`,
    );
  }
  const regions = contract.regions;
  if ((regions !== undefined) !== contract.placements.includes("region")) {
    throw new RegistryError(
      `${file}: /regions and the "region" placement must both be set or both absent`,
    );
  }
  if (regions !== undefined) {
    if (regions.max < regions.min) {
      throw new RegistryError(
        `${file}: /regions: max (${regions.max}) is below min (${regions.min})`,
      );
    }
    const slots = Object.keys(contract.slots).length;
    if (regions.max > slots) {
      throw new RegistryError(
        `${file}: /regions/max (${regions.max}) is above the number of slots (${slots}); the slots are the regions`,
      );
    }
  }
  for (const [name, prop] of Object.entries(contract.props)) {
    if (
      prop.min !== undefined &&
      prop.max !== undefined &&
      prop.min > prop.max
    ) {
      throw new RegistryError(
        `${file}: /props/${name}: min (${prop.min}) is above max (${prop.max})`,
      );
    }
    if (prop.type !== "column") continue;
    const target = prop.of === undefined ? undefined : contract.props[prop.of];
    if (target?.type !== "csv") {
      throw new RegistryError(
        `${file}: /props/${name}/of: "${prop.of ?? ""}" must name a csv prop of this component`,
      );
    }
  }
  return contract;
}

/** Loads every contract in `dir`, sorted by id. Any other entry is an error. */
export function loadComponentDir(dir: string): ComponentContract[] {
  const contracts: ComponentContract[] = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (!name.endsWith(".json") || !statSync(path).isFile()) {
      throw new RegistryError(
        `${name}: only <id>.json contract files belong here`,
      );
    }
    contracts.push(parseContract(readFileSync(path, "utf8"), name));
  }
  return contracts.sort((a, b) => a.id.localeCompare(b.id));
}
