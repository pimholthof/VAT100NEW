/**
 * CSV generation utility for VAT100 exports.
 * Handles proper escaping, BOM for Excel compatibility, and Dutch formatting.
 */

function escapeCSVField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function generateCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCSVField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSVField).join(","));
  return [headerLine, ...dataLines].join("\n");
}

export function csvResponse(csv: string, filename: string): Response {
  // UTF-8 BOM ensures Excel opens the file with correct encoding
  const BOM = "\uFEFF";
  return new Response(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
