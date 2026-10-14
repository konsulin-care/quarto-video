# 014 — Contract validation stage

Phase 2 · Status: done · Depends on: 013 · PRD: §5.3, §9.1 (stage 2) · ADR: —

## Goal
The validator rejects scenes that break their component contract, with
diagnostics matching the PRD §9.2 examples.

## Scope
- In: stage runner (stop after first failing stage); stage 2 checks:
  unknown component (list available), unknown attribute, wrong prop
  type/enum, missing required slot, unknown slot, duration outside bounds,
  unknown animation/transition id (no presets registered yet ⇒ any name is
  unknown). CLI uses the stage runner.
- Out: assets (016), timeline (015).

## Deliverables
- `packages/validator/src/stages/contract.ts`, `src/run.ts`.
- One fixture per code under `tests/fixtures/projects/contract-*`.
- Codes added to the validator README table.

## Definition of done
Automated:
- [x] Each fixture yields exactly its expected code(s) and line (`tests/integration/contract.test.ts`).
- [x] Multiple errors in one stage are all reported (`contract-multiple`; `test/contract.test.ts`).
- [x] `videos/hello` still validates with no diagnostics (`contract.test.ts`).
- [x] Encoder is never invoked when stage 2 fails (`contract.test.ts`, render with the stub renderer).

Human check (pending, performed by a person):
1. In a copy of `videos/hello` set `component="hero-title"` →
   `ERROR index.qmd:<n>` / `Unknown component "hero-title".` /
   `Available components: title.` Exit 1.
2. Add `colour="red"` to a scene → unknown attribute error naming `colour`.

## Notes
Decisions (conservative; flagged in the task report):
- Stage 2 = IR schema, then contracts (`checkManifest`, `runStages` in `src/run.ts`). A failing stage stops the run. Contracts read IR 0.2 slots; a 0.1 manifest is `E_IR_SCHEMA` (the filter writes only 0.2).
- Unknown attributes stay stage 1 (`E_SCENE_SHAPE`, names the attribute). The filter already rejects every attribute but `component` and `duration`, and the IR carries no props. Stage-2 attribute and prop checks (type, enum) need the IR to carry scene props: an IR schema change, not made here. Open, flagged.
- `animation` and `transition` are rejected the same way (stage 1, unknown attribute) until presets exist (021, 022); no unknown-id code yet.
- `title` bounds (1s–30s) and `accepts` (paragraph, heading) are used as they are. Conflicts: none (`videos/hello` is 2s; the 1s bound is inclusive). The bounds stay provisional; a human should confirm them.
- A scene with an unknown component has no contract: only `E_COMPONENT_UNKNOWN` is reported for it.
- Each diagnostic names the scene's opening line (the IR has no per-block line). One error per unknown slot, per missing required slot, per (slot, block kind).
- Golden tests moved to stage 1 (`tests/integration/support/filter-only.ts`), assertions unchanged: `content-nodes` (uses `comparison`, slots `left`/`right`) and `scene-lines-ok` (`statement`, `end-card`, a code block in `title`). Stage 2 rejects them. Alternative (human choice): register the components (025, 027, 034) and retarget.
- Validator now depends on `@quarto-video/ir` and `@quarto-video/registry` (`packages/validator/package.json`; lockfile updated).

## Completion log
- 2026-10-14: done. Summary: stage 2 runs after the filter for `video validate` and `video render`: IR schema, then unknown component (lists available), unknown slot, missing required slot, slot block kind not accepted, duration outside bounds. A failing stage stops the run; the renderer is not started.
  Already satisfied before: none (no contract checks existed). Implemented: all four Automated boxes and the five codes.
  Code: `packages/validator/src/{run.ts,stages/contract.ts,diagnostic.ts,index.ts}`, `packages/cli/src/check.ts`, README tables and notes.
  Tests: `packages/validator/test/contract.test.ts`, `run.test.ts`; `tests/integration/contract.test.ts` (9 `contract-*` fixtures, PRD §9.2 block, `videos/hello`, `hero-title` and `colour` copies, render not started); `codes.test.ts`; golden tests in `content-nodes.test.ts`, `scene-lines.test.ts` (filter-only).
  Gates: `npm run check`: "Test Files 22 passed (22)", "Tests 139 passed (139)"; `scripts/check.sh --all`: "check: passed (all)"; `npm run test:lua`: "lua tests: 163 passed, 0 failed"; `npm run test:integration`: vitest "Tests 2 passed (2)", tsx "pass 73 / fail 0".
  Follow-ups: attribute and prop checks plus animation/transition ids (needs IR props, ADR); `title` bounds confirmation; 015 timeline and 016 assets reuse the runner.
  Pending human checks (not performed by the agent): 1. In a copy of `videos/hello`, `component="hero-title"` gives `ERROR index.qmd:10`, `Unknown component "hero-title".`, `Available components: title.`, exit 1. 2. Add `colour="red"` to a scene: error naming `colour`, exit 1.
