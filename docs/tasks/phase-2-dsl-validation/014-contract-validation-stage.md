# 014 — Contract validation stage

Phase 2 · Status: todo · Depends on: 013 · PRD: §5.3, §9.1 (stage 2) · ADR: —

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
- [ ] Each fixture yields exactly its expected code(s) and line.
- [ ] Multiple errors in one stage are all reported.
- [ ] `videos/hello` still validates with no diagnostics.
- [ ] Encoder is never invoked when stage 2 fails (render test).

Human check:
1. In a copy of `videos/hello` set `component="hero-title"` →
   `ERROR index.qmd:<n>` / `Unknown component "hero-title".` /
   `Available components: title.` Exit 1.
2. Add `colour="red"` to a scene → unknown attribute error naming `colour`.

## Notes

## Completion log
