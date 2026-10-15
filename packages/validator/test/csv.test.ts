// The CSV parser for chart data (task 035, ADR-0014): the table it reads, and
// the 1-based line of every error.
import { describe, expect, it } from "vitest";
import { parseCsv } from "../src/csv/parse.js";

function errorOf(text: string) {
  const result = parseCsv(text);
  if (result.ok)
    throw new Error(`expected an error for ${JSON.stringify(text)}`);
  return result.error;
}

describe("parseCsv: valid files", () => {
  it("reads the header and the rows, with the line of each row", () => {
    const result = parseCsv("region,sales\nNorth,120\nSouth,95.5\n");
    expect(result).toEqual({
      ok: true,
      table: {
        columns: ["region", "sales"],
        rows: [
          ["North", "120"],
          ["South", "95.5"],
        ],
        rowLines: [2, 3],
      },
    });
  });

  it("accepts CRLF line ends and a leading byte-order mark", () => {
    const result = parseCsv("﻿a,b\r\n1,2\r\n3,4");
    expect(result.ok && result.table.rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("reads quoted fields with commas and doubled quotes", () => {
    const result = parseCsv('name,value\n"Smith, J",1\n"say ""hi""",2\n');
    expect(result.ok && result.table.rows).toEqual([
      ["Smith, J", "1"],
      ['say "hi"', "2"],
    ]);
  });

  it("counts lines after a quoted field that spans lines", () => {
    const result = parseCsv('a,b\n"one\ntwo",1\n3,4\n');
    expect(result.ok && result.table.rowLines).toEqual([2, 4]);
  });
});

describe("parseCsv: malformed files name the CSV line", () => {
  it("an empty file is an error on line 1", () => {
    expect(errorOf("").line).toBe(1);
  });

  it("a header with no data rows is an error on line 1", () => {
    const error = errorOf("a,b\n");
    expect(error.line).toBe(1);
    expect(error.message).toMatch(/no data rows/);
  });

  it("a row with too many fields is an error on its line", () => {
    const error = errorOf("a,b\n1,2\n3,4,5\n");
    expect(error.line).toBe(3);
    expect(error.message).toBe("The row has 3 fields; the header has 2.");
  });

  it("a row with too few fields is an error on its line", () => {
    expect(errorOf("a,b\n1\n").line).toBe(2);
  });

  it("a blank line between rows is an error on its line", () => {
    const error = errorOf("a,b\n1,2\n\n3,4\n");
    expect(error.line).toBe(3);
    expect(error.message).toBe("Line 3 is empty.");
  });

  it("an unclosed quote is an error on the line where the field opens", () => {
    const error = errorOf('a,b\n"open,1\n2,3\n');
    expect(error.line).toBe(2);
    expect(error.message).toMatch(/not closed/);
  });

  it("text after a closing quote is an error on its line", () => {
    expect(errorOf('a,b\n"x"y,1\n').line).toBe(2);
  });

  it("a quote inside an unquoted field is an error on its line", () => {
    expect(errorOf('a,b\n1,ab"c\n').line).toBe(2);
  });

  it("an empty header name is an error on the header line", () => {
    const error = errorOf("a,,c\n1,2,3\n");
    expect(error.line).toBe(1);
    expect(error.message).toMatch(/Column 2 of the header has no name/);
  });

  it("a repeated header name is an error on the header line", () => {
    const error = errorOf("a,a\n1,2\n");
    expect(error.line).toBe(1);
    expect(error.message).toMatch(/"a" appears more than once/);
  });

  it("every error has a suggestion", () => {
    expect(errorOf("a,b\n1\n").suggestion).not.toBe("");
  });
});
