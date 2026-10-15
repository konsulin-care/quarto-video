-- Rejects front matter keys the filter does not know (AGENT.md invariant:
-- unknown settings are errors, never ignored). Checked: every key under
-- `video` and under `defaults`. Top-level keys are shared with Quarto's own
-- front matter (title, format, filters, ...) and are not checked here.
-- Each unknown key is E_CONFIG_UNKNOWN_KEY with a "did you mean" suggestion
-- when a known key is close (PRD §5.2, §9.2).
local diagnostics = require("lib.diagnostics")
local shapes = require("lib.meta")

local M = {}

-- Allowed keys per block. A table value is a nested block; `true` is a leaf.
local ALLOWED = {
  video = {
    width = true,
    height = true,
    fps = true,
    output = true,
    background = true,
    reducedMotion = true,
  },
  defaults = { scene = { duration = true, transition = true } },
}

-- Known in PRD §5.2 but not supported yet (PRD §5.2: kept out of the IR).
local UNSUPPORTED = { codec = true, container = true }

-- Maximum edit distance for a "did you mean" suggestion.
local MAX_DISTANCE = 2

--- Edit distance between two strings (insertions, deletions, substitutions).
local function distance(a, b)
  local previous = {}
  for j = 0, #b do
    previous[j] = j
  end
  for i = 1, #a do
    local current = { [0] = i }
    for j = 1, #b do
      local cost = a:sub(i, i) == b:sub(j, j) and 0 or 1
      current[j] = math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
    end
    previous = current
  end
  return previous[#b]
end

--- The known key closest to `key` in `allowed`, or nil when none is close.
local function closest(key, allowed)
  local best, best_distance = nil, MAX_DISTANCE + 1
  local names = {}
  for name in pairs(allowed) do
    names[#names + 1] = name
  end
  table.sort(names)
  for _, name in ipairs(names) do
    local d = distance(key, name)
    if d < best_distance then
      best, best_distance = name, d
    end
  end
  return best
end

local function sorted_keys(map)
  local keys = {}
  for key in pairs(map) do
    keys[#keys + 1] = key
  end
  table.sort(keys)
  return keys
end

local function unknown_key(path, key, allowed)
  local property = path .. key
  local suggestion
  if UNSUPPORTED[key] then
    suggestion = "Codec and container settings are not supported yet."
  else
    local near = closest(key, allowed)
    if near then
      suggestion = string.format('Did you mean "%s"?', near)
    else
      suggestion = "Allowed keys here: " .. table.concat(sorted_keys(allowed), ", ") .. "."
    end
  end
  return diagnostics.new(
    "E_CONFIG_UNKNOWN_KEY",
    string.format('Unknown front matter key "%s".', property),
    { property = property, suggestion = suggestion }
  )
end

-- Appends the unknown keys of `map` (a front matter map) checked against `allowed`,
-- then descends into nested blocks. Non-map values are left to the readers
-- in config.lua, which report them.
local function check_block(map, allowed, path, found)
  for _, key in ipairs(sorted_keys(map)) do
    local value = map[key]
    if allowed[key] == nil then
      found[#found + 1] = unknown_key(path, key, allowed)
    elseif type(allowed[key]) == "table" and shapes.is_map(value) then
      check_block(value, allowed[key], path .. key .. ".", found)
    end
  end
end

--- Raises E_CONFIG_UNKNOWN_KEY for every unknown key under `video` and
--- `defaults` (all of them, in document order of the sorted keys).
function M.check(front)
  local found = {}
  for _, name in ipairs({ "video", "defaults" }) do
    local block = front[name]
    if shapes.is_map(block) then
      check_block(block, ALLOWED[name], name .. ".", found)
    end
  end
  diagnostics.raise(found)
end

return M
