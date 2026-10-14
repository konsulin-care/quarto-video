-- Collects `.scene` Divs into scene records (PRD §5.3).
-- Scenes are top-level blocks in document order. A `.scene` anywhere else,
-- or an attribute the filter does not know, is an error, never ignored.
-- Component names are not checked here (task 014). Every bad scene is
-- reported; the errors are diagnostics (lib/diagnostics.lua).
local duration = require("lib.duration")
local diagnostics = require("lib.diagnostics")

local M = {}

local ALLOWED_ATTRIBUTES = { component = true, duration = true }

local function has_class(el, name)
  for _, class in ipairs(el.classes) do
    if class == name then
      return true
    end
  end
  return false
end

local function is_scene(el)
  return el.t == "Div" and has_class(el, "scene")
end

local function check_shape(div, id)
  if div.identifier ~= "" then
    diagnostics.fail(
      "E_SCENE_SHAPE",
      string.format('Scene "%s" must not have an identifier.', id),
      { property = "id", suggestion = "Remove the #identifier from the scene." }
    )
  end
  for _, class in ipairs(div.classes) do
    if class ~= "scene" then
      diagnostics.fail(
        "E_SCENE_SHAPE",
        string.format('Scene "%s" has an unknown class "%s".', id, class),
        { property = "class", suggestion = 'Use only the class "scene".' }
      )
    end
  end
  for key in pairs(div.attributes) do
    if not ALLOWED_ATTRIBUTES[key] then
      diagnostics.fail(
        "E_SCENE_SHAPE",
        string.format('Scene "%s" has an unknown attribute "%s".', id, key),
        {
          property = key,
          suggestion = "Allowed attributes: component, duration.",
        }
      )
    end
  end
end

-- One paragraph per line; text is plain (structured content is task 012).
local function plain_text(div)
  local parts = {}
  for _, block in ipairs(div.content) do
    local text = pandoc.utils.stringify(block)
    if text ~= "" then
      parts[#parts + 1] = text
    end
  end
  return table.concat(parts, "\n")
end

local function scene_record(div, id, fps)
  check_shape(div, id)
  local component = div.attributes.component
  if component == nil or component == "" then
    diagnostics.fail(
      "E_SCENE_NO_COMPONENT",
      string.format('Scene "%s" has no component attribute.', id),
      { property = "component", suggestion = 'Add component="<name>"' }
    )
  end
  local text = div.attributes.duration
  if text == nil then
    diagnostics.fail(
      "E_SCENE_NO_DURATION",
      string.format('Scene "%s" has no duration attribute.', id),
      { property = "duration", suggestion = 'Add duration="<n>s", for example duration="4s".' }
    )
  end
  return {
    id = id,
    component = component,
    durationFrames = duration.to_frames(text, fps),
    text = plain_text(div),
  }
end

--- Returns one record { id, component, durationFrames, text } per scene.
--- An empty list means the document has no scenes. Raises every problem as
--- one diagnostic error (lib/diagnostics.lua). `fps` may be a placeholder
--- when settings failed: the frames are then discarded.
function M.collect(doc, fps)
  local top = {}
  for _, block in ipairs(doc.blocks) do
    if is_scene(block) then
      top[#top + 1] = block
    end
  end
  local total = 0
  doc:walk({
    Div = function(div)
      if is_scene(div) then
        total = total + 1
      end
      return nil
    end,
  })
  local found = {}
  if total ~= #top then
    found[#found + 1] = diagnostics.new(
      "E_SCENE_NESTED",
      "'.scene' Divs must be top-level blocks (nested scenes are not supported yet).",
      { property = "scene", suggestion = "Move the scene out of the enclosing block." }
    )
  end
  local scenes = {}
  for i, div in ipairs(top) do
    local id = string.format("scene-%03d", i)
    scenes[i] = diagnostics.try(function()
      return scene_record(div, id, fps)
    end, found, { sceneId = id, component = div.attributes.component })
  end
  diagnostics.raise(found)
  return scenes
end

return M
