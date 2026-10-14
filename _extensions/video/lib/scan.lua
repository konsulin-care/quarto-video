-- Reads the raw .qmd text for scene fences (PRD §5.3; task 011). Quotes and
-- lists may come before a fence, and front matter, fenced code and HTML
-- comments are skipped. Each readable scene fence gets a marker attribute with
-- its line (lib/locate.lua pairs them with the Divs Pandoc builds). Pure text:
-- no Pandoc, no network, and the document being processed is the only file read.
local diagnostics = require("lib.diagnostics")
local locate = require("lib.locate")

local M = {}

local MARK = locate.MARK

-- Splits the inside of a `{...}` block into tokens (`#id`, `.class`,
-- `key=value`, `key="value"`). Every token is read; a token that is none of
-- these is kept as `bad` (the first one), and reading goes on so that `.scene`
-- is still seen in a broken block.
local function read_attributes(inner)
  local info = { id = nil, classes = {}, bad = nil }
  local pos = 1
  while true do
    local start = inner:find("%S", pos)
    if not start then
      break
    end
    local _, stop, word = inner:find("^#(%S*)", start)
    if word then
      if info.id == nil then
        info.id = word
      elseif info.bad == nil then
        info.bad = "#" .. word
      end
    else
      _, stop, word = inner:find("^%.(%S+)", start)
      if word then
        info.classes[#info.classes + 1] = word
      else
        _, stop = inner:find('^[%a_][%w_-]*="[^"]*"', start)
        if not stop then
          _, stop = inner:find("^[%a_][%w_-]*=%S+", start)
        end
        if not stop then
          _, stop = inner:find("^%S+", start)
          info.bad = info.bad or inner:sub(start, stop)
        end
      end
    end
    pos = stop + 1
  end
  return info
end

-- The attributes of a fence whose text after the colons is `after`, or nil
-- when it is not a scene: `scene` alone is a class, `{...}` an attribute block.
local function read_opener(after)
  if after == "scene" then
    return { id = nil, classes = { "scene" }, bad = nil }
  end
  local inner = after:match("^{(.*)}$")
  if inner == nil then
    return nil
  end
  local info = read_attributes(inner)
  for _, class in ipairs(info.classes) do
    if class == "scene" then
      return info
    end
  end
  return nil
end

-- The line with its block prefix (blockquote markers and indentation) split off.
local function split_prefix(line)
  local prefix = line:match("^[%s>]*")
  return prefix, line:sub(#prefix + 1)
end

-- A fence opener of "`" or "~" fences of three or more characters.
local function fence_open(body)
  local ticks, info = body:match("^(```+)(.*)$")
  if ticks and not info:find("`", 1, true) then
    return { char = "`", size = #ticks }
  end
  local tildes = body:match("^(~~~+)")
  if tildes then
    return { char = "~", size = #tildes }
  end
  return nil
end

local function fence_closes(body, fence)
  local run = body:match("^([`~]+)%s*$")
  return run ~= nil and run:sub(1, 1) == fence.char and #run >= fence.size
end

-- Line index where the body starts: after a YAML front matter block that
-- opens on line 1 and closes with `---` or `...`; 1 when there is none.
local function body_start(lines)
  if not (lines[1] or ""):match("^%-%-%-%s*$") then
    return 1
  end
  for n = 2, #lines do
    if lines[n]:match("^%-%-%-%s*$") or lines[n]:match("^%.%.%.%s*$") then
      return n + 1
    end
  end
  return 1
end

local function split_lines(text)
  local lines = {}
  for line in (text .. "\n"):gmatch("(.-)\r?\n") do
    lines[#lines + 1] = line
  end
  return lines
end

-- The line with the marker attribute added to its opener (see M.scan).
local function marked_line(prefix, colons, after, n)
  local marker = string.format('%s="%d"', MARK, n)
  if after == "scene" then
    return prefix .. colons .. " {.scene " .. marker .. "}"
  end
  return prefix .. colons .. " " .. after:sub(1, -2) .. " " .. marker .. "}"
end

--- Scans the raw document text. Returns:
--- `openers`: { line, id, close } for each scene fence Pandoc can read (source
--- order); `close` is the line of its closing fence (nil when unclosed);
--- `lines`: the raw lines; `prose`: per line, false inside fenced code and HTML comments;
--- `problems`: diagnostics for scene fences whose attributes cannot be read;
--- `marked`: the text with each opener's line added as a marker attribute.
function M.scan(text)
  local lines = split_lines(text)
  local marked = {}
  for n, line in ipairs(lines) do
    marked[n] = line
  end
  local openers, problems = {}, {}
  local prose, stack = {}, {}
  local fence, in_comment = nil, false
  for n = body_start(lines), #lines do
    local line = lines[n]
    local prefix, body = split_prefix(line)
    prose[n] = fence == nil and not in_comment
    if fence ~= nil then
      if fence_closes(body, fence) then
        fence = nil
      end
    elseif in_comment then
      if line:find("-->", 1, true) then
        in_comment = false
      end
    else
      local opened = fence_open(body)
      local comment = line:find("<!--", 1, true)
      local colons, after = body:match("^(:::+)%s*(.-)%s*$")
      if opened then
        fence = opened
      elseif comment and not line:find("-->", comment + 4, true) then
        in_comment = true
      elseif colons and after ~= "" then
        local info = read_opener(after)
        local record = nil
        if info and info.bad and info.id ~= nil and not locate.valid_id(info.id) then
          problems[#problems + 1] = locate.id_problem(info.id, n)
        elseif info and info.bad then
          problems[#problems + 1] = diagnostics.new(
            "E_SCENE_SHAPE",
            string.format('Scene attributes on line %d cannot be read: "%s".', n, info.bad),
            {
              property = "attributes",
              suggestion = 'Write them as {#id .scene component="title" duration="4s"}.',
              line = n,
            }
          )
        elseif info then
          record = { line = n, id = info.id }
          openers[#openers + 1] = record
          marked[n] = marked_line(prefix, colons, after, n)
        end
        stack[#stack + 1] = { opener = record }
      elseif colons then
        -- A closing fence: its scene (if it was read) ends on this line.
        local top = table.remove(stack)
        if top and top.opener then
          top.opener.close = n
        end
      end
    end
  end
  return {
    openers = openers,
    problems = problems,
    marked = table.concat(marked, "\n"),
    lines = lines,
    prose = prose,
  }
end

--- Reads and scans the document at `path`; nil when it cannot be read.
function M.read_scan(path)
  local file = io.open(path, "rb")
  if not file then
    return nil
  end
  local text = file:read("a")
  file:close()
  return M.scan(text)
end

return M
