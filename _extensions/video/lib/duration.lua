-- Converts a scene duration attribute to integer frames (PRD §5.3).
-- Task 003 accepts only whole seconds written as "<n>s"; the full parser
-- and the rounding rules (ADR-0003) arrive with task 009.
local diagnostics = require("lib.diagnostics")

local M = {}

--- Returns the number of frames for `text` at `fps`, or raises a diagnostic
--- (E_DURATION_SYNTAX for a bad form, E_DURATION_RANGE for too short).
function M.to_frames(text, fps)
  local digits = text:match("^(%d+)s$")
  if not digits then
    diagnostics.fail(
      "E_DURATION_SYNTAX",
      string.format('duration "%s" must be whole seconds like "4s"', text),
      { property = "duration", suggestion = 'Write whole seconds, for example duration="4s".' }
    )
  end
  local seconds = tonumber(digits)
  if seconds < 1 then
    diagnostics.fail(
      "E_DURATION_RANGE",
      string.format('duration "%s" must be at least 1s', text),
      { property = "duration", suggestion = 'Use duration="1s" or longer.' }
    )
  end
  return seconds * fps
end

return M
