// render(irPath, outPath): validates the IR, then bundles and encodes it.
// Validation runs first, so an invalid manifest never starts a browser.
import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle, type WebpackConfiguration } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { validateIr, type IrVideo } from "@quarto-video/ir";
import { COMPOSITION_ID } from "./Root.js";
import { COMPONENTS } from "./registry-map.js";
import { IrRenderError } from "./errors.js";

export { IrRenderError } from "./errors.js";

/** Encoding progress: frames written so far out of the composition length. */
export interface RenderProgress {
  encodedFrames: number;
  totalFrames: number;
}

export interface RenderOptions {
  /** Existing Chromium headless-shell binary. Unset: Remotion's own download. */
  browserExecutable?: string | null;
  /** Called as frames are encoded (may be called many times). */
  onProgress?: (progress: RenderProgress) => void;
}

/** Signature of render(); the CLI depends on this shape, not the module. */
export type RenderFn = (
  irPath: string,
  outPath: string,
  options?: RenderOptions,
) => Promise<void>;

const ENTRY_POINT = fileURLToPath(new URL("./entry.ts", import.meta.url));

// Sources use NodeNext-style "./x.js" imports; webpack must map them to .ts/.tsx.
const bundleOptions = {
  entryPoint: ENTRY_POINT,
  webpackOverride: (config: WebpackConfiguration): WebpackConfiguration => ({
    ...config,
    resolve: {
      ...config.resolve,
      extensionAlias: { ".js": [".ts", ".tsx", ".js"] },
    },
  }),
};

/** Reads and validates an IR file. Throws IrRenderError with JSON paths. */
export async function loadIr(irPath: string): Promise<IrVideo> {
  const file = resolve(irPath);
  let json: unknown;
  try {
    json = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new IrRenderError(`Cannot read IR ${file}: ${reason}`);
  }
  const result = validateIr(json);
  if (!result.ok) {
    const lines = result.errors.map((e) => `  ${e.path || "/"} ${e.message}`);
    throw new IrRenderError(`Invalid IR ${file}:\n${lines.join("\n")}`);
  }
  const ir = json as IrVideo;
  const unknown = ir.scenes.flatMap((scene, index) =>
    scene.component in COMPONENTS
      ? []
      : [`  /scenes/${index}/component unknown component "${scene.component}"`],
  );
  if (unknown.length > 0) {
    throw new IrRenderError(`Invalid IR ${file}:\n${unknown.join("\n")}`);
  }
  return ir;
}

/** Renders a valid IR file to an H.264 MP4 at outPath. */
export async function render(
  irPath: string,
  outPath: string,
  options: RenderOptions = {},
): Promise<void> {
  const ir = await loadIr(irPath);
  const browserExecutable = options.browserExecutable ?? null;
  const inputProps = { ir };
  const onProgress = options.onProgress;
  const serveUrl = await bundle(bundleOptions);
  const composition = await selectComposition({
    serveUrl,
    id: COMPOSITION_ID,
    inputProps,
    browserExecutable,
  });
  const output = resolve(outPath);
  await mkdir(dirname(output), { recursive: true });
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: output,
    inputProps,
    browserExecutable,
    logLevel: "error",
    onProgress: ({ encodedFrames }) =>
      onProgress?.({
        encodedFrames,
        totalFrames: composition.durationInFrames,
      }),
  });
}
