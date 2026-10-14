// Plays the IR scenes in order with <Series>; each scene is one component.
import type { IrVideo as IrManifest } from "@quarto-video/ir";
import { AbsoluteFill, Series } from "remotion";
import { COMPONENTS } from "./registry-map.js";

// A type alias (not an interface) so it satisfies Remotion's Record constraint.
export type IrVideoProps = { ir: IrManifest } & Record<string, unknown>;

export function IrVideo({ ir }: IrVideoProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: ir.settings.background }}>
      <Series>
        {ir.scenes.map((scene) => {
          const Component = COMPONENTS[scene.component];
          if (!Component) {
            throw new Error(`Unknown component "${scene.component}"`);
          }
          return (
            <Series.Sequence
              key={scene.id}
              durationInFrames={scene.durationFrames}
            >
              <Component text={scene.content.text} />
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
}
