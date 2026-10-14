// The renderer `video render` calls: the public render() of
// @quarto-video/remotion (renderer/remotion/README.md), loaded only when a
// render runs. QV_TEST_RENDERER is a test-only seam (packages/cli/README.md):
// it names a module whose `render` export replaces the real renderer.
import { pathToFileURL } from "node:url";
import type { RenderFn } from "@quarto-video/remotion";

export async function selectRenderer(
  env: NodeJS.ProcessEnv = process.env,
): Promise<RenderFn> {
  const hook = env["QV_TEST_RENDERER"];
  const module = hook
    ? ((await import(pathToFileURL(hook).href)) as { render?: unknown })
    : ((await import("@quarto-video/remotion")) as { render?: unknown });
  if (typeof module.render !== "function") {
    throw new Error(
      `${hook ?? "@quarto-video/remotion"} exports no render function`,
    );
  }
  return module.render as RenderFn;
}
