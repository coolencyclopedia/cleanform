import * as XLSX from "xlsx";
import type { Dataset } from "@cleanform/shared";

export async function parseExcel(file: File): Promise<Dataset> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  // Take first sheet only (standard behavior)
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to 2D array
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
    header: 1,
    raw: false,
    defval: null,
  });

  if (rows.length === 0) {
    throw new Error("Empty Excel sheet");
  }

  const [headerRow, ...dataRows] = rows;

  return {
    columns: headerRow.map(String),
    rows: dataRows.map((row) =>
      headerRow.map((_, i) => row[i] ?? null)
    ),
  };
}
