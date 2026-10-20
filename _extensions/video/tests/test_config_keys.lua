-- Unknown front matter keys under video and defaults (E_CONFIG_UNKNOWN_KEY;
-- task 010). Unknown keys are errors with a "did you mean" suggestion.
local h = require("tests.helpers")
local config_keys = require("lib.config_keys")

local function check_fn(front)
  return function()
    config_keys.check(h.doc("", front).meta)
  end
end

local function first(front)
  return h.code_is(check_fn(front), "E_CONFIG_UNKNOWN_KEY", "unknown key")
end

return {
  ["known keys raise nothing"] = function()
    local front = "---\ntitle: Ok\ntheme: modern\nvideo:\n  width: 1920\n  output: a.mp4\n"
      .. "defaults:\n  scene:\n    duration: 4s\n    transition: fade\n---\n\n"
    h.eq(#h.diagnostics_of(check_fn(front)), 0, "count")
  end,

  ["Quarto's own top-level keys are not checked"] = function()
    h.eq(#h.diagnostics_of(check_fn("---\nauthor: Ada\nlang: en\n---\n\n")), 0, "count")
  end,

  ["a misspelt video key suggests the closest key"] = function()
    local diagnostic = first("---\nvideo:\n  widht: 1280\n---\n\n")
    h.eq(diagnostic.property, "video.widht", "property")
    h.eq(diagnostic.message, 'Unknown front matter key "video.widht".', "message")
    h.eq(diagnostic.suggestion, 'Did you mean "width"?', "suggestion")
  end,

  ["a misspelt defaults.scene key suggests the closest key"] = function()
    local diagnostic = first("---\ndefaults:\n  scene:\n    duraton: 2s\n---\n\n")
    h.eq(diagnostic.property, "defaults.scene.duraton", "property")
    h.eq(diagnostic.suggestion, 'Did you mean "duration"?', "suggestion")
  end,

  ["an unknown key with no close match lists the allowed keys"] = function()
    local diagnostic = first("---\nvideo:\n  bitrate: 5\n---\n\n")
    h.eq(
      diagnostic.suggestion,
      "Allowed keys here: background, captions, fps, height, output, reducedMotion, width.",
      "suggestion"
    )
  end,

  ["codec and container keys are reported as not supported yet"] = function()
    local diagnostic = first("---\nvideo:\n  codec: h264\n---\n\n")
    h.eq(diagnostic.property, "video.codec", "property")
    h.eq(diagnostic.suggestion, "Codec and container settings are not supported yet.", "suggestion")
  end,

  ["every unknown key is reported, in sorted order"] = function()
    local list = h.diagnostics_of(check_fn("---\nvideo:\n  widht: 1\n  hieght: 2\n---\n\n"))
    h.eq(#list, 2, "count")
    h.eq(list[1].property, "video.hieght", "first")
    h.eq(list[2].property, "video.widht", "second")
  end,
}
