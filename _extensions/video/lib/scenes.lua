-- Collects `.scene` Divs into scene records (PRD §5.3, §9.2).
-- Scenes are read in pre-order, so document order holds for nested Divs too.
-- A scene id is the author's `#id` or `scene-NNN`, where NNN is the scene's
-- position among all scene Divs. Ids must be valid and unique. A `.scene`
-- anywhere else, or an attribute the filter does not know, is an error,
-- never ignored. Component names are not checked here (task 014). A scene
-- without a duration takes the front matter default (task 010). Every bad
-- scene is reported with its source line (lib/scan.lua, lib/locate.lua); the errors are
-- diagnostics (lib/diagnostics.lua).
local duration = require("lib.duration")
local diagnostics = require("lib.diagnostics")
local locate = require("lib.locate")

local M = {}

local ALLOWED_ATTRIBUTES = { component = true, duration = true }
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

local function scene_record(div, id, fps, default_frames, line)
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
    text = plain_text(div),
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

--- Returns one record { id, component, durationFrames, text, line } per
--- top-level scene. An empty list means the document has no scenes. Raises
--- every problem as one diagnostic error (lib/diagnostics.lua), in document
--- order. `fps` may be a placeholder when settings failed: the frames are
--- then discarded. `default_frames` is the frames of `defaults.scene.duration`
--- (see scene_frames). `scan` is lib/scan.lua's result, or nil when the
--- source text is unavailable (scenes then carry no line).
function M.collect(doc, fps, default_frames, scan)
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
      list[#list + 1] = diagnostics.try(
        function()
          return scene_record(entry.div, id, fps, default_frames, line)
        end,
        found,
        {
          sceneId = id,
          component = entry.div.attributes.component,
          line = line,
        }
      )
    end
  end
  diagnostics.raise(in_document_order(found))
  return list
end

return M
