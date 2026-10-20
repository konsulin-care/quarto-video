-- The project caption track: the `video.captions` front matter block (PRD §12;
-- task 046; ADR-0019), read into the IR's `captions` field. Pure: the WebVTT file
-- is not read here. Its existence, format, cues and timing are the validator's
-- (stage 3). Both keys are required: the mode is never guessed. A bad value is
-- E_SETTING_INVALID. Returns nil when there is no track.
local diagnostics = require("lib.diagnostics")
local shapes = require("lib.meta")

local M = {}

local MODES = { burn = true, sidecar = true, both = true }

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

-- src: the project-relative WebVTT file (ADR-0006). Required and not empty here;
-- that it resolves inside the project and is a .vtt file is the validator's.
local function src_of(captions)
  if captions.src == nil then
    invalid(
      "video.captions.src",
      "video.captions needs src, the WebVTT file to show",
      "Add src with a .vtt file, for example src: assets/captions.vtt."
    )
  end
  local text = scalar(captions.src, "video.captions.src")
  if text == "" then
    invalid(
      "video.captions.src",
      "video.captions.src must not be empty",
      "Write the path of a .vtt file, for example assets/captions.vtt."
    )
  end
  return text
end

-- mode: burn, sidecar or both (ADR-0019).
local function mode_of(captions)
  if captions.mode == nil then
    invalid(
      "video.captions.mode",
      "video.captions needs mode: burn, sidecar or both",
      "Write mode: burn to draw the captions into the picture, sidecar to write output.vtt beside the video, or both."
    )
  end
  local text = scalar(captions.mode, "video.captions.mode")
  if not MODES[text] then
    invalid(
      "video.captions.mode",
      string.format('video.captions.mode must be burn, sidecar or both, got "%s"', text),
      "Write one of: burn, sidecar, both."
    )
  end
  return text
end

--- Returns the IR `captions` table ({ src, mode }) or nil. Every invalid key is
--- reported together.
function M.read(meta)
  local video = meta.video
  if shapes.blank(video) or not shapes.is_map(video) then
    return nil
  end
  local captions = video.captions
  if shapes.blank(captions) then
    return nil
  end
  if not shapes.is_map(captions) then
    invalid(
      "video.captions",
      "video.captions must be a block of settings with nested keys",
      'Write "captions:" on its own line, with src and mode indented below it.'
    )
  end
  local found = {}
  local src = diagnostics.try(function()
    return src_of(captions)
  end, found)
  local mode = diagnostics.try(function()
    return mode_of(captions)
  end, found)
  diagnostics.raise(found)
  return { src = src, mode = mode }
end

return M
