// The drawn shell of each device frame (task 040; PRD §10): the body, and the
// decoration of its margins. Colours, radii and sizes come from the theme's
// tokens; margins are placed as percentages of the frame box. The screen (the
// safe content box) is drawn by FramedScene, not here.
import type { FrameContract, ThemeTokens } from "@quarto-video/registry";
import type { CSSProperties } from "react";
import { useTheme } from "../../themes/ThemeProvider.js";

export interface FrameShellProps {
  contract: FrameContract;
}

/** A dot in a margin of the frame box, placed by `style`. */
function Dot({
  theme,
  id,
  style,
}: {
  theme: ThemeTokens;
  id: number;
  style: CSSProperties;
}) {
  return (
    <div
      key={id}
      style={{
        position: "absolute",
        width: theme.space.xs,
        height: theme.space.xs,
        borderRadius: theme.space.xs,
        backgroundColor: theme.colors.mutedText,
        ...style,
      }}
    />
  );
}

/** The margin decoration of one frame, by id: none for generic. */
function Decoration({
  theme,
  contract,
}: {
  theme: ThemeTokens;
  contract: FrameContract;
}) {
  const top = `${contract.content.yPercent / 2}%`;
  const centred = { left: "50%", top, transform: "translate(-50%, -50%)" };
  switch (contract.id) {
    case "browser":
      // Three dots in the title bar above the page.
      return (
        <>
          {[0, 1, 2].map((index) => (
            <Dot
              key={index}
              id={index}
              theme={theme}
              style={{
                left: theme.space.sm + index * theme.space.sm,
                top,
                transform: "translateY(-50%)",
              }}
            />
          ))}
        </>
      );
    case "phone":
    case "tablet":
      // A speaker slot (phone) or a camera dot (tablet) in the top margin.
      return <Dot theme={theme} id={0} style={centred} />;
    default:
      return null;
  }
}

/** The body: the surface, with the frame's border where it has one. */
function bodyStyle(theme: ThemeTokens, contract: FrameContract): CSSProperties {
  const border =
    contract.id === "generic"
      ? { border: `${theme.space.xs / 4}px solid ${theme.colors.accent}` }
      : {};
  return {
    position: "absolute",
    inset: 0,
    boxSizing: "border-box",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    ...border,
  };
}

/** Draws the frame's body and margin decoration; the screen is drawn by the caller. */
export function FrameShell({ contract }: FrameShellProps) {
  const theme = useTheme();
  return (
    <>
      <div style={bodyStyle(theme, contract)} />
      <Decoration theme={theme} contract={contract} />
    </>
  );
}
