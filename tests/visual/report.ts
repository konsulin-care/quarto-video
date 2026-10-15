// HTML report for a visual run (task 020): one block per case frame, showing the
// approved reference, the new render and the diff, with the numbers behind the
// verdict. Image paths are relative to the report directory, so the folder can
// be opened or uploaded as-is.
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface FrameResult {
  case: string;
  frame: number;
  status: "pass" | "fail";
  /** One line for people: the numbers, or why the frame could not be compared. */
  message: string;
  /** Relative to the report directory; absent when there is nothing to show. */
  images: { reference?: string; actual?: string; diff?: string };
}

function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function figure(label: string, src: string | undefined): string {
  if (src === undefined) {
    return `<figure><figcaption>${label}</figcaption><p class="none">none</p></figure>`;
  }
  return `<figure><figcaption>${label}</figcaption><img src="${escape(src)}" alt="${escape(label)}"></figure>`;
}

function section(result: FrameResult): string {
  const title = `${escape(result.case)} · frame ${result.frame}`;
  return [
    `<section class="${result.status}">`,
    `<h2>${title} <span class="badge">${result.status.toUpperCase()}</span></h2>`,
    `<p>${escape(result.message)}</p>`,
    '<div class="row">',
    figure("Reference", result.images.reference),
    figure("Actual", result.images.actual),
    figure("Diff (red = changed)", result.images.diff),
    "</div>",
    "</section>",
  ].join("\n");
}

/** Writes index.html into reportDir and returns its path. */
export async function writeReport(
  reportDir: string,
  results: FrameResult[],
): Promise<string> {
  const failed = results.filter((r) => r.status === "fail").length;
  const summary =
    failed === 0
      ? `${results.length} frame(s) match their references.`
      : `${failed} of ${results.length} frame(s) differ from their references.`;
  const html = [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Visual regression report</title>",
    "<style>",
    ":root { color-scheme: light dark; --ink: #1b1f2a; --paper: #f6f7f9; --ok: #2e7d32; --bad: #c62828; }",
    "body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; background: var(--paper); color: var(--ink); }",
    "section { border: 1px solid #c8ccd4; border-radius: 8px; padding: 12px; margin-bottom: 16px; background: #fff; }",
    "section.fail { border-color: var(--bad); }",
    ".badge { font-size: 12px; padding: 2px 8px; border-radius: 4px; color: #fff; background: var(--ok); vertical-align: middle; }",
    "section.fail .badge { background: var(--bad); }",
    ".row { display: flex; flex-wrap: wrap; gap: 12px; }",
    "figure { margin: 0; flex: 1 1 280px; }",
    "figcaption { font-size: 14px; margin-bottom: 4px; }",
    "img { width: 100%; height: auto; image-rendering: pixelated; border: 1px solid #c8ccd4; }",
    ".none { color: #6b7280; font-style: italic; }",
    "@media (prefers-color-scheme: dark) {",
    "  body { background: #0f1218; color: #e6e9ef; }",
    "  section { background: #1b2030; border-color: #3a4152; }",
    "}",
    "</style></head><body>",
    "<h1>Visual regression report</h1>",
    `<p>${escape(summary)}</p>`,
    ...results.map(section),
    "</body></html>",
    "",
  ].join("\n");
  const file = join(reportDir, "index.html");
  await writeFile(file, html);
  return file;
}
