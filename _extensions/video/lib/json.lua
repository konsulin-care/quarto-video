-- Minimal deterministic JSON encoder for the manifest (no dependencies).
-- Objects are plain tables with string keys, written in sorted key order.
-- Arrays must be built with json.array(); an empty array encodes as [].
-- Only strings, integers, booleans, arrays and objects are supported, plus
-- decimals written with json.decimal (a numeral text kept exactly as given).
local M = {}

local ARRAY = {}
local DECIMAL = {}

--- Marks a decimal numeral text (`1`, `0.5`) to be written as a JSON number
--- exactly as it is. Only plain digits and one fraction are accepted.
function M.decimal(text)
  assert(
    type(text) == "string" and (text:match("^%d+$") or text:match("^%d+%.%d+$")),
    "json.decimal: not a plain decimal numeral: " .. tostring(text)
  )
  return setmetatable({ text = text }, DECIMAL)
end

--- Marks a Lua list as a JSON array (so an empty list still encodes as []).
function M.array(list)
  return setmetatable(list or {}, ARRAY)
end

local ESCAPES = {
  ['"'] = '\\"',
  ["\\"] = "\\\\",
  ["\n"] = "\\n",
  ["\r"] = "\\r",
  ["\t"] = "\\t",
}

local function encode_string(text)
  local escaped = text:gsub('["\\\n\r\t]', ESCAPES)
  escaped = escaped:gsub("[%z\1-\31]", function(char)
    return string.format("\\u%04x", string.byte(char))
  end)
  return '"' .. escaped .. '"'
end

local encode

local function encode_array(list, depth)
  if #list == 0 then
    return "[]"
  end
  local pad = string.rep("  ", depth + 1)
  local parts = {}
  for i, item in ipairs(list) do
    parts[i] = pad .. encode(item, depth + 1)
  end
  return "[\n" .. table.concat(parts, ",\n") .. "\n" .. string.rep("  ", depth) .. "]"
end

local function encode_object(object, depth)
  local keys = {}
  for key in pairs(object) do
    if type(key) ~= "string" then
      error("json: object keys must be strings", 0)
    end
    keys[#keys + 1] = key
  end
  if #keys == 0 then
    return "{}"
  end
  table.sort(keys)
  local pad = string.rep("  ", depth + 1)
  local parts = {}
  for i, key in ipairs(keys) do
    parts[i] = pad .. encode_string(key) .. ": " .. encode(object[key], depth + 1)
  end
  return "{\n" .. table.concat(parts, ",\n") .. "\n" .. string.rep("  ", depth) .. "}"
end

encode = function(value, depth)
  local kind = type(value)
  if kind == "string" then
    return encode_string(value)
  elseif kind == "number" then
    if value ~= math.floor(value) then
      error("json: only integers are supported, got " .. tostring(value), 0)
    end
    return string.format("%d", value)
  elseif kind == "boolean" then
    return value and "true" or "false"
  elseif kind == "table" then
    if getmetatable(value) == DECIMAL then
      return value.text
    end
    if getmetatable(value) == ARRAY then
      return encode_array(value, depth)
    end
    return encode_object(value, depth)
  end
  error("json: unsupported value of type " .. kind, 0)
end

--- Encodes a value as pretty-printed JSON with a trailing newline.
function M.encode(value)
  return encode(value, 0) .. "\n"
end

return M
