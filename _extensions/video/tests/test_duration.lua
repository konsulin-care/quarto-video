-- Duration attribute to frames (lib/duration.lua, ADR-0003). Each error
-- names the scene and the value, and carries its code.
local h = require("tests.helpers")
local duration = require("lib.duration")

local function frames(text, fps)
  return duration.to_frames(text, "scene-001", fps)
end

local function error_message(text, fps)
  return h.error_of(function()
    frames(text, fps)
  end)
end

return {
  ["4s at 30 fps is 120 frames"] = function()
    h.eq(frames("4s", 30), 120, "frames")
  end,

  ["1.5s at 30 fps is 45 frames"] = function()
    h.eq(frames("1.5s", 30), 45, "frames")
  end,

  ["500ms at 30 fps is 15 frames"] = function()
    h.eq(frames("500ms", 30), 15, "frames")
  end,

  ["half a frame rounds up"] = function()
    h.eq(frames("1.5s", 25), 38, "37.5 frames")
    h.eq(frames("500ms", 25), 13, "12.5 frames")
  end,

  ["a sub-frame value of at least one frame rounds to that frame"] = function()
    h.eq(frames("0.04s", 24), 1, "0.96 frames")
    h.eq(frames("0.04s", 60), 2, "2.4 frames")
  end,

  ["a value shorter than one frame is E_DURATION_RANGE naming the scene"] = function()
    local diagnostic = h.code_is(function()
      frames("0.001s", 30)
    end, "E_DURATION_RANGE", "range")
    h.contains(diagnostic.message, 'Scene "scene-001" has duration "0.001s"', "message")
    h.contains(diagnostic.message, "shorter than one frame at 30 fps", "message")
  end,

  ["a bare number is E_DURATION_SYNTAX naming the scene and the value"] = function()
    local diagnostic = h.code_is(function()
      frames("4", 30)
    end, "E_DURATION_SYNTAX", "syntax")
    h.eq(
      diagnostic.message,
      'Scene "scene-001" has duration "4", which must be a number of seconds or milliseconds, like "4s", "1.5s" or "500ms".',
      "message"
    )
    h.eq(diagnostic.property, "duration", "property")
  end,

  ["a unit other than s or ms is E_DURATION_SYNTAX"] = function()
    for _, text in ipairs({ "4f", "4min", "1e3s", "1 s", "abc", "2 seconds" }) do
      h.code_is(function()
        frames(text, 30)
      end, "E_DURATION_SYNTAX", text)
    end
  end,

  ["a missing or extra digit around the point is E_DURATION_SYNTAX"] = function()
    for _, text in ipairs({ "1.s", ".5s", "0.0005s" }) do
      h.code_is(function()
        frames(text, 30)
      end, "E_DURATION_SYNTAX", text)
    end
  end,

  ["a negative duration is E_DURATION_RANGE, not a syntax error"] = function()
    local diagnostic = h.code_is(function()
      frames("-1s", 30)
    end, "E_DURATION_RANGE", "range")
    h.eq(
      diagnostic.message,
      'Scene "scene-001" has duration "-1s", which must be greater than zero.',
      "message"
    )
  end,

  ["zero is E_DURATION_RANGE"] = function()
    h.code_is(function()
      frames("0s", 30)
    end, "E_DURATION_RANGE", "range")
    h.contains(error_message("0s", 30), "must be greater than zero", "message")
  end,

  ["a duration above 3600 s is E_DURATION_RANGE"] = function()
    h.eq(frames("3600s", 30), 108000, "upper bound")
    h.code_is(function()
      frames("3601s", 30)
    end, "E_DURATION_RANGE", "above bound")
    h.code_is(function()
      frames("1234567890s", 30)
    end, "E_DURATION_RANGE", "overlong digits")
  end,
  ["zero is a source in-point when allowed, and a negative value still fails"] = function()
    h.eq(duration.to_frames("0s", "scene-001", 30, "sourceStart", true), 0, "0s")
    h.eq(duration.to_frames("0ms", "scene-001", 30, "sourceStart", true), 0, "0ms")
    local err = h.error_of(function()
      duration.to_frames("-1s", "scene-001", 30, "sourceStart", true)
    end)
    h.contains(
      err,
      'Scene "scene-001" has sourceStart "-1s", which must not be negative',
      "message"
    )
  end,
}
