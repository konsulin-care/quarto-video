-- Scene transitions through the filter's scene collection (PRD §5.6, §8.3;
-- ADR-0005): each DSL rule and each E_TRANSITION_* / duration error.
local h = require("tests.helpers")
local scenes = require("lib.scenes")
local transitions = require("lib.transitions")

-- A scene with extra attributes, e.g. ' transition="fade"'.
local function scene(id, extra)
  return string.format(
    '::: {.scene component="title" duration="4s"%s #%s}\nText.\n:::\n\n',
    extra or "",
    id
  )
end

local function collect(body, default_transition)
  return scenes.collect(h.doc(body), 30, nil, nil, default_transition)
end

-- The code of the first diagnostic the collection raises, or nil.
local function first_code(body, default_transition)
  local list = h.diagnostics_of(function()
    collect(body, default_transition)
  end)
  return list[1] and list[1].code
end

local FADE = ' transition="fade" transitionDuration="1s"'

return {
  ["a scene with no transition has none"] = function()
    local list = collect(scene("a") .. scene("b"))
    h.eq(list[1].transition, nil, "first")
    h.eq(list[2].transition, nil, "second")
  end,

  ["a fade with a duration overlaps by its frames"] = function()
    local list = collect(scene("a") .. scene("b", FADE))
    h.eq(list[2].transition.name, "fade", "name")
    h.eq(list[2].transition.durationFrames, 30, "frames at 30 fps")
  end,

  ["cut takes no time"] = function()
    local list = collect(scene("a") .. scene("b", ' transition="cut"'))
    h.eq(list[2].transition.name, "cut", "name")
    h.eq(list[2].transition.durationFrames, 0, "frames")
  end,

  ["the transition duration rounds like any duration (ADR-0003)"] = function()
    local list = collect(scene("a") .. scene("b", ' transition="fade" transitionDuration="0.5s"'))
    h.eq(list[2].transition.durationFrames, 15, "0.5s at 30 fps")
  end,

  ["the default applies to every scene after the first"] = function()
    local list = collect(scene("a") .. scene("b", ' transitionDuration="1s"'), "fade")
    h.eq(list[1].transition, nil, "first scene takes no default")
    h.eq(list[2].transition.name, "fade", "second scene takes the default")
    h.eq(list[2].transition.durationFrames, 30, "its own duration")
  end,

  ["an explicit transition wins over the default"] = function()
    local list = collect(scene("a") .. scene("b", ' transition="cut"'), "fade")
    h.eq(list[2].transition.name, "cut", "explicit cut")
  end,

  ["a default fade needs a duration on each scene"] = function()
    h.eq(first_code(scene("a") .. scene("b"), "fade"), "E_TRANSITION_DURATION", "code")
  end,

  ["an explicit transition on the first scene is rejected"] = function()
    h.eq(first_code(scene("a", FADE)), "E_TRANSITION_FIRST_SCENE", "code")
  end,

  ["a cut on the first scene is allowed"] = function()
    local list = collect(scene("a", ' transition="cut"') .. scene("b"))
    h.eq(list[1].transition.durationFrames, 0, "frames")
  end,

  ["a fade without a transitionDuration is E_TRANSITION_DURATION"] = function()
    local found = h.code_is(function()
      collect(scene("a") .. scene("b", ' transition="fade"'))
    end, "E_TRANSITION_DURATION", "fade without duration")
    h.eq(found.sceneId, "b", "scene id")
    h.contains(found.message, 'uses transition "fade" without a transitionDuration', "message")
  end,

  ["a cut with a transitionDuration is E_TRANSITION_DURATION"] = function()
    h.eq(
      first_code(scene("a") .. scene("b", ' transition="cut" transitionDuration="1s"')),
      "E_TRANSITION_DURATION",
      "code"
    )
  end,

  ["a transitionDuration without a transition is E_TRANSITION_DURATION"] = function()
    h.eq(
      first_code(scene("a") .. scene("b", ' transitionDuration="1s"')),
      "E_TRANSITION_DURATION",
      "code"
    )
  end,

  ["a transition name with capitals is E_TRANSITION_UNKNOWN"] = function()
    h.eq(
      first_code(scene("a") .. scene("b", ' transition="Fade" transitionDuration="1s"')),
      "E_TRANSITION_UNKNOWN",
      "code"
    )
  end,

  ["a zero transitionDuration is E_DURATION_RANGE and names the attribute"] = function()
    local found = h.code_is(function()
      collect(scene("a") .. scene("b", ' transition="fade" transitionDuration="0s"'))
    end, "E_DURATION_RANGE", "zero")
    h.contains(found.message, 'Scene "b" has transitionDuration "0s"', "message")
    h.eq(found.property, "transitionDuration", "property")
  end,

  ["a negative transitionDuration is E_DURATION_RANGE"] = function()
    h.eq(
      first_code(scene("a") .. scene("b", ' transition="fade" transitionDuration="-1s"')),
      "E_DURATION_RANGE",
      "code"
    )
  end,

  ["valid_name accepts kebab-case names only"] = function()
    h.eq(transitions.valid_name("fade"), true, "fade")
    h.eq(transitions.valid_name("slide-up"), true, "slide-up")
    h.eq(transitions.valid_name("Fade"), false, "capital")
    h.eq(transitions.valid_name("1fade"), false, "leading digit")
    h.eq(transitions.valid_name(""), false, "empty")
    h.eq(transitions.valid_name(string.rep("a", 65)), false, "65 characters")
  end,

  ["a bad default transition name is E_SETTING_INVALID"] = function()
    local config = require("lib.config")
    local meta = h.doc("", '---\ndefaults:\n  scene:\n    transition: "Fade Out"\n---\n\n').meta
    h.code_is(function()
      config.scene_defaults(meta, 30)
    end, "E_SETTING_INVALID", "default name")
  end,
}
