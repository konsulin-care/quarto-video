-- The manifest encoder: deterministic, arrays stay arrays, strings escaped.
local h = require("tests.helpers")
local json = require("lib.json")

return {
  ["an empty array encodes as []"] = function()
    h.contains(json.encode({ items = json.array({}) }), '"items": []', "output")
  end,

  ["booleans encode as true and false"] = function()
    h.contains(json.encode({ on = true, off = false }), '"off": false', "false")
    h.contains(json.encode({ on = true }), '"on": true', "true")
  end,

  ["object keys are written in sorted order"] = function()
    local text = json.encode({ b = 2, a = 1 })
    h.eq(text, '{\n  "a": 1,\n  "b": 2\n}\n', "output")
  end,

  ["quotes, backslashes and newlines are escaped"] = function()
    local text = json.encode({ s = 'say "hi"\\\n' })
    h.contains(text, '"say \\"hi\\"\\\\\\n"', "output")
  end,

  ["a decimal numeral is written exactly as a JSON number"] = function()
    h.contains(json.encode({ r = json.decimal("0.5") }), '"r": 0.5', "decimal")
    h.contains(json.encode({ r = json.decimal("2") }), '"r": 2', "integer text")
  end,

  ["json.decimal refuses text that is not a plain numeral"] = function()
    local err = h.error_of(function()
      json.decimal("1e3")
    end)
    h.contains(err, "not a plain decimal numeral", "error")
  end,

  ["non-integer numbers are rejected"] = function()
    local err = h.error_of(function()
      json.encode({ n = 1.5 })
    end)
    h.contains(err, "only integers are supported", "error")
  end,
}
