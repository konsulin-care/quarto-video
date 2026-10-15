-- Scene animations through the filter's scene collection (PRD §5.6; ADR-0011):
-- the attribute is carried into the record, a scene without one has none, and
-- a value that is not a name is E_ANIMATION_UNKNOWN on its scene.
local h = require("tests.helpers")
local scenes = require("lib.scenes")
local animations = require("lib.animations")

-- A scene with extra attributes, e.g. ' animation="fade-in"'.
local function scene(id, extra)
  return string.format(
    '::: {.scene component="title" duration="1s"%s #%s}\nText.\n:::\n\n',
    extra or "",
    id
  )
end

local function collect(body)
  return scenes.collect(h.doc(body), 30)
end

return {
  ["carries the animation name into the scene record"] = function()
    local list = collect(scene("a", ' animation="fade-in"'))
    h.eq(list[1].animation.name, "fade-in", "name")
  end,

  ["a scene without an animation has none"] = function()
    local list = collect(scene("a"))
    h.eq(list[1].animation, nil, "animation")
  end,

  ["accepts a name with digits and hyphens"] = function()
    h.eq(animations.valid_name("slide-up"), true, "slide-up")
    h.eq(animations.valid_name("stage2"), true, "stage2")
  end,

  ["rejects a value that is not an animation name"] = function()
    for _, text in ipairs({ "Fade-In", "fade in", "2fade", "" }) do
      h.eq(animations.valid_name(text), false, text)
    end
  end,

  ["reports E_ANIMATION_UNKNOWN on the scene with the bad name"] = function()
    local body = scene("a", ' animation="Fade-In"')
    local diagnostic = h.code_is(function()
      collect(body)
    end, "E_ANIMATION_UNKNOWN", "code")
    h.eq(diagnostic.sceneId, "a", "sceneId")
    h.eq(diagnostic.property, "animation", "property")
    h.contains(diagnostic.message, 'animation "Fade-In"', "message")
  end,
}
