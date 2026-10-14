-- Scene transitions (PRD §5.6, §8.3; ADR-0005). A transition belongs to the
-- incoming scene: `transition="<name>"` and `transitionDuration="<n>s"` (the
-- ADR-0003 duration form) on that scene. `cut` takes no time (0 frames).
-- `defaults.scene.transition` fills scenes after the first one that have no
-- transition of their own. Names are checked against the registry by the
-- validator (stage 4); this module checks the DSL rules only.
local diagnostics = require("lib.diagnostics")
local duration = require("lib.duration")

local M = {}

M.CUT = "cut"

local NAME_PATTERN = "^[a-z][a-z0-9-]*$"
local MAX_NAME_LENGTH = 64

-- True for a transition name: lowercase letters, digits and hyphens.
function M.valid_name(text)
  return #text <= MAX_NAME_LENGTH and text:match(NAME_PATTERN) ~= nil
end

-- The transition the scene asks for: its own, else the default for every
-- scene after the first, else none. The first scene never takes the default.
local function requested_name(div, id, position, default_name)
  local explicit = div.attributes.transition
  if explicit ~= nil then
    if not M.valid_name(explicit) then
      diagnostics.fail(
        "E_TRANSITION_UNKNOWN",
        string.format(
          'Scene "%s" has transition "%s", which is not a transition name.',
          id,
          explicit
        ),
        {
          property = "transition",
          suggestion = 'Use a name such as transition="fade" or transition="cut".',
        }
      )
    end
    return explicit
  end
  if position > 1 then
    return default_name
  end
  return nil
end

--- Returns the incoming transition { name, durationFrames } of one scene, or
--- nil when it has none. `position` is the scene's 1-based place among the
--- scenes; `default_name` is defaults.scene.transition (or nil). Raises
--- diagnostics for a transition without a duration, a duration on a cut, a
--- transition on the first scene, and a bad duration (ADR-0003).
function M.resolve(div, id, fps, position, default_name)
  local name = requested_name(div, id, position, default_name)
  local duration_text = div.attributes.transitionDuration
  if name == nil then
    if duration_text ~= nil then
      diagnostics.fail(
        "E_TRANSITION_DURATION",
        string.format(
          'Scene "%s" has transitionDuration "%s" but no transition.',
          id,
          duration_text
        ),
        {
          property = "transitionDuration",
          suggestion = 'Add transition="fade", or remove transitionDuration.',
        }
      )
    end
    return nil
  end
  if position == 1 and name ~= M.CUT then
    diagnostics.fail(
      "E_TRANSITION_FIRST_SCENE",
      string.format(
        'The first scene "%s" cannot have transition "%s": no earlier scene to overlap.',
        id,
        name
      ),
      {
        property = "transition",
        suggestion = 'Remove the transition from the first scene, or use transition="cut".',
      }
    )
  end
  if name == M.CUT then
    if duration_text ~= nil then
      diagnostics.fail(
        "E_TRANSITION_DURATION",
        string.format(
          'Scene "%s" uses transition "cut" with transitionDuration "%s".',
          id,
          duration_text
        ),
        {
          property = "transitionDuration",
          suggestion = "Remove transitionDuration: a cut takes no time.",
        }
      )
    end
    return { name = M.CUT, durationFrames = 0 }
  end
  if duration_text == nil then
    diagnostics.fail(
      "E_TRANSITION_DURATION",
      string.format('Scene "%s" uses transition "%s" without a transitionDuration.', id, name),
      {
        property = "transitionDuration",
        suggestion = 'Add transitionDuration="1s", for example; or use transition="cut".',
      }
    )
  end
  return {
    name = name,
    durationFrames = duration.to_frames(duration_text, id, fps, "transitionDuration"),
  }
end

return M
