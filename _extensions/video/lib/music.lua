-- The project background music track: the `audio.music` front matter block
-- (PRD §7.1; task 045; ADR-0017), read into the IR's `music` field. Pure: the
-- file is not read here. Its existence, format and length are the validator's
-- (stages 3 and 4). A bad value is E_SETTING_INVALID, or the duration codes for
-- fadeOut (lib/duration.lua). Returns nil when there is no track.
local diagnostics = require("lib.diagnostics")
local duration = require("lib.duration")
local json = require("lib.json")
local props = require("lib.media_props")
local shapes = require("lib.meta")

local M = {}

local DEFAULT_VOLUME = "1"

local function invalid(property, message, suggestion)
  diagnostics.fail("E_SETTING_INVALID", message, { property = property, suggestion = suggestion })
end

-- The text of a scalar setting. A block or a list is an error, not a value.
local function scalar(value, property)
  if shapes.is_map(value) or shapes.is_list(value) then
    invalid(
      property,
      property .. " must be a single value, not a block or a list",
      "Write one value after the key on the same line."
    )
  end
  return shapes.text(value)
end

-- src: the project-relative file (ADR-0006). Required and not empty here; that
-- it resolves inside the project and is a .wav file is the validator's.
local function src_of(music)
  if music.src == nil then
    invalid(
      "audio.music.src",
      "audio.music needs src, the file to play",
      "Add src with a .wav file, for example src: assets/music.wav."
    )
  end
  local text = scalar(music.src, "audio.music.src")
  if text == "" then
    invalid(
      "audio.music.src",
      "audio.music.src must not be empty",
      "Write the path of a .wav file, for example assets/music.wav."
    )
  end
  return text
end

-- volume: a decimal above 0 and at most 1 (ADR-0009), default 1. Returns the
-- canonical numeral, as lib/media_props.lua writes a kept clip's volume.
local function volume_of(music)
  if music.volume == nil then
    return DEFAULT_VOLUME
  end
  local text = scalar(music.volume, "audio.music.volume")
  local canonical = props.canonical_decimal(text)
  if canonical == nil or tonumber(canonical) <= 0 or tonumber(canonical) > 1 then
    invalid(
      "audio.music.volume",
      string.format('audio.music.volume must be above 0 and at most 1, got "%s"', text),
      "Write a volume such as volume: 0.5 (about -6 dB). Volume never boosts a source."
    )
  end
  return canonical
end

-- loop: a YAML true or false, default false (a text value is an error).
local function loop_of(music)
  local value = music.loop
  if value == nil then
    return false
  end
  if type(value) ~= "boolean" then
    invalid(
      "audio.music.loop",
      "audio.music.loop must be true or false, not text",
      "Write true or false without quotes, for example loop: true."
    )
  end
  return value
end

-- fadeOut: a duration (ADR-0003) of at least one frame, or nil for no fade.
local function fade_of(music, fps)
  if music.fadeOut == nil then
    return nil
  end
  local text = scalar(music.fadeOut, "audio.music.fadeOut")
  return duration.setting_frames(text, "audio.music.fadeOut", fps)
end

--- Returns the IR `music` table ({ src, volume, loop, fadeOutFrames? }) or nil.
--- `fps` converts fadeOut to frames. Every invalid key is reported together.
function M.read(meta, fps)
  local audio = meta.audio
  if shapes.blank(audio) then
    return nil
  end
  if not shapes.is_map(audio) then
    invalid(
      "audio",
      "audio must be a block of settings with nested keys",
      'Write "audio:" on its own line, with the music block indented below it.'
    )
  end
  local music = audio.music
  if shapes.blank(music) then
    return nil
  end
  if not shapes.is_map(music) then
    invalid(
      "audio.music",
      "audio.music must be a block of settings with nested keys",
      'Write "music:" on its own line, with src and the other keys indented below it.'
    )
  end
  local found = {}
  local src = diagnostics.try(function()
    return src_of(music)
  end, found)
  local volume = diagnostics.try(function()
    return volume_of(music)
  end, found)
  local loop = diagnostics.try(function()
    return loop_of(music)
  end, found)
  local fade = diagnostics.try(function()
    return fade_of(music, fps)
  end, found)
  diagnostics.raise(found)
  local track = { src = src, volume = json.decimal(volume), loop = loop }
  if fade ~= nil then
    track.fadeOutFrames = fade
  end
  return track
end

return M
