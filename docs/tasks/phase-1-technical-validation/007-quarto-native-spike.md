# 007 — Quarto-native invocation spike

Phase 1 · Status: todo · Depends on: 006 · PRD: §1.3, §4.3, §16, §18.1 · ADR: writes 0002

## Goal
Find out, with evidence, whether `quarto render videos/hello/index.qmd` (and
`quarto render videos/hello`) can produce `output.mp4` using only documented
Quarto features, and record the decision.

## Scope
- In: experiments with custom format, `post-render` scripts, project
  config; a reproducible spike script; ADR-0002.
- Out: shipping the integration. If feasible, append a new task to
  implement it; do not implement it here.

## Deliverables
- `scripts/spike-quarto-native.sh`: runs each tried invocation on a temp
  copy of `videos/hello` and prints, per form, `WORKS` / `FAILS: <reason>`.
- `docs/decisions/0002-quarto-native-invocation.md` (accepted) listing
  forms tried, Quarto version, evidence, decision, and what docs may claim.
- If feasible: new task file appended (e.g. `007a-quarto-native-render.md`)
  and index row in `docs/tasks/README.md`.
- `AGENT.md` invariant reference stays correct.

## Definition of done
Automated:
- [ ] `scripts/spike-quarto-native.sh` exits 0 and its printed results match
      the ADR's evidence table.
- [ ] No production code depends on undocumented Quarto internals.

Human check:
1. Read ADR-0002: it states clearly which commands are supported.
2. Run `scripts/spike-quarto-native.sh`; the WORKS/FAILS lines match the ADR.

## Notes

## Completion log
