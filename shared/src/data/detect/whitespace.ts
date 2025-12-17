import type { Dataset, Issue } from "../model";

export function detectWhitespace(dataset: Dataset): Issue[] {
  const issues: Issue[] = [];

  dataset.columns.forEach((_, columnIndex) => {
    const affectedRows: number[] = [];

    dataset.rows.forEach((row, rowIndex) => {
      const value = row[columnIndex];
      if (typeof value === "string" && value.trim() !== value) {
        affectedRows.push(rowIndex);
      }
    });

    if (affectedRows.length > 0) {
      issues.push({
        id: `trim_whitespace_col_${columnIndex}`,
        type: "TRIM_WHITESPACE",
        columnIndex,
        rowIndices: affectedRows,
        description: "Values contain leading or trailing whitespace",
        preview: (value) =>
          typeof value === "string" ? value.trim() : value,
      });
    }
  });

  return issues;
}
