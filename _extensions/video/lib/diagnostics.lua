-- Filter diagnostics (packages/validator/README.md, "Diagnostic shape").
-- A stage raises a diagnostic error with fail(); a caller collects them with
-- try(), so every problem of a stage is reported, not just the first. Other
-- Lua errors are bugs and propagate unchanged. The list is written to
-- <project>/.video-build/diagnostics.json for the CLI to print.
local json = require("lib.json")

local M = {}

local BUILD_DIR = ".video-build"
local FILE_NAME = "diagnostics.json"

-- Raised values carry their diagnostics; tostring() gives the messages, so
-- plain-text callers and tests read the same wording as the JSON file.
local ERROR_META = {
  __tostring = function(err)
    local lines = {}
    for i, diagnostic in ipairs(err.diagnostics) do
      lines[i] = diagnostic.message
    end
    return table.concat(lines, "\n")
  end,
}

--- Returns an error diagnostic. `fields` may set property, suggestion,
--- sceneId, component or assetPath.
function M.new(code, message, fields)
  local diagnostic = { severity = "error", code = code, message = message }
  for key, value in pairs(fields or {}) do
    diagnostic[key] = value
  end
  return diagnostic
end

--- Raises a list of diagnostics as one error (no-op when the list is empty).
function M.raise(list)
  if #list > 0 then
    error(setmetatable({ diagnostics = list }, ERROR_META), 0)
  end
end

--- Raises one error diagnostic.
function M.fail(code, message, fields)
  M.raise({ M.new(code, message, fields) })
end

--- Runs `fn`. A diagnostic error is appended to `found`, with `context`
--- fields filled in where a diagnostic lacks them, and nil is returned.
--- Any other error is re-raised.
function M.try(fn, found, context)
  local ok, result = pcall(fn)
  if ok then
    return result
  end
  if getmetatable(result) ~= ERROR_META then
    error(result, 0)
  end
  for _, diagnostic in ipairs(result.diagnostics) do
    for key, value in pairs(context or {}) do
      if diagnostic[key] == nil then
        diagnostic[key] = value
      end
    end
    found[#found + 1] = diagnostic
  end
  return nil
end

--- Sets `file` on every diagnostic that does not name one yet.
function M.attach_file(list, file)
  for _, diagnostic in ipairs(list) do
    diagnostic.file = diagnostic.file or file
  end
end

--- Path of the diagnostics file for a project directory.
function M.path(project_dir)
  return pandoc.path.join({ project_dir, BUILD_DIR, FILE_NAME })
end

--- Removes a file left by an earlier run.
function M.remove(path)
  os.remove(path)
end

--- Writes the list as a JSON array (an empty list writes []).
function M.write(path, list)
  pandoc.system.make_directory(pandoc.path.directory(path), true)
  local array = json.array({})
  for i, diagnostic in ipairs(list) do
    array[i] = diagnostic
  end
  local file, err = io.open(path, "w")
  if not file then
    error("cannot write " .. path .. ": " .. tostring(err), 0)
  end
  file:write(json.encode(array))
  file:close()
end

return M
