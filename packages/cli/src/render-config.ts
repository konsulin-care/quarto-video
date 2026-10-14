// Reads the output destination the filter wrote to .video-build/render.json
// (container settings, kept out of the IR; PRD §5.2). Throws on a bad file.
import { readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { Project } from "./project.js";

const RENDER_RELATIVE = join(".video-build", "render.json");

/** Absolute output path: `video.output` resolved against the project root. */
export function outputPath(project: Project): string {
  const text = readFileSync(join(project.root, RENDER_RELATIVE), "utf8");
  const config = JSON.parse(text) as { output?: unknown };
  const output = config.output;
  if (typeof output !== "string" || output === "" || isAbsolute(output)) {
    throw new Error("the filter wrote no usable video.output");
  }
  const target = resolve(project.root, output);
  if (relative(project.root, target).startsWith("..")) {
    throw new Error(`video.output leaves the project: ${output}`);
  }
  return target;
}
