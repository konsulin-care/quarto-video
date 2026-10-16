-- Scene animations (PRD §5.6; ADR-0011). An animation belongs to the scene:
-- `animation="<preset id>"`. This module checks the DSL shape only, like the
-- transition name in lib/transitions.lua. The validator checks the id against
-- the registry and the component's compatible animations (stage 2).
local diagnostics = require("lib.diagnostics")

local M = {}

local NAME_PATTERN = "^[a-z][a-z0-9-]*$"
local MAX_NAME_LENGTH = 64

-- True for an animation name: lowercase letters, digits and hyphens.
function M.valid_name(text)
  return #text <= MAX_NAME_LENGTH and text:match(NAME_PATTERN) ~= nil
end

--- Returns { name = "<preset id>" } for the scene's animation attribute, or
--- nil when it has none. Raises E_ANIMATION_UNKNOWN for a value that is not a
--- name at all, so a typo in the shape never reaches the manifest.
function M.resolve(div, id)
  local name = div.attributes.animation
  if name == nil then
    return nil
  end
  if not M.valid_name(name) then
    diagnostics.fail(
      "E_ANIMATION_UNKNOWN",
      string.format('Scene "%s" has animation "%s", which is not an animation name.', id, name),
      {
        property = "animation",
        suggestion = 'Use a name such as animation="fade-in".',
      }
    )
  end
  return { name = name }
end

return M
