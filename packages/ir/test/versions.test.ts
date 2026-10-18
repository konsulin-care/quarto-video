// The IR version gate (ADR-0007): which versions are read, and what an
// unsupported or missing version reports.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LATEST_VERSION, SUPPORTED_VERSIONS } from "../src/versions.js";
import { validateIr } from "../src/validate.js";

const load = (file: string): Record<string, unknown> =>
  JSON.parse(
    readFileSync(new URL(`../examples/${file}`, import.meta.url), "utf8"),
  );

const UNSUPPORTED = {
  ok: false,
  errors: [
    {
      path: "/schemaVersion",
      code: "E_IR_UNSUPPORTED_VERSION",
      message:
        '"2.0" is not a supported IR version; supported versions: 0.1, 0.2, 0.3, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10',
    },
  ],
};

describe("IR version gate", () => {
  it("supports 0.1 to 1.10, with 1.10 the latest", () => {
    expect([...SUPPORTED_VERSIONS]).toEqual([
      "0.1",
      "0.2",
      "0.3",
      "1.0",
      "1.1",
      "1.2",
      "1.3",
      "1.4",
      "1.5",
      "1.6",
      "1.7",
      "1.8",
      "1.9",
      "1.10",
    ]);
    expect(LATEST_VERSION).toBe("1.10");
  });

  it("reads each supported version against its own schema", () => {
    expect(validateIr(load("minimal.json"))).toEqual({ ok: true, errors: [] });
    expect(validateIr(load("content-nodes.json"))).toEqual({
      ok: true,
      errors: [],
    });
    expect(validateIr(load("timeline.json"))).toEqual({ ok: true, errors: [] });
    expect(validateIr(load("v1.json"))).toEqual({ ok: true, errors: [] });
    expect(validateIr(load("v1.1.json"))).toEqual({ ok: true, errors: [] });
    expect(validateIr(load("v1.2.json"))).toEqual({ ok: true, errors: [] });
    expect(validateIr(load("v1.3.json"))).toEqual({ ok: true, errors: [] });
    expect(validateIr(load("v1.4.json"))).toEqual({ ok: true, errors: [] });
    expect(validateIr(load("v1.5.json"))).toEqual({ ok: true, errors: [] });
    expect(validateIr(load("v1.6.json"))).toEqual({ ok: true, errors: [] });
  });

  it("rejects schemaVersion 2.0 with E_IR_UNSUPPORTED_VERSION, naming the supported versions", () => {
    expect(validateIr({ ...load("v1.json"), schemaVersion: "2.0" })).toEqual(
      UNSUPPORTED,
    );
  });

  it.each([1, "1", "1.0.0", "v1.0", "1.00", "", null])(
    "rejects schemaVersion %j as unsupported, not as a schema error",
    (value) => {
      const result = validateIr({ ...load("v1.json"), schemaVersion: value });
      expect(result.ok).toBe(false);
      expect(result.ok ? [] : result.errors.map((e) => e.code)).toEqual([
        "E_IR_UNSUPPORTED_VERSION",
      ]);
    },
  );

  it("reports only the version error when the rest of the manifest is also wrong", () => {
    const json = { ...load("v1.json"), schemaVersion: "2.0", extra: true };
    expect(validateIr(json)).toEqual(UNSUPPORTED);
  });

  it("reports a missing schemaVersion as required, without a version code", () => {
    const json = load("minimal.json");
    delete json["schemaVersion"];
    expect(validateIr(json)).toEqual({
      ok: false,
      errors: [{ path: "/schemaVersion", message: "is required" }],
    });
  });
});
