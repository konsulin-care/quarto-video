// Asset path syntax (ADR-0006): each accepted and rejected form, with its code.
// Pure: no file system. Resolution against files is in assets-resolve.test.ts.
import { describe, expect, it } from "vitest";
import { checkAssetSyntax } from "../src/assets/syntax.js";

describe("asset path syntax", () => {
  it.each([
    ["assets/a b.png", "assets/a b.png"],
    ["assets/ünïcode.png", "assets/ünïcode.png"],
    ["./assets/x.png", "assets/x.png"],
    ["assets//nested/./x.png", "assets/nested/x.png"],
  ])("accepts %s and normalises it to %s", (raw, path) => {
    expect(checkAssetSyntax(raw)).toEqual({ ok: true, path });
  });

  it.each([
    ["/etc/passwd", "E_ASSET_ABSOLUTE"],
    ["\\\\server\\share\\x.png", "E_ASSET_ABSOLUTE"],
    ["C:/secret.png", "E_ASSET_ABSOLUTE"],
    ["../../secret.png", "E_ASSET_ESCAPE"],
    ["assets/../../x.png", "E_ASSET_ESCAPE"],
    ["assets/../x.png", "E_ASSET_ESCAPE"],
    ["https://example.com/x.png", "E_ASSET_URL"],
    ["http://example.com/x.png", "E_ASSET_URL"],
    ["file:///etc/passwd", "E_ASSET_URL"],
    ["data:image/png;base64,AA", "E_ASSET_URL"],
    ["assets\\x.png", "E_ASSET_INVALID"],
    ["assets/a%20b.png", "E_ASSET_INVALID"],
    ["assets/x.png\n", "E_ASSET_INVALID"],
    ["assets/", "E_ASSET_INVALID"],
    ["./", "E_ASSET_INVALID"],
    ["   ", "E_ASSET_INVALID"],
  ])("rejects %j with %s", (raw, code) => {
    const result = checkAssetSyntax(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(code);
  });

  it("names the URL scheme in the message", () => {
    const result = checkAssetSyntax("https://example.com/x.png");
    expect(!result.ok && result.message).toContain('"https:"');
  });

  it("does not echo an absolute path, which may lie outside the project", () => {
    const result = checkAssetSyntax("/home/someone/secret.png");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.assetPath).toBeUndefined();
    expect(result.message).not.toContain("someone");
    expect(result.suggestion).not.toContain("someone");
  });

  it("echoes a relative escape, which the author wrote", () => {
    const result = checkAssetSyntax("../../secret.png");
    expect(!result.ok && result.assetPath).toBe("../../secret.png");
  });
});
