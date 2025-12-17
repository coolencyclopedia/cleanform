import type { Dataset, Issue, CellValue } from "../model";

/**
 * Try to parse a date string safely.
 * Returns ISO date (YYYY-MM-DD) or null if ambiguous/invalid.
 */
function parseDateSafe(value: string): string | null {
  const v = value.trim();

  // ISO or ISO-like
  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(v)) {
    const d = new Date(v.replace(/\//g, "-"));
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }

  // DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(v)) {
    const [dd, mm, yyyy] = v.split(/[-/]/);
    const iso = `${yyyy}-${mm}-${dd}`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      return iso;
    }
  }

  // Month name formats (March 15, 2024)
  if (/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(v)) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }

  return null;
}

export function detectParseDate(dataset: Dataset): Issue[] {
  const issues: Issue[] = [];

  dataset.columns.forEach((_, columnIndex) => {
    const affectedRows: number[] = [];

    dataset.rows.forEach((row, rowIndex) => {
      const value = row[columnIndex];
      if (
        typeof value === "string" &&
        parseDateSafe(value) !== null
      ) {
        affectedRows.push(rowIndex);
      }
    });

    if (affectedRows.length > 0) {
      issues.push({
        id: `parse_date_col_${columnIndex}`,
        type: "PARSE_DATE",
        columnIndex,
        rowIndices: affectedRows,
        description: "Date strings can be converted to ISO dates",
        preview: (value: CellValue) => {
          if (typeof value !== "string") return value;
          const parsed = parseDateSafe(value);
          return parsed ?? value;
        },
      });
    }
  });

  return issues;
}
