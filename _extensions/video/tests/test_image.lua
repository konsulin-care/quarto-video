-- Image blocks (IR 1.3; ADR-0013; task 033): a `.image` Div with src, fit and
-- alt. Each shape error is one E_IMAGE_BLOCK diagnostic for its scene.
local h = require("tests.helpers")
local content = require("lib.content")
local locate = require("lib.locate")

--- The first scene Div of a document body (standard front matter applied).
local function convert(body)
  local div = locate.scene_divs(h.doc(body))[1].div
  return content.convert(div)
end

local function scene(inner)
  return '::: {.scene component="image" duration="4s"}\n' .. inner .. "\n:::\n"
end

local IMAGE = '::: {.image src="assets/photo.png" alt="A harbour at dusk"}\n:::'

-- The one finding of a body, as the diagnostic a scene gets (scene id "scene-001").
local function one_problem(body)
  local _, found = convert(body)
  h.eq(#found, 1, "finding count")
  h.eq(found[1].code, "E_IMAGE_BLOCK", "finding code")
  return content.problem(found[1], "scene-001", "image")
end

return {
  ["an image block is an IR image node with fit contain by default"] = function()
    local slots, found = convert(scene(IMAGE))
    h.eq(#found, 0, "finding count")
    local block = slots.default[1]
    h.eq(block.type, "image", "block type")
    h.eq(block.src, "assets/photo.png", "src")
    h.eq(block.fit, "contain", "default fit")
    h.eq(block.alt, "A harbour at dusk", "alt")
  end,

  ["fit cover is kept and alt may be empty"] = function()
    local slots, found = convert(scene('::: {.image src="assets/a.png" fit="cover" alt=""}\n:::'))
    h.eq(#found, 0, "finding count")
    h.eq(slots.default[1].fit, "cover", "fit")
    h.eq(slots.default[1].alt, "", "decorative alt")
  end,

  ["a caption slot next to the image holds a paragraph"] = function()
    local slots, found = convert(scene(IMAGE .. "\n\n::: {.caption}\nHarbour.\n:::"))
    h.eq(#found, 0, "finding count")
    h.eq(slots.default[1].type, "image", "default block")
    h.eq(slots.caption[1].type, "paragraph", "caption block")
  end,

  ["an image inside a slot is kept there (the contract rejects it, task 014)"] = function()
    local slots, found = convert(scene("::: {.caption}\n" .. IMAGE .. "\n:::"))
    h.eq(#found, 0, "finding count")
    h.eq(slots.caption[1].type, "image", "caption block")
  end,

  ["a missing src is E_IMAGE_BLOCK naming the scene"] = function()
    local diagnostic = one_problem(scene('::: {.image alt="A harbour"}\n:::'))
    h.eq(diagnostic.code, "E_IMAGE_BLOCK", "code")
    h.eq(diagnostic.message, 'Scene "scene-001" has an image block with no src attribute.', "message")
    h.eq(diagnostic.sceneId, "scene-001", "scene id")
    h.eq(diagnostic.component, "image", "component")
  end,

  ["a missing alt is E_IMAGE_BLOCK"] = function()
    local diagnostic = one_problem(scene('::: {.image src="assets/a.png"}\n:::'))
    h.eq(diagnostic.message, 'Scene "scene-001" has an image block with no alt attribute.', "message")
  end,

  ["an unknown fit is E_IMAGE_BLOCK naming the value"] = function()
    local diagnostic = one_problem(
      scene('::: {.image src="assets/a.png" fit="stretch" alt="x"}\n:::')
    )
    h.eq(diagnostic.message, 'Scene "scene-001" has an image block with fit="stretch".', "message")
  end,

  ["an unknown attribute is E_IMAGE_BLOCK"] = function()
    local diagnostic = one_problem(
      scene('::: {.image src="assets/a.png" alt="x" width="2"}\n:::')
    )
    h.eq(diagnostic.message, 'Scene "scene-001" has an image block with the unknown attribute "width".', "message")
  end,

  ["content inside an image block is E_IMAGE_BLOCK"] = function()
    local diagnostic = one_problem(scene('::: {.image src="assets/a.png" alt="x"}\nText.\n:::'))
    h.eq(diagnostic.message, 'Scene "scene-001" has an image block with content inside it.', "message")
  end,

  ["a second image block in a scene is E_IMAGE_BLOCK at the second block"] = function()
    local body = scene(IMAGE .. "\n\n" .. IMAGE)
    local _, found = convert(body)
    h.eq(#found, 1, "finding count")
    h.eq(found[1].nth, 2, "the second image Div")
    h.eq(found[1].message, 'Scene "%s" has a second image block.', "message")
  end,

  ["a message keeps a percent sign that the author wrote"] = function()
    local diagnostic = one_problem(scene('::: {.image src="assets/a.png" alt="x" fit="50%"}\n:::'))
    h.eq(diagnostic.message, 'Scene "scene-001" has an image block with fit="50%".', "message")
  end,
}
