import type { PrimitiveValue } from './generation';

type ExportRecord = Record<string, PrimitiveValue>;

// JSON export: an array of records with keys in column order. null stays null.
export function toJson(records: ExportRecord[], columns: string[]): string {
  const orderedRecords = records.map((record) =>
    Object.fromEntries(columns.map((column) => [column, record[column]])),
  );

  return `${JSON.stringify(orderedRecords, null, 2)}\n`;
}

// CSV export convention (see PLAN.md): null is an unquoted empty field, strings are always
// quoted with quotes doubled (so an empty string is ""), numbers and booleans are unquoted.
// Rows end with CRLF per RFC 4180; line breaks inside strings are kept as they are.
function formatCsvValue(value: PrimitiveValue | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return String(value);
}

export function toCsv(records: ExportRecord[], columns: string[]): string {
  const rows = [
    columns.join(','),
    ...records.map((record) => columns.map((column) => formatCsvValue(record[column])).join(',')),
  ];

  return rows.map((row) => `${row}\r\n`).join('');
}
