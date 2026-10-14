// Checks JSON text against schema/diagnostic.json (ajv, draft 2020-12). Used
// for the filter's diagnostics file and by tests of `--json` output.
import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { Diagnostic } from "./diagnostic.js";

const SCHEMA_URL = new URL("../schema/diagnostic.json", import.meta.url);
const schema: unknown = JSON.parse(readFileSync(SCHEMA_URL, "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateDiagnostics = ajv.compile(schema as object);

/** Parses `text` as diagnostics. Returns null when it is not valid JSON or not a valid array. */
export function parseDiagnostics(text: string): Diagnostic[] | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  return validateDiagnostics(value) ? (value as Diagnostic[]) : null;
}
