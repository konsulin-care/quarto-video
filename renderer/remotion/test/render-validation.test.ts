import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { IrVideo } from "@quarto-video/ir";
import { IrRenderError, render } from "../src/render.js";

const EXAMPLE = fileURLToPath(
  new URL("../../../packages/ir/examples/minimal.json", import.meta.url),
);
// A browser path that does not exist: if validation ran after launch, the
// error would name the browser instead of the IR path.
const NO_BROWSER = { browserExecutable: "/nonexistent/no-browser" };

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "render-validation-"));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

/** Writes a copy of the minimal example, edited by `edit`, and returns its path. */
async function writeVariant(
  name: string,
  edit: (ir: IrVideo) => void,
): Promise<string> {
  const ir = JSON.parse(await readFile(EXAMPLE, "utf8")) as IrVideo;
  edit(ir);
  const path = join(dir, `${name}.json`);
  await writeFile(path, JSON.stringify(ir));
  return path;
}

describe("render validation", () => {
  it("rejects durationFrames 0 with its JSON path before launching a browser", async () => {
    const ir = await writeVariant("zero-duration", (ir) => {
      ir.scenes[0]!.durationFrames = 0;
    });
    const out = join(dir, "zero-duration.mp4");
    const failure = render(ir, out, NO_BROWSER);
    await expect(failure).rejects.toBeInstanceOf(IrRenderError);
    await expect(failure).rejects.toThrow("/scenes/0/durationFrames");
  });

  it("rejects an unknown component with its JSON path", async () => {
    const ir = await writeVariant("unknown-component", (ir) => {
      ir.scenes[0]!.component = "hero-title";
    });
    const out = join(dir, "unknown-component.mp4");
    await expect(render(ir, out, NO_BROWSER)).rejects.toThrow(
      '/scenes/0/component unknown component "hero-title"',
    );
  });

  it("rejects a malformed JSON file without launching a browser", async () => {
    const path = join(dir, "broken.json");
    await writeFile(path, "{ not json");
    const out = join(dir, "broken.mp4");
    await expect(render(path, out, NO_BROWSER)).rejects.toThrow(
      "Cannot read IR",
    );
  });
});
