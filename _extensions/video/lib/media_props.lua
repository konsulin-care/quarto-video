-- Readers for the properties of a `.video` block (task 038; lib/media.lua).
-- Each reader returns its value, or nil after one `report(code, message,
-- suggestion)` call when the value is not allowed. A message is a format
-- string: the scene id goes in %s, and any text the author wrote is quoted
-- first (quoted). A source time goes through lib/duration.lua at the project
-- fps, with zero allowed for an in-point.
local diagnostics = require("lib.diagnostics")
local duration = require("lib.duration")

local M = {}

local PLACEMENTS = { background = true, framed = true }
local FITS = { cover = true, contain = true }
local FRAMES = { browser = true, phone = true, tablet = true, generic = true }
local DEFAULT_PLACEMENT = "background"
local DEFAULT_FIT = "contain"

--- Doubles every % so the text can sit inside a format string.
function M.quoted(text)
  return (tostring(text):gsub("%%", "%%%%"))
end

--- The src attribute: a non-empty project path (stage 3 checks the file).
function M.src(report, attrs)
  if attrs.src == nil or attrs.src == "" then
    return report(
      "E_VIDEO_BLOCK",
      'Scene "%s" has a video block with no src attribute.',
      'Add src="assets/<file>" with a path inside the project, for example src="assets/clip.mp4".'
    )
  end
  return attrs.src
end

--- The audio policy, which is required (PRD §6.2). Only "mute" until task 044.
function M.audio(report, attrs)
  if attrs.audio == nil then
    return report(
      "E_VIDEO_AUDIO_REQUIRED",
      'Scene "%s" has a video block with no audio attribute.',
      'Add audio="mute". Keeping the source audio is not supported yet (task 044).'
    )
  end
  if attrs.audio ~= "mute" then
    return report(
      "E_VIDEO_BLOCK",
      string.format('Scene "%%s" has a video block with audio="%s".', M.quoted(attrs.audio)),
      'Use audio="mute". Keeping the source audio is not supported yet (task 044).'
    )
  end
  return "mute"
end

--- The placement: background (the default) or framed. Slot placement is task 043.
function M.placement(report, attrs)
  local placement = attrs.placement or DEFAULT_PLACEMENT
  if not PLACEMENTS[placement] then
    return report(
      "E_VIDEO_BLOCK",
      string.format('Scene "%%s" has a video block with placement="%s".', M.quoted(placement)),
      'Use placement="background" or placement="framed". Placing video in a slot is not supported yet.'
    )
  end
  return placement
end

--- The frame style: required with `framed`, and not allowed otherwise. Returns
--- ok and the frame (nil when there is none); ok is false after a finding.
function M.frame(report, attrs, placement)
  if placement == "framed" then
    if attrs.frame == nil or not FRAMES[attrs.frame] then
      report(
        "E_VIDEO_BLOCK",
        'Scene "%s" has a framed video block without a valid frame attribute.',
        'Add frame="browser", "phone", "tablet" or "generic".'
      )
      return false, nil
    end
    return true, attrs.frame
  end
  if attrs.frame ~= nil then
    report(
      "E_VIDEO_BLOCK",
      'Scene "%s" has a frame on a video block that is not framed.',
      'Remove frame, or use placement="framed" to show the video in a frame.'
    )
    return false, nil
  end
  return true, nil
end

--- The fit: cover or contain (default contain: the whole footage is shown).
function M.fit(report, attrs)
  local fit = attrs.fit or DEFAULT_FIT
  if not FITS[fit] then
    return report(
      "E_VIDEO_BLOCK",
      string.format('Scene "%%s" has a video block with fit="%s".', M.quoted(fit)),
      'Use fit="cover" to fill the frame or fit="contain" to show the whole video.'
    )
  end
  return fit
end

--- A boolean attribute: "true" or "false" (default false).
function M.flag(report, attrs, key)
  local text = attrs[key]
  if text == nil or text == "false" then
    return false
  end
  if text == "true" then
    return true
  end
  return report(
    "E_VIDEO_BLOCK",
    string.format('Scene "%%s" has a video block with %s="%s".', key, M.quoted(text)),
    string.format('Write %s="true" or %s="false".', key, key)
  )
end

--- A source time (sourceStart or sourceEnd) as source frames at fps. The
--- duration errors of lib/duration.lua are reported as they are written.
function M.source_frames(report, attribute, text, fps)
  if text:find("%", 1, true) then
    return report(
      "E_DURATION_SYNTAX",
      string.format('Scene "%%s" has %s "%s", which is not a duration.', attribute, M.quoted(text)),
      'Write seconds or milliseconds, for example sourceStart="12s" or sourceEnd="22.5s".'
    )
  end
  local errors = {}
  local frames = diagnostics.try(function()
    return duration.to_frames(text, "%s", fps, attribute, true)
  end, errors)
  for _, d in ipairs(errors) do
    report(d.code, d.message, d.suggestion)
  end
  return frames
end

--- The playback rate as a canonical decimal numeral (for json.decimal): a
--- positive number, written exactly.
function M.playback_rate(report, text)
  local canonical = text:match("^%.%d+$") and ("0" .. text) or text
  canonical = (canonical:gsub("^0+(%d)", "%1"))
  local valid = canonical:match("^%d+$") or canonical:match("^%d+%.%d+$")
  if not valid or tonumber(canonical) == 0 then
    return report(
      "E_VIDEO_PLAYBACK_RATE",
      string.format(
        'Scene "%%s" has a video block with playbackRate="%s", which must be a positive number.',
        M.quoted(text)
      ),
      'Write a positive number, for example playbackRate="0.5" or playbackRate="2".'
    )
  end
  return canonical
end

return M
