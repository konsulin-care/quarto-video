-- Collects `.scene` Divs into scene records (PRD §5.3).
-- Scenes are top-level blocks in document order. A `.scene` anywhere else,
-- or an attribute the filter does not know, is an error, never ignored.
-- Component names are not checked here (task 014).
local duration = require("lib.duration")

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
    error(id .. ": a scene Div takes no identifier", 0)
  end
  for _, class in ipairs(div.classes) do
    if class ~= "scene" then
      error(string.format('%s: unknown class "%s" on a scene Div', id, class), 0)
    end
  end
  for key in pairs(div.attributes) do
    if not ALLOWED_ATTRIBUTES[key] then
      error(string.format('%s: unknown attribute "%s" (allowed: component, duration)', id, key), 0)
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

local function scene_record(div, index, fps)
  local id = string.format("scene-%03d", index)
  check_shape(div, id)
  local component = div.attributes.component
  if component == nil or component == "" then
    error(id .. ": the component attribute is required", 0)
  end
  local text = div.attributes.duration
  if text == nil then
    error(id .. ": the duration attribute is required (defaults arrive in task 010)", 0)
  end
  return {
    id = id,
    component = component,
    durationFrames = duration.to_frames(text, fps),
    text = plain_text(div),
  }
end

--- Returns one record { id, component, durationFrames, text } per scene.
--- An empty list means the document has no scenes.
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
  if total ~= #top then
    error("'.scene' Divs must be top-level blocks (nested scenes are not supported yet)", 0)
  end
  local scenes = {}
  for i, div in ipairs(top) do
    scenes[i] = scene_record(div, i, fps)
  end
  return scenes
end

return M
