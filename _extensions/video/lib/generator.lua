-- Versions written into every manifest's `generator` block (IR 1.0, ADR-0007).
-- packages/ir/test/generator.test.ts checks them against _extension.yml and
-- packages/cli/package.json, so a version bump cannot leave them behind.
local M = {}

M.extension = "0.1.0"
M.cli = "0.0.0"

return M
