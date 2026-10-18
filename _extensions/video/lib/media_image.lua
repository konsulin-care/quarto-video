-- The image item of a `.video` block (IR 1.10, ADR-0018; lib/media.lua). An image
-- is a framed still held for its scene: it takes src, fit, frame and alt. Each
-- attribute that only footage takes is an E_VIDEO_BLOCK error, as is a placement
-- other than framed (images are framed only). Returns the IR item, or nil after
-- one `report(code, message, suggestion)` call.
local props = require("lib.media_props")

local M = {}

-- Attributes that only footage takes: an image is a still with none of them.
local REFUSED = {
  "sourceStart",
  "sourceEnd",
  "audio",
  "volume",
  "loop",
  "freeze",
  "playbackRate",
  "region",
}

--- The IR item of an image `.video` block with the attributes `attrs`, or nil.
function M.node(attrs, report)
  for _, key in ipairs(REFUSED) do
    if attrs[key] ~= nil then
      return report(
        "E_VIDEO_BLOCK",
        string.format(
          'Scene "%%s" has an image video block with %s="%s".',
          key,
          props.quoted(attrs[key])
        ),
        "An image is a still held for the scene: remove "
          .. key
          .. ". Only video takes it (ADR-0018)."
      )
    end
  end
  if attrs.placement ~= "framed" then
    return report(
      "E_VIDEO_BLOCK",
      'Scene "%s" has an image video block that is not framed.',
      'Put the image in a device frame: placement="framed" frame="browser" (or phone, tablet, generic). Images are framed only (ADR-0018).'
    )
  end
  local src = props.src(report, attrs)
  local frame_ok, frame = props.frame(report, attrs, "framed")
  local fit = props.fit(report, attrs)
  if src == nil or not frame_ok or fit == nil then
    return nil
  end
  return {
    type = "video",
    kind = "image",
    src = src,
    placement = "framed",
    fit = fit,
    frame = frame,
    alt = attrs.alt or "",
  }
end

return M
