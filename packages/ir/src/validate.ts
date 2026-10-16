// Structural IR validation with the JSON Schemas in schema/ (ajv, draft
// 2020-12): IR 0.1 to 1.0 are accepted (PRD §8.2, ADR-0007). Pure: no network,
// no file access after load.
import { readFileSync } from "node:fs";
import {
  Ajv2020,
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020.js";
import {
  LATEST_VERSION,
  UNSUPPORTED_VERSION_CODE,
  isSupportedVersion,
  unsupportedVersionMessage,
} from "./versions.js";
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
  "1.0": compile("ir-1.0.json"),
  "1.1": compile("ir-1.1.json"),
  "1.2": compile("ir-1.2.json"),
  "1.3": compile("ir-1.3.json"),
  "1.4": compile("ir-1.4.json"),
  "1.5": compile("ir-1.5.json"),
  "1.6": compile("ir-1.6.json"),
};

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

/** A JSON object (not an array, not null). */
function isObject(json: unknown): json is Record<string, unknown> {
  return typeof json === "object" && json !== null && !Array.isArray(json);
}

/** Whether `json` is an object with a `schemaVersion` key. */
function hasVersionKey(json: unknown): json is Record<string, unknown> {
  return isObject(json) && "schemaVersion" in json;
}

/** Validates a parsed JSON value against the IR version it declares. */
export function validateIr(json: unknown): IrValidation {
  if (hasVersionKey(json) && !isSupportedVersion(json["schemaVersion"])) {
    return {
      ok: false,
      errors: [
        {
          path: "/schemaVersion",
          message: unsupportedVersionMessage(json["schemaVersion"]),
          code: UNSUPPORTED_VERSION_CODE,
        },
      ],
    };
  }
  if (isObject(json) && !hasVersionKey(json)) {
    // Without a version there is no schema to check the rest against.
    return {
      ok: false,
      errors: [{ path: "/schemaVersion", message: "is required" }],
    };
  }
  const version = hasVersionKey(json) ? json["schemaVersion"] : undefined;
  const key = typeof version === "string" ? version : LATEST_VERSION;
  const validate = SCHEMAS[key] as ValidateFunction;
  if (validate(json)) return { ok: true, errors: [] };
  const errors = (validate.errors ?? []).map(toIrError);
  return { ok: false, errors };
}
