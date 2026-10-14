// Structural IR validation with the JSON Schema in schema/ir-0.1.json.
// Uses ajv (draft 2020-12). Pure: no network, no file access after load.
import { readFileSync } from "node:fs";
import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import type { IrError, IrValidation } from "./types.js";

const SCHEMA_URL = new URL("../schema/ir-0.1.json", import.meta.url);
const schema: unknown = JSON.parse(readFileSync(SCHEMA_URL, "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: true });
const compiled = ajv.compile(schema as object);

/** Maps one ajv error to a JSON Pointer path and a readable message. */
function toIrError(error: ErrorObject): IrError {
  const base = error.instancePath;
  if (error.keyword === "required") {
    const missing = String(error.params["missingProperty"]);
    return { path: `${base}/${missing}`, message: "is required" };
  }
  if (error.keyword === "additionalProperties") {
    const extra = String(error.params["additionalProperty"]);
    return { path: `${base}/${extra}`, message: "is not a known property" };
  }
  if (error.keyword === "const") {
    const expected = JSON.stringify(error.params["allowedValue"]);
    return { path: base, message: `must be ${expected}` };
  }
  return { path: base, message: error.message ?? "is invalid" };
}

/** Validates a parsed JSON value against IR 0.1. */
export function validateIr(json: unknown): IrValidation {
  if (compiled(json)) return { ok: true, errors: [] };
  const errors = (compiled.errors ?? []).map(toIrError);
  return { ok: false, errors };
}
