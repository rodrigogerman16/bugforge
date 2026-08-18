// Shared CSV/JSON serialization for every "Export" affordance in the app.
// Every export reuses the app's real data functions — there is no separate
// "export data" path that could drift from what the UI actually shows.

export type ExportColumn<T> = {
  label: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

function csvCell(raw: string | number | boolean | null | undefined): string {
  const value = raw === null || raw === undefined ? "" : String(raw);
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => csvCell(c.value(row))).join(","));
  return [header, ...lines].join("\r\n");
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export function jsonResponse(filename: string, data: unknown): Response {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// A report isn't one flat table — it's a summary plus a few small tables.
// A sectioned CSV keeps all of that in one file (blank line between
// sections) instead of flattening a report into something misleading.
export type ExportSection = { title: string; columns: string[]; rows: (string | number)[][] };

export function toSectionedCsv(sections: ExportSection[]): string {
  return sections
    .map((s) =>
      [csvCell(s.title), s.columns.map(csvCell).join(","), ...s.rows.map((r) => r.map(csvCell).join(","))].join("\r\n")
    )
    .join("\r\n\r\n");
}

export function badExportRequest(message: string): Response {
  return new Response(message, { status: 400 });
}
