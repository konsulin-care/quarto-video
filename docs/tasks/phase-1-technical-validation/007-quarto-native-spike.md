# 007 — Quarto-native invocation spike

Phase 1 · Status: done · Depends on: 006 · PRD: §1.3, §4.3, §16, §18.1 · ADR: writes 0002

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
- Choices: the extension is copied into each temp project (Quarto searches
  the project directory only). The custom format is a temp-copy variant
  (`formats: html: output-ext: mp4`), not a repo change.
- `post-render-failure-exit` is a negative control: WORKS means quarto exits
  non-zero when the hook fails.
- A Lua filter that spawns `video render` (`pandoc.pipe`) was not spiked: it
  breaks the purity rule in `_extensions/video/README.md`.
- The spike hook uses an absolute repo path (`QV_SPIKE_REPO`). It is spike-only.
- PRD §18.1 is resolved by ADR-0002. Agents do not edit the PRD; a human
  should mark §18.1 as resolved.

## Completion log
- 2026-10-14. Decision (ADR-0002, accepted): `video render` stays the entry
  point. `quarto render` writes `output.mp4` only through a project
  `_quarto.yml` post-render hook that runs `video render` (file and directory
  forms, Quarto 1.10.19). Filters and custom formats write the manifest only.
  A directory without `_quarto.yml` renders nothing and exits 0.
- Evidence: `scripts/spike-quarto-native.sh` (7 forms; output in ADR-0002).
  Covered by `tests/integration/spike-quarto-native.test.ts` ("prints the
  evidence recorded in ADR-0002"), which runs in `npm run test:integration`.
- Automated, all exit 0: `npm run check`, `npm run test`, `npm run test:lua`
  (26 pass), `npm run test:integration` (spike test included),
  `scripts/check.sh --all`, `scripts/test.sh --all`.
- Follow-up: 007a (supported post-render render, hook location, CLI discovery).
  Human to mark PRD §18.1 resolved.
- Human check pending: read ADR-0002; run `scripts/spike-quarto-native.sh`
  and compare its lines with the ADR.
