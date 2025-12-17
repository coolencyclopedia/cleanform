import type { Dataset } from "../model";

export function exportJson(dataset: Dataset): string {
  const rows = dataset.rows.map((row) =>
    Object.fromEntries(
      dataset.columns.map((c, i) => [c, row[i]])
    )
  );

  return JSON.stringify(rows, null, 2);
}
