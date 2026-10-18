-- Framed image footage (IR 1.10, ADR-0018; lib/media_kind.lua, lib/media_image.lua):
-- the kind of a `.video` src, the image item it makes, the attributes an image
-- refuses, and the IR version and `kind` field the manifest writes.
local h = require("tests.helpers")
local content = require("lib.content")
local locate = require("lib.locate")
local manifest = require("lib.manifest")
local media_kind = require("lib.media_kind")

local SETTINGS = { width = 1920, height = 1080, fps = 30, background = "#10131C" }
local FPS = 30

--- Converts the content of the first scene of `body`: slots, findings, media.
local function convert(body)
  local div = locate.scene_divs(h.doc(body))[1].div
  return content.convert(div, FPS)
end

local function scene(inner)
  return '::: {.scene component="product-demo" duration="2s"}\n' .. inner .. "\n:::\n"
end

local function video(attrs)
  return "::: {.video " .. attrs .. "}\n:::"
end

local IMAGE = 'src="assets/still.png" placement="framed" frame="browser"'

--- The finding of a body, checked for its code; returns its message.
local function one_code(body, code)
  local _, found = convert(body)
  h.eq(#found, 1, "finding count")
  h.eq(found[1].code, code, "finding code")
  return content.problem(found[1], "scene-001", "product-demo").message
end

return {
  ["an image extension, in any case, makes an image; any other src is video"] = function()
    for _, src in ipairs({ "a.png", "b.JPG", "c.jpeg", "d.webp", "e.Svg", "dir.x/f.png" }) do
      h.eq(media_kind.of(src), "image", src)
    end
    for _, src in ipairs({ "a.mp4", "b.webm", "c.avi", "d", "e.", ".png", "dir.png/clip" }) do
      h.eq(media_kind.of(src), "video", src)
    end
  end,

  ["a framed image block is an image item: src, fit, frame and alt, and no footage fields"] = function()
    local _, found, media = convert(scene(video(IMAGE .. ' alt="A still"')))
    h.eq(#found, 0, "finding count")
    local item = media[1]
    h.eq(item.kind, "image", "kind")
    h.eq(item.type, "video", "type")
    h.eq(item.src, "assets/still.png", "src")
    h.eq(item.placement, "framed", "placement")
    h.eq(item.fit, "contain", "default fit")
    h.eq(item.frame, "browser", "frame")
    h.eq(item.alt, "A still", "alt")
    for _, key in ipairs({
      "audio",
      "sourceStartFrames",
      "sourceEndFrames",
      "loop",
      "freeze",
      "playbackRate",
      "volume",
      "region",
    }) do
      h.eq(item[key], nil, key)
    end
  end,

  ["an image takes fit cover and any frame name"] = function()
    local _, _, media =
      convert(scene(video('src="assets/still.png" placement="framed" fit="cover" frame="phone"')))
    h.eq(media[1].fit, "cover", "fit")
    h.eq(media[1].frame, "phone", "frame")
  end,

  ["a video item written by the filter carries kind video"] = function()
    local _, _, media = convert(scene(video('src="assets/clip.mp4" audio="mute"')))
    h.eq(media[1].kind, "video", "kind")
  end,

  ["an image without placement or with background placement is E_VIDEO_BLOCK"] = function()
    local message =
      one_code(scene(video('src="assets/still.png" frame="browser"')), "E_VIDEO_BLOCK")
    h.contains(message, "not framed", "no placement")
    message =
      one_code(scene(video('src="assets/still.png" placement="background"')), "E_VIDEO_BLOCK")
    h.contains(message, "not framed", "background")
  end,

  ["an image without a frame is E_VIDEO_BLOCK naming the frame"] = function()
    local message =
      one_code(scene(video('src="assets/still.png" placement="framed"')), "E_VIDEO_BLOCK")
    h.contains(message, "frame", "message")
  end,

  ["each video-only attribute on an image is E_VIDEO_BLOCK naming it"] = function()
    local cases = {
      { 'sourceStart="1s"', "sourceStart" },
      { 'sourceEnd="2s"', "sourceEnd" },
      { 'audio="mute"', "audio" },
      { 'loop="true"', "loop" },
      { 'freeze="true"', "freeze" },
      { 'playbackRate="2"', "playbackRate" },
      { 'region="left"', "region" },
    }
    for _, case in ipairs(cases) do
      local message = one_code(scene(video(IMAGE .. " " .. case[1])), "E_VIDEO_BLOCK")
      h.contains(message, case[2] .. "=", case[2])
    end
  end,

  ["an image needs no audio attribute (E_VIDEO_AUDIO_REQUIRED is for video)"] = function()
    local _, found = convert(scene(video(IMAGE)))
    h.eq(#found, 0, "finding count")
  end,

  ["an image is one video block of its scene, like footage"] = function()
    local _, found = convert(scene(video(IMAGE) .. "\n" .. video(IMAGE)))
    h.eq(found[1].code, "E_VIDEO_BLOCK", "second block")
  end,

  ["a manifest with an image is IR 1.10, and every item carries its kind"] = function()
    local item = {
      id = "s1",
      component = "product-demo",
      durationFrames = 30,
      media = { { kind = "image", placement = "framed", src = "assets/still.png" } },
    }
    local clip = {
      id = "s2",
      component = "product-demo",
      durationFrames = 30,
      media = { { kind = "video", placement = "framed", src = "assets/clip.mp4", audio = "keep" } },
    }
    local built = manifest.build(SETTINGS, { item, clip }, "index.qmd")
    h.eq(built.schemaVersion, "1.10", "version")
    h.eq(built.scenes[1].media[1].kind, "image", "image kind")
    h.eq(built.scenes[2].media[1].kind, "video", "video kind")
  end,

  ["a manifest without an image keeps its version and writes no kind"] = function()
    local kept = {
      id = "s1",
      component = "title",
      durationFrames = 30,
      media = {
        { kind = "video", placement = "background", src = "assets/clip.mp4", audio = "keep" },
      },
    }
    local built = manifest.build(SETTINGS, { kept }, "index.qmd")
    h.eq(built.schemaVersion, "1.8", "version")
    h.eq(built.scenes[1].media[1].kind, nil, "no kind before 1.10")
  end,
}
