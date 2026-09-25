/**
 * One cell of a CSV export, quoted and guarded against formula injection.
 *
 * A cell starting with =, +, - or @ (or a tab or carriage return, which
 * Excel strips before looking) is a formula to Excel and Sheets the
 * moment the file is opened -- and several of the values here (an invoice
 * note, a client's name) are text a person typed, not text we chose. The
 * leading apostrophe forces it back to a literal without changing what is
 * visible in the cell.
 */
export function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

/** Rows (header first) to a CSV response body, with the BOM Excel needs to read UTF-8 correctly. */
export function csvBody(rows: (string | number)[][]) {
  return `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export const CSV_HEADERS = (filename: string) => ({
  "Content-Type": "text/csv; charset=utf-8",
  "Content-Disposition": `attachment; filename="${filename}"`,
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
});
