-- Converts a scene duration attribute to integer frames (PRD §5.3, §8.2;
-- ADR-0003). Accepted: "<n>s" or "<n>ms", n a decimal with at most three
-- fraction digits. The duration is held in whole microseconds (exact) and
-- the frame count rounds half up. Shared vectors:
-- packages/ir/test-vectors/durations.json (the TS helper runs them too).
local diagnostics = require("lib.diagnostics")

local M = {}

local MAX_MICROS = 3600 * 1000000 -- 3600 s (ADR-0003)
local MAX_WHOLE_DIGITS = 7

-- Raises a diagnostic that names the scene and the value.
local function fail(code, scene_id, text, predicate, suggestion)
  diagnostics.fail(
    code,
    string.format('Scene "%s" has duration "%s", which %s.', scene_id, text, predicate),
    { property = "duration", suggestion = suggestion }
  )
end

local function syntax(scene_id, text, predicate)
  fail(
    "E_DURATION_SYNTAX",
    scene_id,
    text,
    predicate,
    'Write seconds or milliseconds, for example duration="4s".'
  )
end

local function range(scene_id, text, predicate, suggestion)
  fail("E_DURATION_RANGE", scene_id, text, predicate, suggestion)
end

--- Returns the number of frames for `text` at `fps` (a positive integer).
--- `scene_id` names the scene in the message. Raises E_DURATION_SYNTAX for a
--- bad form and E_DURATION_RANGE for a value that is not a positive duration
--- of at least one frame and at most 3600 s.
function M.to_frames(text, scene_id, fps)
  if text:match("^%-%d") then
    range(
      scene_id,
      text,
      "must be greater than zero",
      'Use a positive duration, for example duration="1s".'
    )
  end
  local whole, dot, fraction, unit = text:match("^(%d+)(%.?)(%d*)(m?s)$")
  if whole == nil or (dot == "." and fraction == "") then
    syntax(
      scene_id,
      text,
      'must be a number of seconds or milliseconds, like "4s", "1.5s" or "500ms"'
    )
  end
  if #fraction > 3 then
    syntax(scene_id, text, "has more than 3 decimal places")
  end
  if #whole > MAX_WHOLE_DIGITS then
    range(
      scene_id,
      text,
      "must be at most 3600s",
      "Use a shorter scene, for example by splitting it."
    )
  end
  local thousandths = tonumber(fraction .. string.rep("0", 3 - #fraction))
  local micros
  if unit == "s" then
    micros = tonumber(whole) * 1000000 + thousandths * 1000
  else
    micros = tonumber(whole) * 1000 + thousandths
  end
  if micros == 0 then
    range(
      scene_id,
      text,
      "must be greater than zero",
      'Use a positive duration, for example duration="1s".'
    )
  end
  if micros > MAX_MICROS then
    range(
      scene_id,
      text,
      "must be at most 3600s",
      "Use a shorter scene, for example by splitting it."
    )
  end
  local frames = math.floor((2 * micros * fps + 1000000) / 2000000)
  if frames < 1 then
    range(
      scene_id,
      text,
      string.format("is shorter than one frame at %d fps", fps),
      "Use a longer duration."
    )
  end
  return frames
end

return M
