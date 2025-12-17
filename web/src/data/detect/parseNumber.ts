import type { Dataset, Issue, CellValue } from "../model";

function isNumericString(value: string): boolean {
  // strict numeric match (no commas, no exponents)
  return /^-?\d+(\.\d+)?$/.test(value.trim());
}

export function detectParseNumber(dataset: Dataset): Issue[] {
  const issues: Issue[] = [];

  dataset.columns.forEach((_, columnIndex) => {
    const affectedRows: number[] = [];

    dataset.rows.forEach((row, rowIndex) => {
      const value = row[columnIndex];
      if (
        typeof value === "string" &&
        isNumericString(value)
      ) {
        affectedRows.push(rowIndex);
      }
    });

    if (affectedRows.length > 0) {
      issues.push({
        id: `parse_number_col_${columnIndex}`,
        type: "PARSE_NUMBER",
        columnIndex,
        rowIndices: affectedRows,
        description: "Numeric strings can be converted to numbers",
        preview: (value: CellValue) => {
          if (
            typeof value === "string" &&
            isNumericString(value)
          ) {
            return Number(value.trim());
          }
          return value;
        },
      });
    }
  });

  return issues;
}
