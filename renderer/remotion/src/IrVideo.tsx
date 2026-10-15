// Plays the IR scenes on the resolved timeline (ADR-0005): each scene starts at
// its startFrame and runs its own durationFrames, so a transition's overlap
// shows both scenes. Frames come from the IR, never from the wall clock
// (PRD §8.4). The theme's tokens are passed in as props.
import type { IrBlock, IrVideo as IrManifest } from "@quarto-video/ir";
import type { ThemeTokens } from "@quarto-video/registry";
// Subpaths, not the package index: the index pulls in the validator (node:fs)
// and ajv, which the renderer bundle must not contain.
import { timelineOf } from "@quarto-video/ir/timeline";
import { slotTexts } from "@quarto-video/ir/text";
import { AbsoluteFill, Sequence } from "remotion";
import { ThemeProvider } from "../themes/ThemeProvider.js";
import { AnimatedScene } from "./AnimatedScene.js";
import { TransitionScene } from "./TransitionScene.js";
import { COMPONENTS } from "./registry-map.js";
import type { Overlap } from "../transitions/index.js";

// A type alias (not an interface) so it satisfies Remotion's Record constraint.
export type IrVideoProps = { ir: IrManifest; theme: ThemeTokens } & Record<
  string,
  unknown
>;

/** The scene's animation preset id; IR 0.1 to 1.0 scenes have none. */
function animationOf(scene: IrManifest["scenes"][number]): string | undefined {
  return "animation" in scene ? scene.animation?.name : undefined;
}

/** The overlap a scene's transition makes; none for cut or no transition. */
function overlapOf(
  scene: IrManifest["scenes"][number] | undefined,
): Overlap | undefined {
  const transition =
    scene !== undefined && "transition" in scene ? scene.transition : undefined;
  if (transition === undefined || transition.durationFrames <= 0) {
    return undefined;
  }
  return { name: transition.name, overlapFrames: transition.durationFrames };
}

/** The scene's slots as blocks, for components that draw emphasis (task 025); IR 0.1 has none. */
function blocksOf(
  content: Parameters<typeof slotTexts>[0],
): Record<string, IrBlock[]> {
  return "text" in content ? {} : content.slots;
}

/** The IR's reduced-motion setting; IR 0.1 to 1.1 have none, so false (task 023). */
function reducedMotionOf(ir: IrManifest): boolean {
  return "reducedMotion" in ir.settings && ir.settings.reducedMotion === true;
}

export function IrVideo({ ir, theme }: IrVideoProps) {
  const timeline = timelineOf(ir);
  const reducedMotion = reducedMotionOf(ir);
  return (
    <ThemeProvider theme={theme}>
      <AbsoluteFill
        style={{ backgroundColor: ir.settings.background, overflow: "hidden" }}
      >
        {ir.scenes.map((scene, index) => {
          const Component = COMPONENTS[scene.component];
          if (!Component) {
            throw new Error(`Unknown component "${scene.component}"`);
          }
          const start = timeline.scenes[index]?.startFrame ?? 0;
          return (
            <Sequence
              key={scene.id}
              from={start}
              durationInFrames={scene.durationFrames}
            >
              <TransitionScene
                durationFrames={scene.durationFrames}
                incoming={overlapOf(scene)}
                outgoing={overlapOf(ir.scenes[index + 1])}
                reducedMotion={reducedMotion}
              >
                <AnimatedScene
                  animation={animationOf(scene)}
                  durationFrames={scene.durationFrames}
                  reducedMotion={reducedMotion}
                >
                  <Component
                    slots={slotTexts(scene.content)}
                    blocks={blocksOf(scene.content)}
                  />
                </AnimatedScene>
              </TransitionScene>
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </ThemeProvider>
  );
}
