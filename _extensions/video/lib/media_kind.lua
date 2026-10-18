-- The footage kind of a `.video` block (IR 1.10, ADR-0018): "image" when its src
-- has an image extension guaranteed by ADR-0008, otherwise "video". The rule
-- mirrors packages/validator/src/media/formats.ts (extensions match
-- case-insensitively; a dot that starts the file name is not an extension).
-- test_media_image.lua pins the list.
local M = {}

local IMAGE_EXTENSIONS = {
  [".png"] = true,
  [".jpg"] = true,
  [".jpeg"] = true,
  [".webp"] = true,
  [".svg"] = true,
}

-- The lower-case extension with its dot, or "" when the file name has none.
local function extension_of(src)
  local name = src:match("([^/]*)$")
  local dot = name:match(".*()%.")
  if dot == nil or dot == 1 then
    return ""
  end
  return name:sub(dot):lower()
end

--- "image" or "video" for the src of a `.video` block.
function M.of(src)
  if IMAGE_EXTENSIONS[extension_of(src)] then
    return "image"
  end
  return "video"
end

return M
