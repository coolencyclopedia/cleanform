import type {
    Dataset,
    Issue,
    CellValue,
    CaseMode,
  } from "../model";
  
  function hasCaseVariance(values: CellValue[]): boolean {
    const seen = new Set<string>();
  
    for (const v of values) {
      if (typeof v !== "string") continue;
      const t = v.trim();
      if (!t) continue;
      seen.add(t);
      if (seen.size > 1) return true;
    }
  
    return false;
  }
  
  function toTitleCase(value: string): string {
    return value
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  
  export function detectNormalizeCase(
    dataset: Dataset,
    mode: CaseMode
  ): Issue[] {
    const issues: Issue[] = [];
  
    dataset.columns.forEach((_, columnIndex) => {
      const columnValues = dataset.rows.map(
        (r) => r[columnIndex]
      );
  
      if (!hasCaseVariance(columnValues)) return;
  
      issues.push({
        id: `normalize_case_${mode}_col_${columnIndex}`,
        type: "NORMALIZE_CASE",
        columnIndex,
        rowIndices: dataset.rows
          .map((_, i) => i)
          .filter(
            (i) =>
              typeof dataset.rows[i][columnIndex] ===
              "string"
          ),
        description: `Normalize text to ${mode} case`,
        preview: (value) => {
          if (typeof value !== "string") return value;
  
          switch (mode) {
            case "lower":
              return value.toLowerCase();
            case "upper":
              return value.toUpperCase();
            case "title":
              return toTitleCase(value);
            default:
              return value;
          }
        },
      });
    });
  
    return issues;
  }
  