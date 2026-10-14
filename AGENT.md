# AGENT.md — quarto-video

## What this repo is
A Quarto extension plus a `video` CLI that turn a scene DSL written in `index.qmd`
into an MP4. Authors declare scenes and intent; the system validates the
declaration and renders it through a curated set of components and presets.
Product source of truth: `docs/prd.md`. Architecture: `docs/architecture.md`.

## Before you change anything
1. Read this file fully.
2. Open `docs/tasks/README.md` and take the lowest-numbered task that is not
   `done` and whose dependencies are `done`.
3. Read the `README.md` of EVERY directory your task touches (map below).
4. Read the ADRs in `docs/decisions/` that your task references.
5. Read `docs/testing.md`: it decides which tests your change needs.
6. If your change crosses a layer boundary, re-read `docs/architecture.md`.

## Directory map
| Path                          | Owns                                                  |
| ----------------------------- | ----------------------------------------------------- |
| docs/README.md                | PRD, architecture, glossary, ADRs, tasks              |
| docs/decisions/README.md      | Architecture Decision Records and their index         |
| docs/tasks/README.md          | Sequential development tasks and their lifecycle      |
| docs/testing.md               | Testing policy: what needs tests and the gates        |
| scripts/                      | Check/test runners used by hooks and CI               |
| _extensions/video/README.md   | Quarto extension, Lua filter → Video IR               |
| packages/ir/README.md         | IR JSON Schema, types, time → frame rules, versions   |
| packages/registry/README.md   | Component contracts, presets, themes (data only)      |
| packages/validator/README.md  | Staged validation and diagnostics                     |
| packages/cli/README.md        | `video` CLI: project resolution and orchestration     |
| renderer/remotion/README.md   | Remotion implementation of registry entries           |
| videos/README.md              | Sample and acceptance video projects                  |
| tests/README.md               | Integration, visual regression, fixtures              |

## Invariants (never violate; a violation is a bug)
- The Lua filter emits IR JSON. It never generates React/Remotion code.
- The IR is renderer-independent: no Remotion types, no executable code.
- All IR time values are integer frames. Source time ≠ timeline time.
- Unknown components, attributes, presets and themes are errors — never
  silently ignored.
- Fatal validation errors block rendering.
- The validator never executes project code and never uses the network.
- Asset paths resolve relative to the project root; escaping it is an error.
- Rendering is a pure function of the frame number: no wall clock,
  no `Math.random`, no network, no browser state.
- Footage is never silently stretched, sped up, or looped to fit a scene.
- Authors choose semantic properties (`fit`, `frame`, `placement`), never
  pixels, CSS, or JavaScript.
- Never claim `quarto render` support beyond what ADR-0002 verified.

## Dependency direction
`ir` ← `registry` ← `validator` ← `cli` → `renderer/remotion`.
`ir` depends on nothing internal. The renderer may import `ir` and
`registry` only; it never imports `validator` or `cli`.

## Commands
- `mise install && mise run setup` — pinned tools + git hooks (ADR-0010).
- `npm ci` — install workspace dependencies from `package-lock.json` (ADR-0001).
- `mise run check` — `scripts/check.sh --all`: line limit, format, lint, typecheck.
- `mise run test` — `scripts/test.sh --all`: all suites. Narrow with
  `scripts/test.sh --all --suite scripts|unit|lua|integration|visual`.
- `npm run check` — format:check, lint, typecheck, unit (root).
- `npm run format` · `npm run lint` · `npm run typecheck` · `npm run test`.
- `npm run typecheck -w @quarto-video/ir` — one workspace.
- `npm run test:lua|test:integration|test:visual` — placeholders until tasks 003, 005, 020.
- `video validate|render` arrive with 005/006.

## Working rules
- One task per change set. Commits use Conventional Commits
  (`feat: parse durations into frames`); put the task id (`Task: 009`) in
  the body.
- Code files (`*.ts *.tsx *.js *.mjs *.cjs *.lua *.sh`) ≤ 300 lines.
- Never bypass hooks (`--no-verify`, `LEFTHOOK=0`, `LEFTHOOK_EXCLUDE`).
  A failing hook is a failure to fix, not to skip.
- When you finish, update the task's `Status` and add a `Completion log`.
- Behaviour change in a directory → update that directory's README.md in
  the same change.
- Agentic docs (`AGENT.md`, `*/README.md`, `docs/architecture.md`, `docs/testing.md`,
  `docs/glossary.md`, `docs/tasks/**`) stay at or below 100 lines.
- A PRD §18 open decision is resolved only through an ADR, never inline.
- A new component or preset ships with: registry contract, renderer
  implementation, docs page, validation fixtures and visual cases.
- Do not edit `docs/prd.md`; propose PRD changes to a human instead.
- Never weaken or skip a test to make a task pass.

## When the docs are unclear
Precedence: `docs/prd.md` > accepted ADRs > `docs/architecture.md` >
directory READMEs > task file.
If documents conflict or are silent, choose the more conservative option
(reject rather than guess), record it under `Notes` in the task file, and
flag it in your summary.
