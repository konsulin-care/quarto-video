// Stage 2 check of a `.video` block's frame (task 040; PRD §5.5, §6.1). A framed
// block's `frame` must name a registered device frame; the message lists them.
// It runs on the raw manifest, before the IR schema: the schema's frame enum
// (IR 1.6, frozen) mirrors the registry, and a parity test keeps them equal.
// Pure: the frames come in as data, and a malformed scene is skipped (the
// schema reports it).
import type { FrameContract } from "@quarto-video/registry";
import type { Diagnostic } from "../diagnostic.js";

/** The source of a raw scene, as far as this check reads it. */
interface RawSource {
  file?: unknown;
  line?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** E_MEDIA_FRAME for each framed `.video` block whose frame is not registered. */
export function checkMediaFrames(
  json: unknown,
  file: string,
  frames: readonly FrameContract[],
): Diagnostic[] {
  if (!isRecord(json) || !Array.isArray(json["scenes"])) return [];
  const known = frames.map((frame) => frame.id).sort();
  const registered = known.join(", ");
  return json["scenes"].flatMap((scene: unknown): Diagnostic[] => {
    if (!isRecord(scene) || !Array.isArray(scene["media"])) return [];
    const source: RawSource = isRecord(scene["source"]) ? scene["source"] : {};
    return scene["media"].flatMap((item: unknown): Diagnostic[] => {
      if (!isRecord(item) || item["placement"] !== "framed") return [];
      const frame = item["frame"];
      if (typeof frame !== "string" || known.includes(frame)) return [];
      return [
        {
          severity: "error",
          code: "E_MEDIA_FRAME",
          message: `Unknown frame "${frame}" on a framed video block.`,
          file: typeof source.file === "string" ? source.file : file,
          ...(typeof source.line === "number" ? { line: source.line } : {}),
          ...(typeof scene["id"] === "string" ? { sceneId: scene["id"] } : {}),
          property: "frame",
          suggestion: `Registered frames: ${registered}.`,
        },
      ];
    });
  });
}
