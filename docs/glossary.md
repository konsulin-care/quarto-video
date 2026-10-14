# Glossary
Use these terms exactly. Add new terms here in the same change that introduces them.

| Term | Meaning |
| ---- | ------- |
| Project | A self-contained video directory: `index.qmd`, `assets/`, `data/`. |
| Project root | The directory holding `index.qmd`; all asset paths resolve from it. |
| DSL | The scene language: fenced Divs + attributes inside `index.qmd`. |
| Front matter | YAML header configuring `video.*`, `theme`, `defaults.*`. |
| Scene | One `.scene` Div; one entry on the timeline, rendered by one component. |
| Scene id | Stable identifier: author-given `#id` or generated `scene-NNN`. |
| Component | A registered scene type (e.g. `title`, `comparison`). |
| Contract | Registry declaration of a component: slots, props, bounds, presets. |
| Slot | A named content region a component accepts (e.g. `left`, `right`). |
| Default slot | The slot receiving scene content not wrapped in a named Div. |
| Content node | Renderer-independent structured content (paragraph, strong, list…). |
| Property (prop) | A validated attribute on a scene or block (e.g. `fit="cover"`). |
| Preset | A named, registered animation or transition. |
| Animation | A preset describing motion of content within one scene. |
| Transition | A preset describing the change between two adjacent scenes. |
| Overlap | Frames during which two scenes are both visible due to a transition. |
| Theme | A named set of design tokens (e.g. `modern`). |
| Token | A single design value: colour, font, size, spacing, motion timing. |
| Video IR | Versioned JSON manifest describing the whole video; renderer input. |
| Manifest | One concrete IR document, usually `.video-build/manifest.json`. |
| Frame (time) | Integer index of a video frame at the project `fps`. |
| Device frame | Visual chrome around media: `browser`, `phone`, `tablet`, `generic`. |
| Timeline time | Position in the output video, in frames. |
| Source time | Position inside a media file (`sourceStart`, `sourceEnd`). |
| Allocated duration | Frames a scene or media item occupies on the timeline. |
| Source range | `sourceStart`–`sourceEnd` selected from footage, in source time. |
| Short source | A source range shorter than its allocated duration. |
| Placement | Where media goes: `background`, `framed`, or a named slot. |
| Fit | How media fills its box: `cover` (crop) or `contain` (letterbox). |
| Audio policy | Explicit per-media audio behaviour (e.g. `mute`, `keep`). |
| Diagnostic | Structured error/warning: severity, code, location, suggestion. |
| Stage | One of the six validation stages in PRD §9.1. |
| Preflight | Stage 5: checks the rendering environment before rendering. |
| Visual case | A fixture + frame list rendered to stills for regression testing. |
| Reference still | Approved PNG a visual case is compared against. |
| ADR | Architecture Decision Record in `docs/decisions/`. |
| Build dir | `<project>/.video-build/`: generated, disposable, never committed. |
