-- Entry point of the video Lua filter (PRD §8.1). Keep thin: it wires the
-- modules in lib/ together. Invocation: see _extensions/video/README.md.

-- Make lib/ loadable whatever the working directory is.
local function extension_root()
  local source = debug.getinfo(1, "S").source
  return source:match("^@(.*/)") or "./"
end
package.path = extension_root() .. "?.lua;" .. package.path

local settings = require("lib.settings")
local scenes = require("lib.scenes")
local manifest = require("lib.manifest")

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
  local path = manifest.path(project_dir)

  manifest.remove(path)
  local video = settings.read(doc.meta)
  local list = scenes.collect(doc, video.fps)
  manifest.write(path, manifest.build(video, list, pandoc.path.filename(input)))
end
