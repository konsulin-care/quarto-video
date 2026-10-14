// Structural IR validation with the JSON Schemas in schema/ (ajv, draft
// 2020-12): IR 0.1, 0.2 and 0.3 are accepted (PRD §8.2). Pure: no network,
// no file access after load.
import { readFileSync } from "node:fs";
import {
  Ajv2020,
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020.js";
import type { IrError, IrValidation } from "./types.js";

const ajv = new Ajv2020({ allErrors: true, strict: true });

function compile(file: string): ValidateFunction {
  const url = new URL(`../schema/${file}`, import.meta.url);
  return ajv.compile(JSON.parse(readFileSync(url, "utf8")) as object);
}

const SCHEMAS: Readonly<Record<string, ValidateFunction>> = {
  "0.1": compile("ir-0.1.json"),
  "0.2": compile("ir-0.2.json"),
  "0.3": compile("ir-0.3.json"),
};

/** The version a new manifest is written in; also checked for other input. */
const LATEST = "0.3";

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

/** The schemaVersion of a parsed value when it is a string, else undefined. */
function versionOf(json: unknown): string | undefined {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return undefined;
  }
  const version = (json as Record<string, unknown>)["schemaVersion"];
  return typeof version === "string" ? version : undefined;
}

/** Validates a parsed JSON value against the IR version it declares. */
export function validateIr(json: unknown): IrValidation {
  const version = versionOf(json);
  if (version !== undefined && SCHEMAS[version] === undefined) {
    return {
      ok: false,
      errors: [
        {
          path: "/schemaVersion",
          message: `is not a supported IR version "${version}"; use "0.1", "0.2" or "0.3"`,
        },
      ],
    };
  }
  const validate = SCHEMAS[version ?? LATEST] as ValidateFunction;
  if (validate(json)) return { ok: true, errors: [] };
  const errors = (validate.errors ?? []).map(toIrError);
  return { ok: false, errors };
}
