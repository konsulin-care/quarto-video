-- Front matter value shapes as the Lua filter sees them. A map is a plain
-- Lua table; text is a Pandoc value (Inlines) or an empty Lua string; a list
-- is a Pandoc List. Shared by lib/config.lua and lib/config_keys.lua.
local M = {}

--- True for a front matter map (a block with nested keys).
function M.is_map(value)
  return type(value) == "table" and pandoc.utils.type(value) == "table"
end

--- True for a front matter list.
function M.is_list(value)
  return value ~= nil and pandoc.utils.type(value) == "List"
end

--- The text of a scalar value ("" for an empty value).
function M.text(value)
  if type(value) == "string" then
    return value
  end
  return pandoc.utils.stringify(value)
end

--- True when a value is absent or has no text.
function M.blank(value)
  return value == nil or (not M.is_map(value) and M.text(value) == "")
end

return M
