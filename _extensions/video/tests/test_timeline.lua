-- The resolved timeline in the filter (PRD §8.3; ADR-0005): the shared
-- vectors (packages/ir/test-vectors/timeline.json, also run by TS) and the
-- ADR-0005 worked example in the built manifest.
local h = require("tests.helpers")
local timeline = require("lib.timeline")
local manifest = require("lib.manifest")
local scenes = require("lib.scenes")
local json = require("lib.json")

local root = debug.getinfo(1, "S").source:match("^@(.*/)tests/") or "./"
local path = root .. "../../packages/ir/test-vectors/timeline.json"

local function load_vectors()
  local file = assert(io.open(path, "r"), "cannot open " .. path)
  local text = file:read("*a")
  file:close()
  return pandoc.json.decode(text)
end

local SETTINGS = { width = 1920, height = 1080, fps = 30, background = "#10131C" }

local tests = {}
for _, vector in ipairs(load_vectors()) do
  tests["timeline vector: " .. vector.name] = function()
    local records = {}
    for i, scene in ipairs(vector.scenes) do
      records[i] = {
        id = "s" .. i,
        durationFrames = scene.durationFrames,
        transition = scene.transitionFrames and { durationFrames = scene.transitionFrames } or nil,
      }
    end
    local starts, total = timeline.resolve(records)
    h.eq(#starts, #vector.startFrames, "scene count")
    for i, expected in ipairs(vector.startFrames) do
      h.eq(starts[i], expected, "start of scene " .. i)
    end
    h.eq(total, vector.durationFrames, "total")
  end
end

tests["ADR-0005 worked example: three 4 s scenes with 1 s fades at 30 fps"] = function()
  local body = table.concat({
    '::: {.scene component="title" duration="4s" #intro}\nWhy GPUs Matter.\n:::\n',
    '::: {.scene component="title" duration="4s" transition="fade" transitionDuration="1s" #second}\nParallel work.\n:::\n',
    '::: {.scene component="title" duration="4s" transition="fade" transitionDuration="1s" #third}\nMemory bandwidth.\n:::\n',
  }, "\n")
  local list = scenes.collect(h.doc(body), 30)
  local ir = manifest.build(SETTINGS, list, "index.qmd")
  h.eq(ir.schemaVersion, "1.3", "schema version")
  h.eq(ir.timeline.durationFrames, 300, "total frames")
  h.eq(ir.timeline.scenes[1].startFrame, 0, "first start")
  h.eq(ir.timeline.scenes[2].startFrame, 90, "second start")
  h.eq(ir.timeline.scenes[3].startFrame, 180, "third start")
  h.contains(json.encode(ir), '"startFrame": 180', "encoded timeline")
  h.eq(ir.scenes[1].transition, nil, "the first scene has no transition")
end

tests["a manifest with no scenes has an empty timeline"] = function()
  local ir = manifest.build(SETTINGS, {}, "index.qmd")
  h.eq(ir.timeline.durationFrames, 0, "total")
  h.contains(json.encode(ir), '"scenes": []', "scenes")
end

return tests
