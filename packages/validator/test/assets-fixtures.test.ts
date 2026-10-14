// Fixture-driven asset resolution: every case in
// tests/fixtures/projects/assets-names/expected.json resolves to its expected
// normalised path or code (ADR-0006). The fixture root is found from this file,
// so the test does not depend on the caller's cwd.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveAsset } from "../src/assets/resolve.js";

const FIXTURE = fileURLToPath(
  new URL("../../../tests/fixtures/projects/assets-names/", import.meta.url),
);

interface Expected {
  accepted: { path: string; normalised: string }[];
  rejected: { path: string; code: string }[];
}

const expected = JSON.parse(
  readFileSync(`${FIXTURE}expected.json`, "utf8"),
) as Expected;

describe("assets-names fixture", () => {
  it.each(expected.accepted.map((c) => [c.path, c.normalised] as const))(
    "accepts %j as %s",
    (path, normalised) => {
      expect(resolveAsset(FIXTURE, path)).toEqual({
        ok: true,
        path: normalised,
      });
    },
  );

  it.each(expected.rejected.map((c) => [c.path, c.code] as const))(
    "rejects %j with %s",
    (path, code) => {
      expect(resolveAsset(FIXTURE, path)).toMatchObject({ ok: false, code });
    },
  );
});
