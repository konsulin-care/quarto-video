-- The project caption track (`video.captions`, PRD §12; task 046; ADR-0019): its
-- settings and their errors, the unknown keys under video.captions, and the IR
-- version a manifest with captions is written as.
local h = require("tests.helpers")
local captions = require("lib.captions")
local config_keys = require("lib.config_keys")
local manifest = require("lib.manifest")

--- The track of a front matter block written under `video:` (YAML lines).
local function track(fields)
  local meta =
    h.doc("", "---\nvideo:\n  width: 640\n  height: 360\n  fps: 30\n" .. fields .. "---\n\n").meta
  return captions.read(meta)
end

local function track_error(fields)
  return h.code_is(function()
    track(fields)
  end, "E_SETTING_INVALID", "video.captions")
end

local SRC = "  captions:\n    src: assets/captions.vtt\n"

local SETTINGS = { width = 640, height = 360, fps = 30, background = "#10131C" }

local function scene(id, frames)
  return { id = id, component = "statement", durationFrames = frames, slots = {}, line = 3 }
end

return {
  ["no video block means no caption track"] = function()
    h.eq(captions.read(h.doc("", "---\ntitle: Quiet\n---\n\n").meta), nil, "track")
  end,

  ["a video block without captions means no caption track"] = function()
    h.eq(track(""), nil, "track")
  end,

  ["an empty captions block means no caption track"] = function()
    h.eq(track("  captions:\n"), nil, "track")
  end,

  ["src and mode are read as written"] = function()
    local t = track(SRC .. "    mode: both\n")
    h.eq(t.src, "assets/captions.vtt", "src")
    h.eq(t.mode, "both", "mode")
  end,

  ["a backslash in src is kept as written, so the validator rejects it (ADR-0006)"] = function()
    h.eq(
      track("  captions:\n    src: assets\\captions.vtt\n    mode: both\n").src,
      "assets\\captions.vtt",
      "src"
    )
  end,

  ["each mode is accepted: burn, sidecar and both"] = function()
    for _, mode in ipairs({ "burn", "sidecar", "both" }) do
      h.eq(track(SRC .. "    mode: " .. mode .. "\n").mode, mode, "mode " .. mode)
    end
  end,

  ["a missing src is E_SETTING_INVALID naming video.captions.src"] = function()
    local diagnostic = track_error("  captions:\n    mode: burn\n")
    h.eq(diagnostic.property, "video.captions.src", "property")
  end,

  ["a missing mode is E_SETTING_INVALID: the mode is never guessed"] = function()
    local diagnostic = track_error(SRC)
    h.eq(diagnostic.property, "video.captions.mode", "property")
  end,

  ["an unknown mode is E_SETTING_INVALID listing the modes"] = function()
    local diagnostic = track_error(SRC .. "    mode: subtitles\n")
    h.eq(diagnostic.property, "video.captions.mode", "property")
    h.contains(diagnostic.message, '"subtitles"', "message names the value")
  end,

  ["every invalid key is reported together"] = function()
    local list = h.diagnostics_of(function()
      track("  captions:\n    mode: nope\n")
    end)
    h.eq(#list, 2, "two diagnostics")
  end,

  ["a block under captions that is text is E_SETTING_INVALID"] = function()
    track_error("  captions: vtt\n")
  end,

  ["an unknown key under video.captions is E_CONFIG_UNKNOWN_KEY"] = function()
    local diagnostic = h.code_is(function()
      config_keys.check(h.doc("", "---\nvideo:\n  captions:\n    sorce: a.vtt\n---\n\n").meta)
    end, "E_CONFIG_UNKNOWN_KEY", "video.captions.sorce")
    h.eq(diagnostic.property, "video.captions.sorce", "property")
  end,

  ["the known caption keys pass the key check"] = function()
    config_keys.check(
      h.doc("", "---\nvideo:\n  captions:\n    src: a.vtt\n    mode: burn\n---\n\n").meta
    )
  end,

  ["a manifest with captions is IR 1.11 with the track"] = function()
    local t = track(SRC .. "    mode: burn\n")
    local ir = manifest.build(SETTINGS, { scene("scene-001", 60) }, "index.qmd", nil, t)
    h.eq(ir.schemaVersion, "1.11", "schemaVersion")
    h.eq(ir.captions.src, "assets/captions.vtt", "captions.src")
    h.eq(ir.captions.mode, "burn", "captions.mode")
  end,

  ["a manifest without captions keeps its version"] = function()
    local ir = manifest.build(SETTINGS, { scene("scene-001", 60) }, "index.qmd", nil, nil)
    h.eq(ir.schemaVersion, "1.6", "schemaVersion")
    h.eq(ir.captions, nil, "captions")
  end,
}
