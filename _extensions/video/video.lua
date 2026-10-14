-- Entry point of the video Lua filter (PRD §8.1). Keep thin: it wires the
-- modules in lib/ together. Invocation: see _extensions/video/README.md.

-- Make lib/ loadable whatever the working directory is.
local function extension_root()
  local source = debug.getinfo(1, "S").source
  return source:match("^@(.*/)") or "./"
end
package.path = extension_root() .. "?.lua;" .. package.path

local config = require("lib.config")
local config_keys = require("lib.config_keys")
local scenes = require("lib.scenes")
local source_scan = require("lib.scan")
local manifest = require("lib.manifest")
local diagnostics = require("lib.diagnostics")

-- Path of the .qmd being rendered. Under `quarto render` Pandoc only sees a
-- temporary copy, so Quarto's own path is preferred; plain Pandoc has no
-- `quarto` global and reads the path from its input list.
local function source_path()
  if quarto and quarto.doc and quarto.doc.input_file then
    return quarto.doc.input_file
  end
  local inputs = PANDOC_STATE.input_files
  if not inputs or #inputs == 0 then
    error("the video filter needs an input .qmd file", 0)
  end
  return inputs[1]
end

function Pandoc(doc)
  local input = source_path()
  local project_dir = pandoc.path.directory(input)
  local file_name = pandoc.path.filename(input)
  local path = manifest.path(project_dir)
  local render_path = manifest.render_path(project_dir)
  local diagnostics_path = diagnostics.path(project_dir)

  manifest.remove(path)
  manifest.remove(render_path)
  diagnostics.remove(diagnostics_path)

  -- Every stage runs, so all errors are reported together (packages/validator).
  local found = {}
  diagnostics.try(function()
    config_keys.check(doc.meta)
  end, found)
  local video = diagnostics.try(function()
    return config.read(doc.meta)
  end, found)
  local output = diagnostics.try(function()
    return config.output(doc.meta)
  end, found)
  diagnostics.try(function()
    return config.stored(doc.meta)
  end, found)
  -- With settings in error the frames are discarded, so fps 1 is a placeholder.
  local fps = video and video.fps or 1
  local before = #found
  local defaults = diagnostics.try(function()
    return config.scene_defaults(doc.meta, fps)
  end, found)
  local default_frames = defaults and defaults.frames
  if defaults == nil and #found > before then
    -- The default block is invalid; it is already reported. Scenes then skip
    -- the missing-duration check.
    default_frames = false
  end
  -- The raw text gives scene source lines and reads openers Pandoc drops.
  local scan = source_scan.read_scan(input)
  local list = diagnostics.try(function()
    return scenes.collect(doc, fps, default_frames, scan)
  end, found)

  diagnostics.attach_file(found, file_name)
  if #found > 0 then
    diagnostics.write(diagnostics_path, found)
    -- Quarto shows this on stderr; the full list is in diagnostics.json.
    error(diagnostics.messages(found), 0)
  end
  diagnostics.write(diagnostics_path, {})
  manifest.write(path, manifest.build(video, list, file_name))
  manifest.write(render_path, { output = output })
end
