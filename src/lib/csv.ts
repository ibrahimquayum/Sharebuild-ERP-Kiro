function csvCell(value: unknown) {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function csvRows(rows: unknown[][]) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function csvSection(title: string, rows: unknown[][]) {
  return csvRows([[title], [], ...rows, []]);
}

export function csvResponse(filename: string, content: string) {
  return new Response(`\uFEFF${content}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
