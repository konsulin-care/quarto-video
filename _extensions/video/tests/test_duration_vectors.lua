-- Runs the shared duration vectors (packages/ir/test-vectors/durations.json)
-- through the Lua filter. The TS helper runs the same file (ADR-0003).
local h = require("tests.helpers")
local duration = require("lib.duration")

local root = debug.getinfo(1, "S").source:match("^@(.*/)tests/") or "./"
local path = root .. "../../packages/ir/test-vectors/durations.json"

local function load_vectors()
  local file = assert(io.open(path, "r"), "cannot open " .. path)
  local text = file:read("*a")
  file:close()
  return pandoc.json.decode(text)
end

local tests = {}
for _, vector in ipairs(load_vectors()) do
  local label = string.format('"%s" at %d fps', vector.input, vector.fps)
  if vector.errorCode then
    tests["vector " .. label .. " is rejected with " .. vector.errorCode] = function()
      h.code_is(function()
        duration.to_frames(vector.input, "scene-001", vector.fps)
      end, vector.errorCode, label)
    end
  else
    tests[string.format("vector %s is %d frames", label, vector.frames)] = function()
      h.eq(duration.to_frames(vector.input, "scene-001", vector.fps), vector.frames, label)
    end
  end
end

return tests
