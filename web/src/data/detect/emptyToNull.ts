import type { Dataset, Issue, CellValue } from "../model";

function isEmptyLike(value: CellValue): boolean {
  if (value === null) return false;
  if (typeof value !== "string") return false;

  const v = value.trim().toLowerCase();
  return v === "" || v === "n/a" || v === "na" || v === "null";
}

export function detectEmptyToNull(dataset: Dataset): Issue[] {
  const issues: Issue[] = [];

  dataset.columns.forEach((_, columnIndex) => {
    const affectedRows: number[] = [];

    dataset.rows.forEach((row, rowIndex) => {
      if (isEmptyLike(row[columnIndex])) {
        affectedRows.push(rowIndex);
      }
    });

    if (affectedRows.length > 0) {
      issues.push({
        id: `empty_to_null_col_${columnIndex}`,
        type: "EMPTY_TO_NULL",
        columnIndex,
        rowIndices: affectedRows,
        description:
          "Empty-like values (empty, N/A, null) can be converted to null",
        preview: (value) =>
          isEmptyLike(value) ? null : value,
      });
    }
  });

  return issues;
}
