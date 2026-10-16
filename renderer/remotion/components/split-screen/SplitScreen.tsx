// `split-screen` component (task 043; contract: packages/registry/components/split-screen.json;
// ADR-0016). Each drawn region is one column of the canvas safe area
// (regionColumns, in REGION_ORDER). A region draws its footage, clipped to its
// column, or its text in the column (TextColumn). A region holds one of the two
// (the validator's rule). Footage is never framed here; its `fit` frames it.
import type { IrMediaVideo } from "@quarto-video/ir";
import type { TextFit } from "@quarto-video/registry";
import { regionColumns, type Rect } from "@quarto-video/registry/layout";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useTheme } from "../../themes/ThemeProvider.js";
import { Footage } from "../../media/Video.js";
import { TextColumn } from "../shared/TextColumn.js";
import { drawnRegions } from "./regions.js";

/** The type-scale range region text is fitted in (the contract has no textFit, task 043). */
export const REGION_TEXT_FIT: TextFit = { max: "title", min: "body" };

export interface SplitScreenProps {
  /** Plain text by slot name: each region's text. */
  slots: Readonly<Record<string, string>>;
  /** Each region's footage by region name (IR 1.7, ADR-0016). */
  regions?: Readonly<Record<string, IrMediaVideo>> | undefined;
}

/** A region's footage, filling its column and clipped to it. */
function RegionFootage({ media, box }: { media: IrMediaVideo; box: Rect }) {
  return (
    <div
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        overflow: "hidden",
      }}
    >
      <Footage media={media} />
    </div>
  );
}

export function SplitScreen({ slots, regions = {} }: SplitScreenProps) {
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const names = drawnRegions(slots, regions);
  const columns = regionColumns(theme, width, height, names.length);
  return (
    <AbsoluteFill>
      {names.map((name, index) => {
        const box = columns[index];
        if (box === undefined) return null;
        const media = regions[name];
        return media !== undefined ? (
          <RegionFootage key={name} media={media} box={box} />
        ) : (
          <TextColumn
            key={name}
            text={slots[name] ?? ""}
            box={box}
            fit={REGION_TEXT_FIT}
          />
        );
      })}
    </AbsoluteFill>
  );
}
