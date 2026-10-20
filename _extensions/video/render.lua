-- Renders the MP4 at the end of `quarto render` (task 053; ADR-0022). Registered
-- as the extension's filter at the `post-render` entry point, so `filters:
-- [video]` in a document is enough: after Pandoc has the document, this runs
-- `video render <project>` on the directory of the input file. The video CLI
-- reads the .qmd again with video.lua, validates it and renders it; this file
-- only starts it. It is the one Lua file allowed to start a process
-- (_extensions/video/README.md), and it starts nothing but `video render`.

-- Quotes a value for the POSIX shell.
local function shell_quote(value)
  return "'" .. value:gsub("'", "'\\''") .. "'"
end

-- Stops the whole `quarto render` with a non-zero status. Quarto logs an
-- error() raised in a post-render filter and still exits 0, so a failed video
-- would look like success; os.exit makes the failure reach the caller.
local function fail(message, status)
  -- selene: allow(incorrect_standard_library_use)
  io.stderr:write("quarto-video: " .. message .. "\n")
  os.exit(status)
end

-- `video` on PATH, else QUARTO_VIDEO_CLI (a path to the bin), else nil.
local function find_cli()
  local explicit = os.getenv("QUARTO_VIDEO_CLI")
  if explicit and explicit ~= "" then
    return explicit
  end
  if os.execute("command -v video >/dev/null 2>&1") then
    return "video"
  end
  return nil
end

function Pandoc(doc)
  local input = quarto.doc.input_file
  local project = pandoc.path.directory(input)
  local cli = find_cli()
  if not cli then
    fail(
      "the `video` renderer is not installed or not on PATH.\n"
        .. "Install it once (README.md, step 1), or set QUARTO_VIDEO_CLI to its path.",
      2
    )
  end
  -- Child output goes to stderr, so it never mixes with Pandoc's own output.
  local command = shell_quote(cli) .. " render " .. shell_quote(project) .. " 1>&2"
  local ok, _, code = os.execute(command)
  if not ok then
    fail(
      "`video render` failed (exit " .. tostring(code) .. "); see the messages above.",
      code or 1
    )
  end
  return doc
end
