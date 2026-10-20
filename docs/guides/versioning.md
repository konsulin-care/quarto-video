# Versioning and migration

Status: task 050. Policy: ADR-0007. The current IR is 1.12 (ADR-0020). There is
no major version yet, so nothing has been removed.

## What is versioned

| Thing | Version | Where it is recorded |
| --- | --- | --- |
| The intermediate representation (IR) | `schemaVersion` `MAJOR.MINOR` | the first key of `.video-build/manifest.json`; `npx video validate <p> --print-ir` shows it |
| The generator | `generator.extension` and `generator.cli` (semver) | the manifest; these are the extension and CLI versions |
| The DSL (front matter and `.scene` attributes) | no version key | this guide and [authoring.md](authoring.md) |
| Tool pins (Node, Quarto, Pandoc, Remotion, ffmpeg) | exact versions | [compatibility.md](compatibility.md) |

You never write a manifest by hand. The filter writes `.video-build/manifest.json`
on each run, so the version in it is always the one this release produces.

## Rules (ADR-0007)

- **Frozen files.** A released schema (`packages/ir/schema/ir-<version>.json`)
  never changes. A change is a new file and an ADR.
- **Minor versions (1.x) are additive.** A new optional field or value. Every
  manifest valid under an older 1.x stays valid, and every renderer reads all of them.
- **Major versions (2.0) may break.** They remove, rename, retype or tighten a
  field, make an optional field required, or change units or rounding. A major
  needs an ADR and a migration note here.
- **Writing and reading.** The filter writes the version its content needs, as
  above. Every listed version is read.
- **Pre-1.0 versions** (0.1 to 0.3) are read but never written again.
- **Unsupported version.** A `schemaVersion` that is not in the supported list
  is `E_IR_UNSUPPORTED_VERSION` at `/schemaVersion`, and the message lists the
  supported versions.
- **DSL deprecation.** A feature to be removed first produces a warning that
  names its replacement and the major that removes it, and becomes an error
  only in that major. No feature is deprecated yet.

## IR versions

Each minor adds one thing. The filter writes the version that matches the
features a project uses: a plain project with a title and a statement is written
as 1.6, and each newer feature moves it up to the newest one it needs (see
`packages/ir/src/versions.ts`).

| Version | Adds | Record |
| --- | --- | --- |
| 1.0 | `generator` block (IR 0.3 plus `generator`) | ADR-0007, task 017 |
| 1.1 | scene `animation` (an entrance preset) | ADR-0011, task 021 |
| 1.2 | `settings.reducedMotion` | ADR-0012, task 023 |
| 1.3 | image block in scene content | ADR-0013, task 033 |
| 1.4 | scene `props` and `tables` (CSV) | ADR-0014, task 035 |
| 1.5 | number prop values | ADR-0015, task 031 |
| 1.6 | scene `media` (`.video` footage) | task 038 |
| 1.7 | region footage (`placement="region"`) | ADR-0016, task 043 |
| 1.8 | source audio: `audio="keep"` and `volume` | ADR-0009, task 044 |
| 1.9 | project `music` track | ADR-0017, task 045 |
| 1.10 | `kind` on media items; framed image footage | ADR-0018 |
| 1.11 | project `captions` track | ADR-0019, task 046 |
| 1.12 | scene `exit` and `animationDurationFrames` | ADR-0020 |

Versions 0.1 to 0.3 are read for older manifests, and are never written again.

## Migrating a project

Authors have no migration to do for a minor version. Re-run the commands and
the filter writes a manifest in the current format:

```sh
npx video validate my-video
npx video render my-video
```

From an older release, to 1.12:

- **Your `index.qmd` needs no change.** The new scene attributes (`exit`,
  `animationDuration`) are optional and additive.
- **A component's duration now starts at 100 ms.** It was 1 s. Scenes shorter
  than 1 s, which were errors (`E_DURATION_BOUNDS`), now validate. No project
  that validated before changes meaning.
- **`.video-build/manifest.json` is regenerated.** Do not keep an old one
  around. The frozen 1.11 schema rejects `exit` and `animationDurationFrames`, so
  re-running the filter is the fix for any manifest that carries them.
- **Tool versions.** A render from a different Quarto, Remotion or ffmpeg version
  is reported by `npx video doctor` and recorded in `build-info.json`. Compare
  with [compatibility.md](compatibility.md).

There is no IR migrator. Moving to a newer version means re-running the filter.

## Checking what a manifest is

```sh
npx video validate my-video --print-ir | grep -E '"schemaVersion"|"exit"|"animationDurationFrames"'
```

A 1.12 manifest shows `"schemaVersion": "1.12"`. A plain project is written as an
earlier version, 1.6.

## Future major versions

A major (2.0) would be the first place to remove anything. Its ADR, the list of
removed items and a migration section go into this guide before the release.
Until then, every 1.x change is additive, and older projects keep working.
