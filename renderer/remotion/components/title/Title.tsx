// Placeholder `title` component (task 004): centred text. Its colour, font and
// size come from the theme tokens (task 019); the real title contract arrives
// with task 024.
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useTheme } from "../../themes/ThemeProvider.js";
import { safeAreaPixels } from "../../themes/safe-area.js";

export interface TitleProps {
  text: string;
}

export function Title({ text }: TitleProps) {
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const margin = safeAreaPixels(theme, width, height);
  const { typography } = theme;
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: margin.x,
        paddingRight: margin.x,
        paddingTop: margin.y,
        paddingBottom: margin.y,
      }}
    >
      <div
        style={{
          color: theme.colors.text,
          fontFamily: `${typography.fontFamily}, sans-serif`,
          fontSize: typography.scale.title,
          fontWeight: typography.weights.bold,
          lineHeight: typography.lineHeight.tight,
          textAlign: "center",
          maxWidth: "100%",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
}
