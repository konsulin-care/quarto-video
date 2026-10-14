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
    local err = h.error_of(function()
      scenes.collect(h.doc(body), 30)
    end)
    h.contains(err, "top-level", "error")
  end,

  ["rejects an unknown scene attribute"] = function()
    local body = '::: {.scene component="title" duration="4s" animation="reveal"}\nX\n:::\n'
    local err = h.error_of(function()
      scenes.collect(h.doc(body), 30)
    end)
    h.contains(err, 'unknown attribute "animation"', "error")
  end,

  ["requires the component attribute"] = function()
    local body = '::: {.scene duration="4s"}\nX\n:::\n'
    local err = h.error_of(function()
      scenes.collect(h.doc(body), 30)
    end)
    h.contains(err, "component attribute is required", "error")
  end,

  ["requires the duration attribute until defaults exist"] = function()
    local body = '::: {.scene component="title"}\nX\n:::\n'
    local err = h.error_of(function()
      scenes.collect(h.doc(body), 30)
    end)
    h.contains(err, "duration attribute is required", "error")
  end,
}
