-- Inline Pandoc elements -> content nodes (IR 0.2; ADR-0004). Only the node
-- set in ADR-0004 becomes a node. Any other element is recorded in `found` as
-- { kind, t } and produces no node; content.lua turns it into a diagnostic.
local json = require("lib.json")

local M = {}

-- Pandoc inline type -> finding kind, for the unsupported types.
local KIND = {
  Span = "span",
  Underline = "underline",
  SmallCaps = "smallcaps",
  Strikeout = "strikeout",
  Superscript = "superscript",
  Subscript = "subscript",
  Link = "link",
  Image = "image",
  Note = "footnote",
  Math = "math",
  RawInline = "raw",
  Cite = "cite",
}

-- True when a Pandoc element has no identifier, classes or key-value attributes.
local function bare(el)
  if el.identifier ~= "" or #el.classes > 0 then
    return false
  end
  for _ in pairs(el.attributes) do
    return false
  end
  return true
end
M.bare = bare

-- The first line of raw text, without surrounding spaces (its source text).
local function trimmed_first_line(text)
  return (text:match("^[^\n]*") or ""):match("^%s*(.-)%s*$")
end
M.first_line = trimmed_first_line

-- Appends text, merged into a text node that ends the list. Empty text is dropped.
local function add_text(out, text)
  if text == "" then
    return
  end
  local last = out[#out]
  if last and last.type == "text" then
    last.text = last.text .. text
  else
    out[#out + 1] = { type = "text", text = text }
  end
end

--- Converts a list of Pandoc inlines to a JSON array of content nodes.
function M.convert(list, found)
  local out = json.array({})
  for _, el in ipairs(list) do
    local t = el.t
    if t == "Str" then
      add_text(out, el.text)
    elseif t == "Space" or t == "SoftBreak" then
      add_text(out, " ")
    elseif t == "LineBreak" then
      out[#out + 1] = { type = "line-break" }
    elseif t == "Strong" or t == "Emph" then
      out[#out + 1] = {
        type = t == "Strong" and "strong" or "emphasis",
        inlines = M.convert(el.content, found),
      }
    elseif t == "Quoted" then
      out[#out + 1] = {
        type = "quoted",
        quote = tostring(el.quotetype) == "DoubleQuote" and "double" or "single",
        inlines = M.convert(el.content, found),
      }
    elseif t == "Code" and bare(el) then
      out[#out + 1] = { type = "code", text = el.text }
    elseif t == "RawInline" then
      found[#found + 1] = { kind = "raw", t = t, text = trimmed_first_line(el.text) }
    else
      found[#found + 1] = { kind = KIND[t] or (t == "Code" and "code") or "other", t = t }
    end
  end
  return out
end

return M
