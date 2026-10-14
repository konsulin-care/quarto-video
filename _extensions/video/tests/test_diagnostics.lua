-- Diagnostics helper: collection, codes and the JSON file (lib/diagnostics.lua).
local h = require("tests.helpers")
local diagnostics = require("lib.diagnostics")
local json = require("lib.json")

local function fail_fn()
  diagnostics.fail("E_SETTING_MISSING", "video.fps is required", { property = "video.fps" })
end

return {
  ["fail raises one diagnostic with its code and fields"] = function()
    local list = h.diagnostics_of(fail_fn)
    h.eq(#list, 1, "count")
    h.eq(list[1].severity, "error", "severity")
    h.eq(list[1].code, "E_SETTING_MISSING", "code")
    h.eq(list[1].property, "video.fps", "property")
  end,

  ["try collects a diagnostic and returns nil"] = function()
    local found = {}
    local value = diagnostics.try(fail_fn, found, { sceneId = "scene-001" })
    h.eq(value, nil, "value")
    h.eq(#found, 1, "found")
    h.eq(found[1].sceneId, "scene-001", "context sceneId")
  end,

  ["try keeps a field the diagnostic already has"] = function()
    local found = {}
    diagnostics.try(fail_fn, found, { property = "other" })
    h.eq(found[1].property, "video.fps", "property")
  end,

  ["try returns the value of a successful call"] = function()
    local found = {}
    local value = diagnostics.try(function()
      return 42
    end, found)
    h.eq(value, 42, "value")
    h.eq(#found, 0, "found")
  end,

  ["try re-raises an unexpected Lua error"] = function()
    local err = h.error_of(function()
      diagnostics.try(function()
        error("plain bug", 0)
      end, {})
    end)
    h.contains(err, "plain bug", "error")
  end,

  ["raise with an empty list does nothing"] = function()
    diagnostics.raise({})
  end,

  ["raise reports every message, one per line"] = function()
    local list = {
      diagnostics.new("E_SETTING_MISSING", "first message"),
      diagnostics.new("E_SETTING_INVALID", "second message"),
    }
    local err = h.error_of(function()
      diagnostics.raise(list)
    end)
    h.eq(err, "first message\nsecond message", "error text")
  end,

  ["messages lists every message in order"] = function()
    local list = {
      diagnostics.new("E_SETTING_MISSING", "first"),
      diagnostics.new("E_SCENE_SHAPE", "second"),
    }
    h.eq(diagnostics.messages(list), "first\nsecond", "messages")
  end,

  ["attach_file sets file only where it is missing"] = function()
    local list = {
      diagnostics.new("E_SETTING_MISSING", "a"),
      diagnostics.new("E_SETTING_MISSING", "b", { file = "other.qmd" }),
    }
    diagnostics.attach_file(list, "index.qmd")
    h.eq(list[1].file, "index.qmd", "first file")
    h.eq(list[2].file, "other.qmd", "second file")
  end,

  ["an empty list encodes as a JSON array"] = function()
    local array = json.array({})
    h.eq(json.encode(array), "[]\n", "encoded")
  end,
}
