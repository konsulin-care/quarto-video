# packages/validator/ — staged validation and diagnostics
Status: Not implemented — built by tasks 008, 014, 015, 016, 018, 037–038.

## Purpose
Decide whether an IR manifest may be rendered, and explain every problem in a
form humans and AI agents can act on (PRD §9).

## Owns
- The `Diagnostic` type and formatters (human text and JSON).
- Stage runner for PRD §9.1 stages 2–4 and 6:
  2 schema/contract · 3 assets · 4 timeline · 6 output check.
  (Stage 1 is the Lua filter; stage 5 preflight lives in the CLI.)
- Asset resolution and the security boundary (ADR-0006).
- Media metadata via `ffprobe`, cached in `.video-build/media.json` (task 037).

## Does not own
- Parsing Markdown → `_extensions/video`. Process orchestration → `cli`.

## Diagnostic shape
`{ severity: "error"|"warning", code: "E_UNKNOWN_COMPONENT", message,
   file?, line?, sceneId?, component?, property?, assetPath?, suggestion? }`
- `code` values are stable, documented in the table below, never reused.
- Human format follows PRD §9.2: `ERROR index.qmd:18` then message lines.

## Rules
- Stop after the first stage that produced an error; report all errors of that
  stage, not just the first.
- Warnings never change the exit status.
- Never execute project code, never use the network, never print environment
  variables or absolute paths outside the project root.
- Every diagnostic code has at least one fixture that triggers it.

## Diagnostic codes
(Empty. Each task appends: code / stage / meaning / since-task.)

## Testing
Unit tests per stage; fixture-driven tests in `tests/fixtures/projects/`.

## Related
Tasks 008, 014–018, 037–038, 044. ADR-0006, 0008.
