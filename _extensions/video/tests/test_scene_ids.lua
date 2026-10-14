-- Scene ids and source lines in the collected scenes and the manifest
-- (PRD §5.3, §8.2; task 011). Each scene block below is 4 lines (opener,
-- text, closer, blank); the body starts on line 8 of the standard front matter.
local h = require("tests.helpers")
local scenes = require("lib.scenes")
local source_scan = require("lib.scan")
local manifest = require("lib.manifest")
local json = require("lib.json")

local SETTINGS = { width = 1920, height = 1080, fps = 30, background = "#10131C" }

local function scene(id, component, duration, text)
  local attr = id and ("#" .. id .. " ") or ""
  return string.format(
    '::: {%s.scene component="%s" duration="%s"}\n%s\n:::\n\n',
    attr,
    component,
    duration,
    text
  )
end

-- Collects `body` with its source text, as the filter does.
local function run(body, default_frames, front)
  return scenes.collect(
    h.doc(body, front),
    30,
    default_frames,
    source_scan.scan(h.text(body, front))
  )
end

return {
  ["author ids are kept and generated ids keep their position"] = function()
    local body = scene("intro", "title", "4s", "A")
      .. scene(nil, "statement", "2s", "B")
      .. scene("closing", "end-card", "3s", "C")
    local list = run(body)
    h.eq(list[1].id, "intro", "first id")
    h.eq(list[2].id, "scene-002", "generated id")
    h.eq(list[3].id, "closing", "third id")
  end,

  ["an invalid author id is E_SCENE_ID_INVALID with its line and a suggestion"] = function()
    local body = scene("Intro", "title", "4s", "A")
    local diagnostic = h.code_is(function()
      run(body)
    end, "E_SCENE_ID_INVALID", "invalid id")
    h.eq(diagnostic.line, 8, "line")
    h.eq(
      diagnostic.suggestion,
      "Use #intro; ids start with a letter and use lowercase letters, digits and hyphens.",
      "suggestion"
    )
  end,

  ["a duplicate author id is reported on the later scene with both lines"] = function()
    local body = scene("intro", "title", "4s", "A")
      .. scene(nil, "statement", "2s", "B")
      .. scene("intro", "title", "4s", "C")
    local diagnostic = h.code_is(function()
      run(body)
    end, "E_SCENE_DUPLICATE_ID", "duplicate")
    h.eq(diagnostic.message, 'Scene id "intro" is used on line 8 and line 16.', "message")
    h.eq(diagnostic.line, 16, "line of the later scene")
    h.eq(diagnostic.sceneId, "intro", "sceneId")
  end,

  ["a generated id can clash with an author id"] = function()
    local body = scene("scene-002", "title", "4s", "A") .. scene(nil, "title", "4s", "B")
    local diagnostic = h.code_is(function()
      run(body)
    end, "E_SCENE_DUPLICATE_ID", "clash")
    h.eq(diagnostic.message, 'Scene id "scene-002" is used on line 8 and line 12.', "message")
  end,

  ["lines are right after a fenced code block that contains :::"] = function()
    local body = '::: {.scene component="statement" duration="2s"}\nCode:\n\n```\n'
      .. '::: {.scene component="title"}\n:::\n```\n:::\n\n'
      .. scene("after", "title", "4s", "B")
    local list = run(body)
    h.eq(#list, 2, "scene count")
    h.eq(list[1].line, 8, "first scene line")
    h.eq(list[2].line, 17, "second scene line")
    h.eq(list[2].id, "after", "second id")
  end,

  ["a long front matter does not shift the lines"] = function()
    local front = "---\n" .. string.rep("# padding\n", 20) .. "---\n"
    local list = run(scene(nil, "title", "4s", "A"), nil, front)
    h.eq(list[1].line, 23, "line after 20 padding lines and the closing fence")
  end,

  ["the manifest carries source.line for each scene"] = function()
    local list = run(scene("intro", "title", "4s", "A"))
    local ir = manifest.build(SETTINGS, list, "index.qmd")
    h.contains(json.encode(ir), '"line": 8', "manifest line")
  end,

  ["a nested scene is reported with its line"] = function()
    local body = "::: {.note}\n" .. scene(nil, "title", "4s", "X") .. ":::\n"
    local diagnostic = h.code_is(function()
      run(body)
    end, "E_SCENE_NESTED", "nested")
    h.eq(diagnostic.line, 9, "line of the nested scene")
    h.eq(diagnostic.sceneId, "scene-001", "generated id")
  end,

  ["a block Pandoc does not read as a scene is an error with its line"] = function()
    local body = '::: {#1 bad .scene component="title" duration="4s"}\nX\n:::\n'
    local diagnostic = h.code_is(function()
      run(body)
    end, "E_SCENE_ID_INVALID", "unread block")
    h.eq(diagnostic.line, 8, "line")
  end,

  ["without the source text scenes have ids but no lines"] = function()
    local list = scenes.collect(h.doc(scene("intro", "title", "4s", "A")), 30)
    h.eq(list[1].id, "intro", "id")
    h.eq(list[1].line, nil, "line")
  end,

  ["a quoted scene is nested and reported with its own line"] = function()
    local body = '> ::: {.scene component="title" duration="1s"}\n> Quoted\n> :::\n'
    local diagnostic = h.code_is(function()
      run(body)
    end, "E_SCENE_NESTED", "quoted")
    h.eq(diagnostic.line, 8, "line of the quoted scene")
  end,

  ["a scene in a list item without a blank line is an error at its line"] = function()
    local body = '> ::: {.scene component="title" duration="1s"}\n> Quoted\n> :::\n\n'
      .. '- item\n  ::: {.scene component="title" duration="1s"}\n  In list\n  :::\n'
    local list = h.diagnostics_of(function()
      run(body)
    end)
    h.eq(list[1].code, "E_SCENE_NESTED", "quoted scene")
    h.eq(list[1].line, 8, "quoted line")
    h.eq(list[2].code, "E_SCENE_SHAPE", "list scene")
    h.eq(list[2].line, 13, "list line")
  end,

  ["diagnostics come in document order"] = function()
    local body = '::: {.scene component="title"}\nA\n:::\n\n'
      .. '::: {#1 bad .scene component="title" duration="4s"}\nB\n:::\n'
    local list = h.diagnostics_of(function()
      run(body)
    end)
    h.eq(list[1].code, "E_SCENE_NO_DURATION", "first code")
    h.eq(list[1].line, 8, "first line")
    h.eq(list[2].code, "E_SCENE_ID_INVALID", "second code")
    h.eq(list[2].line, 12, "second line")
  end,
}
