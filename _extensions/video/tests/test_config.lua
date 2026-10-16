-- Front matter settings and their defaults (PRD §5.2; task 010).
local h = require("tests.helpers")
local config = require("lib.config")

local function front(fields)
  return "---\nvideo:\n" .. fields .. "---\n\n"
end

local FULL = '  width: 1920\n  height: 1080\n  fps: 30\n  background: "#10131C"\n'

local function read_fields(fields)
  return config.read(h.doc("", front(fields)).meta)
end

local function diagnostics_of_read(fields)
  return h.diagnostics_of(function()
    config.read(h.doc("", front(fields)).meta)
  end)
end

return {
  ["empty front matter gives the default settings"] = function()
    local settings = config.read(h.doc("Prose only.\n", "---\ntitle: Empty\n---\n\n").meta)
    h.eq(settings.width, 1920, "width")
    h.eq(settings.height, 1080, "height")
    h.eq(settings.fps, 30, "fps")
    h.eq(settings.background, "#000000", "background")
  end,

  ["a missing video block gives the default settings"] = function()
    local settings = config.read(h.doc("Prose only.\n", "").meta)
    h.eq(settings.fps, 30, "fps")
  end,

  ["an empty video block gives the default settings"] = function()
    local settings = read_fields("")
    h.eq(settings.width, 1920, "width")
  end,

  ["each setting overridden is read"] = function()
    local settings =
      read_fields('  width: 1280\n  height: 720\n  fps: 24\n  background: "#10131C"\n')
    h.eq(settings.width, 1280, "width")
    h.eq(settings.height, 720, "height")
    h.eq(settings.fps, 24, "fps")
    h.eq(settings.background, "#10131C", "background")
  end,

  ["a block that is not a map is E_SETTING_INVALID"] = function()
    local diagnostic = h.code_is(function()
      config.read(h.doc("", "---\nvideo: 5\n---\n\n").meta)
    end, "E_SETTING_INVALID", "video")
    h.eq(diagnostic.property, "video", "property")
  end,

  ["rejects a fractional fps"] = function()
    local err = h.error_of(function()
      read_fields(FULL:gsub("fps: 30", "fps: 29.97"))
    end)
    h.contains(err, 'video.fps must be a whole number of at least 1, got "29.97"', "error")
  end,

  ["rejects fps 0"] = function()
    local diagnostic = h.code_is(function()
      read_fields(FULL:gsub("fps: 30", "fps: 0"))
    end, "E_SETTING_INVALID", "fps 0")
    h.eq(diagnostic.property, "video.fps", "property")
  end,

  ["rejects a width that is not a number"] = function()
    local diagnostic = h.code_is(function()
      read_fields(FULL:gsub("width: 1920", 'width: "big"'))
    end, "E_SETTING_INVALID", "width big")
    h.eq(diagnostic.property, "video.width", "property")
  end,

  ["rejects an odd height, which H.264 cannot encode"] = function()
    local diagnostic = h.code_is(function()
      read_fields(FULL:gsub("height: 1080", "height: 1081"))
    end, "E_SETTING_INVALID", "odd height")
    h.eq(diagnostic.property, "video.height", "property")
    h.contains(diagnostic.message, "must be even for H.264, got 1081", "message")
    h.contains(diagnostic.suggestion, "for example 1080", "suggestion")
  end,

  ["rejects an odd width, which H.264 cannot encode"] = function()
    local diagnostic = h.code_is(function()
      read_fields(FULL:gsub("width: 1920", "width: 1281"))
    end, "E_SETTING_INVALID", "odd width")
    h.eq(diagnostic.property, "video.width", "property")
  end,

  ["reports every invalid setting in one run"] = function()
    local list = diagnostics_of_read("  width: 1920\n  height: 1081\n  fps: 0\n")
    h.eq(#list, 2, "count")
    h.eq(list[1].property, "video.height", "first")
    h.eq(list[2].property, "video.fps", "second")
  end,

  ["rejects a background that is not a hex colour"] = function()
    local err = h.error_of(function()
      read_fields(FULL:gsub('"#10131C"', "navy"))
    end)
    h.contains(err, "video.background must be a hex colour", "error")
  end,

  ["video.output defaults to output.mp4"] = function()
    h.eq(config.output(h.doc("", front(FULL)).meta), "output.mp4", "output")
    h.eq(config.output(h.doc("", "").meta), "output.mp4", "no block")
  end,

  ["reads a relative video.output path"] = function()
    local fields = FULL .. "  output: exports/clip.mp4\n"
    h.eq(config.output(h.doc("", front(fields)).meta), "exports/clip.mp4", "output")
  end,

  ["rejects an absolute video.output path"] = function()
    local fields = FULL .. "  output: /tmp/clip.mp4\n"
    local err = h.error_of(function()
      config.output(h.doc("", front(fields)).meta)
    end)
    h.contains(err, "video.output must be relative to the project", "error")
  end,

  ["rejects a video.output path that leaves the project"] = function()
    local fields = FULL .. "  output: ../clip.mp4\n"
    local err = h.error_of(function()
      config.output(h.doc("", front(fields)).meta)
    end)
    h.contains(err, 'video.output must not contain ".."', "error")
  end,

  ["rejects a video.output without the .mp4 extension"] = function()
    local fields = FULL .. "  output: clip.mov\n"
    local err = h.error_of(function()
      config.output(h.doc("", front(fields)).meta)
    end)
    h.contains(err, "video.output must end in .mp4", "error")
  end,

  ["an invalid setting has code E_SETTING_INVALID"] = function()
    local fields = FULL .. "  output: ../clip.mp4\n"
    local diagnostic = h.code_is(function()
      config.output(h.doc("", front(fields)).meta)
    end, "E_SETTING_INVALID", "output")
    h.eq(diagnostic.property, "video.output", "property")
  end,

  ["no defaults.scene.duration gives no default frames"] = function()
    h.eq(config.scene_defaults(h.doc("", front(FULL)).meta, 30).frames, nil, "frames")
  end,

  ["defaults.scene.duration converts at the video fps"] = function()
    local meta = h.doc("", "---\ndefaults:\n  scene:\n    duration: 1.5s\n---\n\n").meta
    h.eq(config.scene_defaults(meta, 30).frames, 45, "1.5s at 30 fps")
    h.eq(config.scene_defaults(meta, 24).frames, 36, "1.5s at 24 fps")
  end,

  ["an invalid defaults.scene.duration names the setting"] = function()
    local meta = h.doc("", "---\ndefaults:\n  scene:\n    duration: -1s\n---\n\n").meta
    local diagnostic = h.code_is(function()
      config.scene_defaults(meta, 30)
    end, "E_DURATION_RANGE", "negative default")
    h.eq(diagnostic.property, "defaults.scene.duration", "property")
    h.eq(
      diagnostic.message,
      'The default scene duration "-1s" (defaults.scene.duration), which must be greater than zero.',
      "message"
    )
  end,

  ["a defaults.scene.duration without a unit is E_DURATION_SYNTAX"] = function()
    local meta = h.doc("", "---\ndefaults:\n  scene:\n    duration: 4\n---\n\n").meta
    h.code_is(function()
      config.scene_defaults(meta, 30)
    end, "E_DURATION_SYNTAX", "no unit")
  end,

  ["stored settings are read as text"] = function()
    local meta = h.doc(
      "",
      "---\ntitle: Why GPUs\ntheme: modern\ndefaults:\n  scene:\n    transition: fade\n---\n\n"
    ).meta
    local stored = config.stored(meta)
    h.eq(stored.title, "Why GPUs", "title")
    h.eq(stored.theme, "modern", "theme")
    h.eq(config.scene_defaults(meta, 30).transition, "fade", "transition")
  end,

  ["absent stored settings stay nil"] = function()
    local stored = config.stored(h.doc("", "").meta)
    h.eq(stored.title, nil, "title")
    h.eq(stored.theme, nil, "theme")
    h.eq(config.scene_defaults(h.doc("", "").meta, 30).transition, nil, "transition")
  end,

  ["an explicit video.background is stored for the renderer"] = function()
    local stored = config.stored(h.doc("", front('  background: "#10131C"\n')).meta)
    h.eq(stored.background, "#10131C", "background")
  end,

  ["an absent video.background is not stored, so the theme supplies the canvas"] = function()
    local stored = config.stored(h.doc("", front("  fps: 30\n")).meta)
    h.eq(stored.background, nil, "background")
    h.eq(config.read(h.doc("", front("  fps: 30\n")).meta).background, "#000000", "IR default")
  end,

  ["a list theme is E_SETTING_INVALID"] = function()
    local meta = h.doc("", "---\ntheme:\n  - modern\n---\n\n").meta
    h.code_is(function()
      config.stored(meta)
    end, "E_SETTING_INVALID", "list theme")
  end,

  ["a map where a single value belongs is E_SETTING_INVALID"] = function()
    local diagnostic = h.code_is(function()
      config.read(h.doc("", "---\nvideo:\n  width:\n    a: 1\n---\n\n").meta)
    end, "E_SETTING_INVALID", "map width")
    h.eq(diagnostic.property, "video.width", "property")
    h.contains(diagnostic.message, "must be a single value", "message")
  end,

  ["a list where a single value belongs is E_SETTING_INVALID"] = function()
    local diagnostic = h.code_is(function()
      config.output(h.doc("", "---\nvideo:\n  output:\n    - a.mp4\n---\n\n").meta)
    end, "E_SETTING_INVALID", "list output")
    h.eq(diagnostic.property, "video.output", "property")
  end,
  ["reducedMotion defaults to false"] = function()
    h.eq(read_fields(FULL).reducedMotion, false, "default")
    h.eq(read_fields("").reducedMotion, false, "no video block")
  end,

  ["reducedMotion true and false are read as booleans"] = function()
    h.eq(read_fields(FULL .. "  reducedMotion: true\n").reducedMotion, true, "true")
    h.eq(read_fields(FULL .. "  reducedMotion: false\n").reducedMotion, false, "false")
  end,

  ["reducedMotion as text is E_SETTING_INVALID"] = function()
    local diagnostic = h.code_is(function()
      config.read(h.doc("", front(FULL .. '  reducedMotion: "true"\n')).meta)
    end, "E_SETTING_INVALID", "video.reducedMotion")
    h.eq(diagnostic.suggestion:find("true or false", 1, true) ~= nil, true, "suggestion")
  end,
}
