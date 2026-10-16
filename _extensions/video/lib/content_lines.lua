-- Source lines for unsupported scene content (task 012; ADR-0004). Pandoc
-- gives no positions, so each unsupported element is searched for in the raw
-- text of its own scene (lib/scan.lua): after the previous finding, before the
-- scene's closing fence, in prose only. An element whose text cannot be
-- recognised gets no line, never a wrong one.
local M = {}

-- Lua patterns that open an element in the raw text, by finding kind. Each
-- pattern is the form only that element takes, so valid content above it
-- cannot be mistaken for it. Kinds not listed here (cite, nested) get no line.
local PATTERNS = {
  footnote = { "%[%^" },
  math = { "%$" },
  link = { "%]%(", "<%a+:" },
  image = { "!%[" },
  figure = { "!%[" },
  blockquote = { "^%s*>" },
  hrule = { "^%s*[-*_]%s*[-*_]%s*[-*_][%s%-*_]*$" },
  span = { "%]{", "<span" },
  underline = { "%]{" },
  smallcaps = { "%]{" },
  strikeout = { "~~" },
  superscript = { "%^%S+%^" },
  subscript = { "~%S[^~%s]*~" },
  code = { "`{" },
  codeblock = { "^%s*```.*{", "^%s*~~~.*{" },
  heading = { "^%s*#+.*{" },
}

-- A pipe table starts with a header row whose next line is the separator, or a
-- grid table with its top border.
local function table_start(lines, n)
  local line = lines[n]
  if line:match("^%s*%+[-=:+]+%+%s*$") then
    return true
  end
  local below = lines[n + 1] or ""
  return line:find("|", 1, true) ~= nil
    and below:find("-", 1, true) ~= nil
    and below:match("^[%s|:%-]+$") ~= nil
end

local function line_matches(finding, lines, n)
  local kind, line = finding.kind, lines[n]
  if kind == "table" then
    return table_start(lines, n)
  elseif kind == "raw" then
    return finding.text ~= nil and finding.text ~= "" and line:find(finding.text, 1, true) ~= nil
  elseif kind == "div" then
    return line:match("^[%s>]*<") ~= nil or line:match("^[%s>]*:::+%s*{%s*}%s*$") ~= nil
  elseif kind == "slot" then
    -- An opener of a Div that names the class `text`.
    local name = (finding.text or ""):gsub("%-", "%%-")
    return name ~= "" and line:match("^[%s>]*:::+%s*{.*%." .. name .. "[%s}]") ~= nil
  elseif kind == "image-block" then
    -- An opener of a Div with the class `image` (the `nth` one of the scene).
    return line:match("^[%s>]*:::+%s*{.*%.image[%s}]") ~= nil
  elseif kind == "list" then
    -- The first item of an ordered list that starts at `text`.
    return finding.text ~= nil and line:match("^%s*" .. finding.text .. "[.)]%s") ~= nil
  end
  for _, pattern in ipairs(PATTERNS[kind] or {}) do
    if line:find(pattern) then
      return true
    end
  end
  return false
end

--- The scan record (lib/scan.lua `openers`) whose opener is on `line`, or nil.
function M.opener_at(scan, line)
  for _, opener in ipairs(scan and scan.openers or {}) do
    if opener.line == line then
      return opener
    end
  end
  return nil
end

--- Sets `line` on each finding of one scene, in order. `opener` is the scene's
--- record (`line`, `close`). A finding with no recognisable text keeps no line.
--- Most findings are searched for after the previous one. A slot finding with
--- `nth` (its occurrence of that class name in the scene) is counted from the
--- scene's opener, since a valid copy of the slot may come before it.
function M.assign(scan, opener, findings)
  if scan == nil or opener == nil then
    return
  end
  local last = (opener.close or (#scan.lines + 1)) - 1
  local cursor = opener.line + 1
  for _, finding in ipairs(findings) do
    local seen = 0
    local from = finding.nth and opener.line + 1 or cursor
    for n = from, last do
      if scan.prose[n] and line_matches(finding, scan.lines, n) then
        seen = seen + 1
        if seen == (finding.nth or 1) then
          finding.line = n
          cursor = math.max(cursor, n + 1)
          break
        end
      end
    end
  end
end

return M
