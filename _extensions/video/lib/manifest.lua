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

-- True when a scene has an image item (IR 1.10, ADR-0018).
local function has_image(scenes)
  for _, scene in ipairs(scenes) do
    for _, item in ipairs(scene.media or {}) do
      if item.kind == "image" then
        return true
      end
    end
  end
  return false
end

--- The IR version a manifest is written as: 1.11 with a caption track (ADR-0019),
--- 1.10 with a framed image (ADR-0018), 1.9 with a music track (ADR-0017), 1.8 when
--- a scene keeps source audio (ADR-0009), 1.7 when a scene has region footage
--- (ADR-0016), 1.6 otherwise, so other manifests stay as they were.
local function version_of(scenes, music, captions)
  if captions ~= nil then
    return "1.11"
  end
  if has_image(scenes) then
    return "1.10"
  end
  if music ~= nil then
    return "1.9"
  end
  local region = false
  for _, scene in ipairs(scenes) do
    for _, item in ipairs(scene.media or {}) do
      if item.audio == "keep" then
        return "1.8"
      end
      if item.placement == "region" then
        region = true
      end
    end
  end
  return region and "1.7" or "1.6"
end

-- The media items without `kind`: IR 1.6 to 1.9 have no such field (ADR-0018).
-- IR 1.10 and 1.11 write it on every item.
local function without_kind(items)
  local out = json.array({})
  for i, item in ipairs(items) do
    local copy = {}
    for key, value in pairs(item) do
      if key ~= "kind" then
        copy[key] = value
      end
    end
    out[i] = copy
  end
  return out
end

--- Assembles the IR table. Field names follow the schema of its version. The
--- timeline (ADR-0005) is resolved here from the scenes' durations and
--- transitions. `music` is the track of lib/music.lua, or nil (ADR-0017);
--- `captions` the track of lib/captions.lua, or nil (ADR-0019).
function M.build(settings, scenes, source_file, music, captions)
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
  local version = version_of(list, music, captions)
  if version ~= "1.10" and version ~= "1.11" then
    for _, scene in ipairs(list) do
      if scene.media ~= nil then
        scene.media = without_kind(scene.media)
      end
    end
  end
  return {
    schemaVersion = version,
    type = "video",
    settings = settings,
    scenes = list,
    timeline = { durationFrames = total, scenes = entries },
    music = music,
    captions = captions,
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
