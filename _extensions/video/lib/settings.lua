-- Reads the required `video` settings from front matter (PRD §5.2).
-- No defaults yet (task 010): a missing or invalid setting is a diagnostic
-- error (E_SETTING_MISSING, E_SETTING_INVALID).
local diagnostics = require("lib.diagnostics")

local M = {}

local function missing(key)
  diagnostics.fail(
    "E_SETTING_MISSING",
    string.format("video.%s is required in front matter", key),
    {
      property = "video." .. key,
      suggestion = string.format('Add "%s: <value>" under video in the front matter.', key),
    }
  )
end

local function invalid(key, message, suggestion)
  diagnostics.fail(
    "E_SETTING_INVALID",
    message,
    { property = "video." .. key, suggestion = suggestion }
  )
end

local function text_of(video, key)
  local value = video[key]
  if value == nil then
    missing(key)
  end
  return pandoc.utils.stringify(value)
end

local function positive_int(video, key)
  local text = text_of(video, key)
  local number = text:match("^%d+$") and tonumber(text)
  if not number or number < 1 then
    invalid(
      key,
      string.format('video.%s must be a whole number of at least 1, got "%s"', key, text),
      "Use a whole number of at least 1, for example 30."
    )
  end
  return number
end

local function background(video)
  local text = text_of(video, "background")
  if not text:match("^#%x%x%x%x%x%x$") then
    invalid(
      "background",
      string.format('video.background must be a hex colour like "#10131C", got "%s"', text),
      'Use a hex colour such as "#10131C".'
    )
  end
  return text
end

local DEFAULT_OUTPUT = "output.mp4"

--- Returns video.output (default "output.mp4"): a path relative to the project
--- root that ends in .mp4. Absolute paths and ".." segments are errors.
function M.output(meta)
  local video = meta.video
  if video == nil or video.output == nil then
    return DEFAULT_OUTPUT
  end
  local text = pandoc.utils.stringify(video.output)
  local hint = 'Use a relative path such as "output.mp4".'
  if text == "" then
    invalid("output", "video.output must not be empty", hint)
  end
  if text:match("^[/\\]") or text:match("^%a:") then
    invalid(
      "output",
      string.format('video.output must be relative to the project, got "%s"', text),
      hint
    )
  end
  if ("/" .. text:gsub("\\", "/") .. "/"):find("/%.%./") then
    invalid("output", string.format('video.output must not contain "..", got "%s"', text), hint)
  end
  if not text:lower():match("%.mp4$") then
    invalid("output", string.format('video.output must end in .mp4, got "%s"', text), hint)
  end
  return text
end

--- Returns { width, height, fps, background } from document metadata.
function M.read(meta)
  local video = meta.video
  if video == nil then
    diagnostics.fail(
      "E_SETTING_MISSING",
      "front matter needs a video block with width, height, fps and background",
      {
        property = "video",
        suggestion = "Add a video block with width, height, fps and background.",
      }
    )
  end
  return {
    width = positive_int(video, "width"),
    height = positive_int(video, "height"),
    fps = positive_int(video, "fps"),
    background = background(video),
  }
end

return M
