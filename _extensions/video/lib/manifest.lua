-- Builds the Video IR 0.1 manifest and writes it to
-- <project>/.video-build/manifest.json, plus the render settings that stay
-- outside the IR (<project>/.video-build/render.json). These are the only
-- files the filter writes (see _extensions/video/README.md).
local json = require("lib.json")

local M = {}

local BUILD_DIR = ".video-build"
local FILE_NAME = "manifest.json"
local RENDER_FILE = "render.json"

--- Path of the manifest for a project directory.
function M.path(project_dir)
  return pandoc.path.join({ project_dir, BUILD_DIR, FILE_NAME })
end

--- Path of the render settings file (container settings, not IR; PRD §5.2).
function M.render_path(project_dir)
  return pandoc.path.join({ project_dir, BUILD_DIR, RENDER_FILE })
end

--- Assembles the IR table. Field names follow schema/ir-0.1.json.
function M.build(settings, scenes, source_file)
  local list = json.array({})
  for i, scene in ipairs(scenes) do
    list[i] = {
      id = scene.id,
      component = scene.component,
      durationFrames = scene.durationFrames,
      content = { text = scene.text },
      source = { file = source_file, line = scene.line },
    }
  end
  return {
    schemaVersion = "0.1",
    type = "video",
    settings = settings,
    scenes = list,
  }
end

--- Removes a manifest left by an earlier run, so a failed run cannot leave
--- a stale file that looks valid.
function M.remove(path)
  os.remove(path)
end

--- Writes the manifest, creating <project>/.video-build/ if needed.
function M.write(path, ir)
  pandoc.system.make_directory(pandoc.path.directory(path), true)
  local file, err = io.open(path, "w")
  if not file then
    error("cannot write " .. path .. ": " .. tostring(err), 0)
  end
  file:write(json.encode(ir))
  file:close()
end

return M
