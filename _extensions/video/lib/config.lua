-- Reads the front matter settings (PRD §5.2) and applies their defaults
-- (task 010). Keys are checked by lib/config_keys.lua. Every value that is
-- present must be valid: an invalid value is a diagnostic error
-- (E_SETTING_INVALID, or the duration codes for defaults.scene.duration).
-- Omitted values take the defaults below, so an empty document is valid.
local diagnostics = require("lib.diagnostics")
local duration = require("lib.duration")
local shapes = require("lib.meta")
local transitions = require("lib.transitions")

local M = {}

M.DEFAULTS = {
  width = 1920,
  height = 1080,
  fps = 30,
  background = "#000000",
  output = "output.mp4",
  reducedMotion = false,
}

local function invalid(property, message, suggestion)
  diagnostics.fail("E_SETTING_INVALID", message, { property = property, suggestion = suggestion })
end

-- The value of `block[key]` as text, or nil when the key is absent. `path`
-- names the block in messages. A map or list is not a single value.
local function text_of(block, key, path)
  local value = block and block[key]
  if value == nil then
    return nil
  end
  if shapes.is_map(value) or shapes.is_list(value) then
    invalid(
      path .. "." .. key,
      string.format("%s.%s must be a single value, not a block or a list", path, key),
      string.format('Write one value after "%s:" on the same line.', key)
    )
  end
  return shapes.text(value)
end

-- A front matter block (`video`, `defaults`, `defaults.scene`): nil when
-- absent or empty, the map otherwise. Any other shape is an error.
local function block(parent, key, path)
  local value = parent and parent[key]
  if shapes.blank(value) then
    return nil
  end
  if not shapes.is_map(value) then
    invalid(
      path,
      string.format("%s must be a block of settings with nested keys", path),
      string.format('Write "%s:" on its own line, with the settings indented below it.', key)
    )
  end
  return value
end

-- video.reducedMotion (task 023): a YAML true or false. Pandoc reads unquoted
-- booleans as Lua booleans, so text such as "true" is an error.
local function flag(video, key)
  local value = video and video[key]
  if value == nil then
    return M.DEFAULTS[key]
  end
  if type(value) ~= "boolean" then
    invalid(
      "video." .. key,
      string.format("video.%s must be true or false, not text", key),
      "Write true or false without quotes, for example reducedMotion: true."
    )
  end
  return value
end

-- A whole number of at least 1 under `video`, or the default.
local function positive_int(video, key)
  local text = text_of(video, key, "video")
  if text == nil then
    return M.DEFAULTS[key]
  end
  local number = text:match("^%d+$") and tonumber(text)
  if not number or number < 1 then
    invalid(
      "video." .. key,
      string.format('video.%s must be a whole number of at least 1, got "%s"', key, text),
      "Use a whole number of at least 1, for example 30."
    )
  end
  return number
end

-- width or height: a positive integer that H.264 (yuv420p, the renderer's
-- codec) can encode, so it must be even.
local function dimension(video, key)
  local number = positive_int(video, key)
  if number % 2 == 1 then
    invalid(
      "video." .. key,
      string.format("video.%s must be even for H.264, got %d", key, number),
      string.format("Use an even number, for example %d.", M.DEFAULTS[key])
    )
  end
  return number
end

local function background(video)
  local text = text_of(video, "background", "video")
  if text == nil then
    return M.DEFAULTS.background
  end
  if not text:match("^#%x%x%x%x%x%x$") then
    invalid(
      "video.background",
      string.format('video.background must be a hex colour like "#10131C", got "%s"', text),
      'Use a hex colour such as "#10131C".'
    )
  end
  return text
end

--- Returns { width, height, fps, background, reducedMotion } with defaults applied.
--- These are the only settings the IR carries (schema/ir-1.2.json). Every invalid
--- key is reported, not only the first.
function M.read(meta)
  local video = block(meta, "video", "video")
  local found = {}
  local settings = {
    width = diagnostics.try(function()
      return dimension(video, "width")
    end, found),
    height = diagnostics.try(function()
      return dimension(video, "height")
    end, found),
    fps = diagnostics.try(function()
      return positive_int(video, "fps")
    end, found),
    background = diagnostics.try(function()
      return background(video)
    end, found),
    reducedMotion = diagnostics.try(function()
      return flag(video, "reducedMotion")
    end, found),
  }
  diagnostics.raise(found)
  return settings
end

--- Returns video.output (default "output.mp4"): a path relative to the project
--- root that ends in .mp4. Absolute paths and ".." segments are errors.
function M.output(meta)
  local video = block(meta, "video", "video")
  local text = text_of(video, "output", "video")
  if text == nil then
    return M.DEFAULTS.output
  end
  local hint = 'Use a relative path such as "output.mp4".'
  if text == "" then
    invalid("video.output", "video.output must not be empty", hint)
  end
  if text:match("^[/\\]") or text:match("^%a:") then
    invalid(
      "video.output",
      string.format('video.output must be relative to the project, got "%s"', text),
      hint
    )
  end
  if ("/" .. text:gsub("\\", "/") .. "/"):find("/%.%./") then
    invalid(
      "video.output",
      string.format('video.output must not contain "..", got "%s"', text),
      hint
    )
  end
  if not text:lower():match("%.mp4$") then
    invalid("video.output", string.format('video.output must end in .mp4, got "%s"', text), hint)
  end
  return text
end

-- Text of a value that the IR does not carry yet (theme, title, transition:
-- resolved by tasks 019 and 015). Lists and maps are errors; so is empty text.
local function stored_text(value, property)
  if value == nil then
    return nil
  end
  if shapes.is_map(value) or shapes.is_list(value) then
    invalid(property, property .. " must be text", "Write a single name or sentence.")
  end
  local text = shapes.text(value)
  if text == "" then
    invalid(property, property .. " must not be empty", "Remove the key or write a value.")
  end
  return text
end

-- A transition name (lib/transitions.lua): lowercase, digits and hyphens.
-- Whether the registry knows it is checked by the validator (stage 4).
local function transition_name(value)
  local text = stored_text(value, "defaults.scene.transition")
  if text ~= nil and not transitions.valid_name(text) then
    invalid(
      "defaults.scene.transition",
      string.format('defaults.scene.transition must be a transition name, got "%s"', text),
      'Use a name such as "fade" or "cut".'
    )
  end
  return text
end

--- Returns { frames, transition } from `defaults.scene`: `frames` is the
--- length of `defaults.scene.duration` at `fps` (nil when not set), and
--- `transition` is the transition name (nil when not set). Invalid values
--- raise (ADR-0003 for the duration, ADR-0005 for the transition).
function M.scene_defaults(meta, fps)
  local defaults = block(meta, "defaults", "defaults")
  local scene = block(defaults, "scene", "defaults.scene")
  local found = {}
  local frames = diagnostics.try(function()
    local text = text_of(scene, "duration", "defaults.scene")
    if text ~= nil then
      return duration.default_frames(text, fps)
    end
    return nil
  end, found)
  local transition = diagnostics.try(function()
    return transition_name(scene and scene.transition)
  end, found)
  diagnostics.raise(found)
  return { frames = frames, transition = transition }
end

-- The author's video.background as written, or nil when it is not set. The
-- value was checked by M.read; a block or list here is ignored, not reported
-- twice. Only an explicit value is kept: the theme supplies the default canvas.
local function explicit_background(meta)
  local video = meta.video
  if not shapes.is_map(video) then
    return nil
  end
  local value = video.background
  if value == nil or shapes.is_map(value) or shapes.is_list(value) then
    return nil
  end
  return shapes.text(value)
end

--- Returns the stored-only settings { title, theme, background } (nil when
--- absent). They are validated here and resolved by the CLI and validator
--- (task 019, 019a); they stay out of the IR. `background` is set only when
--- video.background is written, so the renderer can tell it from the default.
function M.stored(meta)
  return {
    title = stored_text(meta.title, "title"),
    theme = stored_text(meta.theme, "theme"),
    background = explicit_background(meta),
  }
end

return M
