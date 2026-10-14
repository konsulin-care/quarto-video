-- Reads the required `video` settings from front matter (PRD §5.2).
-- No defaults yet (task 010): a missing or invalid setting is a filter error.
local M = {}

local function text_of(video, key)
  local value = video[key]
  if value == nil then
    error(string.format("video.%s is required in front matter", key), 0)
  end
  return pandoc.utils.stringify(value)
end

local function positive_int(video, key)
  local text = text_of(video, key)
  local number = text:match("^%d+$") and tonumber(text)
  if not number or number < 1 then
    error(string.format('video.%s must be a whole number of at least 1, got "%s"', key, text), 0)
  end
  return number
end

local function background(video)
  local text = text_of(video, "background")
  if not text:match("^#%x%x%x%x%x%x$") then
    error(string.format('video.background must be a hex colour like "#10131C", got "%s"', text), 0)
  end
  return text
end

local DEFAULT_OUTPUT = "output.mp4"

--- Returns video.output (default "output.mp4"): a path relative to the project
--- root that ends in .mp4. Absolute paths and ".." segments are filter errors.
function M.output(meta)
  local video = meta.video
  if video == nil or video.output == nil then
    return DEFAULT_OUTPUT
  end
  local text = pandoc.utils.stringify(video.output)
  if text == "" then
    error("video.output must not be empty", 0)
  end
  if text:match("^[/\\]") or text:match("^%a:") then
    error(string.format('video.output must be relative to the project, got "%s"', text), 0)
  end
  if ("/" .. text:gsub("\\", "/") .. "/"):find("/%.%./") then
    error(string.format('video.output must not contain "..", got "%s"', text), 0)
  end
  if not text:lower():match("%.mp4$") then
    error(string.format('video.output must end in .mp4, got "%s"', text), 0)
  end
  return text
end

--- Returns { width, height, fps, background } from document metadata.
function M.read(meta)
  local video = meta.video
  if video == nil then
    error("front matter needs a video block with width, height, fps and background", 0)
  end
  return {
    width = positive_int(video, "width"),
    height = positive_int(video, "height"),
    fps = positive_int(video, "fps"),
    background = background(video),
  }
end

return M
