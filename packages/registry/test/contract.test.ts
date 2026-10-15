import { readFileSync } from "node:fs";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import {
  loadComponentDir,
  parseContract,
  RegistryError,
} from "../src/index.js";

const COMPONENTS = fileURLToPath(new URL("../components", import.meta.url));
const SCRATCH = mkdtempSync(join(tmpdir(), "registry-contracts-"));

afterAll(() => rmSync(SCRATCH, { recursive: true, force: true }));

/** A valid contract for `id`; tests change one field at a time. */
function contract(id = "sample"): Record<string, unknown> {
  return {
    id,
    version: "1.0.0",
    purpose: "A sample component used by the contract tests.",
    slots: { default: { required: true, accepts: ["paragraph"] } },
    props: {},
    placements: [],
    compatibleAnimations: [],
    compatibleTransitions: [],
    duration: { minMs: 1000, maxMs: 5000 },
    accessibility: "Text only.",
  };
}

function parse(value: unknown, file = "sample.json"): void {
  parseContract(JSON.stringify(value), file);
}

describe("shipped contracts", () => {
  it("every file in components/ validates against contract.json", () => {
    const files = readdirSync(COMPONENTS).filter((name) =>
      name.endsWith(".json"),
    );
    expect(files.length).toBeGreaterThan(0);
    for (const name of files) {
      const text = readFileSync(join(COMPONENTS, name));
      expect(() => parseContract(text.toString("utf8"), name)).not.toThrow();
    }
    expect(loadComponentDir(COMPONENTS).map((c) => c.id)).toEqual(
      files.map((name) => name.replace(/\.json$/, "")),
    );
  });
});

describe("contract schema", () => {
  it("accepts a complete valid contract", () => {
    expect(() => parse(contract())).not.toThrow();
  });

  it("rejects a contract without slots, naming the file and the field", () => {
    const value = contract();
    delete value["slots"];
    expect(() => parse(value, "sample.json")).toThrow(RegistryError);
    expect(() => parse(value, "sample.json")).toThrow(
      /^sample\.json: \(root\): must have required property 'slots'$/,
    );
  });

  it("rejects an unknown top-level field instead of ignoring it", () => {
    expect(() => parse({ ...contract(), colour: "red" })).toThrow(
      /must NOT have additional properties "colour"/,
    );
  });

  it("rejects an unknown slot block kind", () => {
    const value = contract();
    value["slots"] = { default: { required: true, accepts: ["table"] } };
    expect(() => parse(value)).toThrow(/accepts\/0/);
  });

  it("accepts a slot item limit and rejects a maxItems below minItems", () => {
    const value = contract();
    value["slots"] = {
      default: {
        required: true,
        accepts: ["list"],
        items: { minItems: 2, maxItems: 6 },
      },
    };
    expect(() => parse(value)).not.toThrow();
    value["slots"] = {
      default: {
        required: true,
        accepts: ["list"],
        items: { minItems: 3, maxItems: 2 },
      },
    };
    expect(() => parse(value)).toThrow(
      /\/slots\/default\/items: maxItems \(2\) is below minItems \(3\)/,
    );
  });

  it("rejects a numeric prop type (no pixel-like values)", () => {
    const value = contract();
    value["props"] = { width: { type: "number" } };
    expect(() => parse(value)).toThrow(/props\/width\/type/);
  });

  it("rejects an enum prop without its enum list", () => {
    const value = contract();
    value["props"] = { fit: { type: "enum" } };
    expect(() => parse(value)).toThrow(/props\/fit/);
  });

  it("rejects an enum list on a non-enum prop", () => {
    const value = contract();
    value["props"] = { label: { type: "string", enum: ["a"] } };
    expect(() => parse(value)).toThrow(/props\/label/);
  });

  it("rejects a placement outside the PRD vocabulary", () => {
    expect(() => parse({ ...contract(), placements: ["left"] })).toThrow(
      /placements\/0/,
    );
  });

  it("rejects an id that is not lowercase kebab-case", () => {
    expect(() => parse(contract("Sample"), "Sample.json")).toThrow(/\/id/);
  });

  it("rejects non-integer duration bounds", () => {
    const value = contract();
    value["duration"] = { minMs: 1.5, maxMs: 5000 };
    expect(() => parse(value)).toThrow(/duration\/minMs/);
  });

  it("rejects a maximum duration below the minimum", () => {
    const value = contract();
    value["duration"] = { minMs: 5000, maxMs: 1000 };
    expect(() => parse(value)).toThrow(
      /maxMs \(1000\) is below minMs \(5000\)/,
    );
  });

  it("rejects an id that does not match its file name", () => {
    expect(() => parse(contract("other"), "sample.json")).toThrow(
      /must match the file name/,
    );
  });

  it("rejects text that is not JSON", () => {
    expect(() => parseContract("{ nope", "broken.json")).toThrow(
      /broken\.json: not valid JSON/,
    );
  });
});

describe("contract directories", () => {
  it("rejects a directory entry that is not an <id>.json file", () => {
    const dir = mkdtempSync(join(SCRATCH, "stray-"));
    writeFileSync(join(dir, "notes.txt"), "not a contract");
    expect(() => loadComponentDir(dir)).toThrow(
      /notes\.txt: only <id>\.json contract files belong here/,
    );
  });
});
