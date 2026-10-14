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

  ["video.output defaults to output.mp4"] = function()
    h.eq(settings.output(h.doc("", front(FULL)).meta), "output.mp4", "output")
  end,

  ["reads a relative video.output path"] = function()
    local fields = FULL .. "  output: exports/clip.mp4\n"
    h.eq(settings.output(h.doc("", front(fields)).meta), "exports/clip.mp4", "output")
  end,

  ["rejects an absolute video.output path"] = function()
    local fields = FULL .. "  output: /tmp/clip.mp4\n"
    local err = h.error_of(function()
      settings.output(h.doc("", front(fields)).meta)
    end)
    h.contains(err, "video.output must be relative to the project", "error")
  end,

  ["rejects a video.output path that leaves the project"] = function()
    local fields = FULL .. "  output: ../clip.mp4\n"
    local err = h.error_of(function()
      settings.output(h.doc("", front(fields)).meta)
    end)
    h.contains(err, 'video.output must not contain ".."', "error")
  end,

  ["rejects a video.output without the .mp4 extension"] = function()
    local fields = FULL .. "  output: clip.mov\n"
    local err = h.error_of(function()
      settings.output(h.doc("", front(fields)).meta)
    end)
    h.contains(err, "video.output must end in .mp4", "error")
  end,

  ["a missing setting has code E_SETTING_MISSING"] = function()
    local fields = '  width: 1920\n  height: 1080\n  background: "#10131C"\n'
    local diagnostic = h.code_is(function()
      settings.read(h.doc("", front(fields)).meta)
    end, "E_SETTING_MISSING", "missing fps")
    h.eq(diagnostic.property, "video.fps", "property")
  end,

  ["an invalid setting has code E_SETTING_INVALID"] = function()
    local fields = FULL .. "  output: ../clip.mp4\n"
    local diagnostic = h.code_is(function()
      settings.output(h.doc("", front(fields)).meta)
    end, "E_SETTING_INVALID", "output")
    h.eq(diagnostic.property, "video.output", "property")
  end,
}
