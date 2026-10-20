// Check for scripts/fresh-setup.sh (task 051): the MP4 that `video render`
// wrote for videos/demo must match the demo's IR and the frame count that
// `video validate` printed. Exit 0 when it matches, 1 with each mismatch.
// Usage: npx tsx scripts/fresh-setup-check.ts <ir.json> <ffprobe.json> <frames>
import { readFileSync } from "node:fs";

const [irPath, probePath, printedFrames] = process.argv.slice(2);
if (!irPath || !probePath || !printedFrames) {
  console.error(
    "usage: fresh-setup-check.ts <ir.json> <ffprobe.json> <frames>",
  );
  process.exit(2);
}

const ir = JSON.parse(readFileSync(irPath, "utf8"));
const probe = JSON.parse(readFileSync(probePath, "utf8"));
const stream = probe.streams?.[0];
if (!stream) {
  console.error("ffprobe found no video stream");
  process.exit(1);
}

const { width, height, fps } = ir.settings;
const frames = ir.timeline.durationFrames;
const [num, den] = String(stream.r_frame_rate).split("/").map(Number);
const problems = [];
if (String(frames) !== printedFrames) {
  problems.push(
    `validate printed ${printedFrames} frames; the IR has ${frames}`,
  );
}
if (Number(stream.nb_read_frames) !== frames) {
  problems.push(
    `output.mp4 has ${stream.nb_read_frames} frames; the IR has ${frames}`,
  );
}
if (stream.width !== width || stream.height !== height) {
  problems.push(
    `output.mp4 is ${stream.width}x${stream.height}; the IR has ${width}x${height}`,
  );
}
if (!den || num / den !== fps) {
  problems.push(
    `output.mp4 runs at ${stream.r_frame_rate}; the IR has ${fps} fps`,
  );
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`mismatch: ${problem}`);
  process.exit(1);
}
console.log(
  `ok: output.mp4 plays and matches its IR: ${frames} frames, ${width}x${height}, ${fps} fps`,
);
