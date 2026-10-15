// IR 1.1 over the golden manifests (ADR-0007, ADR-0011): every expected.json in
// tests/fixtures/projects that describes an IR is version 1.1, validates
// against ir-1.1.json, and records the generator versions the filter writes.
// The golden tests (minimal-filter, content-nodes, front-matter, scene-lines)
// check that the filter writes these exact files.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { validateIr } from "@quarto-video/ir";

const FIXTURES = fileURLToPath(
  new URL("../fixtures/projects", import.meta.url),
);
const GENERATOR = fileURLToPath(
  new URL("../../_extensions/video/lib/generator.lua", import.meta.url),
);

/** The extension and CLI versions the filter writes (lib/generator.lua). */
function expectedGenerator(): { extension: string; cli: string } {
  const lua = readFileSync(GENERATOR, "utf8");
  const extension = lua.match(/M\.extension = "([^"]+)"/)?.[1];
  const cli = lua.match(/M\.cli = "([^"]+)"/)?.[1];
  assert.ok(extension && cli, "generator.lua names both versions");
  return { extension, cli };
}

/** Each fixture whose expected.json is an IR manifest, by fixture name. */
function goldenManifests(): [string, Record<string, unknown>][] {
  return readdirSync(FIXTURES).flatMap((name) => {
    const file = join(FIXTURES, name, "expected.json");
    if (!existsSync(file)) return [];
    const json = JSON.parse(readFileSync(file, "utf8")) as Record<
      string,
      unknown
    >;
    return "schemaVersion" in json ? [[name, json]] : [];
  });
}

describe("IR 1.1 golden manifests", () => {
  const golden = goldenManifests();

  it("finds the golden IR fixtures", () => {
    assert.ok(golden.length >= 6, `found ${golden.length}`);
  });

  for (const [name, json] of golden) {
    it(`${name}: is IR 1.1, validates, and records the generator versions`, () => {
      assert.equal(json["schemaVersion"], "1.1");
      assert.deepEqual(validateIr(json), { ok: true, errors: [] });
      assert.deepEqual(json["generator"], expectedGenerator());
    });
  }
});
