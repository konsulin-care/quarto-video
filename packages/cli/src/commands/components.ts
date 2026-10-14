// `video components [--json]`: lists the registry's component contracts
// (packages/registry/README.md). Exit codes: 0 OK, 2 a broken registry.
// Output: a table on stdout, or with --json a JSON array of the contracts.
import {
  listComponents,
  RegistryError,
  type ComponentContract,
} from "@quarto-video/registry";
import { EXIT_OK, EXIT_USAGE } from "../exit-codes.js";

export interface ComponentsOptions {
  json: boolean;
}

/** `750` -> `750ms`, `2000` -> `2s`: the duration syntax authors write (ADR-0003). */
function formatMs(ms: number): string {
  return ms % 1000 === 0 ? `${ms / 1000}s` : `${ms}ms`;
}

function slotsCell(contract: ComponentContract): string {
  const slots = Object.entries(contract.slots)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, slot]) => {
      const need = slot.required ? "required" : "optional";
      return `${name} (${need}: ${slot.accepts.join(", ")})`;
    });
  return slots.length > 0 ? slots.join("; ") : "none";
}

function propsCell(contract: ComponentContract): string {
  const props = Object.entries(contract.props)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, prop]) =>
      prop.type === "enum"
        ? `${name} (enum: ${(prop.enum ?? []).join("|")})`
        : `${name} (${prop.type})`,
    );
  return props.length > 0 ? props.join("; ") : "none";
}

/** Pads each column to its widest cell; the last column is not padded. */
function table(header: string[], rows: string[][]): string {
  const all = [header, ...rows];
  const widths = header.map((_, col) =>
    Math.max(...all.map((row) => (row[col] ?? "").length)),
  );
  return all
    .map((row) =>
      row
        .map((cell, col) =>
          col === row.length - 1 ? cell : cell.padEnd(widths[col] ?? 0),
        )
        .join("  "),
    )
    .map((line) => `${line}\n`)
    .join("");
}

/** The human-readable table for `video components`. */
export function formatComponentsTable(contracts: ComponentContract[]): string {
  return table(
    ["ID", "VERSION", "DURATION", "SLOTS", "PROPS"],
    contracts.map((c) => [
      c.id,
      c.version,
      `${formatMs(c.duration.minMs)}-${formatMs(c.duration.maxMs)}`,
      slotsCell(c),
      propsCell(c),
    ]),
  );
}

/** Runs `video components`. Returns the exit code. */
export function runComponents(options: ComponentsOptions): number {
  let contracts: ComponentContract[];
  try {
    contracts = listComponents();
  } catch (err) {
    if (!(err instanceof RegistryError)) throw err;
    process.stderr.write(`video: ${err.message}\n`);
    return EXIT_USAGE;
  }
  if (options.json) {
    process.stdout.write(`${JSON.stringify(contracts, null, 2)}\n`);
  } else {
    process.stdout.write(formatComponentsTable(contracts));
  }
  return EXIT_OK;
}
