// Root composition. Size, fps and length come from the IR passed as input
// props (calculateMetadata), so the output always matches the manifest.
import type { IrVideo as IrManifest } from "@quarto-video/ir";
import { timelineOf } from "@quarto-video/ir/timeline";
import type { FC } from "react";
import { Composition, type CalculateMetadataFunction } from "remotion";
import { IrVideo, type IrVideoProps } from "./IrVideo.js";

export const COMPOSITION_ID = "video";

// Studio preview only; render() always passes the real manifest as input props.
const PREVIEW_IR: IrManifest = {
  schemaVersion: "1.0",
  type: "video",
  settings: { width: 1920, height: 1080, fps: 30, background: "#10131C" },
  generator: { extension: "0.1.0", cli: "0.0.0" },
  scenes: [
    {
      id: "scene-001",
      component: "title",
      durationFrames: 30,
      content: {
        slots: {
          default: [
            { type: "paragraph", inlines: [{ type: "text", text: "Preview" }] },
          ],
        },
      },
      source: { file: "index.qmd" },
    },
  ],
  timeline: {
    durationFrames: 30,
    scenes: [{ id: "scene-001", startFrame: 0 }],
  },
};

export const calculateIrMetadata: CalculateMetadataFunction<IrVideoProps> = ({
  props,
}) => {
  const { ir } = props;
  return {
    width: ir.settings.width,
    height: ir.settings.height,
    fps: ir.settings.fps,
    durationInFrames: timelineOf(ir).durationFrames,
    props,
  };
};

export const RemotionRoot: FC = () => (
  <Composition
    id={COMPOSITION_ID}
    component={IrVideo}
    defaultProps={{ ir: PREVIEW_IR }}
    calculateMetadata={calculateIrMetadata}
    width={PREVIEW_IR.settings.width}
    height={PREVIEW_IR.settings.height}
    fps={PREVIEW_IR.settings.fps}
    durationInFrames={30}
  />
);
