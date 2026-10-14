import { describe, expect, it } from "vitest";
import { parseDiagnostics } from "../src/index.js";

const VALID = {
  severity: "error",
  code: "E_DURATION_SYNTAX",
  message: 'duration "1.5s" must be whole seconds like "4s"',
  file: "index.qmd",
  sceneId: "scene-001",
  property: "duration",
  suggestion: 'Write whole seconds, for example duration="4s".',
};

describe("diagnostics JSON schema (schema/diagnostic.json)", () => {
  it("accepts an array of valid diagnostics", () => {
    expect(parseDiagnostics(JSON.stringify([VALID]))).toEqual([VALID]);
  });

  it("rejects text that is not JSON", () => {
    expect(parseDiagnostics("ERROR index.qmd")).toBeNull();
  });

  it("rejects a single object, which is not the array form", () => {
    expect(parseDiagnostics(JSON.stringify(VALID))).toBeNull();
  });

  it("rejects an unknown field", () => {
    const extra = { ...VALID, stack: "trace" };
    expect(parseDiagnostics(JSON.stringify([extra]))).toBeNull();
  });

  it("rejects a severity other than error or warning", () => {
    const bad = { ...VALID, severity: "fatal" };
    expect(parseDiagnostics(JSON.stringify([bad]))).toBeNull();
  });

  it("rejects a code that does not look like a stable code", () => {
    const bad = { ...VALID, code: "duration-error" };
    expect(parseDiagnostics(JSON.stringify([bad]))).toBeNull();
  });

  it("rejects a missing message", () => {
    const withoutMessage: Partial<typeof VALID> = { ...VALID };
    delete withoutMessage.message;
    expect(parseDiagnostics(JSON.stringify([withoutMessage]))).toBeNull();
  });

  it("rejects a line below 1", () => {
    const bad = { ...VALID, line: 0 };
    expect(parseDiagnostics(JSON.stringify([bad]))).toBeNull();
  });
});
