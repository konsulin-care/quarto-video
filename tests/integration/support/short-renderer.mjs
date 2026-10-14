// Test-only renderer for the QV_TEST_RENDERER seam (packages/cli/README.md).
// It writes a real 640x360, 30 fps MP4 with QV_TEST_RENDER_FRAMES frames at
// the temp path, so stage 6 sees a frame count that differs from the IR.
// Frames come from ffmpeg's lavfi colour source; no project code runs.
import { spawnSync } from "node:child_process";
import process from "node:process";

export async function render(irPath, outPath) {
  const frames = Number(process.env["QV_TEST_RENDER_FRAMES"]);
  if (!Number.isInteger(frames) || frames < 1) {
    throw new Error("stub renderer: QV_TEST_RENDER_FRAMES must be a count");
  }
  const result = spawnSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=black:s=640x360:r=30",
      "-frames:v",
      String(frames),
      "-c:v",
      "mpeg4",
      "-pix_fmt",
      "yuv420p",
      outPath,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`stub renderer: ffmpeg failed: ${result.stderr}`);
  }
}
