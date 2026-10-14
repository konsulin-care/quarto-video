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

--- The source text of a document: the standard front matter (or `front`)
--- followed by `body`. This is what the filter scans for source lines.
function M.text(body, front)
  return (front or FRONT_MATTER) .. body
end

--- Parses `body` after the standard front matter (or `front` when given).
function M.doc(body, front)
  return pandoc.read(M.text(body, front), "markdown")
end

--- Returns the error message raised by `fn`, or nil when it does not raise.
function M.error_of(fn)
  local ok, err = pcall(fn)
  if ok then
    return nil
  end
  return tostring(err)
end

--- Returns the list of diagnostics raised by `fn` (empty when it does not raise).
function M.diagnostics_of(fn)
  local ok, err = pcall(fn)
  if ok or type(err) ~= "table" or not err.diagnostics then
    return {}
  end
  return err.diagnostics
end

--- Fails unless the first diagnostic raised by `fn` has the given code.
function M.code_is(fn, code, label)
  local list = M.diagnostics_of(fn)
  M.eq(list[1] and list[1].code, code, label .. " code")
  return list[1]
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
