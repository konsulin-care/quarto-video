-- Image blocks (IR 1.3, ADR-0013; task 033): a Div with the class `image` and
-- the attributes src, fit and alt, with no content. A shape error is an
-- E_IMAGE_BLOCK finding for lib/content.lua; `image_count` numbers the image
-- Divs of the scene being converted (the `nth` that lib/content_lines.lua
-- searches for). M.reset() starts a scene.
local M = {}

local IMAGE_CLASS = "image"
local IMAGE_ATTRIBUTES = { src = true, fit = true, alt = true }
local FITS = { cover = true, contain = true }
local DEFAULT_FIT = "contain"
local image_count = 0

--- Starts counting the image Divs of a new scene.
function M.reset()
  image_count = 0
end

--- True for a Div that has the class `image`.
function M.is_image(el)
  for _, class in ipairs(el.classes) do
    if class == IMAGE_CLASS then
      return true
    end
  end
  return false
end

-- A message is a format string: the scene id goes in %s, and any text the
-- author wrote has its % doubled first.
local function quoted(text)
  return (tostring(text):gsub("%%", "%%%%"))
end

local function image_problem(found, message, suggestion)
  found[#found + 1] = {
    code = "E_IMAGE_BLOCK",
    kind = "image-block",
    nth = image_count,
    message = message,
    suggestion = suggestion,
  }
  return nil
end

--- One image Div -> an IR image block, or an E_IMAGE_BLOCK finding in `found`.
function M.node(el, found)
  image_count = image_count + 1
  local attrs = el.attributes
  for key in pairs(attrs) do
    if not IMAGE_ATTRIBUTES[key] then
      return image_problem(
        found,
        string.format(
          'Scene "%%s" has an image block with the unknown attribute "%s".',
          quoted(key)
        ),
        "Allowed attributes: src, fit, alt."
      )
    end
  end
  if el.identifier ~= "" or #el.classes ~= 1 then
    return image_problem(
      found,
      'Scene "%s" has an image block with an id or more than one class.',
      "Write the block as ::: {.image src=... alt=...}."
    )
  end
  if #el.content > 0 then
    return image_problem(
      found,
      'Scene "%s" has an image block with content inside it.',
      "Keep the image block empty and put the caption in a .caption slot after it."
    )
  end
  if image_count > 1 then
    return image_problem(
      found,
      'Scene "%s" has a second image block.',
      "Give each image its own scene; a scene holds one image."
    )
  end
  if attrs.src == nil or attrs.src == "" then
    return image_problem(
      found,
      'Scene "%s" has an image block with no src attribute.',
      'Add src="assets/<file>" with a path inside the project, for example src="assets/photo.png".'
    )
  end
  if attrs.alt == nil then
    return image_problem(
      found,
      'Scene "%s" has an image block with no alt attribute.',
      'Add alt="..." describing the image, or alt="" if it is decorative.'
    )
  end
  if attrs.fit ~= nil and not FITS[attrs.fit] then
    return image_problem(
      found,
      string.format('Scene "%%s" has an image block with fit="%s".', quoted(attrs.fit)),
      'Use fit="cover" to fill the frame or fit="contain" to show the whole image.'
    )
  end
  return {
    type = "image",
    src = attrs.src,
    fit = attrs.fit or DEFAULT_FIT,
    alt = attrs.alt,
  }
end

return M
