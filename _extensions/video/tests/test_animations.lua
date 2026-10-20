-- Scene animations through the filter's scene collection (PRD §5.6; ADR-0011):
-- the attribute is carried into the record, a scene without one has none, and
-- a value that is not a name is E_ANIMATION_UNKNOWN on its scene.
local h = require("tests.helpers")
local scenes = require("lib.scenes")
local animations = require("lib.animations")
local manifest = require("lib.manifest")

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
  ["carries the exit name into the scene record"] = function()
    local list = collect(scene("a", ' exit="fade-out"'))
    h.eq(list[1].exit.name, "fade-out", "exit")
    h.eq(list[1].animation, nil, "animation")
  end,

  ["a scene without an exit has none"] = function()
    local list = collect(scene("a", ' animation="fade-in"'))
    h.eq(list[1].exit, nil, "exit")
  end,

  ["reports E_ANIMATION_UNKNOWN for an exit that is not a name"] = function()
    local diagnostic = h.code_is(function()
      collect(scene("a", ' exit="Fade-Out"'))
    end, "E_ANIMATION_UNKNOWN", "code")
    h.eq(diagnostic.property, "exit", "property")
    h.contains(diagnostic.suggestion, 'exit="fade-out"', "suggestion")
  end,

  ["animationDuration becomes a window in frames"] = function()
    local list = collect(scene("a", ' animation="fade-in" animationDuration="500ms"'))
    h.eq(list[1].animationDurationFrames, 15, "frames")
  end,

  ["an animationDuration with no animation or exit is E_ANIMATION_DURATION"] = function()
    local diagnostic = h.code_is(function()
      collect(scene("a", ' animationDuration="1s"'))
    end, "E_ANIMATION_DURATION", "code")
    h.eq(diagnostic.property, "animationDuration", "property")
    h.contains(diagnostic.message, "no animation or exit", "message")
  end,

  ["a zero animationDuration is E_DURATION_RANGE on that attribute"] = function()
    local diagnostic = h.code_is(function()
      collect(scene("a", ' animation="fade-in" animationDuration="0s"'))
    end, "E_DURATION_RANGE", "code")
    h.eq(diagnostic.property, "animationDuration", "property")
  end,

  ["an animationDuration under one frame is E_DURATION_RANGE"] = function()
    h.code_is(function()
      collect(scene("a", ' animation="fade-in" animationDuration="1ms"'))
    end, "E_DURATION_RANGE", "code")
  end,

  ["a manifest with an exit or a window is IR 1.12 with both fields"] = function()
    local list = collect(scene("a", ' exit="fade-out" animationDuration="500ms"'))
    local ir = manifest.build({ width = 640, height = 360, fps = 30 }, list, "index.qmd", nil, nil)
    h.eq(ir.schemaVersion, "1.12", "schemaVersion")
    h.eq(ir.scenes[1].exit.name, "fade-out", "exit")
    h.eq(ir.scenes[1].animationDurationFrames, 15, "animationDurationFrames")
  end,

  ["a manifest with only an animation keeps its older version"] = function()
    local list = collect(scene("a", ' animation="fade-in"'))
    local ir = manifest.build({ width = 640, height = 360, fps = 30 }, list, "index.qmd", nil, nil)
    h.eq(ir.schemaVersion, "1.6", "schemaVersion")
  end,
}
