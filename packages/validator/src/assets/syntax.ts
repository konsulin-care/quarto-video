// Asset path syntax (ADR-0006): a pure check of the author's text, before any
// file system access. An accepted path is project-relative, written with
// forward slashes, and normalised (`./` and empty segments removed). Each
// rejected form has its own code. No decoding, no case folding, no Unicode
// normalisation: the name must match the file exactly.
import type { DiagnosticCode } from "../diagnostic.js";

export type AssetCode = Extract<
  DiagnosticCode,
  | "E_ASSET_MISSING"
  | "E_ASSET_ABSOLUTE"
  | "E_ASSET_ESCAPE"
  | "E_ASSET_SYMLINK"
  | "E_ASSET_URL"
  | "E_ASSET_INVALID"
  | "E_MEDIA_FORMAT"
  | "E_MEDIA_UNREADABLE"
>;

/** A rejected path: the code, a message and a suggestion (no path is printed when `assetPath` is absent). */
export interface AssetProblem {
  ok: false;
  code: AssetCode;
  message: string;
  suggestion: string;
  /** The author's text, when it is safe to print (never an absolute path). */
  assetPath?: string;
}

export type SyntaxResult = { ok: true; path: string } | AssetProblem;

const DRIVE = /^[a-zA-Z]:/;
const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]+:/;
const PERCENT = /%[0-9a-fA-F]{2}/;

/** True for a C0 control character or DEL. */
function hasControl(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function problem(
  code: AssetCode,
  message: string,
  suggestion: string,
  assetPath?: string,
): AssetProblem {
  return {
    ok: false,
    code,
    message,
    suggestion,
    ...(assetPath === undefined ? {} : { assetPath }),
  };
}

/** Checks the text of one asset reference and returns its normalised path. */
export function checkAssetSyntax(raw: string): SyntaxResult {
  const relative =
    "Use a path relative to the project root, for example assets/image.png.";
  if (raw.trim() === "") {
    return problem("E_ASSET_INVALID", "An asset path is empty.", relative);
  }
  // An absolute path is outside the project by definition. Its text is not
  // echoed, so the diagnostic never prints a path from the author's machine.
  if (raw.startsWith("/") || raw.startsWith("\\") || DRIVE.test(raw)) {
    return problem(
      "E_ASSET_ABSOLUTE",
      "An asset path is absolute, so it is outside the project root.",
      relative,
    );
  }
  const scheme = SCHEME.exec(raw);
  if (scheme !== null) {
    return problem(
      "E_ASSET_URL",
      `Asset "${raw}" is a URL ("${scheme[0]}"). Remote assets are not supported; the validator never uses the network.`,
      "Put the file in the project and reference it by a relative path.",
      raw,
    );
  }
  if (hasControl(raw)) {
    return problem(
      "E_ASSET_INVALID",
      `Asset "${raw}" contains a control character.`,
      "Rename the file so its name has only printable characters.",
      raw,
    );
  }
  if (raw.includes("\\")) {
    return problem(
      "E_ASSET_INVALID",
      `Asset "${raw}" uses backslashes.`,
      "Use forward slashes (/) as separators.",
      raw,
    );
  }
  if (PERCENT.test(raw)) {
    return problem(
      "E_ASSET_INVALID",
      `Asset "${raw}" contains a percent-encoded sequence. Percent-encoding is not decoded.`,
      "Write the file name literally, without percent-encoding.",
      raw,
    );
  }
  if (raw.endsWith("/")) {
    return problem(
      "E_ASSET_INVALID",
      `Asset "${raw}" ends with a slash, so it names a directory.`,
      "Name a file, for example assets/image.png.",
      raw,
    );
  }
  const segments: string[] = [];
  for (const part of raw.split("/")) {
    if (part === "..") {
      return problem(
        "E_ASSET_ESCAPE",
        `Asset "${raw}" uses ".." and so is outside the project root.`,
        'Reference the file from inside the project root, without ".." segments.',
        raw,
      );
    }
    if (part !== "" && part !== ".") segments.push(part);
  }
  if (segments.length === 0) {
    return problem(
      "E_ASSET_INVALID",
      `Asset "${raw}" does not name a file.`,
      relative,
      raw,
    );
  }
  return { ok: true, path: segments.join("/") };
}
