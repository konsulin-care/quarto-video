-- Converts a scene duration attribute to integer frames (PRD §5.3).
-- Task 003 accepts only whole seconds written as "<n>s"; the full parser
-- and the rounding rules (ADR-0003) arrive with task 009.
local M = {}

--- Returns the number of frames for `text` at `fps`, or raises an error.
function M.to_frames(text, fps)
  local digits = text:match("^(%d+)s$")
  if not digits then
    error(string.format('duration "%s" must be whole seconds like "4s"', text), 0)
  end
  local seconds = tonumber(digits)
  if seconds < 1 then
    error(string.format('duration "%s" must be at least 1s', text), 0)
  end
  return seconds * fps
end

return M
