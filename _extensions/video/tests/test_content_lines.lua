-- Source lines of unsupported scene content (task 012; lib/content_lines.lua).
-- Each body is scanned and parsed as the filter does, so the lines come from
-- the same pairing the filter uses.
local h = require("tests.helpers")
local content = require("lib.content")
local content_lines = require("lib.content_lines")
local locate = require("lib.locate")
local source_scan = require("lib.scan")

--- Unsupported findings of the first scene of `body`, with their lines.
local function findings_of(body)
  local scan = source_scan.scan(h.text(body))
  local doc = h.doc(body)
  local entries = locate.scene_divs(doc)
  local lines = locate.pair(scan, entries)
  local _, found = content.convert(entries[1].div)
  content_lines.assign(scan, content_lines.opener_at(scan, lines[1]), found)
  return found
end

-- The standard front matter is 7 lines, so a scene at body line 1 opens on line 8.
local SCENE = '::: {.scene component="comparison" duration="4s"}\n'

return {
  ["a table is found on its header row"] = function()
    local found = findings_of(SCENE .. "Intro.\n\n| a | b |\n|---|---|\n| 1 | 2 |\n:::\n")
    h.eq(found[1].kind, "table", "kind")
    h.eq(found[1].line, 11, "line of the header row")
  end,

  ["a grid table is found on its top border"] = function()
    local found = findings_of(SCENE .. "+---+---+\n| a | b |\n+---+---+\n:::\n")
    h.eq(found[1].line, 9, "line")
  end,

  ["each raw HTML element gets its own line"] = function()
    local found = findings_of(SCENE .. "<span>a</span>\n\n<!-- one -->\n<!-- two -->\n:::\n")
    h.eq(found[1].kind, "span", "first kind")
    h.eq(found[1].line, 9, "span line")
    h.eq(found[2].kind, "raw", "second kind")
    h.eq(found[2].line, 11, "comment line")
  end,

  ["a raw HTML tag inside a sentence gets its line"] = function()
    local found = findings_of(SCENE .. "Line one<br>line two.\n:::\n")
    h.eq(found[1].kind, "raw", "kind")
    h.eq(found[1].line, 9, "line")
  end,

  ["a second slot of one name gets the line of its own opener"] = function()
    local found = findings_of(SCENE .. "::: {.left}\nFirst\n:::\n\n::: {.left}\nSecond\n:::\n:::\n")
    h.eq(found[1].kind, "slot", "kind")
    h.eq(found[1].line, 13, "line of the second .left opener")
  end,

  ["a table-like line inside a code fence is not a match"] = function()
    local found =
      findings_of(SCENE .. "```\n| a | b |\n|---|---|\n```\n\n| c | d |\n|---|---|\n:::\n")
    h.eq(found[1].line, 14, "line of the real table")
  end,

  ["an element with no recognisable text gets no line"] = function()
    local scan = source_scan.scan(h.text(SCENE .. "Text.\n:::\n"))
    local findings = { { kind = "other", t = "LineBlock" } }
    content_lines.assign(scan, content_lines.opener_at(scan, 8), findings)
    h.eq(findings[1].line, nil, "line")
  end,

  ["the search stops at the scene's closing fence"] = function()
    local scan = source_scan.scan(h.text(SCENE .. "Text.\n:::\n\n<b>after</b>\n"))
    local findings = { { kind = "raw", text = "<b>" } }
    content_lines.assign(scan, content_lines.opener_at(scan, 8), findings)
    h.eq(findings[1].line, nil, "line after the scene")
  end,
}
