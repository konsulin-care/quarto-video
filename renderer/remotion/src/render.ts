// render(irPath, outPath): validates the IR, then bundles and encodes it.
// Validation runs first, so an invalid manifest never starts a browser.
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle, type WebpackConfiguration } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { ThemeTokens } from "@quarto-video/registry";
import { validateIr, type IrVideo } from "@quarto-video/ir";
import { COMPOSITION_ID } from "./composition-id.js";
import { COMPONENTS } from "./registry-map.js";
import { IrRenderError } from "./errors.js";
import { canvasBackground } from "../themes/canvas.js";
import { DEFAULT_THEME_ID, themeIds, themeTokens } from "../themes/tokens.js";

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
  /** Theme id (themes/tokens.ts); unset means the default theme. */
  theme?: string;
  /**
   * The author's video.background ("#RRGGBB"). Unset or null draws the
   * theme's background token instead (themes/canvas.ts).
   */
  background?: string | null;
  /**
   * The project root that image `src` paths resolve in (ADR-0006, ADR-0013).
   * It is copied into the bundle as the public directory, so staticFile()
   * finds the files. Unset or null means no public directory.
   */
  assetRoot?: string | null;
  /**
   * Directory the Remotion bundle is built in. The bundle is removed when the
   * call ends, on success or failure. Unset or null: the OS temp directory.
   * The CLI passes the project's .video-build/.
   */
  workDir?: string | null;
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
    const lines = result.errors.map(
      (e) =>
        `  ${e.path || "/"} ${e.code === undefined ? "" : `${e.code} `}${e.message}`,
    );
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

/** Theme and canvas options shared by render() and renderStills(). */
export interface InputOptions {
  /** Theme id (themes/tokens.ts); unset means the default theme. */
  theme?: string;
  /** Explicit video.background, or unset/null for the theme's token. */
  background?: string | null;
  /** Test seam (task 020): tokens to draw instead of the registry's for `theme`. */
  tokens?: ThemeTokens;
}

/** The composition's input props: the IR with its canvas colour, and the theme tokens. */
export function inputPropsFor(
  ir: IrVideo,
  options: InputOptions,
): { ir: IrVideo; theme: ThemeTokens } {
  const themeId = options.theme ?? DEFAULT_THEME_ID;
  if (!themeIds().includes(themeId)) {
    throw new IrRenderError(
      `Unknown theme "${themeId}" (known: ${themeIds().join(", ")})`,
    );
  }
  const tokens = options.tokens ?? themeTokens(themeId);
  const background = canvasBackground(tokens, options.background);
  return {
    ir: { ...ir, settings: { ...ir.settings, background } },
    theme: tokens,
  };
}

/**
 * Bundles the renderer entry point, calls `use` with its serve URL, then removes
 * the bundle whether `use` resolves or rejects. The bundle is built in a fresh
 * directory under `workDir` (default: the OS temp directory). `assetRoot` is the
 * public directory; it is symlinked, not copied, so a bundle inside the project
 * never copies itself.
 */
export async function withBundle<T>(
  assetRoot: string | null,
  workDir: string | null,
  use: (serveUrl: string) => Promise<T>,
): Promise<T> {
  const parent = workDir === null ? tmpdir() : resolve(workDir);
  await mkdir(parent, { recursive: true });
  const outDir = await mkdtemp(join(parent, "remotion-bundle-"));
  try {
    const serveUrl = await bundle({
      ...bundleOptions,
      outDir,
      publicDir: assetRoot === null ? null : resolve(assetRoot),
      symlinkPublicDir: true,
    });
    return await use(serveUrl);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

/** Renders a valid IR file to an H.264 MP4 at outPath. */
export async function render(
  irPath: string,
  outPath: string,
  options: RenderOptions = {},
): Promise<void> {
  const ir = await loadIr(irPath);
  const browserExecutable = options.browserExecutable ?? null;
  const inputProps = inputPropsFor(ir, options);
  const onProgress = options.onProgress;
  await withBundle(
    options.assetRoot ?? null,
    options.workDir ?? null,
    async (serveUrl) => {
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
    },
  );
}
