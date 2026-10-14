// Turns a manifest file's text into `ir:check` output lines (pure).
import { validateIr } from "./validate.js";

export interface CheckOutput {
  ok: boolean;
  /** "OK", or one `<json-path>: <message>` line per error. */
  lines: string[];
}

/** Parses JSON text and validates it against the IR version it declares. */
export function checkIrText(text: string): CheckOutput {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, lines: [`(root): not valid JSON: ${reason}`] };
  }
  const result = validateIr(json);
  if (result.ok) return { ok: true, lines: ["OK"] };
  const lines = result.errors.map(
    (e) =>
      `${e.path === "" ? "(root)" : e.path}: ${e.code === undefined ? "" : `${e.code} `}${e.message}`,
  );
  return { ok: false, lines };
}
