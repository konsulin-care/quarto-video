-- The resolved timeline (PRD §8.3; ADR-0005): the start frame of each scene
-- and the total length. A scene starts where the previous one starts plus its
-- length, minus the overlap of its own incoming transition; the total is the
-- end of the last scene. The TS twin is packages/ir/src/timeline.ts; the
-- shared vectors in packages/ir/test-vectors/timeline.json drive both.
local M = {}

--- `scenes` are records with durationFrames and an optional transition
--- { durationFrames }. Returns the start frames (a list, same order) and the
--- total frame count. The first scene's transition is never applied.
function M.resolve(scenes)
  local starts = {}
  local start = 0
  for i, scene in ipairs(scenes) do
    if i > 1 then
      local overlap = scene.transition and scene.transition.durationFrames or 0
      start = start + scenes[i - 1].durationFrames - overlap
    end
    starts[i] = start
  end
  local last = scenes[#scenes]
  local total = last and (start + last.durationFrames) or 0
  return starts, total
end

return M
