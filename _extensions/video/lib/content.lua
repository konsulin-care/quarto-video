-- Scene content as typed blocks in named slots (IR 0.2; ADR-0004; PRD §5.3).
-- A nested Div with exactly one class names a slot (`.left`, `.right`, ...);
-- every block outside a slot Div goes to the `default` slot. Pandoc elements
-- outside the node set are findings, reported as E_CONTENT_UNSUPPORTED at
-- their line (lib/content_lines.lua). Nothing is dropped silently.
local json = require("lib.json")
local inlines = require("lib.content_inlines")
local diagnostics = require("lib.diagnostics")

local M = {}

local DEFAULT = "default"
local SLOT_NAME = "^[a-z][a-z0-9-]*$"

-- Label and suggestion for each finding kind (message: "Scene X has <label>").
local LABELS = {
  table = { "a table", "Write the rows as a list or as separate paragraphs." },
  raw = { "raw HTML or an HTML comment", "Remove it; scene content is Markdown." },
  div = {
    "a block without a slot class",
    "Give the block a slot class, for example ::: {.left}.",
  },
  footnote = { "a footnote", "Write the note as a sentence in the scene." },
  math = { "math", "Write the formula as plain text." },
  link = { "a link", "Remove the link and keep its text." },
  image = { "an image", "Images are not supported yet; remove the image." },
  figure = { "an image", "Images are not supported yet; remove the image." },
  blockquote = { "a block quote", "Write the quotation as a paragraph." },
  hrule = { "a horizontal rule", "Remove the rule." },
  span = { "a span", "Write the text without the span." },
  underline = { "underlined text", "Write the text without underlining." },
  smallcaps = { "small capitals", "Write the text in ordinary capitals." },
  strikeout = { "struck-out text", "Write the text without strike-through." },
  superscript = { "superscript text", "Write the text without superscript." },
  subscript = { "subscript text", "Write the text without subscript." },
  cite = { "a citation", "Write the source as plain text." },
  code = { "inline code with attributes", "Use plain `code` without classes." },
  codeblock = { "a code block with attributes", "Use a language name only, e.g. ```python." },
  heading = { "a heading with classes or attributes", "Write a plain heading." },
  nested = { "a block nested inside a slot", "Put the content directly in the slot." },
  list = {
    "an ordered list that does not start at 1 or is not decimal",
    "Start the list at 1 and use decimal numbers.",
  },
}

--- Returns the label and suggestion of a finding (see LABELS).
local function describe(finding)
  if finding.label then
    return finding.label, finding.suggestion or "Remove it."
  end
  local known = LABELS[finding.kind]
  if known then
    return known[1], known[2]
  end
  return string.format("a %s element", tostring(finding.t)), "Remove it."
end

--- The E_CONTENT_UNSUPPORTED diagnostic for a finding of scene `id`. Its line
--- is the finding's `line` (nil when no line was found).
function M.problem(finding, id, component)
  local label, suggestion = describe(finding)
  return diagnostics.new(
    "E_CONTENT_UNSUPPORTED",
    string.format('Scene "%s" has %s, which is not supported in scene content yet.', id, label),
    {
      property = "content",
      suggestion = suggestion,
      sceneId = id,
      component = component,
      line = finding.line,
    }
  )
end

-- True when a Pandoc element has any key-value attribute.
local function has_keyvalues(el)
  for _ in pairs(el.attributes) do
    return true
  end
  return false
end

local convert_blocks

local function items_of(list, found, in_slot)
  local out = json.array({})
  for i, item in ipairs(list) do
    out[i] = { blocks = convert_blocks(item, found, in_slot) }
  end
  return out
end

local function block_finding(found, kind, el)
  found[#found + 1] = { kind = kind, t = el.t, text = el.text }
end

-- One Pandoc block -> one node, or a finding for each unsupported part.
local function convert_one(el, found, in_slot)
  local t = el.t
  if t == "Para" or t == "Plain" then
    return { type = "paragraph", inlines = inlines.convert(el.content, found) }
  elseif t == "Header" then
    if #el.classes > 0 or has_keyvalues(el) then
      return block_finding(found, "heading", el)
    end
    return { type = "heading", level = el.level, inlines = inlines.convert(el.content, found) }
  elseif t == "BulletList" then
    return { type = "list", ordered = false, items = items_of(el.content, found, in_slot) }
  elseif t == "OrderedList" then
    local attrs = el.listAttributes
    local style = tostring(attrs.style)
    if attrs.start ~= 1 or (style ~= "Decimal" and style ~= "DefaultStyle") then
      found[#found + 1] = { kind = "list", t = t, text = tostring(attrs.start) }
      return nil
    end
    return { type = "list", ordered = true, items = items_of(el.content, found, in_slot) }
  elseif t == "CodeBlock" then
    if el.identifier ~= "" or #el.classes > 1 or has_keyvalues(el) then
      return block_finding(found, "codeblock", el)
    end
    local node = { type = "code-block", text = el.text }
    node.language = el.classes[1]
    return node
  elseif t == "Null" then
    return nil
  end
  local kind = ({
    Table = "table",
    RawBlock = "raw",
    BlockQuote = "blockquote",
    HorizontalRule = "hrule",
    Figure = "figure",
    Div = in_slot and "nested" or "div",
  })[t] or "other"
  if kind == "raw" then
    found[#found + 1] = { kind = "raw", t = t, text = inlines.first_line(el.text) }
  else
    found[#found + 1] = { kind = kind, t = t }
  end
  return nil
end

-- Blocks in order: returns a JSON array of nodes.
convert_blocks = function(list, found, in_slot)
  local out = json.array({})
  for _, el in ipairs(list) do
    local node = convert_one(el, found, in_slot)
    if node then
      out[#out + 1] = node
    end
  end
  return out
end

-- The slot a nested Div names. Returns the name, or nil plus a finding
-- (kind, label, text) that says why the Div is not a slot.
local function slot_of(div)
  local classes = div.classes
  if #classes == 0 and div.identifier == "" and not has_keyvalues(div) then
    return nil, { kind = "div" }
  end
  if #classes ~= 1 or div.identifier ~= "" or has_keyvalues(div) then
    return nil,
      {
        kind = "div",
        label = "a block with more than one class, an id or attributes",
        suggestion = "Use one class naming the slot, for example ::: {.left}.",
      }
  end
  local name = classes[1]
  if name == DEFAULT then
    return nil,
      {
        kind = "slot",
        text = name,
        label = 'a block with the reserved class "default"',
        suggestion = "Choose another class name; loose content is already the default slot.",
      }
  end
  if not name:match(SLOT_NAME) then
    return nil,
      {
        kind = "slot",
        text = name,
        label = string.format('a block with the class "%s" (not a valid slot name)', name),
        suggestion = "Use lowercase letters, digits and hyphens, starting with a letter.",
      }
  end
  return name
end

--- Converts the content of one `.scene` Div. Returns `slots` (slot name ->
--- JSON array of blocks; loose blocks are `default`) and `found` (the
--- unsupported elements, in document order). A duplicate or empty slot is
--- a finding; its first valid copy is kept.
function M.convert(div)
  local found, slots = {}, {}
  local loose = json.array({})
  -- How many Divs of each first class came before (the `nth` of a finding).
  local counts = {}
  for _, el in ipairs(div.content) do
    if el.t == "Div" then
      local key = el.classes[1]
      local nth = nil
      if key then
        counts[key] = (counts[key] or 0) + 1
        nth = counts[key]
      end
      local name, problem = slot_of(el)
      if name == nil then
        if key then
          problem.kind, problem.text, problem.nth = "slot", key, nth
        end
        found[#found + 1] = problem
      else
        local before = #found
        local blocks = convert_blocks(el.content, found, true)
        if slots[name] ~= nil then
          found[#found + 1] = {
            kind = "slot",
            text = name,
            nth = nth,
            label = string.format("a second .%s slot", name),
            suggestion = "Put all the content of one slot in one block.",
          }
        elseif #blocks == 0 and #found == before then
          found[#found + 1] = {
            kind = "slot",
            text = name,
            nth = nth,
            label = string.format("an empty .%s slot", name),
            suggestion = "Put content in the slot or remove it.",
          }
        else
          slots[name] = blocks
        end
      end
    else
      for _, block in ipairs(convert_blocks({ el }, found, false)) do
        loose[#loose + 1] = block
      end
    end
  end
  if #loose > 0 then
    slots[DEFAULT] = loose
  end
  return slots, found
end

return M
