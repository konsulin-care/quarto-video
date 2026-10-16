-- The project music track (`audio.music`, PRD §7.1; task 045; ADR-0017): its
-- settings and their errors, the unknown keys under audio, and the IR version
-- a manifest with a track is written as.
local h = require("tests.helpers")
local music = require("lib.music")
local config_keys = require("lib.config_keys")
local manifest = require("lib.manifest")

local FPS = 30

--- The track of a front matter block written under `audio:` (YAML lines).
local function track(fields, fps)
  local meta = h.doc("", "---\naudio:\n" .. fields .. "---\n\n").meta
  return music.read(meta, fps or FPS)
end

local function track_error(fields)
  return h.code_is(function()
    track(fields)
  end, "E_SETTING_INVALID", "audio.music")
end

local SRC = "  music:\n    src: assets/music.wav\n"

local function scene(id, frames)
  return { id = id, component = "statement", durationFrames = frames, slots = {}, line = 3 }
end

local SETTINGS = { width = 1920, height = 1080, fps = FPS, background = "#10131C" }

return {
  ["no audio block means no track"] = function()
    h.eq(music.read(h.doc("", "---\ntitle: Quiet\n---\n\n").meta, FPS), nil, "track")
  end,

  ["an empty music block means no track"] = function()
    h.eq(track("  music:\n"), nil, "track")
  end,

  ["a track takes the defaults: volume 1, no loop, no fade"] = function()
    local t = track(SRC)
    h.eq(t.src, "assets/music.wav", "src")
    h.eq(t.volume.text, "1", "volume written as a number")
    h.eq(t.loop, false, "loop")
    h.eq(t.fadeOutFrames, nil, "fadeOutFrames")
  end,

  ["volume, loop and fadeOut are read as frames at the project fps"] = function()
    local t = track(SRC .. "    volume: 0.4\n    loop: true\n    fadeOut: 1s\n", 24)
    h.eq(t.volume.text, "0.4", "volume")
    h.eq(t.loop, true, "loop")
    h.eq(t.fadeOutFrames, 24, "fadeOutFrames at 24 fps")
  end,

  ["a fadeOut in milliseconds is rounded to frames"] = function()
    h.eq(track(SRC .. "    fadeOut: 500ms\n").fadeOutFrames, 15, "fadeOutFrames")
  end,

  ["a missing src is E_SETTING_INVALID naming audio.music.src"] = function()
    local diagnostic = track_error("  music:\n    loop: true\n")
    h.eq(diagnostic.property, "audio.music.src", "property")
  end,

  ["an empty src is E_SETTING_INVALID"] = function()
    local diagnostic = track_error('  music:\n    src: ""\n')
    h.eq(diagnostic.property, "audio.music.src", "property")
  end,

  ["a volume outside (0, 1] is E_SETTING_INVALID (no boosting)"] = function()
    for _, value in ipairs({ "0", "1.5", "-0.2", "loud" }) do
      local diagnostic = track_error(SRC .. "    volume: " .. value .. "\n")
      h.eq(diagnostic.property, "audio.music.volume", "property for " .. value)
    end
  end,

  ["loop written as text is E_SETTING_INVALID"] = function()
    local diagnostic = track_error(SRC .. '    loop: "true"\n')
    h.eq(diagnostic.property, "audio.music.loop", "property")
  end,

  ["a fadeOut that is not a duration is a duration error"] = function()
    h.code_is(function()
      track(SRC .. "    fadeOut: 1x\n")
    end, "E_DURATION_SYNTAX", "fadeOut 1x")
  end,

  ["a zero fadeOut is a duration range error"] = function()
    h.code_is(function()
      track(SRC .. "    fadeOut: 0s\n")
    end, "E_DURATION_RANGE", "fadeOut 0s")
  end,

  ["audio that is not a block is E_SETTING_INVALID"] = function()
    local diagnostic = h.code_is(function()
      music.read(h.doc("", "---\naudio: music\n---\n\n").meta, FPS)
    end, "E_SETTING_INVALID", "audio")
    h.eq(diagnostic.property, "audio", "property")
  end,

  ["an unknown key under audio.music is E_CONFIG_UNKNOWN_KEY"] = function()
    local meta = h.doc("", "---\naudio:\n" .. SRC .. "    gain: 0.5\n---\n\n").meta
    local diagnostic = h.code_is(function()
      config_keys.check(meta)
    end, "E_CONFIG_UNKNOWN_KEY", "gain")
    h.eq(diagnostic.property, "audio.music.gain", "property")
  end,

  ["an unknown key under audio is E_CONFIG_UNKNOWN_KEY, with a suggestion"] = function()
    local meta = h.doc("", "---\naudio:\n  musik:\n    src: a.wav\n---\n\n").meta
    local diagnostic = h.code_is(function()
      config_keys.check(meta)
    end, "E_CONFIG_UNKNOWN_KEY", "musik")
    h.eq(diagnostic.suggestion, 'Did you mean "music"?', "suggestion")
  end,

  ["a manifest with a track is written as IR 1.9 and carries it"] = function()
    local t = track(SRC .. "    loop: true\n")
    local ir = manifest.build(SETTINGS, { scene("scene-001", 60) }, "index.qmd", t)
    h.eq(ir.schemaVersion, "1.9", "schemaVersion")
    h.eq(ir.music.src, "assets/music.wav", "music.src")
    h.eq(ir.music.loop, true, "music.loop")
  end,

  ["a manifest without a track keeps its version"] = function()
    local ir = manifest.build(SETTINGS, { scene("scene-001", 60) }, "index.qmd", nil)
    h.eq(ir.schemaVersion, "1.6", "schemaVersion")
    h.eq(ir.music, nil, "music")
  end,
}
