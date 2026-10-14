// Asset resolution against files (ADR-0006). Each test builds its own project
// in a temp directory, so no fixture depends on the caller's cwd, and symlinks
// are created there, never committed.
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveAsset } from "../src/assets/resolve.js";

let scratch: string;
let root: string;
let outside: string;

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "qv-assets-"));
  root = join(scratch, "project");
  outside = join(scratch, "outside");
  mkdirSync(join(root, "assets", "sub"), { recursive: true });
  mkdirSync(outside);
  writeFileSync(join(root, "assets", "x.png"), "");
  writeFileSync(join(root, "assets", "sub", "y.png"), "");
  writeFileSync(join(outside, "secret.png"), "");
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("resolveAsset", () => {
  it("accepts an existing file and returns its normalised path", () => {
    expect(resolveAsset(root, "./assets/x.png")).toEqual({
      ok: true,
      path: "assets/x.png",
    });
    expect(resolveAsset(root, "assets/sub/y.png")).toEqual({
      ok: true,
      path: "assets/sub/y.png",
    });
  });

  it("reports a missing file as E_ASSET_MISSING with its path", () => {
    const result = resolveAsset(root, "assets/demo.png");
    expect(result).toMatchObject({
      ok: false,
      code: "E_ASSET_MISSING",
      assetPath: "assets/demo.png",
    });
  });

  it("reports a directory as missing, since it is not a file", () => {
    expect(resolveAsset(root, "assets/sub")).toMatchObject({
      code: "E_ASSET_MISSING",
    });
  });

  it("matches the letter case of every segment exactly", () => {
    expect(resolveAsset(root, "assets/X.png")).toMatchObject({
      code: "E_ASSET_MISSING",
    });
    expect(resolveAsset(root, "Assets/x.png")).toMatchObject({
      code: "E_ASSET_MISSING",
    });
  });

  it("matches non-ASCII names without Unicode normalisation", () => {
    writeFileSync(join(root, "assets", "ünïcode.png"), "");
    expect(resolveAsset(root, "assets/ünïcode.png")).toMatchObject({
      ok: true,
    });
    const decomposed = "assets/ünïcode.png";
    expect(resolveAsset(root, decomposed)).toMatchObject({
      code: "E_ASSET_MISSING",
    });
  });

  it("rejects a symlink to a file outside the root as E_ASSET_SYMLINK", () => {
    symlinkSync(join(outside, "secret.png"), join(root, "assets", "link.png"));
    const result = resolveAsset(root, "assets/link.png");
    expect(result).toMatchObject({
      ok: false,
      code: "E_ASSET_SYMLINK",
      assetPath: "assets/link.png",
    });
    expect(JSON.stringify(result)).not.toContain(outside);
  });

  it("rejects a path through a directory symlink that leaves the root", () => {
    symlinkSync(outside, join(root, "assets", "linked"));
    expect(resolveAsset(root, "assets/linked/secret.png")).toMatchObject({
      code: "E_ASSET_SYMLINK",
    });
  });

  it("accepts a symlink whose target stays inside the root", () => {
    symlinkSync(
      join(root, "assets", "x.png"),
      join(root, "assets", "alias.png"),
    );
    expect(resolveAsset(root, "assets/alias.png")).toEqual({
      ok: true,
      path: "assets/alias.png",
    });
  });

  it("reports a dangling symlink as missing, not as an escape", () => {
    symlinkSync(
      join(outside, "gone.png"),
      join(root, "assets", "dangling.png"),
    );
    expect(resolveAsset(root, "assets/dangling.png")).toMatchObject({
      code: "E_ASSET_MISSING",
    });
  });

  it("checks syntax before touching the file system", () => {
    expect(resolveAsset(root, "../outside/secret.png")).toMatchObject({
      code: "E_ASSET_ESCAPE",
    });
  });
});
