-- Video footage blocks (IR 1.6, task 038; IR 1.7 region footage, task 043 and
-- ADR-0016; IR 1.8 source audio, task 044 and ADR-0009; PRD §6.1, §6.2): a Div with the class `video`, directly in a scene.
-- Its properties (lib/media_props.lua) become one `media` item of the scene, with
-- source times as source frames at the project fps (lib/duration.lua), never
-- timeline frames. A scene holds one background or framed block, or one region
-- block per region, never both. A shape error is a finding for lib/content.lua
-- with its own code. Nothing is stretched, and an unknown property is an error
-- (AGENT.md). `count` numbers the video Divs of the scene (the `nth` that
-- lib/content_lines.lua searches for). M.reset() starts a scene.
local json = require("lib.json")
local props = require("lib.media_props")

local M = {}

local VIDEO_CLASS = "video"
local PROPERTIES = {
  src = true,
  placement = true,
  region = true,
  fit = true,
  frame = true,
  sourceStart = true,
  sourceEnd = true,
  audio = true,
  volume = true,
  loop = true,
  freeze = true,
  playbackRate = true,
  alt = true,
}
local PROPERTY_LIST =
  "src, placement, region, fit, frame, sourceStart, sourceEnd, audio, volume, loop, freeze, playbackRate, alt"
local count = 0
-- Regions read in this scene, and whether a background or framed block was.
local seen = {}
local plain = false

--- Starts counting the video Divs of a new scene.
function M.reset()
  count = 0
  seen = {}
  plain = false
end

--- True for a Div that has the class `video`.
function M.is_video(el)
  for _, class in ipairs(el.classes) do
    if class == VIDEO_CLASS then
      return true
    end
  end
  return false
end

-- A reporter for one block: each finding goes to `found` with the block's
-- occurrence number. Messages are format strings (the scene id is %s).
local function reporter(found)
  return function(code, message, suggestion)
    found[#found + 1] = {
      code = code,
      kind = "video-block",
      nth = count,
      message = message,
      suggestion = suggestion,
    }
    return nil
  end
end

local function sorted_keys(attrs)
  local keys = {}
  for key in pairs(attrs) do
    keys[#keys + 1] = key
  end
  table.sort(keys)
  return keys
end

-- Shape: known attributes, one class, no id, empty, and the only video block
-- of the scene. Returns true when the block may be read.
local function check_shape(el, report)
  for _, key in ipairs(sorted_keys(el.attributes)) do
    if not PROPERTIES[key] then
      return report(
        "E_VIDEO_BLOCK",
        string.format(
          'Scene "%%s" has a video block with the unknown attribute "%s".',
          props.quoted(key)
        ),
        "Allowed attributes: " .. PROPERTY_LIST .. "."
      )
    end
  end
  if el.identifier ~= "" or #el.classes ~= 1 then
    return report(
      "E_VIDEO_BLOCK",
      'Scene "%s" has a video block with an id or more than one class.',
      'Write the block as ::: {.video src="assets/clip.mp4" audio="mute"}.'
    )
  end
  if #el.content > 0 then
    return report(
      "E_VIDEO_BLOCK",
      'Scene "%s" has a video block with content inside it.',
      "Keep the video block empty; put the text in the scene's slots."
    )
  end
  return true
end

-- Repeats: a second background or framed block, or a region block whose region
-- is taken or that shares the scene with a background or framed block.
local function check_repeat(region, report)
  if region == nil and count > 1 then
    return report(
      "E_VIDEO_BLOCK",
      'Scene "%s" has a second video block.',
      "Give each video its own scene; a scene holds one video block."
    )
  end
  if region ~= nil and (seen[region] or plain) then
    return report(
      "E_VIDEO_BLOCK",
      'Scene "%s" has a second video block for its region.',
      "Give each region one video block, and do not mix region and background or framed blocks in one scene."
    )
  end
  return true
end

--- One `.video` Div -> an IR media item, or a finding in `found` and nil.
--- `fps` is the project frame rate.
function M.node(el, found, fps)
  count = count + 1
  local report = reporter(found)
  if not check_shape(el, report) then
    return nil
  end
  local attrs = el.attributes
  local region = nil
  if attrs.region ~= nil then
    region = props.region(report, attrs)
    if region == nil or not check_repeat(region, report) then
      return nil
    end
    seen[region] = true
  else
    if not check_repeat(nil, report) then
      return nil
    end
    plain = true
  end
  local src = props.src(report, attrs)
  local audio = props.audio(report, attrs)
  local placement = region ~= nil and "region" or props.placement(report, attrs)
  if src == nil or audio == nil or placement == nil then
    return nil
  end
  local frame_ok, frame = props.frame(report, attrs, placement)
  local fit = props.fit(report, attrs)
  local loop = props.flag(report, attrs, "loop")
  local freeze = props.flag(report, attrs, "freeze")
  if not frame_ok or fit == nil or loop == nil or freeze == nil then
    return nil
  end
  if loop and freeze then
    return report(
      "E_VIDEO_LOOP_FREEZE",
      'Scene "%s" has a video block with both loop and freeze.',
      'Use loop="true" to repeat short footage, or freeze="true" to hold its last frame. Not both.'
    )
  end
  local rate = props.playback_rate(report, attrs.playbackRate or "1")
  if rate == nil then
    return nil
  end
  if audio == "keep" and tonumber(rate) ~= 1 then
    return report(
      "E_AUDIO_RATE",
      string.format(
        'Scene "%%s" has a video block with audio="keep" and playbackRate="%s".',
        props.quoted(attrs.playbackRate)
      ),
      'Keep the source sound only at playbackRate="1" (ADR-0009), or use audio="mute" for footage at another speed.'
    )
  end
  local volume_ok, volume = props.volume(report, attrs, audio)
  if not volume_ok then
    return nil
  end
  local start = 0
  if attrs.sourceStart ~= nil then
    start = props.source_frames(report, "sourceStart", attrs.sourceStart, fps)
  end
  local stop = nil
  if attrs.sourceEnd ~= nil then
    stop = props.source_frames(report, "sourceEnd", attrs.sourceEnd, fps)
  end
  if start == nil or (attrs.sourceEnd ~= nil and stop == nil) then
    return nil
  end
  if stop ~= nil and start >= stop then
    return report(
      "E_VIDEO_RANGE",
      string.format(
        'Scene "%%s" has a video block with sourceStart "%s" at or after sourceEnd "%s".',
        props.quoted(attrs.sourceStart or "0s"),
        props.quoted(attrs.sourceEnd)
      ),
      "Make sourceEnd later than sourceStart, so the source range has a length."
    )
  end
  return {
    type = "video",
    src = src,
    placement = placement,
    region = region,
    fit = fit,
    frame = frame,
    sourceStartFrames = start,
    sourceEndFrames = stop,
    audio = audio,
    volume = volume and json.decimal(volume) or nil,
    loop = loop,
    freeze = freeze,
    playbackRate = json.decimal(rate),
    alt = attrs.alt or "",
  }
end

--- A `.video` Div inside a slot (not directly in the scene): E_VIDEO_BLOCK.
function M.misplaced(found)
  count = count + 1
  reporter(found)(
    "E_VIDEO_BLOCK",
    'Scene "%s" has a video block inside a slot.',
    "Put the video block directly in the scene, not inside a slot."
  )
end

return M
