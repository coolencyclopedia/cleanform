import * as XLSX from "xlsx";
import type { Dataset } from "@cleanform/shared";

export function exportExcel(dataset: Dataset) {
  const worksheet = XLSX.utils.aoa_to_sheet([
    dataset.columns,
    ...dataset.rows,
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Cleaned");

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  return new Blob([buffer], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
