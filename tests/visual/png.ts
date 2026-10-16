// PNG I/O for the visual harness. Decoding and encoding go through the pinned
// ffmpeg (mise.toml), so the harness adds no npm dependency. Pixels are packed
// rgb24 rows, three bytes per pixel, top row first.
import { spawn } from "node:child_process";
import { open } from "node:fs/promises";

export interface Rgb {
  width: number;
  height: number;
  /** width * height * 3 bytes. */
  data: Buffer;
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** Width and height from the IHDR chunk; throws when the file is not a PNG. */
export async function pngSize(
  file: string,
): Promise<{ width: number; height: number }> {
  const handle = await open(file, "r");
  try {
    const head = Buffer.alloc(24);
    await handle.read(head, 0, 24, 0);
    if (!head.subarray(0, 8).equals(PNG_SIGNATURE)) {
      throw new Error(`not a PNG: ${file}`);
    }
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
  } finally {
    await handle.close();
  }
}

/** Runs ffmpeg with the given args, optionally feeding stdin; resolves to stdout. */
function ffmpeg(args: string[], stdin?: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-v", "error", ...args], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => err.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(out));
      else
        reject(
          new Error(`ffmpeg exited ${code}: ${Buffer.concat(err).toString()}`),
        );
    });
    child.stdin.end(stdin);
  });
}

/** Decodes a PNG to rgb24 pixels. */
export async function readPng(file: string): Promise<Rgb> {
  const { width, height } = await pngSize(file);
  const data = await ffmpeg([
    "-i",
    file,
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgb24",
    "-",
  ]);
  if (data.length !== width * height * 3) {
    throw new Error(`unexpected pixel data size for ${file}`);
  }
  return { width, height, data };
}

/** Encodes rgb24 pixels as a PNG at file. */
export async function writePng(file: string, image: Rgb): Promise<void> {
  await ffmpeg(
    [
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "-s",
      `${image.width}x${image.height}`,
      "-i",
      "-",
      "-frames:v",
      "1",
      "-y",
      file,
    ],
    image.data,
  );
}
