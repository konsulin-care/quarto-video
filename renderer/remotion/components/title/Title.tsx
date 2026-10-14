// Placeholder `title` component (task 004): centred text. Theme tokens arrive
// with task 019 and the real title contract with task 024.
import { AbsoluteFill } from "remotion";

export interface TitleProps {
  text: string;
}

const TEXT_STYLE = {
  color: "#FFFFFF",
  fontFamily: "sans-serif",
  fontSize: 96,
  fontWeight: 700,
  lineHeight: 1.1,
  textAlign: "center",
  maxWidth: 1600,
} as const;

export function Title({ text }: TitleProps) {
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", padding: 64 }}
    >
      <div style={TEXT_STYLE}>{text}</div>
    </AbsoluteFill>
  );
}
