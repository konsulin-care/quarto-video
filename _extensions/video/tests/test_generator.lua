-- The generator block of IR 1.0 (ADR-0007): every manifest records the
-- extension and CLI versions, and the schema version it is written in.
local h = require("tests.helpers")
local manifest = require("lib.manifest")
local scenes = require("lib.scenes")
local generator = require("lib.generator")

local SETTINGS = { width = 1920, height = 1080, fps = 30, background = "#10131C" }

local tests = {}

tests["a built manifest is IR 1.2 with the generator versions"] = function()
  local ir = manifest.build(SETTINGS, {}, "index.qmd")
  h.eq(ir.schemaVersion, "1.2", "schema version")
  h.eq(ir.generator.extension, generator.extension, "extension version")
  h.eq(ir.generator.cli, generator.cli, "cli version")
end

tests["a manifest with a scene carries the same generator block"] = function()
  local body = '::: {.scene component="title" duration="1s"}\nHi.\n:::\n'
  local list = scenes.collect(h.doc(body), 30)
  local ir = manifest.build(SETTINGS, list, "index.qmd")
  h.eq(ir.generator.extension, generator.extension, "extension version")
  h.eq(ir.generator.cli, generator.cli, "cli version")
end

return tests
