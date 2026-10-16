// Decoded-audio helpers for the integration tests (task 045): the output's sound
// as mono float PCM, and two level measures over a window of samples. Pure except
// for the ffmpeg decode, which reads the file as data.
import { spawnSync } from "node:child_process";

/** The sample rate the output is decoded at: exact for 30 fps (1470 samples a frame). */
export const SAMPLE_RATE = 44100;

/** The output's first audio stream, left channel, as float32 samples at SAMPLE_RATE (no downmix gain). */
export function decodeMono(file: string): Float32Array {
  const run = spawnSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      file,
      "-vn",
      "-af",
      "pan=mono|c0=c0",
      "-ar",
      String(SAMPLE_RATE),
      "-f",
      "f32le",
      "-",
    ],
    { maxBuffer: 256 * 1024 * 1024 },
  );
  if (run.status !== 0 || run.stdout === undefined) {
    throw new Error(`ffmpeg could not decode the audio of ${file}`);
  }
  const bytes = Buffer.from(run.stdout);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Float32Array(copy.buffer);
}

/**
 * The amplitude, in dB, of the sine at `hz` in `length` samples from `start`
 * (Goertzel). A full-scale sine of amplitude 1 reads 0 dB.
 */
export function goertzelDb(
  pcm: Float32Array,
  start: number,
  length: number,
  hz: number,
): number {
  const coefficient = 2 * Math.cos((2 * Math.PI * hz) / SAMPLE_RATE);
  let previous = 0;
  let beforePrevious = 0;
  for (let n = 0; n < length; n++) {
    const sample = pcm[start + n] ?? 0;
    const current = sample + coefficient * previous - beforePrevious;
    beforePrevious = previous;
    previous = current;
  }
  const power =
    beforePrevious * beforePrevious +
    previous * previous -
    coefficient * previous * beforePrevious;
  const amplitude = (2 * Math.sqrt(Math.max(power, 0))) / length;
  return 20 * Math.log10(Math.max(amplitude, 1e-12));
}

/** The RMS level, in dB, of `length` samples from `start`. */
export function rmsDb(
  pcm: Float32Array,
  start: number,
  length: number,
): number {
  let sum = 0;
  for (let n = 0; n < length; n++) {
    const sample = pcm[start + n] ?? 0;
    sum += sample * sample;
  }
  return 10 * Math.log10(Math.max(sum / length, 1e-24));
}
