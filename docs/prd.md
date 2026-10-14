# Product Requirements Document: Quarto Video Extension

Version 1.0 · Status: Proposed specification

## 1. Product overview

### 1.1 Purpose

Build a Quarto extension that enables authors and AI agents to create polished, repeatable videos using Quarto Markdown, a curated declarative video DSL, and reusable visual components.

The extension must let authors describe what a video should communicate and which visual patterns to use, without requiring them to write React components, animation timelines, or low-level layout code.

The initial renderer will be Remotion. A renderer-independent intermediate representation (Video IR) will separate the authoring language from rendering implementation.

### 1.2 Problem statement

AI-generated video code often produces inconsistent visual quality, brittle layouts, excessive one-off animations, and code that is difficult to maintain or reuse. Existing Markdown workflows are primarily document-oriented and do not provide a standardized, high-level language for specifying video scenes, motion, transitions, and footage.

This product addresses the problem by providing:

- A constrained, expressive scene-authoring DSL.
- A reusable visual system with approved scene types, animations, and transitions.
- First-class support for text, images, charts, and existing video footage.
- Deterministic validation and rendering.
- A simple project-oriented authoring and rendering workflow.

### 1.3 Product vision

An author or AI agent should be able to create a video by editing a single `index.qmd` file, adding local assets, and running:

```
video render videos/gpu
```

The command should produce:

```
videos/gpu/output.mp4
```

The long-term target is to support native-feeling Quarto workflows, including:

```
quarto render videos/gpu/index.qmd
```

and potentially:

```
quarto render videos/gpu
```

These Quarto-native invocation forms are compatibility goals, not assumed capabilities. They must be validated in a working prototype. A dedicated CLI is the required fallback to ensure reliable directory-based rendering.

## 2. Goals and non-goals

### 2.1 Goals

1. Declarative authoring: Express scenes, timing, content, media, motion, and transitions in Quarto Markdown.
2. High production quality: Provide a curated, consistent design system instead of unconstrained visual code generation.
3. AI-friendly authoring: Make the syntax predictable, composable, discoverable, and straightforward to validate.
4. Reusable components: Support a library of scene layouts, animation presets, transitions, and media treatments.
5. Video footage integration: Allow existing video files to serve as backgrounds, framed clips, or inputs to multi-clip compositions.
6. Deterministic rendering: Produce consistent output from the same manifest, assets, renderer version, and configuration.
7. Project isolation: Keep each video project self-contained, portable, and independently renderable.
8. Renderer independence: Define a stable Video IR that can support alternative renderers in the future.
9. Actionable diagnostics: Report syntax, schema, asset, and timing errors before rendering where possible.

### 2.2 Non-goals for the initial release

- A graphical timeline editor.
- An unrestricted CSS or JavaScript authoring interface.
- Automatic generation of arbitrary React components from the DSL.
- Real-time collaborative editing.
- A full nonlinear video editor.
- Advanced audio mastering, multitrack editing, or automated sound design.
- Distributed rendering infrastructure.
- Guaranteed pixel-identical output across different operating systems and codec implementations.
- Support for every media codec, external streaming source, or remote URL.
- A general-purpose replacement for Quarto's document, presentation, or website formats.

## 3. Target users and primary use cases

### 3.1 Target users

- Technical authors who already use Quarto and Markdown.
- AI agents generating structured video content.
- Developers maintaining reusable video design systems.
- Teams producing educational, explanatory, product, data-storytelling, and marketing videos.

### 3.2 Primary use cases

1. Generate an explainer video from structured Markdown content.
2. Produce title, statement, comparison, statistic, chart, and closing scenes from reusable templates.
3. Place existing footage behind animated text or graphics.
4. Show product demonstrations inside browser, phone, or tablet frames.
5. Compare clips using split-screen compositions.
6. Re-render videos after editing copy, replacing assets, or changing a theme.
7. Apply consistent branding across multiple videos.
8. Validate AI-generated scene definitions without executing arbitrary generated code.

## 4. User experience and project structure

### 4.1 Project layout

The recommended workspace structure is:

```
video-workspace/
├── _extensions/
│   └── video/
├── renderer/
│   └── remotion/
│       ├── components/
│       ├── animations/
│       ├── transitions/
│       └── media/
└── videos/
    ├── gpu/
    │   ├── index.qmd
    │   ├── assets/
    │   ├── data/
    │   └── output.mp4
    └── transformer/
        ├── index.qmd
        ├── assets/
        ├── data/
        └── output.mp4
```

Requirements:

- Each video project must be independently renderable.
- Assets and generated output must resolve relative to the video project, not the caller's current working directory.
- Generated files and temporary renderer files must not be mixed with source files unnecessarily.
- The project must be portable when its directory is moved, provided its declared dependencies are available.
- Shared renderer code, themes, and component definitions should be centrally maintained.
- Projects must not require authors to edit generated renderer source code.

### 4.2 Required CLI

The initial release must provide a stable CLI with at least:

```
video render videos/gpu
video validate videos/gpu
```

`video render` must:

1. Resolve the project directory and its `index.qmd`.
2. Parse the Quarto document and transform it into Video IR.
3. Validate the manifest and referenced assets.
4. Invoke the configured renderer.
5. Encode and write the final output to the configured destination.
6. Return a nonzero exit code on failure and a clear diagnostic message.

The CLI should also support rendering an explicit `.qmd` path.

Batch rendering of a directory containing multiple video projects is a desirable follow-on capability, not a blocker for the first release.

### 4.3 Quarto integration

The extension must use Quarto's extension and Pandoc filter mechanisms for authoring integration.

A prototype must establish the actual Quarto integration boundary. In particular, the team must verify whether Quarto's custom-format pipeline can reliably invoke the external renderer and emit the final MP4 as the primary output.

If Quarto cannot provide the required behavior through a custom format alone, the dedicated CLI remains the supported end-to-end entry point. Do not depend on undocumented Quarto internals or promise directory-rendering behavior without a verified implementation.

## 5. Authoring language

### 5.1 Design principles

The DSL must be:

- Declarative: Describe scene intent and content rather than rendering instructions.
- Composable: Combine supported content blocks inside reusable scene components.
- Constrained: Expose approved design choices, not arbitrary implementation details.
- Readable: Keep ordinary content in Markdown wherever practical.
- Validatable: Detect invalid attributes, unknown components, missing content, and invalid timing before rendering.
- Extensible: Add components and presets without changing the overall authoring model.

Fenced Divs are the primary mechanism for declaring scenes and structured content. YAML front matter configures the video globally. A separate YAML scene list must not be the primary authoring interface.

### 5.2 Global configuration

Example:

```
---
title: "Why GPUs Matter"
format: video
video:
  width: 1920
  height: 1080
  fps: 30
  output: output.mp4
  background: "#10131C"
theme: modern
defaults:
  scene:
    duration: 4s
    transition: fade
---
```

Required global settings:

| Setting                     | Requirement                           |
| --------------------------- | ------------------------------------- |
| `title`                     | Optional human-readable project title |
| `video.width`               | Output width in pixels                |
| `video.height`              | Output height in pixels               |
| `video.fps`                 | Output frame rate                     |
| `video.output`              | Output path; defaults to `output.mp4` |
| `theme`                     | Named visual theme                    |
| `defaults.scene.duration`   | Default scene duration                |
| `defaults.scene.transition` | Default transition, if any            |
| `video.background`          | Optional default canvas background    |

Requirements:

- Sensible defaults must be available for standard video settings.
- Unsupported settings and invalid values must produce clear diagnostics.
- Theme names and preset identifiers must resolve against the registered design system.
- Codec and container settings must be kept separate from scene definitions and the core Video IR.
- The implementation must document whether omitted values inherit defaults, use component defaults, or are required.

### 5.3 Scene syntax

Example:

```
# Why GPUs Matter

::: {.scene component="title" duration="4s" animation="reveal"}
Why GPUs Matter
:::

::: {.scene component="statement" duration="5s" animation="kinetic"}
Modern AI is computationally expensive.
:::

::: {.scene component="comparison" duration="6s" transition="zoom"}
::: {.left}
**CPUs**

Optimized for general-purpose tasks.
:::

::: {.right}
**GPUs**

Optimized for massively parallel workloads.
:::
:::
```

Requirements:

- Each `.scene` block represents one timeline scene.
- Scene order follows document order unless a later version explicitly defines another ordering mechanism.
- Each scene references a registered component.
- Scene duration may be declared explicitly or inherited from defaults.
- Animation and transition names must reference registered presets.
- Scene content is parsed from Markdown into structured content rather than stored only as flattened text.
- Components define their own content slots and accepted attributes.
- Unsupported attributes must be rejected or explicitly reported; silently ignored configuration is not acceptable.
- The DSL must provide stable scene identifiers for diagnostics, debugging, and future editing workflows.

### 5.4 Initial component library

The initial release should include a deliberately small, polished component set:

1. `title` — opening title and subtitle.
2. `statement` — prominent text or key message.
3. `bullets` — sequential points or a compact list.
4. `statistic` — headline number with label and optional context.
5. `comparison` — two or more structured content areas.
6. `image` — image-led composition with optional caption.
7. `chart` — data visualization using a defined chart specification.
8. `text-media` — text paired with image or video footage.
9. `product-demo` — media presented inside a device or browser frame.
10. `split-screen` — simultaneous media or content regions.
11. `section-divider` — chapter or topic transition.
12. `end-card` — closing message, credits, or call to action.

The initial implementation may release fewer components if necessary to achieve high quality. Every released component must have a documented schema, visual examples, supported slots, and validation tests.

### 5.5 Component contract

Every component must declare:

- A unique identifier and version.
- Its required and optional content slots.
- Accepted properties and their types.
- Default layout and visual styling.
- Supported animations and transitions.
- Minimum and maximum supported duration, where applicable.
- Media and accessibility behavior.
- Validation rules.
- A renderer implementation or registered renderer mapping.

Components own their internal geometry, responsive layout, typography, and visual hierarchy. Authors should choose semantic properties such as `frame="browser"` or `fit="cover"` rather than specifying arbitrary pixel coordinates.

### 5.6 Motion and transitions

The design system must expose named motion presets rather than unrestricted animation code.

Initial target inventory:

- Approximately 8–12 animation presets.
- Approximately 6–8 transition presets.

These are planning targets, not a requirement to ship every preset in the first release.

Illustrative animations include `reveal`, `fade-in`, `slide-up`, `stagger`, `count-up`, and `kinetic`. Illustrative transitions include `fade`, `cut`, `wipe`, `zoom`, and `slide`.

Requirements:

- Presets must be deterministic at a given frame.
- Motion must respect the scene's duration and available frame range.
- Presets must define valid behavior for short scenes and reduced-motion settings where applicable.
- Transitions must have explicit duration and overlap semantics.
- Unsupported combinations must be rejected or resolved through documented fallback rules.
- The system must not depend on wall-clock timing, nondeterministic randomness, or browser state to determine rendered frames.

## 6. Video media and asset management

### 6.1 First-class video footage

Existing video files must be supported as first-class scene media, alongside text, images, and charts.

The initial release must support these placements:

1. Background: Footage fills the canvas behind text and graphics.
2. Framed media: Footage appears inside a reusable browser, phone, tablet, or generic frame.
3. Named slot: Footage is placed in a component-defined region, including split-screen layouts.

Illustrative syntax:

```
::: {.scene component="statement" duration="8s"}

::: {.video src="assets/city.mp4"
    placement="background"
    fit="cover"
    audio="mute"}
:::

::: {.text-overlay animation="reveal"}
Cities are being transformed by AI.
:::

:::
```

Framed footage:

```
::: {.scene component="product-demo" duration="10s"}

::: {.video src="assets/product-demo.mp4"
    placement="framed"
    frame="browser"
    fit="contain"
    sourceStart="12s"
    sourceEnd="22s"
    audio="mute"}
:::

:::
```

The exact nesting and attribute syntax must be validated in the implementation prototype. The examples define intended semantics, not an assertion that these forms already parse correctly.

### 6.2 Media properties

Supported video properties must include:

| Property       | Semantics                                                 |
| -------------- | --------------------------------------------------------- |
| `src`          | Required asset path for a video source                    |
| `placement`    | `background`, `framed`, or a component-defined slot       |
| `fit`          | `cover` or `contain`                                      |
| `frame`        | Named reusable frame style                                |
| `sourceStart`  | Source-footage in-point                                   |
| `sourceEnd`    | Source-footage out-point                                  |
| `audio`        | Explicit audio policy                                     |
| `loop`         | Whether the source repeats to fill its allocated duration |
| `playbackRate` | Playback speed, with a validated positive value           |

Requirements:

- Source ranges must be distinct from timeline placement and scene duration.
- A clip's selected source range must be valid for the actual source duration.
- The implementation must define what happens when the requested source segment is shorter than the allocated scene time.
- The default short-source behavior must be explicit. The initial recommendation is to fail validation unless the author selects a supported behavior such as `loop` or `freeze`.
- The system must never silently stretch footage or change playback speed to hide a duration mismatch.
- `cover` and `contain` behavior must be consistent across image and video components.
- Local project assets are the default and must be supported without uploading them to an external service.
- Remote media may be supported later; it is not required for the first release.

### 6.3 Asset validation

Before rendering, the system must check:

- Whether each referenced asset exists.
- Whether its path resolves within the project or an explicitly permitted shared-asset root.
- Whether the media type is supported.
- Whether the requested source range is valid when metadata is available.
- Whether the selected placement is supported by the target component.
- Whether required fonts and other external resources are available.

Diagnostics must identify the asset path and the relevant scene or source location.

## 7. Audio

### 7.1 Initial audio scope

The first release must support:

- Muting source audio.
- Preserving source audio when explicitly requested.
- A project-level background music track.
- Explicit volume settings within documented limits.

Advanced narration mixing, automatic ducking, multitrack editing, audio effects, and mastering are outside the initial release.

### 7.2 Audio behavior

- Audio behavior must be explicit rather than inferred from whether a source contains an audio stream.
- Muted footage must not contribute audible source audio.
- The renderer must define how audio tracks are trimmed, looped, mixed, and ended.
- Project-level audio must have deterministic start and end behavior.
- Audio processing and output encoding must be configurable independently of the scene layout.
- Validation must flag incompatible or incomplete audio settings.

## 8. Intermediate representation and renderer architecture

### 8.1 Architecture

The required architecture is:

```
index.qmd + project assets
          |
          v
Quarto / Pandoc AST
          |
          v
Lua filter + validation
          |
          v
Renderer-independent Video IR
          |
          v
Remotion renderer
          |
          v
Encoded output.mp4
```

Responsibilities:

- Quarto: Markdown authoring and document integration.
- Pandoc AST: Parsed document structure.
- Lua filter: Recognize the DSL, extract scene definitions, normalize attributes, and report source-level errors.
- Validation layer: Enforce schemas, component contracts, media constraints, and timeline consistency.
- Video IR: Stable, renderer-independent description of the video.
- Remotion: Scene composition, frame-based rendering, transitions, media playback, and output generation.
- CLI: Project resolution, orchestration, error handling, and output management.

The Lua filter must not generate bespoke Remotion source code for each video. It must emit the Video IR, which is consumed by the renderer.

### 8.2 Video IR contract

The IR must be versioned and serializable as JSON.

Illustrative example:

```
{
  "schemaVersion": "1.0",
  "type": "video",
  "settings": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "background": "#10131C"
  },
  "scenes": [
    {
      "id": "scene-001",
      "component": "title",
      "durationFrames": 120,
      "animation": {
        "name": "reveal"
      },
      "transition": {
        "name": "fade"
      },
      "content": {
        "text": "Why GPUs Matter"
      },
      "media": [],
      "source": {
        "file": "index.qmd"
      }
    }
  ]
}
```

The example is illustrative; the exact schema must be specified and tested before it is frozen.

The IR must represent:

- Schema version and project settings.
- Ordered scenes and stable scene identifiers.
- Scene durations in integer frames.
- Component identifiers, structured content, and validated properties.
- Animation and transition identifiers and settings.
- Media references, placement, source ranges, and audio policies.
- Timeline ordering and any supported overlap semantics.
- Project-relative asset references.
- Source-location metadata for diagnostics.
- Optional accessibility metadata where applicable.

Requirements:

- Time values must be normalized to integer frames using the project's frame rate.
- The conversion rule from human-readable durations to frames must be documented and deterministic.
- Source time and timeline time must remain distinct.
- The schema must not contain Remotion-specific component instances or arbitrary executable code.
- Unknown schema versions must produce a clear error.
- Renderer-specific configuration must live outside the core IR or inside a clearly isolated extension namespace.
- The same valid IR must be consumable by another renderer without reparsing the original Markdown.

### 8.3 Timeline semantics

The initial release must define a single, deterministic timeline model.

- Scenes follow document order.
- Each scene has a resolved duration in frames.
- Transitions have an explicit duration and documented overlap behavior.
- Total video duration must be computed from the resolved timeline, not inferred from the sum of scene durations when overlaps exist.
- Media source in/out points are measured in source time and mapped to the scene timeline.
- Invalid negative durations, invalid ranges, and unsupported overlaps must fail validation.
- The initial release should avoid arbitrary absolute start timestamps unless a concrete use case requires them.

The system must distinguish a scene's allocated timeline duration from the length of its source footage.

### 8.4 Renderer boundary

Remotion is the initial reference renderer.

Requirements:

- Renderer components must be reusable and driven by validated IR.
- Frame selection must determine animation and media state deterministically.
- Output resolution and frame rate must match the validated configuration.
- Media path resolution must use the project root or a normalized asset root.
- Rendering errors must propagate to the CLI with actionable context.
- Renderer code must be isolated from parsing and validation logic.
- The architecture must permit a future alternative renderer without requiring a rewrite of the DSL or core IR.

## 9. Validation and error handling

### 9.1 Validation stages

Validation must occur in stages to catch errors before expensive rendering.

1. Document validation: Parse the Quarto document and identify supported DSL blocks.
2. Schema validation: Check required fields, value types, allowed attributes, and component contracts.
3. Asset validation: Resolve media and verify asset availability and supported formats.
4. Timeline validation: Resolve durations, transitions, frame counts, source ranges, and audio timing.
5. Renderer preflight: Confirm required dependencies and rendering resources are available.
6. Render validation: Detect rendering failures and confirm the expected output artifact was created.

### 9.2 Error diagnostics

Each diagnostic should include:

- Severity: error or warning.
- A concise description of the issue.
- Source file and line number when available.
- Scene identifier or component name when applicable.
- The invalid property or asset path.
- A suggested correction where practical.

Examples:

```
ERROR index.qmd:18
Unknown component "hero-title".
Available components: title, statement, image, comparison, end-card.

ERROR index.qmd:34
Asset "assets/demo.mp4" was not found.
Referenced by scene "scene-003".

ERROR index.qmd:52
sourceEnd exceeds the source duration of "assets/clip.mp4".
```

Requirements:

- Validation failures must prevent rendering by default.
- Warnings must not silently become errors without a documented compatibility policy.
- The validator must never execute arbitrary user-provided code as part of validating a project.
- Error output must be suitable for both human authors and AI agents that need to correct a document.

## 10. Visual design system

### 10.1 Design-system objectives

The design system is a core product feature, not merely a collection of sample components. Its purpose is to make the default output consistently professional while limiting the number of decisions an author must make.

It must provide:

- Named themes and design tokens.
- Reusable typography and color systems.
- Consistent spacing, alignment, and visual hierarchy.
- Component-specific layout rules.
- Reusable motion and transition presets.
- Consistent framing and cropping for media.
- Clear behavior at supported aspect ratios.
- Reusable title, section, and closing treatments.

### 10.2 Design-system requirements

- Components must not depend on authors supplying custom CSS to look correct.
- Every preset must have a documented purpose and a known set of compatible components.
- The initial theme must be coherent across all released components.
- Theme changes must not alter the semantic content or timeline.
- Text must remain legible at the configured output resolution.
- Components must define behavior for long text, missing optional content, and images with unusual aspect ratios.
- Animations must not cause essential content to be clipped or become unreadable.
- Media framing must be reusable rather than recreated independently for each project.
- Component and preset additions must include visual regression coverage.

## 11. Non-functional requirements

### 11.1 Determinism and reproducibility

Given the same Video IR, assets, configuration, dependency versions, and compatible rendering environment, the system should produce visually equivalent output.

The implementation must:

- Pin and document renderer dependencies.
- Avoid nondeterministic animation logic.
- Avoid relying on external network resources during rendering unless explicitly declared.
- Record sufficient configuration and version information to diagnose output changes.
- Document any known sources of cross-platform rendering differences.

Bit-for-bit identical MP4 files across platforms are not required for the initial release.

### 11.2 Performance

- Validation must complete without invoking the full video encoder.
- The CLI must not render if fatal validation errors are present.
- The renderer must support standard Remotion rendering and concurrency options where compatible with the architecture.
- Performance must be measured on representative projects before defining hard rendering-time guarantees.
- The CLI must expose progress or meaningful status output during long renders.

### 11.3 Portability and maintainability

- A project must use project-relative paths for local assets.
- The system must not require an always-on remote service to render a local project.
- The DSL, IR, validator, and renderer must be independently testable.
- The IR schema and public DSL must be documented and versioned.
- Breaking changes must have a migration policy.
- Generated manifests and temporary files must have a documented location and cleanup policy.

### 11.4 Security

- Validation must not execute arbitrary code embedded in a project.
- Asset paths must be normalized and checked against permitted roots.
- The renderer must not fetch remote resources implicitly.
- Any future support for remote assets must make network access explicit.
- Error messages must avoid exposing unrelated environment secrets.

## 12. Accessibility and content quality

The initial release must establish baseline accessibility and readability standards.

Requirements:

- Components must support adequate contrast through the supplied themes.
- Text layouts must account for long headings and body copy.
- Charts must support clear labels and units where applicable.
- Images and video media may include descriptive metadata.
- Essential meaning must not rely exclusively on color.
- Motion presets must avoid unnecessary flashing and extreme motion.
- Projects must be able to provide captions or subtitle tracks through a documented mechanism, even if advanced caption authoring is deferred.
- The renderer must support a project-level option to reduce nonessential motion where practical.

Automated validation should detect measurable issues where possible. Subjective visual quality still requires rendered-output review.

## 13. Testing and quality assurance

### 13.1 Unit tests

Required coverage includes:

- DSL parsing and normalization.
- YAML configuration and defaults.
- Component schema validation.
- Animation and transition compatibility.
- Time-to-frame conversion.
- Timeline duration calculations.
- Asset path resolution.
- Media source-range validation.
- Audio policy validation.
- Video IR serialization and version checks.

### 13.2 Integration tests

Integration tests must cover:

- A valid `.qmd` project rendering successfully to MP4.
- Explicit `.qmd` and project-directory input to the CLI.
- Nested content and supported scene composition.
- Local image and video assets.
- Background, framed, and split-screen footage.
- Transitions and overlapping scenes.
- Source-footage trimming, looping, and freezing where supported.
- Missing assets and malformed configuration.
- Unsupported components, attributes, and schema versions.
- Rendering failures and output-file handling.
- Paths containing spaces and non-ASCII characters.

### 13.3 Visual regression tests

Maintain a small, versioned suite of representative scenes and complete videos.

The suite must cover:

- Every released scene component.
- Every released animation and transition.
- Text wrapping and overflow.
- Multiple media aspect ratios.
- Video framing and cropping.
- Scene boundaries and transition behavior.
- The default theme and supported output settings.

Visual regressions should be reviewed against approved reference renders. Differences caused by intentional design changes must be documented.

### 13.4 End-to-end acceptance project

The repository must include at least one complete demonstration project that combines:

- A title scene.
- A statement or bullet scene.
- A statistic or chart scene.
- Existing video footage as a background.
- A framed product demonstration or split-screen composition.
- A closing scene.
- A background music track, if audio is included in the first release.

A new developer must be able to install documented dependencies, validate the project, render it, and locate the final MP4 using the documented commands.

## 14. Deliverables

The first release must provide:

1. A distributable Quarto extension containing the DSL parser/filter and authoring documentation.
2. A versioned Video IR schema and examples.
3. A validation layer with actionable diagnostics.
4. A dedicated CLI for project resolution, validation, and rendering.
5. A Remotion renderer with a documented component and preset registry.
6. A starter theme and a curated set of scene components, animations, and transitions.
7. First-class support for local image and video assets.
8. Defined timeline, media, and audio semantics.
9. Automated unit, integration, and visual regression tests.
10. A sample project and end-to-end setup guide.
11. A compatibility statement for supported Quarto, Pandoc, Node.js, and Remotion versions.
12. Documentation for authoring, validation, rendering, extending components, and diagnosing failures.

## 15. Implementation plan

### Phase 1 — Technical validation

Objective: Resolve the architectural risks before implementing the full DSL.

Deliverables:

- Minimal Quarto extension and Lua filter.
- Proof that a `.qmd` document can be parsed into a valid Video IR manifest.
- Minimal Remotion renderer consuming the manifest.
- A working end-to-end render to MP4.
- Verified CLI behavior for both directory and explicit-file inputs.
- A documented decision on whether native `quarto render` integration is feasible without unsupported hooks.

Exit criterion: A reproducible local project can be validated and rendered successfully through the supported entry point.

### Phase 2 — DSL and validation foundation

Objective: Establish a stable authoring contract.

Deliverables:

- Front matter configuration and defaults.
- Scene syntax and document-order semantics.
- Versioned Video IR.
- Component registry and schemas.
- Time-to-frame conversion.
- Actionable validation errors.
- Asset path handling.

Exit criterion: Valid and invalid projects produce predictable manifests and useful diagnostics without invoking the encoder on fatal errors.

### Phase 3 — Core design system

Objective: Deliver a useful, coherent video-authoring experience.

Deliverables:

- Initial theme.
- Core scene components.
- Initial animation and transition presets.
- Consistent typography and layout rules.
- Rendered examples and visual regression tests.

Exit criterion: The sample explainer can be authored entirely through the DSL without custom per-video renderer code.

### Phase 4 — Video media and audio

Objective: Make existing footage a first-class part of generated videos.

Deliverables:

- Background video placement.
- Framed media placement.
- Split-screen and named media slots.
- Source in/out points.
- Explicit short-source behavior.
- Source-audio policy and basic background music support.
- Media validation and integration tests.

Exit criterion: A project combining footage, overlays, and transitions renders with predictable timing and audio behavior.

### Phase 5 — Release hardening

Objective: Prepare the extension for repeatable use by authors and AI agents.

Deliverables:

- Complete documentation and starter templates.
- Dependency compatibility matrix.
- Reproducibility checks.
- Visual regression coverage.
- Error-message improvements.
- Installation and troubleshooting instructions.
- Versioning and migration policy.

Exit criterion: A new user can author, validate, render, and troubleshoot a project using only the published documentation.

## 16. Acceptance criteria

The initial release is acceptable when all of the following are true:

- A project can be authored in `index.qmd` using the documented scene DSL.
- Global settings and scene defaults are applied consistently.
- The document can be converted into a versioned, renderer-independent Video IR.
- Invalid components, properties, timing, and assets produce actionable errors.
- Fatal validation errors prevent rendering.
- A supported CLI renders a project directory or explicit `.qmd` file to its configured MP4 destination.
- The renderer supports the released scene components, animations, and transitions.
- Existing video files work as backgrounds, framed media, and named-slot content.
- Source-footage timing is distinct from scene duration and follows documented rules.
- Audio behavior is explicit and tested for all released media features.
- The output resolution, frame rate, and timeline duration match the validated configuration.
- Project assets resolve relative to the project root.
- A complete demonstration project renders successfully from a clean setup.
- Automated tests cover the critical parsing, validation, timing, media, and rendering paths.
- The extension documents its compatibility requirements and supported workflow.
- Any claimed `quarto render <directory>` or `quarto render <file.qmd>` support has been verified end to end rather than inferred from Quarto's custom-format capabilities.

## 17. Risks and mitigations

| Risk                                                                                    | Mitigation                                                                                                               |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Quarto custom formats cannot directly orchestrate the complete external render pipeline | Validate this in Phase 1 and use the dedicated CLI as the reliable fallback                                              |
| Markdown nesting becomes cumbersome for complex scenes                                  | Keep scenes declarative, define component-specific slots, and test nesting behavior early                                |
| AI-generated DSL produces inconsistent visual quality                                   | Restrict choices to documented components, themes, animations, and transitions                                           |
| Video IR becomes coupled to Remotion                                                    | Keep the core schema declarative and renderer-independent                                                                |
| Timing behavior becomes ambiguous                                                       | Define frame conversion, transition overlap, source ranges, and duration policies before expanding the component library |
| Asset paths fail when projects move                                                     | Resolve local assets relative to the project root and validate paths before rendering                                    |
| Rendering is slow or resource-intensive                                                 | Measure representative projects, expose progress, and use supported renderer concurrency controls                        |
| Component library grows faster than quality assurance                                   | Require component contracts, documentation, and visual regression tests for every new component                          |
| Codec or platform differences affect output                                             | Pin dependencies where practical and document supported environments and known differences                               |
| Audio behavior becomes inconsistent across components                                   | Define audio policy at the media and project levels rather than allowing implicit component-specific behavior            |

## 18. Open decisions

These decisions must be resolved during prototyping or before the corresponding feature is released:

1. Quarto-native invocation: Can the extension reliably make Quarto invoke Remotion and produce MP4 output as the primary artifact, or must the CLI remain the sole end-to-end command?
2. Scene duration defaults: Should all scenes require explicit duration, or should the system apply a global default with component-specific overrides?
3. Transition model: Should transitions be represented as properties of the incoming scene, the outgoing scene, or explicit timeline elements? The chosen model must define overlap semantics unambiguously.
4. IR content representation: Which Pandoc AST nodes and custom structures should be preserved to support Markdown content without coupling the renderer to Pandoc internals?
5. Asset security boundary: Should local asset references be restricted to the project root by default, with explicitly configured shared directories?
6. Audio architecture: Should background music and other project-wide audio tracks be represented in a separate top-level timeline section in the initial release, or should the first version remain limited to simpler audio policies?
7. Component and IR versioning: What compatibility and migration guarantees will apply to existing projects as the DSL evolves?
8. Supported media formats: Which video, audio, image, and font formats will be guaranteed in the initial supported environment?

Decision principle: Resolve choices that affect parsing, timing, portability, and the renderer boundary before expanding the feature set. Preserve the central product contract: authors declare scenes and intent in Quarto Markdown; the system validates that declaration and renders it through reusable, controlled visual components.
