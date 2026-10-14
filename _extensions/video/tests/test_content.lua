-- Scene content as typed blocks and slots (IR 0.2; ADR-0004; task 012).
local h = require("tests.helpers")
local content = require("lib.content")
local locate = require("lib.locate")

--- The first scene Div of a document body (standard front matter applied).
local function convert(body)
  local div = locate.scene_divs(h.doc(body))[1].div
  return content.convert(div)
end

local function scene(inner, component)
  return '::: {.scene component="'
    .. (component or "comparison")
    .. '" duration="4s"}\n'
    .. inner
    .. "\n:::\n"
end

-- The only finding of a body, checked for its kind.
local function one_finding(body, kind)
  local _, found = convert(body)
  h.eq(#found, 1, "finding count")
  h.eq(found[1].kind, kind, "finding kind")
  return found[1]
end

return {
  ["loose paragraphs form the default slot"] = function()
    local slots, found = convert(scene("Why GPUs Matter"))
    h.eq(#found, 0, "finding count")
    h.eq(slots.default[1].type, "paragraph", "block type")
    h.eq(slots.default[1].inlines[1].text, "Why GPUs Matter", "text")
  end,

  ["a nested Div with one class is a named slot"] = function()
    local slots, found = convert(scene("::: {.left}\n**CPUs**\n\nText.\n:::"))
    h.eq(#found, 0, "finding count")
    h.eq(slots.default, nil, "no default slot")
    local left = slots.left
    h.eq(#left, 2, "block count")
    h.eq(left[1].inlines[1].type, "strong", "strong node")
    h.eq(left[1].inlines[1].inlines[1].text, "CPUs", "strong text")
    h.eq(left[2].inlines[1].text, "Text.", "second paragraph")
  end,

  ["loose content and slots can sit side by side"] = function()
    local slots = convert(scene("Intro.\n\n::: {.right}\nRight.\n:::"))
    h.eq(slots.default[1].inlines[1].text, "Intro.", "default text")
    h.eq(slots.right[1].inlines[1].text, "Right.", "right text")
  end,

  ["emphasis, code, line breaks and quotes are nodes"] = function()
    local slots, found = convert(scene('*soft* `x`  \nnext "quoted"'))
    h.eq(#found, 0, "finding count")
    local inlines = slots.default[1].inlines
    h.eq(inlines[1].type, "emphasis", "emphasis")
    h.eq(inlines[1].inlines[1].text, "soft", "emphasis text")
    h.eq(inlines[3].type, "code", "code node")
    h.eq(inlines[3].text, "x", "code text")
    h.eq(inlines[4].type, "line-break", "line break")
    h.eq(inlines[5].type, "text", "text after the break")
    h.eq(inlines[6].type, "quoted", "quoted node")
    h.eq(inlines[6].quote, "double", "quote kind")
  end,

  ["headings keep their level and bullet and numbered lists keep their kind"] = function()
    local slots, found = convert(scene("## Title\n\n- one\n- two\n\n1. first\n2. second"))
    h.eq(#found, 0, "finding count")
    h.eq(slots.default[1].type, "heading", "heading")
    h.eq(slots.default[1].level, 2, "level")
    h.eq(slots.default[2].ordered, false, "bullet list")
    h.eq(#slots.default[2].items, 2, "bullet items")
    h.eq(slots.default[3].ordered, true, "numbered list")
    h.eq(slots.default[3].items[2].blocks[1].inlines[1].text, "second", "item text")
  end,

  ["code blocks keep their text and language"] = function()
    local slots, found = convert(scene("```python\nprint(1)\n```"))
    h.eq(#found, 0, "finding count")
    h.eq(slots.default[1].type, "code-block", "block type")
    h.eq(slots.default[1].language, "python", "language")
    h.eq(slots.default[1].text, "print(1)", "text")
  end,

  ["a Quarto code block with no language has no language key"] = function()
    local slots = convert(scene("```\nplain\n```"))
    h.eq(slots.default[1].language, nil, "language")
  end,

  ["a table is reported as unsupported"] = function()
    local finding = one_finding(scene("| a | b |\n|---|---|\n| 1 | 2 |"), "table")
    h.eq(finding.t, "Table", "element")
  end,

  ["raw HTML and HTML comments are reported"] = function()
    one_finding(scene("<!-- note -->"), "raw")
    local _, found = convert(scene("Line one<br>line two."))
    h.eq(found[1].kind, "raw", "raw inline")
    h.eq(found[1].text, "<br>", "raw text")
  end,

  ["an HTML span is reported as a span"] = function()
    one_finding(scene("Some <span>text</span>."), "span")
  end,

  ["a link, footnote, math and image are reported"] = function()
    one_finding(scene("[text](http://a.b)"), "link")
    one_finding(scene("Text.[^1]\n\n[^1]: note"), "footnote")
    one_finding(scene("$x^2$"), "math")
    one_finding(scene("![pic](a.png)"), "figure")
  end,

  ["a block with no class is reported, with the reason"] = function()
    local finding = one_finding(scene("<div>x</div>"), "div")
    local diagnostic = content.problem(finding, "scene-001", "comparison")
    h.eq(diagnostic.code, "E_CONTENT_UNSUPPORTED", "code")
    h.contains(diagnostic.message, "a block without a slot class", "message")
    h.eq(diagnostic.sceneId, "scene-001", "scene id")
  end,

  ["a class that is not a slot name is reported"] = function()
    local finding = one_finding(scene("::: {.Left}\nX\n:::"), "slot")
    h.contains(finding.label, "not a valid slot name", "label")
  end,

  ["the reserved slot name default is reported"] = function()
    local finding = one_finding(scene("::: {.default}\nX\n:::"), "slot")
    h.contains(finding.label, "reserved", "label")
  end,

  ["a second slot with the same name is reported and the first is kept"] = function()
    local slots, found = convert(scene("::: {.left}\nFirst\n:::\n\n::: {.left}\nSecond\n:::"))
    h.eq(slots.left[1].inlines[1].text, "First", "first copy kept")
    h.eq(found[1].kind, "slot", "kind")
    h.contains(found[1].label, "a second .left slot", "label")
  end,

  ["an empty slot is reported"] = function()
    local finding = one_finding(scene("::: {.left}\n:::"), "slot")
    h.contains(finding.label, "an empty .left slot", "label")
  end,

  ["a block nested inside a slot is reported"] = function()
    one_finding(scene("::: {.left}\n::: {.note}\nX\n:::\n:::"), "nested")
  end,

  ["an ordered list that does not start at 1 is reported"] = function()
    one_finding(scene("3. third"), "list")
  end,

  ["a Pandoc type name never reaches a node"] = function()
    local slots = convert(scene("::: {.left}\n**Bold** and *it*.\n:::\n\nLoose."))
    local function check(list)
      for _, node in ipairs(list) do
        h.eq(node.t, nil, "no Pandoc tag on node")
        h.eq(type(node.type), "string", "typed node")
        h.eq(node.type:match("^%u") ~= nil, false, "lowercase node type")
        for _, key in ipairs({ "inlines", "blocks" }) do
          if node[key] then
            check(node[key])
          end
        end
        if node.items then
          for _, item in ipairs(node.items) do
            check(item.blocks)
          end
        end
      end
    end
    for _, blocks in pairs(slots) do
      check(blocks)
    end
  end,
}
