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
-- Pandoc reads a metadata value as Markdown, so a backslash before a letter becomes a
-- raw inline (`assets\captions.vtt` gives Str "assets", RawInline "\captions", Str ".vtt").
-- stringify drops raw inlines, so the text is rebuilt from each item: a backslash must
-- reach the validator, which rejects it (ADR-0006).
function M.text(value)
  if type(value) == "string" then
    return value
  end
  if pandoc.utils.type(value) == "Inlines" then
    local parts = {}
    for _, item in ipairs(value) do
      parts[#parts + 1] = item.tag == "RawInline" and item.text or pandoc.utils.stringify(item)
    end
    return table.concat(parts)
  end
  return pandoc.utils.stringify(value)
end

--- True when a value is absent or has no text.
function M.blank(value)
  return value == nil or (not M.is_map(value) and M.text(value) == "")
end

return M
