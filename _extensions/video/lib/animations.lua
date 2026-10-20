-- Scene animations (PRD §5.6; ADR-0011, ADR-0020). `animation="<preset id>"` is
-- the entrance, `exit="<preset id>"` the exit, and `animationDuration="<n>s"` (the
-- ADR-0003 duration form) the length, in frames, of the window they run in.
-- This module checks the DSL shape only, like the transition name in
-- lib/transitions.lua. The validator checks the ids against the registry (role
-- and compatibility) and the window against the scene's length (stage 2).
local diagnostics = require("lib.diagnostics")
local duration = require("lib.duration")

local M = {}

local NAME_PATTERN = "^[a-z][a-z0-9-]*$"
local MAX_NAME_LENGTH = 64

-- True for an animation name: lowercase letters, digits and hyphens.
function M.valid_name(text)
  return #text <= MAX_NAME_LENGTH and text:match(NAME_PATTERN) ~= nil
end

-- The preset named by attribute `property`, as { name = id }, or nil when the
-- scene has no such attribute. A value that is not a name is E_ANIMATION_UNKNOWN,
-- so a typo in the shape never reaches the manifest. `example` is the name the
-- suggestion shows.
local function named(div, id, property, example)
  local name = div.attributes[property]
  if name == nil then
    return nil
  end
  if not M.valid_name(name) then
    diagnostics.fail(
      "E_ANIMATION_UNKNOWN",
      string.format('Scene "%s" has %s "%s", which is not an animation name.', id, property, name),
      {
        property = property,
        suggestion = string.format('Use a name such as %s="%s".', property, example),
      }
    )
  end
  return { name = name }
end

--- Returns { name = "<preset id>" } for the scene's animation attribute (the
--- entrance), or nil when it has none. Raises E_ANIMATION_UNKNOWN for a value
--- that is not a name at all.
function M.resolve(div, id)
  return named(div, id, "animation", "fade-in")
end

--- Returns { name = "<preset id>" } for the scene's exit attribute, or nil.
--- Raises E_ANIMATION_UNKNOWN for a value that is not a name (ADR-0020).
function M.resolve_exit(div, id)
  return named(div, id, "exit", "fade-out")
end

--- Returns the window length of animationDuration in frames, or nil when the
--- scene has none. The duration rules are those of lib/duration.lua (its own codes).
--- An animationDuration with neither an animation nor an exit is
--- E_ANIMATION_DURATION (ADR-0020). The bounds against the scene's length are
--- the validator's (stage 2).
function M.resolve_window(div, id, fps)
  local text = div.attributes.animationDuration
  if text == nil then
    return nil
  end
  if div.attributes.animation == nil and div.attributes.exit == nil then
    diagnostics.fail(
      "E_ANIMATION_DURATION",
      string.format('Scene "%s" has animationDuration "%s" but no animation or exit.', id, text),
      {
        property = "animationDuration",
        suggestion = 'Add animation="fade-in" or exit="fade-out", or remove animationDuration.',
      }
    )
  end
  return duration.to_frames(text, id, fps, "animationDuration")
end

return M
