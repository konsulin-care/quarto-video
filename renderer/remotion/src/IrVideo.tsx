// Plays the IR scenes on the resolved timeline (ADR-0005): each scene starts at
// its startFrame and runs its own durationFrames, so a transition's overlap
// shows both scenes. Frames come from the IR, never from the wall clock
// (PRD §8.4). The theme's tokens are passed in as props.
import type {
  IrBlock,
  IrCaptions,
  IrCaptionCue,
  IrMedia,
  IrMediaVideo,
  IrMusic,
  IrVideo as IrManifest,
} from "@quarto-video/ir";
import type { ThemeTokens } from "@quarto-video/registry";
// Subpaths, not the package index: the index pulls in the validator (node:fs)
// and ajv, which the renderer bundle must not contain.
import { timelineOf } from "@quarto-video/ir/timeline";
import { slotTexts } from "@quarto-video/ir/text";
import type { ReactNode } from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { ThemeProvider } from "../themes/ThemeProvider.js";
import { AnimatedScene } from "./AnimatedScene.js";
import { TransitionScene } from "./TransitionScene.js";
import { effectiveAnimation } from "../animations/index.js";
import { COMPONENTS, PLACES_OWN_MEDIA } from "./registry-map.js";
import type { Overlap } from "../transitions/index.js";
import { BackgroundScene } from "../media/BackgroundScene.js";
import { FramedScene } from "../media/FramedScene.js";
import { SourceAudio } from "../media/SourceAudio.js";
import { MusicTrack } from "../media/MusicTrack.js";
import { CaptionLayer } from "../media/CaptionLayer.js";
import { burnedCues } from "../media/captions.js";
import { audioSourceOf, type AudioSources } from "../media/audio-source.js";
import { withOverlay } from "./overlay.js";

// A type alias (not an interface) so it satisfies Remotion's Record constraint.
export type IrVideoProps = {
  ir: IrManifest;
  theme: ThemeTokens;
  /** Stereo copies of mono sound sources (src/stereo-sources.ts); unset plays the files. */
  audioSources?: AudioSources;
} & Record<string, unknown>;

/** The scene's text and blocks as the components read them (task 039: text-overlay). */
function contentOf(scene: IrManifest["scenes"][number]) {
  return withOverlay(slotTexts(scene.content), blocksOf(scene.content));
}

/**
 * The scene's animation as drawn: its preset id, or fade-in for a kinetic
 * statement over its word limit (task 026). IR 0.1 to 1.0 scenes have none.
 */
function animationOf(scene: IrManifest["scenes"][number]): string | undefined {
  const name = "animation" in scene ? scene.animation?.name : undefined;
  return effectiveAnimation(name, contentOf(scene).texts["default"] ?? "");
}

/** The scene's `.video` footage with the given placement, if it has one (tasks 039, 040). */
function mediaOf(
  scene: IrManifest["scenes"][number],
  placement: IrMedia["placement"],
): IrMedia | undefined {
  if (!("media" in scene) || scene.media === undefined) return undefined;
  return scene.media.find((item) => item.placement === placement);
}

/** Footage that is video: background and region footage are video (ADR-0018). */
function videoOf(item: IrMedia | undefined): IrMediaVideo | undefined {
  return item !== undefined && item.kind !== "image" ? item : undefined;
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

/** The scene's props; none before IR 1.4 (ADR-0014); numbers from IR 1.5 (ADR-0015). */
function propsOf(
  scene: IrManifest["scenes"][number],
): Record<string, string | number> {
  return "props" in scene ? (scene.props ?? {}) : {};
}

/** The scene's CSV tables; none before IR 1.4 (ADR-0014). */
function tablesOf(scene: IrManifest["scenes"][number]) {
  return "tables" in scene ? (scene.tables ?? {}) : {};
}

/** The IR's reduced-motion setting; IR 0.1 to 1.1 have none, so false (task 023). */
function reducedMotionOf(ir: IrManifest): boolean {
  return "reducedMotion" in ir.settings && ir.settings.reducedMotion === true;
}

/** The scene's region footage by region name (IR 1.7, task 043); none before 1.7. */
function regionsOf(
  scene: IrManifest["scenes"][number],
): Record<string, IrMediaVideo> {
  const regions: Record<string, IrMediaVideo> = {};
  if (!("media" in scene) || scene.media === undefined) return regions;
  for (const item of scene.media) {
    if (
      item.kind !== "image" &&
      item.placement === "region" &&
      item.region !== undefined
    ) {
      regions[item.region] = item;
    }
  }
  return regions;
}

/** The scene's kept `.video` blocks, whichever placement they have (task 044). */
function keptOf(scene: IrManifest["scenes"][number]): IrMediaVideo[] {
  if (!("media" in scene) || scene.media === undefined) return [];
  return scene.media.flatMap((item) =>
    item.kind !== "image" && item.audio === "keep" ? [item] : [],
  );
}

/** The project music track, when the manifest has one (IR 1.9, ADR-0017). */
function musicOf(ir: IrManifest): IrMusic | undefined {
  return "music" in ir ? ir.music : undefined;
}

/** The caption track, when the manifest has one (IR 1.11, ADR-0019). */
function captionsOf(ir: IrManifest): IrCaptions | undefined {
  return "captions" in ir ? ir.captions : undefined;
}

/** The component, over its scene's footage when it has some: background (task 039) or framed (task 040). */
function withMedia(scene: IrManifest["scenes"][number], component: ReactNode) {
  if (PLACES_OWN_MEDIA.has(scene.component)) return component;
  const framed = mediaOf(scene, "framed");
  if (framed !== undefined) {
    // A caption draws under the frame, in a band the frame leaves (task 041).
    const caption = contentOf(scene).texts["caption"] ?? "";
    return (
      <FramedScene media={framed} caption={caption}>
        {component}
      </FramedScene>
    );
  }
  const background = videoOf(mediaOf(scene, "background"));
  return background === undefined ? (
    component
  ) : (
    <BackgroundScene media={background}>{component}</BackgroundScene>
  );
}

export function IrVideo({ ir, theme, audioSources }: IrVideoProps) {
  const timeline = timelineOf(ir);
  const reducedMotion = reducedMotionOf(ir);
  const music = musicOf(ir);
  const cues: readonly IrCaptionCue[] | undefined = burnedCues(captionsOf(ir));
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
              {keptOf(scene).map((item, pass) => (
                <SourceAudio
                  key={`audio-${pass}`}
                  media={item}
                  file={audioSourceOf(item.src, audioSources)}
                  durationFrames={scene.durationFrames}
                  incomingFrames={overlapOf(scene)?.overlapFrames ?? 0}
                  outgoingFrames={
                    overlapOf(ir.scenes[index + 1])?.overlapFrames ?? 0
                  }
                />
              ))}
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
                  {withMedia(
                    scene,
                    <Component
                      slots={contentOf(scene).texts}
                      blocks={contentOf(scene).blocks}
                      props={propsOf(scene)}
                      tables={tablesOf(scene)}
                      media={mediaOf(scene, "framed")}
                      regions={regionsOf(scene)}
                    />,
                  )}
                </AnimatedScene>
              </TransitionScene>
            </Sequence>
          );
        })}
        {cues === undefined ? null : <CaptionLayer cues={cues} />}
        {music === undefined ? null : (
          <MusicTrack
            music={music}
            durationFrames={timeline.durationFrames}
            file={audioSourceOf(music.src, audioSources)}
          />
        )}
      </AbsoluteFill>
    </ThemeProvider>
  );
}
