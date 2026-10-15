// CSV parser for chart data (task 035, ADR-0013). Pure: text in, table or
// error out. It executes nothing. Rules: comma separator; a field may be
// quoted with double quotes, and "" inside one is a quote; LF or CRLF line
// ends; a UTF-8 BOM is ignored. The first record is the header: names are
// non-empty and unique. Every other record has as many fields as the header.
// No blank lines, and at least one data row. Each error names the 1-based
// line where the problem starts.

export interface CsvTable {
  columns: string[];
  rows: string[][];
  /** The 1-based line each data row starts on, in row order. */
  rowLines: number[];
}

export interface CsvError {
  line: number;
  message: string;
  suggestion: string;
}

export type CsvResult =
  { ok: true; table: CsvTable } | { ok: false; error: CsvError };

interface CsvRecord {
  fields: string[];
  line: number;
}

const fail = (
  line: number,
  message: string,
  suggestion: string,
): CsvResult => ({ ok: false, error: { line, message, suggestion } });

const isLineEnd = (ch: string | undefined): boolean =>
  ch === "\n" || ch === "\r";

/** One quoted field; `i` is just after the opening quote. Returns the next index. */
function readQuoted(
  src: string,
  start: number,
  field: { text: string; line: number },
): number {
  let i = start;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '"') {
      if (src[i + 1] === '"') {
        field.text += '"';
        i += 2;
        continue;
      }
      return i + 1;
    }
    if (ch === "\r" && src[i + 1] === "\n") {
      i++;
      continue;
    }
    if (ch === "\n") field.line++;
    field.text += ch;
    i++;
  }
  return -1;
}

/** Parses the text of a CSV file (see the rules above). */
export function parseCsv(text: string): CsvResult {
  const src = text.startsWith("﻿") ? text.slice(1) : text;
  const records: CsvRecord[] = [];
  let i = 0;
  let line = 1;
  while (i < src.length) {
    const recordLine = line;
    const fields: string[] = [];
    for (;;) {
      if (src[i] === '"') {
        const field = { text: "", line };
        const next = readQuoted(src, i + 1, field);
        if (next < 0) {
          return fail(
            line,
            "A quoted field is not closed before the end of the file.",
            'Add the closing quote (") at the end of the field.',
          );
        }
        i = next;
        line = field.line;
        fields.push(field.text);
        if (i < src.length && src[i] !== "," && !isLineEnd(src[i])) {
          return fail(
            line,
            "Text follows a closing quote.",
            "Put a comma or a line end right after the closing quote.",
          );
        }
      } else {
        let field = "";
        while (i < src.length && src[i] !== "," && !isLineEnd(src[i])) {
          if (src[i] === '"') {
            return fail(
              line,
              "A quote appears inside an unquoted field.",
              "Wrap the whole field in quotes, or remove the quote.",
            );
          }
          field += src[i];
          i++;
        }
        fields.push(field);
      }
      if (src[i] === ",") {
        i++;
        continue;
      }
      break;
    }
    records.push({ fields, line: recordLine });
    if (i < src.length) {
      if (src[i] === "\r") i++;
      if (src[i] === "\n") i++;
      line++;
    }
  }
  return toTable(records);
}

/** Checks the records' shape and returns the table. */
function toTable(records: CsvRecord[]): CsvResult {
  const [header, ...body] = records;
  if (header === undefined) {
    return fail(
      1,
      "The file is empty.",
      "Add a header line with the column names, then the data rows.",
    );
  }
  const seen = new Set<string>();
  for (const [index, name] of header.fields.entries()) {
    if (name.trim() === "") {
      return fail(
        header.line,
        `Column ${index + 1} of the header has no name.`,
        "Give every column a name in the header line.",
      );
    }
    if (seen.has(name)) {
      return fail(
        header.line,
        `The column name "${name}" appears more than once in the header.`,
        "Give each column its own name.",
      );
    }
    seen.add(name);
  }
  for (const record of body) {
    if (record.fields.length === 1 && record.fields[0] === "") {
      return fail(
        record.line,
        `Line ${record.line} is empty.`,
        "Remove the empty line; a CSV data file has no blank lines.",
      );
    }
    if (record.fields.length !== header.fields.length) {
      return fail(
        record.line,
        `The row has ${record.fields.length} fields; the header has ${header.fields.length}.`,
        "Give every row the same number of fields as the header, and quote a field that contains a comma.",
      );
    }
  }
  if (body.length === 0) {
    return fail(
      1,
      "The file has a header but no data rows.",
      "Add at least one data row under the header.",
    );
  }
  return {
    ok: true,
    table: {
      columns: header.fields,
      rows: body.map((record) => record.fields),
      rowLines: body.map((record) => record.line),
    },
  };
}
