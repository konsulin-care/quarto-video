-- Required video settings from front matter (PRD §5.2; no defaults yet).
local h = require("tests.helpers")
local settings = require("lib.settings")

local function front(fields)
  return "---\nvideo:\n" .. fields .. "---\n\n"
end

local FULL = '  width: 1920\n  height: 1080\n  fps: 30\n  background: "#10131C"\n'

return {
  ["reads width, height, fps and background"] = function()
    local video = settings.read(h.doc("", front(FULL)).meta)
    h.eq(video.width, 1920, "width")
    h.eq(video.height, 1080, "height")
    h.eq(video.fps, 30, "fps")
    h.eq(video.background, "#10131C", "background")
  end,

  ["missing fps is a filter error"] = function()
    local fields = '  width: 1920\n  height: 1080\n  background: "#10131C"\n'
    local err = h.error_of(function()
      settings.read(h.doc("", front(fields)).meta)
    end)
    h.contains(err, "video.fps is required", "error")
  end,

  ["missing video block is a filter error"] = function()
    local err = h.error_of(function()
      settings.read(h.doc("Prose only.\n", "").meta)
    end)
    h.contains(err, "needs a video block", "error")
  end,

  ["rejects a fractional fps"] = function()
    local fields = FULL:gsub("fps: 30", "fps: 29.97")
    local err = h.error_of(function()
      settings.read(h.doc("", front(fields)).meta)
    end)
    h.contains(err, 'video.fps must be a whole number of at least 1, got "29.97"', "error")
  end,

  ["rejects a background that is not a hex colour"] = function()
    local fields = FULL:gsub('"#10131C"', "navy")
    local err = h.error_of(function()
      settings.read(h.doc("", front(fields)).meta)
    end)
    h.contains(err, "video.background must be a hex colour", "error")
  end,
}
