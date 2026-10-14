-- Source scanning and pairing for scene lines (task 011; lib/locate.lua).
-- The standard test front matter is 7 lines, so the body starts on line 8.
local h = require("tests.helpers")
local locate = require("lib.locate")
local source_scan = require("lib.scan")

return {
  ["finds scene openers with their line numbers"] = function()
    local text = '::: {.scene component="a" duration="1s"}\nX\n:::\n\n'
      .. '::: {.scene component="b"}\nY\n:::\n'
    local scan = source_scan.scan(text)
    h.eq(#scan.openers, 2, "opener count")
    h.eq(scan.openers[1].line, 1, "first line")
    h.eq(scan.openers[2].line, 5, "second line")
    h.eq(#scan.problems, 0, "problem count")
  end,

  ["skips front matter, fenced code and HTML comments"] = function()
    local body = '```\n::: {.scene component="x"}\n:::\n```\n'
      .. '<!--\n::: {.scene component="y"}\n-->\n'
      .. '::: {.scene component="title" duration="4s"}\nZ\n:::\n'
    local scan = source_scan.scan(h.text(body))
    h.eq(#scan.openers, 1, "opener count")
    h.eq(scan.openers[1].line, 15, "line after the skipped blocks")
  end,

  ["a fence closes only with a fence of the same kind and length"] = function()
    local body = '````\n```\n::: {.scene component="x"}\n```\n````\n'
      .. '::: {.scene component="title" duration="4s"}\nZ\n:::\n'
    local scan = source_scan.scan(h.text(body))
    h.eq(#scan.openers, 1, "opener count")
    h.eq(scan.openers[1].line, 13, "line after the four-backtick fence")
  end,

  ["reads the id of a scene opener"] = function()
    local scan = source_scan.scan('::: {#intro .scene component="title" duration="4s"}\nX\n:::\n')
    h.eq(scan.openers[1].id, "intro", "id")
  end,

  ["reads a bare scene class as a scene"] = function()
    local scan = source_scan.scan("::: scene\nX\n:::\n")
    h.eq(#scan.openers, 1, "opener count")
  end,

  ["ignores Divs that are not scenes"] = function()
    local scan = source_scan.scan("::: {.note}\nX\n:::\n\n::: warning\nY\n:::\n")
    h.eq(#scan.openers, 0, "opener count")
    h.eq(#scan.problems, 0, "problem count")
  end,

  ["an id that is not valid is reported with its line"] = function()
    local scan = source_scan.scan('::: {#1 bad .scene component="title" duration="4s"}\nX\n:::\n')
    h.eq(#scan.openers, 0, "no opener: Pandoc does not read this block")
    h.eq(scan.problems[1].code, "E_SCENE_ID_INVALID", "code")
    h.eq(scan.problems[1].line, 1, "line")
    h.contains(scan.problems[1].suggestion, "#scene-1", "suggestion")
  end,

  ["attributes that cannot be read are E_SCENE_SHAPE with the line"] = function()
    local scan = source_scan.scan('\n::: {.scene component="title" oops duration="4s"}\nX\n:::\n')
    h.eq(scan.problems[1].code, "E_SCENE_SHAPE", "code")
    h.eq(scan.problems[1].line, 2, "line")
    h.contains(scan.problems[1].message, '"oops"', "message names the token")
  end,

  ["an invalid id in a block Pandoc reads stays paired"] = function()
    local scan = source_scan.scan('::: {#Intro .scene component="title" duration="4s"}\nX\n:::\n')
    h.eq(#scan.openers, 1, "opener kept for pairing")
    h.eq(scan.openers[1].id, "Intro", "id")
    h.eq(#scan.problems, 0, "the filter reports the id on the Div")
  end,

  ["valid ids start with a letter and are at most 64 characters"] = function()
    h.eq(locate.valid_id("intro"), true, "word")
    h.eq(locate.valid_id("scene-002"), true, "generated form")
    h.eq(locate.valid_id("1"), false, "digit first")
    h.eq(locate.valid_id("Intro"), false, "upper case")
    h.eq(locate.valid_id("a b"), false, "space")
    h.eq(locate.valid_id(string.rep("a", 64)), true, "64 characters")
    h.eq(locate.valid_id(string.rep("a", 65)), false, "65 characters")
  end,

  ["suggests a valid id"] = function()
    h.eq(locate.suggest_id("1"), "scene-1", "digit")
    h.eq(locate.suggest_id("Intro"), "intro", "upper case")
  end,

  ["lists scene Divs parents first and flags nested ones"] = function()
    local body = '::: {#outer .scene component="title" duration="4s"}\nA\n:::\n\n'
      .. "::: {.note}\n"
      .. '::: {#inner .scene component="title" duration="4s"}\nB\n:::\n'
      .. ":::\n"
    local list, complete = locate.scene_divs(h.doc(body))
    h.eq(complete, true, "complete")
    h.eq(#list, 2, "scene count")
    h.eq(list[1].div.identifier, "outer", "first is the outer scene")
    h.eq(list[1].nested, false, "outer is top-level")
    h.eq(list[2].div.identifier, "inner", "second is the inner scene")
    h.eq(list[2].nested, true, "inner is nested")
  end,

  ["pairs each scene Div with its fence line"] = function()
    local body = '::: {.scene component="a" duration="1s"}\nX\n:::\n'
    local lines, problems =
      locate.pair(source_scan.scan(h.text(body)), (locate.scene_divs(h.doc(body))))
    h.eq(lines[1], 8, "paired line")
    h.eq(#problems, 0, "problem count")
  end,

  ["gives no lines when the text and the document differ"] = function()
    local source = source_scan.scan(h.text('::: {.scene component="a" duration="1s"}\nX\n:::\n'))
    local entries = locate.scene_divs(h.doc('::: {.scene component="a" duration="1s"}\nY\n:::\n'))
    local lines = locate.pair(source, entries)
    h.eq(next(lines), nil, "no lines unless every pair verifies")
  end,

  ["without a scan there are no lines and no problems"] = function()
    local lines, problems = locate.pair(nil, locate.scene_divs(h.doc("Prose.\n")))
    h.eq(next(lines), nil, "lines")
    h.eq(#problems, 0, "problems")
  end,
}
