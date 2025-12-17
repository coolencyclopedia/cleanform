import type { Dataset, CellValue } from "../model";

function escapeCell(value: CellValue): string {
  if (value === null) return "";

  const str = String(value);

  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function exportCsv(dataset: Dataset): string {
  const header = dataset.columns.join(",");

  const rows = dataset.rows.map((row) =>
    row.map(escapeCell).join(",")
  );

  return [header, ...rows].join("\n");
}
