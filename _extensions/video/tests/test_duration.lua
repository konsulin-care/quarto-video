-- Duration attribute to frames (task 003 subset; full parser is task 009).
local h = require("tests.helpers")
local duration = require("lib.duration")

return {
  ["duration 4s at 30 fps is 120 frames"] = function()
    h.eq(duration.to_frames("4s", 30), 120, "frames")
  end,

  ["rejects fractional seconds"] = function()
    local err = h.error_of(function()
      duration.to_frames("1.5s", 30)
    end)
    h.contains(err, 'must be whole seconds like "4s"', "error")
  end,

  ["rejects a bare number without a unit"] = function()
    local err = h.error_of(function()
      duration.to_frames("4", 30)
    end)
    h.contains(err, 'must be whole seconds like "4s"', "error")
  end,

  ["rejects zero seconds"] = function()
    local err = h.error_of(function()
      duration.to_frames("0s", 30)
    end)
    h.contains(err, "must be at least 1s", "error")
  end,

  ["a bad form has code E_DURATION_SYNTAX and a range error E_DURATION_RANGE"] = function()
    h.code_is(function()
      duration.to_frames("1.5s", 30)
    end, "E_DURATION_SYNTAX", "syntax")
    h.code_is(function()
      duration.to_frames("0s", 30)
    end, "E_DURATION_RANGE", "range")
  end,
}
