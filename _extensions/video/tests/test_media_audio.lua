-- Source audio of a `.video` block (IR 1.8, task 044; ADR-0009): keep and its
-- volume, the rate rule for kept sound, and the IR version that carries it.
-- Shares the helpers of test_media.lua (lib/media.lua, lib/media_props.lua).
local h = require("tests.helpers")
local content = require("lib.content")
local locate = require("lib.locate")
local json = require("lib.json")
local manifest = require("lib.manifest")

local SETTINGS = { width = 1920, height = 1080, fps = 30, background = "#10131C" }
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

--- The finding of a body, checked for its code.
local function one_code(body, code)
  local _, found = convert(body)
  h.eq(#found, 1, "finding count")
  h.eq(found[1].code, code, "finding code")
  return {
    message = content.problem(found[1], "scene-001", "statement").message,
  }
end

return {
  ["keep is kept with volume 1 unless a volume is given (ADR-0009)"] = function()
    local _, found, media = convert(scene(video('src="assets/clip.mp4" audio="keep"')))
    h.eq(#found, 0, "finding count")
    h.eq(media[1].audio, "keep", "audio")
    h.eq(media[1].volume.text, "1", "default volume")
    local _, _, half = convert(scene(video('src="assets/clip.mp4" audio="keep" volume=".5"')))
    h.eq(half[1].volume.text, "0.5", "volume written exactly")
  end,

  ["a volume on a muted block is E_VIDEO_BLOCK (volume needs keep)"] = function()
    local diagnostic = one_code(scene(video(BASE .. ' volume="0.5"')), "E_VIDEO_BLOCK")
    h.contains(diagnostic.message, "volume", "message")
  end,

  ["a muted block has no volume field in the IR"] = function()
    local _, _, media = convert(scene(video(BASE)))
    h.eq(media[1].volume, nil, "volume")
  end,

  ["a volume outside (0, 1] or not a number is E_VIDEO_VOLUME naming the value"] = function()
    for _, text in ipairs({ "0", "0.0", "1.5", "-0.5", "loud" }) do
      local diagnostic = one_code(
        scene(video('src="assets/clip.mp4" audio="keep" volume="' .. text .. '"')),
        "E_VIDEO_VOLUME"
      )
      h.contains(diagnostic.message, 'volume="' .. text .. '"', "message for " .. text)
    end
  end,

  ["keep at a playback rate other than 1 is E_AUDIO_RATE (no stretched sound)"] = function()
    local diagnostic =
      one_code(scene(video('src="assets/clip.mp4" audio="keep" playbackRate="2"')), "E_AUDIO_RATE")
    h.contains(diagnostic.message, 'audio="keep" and playbackRate="2"', "message")
  end,

  ["keep at playbackRate 1 is allowed, and mute at another rate is not an audio error"] = function()
    local _, found = convert(scene(video('src="assets/clip.mp4" audio="keep" playbackRate="1"')))
    h.eq(#found, 0, "keep at rate 1")
    local _, muted = convert(scene(video(BASE .. ' playbackRate="2"')))
    h.eq(#muted, 0, "mute at rate 2")
  end,

  ["a scene that keeps source audio is written as IR 1.8, whatever else it has"] = function()
    local kept = {
      id = "s1",
      component = "title",
      durationFrames = 30,
      media = { { placement = "background", audio = "keep", volume = json.decimal("1") } },
    }
    local muted = {
      id = "s1",
      component = "title",
      durationFrames = 30,
      media = { { placement = "background", audio = "mute" } },
    }
    h.eq(manifest.build(SETTINGS, { kept }, "index.qmd").schemaVersion, "1.8", "kept")
    h.eq(manifest.build(SETTINGS, { muted }, "index.qmd").schemaVersion, "1.6", "muted")
  end,
}
