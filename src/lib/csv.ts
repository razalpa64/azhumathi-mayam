/**
 * Tiny CSV writer for the admin console's exports.
 *
 * Excel on Windows opens a plain UTF-8 CSV as mojibake the moment a name has
 * a Malayalam character in it, so the BOM goes on the front of every file —
 * that is what makes Excel pick UTF-8 automatically.
 */

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

function escapeCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  // Quotes, commas and newlines all need the cell wrapped, with quotes doubled.
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCell(column.header)).join(',');
  const body = rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(','));
  return `\uFEFF${[header, ...body].join('\r\n')}\r\n`;
}

export function csvFileName(prefix: string, stamp = new Date()): string {
  const iso = stamp.toISOString().slice(0, 10);
  return `${prefix}-${iso}.csv`;
}

export function csvResponse(fileName: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
