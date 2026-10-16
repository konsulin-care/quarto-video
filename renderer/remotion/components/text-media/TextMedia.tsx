// `text-media` component (task 042; contract: packages/registry/components/text-media.json).
// The text sits in one column of the canvas safe area and the framed footage in
// the other (textMediaColumns, the geometry the validator also fits with). `side`
// names the footage's side. The text takes the largest size of its range that
// fits its column, wraps inside it and is centred vertically (TextColumn). The
// footage is a device frame in its column (FramedFootage). Colours and sizes come
// from the theme tokens (task 019).
import type { IrMediaVideo } from "@quarto-video/ir";
import type { TextFit } from "@quarto-video/registry";
import { mediaSideOf, textMediaColumns } from "@quarto-video/registry/layout";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useTheme } from "../../themes/ThemeProvider.js";
import { FramedFootage } from "../../media/FramedFootage.js";
import { fitFrame } from "../../media/frames/layout.js";
import { frameContract } from "../../media/frames/tokens.js";
import { TextColumn } from "../shared/TextColumn.js";

/** Mirrors `textFit` in text-media.json; text-media-layout.test.ts checks they agree. */
export const TEXT_FIT: TextFit = { max: "title", min: "body" };

export interface TextMediaProps {
  /** Plain text by slot name: `text`, the one column of words. */
  slots: Readonly<Record<string, string>>;
  /** The authored props: `side`, when given. */
  props: Readonly<Record<string, string | number>>;
  /** The scene's framed footage (task 040), which this component places. */
  media?: IrMediaVideo | undefined;
}

export function TextMedia({ slots, props, media }: TextMediaProps) {
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const columns = textMediaColumns(
    theme,
    width,
    height,
    mediaSideOf(props["side"]),
  );
  return (
    <AbsoluteFill>
      <TextColumn
        text={slots["text"] ?? ""}
        box={columns.text}
        fit={TEXT_FIT}
      />
      {media !== undefined && (
        <FramedFootage
          media={media}
          box={fitFrame(columns.media, frameContract(media.frame ?? "").aspect)}
        />
      )}
    </AbsoluteFill>
  );
}
