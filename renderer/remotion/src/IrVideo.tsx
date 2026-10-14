// Plays the IR scenes on the resolved timeline (ADR-0005): each scene starts at
// its startFrame. Overlapping transitions are drawn as hard cuts until task 022,
// so a scene shows until the next one starts. Frames come from the IR, never
// from the wall clock (PRD §8.4). The theme's tokens are passed in as props.
import type { IrVideo as IrManifest } from "@quarto-video/ir";
import type { ThemeTokens } from "@quarto-video/registry";
// Subpaths, not the package index: the index pulls in the validator (node:fs)
// and ajv, which the renderer bundle must not contain.
import { timelineOf } from "@quarto-video/ir/timeline";
import { plainText } from "@quarto-video/ir/text";
import { AbsoluteFill, Sequence } from "remotion";
import { ThemeProvider } from "../themes/ThemeProvider.js";
import { COMPONENTS } from "./registry-map.js";

// A type alias (not an interface) so it satisfies Remotion's Record constraint.
export type IrVideoProps = { ir: IrManifest; theme: ThemeTokens } & Record<
  string,
  unknown
>;

export function IrVideo({ ir, theme }: IrVideoProps) {
  const timeline = timelineOf(ir);
  return (
    <ThemeProvider theme={theme}>
      <AbsoluteFill style={{ backgroundColor: ir.settings.background }}>
        {ir.scenes.map((scene, index) => {
          const Component = COMPONENTS[scene.component];
          if (!Component) {
            throw new Error(`Unknown component "${scene.component}"`);
          }
          const start = timeline.scenes[index]?.startFrame ?? 0;
          const next =
            timeline.scenes[index + 1]?.startFrame ?? timeline.durationFrames;
          // A scene wholly covered by the next one's transition is never shown.
          if (next <= start) return null;
          return (
            <Sequence
              key={scene.id}
              from={start}
              durationInFrames={next - start}
            >
              <Component text={plainText(scene.content)} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </ThemeProvider>
  );
}
