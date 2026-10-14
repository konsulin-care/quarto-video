-- Converts a duration to integer frames (PRD §5.3, §8.2; ADR-0003). Accepted:
-- "<n>s" or "<n>ms", n a decimal with at most three fraction digits. The
-- duration is held in whole microseconds (exact) and the frame count rounds
-- half up. Used for scene `duration` attributes and for the front matter
-- default `defaults.scene.duration`. Shared vectors:
-- packages/ir/test-vectors/durations.json (the TS helper runs them too).
local diagnostics = require("lib.diagnostics")

local M = {}

local MAX_MICROS = 3600 * 1000000 -- 3600 s (ADR-0003)
local MAX_WHOLE_DIGITS = 7

-- Names the duration in messages and suggestions. `head` builds the start of
-- the message from the value; `one` and `four` are example spellings.
-- `attribute` is the scene attribute: "duration" or "transitionDuration".
local function scene_context(scene_id, attribute)
  return {
    head = function(text)
      return string.format('Scene "%s" has %s "%s"', scene_id, attribute, text)
    end,
    property = attribute,
    one = 'duration="1s"',
    four = 'duration="4s"',
    shorter = "Use a shorter scene, for example by splitting it.",
  }
end

local DEFAULT_CONTEXT = {
  head = function(text)
    return string.format('The default scene duration "%s" (defaults.scene.duration)', text)
  end,
  property = "defaults.scene.duration",
  one = "defaults.scene.duration: 1s",
  four = "defaults.scene.duration: 4s",
  shorter = "Use a shorter default duration.",
}

-- Raises one diagnostic whose message is the context head, then the predicate.
local function fail(ctx, code, text, predicate, suggestion)
  diagnostics.fail(
    code,
    string.format("%s, which %s.", ctx.head(text), predicate),
    { property = ctx.property, suggestion = suggestion }
  )
end

local function range(ctx, text, predicate, suggestion)
  fail(ctx, "E_DURATION_RANGE", text, predicate, suggestion)
end

local function positive_hint(ctx)
  return string.format("Use a positive duration, for example %s.", ctx.one)
end

-- Frames for `text` at `fps`. Raises E_DURATION_SYNTAX for a bad form and
-- E_DURATION_RANGE for a value that is not a positive duration of at least
-- one frame and at most 3600 s.
local function frames_of(text, ctx, fps)
  if text:match("^%-%d") then
    range(ctx, text, "must be greater than zero", positive_hint(ctx))
  end
  local whole, dot, fraction, unit = text:match("^(%d+)(%.?)(%d*)(m?s)$")
  if whole == nil or (dot == "." and fraction == "") then
    fail(
      ctx,
      "E_DURATION_SYNTAX",
      text,
      'must be a number of seconds or milliseconds, like "4s", "1.5s" or "500ms"',
      string.format("Write seconds or milliseconds, for example %s.", ctx.four)
    )
  end
  if #fraction > 3 then
    fail(
      ctx,
      "E_DURATION_SYNTAX",
      text,
      "has more than 3 decimal places",
      string.format("Write seconds or milliseconds, for example %s.", ctx.four)
    )
  end
  if #whole > MAX_WHOLE_DIGITS then
    range(ctx, text, "must be at most 3600s", ctx.shorter)
  end
  local thousandths = tonumber(fraction .. string.rep("0", 3 - #fraction))
  local micros
  if unit == "s" then
    micros = tonumber(whole) * 1000000 + thousandths * 1000
  else
    micros = tonumber(whole) * 1000 + thousandths
  end
  if micros == 0 then
    range(ctx, text, "must be greater than zero", positive_hint(ctx))
  end
  if micros > MAX_MICROS then
    range(ctx, text, "must be at most 3600s", ctx.shorter)
  end
  local frames = math.floor((2 * micros * fps + 1000000) / 2000000)
  if frames < 1 then
    range(
      ctx,
      text,
      string.format("is shorter than one frame at %d fps", fps),
      "Use a longer duration."
    )
  end
  return frames
end

--- Returns the number of frames for a scene's `text` at `fps` (a positive
--- integer). `scene_id` names the scene in the message; `attribute` is the
--- scene attribute the text came from (default "duration").
function M.to_frames(text, scene_id, fps, attribute)
  return frames_of(text, scene_context(scene_id, attribute or "duration"), fps)
end

--- Returns the frames of the front matter default `defaults.scene.duration`.
--- The message names the setting, not a scene.
function M.default_frames(text, fps)
  return frames_of(text, DEFAULT_CONTEXT, fps)
end

return M
