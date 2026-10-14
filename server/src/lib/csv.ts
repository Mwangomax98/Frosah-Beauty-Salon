/** RFC 4180 CSV with a UTF-8 BOM so Excel opens it correctly. */

export type CsvValue = string | number | boolean | null | undefined;

export function escapeCsv(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "string" ? value : String(value);
  // Neutralise spreadsheet formula injection (=, +, -, @ at the start of a cell).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) lines.push(row.map(escapeCsv).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
