-- Collects `.scene` Divs into scene records (PRD §5.3, §9.2).
-- Scenes are read in pre-order, so document order holds for nested Divs too.
-- A scene id is the author's `#id` or `scene-NNN`, where NNN is the scene's
-- position among all scene Divs. Ids must be valid and unique. A `.scene`
-- anywhere else, or an attribute the filter does not know, is an error,
-- never ignored. Component names are not checked here (task 014). A scene
-- without a duration takes the front matter default (task 010). Its content is
-- typed blocks in slots (lib/content.lua, ADR-0004). Every bad scene is
-- reported with its source line (lib/scan.lua, lib/locate.lua,
-- lib/content_lines.lua); the errors are diagnostics (lib/diagnostics.lua).
local duration = require("lib.duration")
local diagnostics = require("lib.diagnostics")
local locate = require("lib.locate")
local content = require("lib.content")
local content_lines = require("lib.content_lines")
local transitions = require("lib.transitions")
local animations = require("lib.animations")

local M = {}

local ALLOWED_ATTRIBUTES = {
  component = true,
  duration = true,
  transition = true,
  transitionDuration = true,
  animation = true,
}
local NESTED_MESSAGE =
  "'.scene' Divs must be top-level blocks (nested scenes are not supported yet)."

local function check_shape(div, id)
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
          suggestion = "Allowed attributes: component, duration, transition, transitionDuration, animation.",
        }
      )
    end
  end
end

-- An explicit duration wins; otherwise the front matter default applies
-- (`default_frames`: nil when no default is set, false when the default is
-- invalid and already reported, so the frames are discarded).
local function scene_frames(div, id, fps, default_frames)
  local text = div.attributes.duration
  if text ~= nil then
    return duration.to_frames(text, id, fps)
  end
  if default_frames == false then
    return 1
  end
  if default_frames ~= nil then
    return default_frames
  end
  diagnostics.fail(
    "E_SCENE_NO_DURATION",
    string.format('Scene "%s" has no duration attribute.', id),
    { property = "duration", suggestion = 'Add duration="<n>s", for example duration="4s".' }
  )
end

local function scene_record(div, id, fps, default_frames, line, slots, transition, animation)
  check_shape(div, id)
  local component = div.attributes.component
  if component == nil or component == "" then
    diagnostics.fail(
      "E_SCENE_NO_COMPONENT",
      string.format('Scene "%s" has no component attribute.', id),
      { property = "component", suggestion = 'Add component="<name>"' }
    )
  end
  return {
    id = id,
    component = component,
    durationFrames = scene_frames(div, id, fps, default_frames),
    transition = transition,
    animation = animation,
    slots = slots,
    line = line,
  }
end

-- The second use of an id: names both lines when the lines are known.
local function duplicate_problem(id, first_line, line)
  local message
  if first_line and line then
    message = string.format('Scene id "%s" is used on line %d and line %d.', id, first_line, line)
  else
    message = string.format('Scene id "%s" is used by more than one scene.', id)
  end
  return diagnostics.new("E_SCENE_DUPLICATE_ID", message, {
    property = "id",
    suggestion = string.format("Give one of the scenes another id, for example #%s-2.", id),
    sceneId = id,
    line = line,
  })
end

-- Document order for the diagnostics, ties kept in the order they were found.
local function in_document_order(list)
  local keyed = {}
  for i, diagnostic in ipairs(list) do
    keyed[i] = { diagnostic = diagnostic, seq = i }
  end
  table.sort(keyed, function(a, b)
    local la = a.diagnostic.line or math.huge
    local lb = b.diagnostic.line or math.huge
    if la ~= lb then
      return la < lb
    end
    return a.seq < b.seq
  end)
  local sorted = {}
  for i, item in ipairs(keyed) do
    sorted[i] = item.diagnostic
  end
  return sorted
end

-- Converts the content of one scene. Each unsupported element becomes an
-- E_CONTENT_UNSUPPORTED diagnostic in `found`, at its line when it is found.
local function content_slots(div, id, line, scan, found)
  local slots, unsupported = content.convert(div)
  content_lines.assign(scan, content_lines.opener_at(scan, line), unsupported)
  for _, finding in ipairs(unsupported) do
    found[#found + 1] = content.problem(finding, id, div.attributes.component)
  end
  return slots
end

--- Returns one record { id, component, durationFrames, transition, slots,
--- line } per top-level scene. An empty list means the document has no scenes.
--- Raises every problem as one diagnostic error (lib/diagnostics.lua), in
--- document order. `fps` may be a placeholder when settings failed: the frames
--- are then discarded. `default_frames` is the frames of
--- `defaults.scene.duration` (see scene_frames); `default_transition` is the
--- name of `defaults.scene.transition` (lib/transitions.lua). `scan` is
--- lib/scan.lua's result, or nil when the source text is unavailable (scenes
--- then carry no line).
function M.collect(doc, fps, default_frames, scan, default_transition)
  local entries, complete = locate.scene_divs(doc)
  local lines, unread = locate.pair(scan, entries)
  local found = {}
  for _, problem in ipairs(scan and scan.problems or {}) do
    found[#found + 1] = problem
  end
  for _, problem in ipairs(unread) do
    found[#found + 1] = problem
  end
  if not complete then
    found[#found + 1] = diagnostics.new("E_SCENE_NESTED", NESTED_MESSAGE, {
      property = "scene",
      suggestion = "Move the scene out of the enclosing block.",
    })
  end

  local ids, seen = {}, {}
  for i, entry in ipairs(entries) do
    local id = entry.div.identifier
    if id == "" then
      id = string.format("scene-%03d", i)
    elseif not locate.valid_id(id) then
      found[#found + 1] = locate.id_problem(id, lines[i])
    end
    ids[i] = id
    if seen[id] then
      found[#found + 1] = duplicate_problem(id, seen[id].line, lines[i])
    else
      seen[id] = { line = lines[i] }
    end
  end

  local list = {}
  for i, entry in ipairs(entries) do
    local id, line = ids[i], lines[i]
    if entry.nested then
      found[#found + 1] = diagnostics.new("E_SCENE_NESTED", NESTED_MESSAGE, {
        property = "scene",
        suggestion = "Move the scene out of the enclosing block.",
        sceneId = id,
        line = line,
      })
    else
      local slots = content_slots(entry.div, id, line, scan, found)
      local context = {
        sceneId = id,
        component = entry.div.attributes.component,
        line = line,
      }
      local transition = diagnostics.try(function()
        return transitions.resolve(entry.div, id, fps, i, default_transition)
      end, found, context)
      local animation = diagnostics.try(function()
        return animations.resolve(entry.div, id)
      end, found, context)
      list[#list + 1] = diagnostics.try(function()
        return scene_record(entry.div, id, fps, default_frames, line, slots, transition, animation)
      end, found, context)
    end
  end
  diagnostics.raise(in_document_order(found))
  return list
end

return M
