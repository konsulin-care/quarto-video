-- Lua unit tests for the video filter (npm run test:lua).
-- Runs under Pandoc's embedded Lua: `pandoc lua _extensions/video/tests/run.lua`.
-- Exit 0 when every test passes, 1 otherwise.
local source = debug.getinfo(1, "S").source
local root = source:match("^@(.*/)tests/") or "./"
package.path = root .. "?.lua;" .. package.path

local SUITES = {
  "tests.test_scenes",
  "tests.test_scene_ids",
  "tests.test_content",
  "tests.test_content_lines",
  "tests.test_locate",
  "tests.test_duration",
  "tests.test_duration_vectors",
  "tests.test_config",
  "tests.test_config_keys",
  "tests.test_json",
  "tests.test_diagnostics",
  "tests.test_transitions",
  "tests.test_animations",
  "tests.test_timeline",
  "tests.test_generator",
  "tests.test_image",
  "tests.test_media",
}

local passed, failed = 0, 0
for _, suite in ipairs(SUITES) do
  local tests = require(suite)
  local names = {}
  for name in pairs(tests) do
    names[#names + 1] = name
  end
  table.sort(names)
  for _, name in ipairs(names) do
    local ok, err = pcall(tests[name])
    if ok then
      passed = passed + 1
      print("ok   " .. suite .. ": " .. name)
    else
      failed = failed + 1
      print("FAIL " .. suite .. ": " .. name .. "\n     " .. tostring(err))
    end
  end
end

print(string.format("\nlua tests: %d passed, %d failed", passed, failed))
os.exit(failed == 0 and 0 or 1)
