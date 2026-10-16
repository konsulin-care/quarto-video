-- Video footage blocks (IR 1.6; task 038; lib/media.lua, lib/media_props.lua).
-- A `.video` Div is a scene media item, not a slot. Each shape error has its
-- own code; source times are source frames at the fps (30 here).
local h = require("tests.helpers")
local content = require("lib.content")
local locate = require("lib.locate")
local json = require("lib.json")

local FPS = 30

--- Converts the content of the first scene of `body`: slots, findings, media.
local function convert(body)
  local div = locate.scene_divs(h.doc(body))[1].div
  return content.convert(div, FPS)
end

local function scene(inner)
  return '::: {.scene component="statement" duration="4s"}\n' .. inner .. "\n:::\n"
end

local function video(attrs)
  return "::: {.video " .. attrs .. "}\n:::"
end

local BASE = 'src="assets/clip.mp4" audio="mute"'

--- The findings of a body, as the diagnostics a scene gets (scene id "scene-001").
local function problems(body)
  local _, found = convert(body)
  local out = {}
  for i, finding in ipairs(found) do
    out[i] = content.problem(finding, "scene-001", "statement")
  end
  return out, found
end

--- The one finding of a body, checked for its code.
local function one_code(body, code)
  local diagnostics, found = problems(body)
  h.eq(#found, 1, "finding count")
  h.eq(diagnostics[1].code, code, "finding code")
  return diagnostics[1]
end

return {
  ["a video block is a background media item with source frames 0 and no end"] = function()
    local slots, found, media = convert(scene(video(BASE)))
    h.eq(#found, 0, "finding count")
    h.eq(slots.default, nil, "no default slot: the block is not content")
    h.eq(#media, 1, "media count")
    local item = media[1]
    h.eq(item.type, "video", "type")
    h.eq(item.src, "assets/clip.mp4", "src")
    h.eq(item.placement, "background", "default placement")
    h.eq(item.fit, "contain", "default fit")
    h.eq(item.sourceStartFrames, 0, "default in-point")
    h.eq(item.sourceEndFrames, nil, "no out-point: the end of the source")
    h.eq(item.audio, "mute", "audio")
    h.eq(item.loop, false, "loop default")
    h.eq(item.freeze, false, "freeze default")
    h.eq(item.playbackRate.text, "1", "playback rate default")
    h.eq(item.alt, "", "alt default")
  end,

  ["a video class is not a slot name, so the scene has no slot for it"] = function()
    local slots = convert(scene(video(BASE)))
    h.eq(slots["video"], nil, "no slot named video")
  end,

  ["a framed block keeps its frame and source range in source frames"] = function()
    local _, found, media = convert(
      scene(
        video(
          'src="assets/demo.mp4" placement="framed" frame="browser" fit="cover" '
            .. 'sourceStart="12s" sourceEnd="22.5s" audio="mute" alt="Demo"'
        )
      )
    )
    h.eq(#found, 0, "finding count")
    local item = media[1]
    h.eq(item.placement, "framed", "placement")
    h.eq(item.frame, "browser", "frame")
    h.eq(item.fit, "cover", "fit")
    h.eq(item.sourceStartFrames, 360, "12 s at 30 fps")
    h.eq(item.sourceEndFrames, 675, "22.5 s at 30 fps")
    h.eq(item.alt, "Demo", "alt")
  end,

  ["a zero in-point is allowed (0 frames)"] = function()
    local _, found, media = convert(scene(video(BASE .. ' sourceStart="0s" sourceEnd="1s"')))
    h.eq(#found, 0, "finding count")
    h.eq(media[1].sourceStartFrames, 0, "in-point")
    h.eq(media[1].sourceEndFrames, 30, "out-point")
  end,

  ["a playback rate is written exactly: .5 becomes 0.5, 2 stays 2"] = function()
    local _, _, half = convert(scene(video(BASE .. ' playbackRate=".5"')))
    h.eq(half[1].playbackRate.text, "0.5", "0.5")
    local _, _, twice = convert(scene(video(BASE .. ' playbackRate="2"')))
    h.eq(twice[1].playbackRate.text, "2", "2")
  end,

  ["sourceEnd at or before sourceStart is E_VIDEO_RANGE"] = function()
    local reversed =
      one_code(scene(video(BASE .. ' sourceStart="5s" sourceEnd="2s"')), "E_VIDEO_RANGE")
    h.contains(reversed.message, 'sourceStart "5s" at or after sourceEnd "2s"', "message")
    one_code(scene(video(BASE .. ' sourceStart="2s" sourceEnd="2s"')), "E_VIDEO_RANGE")
  end,

  ["a playback rate that is zero, negative or not a number is E_VIDEO_PLAYBACK_RATE"] = function()
    for _, rate in ipairs({ "0", "-1", "fast", "1e3" }) do
      local diagnostic =
        one_code(scene(video(BASE .. ' playbackRate="' .. rate .. '"')), "E_VIDEO_PLAYBACK_RATE")
      h.contains(
        diagnostic.message,
        'playbackRate="' .. rate .. '", which must be a positive number',
        rate
      )
    end
  end,

  ["loop and freeze together are E_VIDEO_LOOP_FREEZE"] = function()
    one_code(scene(video(BASE .. ' loop="true" freeze="true"')), "E_VIDEO_LOOP_FREEZE")
  end,

  ["loop alone is kept as a boolean"] = function()
    local _, found, media = convert(scene(video(BASE .. ' loop="true"')))
    h.eq(#found, 0, "finding count")
    h.eq(media[1].loop, true, "loop")
    h.eq(media[1].freeze, false, "freeze")
  end,

  ["a missing audio attribute is E_VIDEO_AUDIO_REQUIRED, not a shape error"] = function()
    local diagnostic = one_code(scene(video('src="assets/clip.mp4"')), "E_VIDEO_AUDIO_REQUIRED")
    h.contains(
      diagnostic.message,
      'Scene "scene-001" has a video block with no audio attribute',
      "message"
    )
  end,

  ["an audio value other than mute is E_VIDEO_BLOCK naming the value"] = function()
    local diagnostic = one_code(scene(video('src="assets/clip.mp4" audio="keep"')), "E_VIDEO_BLOCK")
    h.contains(diagnostic.message, 'audio="keep"', "message")
  end,

  ["an unknown attribute is E_VIDEO_BLOCK naming it, with the allowed list"] = function()
    local diagnostic = one_code(scene(video(BASE .. ' volume="0.5"')), "E_VIDEO_BLOCK")
    h.contains(diagnostic.message, 'unknown attribute "volume"', "message")
    h.contains(diagnostic.suggestion, "playbackRate", "allowed list")
  end,

  ["a frame on a background block is E_VIDEO_BLOCK"] = function()
    one_code(scene(video(BASE .. ' frame="phone"')), "E_VIDEO_BLOCK")
  end,

  ["a framed block without a frame is E_VIDEO_BLOCK"] = function()
    one_code(scene(video(BASE .. ' placement="framed"')), "E_VIDEO_BLOCK")
  end,

  ["a frame name that is not an identifier is E_VIDEO_BLOCK"] = function()
    one_code(scene(video(BASE .. ' placement="framed" frame="Phone!"')), "E_VIDEO_BLOCK")
  end,

  ["an identifier frame name is kept for the validator to check against the registry"] = function()
    local _, found, media = convert(scene(video(BASE .. ' placement="framed" frame="laptop"')))
    h.eq(#found, 0, "finding count")
    h.eq(media[1].frame, "laptop", "frame")
  end,

  ["an unknown placement, including a slot name, is E_VIDEO_BLOCK"] = function()
    local diagnostic = one_code(scene(video(BASE .. ' placement="left"')), "E_VIDEO_BLOCK")
    h.contains(diagnostic.message, 'placement="left"', "message")
  end,

  ["a missing src is E_VIDEO_BLOCK"] = function()
    one_code(scene(video('audio="mute"')), "E_VIDEO_BLOCK")
  end,

  ["a negative source time is E_DURATION_RANGE naming the scene and the attribute"] = function()
    local diagnostic = one_code(scene(video(BASE .. ' sourceStart="-1s"')), "E_DURATION_RANGE")
    h.contains(diagnostic.message, 'Scene "scene-001" has sourceStart "-1s"', "message")
  end,

  ["a source time that is not a duration is E_DURATION_SYNTAX"] = function()
    one_code(scene(video(BASE .. ' sourceEnd="1.5x"')), "E_DURATION_SYNTAX")
  end,

  ["a second video block in one scene is E_VIDEO_BLOCK"] = function()
    local _, found = convert(scene(video(BASE) .. "\n" .. video(BASE)))
    h.eq(#found, 1, "finding count")
    h.eq(found[1].code, "E_VIDEO_BLOCK", "code")
    h.eq(found[1].nth, 2, "the second block")
  end,

  ["a video block inside a slot is E_VIDEO_BLOCK, not a slot"] = function()
    local diagnostic = one_code(scene("::: {.left}\n" .. video(BASE) .. "\n:::"), "E_VIDEO_BLOCK")
    h.contains(diagnostic.message, "inside a slot", "message")
  end,

  ["a video block with content inside it is E_VIDEO_BLOCK"] = function()
    one_code(scene("::: {.video " .. BASE .. "}\nNot empty.\n:::"), "E_VIDEO_BLOCK")
  end,

  ["an unset playback rate and loop encode as the IR fields (json)"] = function()
    local _, _, media = convert(scene(video(BASE)))
    local text = json.encode({ playbackRate = media[1].playbackRate, loop = media[1].loop })
    h.contains(text, '"playbackRate": 1', "rate")
    h.contains(text, '"loop": false', "loop")
  end,
}
