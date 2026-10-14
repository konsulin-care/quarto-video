-- Helpers shared by the Lua unit tests. Documents are parsed by Pandoc's
-- own Markdown reader, so front matter and Divs behave as in a real render.
local M = {}

local FRONT_MATTER = table.concat({
  "---",
  "video:",
  "  width: 1920",
  "  height: 1080",
  "  fps: 30",
  '  background: "#10131C"',
  "---",
  "",
}, "\n")

--- Parses `body` after the standard front matter (or `front` when given).
function M.doc(body, front)
  return pandoc.read((front or FRONT_MATTER) .. body, "markdown")
end

--- Returns the error message raised by `fn`, or nil when it does not raise.
function M.error_of(fn)
  local ok, err = pcall(fn)
  if ok then
    return nil
  end
  return tostring(err)
end

--- Fails with a readable message unless `actual == expected`.
function M.eq(actual, expected, label)
  if actual ~= expected then
    error(string.format("%s: expected %s, got %s", label, tostring(expected), tostring(actual)), 0)
  end
end

--- Fails unless `text` contains `needle` (plain text, not a pattern).
function M.contains(text, needle, label)
  if not text or not text:find(needle, 1, true) then
    error(string.format("%s: expected to contain %s, got %s", label, needle, tostring(text)), 0)
  end
end

return M
