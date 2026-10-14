-- Scene ids, scene Divs and the pairing of source lines (PRD §5.3, §9.2;
-- task 011). The raw text is read by lib/scan.lua, which marks each scene
-- fence with its line. Here the marked text is parsed once more: its scene
-- Divs are paired with the document's Divs in document order, and a pair
-- counts only when nesting, attributes and text all agree. A fence Pandoc
-- does not read as a block is an error at its line, never ignored.
local diagnostics = require("lib.diagnostics")

local M = {}

local MAX_ID_LENGTH = 64

--- Attribute the scan adds to each scene fence: its line in the source.
M.MARK = "data-qv-line"
local MARK = M.MARK

--- True for a `.scene` Div.
function M.is_scene(div)
  if div.t ~= "Div" then
    return false
  end
  for _, class in ipairs(div.classes) do
    if class == "scene" then
      return true
    end
  end
  return false
end

--- True when `id` is a valid scene id: a letter, then lowercase letters,
--- digits and hyphens, at most 64 characters (IR 0.1 allows digits first;
--- the DSL does not, so `#1` is an error).
function M.valid_id(id)
  return #id <= MAX_ID_LENGTH and id:match("^[a-z][a-z0-9-]*$") ~= nil
end

--- A valid id close to `id`, for the suggestion of E_SCENE_ID_INVALID.
function M.suggest_id(id)
  local clean = (id:lower():gsub("[^a-z0-9-]", "-"))
  if not clean:match("^[a-z]") then
    clean = "scene-" .. clean
  end
  return clean:sub(1, MAX_ID_LENGTH)
end

--- The E_SCENE_ID_INVALID diagnostic for `id` on `line`.
function M.id_problem(id, line)
  return diagnostics.new("E_SCENE_ID_INVALID", string.format('Scene id "%s" is not valid.', id), {
    property = "id",
    suggestion = string.format(
      "Use #%s; ids start with a letter and use lowercase letters, digits and hyphens.",
      M.suggest_id(id)
    ),
    line = line,
  })
end

--- The block lists directly inside a block, in document order.
local function children(block)
  local t = block.t
  if t == "Div" or t == "BlockQuote" or t == "Figure" then
    return { block.content }
  elseif t == "BulletList" or t == "OrderedList" then
    return block.content
  elseif t == "DefinitionList" then
    local groups = {}
    for _, item in ipairs(block.content) do
      for _, definition in ipairs(item[2]) do
        groups[#groups + 1] = definition
      end
    end
    return groups
  end
  return {}
end

--- Scene Divs in pre-order, each { div, nested } (nested: inside another
--- block). `complete` is false when a scene sits in a block this walk does
--- not enter (a table), so it cannot be listed.
function M.scene_divs(doc)
  local list = {}
  local function visit(blocks, depth)
    for _, block in ipairs(blocks) do
      if M.is_scene(block) then
        list[#list + 1] = { div = block, nested = depth > 0 }
      end
      for _, group in ipairs(children(block)) do
        visit(group, depth + 1)
      end
    end
  end
  visit(doc.blocks, 0)
  local total = 0
  doc:walk({
    Div = function(div)
      if M.is_scene(div) then
        total = total + 1
      end
      return nil
    end,
  })
  return list, total == #list
end

-- Two scene Divs are the same scene: same nesting, attributes and text.
local function same_scene(a, b)
  return a.nested == b.nested
    and a.div.attributes.component == b.div.attributes.component
    and a.div.attributes.duration == b.div.attributes.duration
    and pandoc.utils.stringify(a.div) == pandoc.utils.stringify(b.div)
end

--- Pairs the scene Divs of the document (`entries`, from scene_divs) with the
--- scan. Returns `lines` (index -> line of that Div; empty unless every pair
--- verifies) and `problems` (scene fences Pandoc did not read as a block).
function M.pair(source, entries)
  local lines, problems = {}, {}
  if source == nil then
    return lines, problems
  end
  local marked = M.scene_divs(pandoc.read(source.marked, "markdown"))
  local read = {}
  for _, entry in ipairs(marked) do
    local line = tonumber(entry.div.attributes[MARK])
    if line then
      read[line] = true
    end
  end
  for _, opener in ipairs(source.openers) do
    if not read[opener.line] then
      problems[#problems + 1] = diagnostics.new(
        "E_SCENE_SHAPE",
        string.format("The .scene on line %d is not read as a block.", opener.line),
        {
          property = "scene",
          suggestion = "Put a blank line before its opening fence, and keep it out of tables and code.",
          line = opener.line,
        }
      )
    end
  end
  if #marked ~= #entries then
    return lines, problems
  end
  for i, entry in ipairs(entries) do
    local line = tonumber(marked[i].div.attributes[MARK])
    if line == nil or not same_scene(entry, marked[i]) then
      return {}, problems
    end
    lines[i] = line
  end
  return lines, problems
end

return M
