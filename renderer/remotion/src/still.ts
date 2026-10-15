// renderStills(irPath, outDir, options): captures chosen frames of an IR as PNG
// stills through the same bundle, composition and components as render()
// (PRD §13.3, task 020). A still is f(IR, frame), like every frame (PRD §8.4).
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { renderStill, selectComposition } from "@remotion/renderer";
import { COMPOSITION_ID } from "./composition-id.js";
import { IrRenderError } from "./errors.js";
import {
  inputPropsFor,
  loadIr,
  withBundle,
  type InputOptions,
} from "./render.js";

export interface StillOptions extends InputOptions {
  /** Existing Chromium headless-shell binary. Unset: Remotion's own download. */
  browserExecutable?: string | null;
  /** Frame numbers to capture; each must lie inside the composition. */
  frames: number[];
  /** The project root that image paths resolve in (render.ts, ADR-0013). */
  assetRoot?: string | null;
}

/** Writes <outDir>/<frame>.png for each frame and returns the paths in order. */
export async function renderStills(
  irPath: string,
  outDir: string,
  options: StillOptions,
): Promise<string[]> {
  const ir = await loadIr(irPath);
  const browserExecutable = options.browserExecutable ?? null;
  const inputProps = inputPropsFor(ir, options);
  return withBundle(options.assetRoot ?? null, null, async (serveUrl) => {
    const composition = await selectComposition({
      serveUrl,
      id: COMPOSITION_ID,
      inputProps,
      browserExecutable,
    });
    const dir = resolve(outDir);
    await mkdir(dir, { recursive: true });
    const paths: string[] = [];
    for (const frame of options.frames) {
      if (
        !Number.isInteger(frame) ||
        frame < 0 ||
        frame >= composition.durationInFrames
      ) {
        throw new IrRenderError(
          `frame ${frame} is outside the composition (0..${composition.durationInFrames - 1})`,
        );
      }
      const output = join(dir, `${frame}.png`);
      await renderStill({
        composition,
        serveUrl,
        output,
        frame,
        inputProps,
        imageFormat: "png",
        browserExecutable,
        overwrite: true,
        logLevel: "error",
      });
      paths.push(output);
    }
    return paths;
  });
}
