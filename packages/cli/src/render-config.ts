// Reads the render settings the filter wrote to .video-build/render.json:
// the output destination, the theme name and an explicit canvas background
// (settings kept out of the IR; PRD §5.2). Throws on a bad file.
import { readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { Project } from "./project.js";

const RENDER_RELATIVE = join(".video-build", "render.json");

interface RenderConfig {
  output?: unknown;
  theme?: unknown;
  background?: unknown;
}

function readRenderConfig(project: Project): RenderConfig {
  const text = readFileSync(join(project.root, RENDER_RELATIVE), "utf8");
  return JSON.parse(text) as RenderConfig;
}

/** Absolute output path: `video.output` resolved against the project root. */
export function outputPath(project: Project): string {
  const output = readRenderConfig(project).output;
  if (typeof output !== "string" || output === "" || isAbsolute(output)) {
    throw new Error("the filter wrote no usable video.output");
  }
  const target = resolve(project.root, output);
  if (relative(project.root, target).startsWith("..")) {
    throw new Error(`video.output leaves the project: ${output}`);
  }
  return target;
}

/** The `theme` name from front matter, or null when the document names none. */
export function themeName(project: Project): string | null {
  const theme = readRenderConfig(project).theme;
  return typeof theme === "string" ? theme : null;
}

/** The `video.background` the author set, or null: the theme then draws the canvas. */
export function explicitBackground(project: Project): string | null {
  const background = readRenderConfig(project).background;
  return typeof background === "string" ? background : null;
}
