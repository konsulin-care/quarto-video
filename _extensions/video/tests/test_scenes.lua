-- Scene collection and manifest shape (PRD §5.3, IR 0.1).
local h = require("tests.helpers")
local scenes = require("lib.scenes")
local manifest = require("lib.manifest")
local json = require("lib.json")

local SETTINGS = { width = 1920, height = 1080, fps = 30, background = "#10131C" }

local function scene(component, duration, text)
  return string.format(
    '::: {.scene component="%s" duration="%s"}\n%s\n:::\n\n',
    component,
    duration,
    text
  )
end

local function collect_fn(body)
  return function()
    scenes.collect(h.doc(body), 30)
  end
end

return {
  ["no scenes give an empty scenes list"] = function()
    local list = scenes.collect(h.doc("Just prose, no scenes.\n"), 30)
    h.eq(#list, 0, "scene count")
    local ir = manifest.build(SETTINGS, list, "index.qmd")
    h.contains(json.encode(ir), '"scenes": []', "manifest scenes")
  end,

  ["non-scene Divs are ignored"] = function()
    local body = "::: {.note}\nNot a scene.\n:::\n\n" .. scene("title", "4s", "Why GPUs Matter")
    local list = scenes.collect(h.doc(body), 30)
    h.eq(#list, 1, "scene count")
    h.eq(list[1].component, "title", "component")
    h.eq(list[1].text, "Why GPUs Matter", "text")
  end,

  ["scenes get ids in document order"] = function()
    local body = scene("title", "4s", "First") .. scene("statement", "2s", "Second")
    local list = scenes.collect(h.doc(body), 30)
    h.eq(list[1].id, "scene-001", "first id")
    h.eq(list[2].id, "scene-002", "second id")
    h.eq(list[2].component, "statement", "second component")
  end,

  ["plain text keeps one paragraph per line"] = function()
    local body = '::: {.scene component="title" duration="4s"}\nAlpha\n\nBeta\n:::\n'
    local list = scenes.collect(h.doc(body), 30)
    h.eq(list[1].text, "Alpha\nBeta", "text")
  end,

  ["rejects a .scene nested inside another Div"] = function()
    local body = "::: {.note}\n" .. scene("title", "4s", "Hidden") .. ":::\n"
    local err = h.error_of(collect_fn(body))
    h.contains(err, "top-level", "error")
    h.code_is(collect_fn(body), "E_SCENE_NESTED", "nested")
  end,

  ["rejects an unknown scene attribute"] = function()
    local body = '::: {.scene component="title" duration="4s" animation="reveal"}\nX\n:::\n'
    local err = h.error_of(collect_fn(body))
    h.contains(err, 'unknown attribute "animation"', "error")
    h.code_is(collect_fn(body), "E_SCENE_SHAPE", "shape")
  end,

  ["requires the component attribute"] = function()
    local body = scene("title", "4s", "First") .. '::: {.scene duration="4s"}\nX\n:::\n'
    local err = h.error_of(collect_fn(body))
    h.contains(err, 'Scene "scene-002" has no component attribute.', "error")
    local diagnostic = h.code_is(collect_fn(body), "E_SCENE_NO_COMPONENT", "component")
    h.eq(diagnostic.sceneId, "scene-002", "sceneId")
    h.eq(diagnostic.suggestion, 'Add component="<name>"', "suggestion")
  end,

  ["requires the duration attribute"] = function()
    local body = '::: {.scene component="title"}\nX\n:::\n'
    local err = h.error_of(collect_fn(body))
    h.contains(err, 'Scene "scene-001" has no duration attribute.', "error")
    h.code_is(collect_fn(body), "E_SCENE_NO_DURATION", "duration")
  end,

  ["reports a bad duration with its scene id and component"] = function()
    local body = '::: {.scene component="title" duration="2 seconds"}\nX\n:::\n'
    local diagnostic = h.code_is(collect_fn(body), "E_DURATION_SYNTAX", "duration")
    h.eq(diagnostic.sceneId, "scene-001", "sceneId")
    h.eq(diagnostic.component, "title", "component")
    h.eq(diagnostic.property, "duration", "property")
  end,

  ["reports every bad scene in one pass"] = function()
    local body = '::: {.scene component="title"}\nA\n:::\n\n'
      .. '::: {.scene component="title" duration="2 seconds"}\nB\n:::\n\n'
      .. '::: {.scene component="title" duration="4s" animation="x"}\nC\n:::\n'
    local list = h.diagnostics_of(collect_fn(body))
    h.eq(#list, 3, "diagnostic count")
    h.eq(list[1].code, "E_SCENE_NO_DURATION", "first code")
    h.eq(list[2].code, "E_DURATION_SYNTAX", "second code")
    h.eq(list[3].code, "E_SCENE_SHAPE", "third code")
  end,
}
