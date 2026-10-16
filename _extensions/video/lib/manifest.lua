-- Builds the Video IR 1.6 manifest and writes it to
-- <project>/.video-build/manifest.json, plus the render settings that stay
-- outside the IR (<project>/.video-build/render.json: output, theme name and an
-- explicit background).
-- These are the only files the filter writes (see _extensions/video/README.md).
local json = require("lib.json")
local timeline = require("lib.timeline")
local generator = require("lib.generator")

local M = {}

local BUILD_DIR = ".video-build"
local FILE_NAME = "manifest.json"
local RENDER_FILE = "render.json"

--- Path of the manifest for a project directory.
function M.path(project_dir)
  return pandoc.path.join({ project_dir, BUILD_DIR, FILE_NAME })
end

--- Path of the render settings file (container and theme settings, not IR; PRD §5.2).
function M.render_path(project_dir)
  return pandoc.path.join({ project_dir, BUILD_DIR, RENDER_FILE })
end

--- The IR version a manifest is written as: 1.7 when a scene has region
--- footage (ADR-0016), 1.6 otherwise, so other manifests stay as they were.
local function version_of(scenes)
  for _, scene in ipairs(scenes) do
    for _, item in ipairs(scene.media or {}) do
      if item.placement == "region" then
        return "1.7"
      end
    end
  end
  return "1.6"
end

--- Assembles the IR table. Field names follow schema/ir-1.6.json. The
--- timeline (ADR-0005) is resolved here from the scenes' durations and
--- transitions.
function M.build(settings, scenes, source_file)
  local starts, total = timeline.resolve(scenes)
  local list = json.array({})
  local entries = json.array({})
  for i, scene in ipairs(scenes) do
    list[i] = {
      id = scene.id,
      component = scene.component,
      durationFrames = scene.durationFrames,
      transition = scene.transition,
      animation = scene.animation,
      props = scene.props,
      content = { slots = scene.slots },
      media = scene.media,
      source = { file = source_file, line = scene.line },
    }
    entries[i] = { id = scene.id, startFrame = starts[i] }
  end
  return {
    schemaVersion = version_of(list),
    type = "video",
    settings = settings,
    scenes = list,
    timeline = { durationFrames = total, scenes = entries },
    generator = { extension = generator.extension, cli = generator.cli },
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
